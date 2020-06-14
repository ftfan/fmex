<template>
  <div class="HomeRunner">
    <div>
      <!-- <el-button type="success" @click="CreateRunner = true">选择策略</el-button> -->
      <el-button type="primary" @click="ImportRunner">策略市场</el-button>
    </div>
    <el-divider></el-divider>
    <div class="clearfix">
      <el-card class="box-card fl" v-for="data in RunnerConf" :key="data.name">
        <div slot="header" class="clearfix">
          <el-tag size="mini">{{ data.name }}</el-tag>
          <el-divider></el-divider>
          <el-button style="padding: 3px;margin-left:2px;" @click="data.ClearData()" plain type="warning">清空记录</el-button>
          <el-button style="padding: 3px;margin-left:2px;" @click="data.Setting()" plain type="success">修改参数</el-button>
          <el-button style="padding: 3px;margin-left:2px;" @click="data.GetOrder()" plain type="primary">查看订单</el-button>
          <el-button style="padding: 3px;margin-left:2px;" @click="Run(data)" plain type="success">运行策略</el-button>
        </div>
        <div v-if="data.desc">说明：{{ data.desc }}</div>
      </el-card>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { RunnerConf } from '@/core/RunnerInstall';
import urijs from 'urijs';

@Component
export default class HomeRunner extends Vue {
  RunnerConf = RunnerConf;

  Run(data: any) {
    // this.$router.push({ name: 'Run', query: { id: data.name } });
    const to = new urijs('/run');
    to.setQuery({ id: data.name });
    window.open(to.href());
  }

  // 站点数据重置
  async ImportRunner() {
    //
  }
}
</script>

<style scoped lang="scss">
.HomeRunner {
}
</style>
