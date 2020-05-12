import axios, { AxiosInstance } from 'axios';
import { CodeObj, Code } from '@/types/Api';
import { ApiSign } from '@/api/FCoinSign';
import { SideEnum, SymbolEnum, CandleResolution, CoinHas, CoinHas2, OrderResult, LeveragedBalance, TickerData, DepthLevel, DepthData, DepthUnit } from '@/types/types';

export class FCoinApi {
  api!: AxiosInstance;
  constructor(AccessKey: string, AccessSecret: string) {
    const _axios = (this.api = axios.create({
      baseURL: '/fcoin',
      timeout: 10000,
    }));

    _axios.interceptors.request.use(
      (config) => {
        ApiSign(config, {
          DomainReal: 'https://api.fcoin.com',
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

  // 创建订单
  async OrderCreate(symbol: SymbolEnum, side: SideEnum, type = 'limit', price: string, amount: string, exchange: string, account_type?: string) {
    const data: any = { symbol, side, type, price, amount, exchange };
    if (account_type) data.account_type = account_type;
    return this.api.post(`/v2/orders`, data).then((res) => res.data as CodeObj<string>);
  }

  // 撤销订单
  async OrderCancel(id: string) {
    return this.api.post(`/v2/orders/${id}/submit-cancel`).then(
      (res) =>
        res.data as CodeObj<{
          price: string;
          fill_fees: string;
          filled_amount: string;
          side: SideEnum;
          type: string;
          created_at: number;
        }>
    );
  }

  async FetchCandle(symbol: string, resolution = CandleResolution.M1, limit = 20, before = '') {
    const params = { limit };
    if (before) Object.assign(params, { before });
    return this.api.post(`/v2/market/candles/${resolution}/${symbol}`, null, { params }).then(
      (res) =>
        res.data as CodeObj<
          {
            id: number; // 1540809840,
            seq: number; // 24793830600000,
            high: number; // 6491.74,
            low: number; // 6489.24,
            open: number; // 6491.24,
            close: number; // 6490.07,
            count: number; // 26,
            base_vol: number; // 8.2221,
            quote_vol: number; // 53371.531286
          }[]
        >
    );
  }

  // 查询账户资产
  async FetchBalance() {
    return this.api.get(`/v2/accounts/balance`).then((res) => res.data as CodeObj<CoinHas[]>);
  }

  // 查询钱包资产
  async FetchBalance2() {
    return this.api.get(`/v2/assets/accounts/balance`).then((res) => res.data as CodeObj<CoinHas2[]>);
  }

  // 钱包到交易账户
  async Assets2Spot(currency: string, amount: number) {
    return this.api.post(`/v2/assets/accounts/assets-to-spot`, { currency, amount }).then((res) => res.data as CodeObj<null>);
  }

  // 交易账户到钱包
  async Spot2Assets(currency: string, amount: number) {
    return this.api.post(`/v2/accounts/spot-to-assets`, { currency, amount }).then((res) => res.data as CodeObj<null>);
  }

  // 查询所有订单
  async FetchOrders(symbol: SymbolEnum, states = 'submitted,filled', limit = '100', time?: { value: number; type: 'after' | 'before' }) {
    const params = { symbol, states, limit };
    if (time) Object.assign(params, { [time.type]: time.value.toString() });
    return this.api.get(`/v2/orders`, { params }).then((res) => res.data as CodeObj<OrderResult[]>);
  }

  // 查询杠杠账户信息
  async FetchLeveragedBalances(): Promise<CodeObj<LeveragedBalance[]>> {
    return this.api.get(`/v2/broker/leveraged_accounts`).then((res) => {
      const response = res.data as CodeObj<LeveragedBalance[]>;
      if (res.data.Error()) return response;
      response.Data.forEach((data) => {
        const states = ((data.state as any) || '').split(',') as string[];
        data.state = {
          open: false,
          close: false,
          normal: false,
          blow_up: false,
          overrun: false,
        };
        states.forEach((state) => {
          (data.state as any)[state] = true;
        });
      });
      return response;
    });
  }

  // 查询杠杠账户指定币种信息
  async FetchLeveragedBalance(account_type: string): Promise<CodeObj<LeveragedBalance>> {
    return this.api.get(`/v2/broker/leveraged_accounts/account`, { params: { account_type } }).then((res) => {
      const response = res.data as CodeObj<LeveragedBalance>;
      if (res.data.Error()) return response;
      const states = ((response.Data.state as any) || '').split(',') as string[];
      response.Data.state = {
        open: false,
        close: false,
        normal: false,
        blow_up: false,
        overrun: false,
      };
      states.forEach((state) => {
        (response.Data.state as any)[state] = true;
      });
      return response;
    });
  }

  // 获取指定 id 的订单
  async FetchOrderById(id: string) {
    return this.api.get(`/v2/orders/${id}`).then((res) => res.data as CodeObj<OrderResult>);
  }

  /**
   * 行情接口(ticker)
   */
  async Ticker(symbol: SymbolEnum) {
    return this.api.get(`/v2/market/ticker/${symbol}`).then((res) => {
      if (res.data.Error()) return res.data as CodeObj<TickerData>;
      const ticker = res.data.Data.ticker;
      return new CodeObj(Code.Success, {
        seq: res.data.Data.seq,
        type: res.data.Data.type,
        LastPrice: ticker[0], // 最新成交价
        LastVolume: ticker[1], // 最近一笔成交量
        MaxBuyPrice: ticker[2], // 最大买一价格
        MaxBuyVolume: ticker[3], // 最大买一量
        MinSalePrice: ticker[4], // 最小卖一价格
        MinSaleVolume: ticker[5], // 最小卖一量
        BeforeH24Price: ticker[6], // 24小时前成交价
        HighestH24Price: ticker[7], // 24小时内最高价
        LowestH24Price: ticker[8], // 24小时内最低价
        OneDayVolume1: ticker[9], // 24小时内基准货币成交量, 如 btcusdt 中 btc 的量
        OneDayVolume2: ticker[10], // 24小时内基准货币成交量, 如 btcusdt 中 usdt 的量
      });
    });
  }

  /**
   * 深度查询
   */
  async Depth(symbol: SymbolEnum, deep: DepthLevel) {
    return this.api.get(`/v2/market/depth/${deep}/${symbol}`).then((res) => {
      if (res.status) return res.data as CodeObj<DepthData>;
      const bids: DepthUnit[] = [];
      const asks: DepthUnit[] = [];
      (res.data.bids as number[]).forEach((num, index) => {
        const isVol = Boolean(index % 2);
        const realIndex = Math.floor(index / 2);
        if (!isVol) {
          bids.push({ price: num, vol: 0 });
        } else {
          bids[realIndex].vol = num;
        }
      });
      (res.data.asks as number[]).forEach((num, index) => {
        const isVol = Boolean(index % 2);
        const realIndex = Math.floor(index / 2);
        if (!isVol) {
          asks.push({ price: num, vol: 0 });
        } else {
          asks[realIndex].vol = num;
        }
      });
      return new CodeObj<DepthData>(Code.Success, {
        bids,
        asks,
        seq: res.data.seq,
        ts: res.data.ts,
        type: res.data.type,
      });
    });
  }
}
