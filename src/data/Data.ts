import Data from '@/lib/data';
import Vue from 'vue';
import { ViewOptions } from '@/core/View';
import { DateFormat } from '@/lib/time';
import { SiteName } from '@/config';
import { FMex } from '@/api/FMex';

const fmex = new FMex.Api('', '');
const fmexws = FMex.Wss;
const TimeOutSpeed = 1000;

class Store extends Data {
  // 内存状态
  readonly state = {
    LoadMore: null as any,
    DataSource: {
      GetCandles: async (Options: ViewOptions, callback: any) => {
        const fulldata: { [index: string]: Candle[] } = {};
        const fullmap: { [index: string]: { [index: string]: Candle } } = {};
        const getData = async (before = 0) => {
          const alldata = (fulldata[Options.Resolution] = fulldata[Options.Resolution] || []);
          const allmap = (fullmap[Options.Resolution] = fullmap[Options.Resolution] || {});
          // const res = await fmex.GetCandles(Options.CoinSymbol.replace('_spot', '_p'), Options.Resolution, 100, before);
          // if (res.Error()) return [];
          const res = await fmexws.req('candle', Options.Resolution, Options.CoinSymbol.replace('_spot', '_p'), 1441, before);
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
        await getData(Math.ceil(Date.now() / 1000));
        console.log(fulldata, fullmap);

        const sub = fmexws.sub('candle', Options.Resolution, '', Options.CoinSymbol);
        sub.ondata((data) => {
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
      },
    },
  };

  // session
  readonly sessionState = {};

  // 持久状态
  readonly localState = {
    ViewOptions: {
      CoinSymbol: 'btcusd_spot',
      Resolution: FMex.Resolution.M1,
      Target: [],
      CandleNum: 1440,
    } as ViewOptions,
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
