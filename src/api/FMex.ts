import axios, { AxiosInstance } from 'axios';
import { CodeObj, Code } from '@/types/Api';
import { ApiSign } from '@/api/FCoinSign';

export class FMexApi {
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
}
