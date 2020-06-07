import Data from '@/lib/data';
import Vue from 'vue';
import { OkexApi } from '@/api/Okex';
import { ViewOptions } from '@/core/View';
import { BinanceApi } from '@/api/Binance';
import { DateFormat } from '@/lib/time';

const okex = new OkexApi('', '');
const binance = new BinanceApi('', '');
const TimeOutSpeed = 1000;

class Store extends Data {
  // 内存状态
  readonly state = {
    LoadMore: null as any,
    DataSource: [
      {
        Name: 'okex',
        Api: {
          GetCandles: async (id, Options: ViewOptions, callback) => {
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

              const res = await okex.api.get(`/api/spot/v3/instruments/${id}/candles`, { params });
              const data = res.data.Data as string[][];
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
                    // console.log(time);
                    return Object.assign(allmap[time], item);
                  }
                  allmap[time] = item;
                  alldata.unshift(item);
                });
              } else {
                dates.reverse().forEach((item) => {
                  const time = item.timestamp;
                  if (allmap[time]) {
                    // console.log(time);
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
              // const allmap = (fullmap[Options.Granularity] = fullmap[Options.Granularity] || {});
              const len = alldata.length;
              const res = await getData(alldata[0].timestamp);
              console.log('res', res.length, 'alldata', len, alldata.length);
              callback(alldata);
            };
            await getData();

            const timer = setInterval(async () => {
              const alldata = (fulldata[Options.Granularity] = fulldata[Options.Granularity] || []);
              // const allmap = fullmap[Options.Granularity] = fullmap[Options.Granularity] || {};
              await getData();
              callback(alldata);
            }, TimeOutSpeed);
            return () => clearInterval(timer);
          },
        },
      },
      {
        Name: 'Binance',
        Api: {
          GetCandles: async (id, Options: ViewOptions, callback) => {
            id = id.replace('-', '');
            const conf: any = {
              '7d': '1w',
            };
            const fulldata: { [index: string]: Candle[] } = {};
            const fullmap: { [index: string]: { [index: string]: Candle } } = {};
            const params: any = { symbol: id, interval: Options.Granularity };
            const alldata = (fulldata[Options.Granularity] = fulldata[Options.Granularity] || []);
            const allmap = (fullmap[Options.Granularity] = fullmap[Options.Granularity] || {});
            const getData = async (end?: number) => {
              // const alldata = (fulldata[Options.Granularity] = fulldata[Options.Granularity] || []);
              // const allmap = (fullmap[Options.Granularity] = fullmap[Options.Granularity] || {});
              // params.granularity = Options.Granularity;
              if (conf[Options.Granularity]) params.interval = conf[Options.Granularity];
              // if (end) params.end = DateFormat(new Date(end), 'yyyy-MM-ddThh:mm:ss.SZ');
              if (end) params.endTime = end;

              const res = await binance.api.get(`/api/v3/klines`, { params });
              const data = res.data.Data as string[][];
              if (!data) return [];
              const dates: Candle[] = data.reverse().map((item: string[]) => {
                return {
                  timestamp: parseFloat(item[0]),
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
                    // console.log(time);
                    return (allmap[time] = item);
                  }
                  allmap[time] = item;
                  alldata.unshift(item);
                });
              } else {
                dates.reverse().forEach((item) => {
                  const time = item.timestamp;
                  if (allmap[time]) {
                    // console.log(time);
                    return Object.assign(allmap[time], item);
                  }
                  allmap[time] = item;
                  alldata.push(item);
                });
              }
              return dates;
            };

            Vue.DataStore.state.LoadMore = async () => {
              const len = alldata.length;
              const res = await getData(alldata[0].timestamp);
              console.log('res', res.length, 'alldata', len, alldata.length);
              callback(alldata);
            };
            await getData();
            const ws = new WebSocket(`wss://stream.binancezh.com:9443/ws/${id.toLocaleLowerCase()}@kline_${params.interval}`);
            const open = await new Promise<WebSocket>((resolve) => {
              ws.onopen = () => {
                console.log('ws open');
                resolve(ws);
              };
            });

            ws.onmessage = (arg) => {
              const msg = arg.data;
              try {
                const data = JSON.parse(msg.toString());
                // const alldata = (fulldata[Options.Granularity] = fulldata[Options.Granularity] || []);
                // const allmap = fullmap[Options.Granularity] = fullmap[Options.Granularity] || {};
                // "t": 123400000, // 这根K线的起始时间
                // "T": 123460000, // 这根K线的结束时间
                // "s": "BNBBTC",  // 交易对
                // "i": "1m",      // K线间隔
                // "f": 100,       // 这根K线期间第一笔成交ID
                // "L": 200,       // 这根K线期间末一笔成交ID
                // "o": "0.0010",  // 这根K线期间第一笔成交价
                // "c": "0.0020",  // 这根K线期间末一笔成交价
                // "h": "0.0025",  // 这根K线期间最高成交价
                // "l": "0.0015",  // 这根K线期间最低成交价
                // "v": "1000",    // 这根K线期间成交量
                // "n": 100,       // 这根K线期间成交数量
                // "x": false,     // 这根K线是否完结（是否已经开始下一根K线）
                // "q": "1.0000",  // 这根K线期间成交额
                // "V": "500",     // 主动买入的成交量
                // "Q": "0.500",   // 主动买入的成交额
                // "B": "123456"   // 忽略此参数
                const item = {
                  timestamp: parseFloat(data.k.t),
                  open: parseFloat(data.k.o),
                  close: parseFloat(data.k.c),
                  low: parseFloat(data.k.l),
                  high: parseFloat(data.k.h),
                  volume: parseFloat(data.k.v),
                  currency_volume: parseFloat(data.k.q),
                };
                const time = data.k.t;
                if (allmap[time]) {
                  Object.assign(allmap[time], item);
                } else {
                  allmap[time] = item;
                  alldata.push(item);
                }

                callback(alldata);
              } catch (e) {
                console.error(msg, e);
                return;
              }
            };
            ws.onerror = (errs) => {
              if (errs) console.error(errs);
              alert('无法连接到ws');
            };

            return () => ws.close();
          },
        },
      },
    ] as DataSource[],
  };

  // session
  readonly sessionState = {};

  // 持久状态
  readonly localState = {
    ViewOptions: {
      Granularity: '1分钟',
      Target: [],
      CandleNum: 1440,
      Source: 'okex',
    } as ViewOptions,
  };

  protected name = `fmex:Data`;

  constructor() {
    super();
    this.initilization();
    console.log(this);
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
