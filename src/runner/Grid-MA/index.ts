import Data from '@/lib/data';
import { RunnerOrder } from '@/types/Runner';
import { Candle } from '@/data/Data';
import { sleep, clone, getTimeId } from '@/lib/utils';
import { client_oid_static } from '@/config';
import { Notification } from 'element-ui';
import { FMex } from '@/api/FMex';

const feeTest = 5 / 10000; // 手续费。
const timesssss: any = {};

export enum BollType {
  upper = 'upper',
  lower = 'lower',
  mid = 'mid',
  midUpper = 'midUpper',
  midLower = 'midLower',
  none = '',
}
export const BollTypeText = {
  upper: '空',
  lower: '多',
  mid: '平仓',
  midUpper: '平空',
  midLower: '平多',
  none: '',
} as any;
export const OrderTypeConf = {
  [BollType.none]: 0,
  [BollType.mid]: 0,
  [BollType.lower]: 1,
  [BollType.upper]: 2,
  [BollType.midLower]: 3,
  [BollType.midUpper]: 4,
};
export const OrderStatusEnd = [-2, -1, 2];

export interface HistoryData {
  Times: number;
  Value: number;
  WinTimes: number;
  WinValue: number;
  LastTime: number;
}

export interface BOLLRunnerOrder extends RunnerOrder {
  bollType: BollType;
  subOrders: BOLLRunnerOrder[];
}

class Store extends Data {
  // 内存状态
  readonly state = {
    api: null as any,
    TestOrder: [] as BOLLRunnerOrder[], // 测试订单列表

    LastRawData: {} as Candle,

    ActiveOrders: {
      upper: [] as BOLLRunnerOrder[],
      lower: [] as BOLLRunnerOrder[],
    },
  };

  // session
  readonly sessionState = {};

  // 持久状态
  readonly localState = {
    Orders: [] as BOLLRunnerOrder[], // 订单列表

    Resolution: FMex.Resolution.M5, // 参考线
    Key: '', // 使用的秘钥
    SameOrderTimeDiffMin: 5, // 相邻下单数据的最小间隔时间。分钟单位
    IngOrderNumMax: 10, // 最多滞留订单数
    DiffCancel: 2, // 挂单与目前差值万分几，取消，重新下单
    Win: 10, // 止盈
    Lose: 10, // 止损
    OrderStepNum: 10, // 单次下单量
    OrderTypes: ['多', '空'], // 下单类型，只做多？只做空？还是都做。

    DataSay: [
      {
        Times: 0,
        Value: 0,
        WinTimes: 0,
        WinValue: 0,
        LastTime: 0,
      },
      {
        Times: 0,
        Value: 0,
        WinTimes: 0,
        WinValue: 0,
        LastTime: 0,
      },
    ] as HistoryData[],
    DataSays: [] as HistoryData[][],
  };

  protected name = `imconfig:BOLL`;
  protected desc = `布林带内部买卖,均线下做多，均线上做空，设置止盈止损`;

  constructor() {
    super();
    this.initilization();
  }
  VueComponent() {
    return import('./index.vue');
  }
  ClearData() {
    this.localState.Orders = [];
  }
  Setting() {
    //
  }
  GetOrder() {
    return this.localState.Orders;
  }
  Run() {
    //
  }

