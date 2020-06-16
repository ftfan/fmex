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

const depthData = {
  bids: [] as FMex.DepthUnit[],
  asks: [] as FMex.DepthUnit[],
  map: {} as { [index: string]: FMex.DepthUnit },
};

let btcusd_spot = 0;

@Component
export default class BollView extends Vue {
  running = false;
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
    // console.log(depthData.bids[0], depthData.asks[0]);
    if (this.running) return;
    this.running = true;
    if (!btcusd_spot) return (this.running = false);
    const fmex = Store.state.api;
    if (!fmex) return (this.running = false);
    // 取消所有挂单；
    const cancel = fmex.Orders().then(async (res) => {
      if (res.Error()) return this.$message.error(res.Msg);
      return Promise.all([res.Data.results.map((order: any) => fmex.OrderCancel(order.id))]);
    });
    const quantity = Math.ceil(Math.random() * 30);
    // 有中间价，中间价刷一单。
    const buy = depthData.bids[0].price * 10;
    const sell = depthData.asks[0].price * 10;
    const price = (buy + Math.floor((sell - buy) / 10) * 5) / 10;
    if (buy !== price) {
      const [res1, res2] = await Promise.all([
        fmex.api.post('/v3/contracts/orders', {
          symbol: 'btcusd_p',
          type: 'LIMIT',
          direction: 'LONG',
          source: 'api',
          price,
          quantity,
          affiliate_code: 'pd56gp',
        }),
        fmex.api.post('/v3/contracts/orders', {
          symbol: 'btcusd_p',
          type: 'LIMIT',
          direction: 'SHORT',
          source: 'api',
          price,
          quantity,
          affiliate_code: 'pd56gp',
        }),
      ]);
      if (res1.data.Error()) this.$message.error(res1.data.Msg);
      if (res2.data.Error()) this.$message.error(res2.data.Msg);
    }
    // 朝指数价格方向买一单
    if (sell / 10 < btcusd_spot) {
      console.log('buy', sell / 10, btcusd_spot);
      const res = await fmex.api.post('/v3/contracts/orders', {
        symbol: 'btcusd_p',
        type: 'LIMIT',
        direction: 'LONG',
        source: 'api',
        price: sell / 10,
        quantity,
        affiliate_code: 'pd56gp',
      });
      if (res.data.Error()) this.$message.error(res.data.Msg);
    } else if (buy / 10 > btcusd_spot) {
      console.log('sell', buy / 10, btcusd_spot);
      const res = await fmex.api.post('/v3/contracts/orders', {
        symbol: 'btcusd_p',
        type: 'LIMIT',
        direction: 'SHORT',
        source: 'api',
        price: buy / 10,
        quantity,
        affiliate_code: 'pd56gp',
      });
      if (res.data.Error()) this.$message.error(res.data.Msg);
    }
    await cancel;
    this.running = false;
  }

  async mounted() {
    await this.$nextTick();
    this.ResetView();
    const sub = FMex.Wss.sub('depth-delta', FMex.DepthLevel.L20, 'btcusd_p');
    sub.ondata((data) => {
      for (let i = 1; i < data.bids.length; i += 2) {
        const price = data.bids[i - 1];
        const vol = data.bids[i];
        const has = depthData.map[price];
        if (has && vol === 0) {
          const index = depthData.bids.indexOf(has);
          const index2 = depthData.asks.indexOf(has);
          if (index !== -1) depthData.bids.splice(index, 1);
          if (index2 !== -1) depthData.asks.splice(index2, 1);
          delete depthData.map[price];
          continue;
        }
        if (vol === 0) continue;
        if (has) {
          if (has.isAsk) {
            const index2 = depthData.asks.indexOf(has);
            if (index2 !== -1) depthData.asks.splice(index2, 1);
            depthData.bids.push(has);
          }
          has.vol = vol;
        } else {
          const item = { price, vol };
          depthData.bids.push(item);
          depthData.map[price] = item;
        }
      }
      for (let i = 1; i < data.asks.length; i += 2) {
        const price = data.asks[i - 1];
        const vol = data.asks[i];
        const has = depthData.map[price];
        if (has && vol === 0) {
          const index = depthData.bids.indexOf(has);
          const index2 = depthData.asks.indexOf(has);
          if (index !== -1) depthData.bids.splice(index, 1);
          if (index2 !== -1) depthData.asks.splice(index2, 1);
          delete depthData.map[price];
          continue;
        }
        if (has) {
          if (!has.isAsk) {
            const index2 = depthData.bids.indexOf(has);
            if (index2 !== -1) depthData.bids.splice(index2, 1);
            depthData.bids.push(has);
          }
          has.vol = vol;
        } else {
          const item = { price, vol, isAsk: true };
          depthData.asks.push(item);
          depthData.map[price] = item;
        }
      }
      depthData.asks.sort((a, b) => a.price - b.price);
      depthData.bids.sort((a, b) => b.price - a.price);
      if (depthData.asks.length > 100) depthData.asks.splice(20, 80);
      if (depthData.bids.length > 100) depthData.bids.splice(20, 80);
      // console.log(depthData);
    });

    setInterval(async () => {
      if (!Store.state.api) return;
      const { data } = await Store.state.api.api.get('/v2/market/indexes');
      if (data.Error()) return this.$message.error(data.Msg);
      btcusd_spot = data.Data['.btcusd_spot'][1];
      document.title = btcusd_spot.toString();
    }, 3000);
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
