import Data from '@/lib/data';
import { RunnerOrder } from '@/types/Runner';
import { Candle } from '@/data/Data';
import BigNumber from 'bignumber.js';
import { sleep, clone } from '@/lib/utils';
import { DateFormat } from '@/lib/time';

const feeTest = 5 / 10000; // 手续费。

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

    Granularity: '5m', // 参考线
    Key: '', // 使用的秘钥
    SameOrderTimeDiffMin: 5, // 相邻下单数据的最小间隔时间。分钟单位
    IngOrderNumMax: 10, // 最多滞留订单数
    DiffCancel: 5, // 挂单与目前差值万分几，取消，重新下单
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
  protected desc = `布林带内部买卖,下线买入，上线卖出，一定盈利或者中线止盈。`;

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
  TryOrder(rawData: Candle[], boll: { upper: number[]; lower: number[]; mid: number[] }, test = false) {
    const orders = test ? this.state.TestOrder : this.localState.Orders;

    const i = rawData.length - 1;
    const upper = boll.upper[i];
    // console.log(upper, i);
    if (isNaN(upper)) return;
    this.state.LastRawData = rawData[i];
    const lower = boll.lower[i];
    const mid = boll.mid[i];

    const lastTime = this.state.LastRawData.timestamp - this.localState.SameOrderTimeDiffMin * 60000;
    const lastTime2 = this.state.LastRawData.timestamp - this.localState.SameOrderTimeDiffMin * 30000;

    // 在当前位置的上轨和下轨挂单买卖。
    if (this.localState.OrderTypes.indexOf('空') > -1) {
      if (this.state.ActiveOrders.upper.filter((item) => item.timestamp >= lastTime).length === 0) {
        if (this.state.ActiveOrders.upper.length <= this.localState.IngOrderNumMax) {
          this.OrderInPrice(upper, BollType.upper, this.state.ActiveOrders.upper);
        }
      }
    }
    if (this.localState.OrderTypes.indexOf('多') > -1) {
      if (this.state.ActiveOrders.lower.filter((item) => item.timestamp > lastTime).length === 0) {
        if (this.state.ActiveOrders.lower.length <= this.localState.IngOrderNumMax) {
          this.OrderInPrice(lower, BollType.lower, this.state.ActiveOrders.lower);
        }
      }
    }

    // 取消订单，检查平仓订单
    const upperEnd: BOLLRunnerOrder[] = [];
    const lowerEnd: BOLLRunnerOrder[] = [];
    this.state.ActiveOrders.upper.forEach((order) => {
      // 已经完结的订单，去处理其平仓单
      if (order.state === 4) return; // 撤单中
      let size = new BigNumber(order.filled_qty);
      let ended = OrderStatusEnd.indexOf(order.state) > -1; // 父级订单已经完结
      if (order.state === 2) {
        if (order.subOrders.length === 0) ended = false;
        order.subOrders.forEach((subOrder) => {
          if (ended && OrderStatusEnd.indexOf(subOrder.state) === -1) ended = false; // 有未完结的订单
          // 撤单成功的订单，如果还在这里，说明有成交数量
          if (subOrder.state === -1) {
            size = size.minus(subOrder.filled_qty);
            return;
          }
          size = size.minus(subOrder.size);
          if (subOrder.state === 4) return; // 撤单中
          if (subOrder.state === 2) return;
          const diff = (Math.abs(subOrder.price - mid) / mid) * 10000;
          // console.log(subOrder.state, diff);
          if (subOrder.state === 0 && diff > this.localState.DiffCancel) this.OrderCancel(subOrder, order.subOrders);
        });
        // 还有未平仓的数量
        if (size.toNumber() > 0) {
          this.OrderInPrice(mid, BollType.midUpper, order.subOrders);
        }
        if (ended) {
          upperEnd.push(order);
        }
        return;
      }
      const diff = (Math.abs(order.price - upper) / upper) * 10000;
      if (order.state === 0 && diff > this.localState.DiffCancel) {
        this.OrderCancel(order, this.state.ActiveOrders.upper);
      } else if (order.state === 0 && order.timestamp <= lastTime2) {
        this.OrderCancel(order, this.state.ActiveOrders.lower);
      }
      if (ended) {
        upperEnd.push(order);
      }
    });
    this.state.ActiveOrders.lower.forEach((order) => {
      if (order.state === 4) return; // 撤单中
      let size = new BigNumber(order.filled_qty);
      let ended = OrderStatusEnd.indexOf(order.state) > -1; // 父级订单已经完结
      // 已经完结的订单，去处理其平仓单
      if (order.state === 2) {
        if (order.subOrders.length === 0) ended = false;
        order.subOrders.forEach((subOrder) => {
          if (ended && OrderStatusEnd.indexOf(subOrder.state) === -1) ended = false; // 有未完结的订单
          // 撤单成功的订单，如果还在这里，说明有成交数量
          if (subOrder.state === -1) {
            size = size.minus(subOrder.filled_qty);
            return;
          }
          size = size.minus(subOrder.size);
          if (subOrder.state === 2) return;
          if (subOrder.state === 4) return; // 撤单中
          const diff = (Math.abs(subOrder.price - mid) / mid) * 10000;
          // console.log(subOrder.state, diff);
          if (subOrder.state === 0 && diff > this.localState.DiffCancel) this.OrderCancel(subOrder, order.subOrders);
        });
        // 还有未平仓的数量
        if (size.toNumber() > 0) {
          this.OrderInPrice(mid, BollType.midLower, order.subOrders);
        }
        if (ended) {
          lowerEnd.push(order);
        }
        return;
      }
      const diff = (Math.abs(order.price - lower) / lower) * 10000;
      if (order.state === 0 && diff > this.localState.DiffCancel) {
        this.OrderCancel(order, this.state.ActiveOrders.lower);
      } else if (order.state === 0 && order.timestamp <= lastTime2) {
        this.OrderCancel(order, this.state.ActiveOrders.lower);
      }
      if (ended) {
        lowerEnd.push(order);
      }
    });

    // 将结束的订单，归档
    upperEnd.concat(lowerEnd).forEach((order) => {
      const list = order.bollType === BollType.upper ? this.state.ActiveOrders.upper : this.state.ActiveOrders.lower;
      const index = list.indexOf(order);
      if (index === -1) return;
      list.splice(index, 1);
      if (order.filled_qty === 0) return; // 没有成交量的订单不做记录
      // orders.push(order);
      this.OrderEndSave(order, orders);
    });
  }

  async OrderCancel(order: BOLLRunnerOrder, orders: BOLLRunnerOrder[]) {
    order.state = 4;
    await sleep(20);
    if (order.state !== 4) return;
    order.state = -1;
    if (order.filled_qty !== 0) return; // 有成交额的订单，不需要删除
    const index = orders.indexOf(order);
    if (index > -1) orders.splice(index, 1);
  }

  async OrderInPrice(price: number, type: BollType, orders: BOLLRunnerOrder[], size = this.localState.OrderStepNum) {
    const timeVal = this.state.LastRawData.timestamp; // 参考蜡烛图时间
    const order: BOLLRunnerOrder = {
      bollType: type,
      id: timeVal.toString(),
      instrument_id: '', // 合约名称，如BTC-USD-SWAP
      client_oid: '', // 由您设置的订单ID来识别您的订单
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
    await sleep(20); // 模拟下单
    if (order.state !== 3) return; // 可能这里被撤单了。
    order.state = 0;
    const timer = setInterval(() => {
      // 完结状态
      if (OrderStatusEnd.indexOf(order.state) > -1) {
        clearInterval(timer);
        return;
      }
      this.UpdateOrderInfo(order, orders);
    }, 200);
  }

  // 获取订单的最新数据
  async UpdateOrderInfo(order: BOLLRunnerOrder, orders: BOLLRunnerOrder[]) {
    const Success = () => {
      order.state = 2;
      order.filled_qty = order.size; // 完全成交
      order.price_avg = order.price;
      order.fee = order.size * 0.0005;
    };
    // const Delete = () => {
    //   const index = orders.indexOf(order);
    //   if (index > -1) orders.splice(index, 1);
    // };
    await sleep(Math.random() * 20);
    const raw = this.state.LastRawData;

    // 处于可能被成交的状态
    if ([0, 1, 3, 4].indexOf(order.state) > -1) {
      // 买入，做多。
      if (order.type === 1 || order.type === 4) {
        if (order.price > raw.close) {
          Success();
        } else if (order.timestamp <= raw.timestamp && order.price > raw.low) {
          Success();
        }
      }
      if (order.type === 2 || order.type === 3) {
        if (order.price < raw.close) {
          Success();
        } else if (order.timestamp <= raw.timestamp && order.price < raw.high) {
          Success();
        }
      }
    }
  }

  async OrderEndSave(order: BOLLRunnerOrder, orders: BOLLRunnerOrder[]) {
    orders.push(order);
    const handler = order.bollType === BollType.upper ? this.localState.DataSay[0] : this.localState.DataSay[1];
    handler.Times++;
    // 计算买入均价
    let sum = 0;
    order.subOrders.forEach((item) => {
      sum += item.price * item.filled_qty;
    });
    const price = sum / order.size;
    const face = 100;
    if (order.bollType === BollType.upper) {
      const win = (order.price - price) * ((order.size * face) / price);
      const fees = (order.size / order.price + order.size / price) * feeTest * face;
      const value = win - fees;
      if (order.price > price) {
        handler.WinTimes++;
        handler.WinValue += value;
      }
      handler.Value += value;
    } else {
      const win = (price - order.price) * ((order.size * face) / price);
      const fees = (order.size / order.price + order.size / price) * feeTest * face;
      const value = win - fees;
      if (order.price < price) {
        handler.WinTimes++;
        handler.WinValue += value;
      }
      handler.Value += value;
    }
    handler.LastTime = this.state.LastRawData.timestamp;
    this.localState.DataSays.push(clone(this.localState.DataSay));
  }
}

export const BOLL = new Store();
export default BOLL;
