import { CodeObj, Code } from '@/types/Api';

// 用户数据
export class UserDatabase {
  private request: IDBOpenDBRequest;
  public mounted: Promise<IDBDatabase>;
  public db: null | IDBDatabase = null;
  constructor(databaseName: string, onupgradeneeded: (ev: IDBVersionChangeEvent) => any) {
    this.request = window.indexedDB.open(databaseName);
    this.mounted = new Promise((resolve, reject) => {
      this.request.onsuccess = (event) => {
        this.db = this.request.result;
        console.log('数据库打开成功');
        resolve(this.db);
      };
      this.request.onerror = (event) => {
        console.log('数据库打开报错');
        reject();
      };
    });

    this.request.onupgradeneeded = (event) => {
      this.db = this.request.result;
      onupgradeneeded(event);
    };
  }

  onupgradeneeded() {}
}

// 事物等待
export const awaitTransaction = <T>(request: IDBRequest<any>) => {
  return new Promise<CodeObj<T>>((resolve) => {
    request.onerror = function(event) {
      console.log('事务失败', event);
      resolve(new CodeObj<T>(Code.Error, request.result, event + ''));
    };
    request.onsuccess = function(event) {
      resolve(new CodeObj<T>(Code.Success, request.result));
    };
  });
};
