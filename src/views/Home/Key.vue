<template>
  <div class="HomeKey">
    <div>
      <el-button type="primary">添加秘钥</el-button>
    </div>
    <el-divider></el-divider>
    <div class="clearfix">
      <el-card class="box-card fl">
        <div slot="header" class="clearfix">
          <span>卡片名称</span>
          <el-button style="float: right; padding: 3px 0" type="text">操作按钮</el-button>
        </div>
        <div v-for="o in 4" :key="o" class="text item">
          {{ '列表内容 ' + o }}
        </div>
      </el-card>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class HomeKey extends Vue {
  created() {
    this.$UserStore.clear;
  }
}
</script>

<style scoped lang="scss">
.HomeKey {
  .box-card {
    width: 300px;
    height: 184px;
    margin: 10px;
  }
}
</style>
