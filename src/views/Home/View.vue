<template>
  <div class="HomeView">
    <el-select size="mini" v-model="Source" placeholder="请选择" @change="ResetView">
      <el-option v-for="item in DataSource" :key="item.Name" :label="item.Name" :value="item.Name"> </el-option>
    </el-select>
    <el-radio-group size="mini" v-model="Options.Granularity">
      <el-radio-button label="1分钟"></el-radio-button>
      <el-radio-button label="3分钟"></el-radio-button>
      <el-radio-button label="5分钟"></el-radio-button>
      <el-radio-button label="15分钟"></el-radio-button>
      <el-radio-button label="30分钟"></el-radio-button>
      <el-radio-button label="1小时"></el-radio-button>
      <el-radio-button label="2小时"></el-radio-button>
      <el-radio-button label="4小时"></el-radio-button>
      <el-radio-button label="6小时"></el-radio-button>
      <el-radio-button label="12小时"></el-radio-button>
      <el-radio-button label="1天"></el-radio-button>
      <el-radio-button label="7天"></el-radio-button>
    </el-radio-group>
    <div id="HomeView" style="width:100%;height:600px;"></div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import echarts from 'echarts';
import { ViewDrawLine, ViewOptions } from '@/core/View';

@Component
export default class HomeView extends Vue {
  Source = 'okex';
  Options: ViewOptions = {
    Granularity: '1分钟',
  };
  get DataSource() {
    return Vue.DataStore.state.DataSource;
  }
  async mounted() {
    await this.$nextTick();
    this.ResetView();
  }

  ResetView() {
    const myChart = echarts.init(document.getElementById('HomeView') as HTMLDivElement);
    const handler = Vue.DataStore.state.DataSource.filter((item) => item.Name === this.Source)[0];
    ViewDrawLine(myChart, handler, this.Options);
  }
}
</script>

<style scoped lang="scss">
#HomeView {
  margin-top: 20px;
}
</style>