  // 尝试下单
  TryOrder(rawData: Candle[], boll: { upper: number[]; lower: number[]; mid: number[] }) {
    const orders = this.localState.Orders;

    const i = rawData.length - 1;
    const upper = boll.upper[i];
    if (isNaN(upper)) return;
    this.state.LastRawData = rawData[i];
    const lower = boll.lower[i];
    // const mid = boll.mid[i];

    const lastTime = this.state.LastRawData.timestamp - this.localState.SameOrderTimeDiffMin * 60000;
    const lastTime2 = this.state.LastRawData.timestamp - this.localState.SameOrderTimeDiffMin * 30000;

    if (this.state.ActiveOrders.upper.length === 0) {
      this.OrderInPrice(this.state.LastRawData.close, BollType.upper, this.state.ActiveOrders.upper);
    }
    if (this.state.ActiveOrders.lower.length === 0) {
      this.OrderInPrice(this.state.LastRawData.close, BollType.lower, this.state.ActiveOrders.lower);
    }
    // 在当前位置的上轨和下轨挂单买卖。
    if (this.localState.OrderTypes.indexOf('空') > -1) {
      if (this.state.ActiveOrders.upper.filter((item) => item.timestamp >= lastTime).length === 0) {
        if (this.state.ActiveOrders.upper.length < this.localState.IngOrderNumMax) {
          this.OrderInPrice(upper, BollType.upper, this.state.ActiveOrders.upper);
        }
      }
    }

    if (this.localState.OrderTypes.indexOf('多') > -1) {
      if (this.state.ActiveOrders.lower.filter((item) => item.timestamp > lastTime).length === 0) {
        if (this.state.ActiveOrders.lower.length < this.localState.IngOrderNumMax) {
          this.OrderInPrice(lower, BollType.lower, this.state.ActiveOrders.lower);
        }
      }
    }

    // 检查 需要 取消 的 订单
    const cancelList: BOLLRunnerOrder[] = [];
    this.state.ActiveOrders.upper.concat(this.state.ActiveOrders.lower).forEach(async (order) => {
      const price = order.bollType === BollType.upper ? upper : lower;
      const orderss = order.bollType === BollType.upper ? this.state.ActiveOrders.upper : this.state.ActiveOrders.lower;
      if (order.state === 4) return; // 撤单中
      const ended = OrderStatusEnd.indexOf(order.state) > -1;
      // 父级订单已经完结
      if (ended) {
        // 订单成交，但是还未下子订单的，这里下子订单
        if (order.state === 2 && order.subOrders.length === 0) {
          if (!this.state.api) return;
          const win = parseInt((order.price * (10000 - this.localState.Win)) / 1000 + '', 10) / 10;
          const lose = parseInt((order.price * (10000 - this.localState.Lose)) / 1000 + '', 10) / 10;
          order.subOrders.push(
            this.OrderAtPrice({
              instrument_id: order.instrument_id,
              type: order.bollType === BollType.upper ? 4 : 3,
              order_type: 1,
              size: order.size,
              trigger_price: order.bollType === BollType.upper ? Math.min(this.state.LastRawData.close, win) : Math.max(this.state.LastRawData.close, win),
              algo_type: 2, // 市场价
            }),
            this.OrderAtPrice({
              instrument_id: order.instrument_id,
              type: order.bollType === BollType.upper ? 4 : 3,
              order_type: 1,
              size: order.size,
              trigger_price: order.bollType === BollType.upper ? Math.max(this.state.LastRawData.close, lose) : Math.min(this.state.LastRawData.close, lose),
              algo_type: 2, // 市场价
            })
          );
          return;
        }
        // 有子订单的，需要判断子订单完成，才算完成
        if (order.subOrders.length > 0) {
          const isAllEnd = order.subOrders.filter((sub) => sub.state === 2).length > 0;
          if (isAllEnd) {
            const cancelOrder = order.subOrders[0].state === 2 ? order.subOrders[1] : order.subOrders[0];
            return cancelList.push(order);
          }
          order.subOrders.forEach((item) => this.UpdateOrderInfoAtTime(item));
          return;
        }
        return cancelList.push(order);
      }
      // const diff = (Math.abs(order.price - price) / price) * 10000;
      // if (this.localState.DiffCancel && order.state === 0 && diff > this.localState.DiffCancel) {
      //   this.OrderCancel(order, orderss);
      // } else if (order.state === 0 && order.timestamp <= lastTime2) {
      //   this.OrderCancel(order, orderss);
      // }
    });

    // 将结束的订单，归档
    cancelList.forEach((order) => {
      const list = order.bollType === BollType.upper ? this.state.ActiveOrders.upper : this.state.ActiveOrders.lower;
      const index = list.indexOf(order);
      if (index === -1) return;
      list.splice(index, 1);
      if (order.filled_qty === 0) return; // 没有成交量的订单不做记录
      this.OrderEndSave(order, orders);
    });
  }

