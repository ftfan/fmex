import Data from '@/lib/data';
import Vue from 'vue';
import { CodeObj, Code } from '@/types/Api';
import { OkexApi, okexws } from '@/api/Okex';
import { DateFormat } from '@/lib/time';
import BigNumber from 'bignumber.js';
import { ViewOptions } from '@/core/View';

const okex = new OkexApi('', '');

class Store extends Data {
  // 内存状态
  readonly state = {
    DataSource: [
      {
        Name: 'okex',
        Api: {
          GetCandles: async (id, Options: ViewOptions, callback) => {
            const conf: any = {
              '1分钟': 60,
              '3分钟': 180,
              '5分钟': 300,
              '15分钟': 900,
              '30分钟': 1800,
              '1小时': 3600,
              '2小时': 7200,
              '4小时': 14400,
              '6小时': 21600,
              '12小时': 43200,
              '1天': 86400,
              '7天': 604800,
            };

            const timer = setInterval(async () => {
              let granularity = Options.Granularity;
              if (conf[granularity]) granularity = conf[granularity];
              const res = await okex.api.get(`/api/swap/v3/instruments/${id}/candles`, { params: { granularity } });
              const data = res.data.Data as string[][];
              const dates = data
                .map((item: string[]) => {
                  const time = DateFormat(new Date(item[0]), 'yyyy/MM/dd hh:mm');
                  const open = item[1];
                  const close = item[4];
                  const high = item[2];
                  const low = item[3];
                  const diff = new BigNumber(open).minus(close).toString();
                  const ps = new BigNumber(open)
                    .minus(close)
                    .div(new BigNumber(open))
                    .toFixed(2);
                  return [time, open, close, diff, ps, low, high];
                })
                .reverse();
              callback(dates);
            }, 1000);
            return () => clearInterval(timer);
            // const ws = await okexws;
            // ws.send(
            //   JSON.stringify({
            //     op: 'subscribe',
            //     args: [`swap/candle60s:${id}`],
            //   })
            // );
          },
        },
      },
    ] as DataSource[],
  };

  // session
  readonly sessionState = {};

  // 持久状态
  readonly localState = {};

  protected name = `Data`;

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
  (id: string, Options: ViewOptions, callback: (dates: string[][]) => any): any;
}

export interface DataSource {
  Name: string; // okex
  Api: {
    GetCandles: GetCandles;
  };
}
