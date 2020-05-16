import '@/lib/CryptoJS.js';
import '@/lib/zlib.min.js';
import Vue from 'vue';
import '@/assets/style/main.scss';
import App from './App.vue';
import router from './router';
import Component from 'vue-class-component';
import './plugins/element';
import { FMexApi } from '@/api/FMex';
import { FCoinApi } from '@/api/FCoin';

// 状态管理
import '@/data/User';
import '@/data/Data';

// Register the router hooks with their names
Component.registerHooks([
  'beforeRouteEnter',
  'beforeRouteLeave',
  'beforeRouteUpdate', // for vue-router 2.2+
]);

Vue.config.productionTip = false;
Vue.config.devtools = true;

new Vue({
  router,
  render: (h) => h(App),
  mounted() {
    const loading = document.getElementById('index-loading');
    if (!loading) return;
    loading.remove();
  },
}).$mount('#app');

const fmex = new FMexApi('111', '2222');
const fcoin = new FCoinApi('111', '2222');
fmex.api.get('/v2/public/server-time');
fcoin.api.get('/v2/public/server-time');
