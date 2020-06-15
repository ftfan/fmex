import axios, { AxiosInstance } from 'axios';
import { CodeObj, Code } from '@/types/Api';
import { ApiSign } from '@/api/FCoinSign';
import Vue from 'vue';
import { IdCreate } from '@/lib/utils';

export namespace FMex {
  export class Api {
    api!: AxiosInstance;
    constructor(AccessKey: string, AccessSecret: string) {
      const _axios = (this.api = axios.create({
        baseURL: '/fmex',
        timeout: 10000,
      }));

      _axios.interceptors.request.use(
        (config) => {
          ApiSign(config, {
            DomainReal: 'https://api.fmex.com',
            AccessKey,
            AccessSecret,
          });
          return config;
        },
        (error) => Promise.resolve({ data: new CodeObj(Code.Error, null, String(error)) })
      );

      _axios.interceptors.response.use(
        (response) => {
          if (response.data) {
            response.data = new CodeObj(Code.Success, response.data.data, '', response.data);
          } else {
            response.data = new CodeObj(Code.Success, response.data);
          }
          return response;
        },
        (error) => {
          // 有返回数据
          if (error.response) {
            // 有实体
            if (error.response.data) return Promise.resolve({ data: new CodeObj(error.response.data.status || Code.Error, error.response.data, error.response.data.msg) });
            return Promise.resolve({ data: new CodeObj(error.response.status || Code.Error, null, String(error)) });
          }
          return Promise.resolve({ data: new CodeObj(Code.Error, null, String(error)) });
        }
      );
    }

    // 资产查询
    async FetchBalance() {
      return this.api.get(`/v3/contracts/accounts`).then((res) => res.data as CodeObj<{ [index: string]: number[] }>);
    }

    // 查询订单
    async Orders() {
      return this.api.get(`/v3/contracts/orders/open`).then((res) => res.data as CodeObj<any>);
    }

    async OrderCancel(id: string) {
      return this.api.post(`/v3/contracts/orders/${id}/cancel`).then((res) => res.data as CodeObj<any>);
    }

    /**
     * K线数据
     * @param CoinSymbol BTCUSD_P
     * @param Resolution M1
     */
    async GetCandles(CoinSymbol: CoinSymbol, Resolution: Resolution, limit = 20, before = 0) {
      const params = { limit };
      if (before) Object.assign(params, { before });
      return this.api.get(`/v2/market/candles/${Resolution}/${CoinSymbol}`, { params }).then((res) => res.data as CodeObj<CandelRes[]>);
    }
  }

  /**
   * FMex 的长连接
   */
  class Ws {
    private ws: WebSocket; // 句柄存储
    private HeartTimer = 0 as any;
    private HeartTime = 15000; // 每隔15秒心跳
    private wsOpen: Promise<any>; // 使用ws的时候需要等待
    private event = new Vue(); // 使用 Vue ，作为事件管理者
    // 最后一次呼吸返回
    LastHeartbeat = {
      id: '',
      type: 'ping',
      ts: Date.now(),
      gap: 0,
    };
    // constructor(baseUrl = 'wss://api.fmex.d73e969.com/v2/ws') {
    constructor(baseUrl = 'wss://www.fmextest.net/api/web/ws') {
      this.ws = new WebSocket(baseUrl);
      this.wsOpen = new Promise((resolve) => (this.ws.onopen = resolve));
      this.ws.onmessage = this.onmessage.bind(this);
      this.ws.onclose = this.onclose.bind(this);
      this.ws.onerror = this.onerror.bind(this);
      // 触发心跳事件（后续每隔 HeartTime 跳动一次）
      setInterval(() => this.Heartbeat(), this.HeartTime);
      this.event.$on('error', (err: any) => {
        console.error('error', err);
      });
      this.event.$on('close', (err: any) => {
        console.error('close', err);
      });
    }

    private onmessage(ev: MessageEvent) {
      try {
        const data = JSON.parse(ev.data.toString()) as WsResponse;
        if (data.type && typeof data.type === 'string') this.event.$emit(data.type, data);
        if (data.id && typeof data.id === 'string') this.event.$emit(data.id, data);
        if ((data as any).status) console.error(data); // 怀疑出错了
      } catch (e) {
        console.error(`err msg`, e);
        this.event.$emit('error', e);
      }
    }

    private onerror(ev: Event) {
      this.event.$emit('error', ev);
    }

    private onclose(ev: CloseEvent) {
      this.event.$emit('close', ev);
    }

