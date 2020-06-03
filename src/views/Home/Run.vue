<template>
  <div class="HomeRun">
    <el-tabs type="card">
      <el-tab-pane label="测了名称惺惺惜惺惺"> </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class HomeRun extends Vue {
  editableTabsValue = '2';
  editableTabs = [
    {
      title: 'Tab 1',
      name: '1',
      content: 'Tab 1 content',
    },
    {
      title: 'Tab 2',
      name: '2',
      content: 'Tab 2 content',
    },
  ];
  tabIndex = 2;

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
.HomeRun {
}
</style>
