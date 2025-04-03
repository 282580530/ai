import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router/index.js'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as Icons from '@element-plus/icons-vue'
import commonJs from './assets/js/common'
import {
  Button,
  Icon,
  NavBar,
  Field,
  Cell,
  CellGroup,
  Toast,
  Tag,
  Image as VanImage,
  Popup,
  ActionSheet,
  SwipeCell
} from 'vant'
import 'vant/lib/index.css'

const app = createApp(App)
for (let i in Icons) {
    app.component(i, Icons[i])
}

// Register Vant components
app.use(Button)
app.use(Icon)
app.use(NavBar)
app.use(Field)
app.use(Cell)
app.use(CellGroup)
app.use(Toast)
app.use(Tag)
app.use(VanImage)
app.use(Popup)
app.use(ActionSheet)
app.use(SwipeCell)

app.use(router).use(ElementPlus)
app.config.globalProperties.$commonJs = commonJs
app.mount('#app')