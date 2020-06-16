<template>
  <div id="app" class="g-abs">
    <router-view></router-view>

    <el-dialog :visible.sync="$AppStore.state.ChooseKey">
      <div class="clearfix">
        <el-card class="box-card fl" shadow="hover" @click.native="SubmitRun(data)" v-for="data in $UserStore.localState.SecretKeys" :key="data.Key">
          <div slot="header" class="clearfix">
            <el-tag size="mini">{{ data.Key }}</el-tag>
          </div>
          <div>
            备注：<el-tag size="small" v-if="data.Desc">{{ data.Desc }}</el-tag>
          </div>
        </el-card>
      </div>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class RootApp extends Vue {
  SubmitRun(data: any) {
    this.$AppStore.state.ChooseKey = false;
    this.$AppStore.state.ChooseKeyResolve(data);
  }
}
</script>

<style scoped lang="scss"></style>
