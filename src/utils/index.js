import axios from 'axios';
/**
 * post 请求 {es6解构赋值}
 * @param codeType 类型
 * @param lang 語言
 * @returns {Promise}
 * @constructor
 */
export function getSelectList(codeType,lang) {
    // console.log(123456,codeType,lang);
}
// 获取浏览器版本和名称
export const getBrowserInfo = () => {
	var agent = navigator.userAgent.toLowerCase();

	var regStr_ie = /msie [\d.]+;/gi;
	var regStr_ff = /firefox\/[\d.]+/gi
	var regStr_chrome = /chrome\/[\d.]+/gi;
	var regStr_saf = /safari\/[\d.]+/gi;
	//IE
	if (agent.indexOf("msie") > 0) {
		return agent.match(regStr_ie);
	}
	//firefox
	if (agent.indexOf("firefox") > 0) {
		return agent.match(regStr_ff);
	}
	//Chrome
	if (agent.indexOf("chrome") > 0) {
		return agent.match(regStr_chrome);
	}
	//Safari
	if (agent.indexOf("safari") > 0 && agent.indexOf("chrome") < 0) {
		return agent.match(regStr_saf);
	}
};
/**
 * 获取sessionStorage
 */
 export const getStore = name => {
	if (!name) return;
	return window.sessionStorage.getItem(name);
}
let menuList = []
export function competence_funcid(btnName) {
    // 防止切换账号userMenu不清空,每次判断前取一次userMenu
    let userMenu = JSON.parse(getStore('userMenu')),
        flag = false;//菜单权限列表
    if (!userMenu) return;
   getChildList(userMenu)
   menuList.forEach(item => {
      if(item.funcid == btnName){
        return flag = true;
      }
  });
    return flag
}
// 扁平化菜单,不需要传入多个id去判断
 function getChildList(array) {
    let flatA = [];
    if (array) {
      for (const i in array) {
        flatA.push(array[i]);
        menuList.push(array[i]);
      }
      for (const i in flatA) {
        if (flatA[i].children) {
          getChildList(flatA[i].children)
        }
      }
    }
  }