(function(i,r){typeof exports=="object"&&typeof module!="undefined"?module.exports=r(require("vue")):typeof define=="function"&&define.amd?define(["vue"],r):(i=typeof globalThis!="undefined"?globalThis:i||self,i.TestBtn=r())})(this,function(){"use strict";const i=()=>{var e=navigator.userAgent.toLowerCase(),t=/msie [\d.]+;/gi,n=/firefox\/[\d.]+/gi,f=/chrome\/[\d.]+/gi,c=/safari\/[\d.]+/gi;if(e.indexOf("msie")>0)return e.match(t);if(e.indexOf("firefox")>0)return e.match(n);if(e.indexOf("chrome")>0)return e.match(f);if(e.indexOf("safari")>0&&e.indexOf("chrome")<0)return e.match(c)},r=e=>{if(!!e)return window.sessionStorage.getItem(e)};let o=[];function u(e){let t=JSON.parse(r("userMenu")),n=!1;if(!!t)return s(t),o.forEach(f=>{if(f.funcid==e)return n=!0}),n}function s(e){let t=[];if(e){for(const n in e)t.push(e[n]),o.push(e[n]);for(const n in t)t[n].children&&s(t[n].children)}}var a="",d={install:function(e,t){},getBrowserInfo:i,competence_funcid:u};return d});
