<template>
  <div class="BollView">
    <el-button @click="RealRun" type="primary">运行</el-button>
    <el-tag v-if="Store.localState.Key">秘钥Key：{{ Store.localState.Key }}</el-tag>
    <el-divider></el-divider>
    <el-tag>参考K线单位：</el-tag>
    <el-radio-group size="mini" v-model="Store.localState.Resolution">
      <el-radio-button v-for="item in Resolutions" :key="item" :label="item"></el-radio-button>
    </el-radio-group>
    <!-- <el-cascader size="mini" :options="Targets" :props="cascaderprops" :show-all-levels="false" v-model="ViewOptions.Target" :collapse-tags="true"></el-cascader> -->
    <el-input style="width:250px;margin-right:10px;" size="mini" v-model.number="Store.localState.TrailingStop">
      <template slot="prepend">移动止损，万分之</template>
    </el-input>
    <el-divider></el-divider>

    <el-collapse accordion style="width:320px;">
      <el-collapse-item title="RBreaker">
        <el-input style="width:250px;margin-right:10px;" size="mini" v-model.number="Store.localState.RBreaker.LastCandelTimeRange">
          <template slot="prepend">周期</template>
          <template slot="append">根K线</template>
        </el-input>
        <el-divider></el-divider>
        激进值：
        <el-slider v-model="Store.localState.RBreaker.Risk" :step="10" show-stops></el-slider>
        <el-divider></el-divider>

        <el-input style="width:250px;margin-right:10px;" size="mini" v-model.number="Store.localState.RBreaker.OrderStepNum">
          <template slot="prepend">管理仓位</template>
          <template slot="append">张</template>
        </el-input>
      </el-collapse-item>
    </el-collapse>

    <el-divider></el-divider>

    <div id="BollView" style="width:100%;height:600px;"></div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import echarts from 'echarts';
import Store from '.';
import { ViewOptions, ViewDrawLine } from '@/core/View';
import { Candle } from '@/data/Data';
import { RunnerOrder } from '@/types/Runner';
import { DateFormat } from '@/lib/time';
import { sleep } from '@/lib/utils';
import { SecretKey } from '../../types/Secret';
import { Loading } from 'element-ui';
import { FMex } from '../../api/FMex';
import { KLineData } from '../../types/types';

@Component
export default class BollView extends Vue {
  choosekey = false;
  get Store() {
    return Store;
  }
  Resolutions = [FMex.Resolution.M1, FMex.Resolution.M3, FMex.Resolution.M5, FMex.Resolution.M15, FMex.Resolution.M30, FMex.Resolution.H1];
  get ViewOptions(): ViewOptions {
    const key = this.$UserStore.localState.SecretKeys.filter((item) => item.Key === Store.localState.Key)[0];
    return {
      CoinSymbol: 'btcusd_p',
      Resolution: Store.localState.Resolution,
      Target: ['BOLL20'],
      CandleNum: 200,
      DataHook: (rawData, Options, opt) => this.DataHook(rawData, Options, opt),
    };
  }
  async DataHook(rawData: Candle[], Options: ViewOptions, opt: any) {
    const RBreaker = Store.localState.RBreaker;
    if (rawData.length < RBreaker.LastCandelTimeRange * 2) return; // 数据量不够。
    // 获取出当前周期数据
    const CurrentKlines = rawData.slice(rawData.length - RBreaker.LastCandelTimeRange, rawData.length - 1);
    const LastKlines = rawData.slice(rawData.length - RBreaker.LastCandelTimeRange * 2, rawData.length - RBreaker.LastCandelTimeRange);
    // 获取上移周期数据，并计算出 开 收 高 低。
    const BigKline: KLineData = {
      low: Math.min(...LastKlines.map((k) => k.low)),
      high: Math.min(...LastKlines.map((k) => k.high)),
      open: LastKlines[0].open,
      close: LastKlines[LastKlines.length - 1].close,
      volume: 0,
      currency_volume: 0,
      timestamp: 0,
    };
    const rb = Store.CalcPivot(BigKline);
    // 划线
    const xb = DateFormat(CurrentKlines[0].timestamp, 'yyyy-MM-dd hh:mm');
    const xe = DateFormat(CurrentKlines[CurrentKlines.length - 1].timestamp, 'yyyy-MM-dd hh:mm');
    const lineCreate = (name: string, price: number) => {
      return [{ name, coord: [xb, price] }, { coord: [xe, price] }];
    };
    opt.series[0].markLine.data.push(
      lineCreate('突破,买入', rb.BreakBuy),
      lineCreate('观察,卖出', rb.SetupSell),
      lineCreate('反转,卖出', rb.RevSell),
      lineCreate('反转,买入', rb.RevBuy),
      lineCreate('观察,买入', rb.SetupBuy),
      lineCreate('突破,卖出', rb.BreakSell)
    );
  }

  @Watch('Store.localState.Resolution')
  @Watch('Store.localState.RBreaker.LastCandelTimeRange')
  @Watch('Store.localState.RBreaker.Risk')
  OnDataChange() {
    this.ResetView();
  }
  async mounted() {
    await this.$nextTick();
    this.ResetView();
  }
  ResetView() {
    const myChart = echarts.init(document.getElementById('BollView') as HTMLDivElement);
    ViewDrawLine(myChart, this.ViewOptions);
  }

  async RealRun() {
    await this.SubmitRun();
  }

  async SubmitRun() {
    const pwd = await this.$UserStore.PromptPassword();
    const data = await this.$AppStore.ChooseKey();
    const loading = Loading.service({ fullscreen: true });
    const res = await this.$UserStore.Test(data, pwd.Data);
    loading.close();
    if (res.Error()) return this.$message.success(res.Msg);
    Store.state.api = res.Data;
  }
}
</script>

<style scoped lang="scss">
.box-card {
  cursor: pointer;
  // &:hover{
  //   border
  // }
}
</style>
