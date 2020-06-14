import axios, { AxiosInstance } from 'axios';
import { CodeObj, Code } from '@/types/Api';

export class OkexApi {
  api!: AxiosInstance;
  constructor(AccessKey: string, AccessSecret: string) {
    const _axios = (this.api = axios.create({
      baseURL: '/okex',
      timeout: 10000,
    }));

    _axios.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => Promise.resolve({ data: new CodeObj(Code.Error, null, String(error)) })
    );

    _axios.interceptors.response.use(
      (response) => {
        if (response.data) {
          response.data = new CodeObj(Code.Success, response.data, '', response.data);
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
}

// const ws = new WebSocket('wss://okexcomreal.bafang.com:8443/ws/v3');
// export const okexws = new Promise<WebSocket>((resolve) => {
//   ws.onopen = () => {
//     console.log('ws open');
//     ws.send(JSON.stringify({ op: 'subscribe', args: ['spot/ticker:ETH-USDT', 'spot/candle60s:ETH-USDT'] }));
//     resolve(ws);
//   };
// });

// const pako = require('pako');
// ws.onmessage = (data) => {
//   // const msg = arg.data;
//   // const msg = window.zip.(arg.data);
//   const reader = new FileReader();
//   reader.onload = function(event) {
//     let content = reader.result; //内容就在这里
//     console.log(content);
//     content = pako.inflate(content, { to: 'string' });
//     console.log(content);
//   };
//   reader.readAsText(data.data);
// };
// ws.onerror = (errs) => {
//   if (errs) console.error(errs);
//   alert('无法连接到ws');
// };