    async ping(
      num = Date.now()
    ): Promise<{
      id: string;
      type: 'ping';
      ts: number;
      gap: number;
    }> {
      await this.wsOpen;
      const id = IdCreate();
      return new Promise(async (resolve, reject) => {
        let rejected = false;
        const timer = setTimeout(() => {
          rejected = true;
          reject(new Error('ping 超时'));
        }, this.HeartTime);
        this.event.$once(id, (data: any) => {
          if (rejected) return;
          clearTimeout(timer);
          resolve(data);
        });
        this.ws.send(JSON.stringify({ cmd: 'ping', args: [num], id }));
      });
    }

    /**
     * 监听数据，比如 实时获取分钟K线图。
     */
    async req(topic: 'candle', Resolution: Resolution, CoinSymbol: CoinSymbol, limit: number, before: number): Promise<WsCandleReqRes>;
    async req(topic: 'trade', CoinSymbol: CoinSymbol, limit: number): Promise<WsTradeReqRes>;
    async req(topic: string, ...args: (number | string)[]) {
      const id = IdCreate();
      const relArgs: (number | string)[] = [];
      if (topic === 'trade') {
        relArgs.push(`${topic}.${args[0]}`);
        relArgs.push(...args.slice(1, args.length));
      } else if (topic === 'candle') {
        relArgs.push(`${topic}.${args[0]}.${args[1]}`);
        relArgs.push(...args.slice(2, args.length));
      }
      return new Promise((resolve) => {
        this.event.$once(id, resolve);
        this.wsOpen.then(() => this.ws.send(JSON.stringify({ cmd: 'req', args: relArgs, id })));
      });
    }
    /**
     * 监听数据，比如 实时获取分钟K线图。
     */
    sub<K extends keyof WsSubMap>(
      topic: K,
      ...args: WsSubMap[K][0]
    ): {
      ondata: (fun: (data: WsSubMap[K][1]) => any) => any;
      close: () => any;
      onsuccess: (fun: () => any) => any;
    };
    sub(topic: WsSubMap, ...args: (number | string)[]) {
      const id = IdCreate();
      const type = `${topic}.${args.join('.')}`;
      let callback: any = null;
      let success: any = null;
      const ondata = (fun: any) => (callback = fun);
      const watch = (data: any) => {
        callback && callback(data);
      };
      const onsuccess = (fun: any) => (success = fun);
      const watchSuccess = (data: any) => {
        success && success(data);
      };
      this.event.$on(id, watchSuccess);
      this.event.$on(type.toLocaleLowerCase(), watch);
      this.wsOpen.then(() => this.ws.send(JSON.stringify({ cmd: 'sub', args: [type], id })));
      return {
        ondata,
        onsuccess,
        close: () => {
          this.event.$off(id, watchSuccess);
          this.event.$off(type, watch);
          this.ws.send(JSON.stringify({ cmd: 'unsub', args: [type] }));
        },
      };
    }

    /**
     * 心跳检查
     */
    async Heartbeat(): Promise<any> {
      if (this.HeartTimer) clearTimeout(this.HeartTimer);
      return this.ping()
        .then((res) => {
          this.LastHeartbeat = res;
          return res;
        })
        .catch((err) => {
          this.event.$emit('error', err);
          return err;
        });
    }
  }

  export const Wss = new Ws();

