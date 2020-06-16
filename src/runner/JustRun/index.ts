import Data from '@/lib/data';
import { FMex } from '@/api/FMex';
const PriceNum = (n: number, f = 2) => {
  return parseFloat(n.toFixed(f));
};

class Store extends Data {
  // 内存状态
  readonly state = {
    api: null as FMex.Api | null,
  };

  // session
  readonly sessionState = {};

  // 持久状态
  readonly localState = {
    Resolution: FMex.Resolution.M3, // 参考线
    Key: '', // 使用的秘钥
  };

  protected name = `imconfig:JustRun`;
  protected desc = `随便下单，平仓。用来在测试网跑数据，主网别用！！！`;

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

  TakeOrder() {
    // 取消所有挂单；
    // 有中间价，中间价刷一单。
    // 没中间价，朝指数价格方向买一单
  }
}

export const BOLL = new Store();
export default BOLL;
