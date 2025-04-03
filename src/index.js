// import btn from "./components/btn.vue"; // 引入封装好的组件
import { getBrowserInfo, competence_funcid } from '../src/utils/index'
// 封装页面功能
// const components = [btn];
const install = function (App, options) {
  // console.log(8888888888);
  // components.forEach((component) => {
  //   App.component(component.name,component);
  // });
};
// 封装js暴露出去调用
export default { install, getBrowserInfo, competence_funcid } // 批量的引入*
