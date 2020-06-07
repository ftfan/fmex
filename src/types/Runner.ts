export interface RunnerOrder {
  id: string;
  instrument_id: string; // 合约名称，如BTC-USD-SWAP
  client_oid: string; // 由您设置的订单ID来识别您的订单
  size: number; // 委托数量
  timestamp: number; // 创建时间
  filled_qty: number; // 成交数量
  fee: number; // 手续费
  order_id: string; // 订单id
  price: number; // 委托价格
  price_avg: number; // 成交均价
  type: number; // 1:开多 2:开空 3:平多 4:平空
  contract_val: number; // 合约面值
  order_type: number; // 0：普通委托 1：只做Maker（Post only） 2：全部成交或立即取消（FOK） 3：立即成交并取消剩余（IOC） 4：市价委托
  state: number; // -2:失败 -1:撤单成功 0:等待成交 1:部分成交 2:完全成交 3:下单中 4:撤单中
  trigger_price: number; // 强平的真实触发价格，仅强平单会返回此字段
  leverage: number; // 杠杆倍数
  subOrders: RunnerOrder[];
}
