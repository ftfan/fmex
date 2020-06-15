<template>
  <div class="BollView">
    <!-- <el-button @click="RunClear" type="primary">重新测试</el-button> -->
    <el-button @click="GetMore" type="primary">查看更多K线(查看/测试用)</el-button>
    <el-button @click="RealRun" type="primary">运行</el-button>
    <el-tag v-if="BOLL.localState.Key">秘钥Key：{{ BOLL.localState.Key }}</el-tag>
    <el-divider></el-divider>
    <el-tag>参考K线单位：</el-tag>
    <el-radio-group size="mini" v-model="BOLL.localState.Resolution">
      <el-radio-button label="1m"></el-radio-button>
      <el-radio-button label="3m"></el-radio-button>
      <el-radio-button label="5m"></el-radio-button>
      <el-radio-button label="15m"></el-radio-button>
      <el-radio-button label="30m"></el-radio-button>
      <el-radio-button label="1h"></el-radio-button>
    </el-radio-group>
    <el-divider></el-divider>
    <!-- <el-input style="width:250px;margin-right:10px;" size="mini" v-model.number="BOLL.localState.DiffCancel">
      <template slot="prepend">最多滞留：</template>
      <template slot="append">单</template>
    </el-input> -->
    <el-input style="width:250px;margin-right:10px;" size="mini" v-model.number="BOLL.localState.IngOrderNumMax">
      <template slot="prepend">最多滞留：</template>
      <template slot="append">单</template>
    </el-input>
    <el-input style="width:250px;margin-right:10px;" size="mini" v-model.number="BOLL.localState.Win">
      <template slot="prepend">止盈</template>
      <template slot="append">/10000</template>
    </el-input>
    <el-input style="width:250px;margin-right:10px;" size="mini" v-model.number="BOLL.localState.Lose">
      <template slot="prepend">止损</template>
      <template slot="append">/10000</template>
    </el-input>
    <el-input style="width:250px;margin-right:10px;" size="mini" v-model.number="BOLL.localState.OrderStepNum">
      <template slot="prepend">单次下单：</template>
      <template slot="append">张</template>
    </el-input>
    <el-input style="width:250px;margin-right:10px;" size="mini" v-model.number="BOLL.localState.SameOrderTimeDiffMin">
      <template slot="prepend">最小下单间隔：</template>
      <template slot="append">分钟</template>
    </el-input>
    <el-checkbox-group style="display:inline-block;" v-model="BOLL.localState.OrderTypes">
      <el-checkbox label="多">多</el-checkbox>
      <el-checkbox label="空">空</el-checkbox>
    </el-checkbox-group>

    <el-divider></el-divider>
    <el-tag>策略次数：{{ BOLL.localState.DataSay[0].Times + BOLL.localState.DataSay[1].Times }}</el-tag>
    <el-tag>盈利：{{ BOLL.localState.DataSay[0].Value + BOLL.localState.DataSay[1].Value }}</el-tag>
    <el-tag>滞留空单：{{ BOLL.state.ActiveOrders.upper.length }}</el-tag>
    <el-tag>滞留多单：{{ BOLL.state.ActiveOrders.lower.length }}</el-tag>
    <el-divider></el-divider>
    <div id="BollView" style="width:100%;height:600px;"></div>

    <el-dialog :visible.sync="choosekey">
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
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import echarts from 'echarts';
import BOLL, { BollTypeText, BOLLRunnerOrder, BollType } from '.';
import { ViewOptions, ViewDrawLine } from '@/core/View';
import { Candle } from '@/data/Data';
import { RunnerOrder } from '@/types/Runner';
import { DateFormat } from '@/lib/time';
import { sleep } from '@/lib/utils';
import { SecretKey } from '../../types/Secret';
import { Loading } from 'element-ui';

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
  choosekey = false;
  get BOLL() {
    return BOLL;
  }
  get ViewOptions(): ViewOptions {
    const key = this.$UserStore.localState.SecretKeys.filter((item) => item.Key === BOLL.localState.Key)[0];
    return {
      CoinSymbol: 'btcusd_p',
      Resolution: BOLL.localState.Resolution,
      Target: ['BOLL20'],
      CandleNum: 200,
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
      const orders = BOLL.localState.Orders;
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

    BOLL.TryOrder(rawData, { upper, lower, mid });
    Draw();
  }

  @Watch('BOLL.localState.Resolution')
  @Watch('BOLL.localState.SameOrderTimeDiffMin')
  @Watch('BOLL.localState.IngOrderNumMax')
  @Watch('BOLL.localState.DiffCancel')
  @Watch('BOLL.localState.OrderStepNum')
  @Watch('BOLL.localState.OrderTypes', { deep: true })
  OnDataChange() {
    this.ResetView();
    this.RunClear();
  }
  async mounted() {
    await this.$nextTick();
    this.RunClear();
    this.ResetView();
  }
  ResetView() {
    const myChart = echarts.init(document.getElementById('BollView') as HTMLDivElement);
    ViewDrawLine(myChart, this.ViewOptions);
  }

  RunClear() {
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

  async RealRun() {
    this.choosekey = true;
  }

  async SubmitRun(data: SecretKey) {
    const pwd = await this.$UserStore.PromptPassword();
    const loading = Loading.service({ fullscreen: true });
    const res = await this.$UserStore.Test(data, pwd.Data);
    loading.close();
    if (res.Error()) return this.$message.success(res.Msg);
    BOLL.state.api = res.Data;
    // if (!BOLL.state.api) return this.$message.error('SecretKey 校验错误');
    this.RunClear();
    this.choosekey = false;
  }

  GetMore() {
    if (this.$DataStore.state.LoadMore) this.$DataStore.state.LoadMore();
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
