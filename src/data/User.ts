import Data from '@/lib/data';
import Vue from 'vue';

class Store extends Data {
  // 内存状态
  readonly state = {};

  // session
  readonly sessionState = {};

  // 持久状态
  readonly localState = {};

  protected name = `User`;

  constructor() {
    super();
    this.initilization();
  }
}

export const UserStore = new Store();

declare module 'vue/types/vue' {
  interface Vue {
    $UserStore: Store;
  }
  interface VueConstructor {
    UserStore: Store;
  }
}

Vue.use((Vue) => {
  Vue.prototype.$UserStore = UserStore;
  Vue.UserStore = UserStore;
});
