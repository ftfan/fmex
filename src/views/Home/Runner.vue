<template>
  <div class="HomeRunner">
    <div>
      <el-button type="success" @click="CreateRunner = true">创建策略</el-button>
      <el-button type="primary" @click="ImportRunner">导入策略</el-button>
      <el-dialog title="创建策略" :visible.sync="CreateRunner" @close="DialogClear" :close-on-click-modal="false">
        <div>
          

        </div>
        <div slot="footer" class="dialog-footer">
          <el-button @click="CreateRunner = false">取 消</el-button>
          <el-button type="primary" @click="AddKey">确 定</el-button>
        </div>
      </el-dialog>
    </div>
    <el-divider></el-divider>
    <div class="clearfix">
      <el-card class="box-card fl" v-for="data in $UserStore.localState.SecretKeys" :key="data.Key">
        <div slot="header" class="clearfix">
          <el-tag size="mini" style="max-width:160px;text-overflow: ellipsis;overflow: hidden;">{{ data.Key }}</el-tag>
          <el-button style="float: right; padding: 3px;margin-left:2px;" @click="DeleteKey(data)" plain type="warning">删除</el-button>
          <el-button style="float: right; padding: 3px;margin-left:2px;" @click="ModifyKey(data)" plain type="success">修改</el-button>
          <el-button style="float: right; padding: 3px;margin-left:2px;" @click="ModifyKey(data)" plain type="primary">导出</el-button>
          <el-button style="float: right; padding: 3px;margin-left:2px;" @click="ModifyKey(data)" plain type="success">运行</el-button>
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
import { EncryptStrByPassword, DecryptStrByPassword } from '../../lib/password';
import { SecretKey } from '../../types/Secret';

@Component
export default class HomeRunner extends Vue {
  CreateRunner = false;
  form = {
    Secret: '',
    Key: '',
    Desc: '',
    Password: '',
    Password2: '',
    origin: null as null | SecretKey,
  };
  created() {
    this.$UserStore.clear;
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
    this.CreateRunner = true;
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
      const res = this.$UserStore.AddKey({ Key, Secret, Desc }, pwd.Data, this.form.origin);
      if (res.Error()) return this.$notify.warning(res.Msg);
      this.$message.success('修完成功');
    } else {
      // 添加流程
      const res = this.$UserStore.AddKey({ Key, Secret, Desc }, pwd.Data);
      if (res.Error()) return this.$notify.warning(res.Msg);
      this.$message.success('添加成功');
    }
    this.CreateRunner = false;
  }

  // 站点数据重置
  async ImportRunner() {
    const ans: any = await this.$prompt('！！！该操作无法撤销，请自行备份数据；输入：我确认重置', { inputPlaceholder: '请输入：我确认重置', closeOnClickModal: false });
    if (!ans) return;
    if (ans.value !== '我确认重置') return this.$notify.warning('输入错误');
    this.$UserStore.localState.Password = '';
    this.$UserStore.localState.SecretKeys = [];
    this.$message.success('重置完成');
  }
}
</script>

<style scoped lang="scss">
.HomeRunner {
  .box-card {
    width: 360px;
    height: 114px;
    margin: 10px;
  }
}
</style>
