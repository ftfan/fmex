<template>
  <div class="JustRun">
    <el-tabs type="card">
      <el-tab-pane :label="Name">
        <component :is="Runner.name.replace(/:/g, '-')"></component>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { RunnerConf } from '@/core/RunnerInstall';

@Component
export default class JustRun extends Vue {
  get Name() {
    if (!this.Runner) return '';
    if (this.Runner.desc) return `${this.Runner.name}(${this.Runner.desc})`;
    return this.Runner.desc;
  }
  get Runner() {
    return RunnerConf[this.$route.query.id as string];
  }

  push() {
    // 否则我们需要向用户获取权限
    if (Notification.permission !== 'denied') {
      Notification.requestPermission(function(permission) {
        // 如果用户同意，就可以向他们发送通知
        if (permission === 'granted') {
          const notification = new Notification('Hi there!');
        }
      });
    } else {
      const notification = new Notification('Hi there!');
    }
  }
}
</script>

<style scoped lang="scss">
.JustRun {
}
</style>