  async OrderCancel(order: BOLLRunnerOrder, orders: BOLLRunnerOrder[]) {
    order.state = 4;
    const cancel = await this.state.api.swap().postCancelOrder(order.instrument_id, order.order_id);
    if (cancel.error_code !== '0') {
      Notification.error('撤单失败');
      await sleep(1000);
      this.OrderCancel(order, orders);
      return;
    }
    const info = await this.state.api.swap().getOrder(order.instrument_id, order.order_id);
    if (!info) debugger;
    Object.assign(order, this.OrderInfoGet(info));
    if (order.filled_qty !== 0) return; // 有成交额的订单，不需要删除
    const index = orders.indexOf(order);
    if (index > -1) orders.splice(index, 1);
  }

  async OrderCancelAt(order: BOLLRunnerOrder) {
    // order.state = 4;
    const cancel = await this.state.api.post('/api/futures/v3/cancel_algos', {
      instrument_id: order.instrument_id,
      order_type: 1,
      algo_ids: [order.order_id],
    });
    if (cancel.error_code !== '0') {
      Notification.error('撤单失败');
      await sleep(1000);
      this.OrderCancelAt(order);
      return;
    }
    this.UpdateOrderInfoAt(order);
  }

  async OrderInPrice(price: number, type: BollType, orders: BOLLRunnerOrder[], size = this.localState.OrderStepNum) {
    const timeVal = getTimeId(this.state.LastRawData.timestamp); // 参考蜡烛图时间
    const order: BOLLRunnerOrder = {
      bollType: type,
      id: timeVal.toString(),
      instrument_id: `${this.state.api ? this.state.api.IsTestEnv : ''}BTC-USD-SWAP`, // 合约名称，如BTC-USD-SWAP
      client_oid: `${client_oid_static}${timeVal}`, // 由您设置的订单ID来识别您的订单
      size: size, // 委托数量
      timestamp: timeVal, // 创建时间
      filled_qty: 0, // 成交数量
      fee: 0, // 手续费
      order_id: '', // 订单id
      price: price, // 委托价格
      price_avg: 0, // 成交均价
      type: OrderTypeConf[type], // 1:开多 2:开空 3:平多 4:平空
      contract_val: 0, // 合约面值
      order_type: 1, // 0：普通委托 1：只做Maker（Post only） 2：全部成交或立即取消（FOK） 3：立即成交并取消剩余（IOC） 4：市价委托
      state: 3, // -2:失败 -1:撤单成功 0:等待成交 1:部分成交 2:完全成交 3:下单中 4:撤单中
      trigger_price: 0, // 强平的真实触发价格，仅强平单会返回此字段
      leverage: 0, // 杠杆倍数
      subOrders: [],
    };
    // 这里先占位。
    orders.push(order);
    // 下单后修正order
    if (this.state.api) {
      const res = await this.state.api.swap().postOrder({
        instrument_id: order.instrument_id,
        client_oid: order.client_oid,
        size: order.size,
        price: order.price,
        type: order.type,
        order_type: order.order_type,
      });
      // console.log(res);
      if (!res.order_id) {
        Notification.error('下单失败');
        order.state = -2;
        this.OrderEndSave(order, orders);
        return;
      }
      order.order_id = res.order_id;
      await this.UpdateOrderInfo(order);
    }

    return new Promise(async (resolve) => {
      // 完结状态
      while (OrderStatusEnd.indexOf(order.state) === -1 && this.state.api) {
        await this.UpdateOrderInfo(order);
        await sleep(1000);
      }
      return resolve(order);
    });
  }

