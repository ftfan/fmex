import Vue from 'vue';

export const RunnerConf: {
  [index: string]: any;
} = {};
// 策略声明注入
const requireComponent = (require as any).context('@/runner', true, /[\w]+\.ts$/);
requireComponent.keys().forEach((fileName: any) => {
  // const modName = fileName.replace(/\.\//, '').replace(/\.ts/, '');
  // 获取组件声明文件
  const mod = requireComponent(fileName);
  if (!mod) return;
  const cpt = mod.default;
  if (!cpt || !cpt.name) return console.warn(`组件 ${fileName} 未声明完整`);
  RunnerConf[cpt.name] = cpt;
  if (cpt.VueComponent) Vue.component(cpt.name.replace(/:/g, '-'), cpt.VueComponent);
});
