import Vue from 'vue'
import {
  Button,
  Radio,
  RadioGroup,
  Message,
  Form,
  FormItem,
  Notification,
  Tag,
  InputNumber,
  Switch,
  Input,
  Tooltip
} from 'element-ui'
import VueHighlightJS from 'vue-highlightjs'
import "highlight.js/styles/github.css"
Vue.use(VueHighlightJS)

import App from './App'

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.config.productionTip = false

Vue.useAll = function(...arg){
  for (let com of arg) {
    Vue.use(com)
  }
}


let prototype = Vue.prototype
Vue.useAll(Button,Radio,RadioGroup,Form,FormItem,Tag,InputNumber,Switch,Input,Tooltip)
prototype.$msg = Message
prototype.$notify = Notification

/* eslint-disable no-new */
new Vue({
  components: { App },
  template: '<App/>'
}).$mount('#app')
