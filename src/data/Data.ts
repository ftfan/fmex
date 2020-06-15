import Data from '@/lib/data';
import Vue from 'vue';
import { ViewOptions, Target } from '@/core/View';
import { SiteName } from '@/config';
import { FMex } from '@/api/FMex';

const fmexws = FMex.Wss;

const k_sub: any[] = [];

class Store extends Data {
  // 内存状态
  readonly state = {
    LoadMore: null as any,
    ViewReload: null as any,
    LastCandleTime: Date.now(),
    DataSource: {
      GetCandles: async (Options: ViewOptions, callback: any) => {
        const fulldata: { [index: string]: Candle[] } = {};
        const fullmap: { [index: string]: { [index: string]: Candle } } = {};
        const getData = async (before = 0) => {
          const alldata = (fulldata[Options.Resolution] = fulldata[Options.Resolution] || []);
          const allmap = (fullmap[Options.Resolution] = fullmap[Options.Resolution] || {});
          // const res = await fmex.GetCandles(Options.CoinSymbol.replace('_spot', '_p'), Options.Resolution, 100, before);
          // if (res.Error()) return [];
          const res = await fmexws.req('candle', Options.Resolution, Options.CoinSymbol, 1441, before);
          res.data.reverse().forEach((item) => {
            const data: Candle = {
              timestamp: new Date(item.id * 1000).getTime(),
              open: item.open,
              close: item.close,
              low: item.low,
              high: item.high,
              volume: item.base_vol,
              currency_volume: item.quote_vol,
            };
            const time = data.timestamp;
            if (allmap[time]) return Object.assign(allmap[time], data);
            allmap[time] = data;
            alldata.unshift(data);
          });
          callback(alldata);
        };

        Vue.DataStore.state.LoadMore = async () => {
          const alldata = (fulldata[Options.Resolution] = fulldata[Options.Resolution] || []);
          const len = alldata.length;
          await getData(alldata[0].timestamp);
          console.log('alldata', len, alldata.length);
          callback(alldata);
        };
        Vue.DataStore.state.ViewReload = async () => {
          const alldata = (fulldata[Options.Resolution] = fulldata[Options.Resolution] || []);
          callback(alldata);
        };
        await getData(Math.ceil(Date.now() / 1000));
        console.log(fulldata, fullmap);

        k_sub.forEach((s) => s && s.close());
        const sub0 = fmexws.sub('candle', Options.Resolution, '', Options.CoinSymbol.replace('_p', '_spot'));
        const sub1 = fmexws.sub('ticker', Options.CoinSymbol);
        k_sub[0] = sub0;
        k_sub[1] = sub1;
        sub0.ondata((data) => {
          const alldata = (fulldata[Options.Resolution] = fulldata[Options.Resolution] || []);
          const allmap = (fullmap[Options.Resolution] = fullmap[Options.Resolution] || {});
          const item = {
            timestamp: new Date(data.id * 1000).getTime(),
            open: data.open,
            close: data.close,
            low: data.low,
            high: data.high,
            volume: data.base_vol,
            currency_volume: data.quote_vol,
          };
          this.state.LastCandleTime = data.seq * 1000;
          const time = item.timestamp;
          if (allmap[time]) {
            Object.assign(allmap[time], item);
            callback(alldata);
            return;
          }
          allmap[time] = item;
          alldata.push(item);
          callback(alldata);
        });
        sub1.ondata((data) => {
          const alldata = (fulldata[Options.Resolution] = fulldata[Options.Resolution] || []);
          const allmap = (fullmap[Options.Resolution] = fullmap[Options.Resolution] || {});
          if (data.ts < this.state.LastCandleTime) return; // 时间还比这个慢，走吧走吧不看了
          this.state.LastCandleTime = data.ts;
          const time = data.ts - (data.ts % 60000);
          if (!allmap[time]) return; // 找不到数据源，不要了不要了
          const item = allmap[time];
          item.close = data.ticker[0];
          if (item.low > item.close) item.low = item.close;
          if (item.high < item.close) item.high = item.close;
          callback(alldata);
          return;
        });
      },
    },
  };

  // session
  readonly sessionState = {};

  // 持久状态
  readonly localState = {
    ViewOptions: {
      CoinSymbol: 'btcusd_p',
      Resolution: FMex.Resolution.M1,
      Target: ['BOLL20'],
      CandleNum: 1440,
    } as ViewOptions,
    Targets: [
      {
        value: 'MA-移动平均线',
        children: [{ value: 'MA5' }, { value: 'MA15' }, { value: 'MA20' }],
      },
      {
        value: 'BOLL-布林线',
        children: [{ value: 'BOLL10' }, { value: 'BOLL20' }, { value: 'BOLL30' }],
      },
      {
        value: 'OBV-能量潮',
        children: [{ value: 'OBV' }, { value: 'OBV*多空比例净额' }],
      },
    ] as Target[],
  };

  protected name = `${SiteName}:Data`;

  constructor() {
    super();
    this.initilization();
  }
}

export const DataStore = new Store();

declare module 'vue/types/vue' {
  interface Vue {
    $DataStore: Store;
  }
  interface VueConstructor {
    DataStore: Store;
  }
}

Vue.use((Vue) => {
  Vue.prototype.$DataStore = DataStore;
  Vue.DataStore = DataStore;
});

export interface GetCandles {
  (id: string, Options: ViewOptions, callback: (dates: Candle[]) => any): any;
}

export interface DataSource {
  Name: string; // okex
  Api: {
    GetCandles: GetCandles;
  };
}

export interface Candle {
  timestamp: number;
  open: number;
  close: number;
  // diff: string;
  low: number;
  high: number;
  volume: number;
  currency_volume: number;
}