  /**
   * 监听
   */
  export interface WatchTicker<T> {
    (data: T): any;
  }
  /**
   * ws返回数据格式
   */
  export interface WsResponse {
    type: BrocastType;
    ts: number;
    topic?: string;
    id: string;
  }
  export interface TradeDto {
    amount: number;
    iceberg: boolean;
    id: number;
    price: number;
    side: SideEnum;
    ts: number;
  }
  export interface WsTradeReqRes {
    id: string;
    ts: number;
    data: TradeDto[];
  }
  export type 买一价 = number;
  export type 买一量 = number;
  export type 卖一价 = number;
  export type 卖一量 = number;
  export type 最新成交价 = number;
  export type 最近一笔成交的成交量 = number;
  export type 最大买一价 = number;
  export type 最大买一量 = number;
  export type 最小卖一价 = number;
  export type 最小卖一量 = number;
  export type _24小时前成交价 = number;
  export type _24小时内最高价 = number;
  export type _24小时内最低价 = number;
  export type _24小时合约成交张数 = number;
  export type _24小时合约成交BTC数量 = number;
  export type TickerRes = [
    最新成交价,
    最近一笔成交的成交量,
    最大买一价,
    最大买一量,
    最小卖一价,
    最小卖一量,
    _24小时前成交价,
    _24小时内最高价,
    _24小时内最低价,
    _24小时合约成交张数,
    _24小时合约成交BTC数量
  ];
  export interface WsTickerRes {
    type: string;
    seq: number;
    ticker: TickerRes;
    ts: number;
  }
  export interface WsDepthRes {
    type: string;
    ts: number;
    seq: number;
    bids: (买一价 | 买一量)[];
    asks: (卖一价 | 卖一量)[];
  }
  export interface WsDepthDeltaRes extends WsDepthRes {
    pre_seq: number;
  }
  export interface WsOrderRes {
    type: string;
    order: {
      id: 订单ID;
      quantity: 订单数量;
      direction: 仓位方向;
      features: number;
      price: number;
      fill_price: 成交均价;
      unfilled_quantity: 未成交数量;
      symbol: CoinSymbol;
      margin_currency: 保证金Currency;
      fee: 手续费;
      type: 订单类型;
      status: 订单状态;
      trigger_direction: 仓位方向;
      trigger_on: Stop订单的触发价格_非Stop订单触发价格始终为0;
      trailing_base_price: TrailingStop订单的基准价格_非此类型订单则始终为0;
      trailing_distance: TrailingStop订单的触发价格距离_非此类型订单则始终为0;
      created_at: number;
    };
    ts: number;
  }
  export type 仓位方向 = 'LONG' | 'SHORT';
  export type 订单ID = number;
  export type 定序ID = number;
  export type 订单类型 = 'LIMIT' | 'MARKET';
  export type 订单状态 = OrderState;
  export type 订单数量 = number;
  export type 未成交数量 = number;
  export type 成交均价 = number;
  export type 仓位最近修改的毫秒时间戳 = number;
  export type 仓位设定杠杆率_不一定等于实际杠杆率 = number;
  export type 实际杠杆率 = number;
  export type 风险等级 = number;
  export type 持有合约数量最大值 = number;
  export type 已实现盈亏 = number;
  export type 未实现盈亏 = number;
  export type 保证金Currency = string;
  export type 手续费 = number;
  export type Stop订单的触发价格_非Stop订单触发价格始终为0 = number;
  export type TrailingStop订单的基准价格_非此类型订单则始终为0 = number;
  export type TrailingStop订单的触发价格距离_非此类型订单则始终为0 = number;

  export type 开仓时确定的仓位平仓taker费率 = number;
  export type 仓位保证金 = number;
  export type 破产价格 = number;
  export type 强平价格 = number;
  export type 开仓均价 = number;
  export type 仓位合约代码 = CoinSymbol;
  export type 仓位是否关闭 = number;
  export type 最小维持保证金 = number;

  export interface PositionInfo {
    direction: 仓位方向;
    updated_at: 仓位最近修改的毫秒时间戳;
    quantity: 订单数量;
    leverage: 仓位设定杠杆率_不一定等于实际杠杆率;
    margin_leverage: 实际杠杆率;
    riskLevel: 风险等级;
    max_quantity: 持有合约数量最大值;
    realized_pnl: 已实现盈亏; // #已实现盈亏，已实现盈亏仅作为统计展示给用户，表示自开仓以来该仓位的盈亏
    unrealized_pnl: 未实现盈亏;
    taker_fee_rate: 开仓时确定的仓位平仓taker费率; // , #开仓时确定的仓位平仓taker费率
    margin: 仓位保证金; // #仓位保证金，必须为正
    bankruptcy_price: 破产价格; // #破产价格，以该价格平仓，扣除taker手续费后，其权益恰好为0
    liquidation_price: 强平价格; // #强平价格，以该价格平仓，扣除taker手续费后，其剩余权益恰好为仓位价值 x 维持保证金率
    entry_price: 开仓均价; // #开仓均价，每次仓位增加或减少时，开仓均价都会调整
    symbol: 仓位合约代码; // #仓位合约代码，例如BTCUSD_P
    closed: 仓位是否关闭;
    minimum_maintenance_margin_rate: 最小维持保证金;
  }

