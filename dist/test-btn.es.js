import "vue";
const getBrowserInfo = () => {
  var agent = navigator.userAgent.toLowerCase();
  var regStr_ie = /msie [\d.]+;/gi;
  var regStr_ff = /firefox\/[\d.]+/gi;
  var regStr_chrome = /chrome\/[\d.]+/gi;
  var regStr_saf = /safari\/[\d.]+/gi;
  if (agent.indexOf("msie") > 0) {
    return agent.match(regStr_ie);
  }
  if (agent.indexOf("firefox") > 0) {
    return agent.match(regStr_ff);
  }
  if (agent.indexOf("chrome") > 0) {
    return agent.match(regStr_chrome);
  }
  if (agent.indexOf("safari") > 0 && agent.indexOf("chrome") < 0) {
    return agent.match(regStr_saf);
  }
};
const getStore = (name) => {
  if (!name)
    return;
  return window.sessionStorage.getItem(name);
};
let menuList = [];
function competence_funcid(btnName) {
  let userMenu = JSON.parse(getStore("userMenu")), flag = false;
  if (!userMenu)
    return;
  getChildList(userMenu);
  menuList.forEach((item) => {
    if (item.funcid == btnName) {
      return flag = true;
    }
  });
  return flag;
}
function getChildList(array) {
  let flatA = [];
  if (array) {
    for (const i in array) {
      flatA.push(array[i]);
      menuList.push(array[i]);
    }
    for (const i in flatA) {
      if (flatA[i].children) {
        getChildList(flatA[i].children);
      }
    }
  }
}
var btn_vue_vue_type_style_index_0_scoped_true_lang = "";
const install = function(App, options) {
};
var index = { install, getBrowserInfo, competence_funcid };
export { index as default };
