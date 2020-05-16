<template>
  <el-tabs v-model="tab" type="border-card" @tab-click="tabclick">
    <el-tab-pane name="key" lazy>
      <span slot="label"><i class="el-icon-key"></i> 秘钥管理</span>
      <HomeKey class="card-content"></HomeKey>
    </el-tab-pane>
    <el-tab-pane name="menu" lazy>
      <span slot="label"><i class="el-icon-menu"></i> 策略管理</span>
      <HomeRunner class="card-content"></HomeRunner>
    </el-tab-pane>
    <el-tab-pane name="marketing" lazy>
      <span slot="label"><i class="el-icon-s-marketing"></i> 行情查看</span>
      <HomeView class="card-content"></HomeView>
    </el-tab-pane>
    <el-tab-pane name="run" lazy>
      <span slot="label"><i class="el-icon-loading"></i> 策略运行</span>
      <!-- el-icon-switch-button -->
      <HomeRun class="card-content"></HomeRun>
    </el-tab-pane>
  </el-tabs>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import HomeKey from '@/views/Home/Key.vue';
import HomeRun from '@/views/Home/Run.vue';
import HomeRunner from '@/views/Home/Runner.vue';
import HomeView from '@/views/Home/View.vue';

@Component<HomeIndex>({
  components: { HomeKey, HomeRun, HomeRunner, HomeView },
  beforeRouteEnter: (to, from, next) => {
    next((vm) => {
      if (to.query.tab && typeof to.query.tab === 'string') {
        vm.tab = to.query.tab;
      } else {
        vm.tab = 'key';
      }
    });
  },
})
export default class HomeIndex extends Vue {
  tab = '';
  tabclick() {
    this.$router.replace({ query: Object.assign({}, this.$route.query, { tab: this.tab }) });
  }
}
</script>

<style scoped lang="scss">
.card-content {
  min-height: 600px;
}
</style>
