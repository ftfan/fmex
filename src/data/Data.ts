import Data from '@/lib/data';
import Vue from 'vue';
import { ViewOptions } from '@/core/View';
// import { BinanceApi } from '@/api/Binance';
import { DateFormat } from '@/lib/time';
import { SiteName } from '@/config';

import { PublicClient } from '@/api/okex';
import { V3WebsocketClient } from '@/api/okex';
// import { AuthenticatedClient } from '@/api/okex';
const okex = PublicClient('/okex', 10000);
const TimeOutSpeed = 1000;
// const wss = new V3WebsocketClient();
// wss.connect();
// wss.subscribe('swap/candle60s');

class Store extends Data {
  // 内存状态
  readonly state = {
    LoadMore: null as any,
    DataSource: {
      GetCandles: async (instrument_id: string, Options: ViewOptions, callback: any) => {
        const conf: any = {
          '1m': 60,
          '3m': 180,
          '5m': 300,
          '15m': 900,
          '30m': 1800,
          '1h': 3600,
          '2h': 7200,
          '4h': 14400,
          '6h': 21600,
          '12h': 43200,
          '1d': 86400,
          '7d': 604800,
        };
        const fulldata: { [index: string]: Candle[] } = {};
        const fullmap: { [index: string]: { [index: string]: Candle } } = {};
        const getData = async (end?: number) => {
          const alldata = (fulldata[Options.Granularity] = fulldata[Options.Granularity] || []);
          const allmap = (fullmap[Options.Granularity] = fullmap[Options.Granularity] || {});
          const params: any = {};
          params.granularity = Options.Granularity;
          if (conf[params.granularity]) params.granularity = conf[params.granularity];
          // if (end) params.end = DateFormat(new Date(end), 'yyyy-MM-ddThh:mm:ss.SZ');
          if (end) params.end = DateFormat(new Date(end - 8 * 60 * 60000), 'yyyy-MM-ddThh:mm:ss.SZ');
          const data: string[][] = await okex.swap().getCandles(instrument_id, params);
          if (!data) return [];
          const dates: Candle[] = data.map((item: string[]) => {
            return {
              timestamp: new Date(item[0]).getTime(),
              open: parseFloat(item[1]),
              close: parseFloat(item[4]),
              low: parseFloat(item[3]),
              high: parseFloat(item[2]),
              volume: parseFloat(item[5]),
              currency_volume: parseFloat(item[6]),
            };
          });
          if (end) {
            dates.forEach((item) => {
              const time = item.timestamp;
              if (allmap[time]) {
                return Object.assign(allmap[time], item);
              }
              allmap[time] = item;
              alldata.unshift(item);
            });
          } else {
            dates.reverse().forEach((item) => {
              const time = item.timestamp;
              if (allmap[time]) {
                return Object.assign(allmap[time], item);
              }
              allmap[time] = item;
              alldata.push(item);
            });
          }
          return dates;
        };

        Vue.DataStore.state.LoadMore = async () => {
          const alldata = (fulldata[Options.Granularity] = fulldata[Options.Granularity] || []);
          const len = alldata.length;
          const res = await getData(alldata[0].timestamp);
          console.log('res', res.length, 'alldata', len, alldata.length);
          callback(alldata);
        };
        await getData();
        // okex 破 sdk，ws不支持浏览器。
        const timer = setInterval(async () => {
          const alldata = (fulldata[Options.Granularity] = fulldata[Options.Granularity] || []);
          // const allmap = fullmap[Options.Granularity] = fullmap[Options.Granularity] || {};
          await getData();
          callback(alldata);
        }, TimeOutSpeed);
        return () => clearInterval(timer);
      },
    },
  };

  // session
  readonly sessionState = {};

  // 持久状态
  readonly localState = {
    ViewOptions: {
      Granularity: '1分钟',
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
