<template>
  <div class="HomeView">
    <el-button @click="more" size="mini">加载更多</el-button>
    <el-radio-group size="mini" v-model="ViewOptions.Granularity">
      <el-radio-button label="1m"></el-radio-button>
      <el-radio-button label="3m"></el-radio-button>
      <el-radio-button label="5m"></el-radio-button>
      <el-radio-button label="15m"></el-radio-button>
      <el-radio-button label="30m"></el-radio-button>
      <el-radio-button label="1h"></el-radio-button>
      <el-radio-button label="2h"></el-radio-button>
      <el-radio-button label="4h"></el-radio-button>
      <el-radio-button label="6h"></el-radio-button>
      <el-radio-button label="12h"></el-radio-button>
      <el-radio-button label="1d"></el-radio-button>
      <el-radio-button label="7d"></el-radio-button>
    </el-radio-group>
    <el-cascader size="mini" :options="Targets" :props="cascaderprops" :show-all-levels="false" v-model="ViewOptions.Target" :collapse-tags="true"></el-cascader>

    <div id="HomeView" style="width:100%;height:600px;"></div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import echarts from 'echarts';
import { ViewDrawLine, ViewOptions, Targets } from '@/core/View';

@Component
export default class HomeView extends Vue {
  cascadervalue = '';
  Targets = Targets;
  cascaderprops = { multiple: true, emitPath: false, label: 'value' };
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
  @Watch('ViewOptions.CandleNum')
  @Watch('ViewOptions.Granularity')
  onChange() {
    this.ResetView();
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
