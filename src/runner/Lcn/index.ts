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

  protected name = `imconfig:Lcn`;
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
  CalcPivot(kline: KLineData[]) {
    // 时间越远的权重越低。
    // 最高价和最低价权重翻倍
    const high = Math.max(...kline.map((k) => k.high));
    const highclose = Math.max(...kline.map((k) => k.close));
    const low = Math.min(...kline.map((k) => k.low));
    const lowclose = Math.min(...kline.map((k) => k.close));

    const hc = (highclose + high) / 2;
    const lc = (lowclose + low) / 2;
    // const close = kline[kline.length - 1].close;
    let pivot = 0;
    let sum = 0;
    const limit = kline.length / 4;
    kline.forEach((k, index) => {
      const pow = Math.min(Math.max(limit, index), limit * 3);
      sum += pow * 3;
      pivot += (k.close + k.high + k.low) * pow;
    });
    pivot += (high + low + highclose + lowclose) * limit;
    sum += 4 * limit;
    pivot = pivot / sum;
    // const pivot = (high + low + close) / 3; // 枢轴点
    const Risk = 2;
    return {
      BreakBuy: PriceNum(hc + Risk * (pivot - lc)), // 突破买入价
      SetupSell: PriceNum(pivot + (hc - lc)), // 观察卖出价
      RevSell: PriceNum(Risk * pivot - lc), // 反转卖出价
      Pivot: PriceNum(pivot),
      RevBuy: PriceNum(Risk * pivot - hc), // 反转买入价
      SetupBuy: PriceNum(pivot - (hc - lc)), // 观察买入价
      BreakSell: PriceNum(lc + Risk * (pivot - hc)), // 突破卖出价
    };
  }
}

export const Daytrade = new Store();
export default Daytrade;
