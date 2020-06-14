<template>
  <div class="HomeKey">
    <div>
      <el-button type="primary" @click="AddKeyDialog = true">添加秘钥</el-button>
      <el-button type="danger" @click="ResetAll">重置站点</el-button>
      <el-tooltip class="item" effect="dark" content="非必要情况，希望不要修改该数据 ^_^ 感谢支持" placement="top">
        <div style="display:inline-block;">
          <el-link style="margin-left:8px;">BrokerID:</el-link>
          <el-autocomplete size="mini" v-model="$UserStore.localState.BrokerID" :fetch-suggestions="querySearch" placeholder="请输入BrokerID"></el-autocomplete>
        </div>
      </el-tooltip>

      <el-dialog :title="$UserStore.localState.Password ? (form.origin ? '修改秘钥' : '添加秘钥') : '请先设置站点密码'" :visible.sync="AddKeyDialog" @close="DialogClear" :close-on-click-modal="false">
        <!-- 用户已经设置过密码 -->
        <el-form :model="form" label-width="100px" v-if="$UserStore.localState.Password">
          <el-form-item label="备注"><el-input placeholder="（选填）例如：FMex只读权限" v-model="form.Desc" autocomplete="off"></el-input></el-form-item>
          <el-form-item label="Passphrase">
            <el-input placeholder="Passphrase" v-model="form.Pwd" autocomplete="off"></el-input>
          </el-form-item>
          <el-form-item label="Key"><el-input placeholder="（必填）例如：xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" v-model="form.Key" autocomplete="off"></el-input></el-form-item>
          <el-form-item label="Secret"><el-input placeholder="（必填）例如：xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" v-model="form.Secret" autocomplete="off"></el-input></el-form-item>
        </el-form>
        <!-- 用户首次设置密码 -->
        <el-form :model="form" label-width="100px" v-else>
          <el-form-item label="密码"><el-input v-model="form.Password" autocomplete="off"></el-input></el-form-item>
          <el-form-item label="确认输入"><el-input v-model="form.Password2" autocomplete="off"></el-input></el-form-item>
          <el-form-item label="说明">
            <el-link type="primary" disabled>该密码用于【秘钥加密】、【校验身份】<br />如果忘记密码，需要重置站点数据</el-link>
          </el-form-item>
        </el-form>
        <div slot="footer" class="dialog-footer">
          <el-button @click="AddKeyDialog = false">取 消</el-button>
          <el-button type="primary" @click="AddKey">确 定</el-button>
        </div>
      </el-dialog>
    </div>
    <el-divider></el-divider>
    <div class="clearfix">
      <el-card class="box-card fl" v-for="data in $UserStore.localState.SecretKeys" :key="data.Key">
        <div slot="header" class="clearfix">
          <el-tag size="mini">{{ data.Key }}</el-tag>
          <el-button style="padding: 3px;margin-left:4px;" @click="DeleteKey(data)" type="warning">删除</el-button>
          <el-button style="padding: 3px;margin-left:4px;" @click="ModifyKey(data)" type="success">修改</el-button>
          <el-button style="padding: 3px;margin-left:4px;" @click="Test(data)" type="primary">测试</el-button>
        </div>
        <div>
          备注：<el-tag size="small" v-if="data.Desc">{{ data.Desc }}</el-tag>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { EncryptStrByPassword, DecryptStrByPassword } from '@/lib/password';
import { SecretKey } from '@/types/Secret';
import { DeveloperBrokerID } from '@/config';

@Component
export default class HomeKey extends Vue {
  AddKeyDialog = false;
  form = {
    Secret: '',
    Key: '',
    Desc: '',
    Password: '',
    Password2: '',
    Pwd: '',
    origin: null as null | SecretKey,
  };
  created() {
    this.$UserStore.clear;
  }
  querySearch(queryString: string, cb: any) {
    cb([{ value: DeveloperBrokerID }]);
  }
  DialogClear() {
    this.form.Key = '';
    this.form.Secret = '';
    this.form.Desc = '';
    this.form.origin = null;
    this.form.Password = '';
    this.form.Password2 = '';
  }

