import Data from '@/lib/data';
import Vue from 'vue';
import { SiteName } from '@/config';
import { SecretKey } from '@/types/Secret';

class Store extends Data {
  // 内存状态
  readonly state = {
    ChooseKey: false,
    ChooseKeyResolve: (data: any) => {
      //
    },
  };

  // session
  readonly sessionState = {};

  // 持久状态
  readonly localState = {};

  protected name = `${SiteName}:App`;

  constructor() {
    super();
    this.initilization();
  }

  async ChooseKey(): Promise<SecretKey> {
    return new Promise((resolve) => {
      this.state.ChooseKey = true;
      this.state.ChooseKeyResolve = resolve;
    });
  }
}

export const AppStore = new Store();

declare module 'vue/types/vue' {
  interface Vue {
    $AppStore: Store;
  }
  interface VueConstructor {
    AppStore: Store;
  }
}

Vue.use((Vue) => {
  Vue.prototype.$AppStore = AppStore;
  Vue.AppStore = AppStore;
});
