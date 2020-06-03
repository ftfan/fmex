import Data from '@/lib/data';
import Vue from 'vue';
import { EncryptStrByPassword, DecryptStrByPassword } from '@/lib/password';
import { Salt, DeveloperBrokerID } from '@/config';
import { CodeObj, Code } from '@/types/Api';
import { SecretKey } from '@/types/Secret';

class Store extends Data {
  // 内存状态
  readonly state = {};

  // session
  readonly sessionState = {};

  // 持久状态
  readonly localState = {
    Password: '', // 用户密码校验。为空则表示用户还未设置密码

    SecretKeys: [] as SecretKey[], // 秘钥列表

    BrokerID: DeveloperBrokerID,
  };

  protected name = `fmex:User`;

  constructor() {
    super();
    this.initilization();
  }

  // 设置密码
  SetPassword(pwd: string, last = '') {
    // 已存在
    if (this.localState.Password) {
      const check = this.CheckPassword(last);
      if (check.Error()) return check;
    }
    const res = EncryptStrByPassword(pwd, `${pwd}${Salt}`);
    if (res.Error()) return res;
    this.localState.Password = res.Data;
    return res;
  }

  // 请求输入秘钥认证
  async PromptPassword() {
    const pwd: any = await Vue.prototype.$prompt('身份认证', { inputPlaceholder: '输入站点密码确认身份', closeOnClickModal: false });
    if (!pwd) return new CodeObj(Code.Error, null, '取消认证');
    const pwdvalue = pwd.value || '';
    const check = this.CheckPassword(pwdvalue);
    if (check.Error()) return check;
    return new CodeObj(Code.Success, pwdvalue);
  }

  // 校验密码
  CheckPassword(pwd: string) {
    const data = `${pwd}${Salt}`;
    const check = DecryptStrByPassword(pwd, this.localState.Password);
    if (check.Error()) return check;
    if (check.Data !== data) return new CodeObj(Code.Error, null, '密码错误');
    return check;
  }

  // 添加密钥对
  AddKey(data: SecretKey, pwd: string, origin: null | SecretKey = null) {
    if (!data.Key) return new CodeObj(Code.Error, null, 'Key 为空');
    if (!data.Secret) return new CodeObj(Code.Error, null, 'Secret 为空');
    const res = EncryptStrByPassword(pwd, data.Secret);
    if (res.Error()) return res;
    const has = this.localState.SecretKeys.filter((item) => item.Key === data.Key)[0];
    if (has && has !== origin) return new CodeObj(Code.Error, null, '该秘钥已存在，无法重复添加');
    // 修改
    if (origin) {
      origin.Key = data.Key;
      origin.Secret = res.Data;
      origin.Desc = data.Desc;
      return res;
    }
    this.localState.SecretKeys.push({
      Key: data.Key,
      Secret: res.Data,
      Desc: data.Desc,
    });
    return res;
  }
  // 删除密钥对
  DeleteKey(key: string, pwd: string) {
    const res = this.CheckPassword(pwd);
    if (res.Error()) return res;
    const has = this.localState.SecretKeys.filter((item) => item.Key === key)[0];
    if (!has) return new CodeObj(Code.Success);
    const index = this.localState.SecretKeys.indexOf(has);
    this.localState.SecretKeys.splice(index, 1);
    return new CodeObj(Code.Success);
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