  export interface WsPositionRes {
    type: string;
    position: {
      symbol: 仓位合约代码;
      quantity: 订单数量;
      direction: 仓位方向;
      leverage: 仓位设定杠杆率_不一定等于实际杠杆率;
      risk_level: 风险等级;
      margin: 仓位保证金;
      taker_fee_rate: 开仓时确定的仓位平仓taker费率;
      realized_pnl: 已实现盈亏;
      entry_price: 开仓均价;
      liquidation_price: 强平价格;
      bankruptcy_price: 破产价格;
      minimum_maintenance_margin_rate: 最小维持保证金;
      updated_at: 仓位最近修改的毫秒时间戳;
    };
    ts: number;
  }
  export interface WsCandleReqRes {
    id: string;
    data: CandelRes[];
  }
  export interface CandelRes {
    id: number;
    seq: number;
    open: number;
    close: number;
    high: number;
    low: number;
    count: number;
    base_vol: number;
    quote_vol: number;
  }
  export interface WsCandleRes extends CandelRes {
    type: string; // 'candle.M1.ethbtc';
  }
  export enum BrocastType {
    hello = 'hello',
    ping = 'ping',
    topics = 'topics',
  }
  export enum WsCmd {
    req = 'req',
    ping = 'ping',
    sub = 'sub',
  }
  export type CoinSymbol = string;
  export type Level = Level20 | Level150;
  export type Level20 = 'L20';
  export type Level150 = 'L150';
  export type EventMapDto<A, R> = [A, R];
  /**
   * ws 事件
   */
  export interface WsSubMap {
    candle: EventMapDto<[Resolution, '', CoinSymbol], WsCandleRes>;
    ticker: EventMapDto<[CoinSymbol], WsTickerRes>;
    depth: EventMapDto<[Level, CoinSymbol], WsDepthRes>;
    'depth-delta': EventMapDto<[Level, CoinSymbol], WsDepthRes>;
    order: EventMapDto<[CoinSymbol], WsOrderRes>;
    position: EventMapDto<[CoinSymbol], WsPositionRes>;
  }

  /**
   * 单项价格的深度
   */
  export interface DepthUnit {
    price: number;
    vol: number;
  }

  export enum OrderState {
    submitted = 'submitted', //  已提交
    partial_filled = 'partial_filled', // 部分成交
    partial_canceled = 'partial_canceled', // 部分成交已撤销
    filled = 'filled', // 完全成交
    canceled = 'canceled', // 已撤销
    pending_cancel = 'pending_cancel', // 撤销已提交
  }

  export interface OrderResult {
    id: string;
    symbol: string;
    type: 'limit' | 'market';
    side: SideEnum;
    price: string;
    amount: string;
    state: OrderState;
    executed_value: string;
    fill_fees: string;
    fees_income: string; // 返手续费
    exchange: string; // 专区
    filled_amount: string;
    created_at: number;
    source: string;
  }

  export enum LeveragedBalanceState {
    open = 'open',
    close = 'close',
    normal = 'normal',
    blow_up = 'blow_up',
    overrun = 'overrun',
  }

  export const LeveragedBalanceStateText = {
    open: '已开通-未发生借贷',
    close: '已关闭',
    normal: '已借贷-风险率正常',
    blow_up: '已爆仓',
    overrun: '已穿仓',
  };
  export interface LeveragedBalance {
    open: boolean; // 是否已经开通该类型杠杆账户. true:已开通;false:未开通
    leveraged_account_type: string; // 杠杆账户类型
    base: string; // 基准币种
    quote: string; // 计价币种
    available_base_currency_amount: string; // 可用的基准币种资产
    frozen_base_currency_amount: string; // 冻结的基准币种资产
    available_quote_currency_amount: string; // 可用的计价币种资产
    frozen_quote_currency_amount: string; // 冻结的计价币种资产
    available_base_currency_loan_amount: string; // 可借的基准币种数量
    available_quote_currency_loan_amount: string; // 可借的计价币种数量
    blow_up_price: string; // 爆仓价
    risk_rate: string; // 爆仓风险率
    // 账户状态. close 已关闭;open 已开通-未发生借贷;normal 已借贷-风险率正常;blow_up 已爆仓;overrun 已穿仓", allowableValues = "close,open,normal,blow_up,overrun")
    state: {
      open: boolean;
      close: boolean;
      normal: boolean;
      blow_up: boolean;
      overrun: boolean;
    };
  }

  export enum Resolution {
    M1 = 'M1',
    M3 = 'M3',
    M5 = 'M5',
    M15 = 'M15',
    M30 = 'M30',
    H1 = 'H1',
    H4 = 'H4',
    H6 = 'H6',
    D1 = 'D1',
    W1 = 'W1',
    MN = 'MN',
  }

  /**
   * 行情深度
   */
  export enum DepthLevel {
    L20 = 'L20',
    L100 = 'L100',
    FULL = 'full',
  }
  export enum SideEnum {
    Sell = 'sell',
    Buy = 'buy',
  }
}
