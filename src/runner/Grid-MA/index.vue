<template>
  <div class="BollView">
    <el-button @click="TestRun" type="primary">测试</el-button>
    <el-button @click="GetMore">加载更多K线</el-button>
    <el-tag>秘钥Key：{{ BOLL.localState.Key }}</el-tag>
    <el-tag>参考K线单位：{{ BOLL.localState.Granularity }}</el-tag>
    <el-tag>允许最多滞留订单数：{{ BOLL.localState.IngOrderNumMax }}</el-tag>
    <el-tag>单次下单量：{{ BOLL.localState.OrderStepNum }}</el-tag>
    <el-tag>最小下单间隔时间：{{ BOLL.localState.SameOrderTimeDiffMin }}分钟</el-tag>
    <el-tag>下单方向：{{ BOLL.localState.OrderTypes.join(' 与 ') }}</el-tag>

    <el-divider></el-divider>
    <el-tag>策略次数：{{ BOLL.localState.DataSay[0].Times + BOLL.localState.DataSay[1].Times }}</el-tag>
    <el-tag>盈利：{{ BOLL.localState.DataSay[0].Value + BOLL.localState.DataSay[1].Value }}</el-tag>
    <el-tag>滞留空单：{{ BOLL.state.ActiveOrders.upper.length }}</el-tag>
    <el-tag>滞留多单：{{ BOLL.state.ActiveOrders.lower.length }}</el-tag>
    <el-divider></el-divider>
    <div id="BollView" style="width:100%;height:600px;"></div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import echarts from 'echarts';
import BOLL, { BollTypeText, BOLLRunnerOrder, BollType } from '.';
import { ViewOptions, ViewDrawLine } from '@/core/View';
import { Candle } from '@/data/Data';
import { RunnerOrder } from '@/types/Runner';
import { DateFormat } from '@/lib/time';
import { sleep } from '../../lib/utils';

const OrderColorConf = {
  [BollType.upper]: 'red',
  [BollType.midUpper]: 'red',
  [BollType.lower]: 'blue',
  [BollType.midLower]: 'blue',
} as any;
const OrderStyle = (order: BOLLRunnerOrder) => {
  return {
    name: order.id,
    symbol: 'arrow',
    symbolSize: 20,
    coord: [DateFormat(order.timestamp, 'yyyy-MM-dd hh:mm'), order.price],
    value: BollTypeText[order.bollType] + ':' + order.price,
    itemStyle: {
      color: order.state === 2 ? OrderColorConf[order.bollType] : '#ccc',
    },
  };
};

@Component
export default class BollView extends Vue {
  Testing = false;
  TestOrderStep = 20;
  get BOLL() {
    return BOLL;
  }
  get ViewOptions(): ViewOptions {
    const key = this.$UserStore.localState.SecretKeys.filter((item) => item.Key === BOLL.localState.Key)[0];
    return {
      Granularity: BOLL.localState.Granularity,
      Target: ['BOLL20'],
      CandleNum: 200,
      Source: key ? key.Type : 'okex',
      DataHook: (rawData, Options, opt) => this.DataHook(rawData, Options, opt),
    };
  }
  async DataHook(rawData: Candle[], Options: ViewOptions, opt: any) {
    // 找到布林带数据（不重复计算）
    let upper: number[] = [];
    let lower: number[] = [];
    let mid: number[] = [];
    for (let i = 0; i < opt.series.length; i++) {
      const item = opt.series[i];
      if (item.bollType === 'upper') upper = item.data.map(parseFloat);
      if (item.bollType === 'lower') lower = item.data.map(parseFloat);
      if (item.bollType === 'mid') mid = item.data.map(parseFloat);
      if (mid.length && lower.length && upper.length) break;
    }

    const Draw = () => {
      const orders = this.Testing ? BOLL.state.TestOrder : BOLL.localState.Orders;
      // console.log(orders.length, orders);
      orders.forEach((order) => {
        opt.series[0].markPoint.data.push(OrderStyle(order));
        order.subOrders.forEach((subOrder) => {
          opt.series[0].markPoint.data.push(OrderStyle(subOrder));
        });
      });
      BOLL.state.ActiveOrders.upper.forEach((order) => {
        opt.series[0].markPoint.data.push(OrderStyle(order));
        order.subOrders.forEach((subOrder) => {
          opt.series[0].markPoint.data.push(OrderStyle(subOrder));
        });
      });
      BOLL.state.ActiveOrders.lower.forEach((order) => {
        opt.series[0].markPoint.data.push(OrderStyle(order));
        order.subOrders.forEach((subOrder) => {
          opt.series[0].markPoint.data.push(OrderStyle(subOrder));
        });
      });
    };

    // 将订单画上。
    if (this.Testing && this.TestOrderStep < rawData.length) {
      const stepd = () => {
        if (this.TestOrderStep >= rawData.length) return;
        BOLL.TryOrder(rawData.slice(0, this.TestOrderStep), { upper, lower, mid }, this.Testing);
        const raw = rawData[this.TestOrderStep - 1];
        opt.series[0].markPoint.data.push({
          name: '测试进度',
          coord: [DateFormat(raw.timestamp, 'yyyy-MM-dd hh:mm'), raw.close],
          value: '测试进度',
          symbol: 'diamond',
          symbolSize: 20,
        });
        this.TestOrderStep++;
        Draw();
      };
      stepd();
      await sleep(400);
      stepd();
    } else {
      BOLL.TryOrder(rawData, { upper, lower, mid }, this.Testing);
      Draw();
    }
  }

  async mounted() {
    await this.$nextTick();
    this.TestRun();
    this.ResetView();
  }
  ResetView() {
    const myChart = echarts.init(document.getElementById('BollView') as HTMLDivElement);
    const handler = Vue.DataStore.state.DataSource.filter((item) => item.Name === this.ViewOptions.Source)[0];
    ViewDrawLine(myChart, handler, this.ViewOptions);
  }

  TestRun() {
    this.Testing = true;
    this.TestOrderStep = 20;
    BOLL.localState.DataSay.forEach((item) => {
      item.Times = 0;
      item.Value = 0;
      item.WinValue = 0;
      item.WinTimes = 0;
      item.LastTime = 0;
    });
    BOLL.localState.DataSays = [];
    BOLL.state.ActiveOrders.upper = [];
    BOLL.state.ActiveOrders.lower = [];
    BOLL.state.TestOrder = [];
  }

  GetMore() {
    if (this.$DataStore.state.LoadMore) this.$DataStore.state.LoadMore();
  }
}
</script>

<style scoped lang="scss">
.BollView {
}
</style>
