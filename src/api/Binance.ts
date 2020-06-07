import axios, { AxiosInstance } from 'axios';
import { CodeObj, Code } from '@/types/Api';

export class BinanceApi {
  api!: AxiosInstance;
  constructor(AccessKey: string, AccessSecret: string) {
    const _axios = (this.api = axios.create({
      baseURL: '/binancezh',
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
