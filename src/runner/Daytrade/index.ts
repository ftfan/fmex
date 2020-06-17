import Data from '@/lib/data';
import { Candle } from '@/data/Data';
import { KLineData } from '@/types/types';

const PriceNum = (n: number, f = 2) => {
  return parseFloat(n.toFixed(f));
};

class Store extends Data {
  // 内存状态
  readonly state = {
    api: null as any,

    LastRawData: {} as Candle,

    RBreaker: {
      Bbreak: 0, // 突破买入价
      Ssetup: 0, // 观察卖出价
      Senter: 0, // 反转卖出价
      Benter: 0, // 反转买入价
      Bsetup: 0, // 观察买入价
      Sbreak: 0, // 突破卖出价
    },
  };

  // session
  readonly sessionState = {};

  // 持久状态
  readonly localState = {
    Granularity: '5m',
    TrailingStop: 40, // 移动止损值，默认万分之40

    Key: '', // 使用的秘钥
    RBreaker: {
      LastCandelTimeRange: 24, // 周期。默认1天，即24小时。
      Risk: 2,
      OrderStepNum: 10, // 仓位
    },
  };

  protected name = `imconfig:daytrade`;
  protected desc = `日内交易，一样是亏钱，我们要亏得有规律，有尊严！`;

  constructor() {
    super();
    this.initilization();
  }
  VueComponent() {
    return import('./index.vue');
  }
  ClearData() {
    // this.localState.Orders = [];
  }
  Setting() {
    //
  }
  GetOrder() {
    // return this.localState.Orders;
  }
  Run() {
    //
  }

  // 计算枢轴线指标
  CalcPivot(kline: KLineData) {
    const high = kline.high; // 前一日的最高价
    const low = kline.low; // 前一日的最低价
    const close = kline.close; // 前一日的收盘价
    const pivot = (high + low + close) / 3; // 枢轴点
    const Risk = 2;
    return {
      BreakBuy: PriceNum(high + Risk * (pivot - low)), // 突破买入价
      SetupSell: PriceNum(pivot + (high - low)), // 观察卖出价
      RevSell: PriceNum(Risk * pivot - low), // 反转卖出价
      Pivot: PriceNum(pivot),
      RevBuy: PriceNum(Risk * pivot - high), // 反转买入价
      SetupBuy: PriceNum(pivot - (high - low)), // 观察买入价
      BreakSell: PriceNum(low - Risk * (high - pivot)), // 突破卖出价
    };
  }
}

export const Daytrade = new Store();
export default Daytrade;