  // 修改秘钥
  async ModifyKey(data: SecretKey) {
    const pwd = await this.$UserStore.PromptPassword();
    if (pwd.Error()) return this.$notify.warning(pwd.Msg);
    // 解密秘钥
    const sec = DecryptStrByPassword(pwd.Data, data.Secret);
    if (sec.Error()) return this.$notify.warning(sec.Msg);
    this.form.Secret = sec.Data;
    this.form.Key = data.Key;
    this.form.Desc = data.Desc;
    this.form.Pwd = data.Pwd;
    this.AddKeyDialog = true;
    this.form.origin = data;
  }
  async DeleteKey(data: SecretKey) {
    const pwd = await this.$UserStore.PromptPassword();
    if (pwd.Error()) return this.$notify.warning(pwd.Msg);
    const del = await this.$UserStore.DeleteKey(data.Key, pwd.Data);
    if (del.Error()) return this.$notify.warning(del.Msg);
    this.$message.success('删除成功');
  }

  // 添加秘钥
  async AddKey() {
    // 用户首次设置密码
    if (!this.$UserStore.localState.Password) {
      const Password = this.form.Password || '';
      const Password2 = this.form.Password2 || '';
      if (Password !== Password2) return this.$notify.warning('两次密码输入不一致');
      const res = this.$UserStore.SetPassword(Password);
      if (res.Error()) return this.$notify.warning(res.Msg);
      this.$message.success('密码设置成功');
      return;
    }
    // 添加Key 流程
    const Desc = (this.form.Desc || '').trim();
    const Pwd = (this.form.Pwd || '').trim();
    const Key = (this.form.Key || '').trim();
    const Secret = (this.form.Secret || '').trim();
    if (!Key) return this.$notify.warning('Key 不可为空');
    if (!Secret) return this.$notify.warning('Secret 不可为空');

    // 添加流程，避免重复
    if (!this.form.origin) {
      const has = this.$UserStore.localState.SecretKeys.filter((item) => item.Key === Key);
      if (has.length) return this.$notify.warning('Key 重复');
    }

    const pwd = await this.$UserStore.PromptPassword();
    if (pwd.Error()) return this.$notify.warning(pwd.Msg);

    // 修改流程
    if (this.form.origin) {
      const res = this.$UserStore.AddKey({ Key, Secret, Desc, Pwd }, pwd.Data, this.form.origin);
      if (res.Error()) return this.$notify.warning(res.Msg);
      this.$message.success('修完成功');
    } else {
      // 添加流程
      const res = this.$UserStore.AddKey({ Key, Secret, Desc, Pwd }, pwd.Data);
      if (res.Error()) return this.$notify.warning(res.Msg);
      this.$message.success('添加成功');
    }
    this.AddKeyDialog = false;
  }

  // 站点数据重置
  async ResetAll() {
    const ans: any = await this.$prompt('！！！该操作无法撤销，请自行备份数据；输入：我确认重置', { inputPlaceholder: '请输入：我确认重置', closeOnClickModal: false });
    if (!ans) return;
    if (ans.value !== '我确认重置') return this.$notify.warning('输入错误');
    this.$UserStore.localState.Password = '';
    this.$UserStore.localState.SecretKeys = [];
    this.$message.success('重置完成');
  }

  async Test(data: SecretKey) {
    const pwd = await this.$UserStore.PromptPassword();
    if (pwd.Error()) return;
    const res = await this.$UserStore.Test(data, pwd.Data);
    if (res.Error()) return this.$message.error(res.Msg);
    this.$message.success('api 有效');
  }
}
</script>

<style scoped lang="scss">
.HomeKey {
  .box-card {
    margin: 10px;
  }
}
</style>