  OrderAtPrice(params: any) {
    const timeVal = getTimeId(this.state.LastRawData.timestamp); // 参考蜡烛图时间
    const order: BOLLRunnerOrder = {
      bollType: params.type === 4 ? BollType.midUpper : BollType.midLower,
      id: timeVal.toString(),
      instrument_id: params.instrument_id,
      client_oid: `${client_oid_static}${timeVal}`, // 由您设置的订单ID来识别您的订单
      size: params.size, // 委托数量
      timestamp: timeVal, // 创建时间
      filled_qty: 0, // 成交数量
      fee: 0, // 手续费
      order_id: '', // 订单id
      price: params.trigger_price, // 委托价格
      price_avg: 0, // 成交均价
      type: params.type, // 1:开多 2:开空 3:平多 4:平空
      contract_val: 0, // 合约面值
      order_type: 1, // 0：普通委托 1：只做Maker（Post only） 2：全部成交或立即取消（FOK） 3：立即成交并取消剩余（IOC） 4：市价委托
      state: 3, // -2:失败 -1:撤单成功 0:等待成交 1:部分成交 2:完全成交 3:下单中 4:撤单中
      trigger_price: 0, // 强平的真实触发价格，仅强平单会返回此字段
      leverage: 0, // 杠杆倍数
      subOrders: [],
    };
    this.state.api.post('/api/swap/v3/order_algo', params).then(async (sub: any) => {
      if (sub.code !== 0) debugger; // 失败
      order.order_id = sub.data.algo_id;
      await this.UpdateOrderInfoAt(order);
      order.subOrders.push(sub);
    });
    return order;
  }

  OrderInfoGet(data: any) {
    data.contract_val = parseFloat(data.contract_val); // : "100"
    data.fee = parseFloat(data.fee); // : "0.000000"
    data.filled_qty = parseFloat(data.filled_qty); // : "0"
    data.leverage = parseFloat(data.leverage); // : "10.00"
    data.order_type = parseFloat(data.order_type); // : "1"
    data.price = parseFloat(data.price); // : "9634.6"
    data.price_avg = parseFloat(data.price_avg); // : "0.0"
    data.size = parseFloat(data.size); // : "5"
    data.state = parseFloat(data.state); // : "0"
    data.status = parseFloat(data.status); // : "0"
    data.timestamp = new Date(data.timestamp).getTime(); // : "2020-06-07T11:11:42.903Z"
    data.trigger_price = parseFloat(data.trigger_price); // : null
    data.type = parseFloat(data.type); // : "2"
    return data;
  }

  async UpdateOrderInfoAtTime(order: BOLLRunnerOrder) {
    const time = timesssss[order.order_id] || 0;
    const now = Date.now();
    if (now - time > 2000) {
      timesssss[order.order_id] = now;
      return this.UpdateOrderInfoAt(order);
    }
    return;
  }
  async UpdateOrderInfoAt(order: BOLLRunnerOrder) {
    if (!this.state.api) return;
    const info = await this.state.api.get(`/api/swap/v3/order_algo/${order.instrument_id}`, {
      order_type: 1,
      algo_id: order.order_id,
    });
    if (!info) debugger;
    // Object.assign(order, { info.orderStrategyVOS));
    if (info.orderStrategyVOS.status === '2') order.state = 2;
  }

  // 获取订单的最新数据
  async UpdateOrderInfo(order: BOLLRunnerOrder) {
    if (!this.state.api) return;
    const info = await this.state.api.swap().getOrder(order.instrument_id, order.order_id);
    if (!info) debugger;
    Object.assign(order, this.OrderInfoGet(info));
  }

  // 归档订单到历史记录，
  async OrderEndSave(order: BOLLRunnerOrder, orders: BOLLRunnerOrder[]) {
    orders.push(order);
    const handler = order.bollType === BollType.upper ? this.localState.DataSay[0] : this.localState.DataSay[1];
    handler.Times++;

    const face = 100;
    const win = order.subOrders[0];
    const lose = order.subOrders[1];
    if (order.bollType === BollType.upper) {
      if (win.state === 2) {
        handler.WinTimes++;
        if (lose.state === 2) debugger;
      }

      // const win = (order.price - price) * ((order.size * face) / price);
      // const fees = (order.size / order.price + order.size / price) * feeTest * face;
      // const value = win - fees;
      // if (order.price > price) {
      //   handler.WinTimes++;
      //   handler.WinValue += value;
      // }
      // handler.Value += value;
    } else {
      // const win = (price - order.price) * ((order.size * face) / price);
      // const fees = (order.size / order.price + order.size / price) * feeTest * face;
      // const value = win - fees;
      // if (order.price < price) {
      //   handler.WinTimes++;
      //   handler.WinValue += value;
      // }
      // handler.Value += value;
    }
    handler.LastTime = this.state.LastRawData.timestamp;
    this.localState.DataSays.push(clone(this.localState.DataSay));
  }
}

export const BOLL = new Store();
export default BOLL;
