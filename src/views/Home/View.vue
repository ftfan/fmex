<template>
  <div class="HomeView">
    <!-- <el-button @click="more" size="mini">加载更多历史K线数据</el-button> -->
    <el-radio-group size="mini" v-model="ViewOptions.Resolution">
      <el-radio-button v-for="item in Resolutions" :key="item" :label="item"></el-radio-button>
    </el-radio-group>
    <el-cascader size="mini" :options="Targets" :props="cascaderprops" :show-all-levels="false" v-model="ViewOptions.Target" :collapse-tags="true"></el-cascader>

    <div id="HomeView" style="width:100%;height:600px;"></div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import echarts from 'echarts';
import { ViewDrawLine, ViewOptions } from '@/core/View';
import { FMex } from '@/api/FMex';

@Component
export default class HomeView extends Vue {
  cascadervalue = '';
  Targets = Vue.DataStore.localState.Targets;
  cascaderprops = { multiple: true, emitPath: false, label: 'value' };
  Resolutions = [
    FMex.Resolution.M1,
    FMex.Resolution.M3,
    FMex.Resolution.M5,
    FMex.Resolution.M15,
    FMex.Resolution.M30,
    FMex.Resolution.H1,
    FMex.Resolution.H4,
    FMex.Resolution.H6,
    FMex.Resolution.D1,
    FMex.Resolution.W1,
    FMex.Resolution.MN,
  ];
  get ViewOptions() {
    return Vue.DataStore.localState.ViewOptions;
  }

  get DataSource() {
    return Vue.DataStore.state.DataSource;
  }
  async mounted() {
    await this.$nextTick();
    this.ResetView();
  }
  @Watch('ViewOptions.Resolution')
  onChange() {
    this.ResetView();
  }

  @Watch('ViewOptions.Target')
  onTargetChange() {
    if (Vue.DataStore.state.ViewReload) Vue.DataStore.state.ViewReload();
  }

  ChooseTarget(target: any) {
    this.ViewOptions.Target = target;
  }

  more() {
    if (Vue.DataStore.state.LoadMore) Vue.DataStore.state.LoadMore();
  }

  ResetView() {
    const myChart = echarts.init(document.getElementById('HomeView') as HTMLDivElement);
    ViewDrawLine(myChart, this.ViewOptions);
  }
}
</script>

<style scoped lang="scss">
#HomeView {
  margin-top: 20px;
}
</style>
