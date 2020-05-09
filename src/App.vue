<template>
  <div id="app" class="g-abs">
    <router-view></router-view>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class RootApp extends Vue {}
</script>

<style scoped lang="scss"></style>
