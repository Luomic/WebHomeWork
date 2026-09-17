import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'

import App from './App.vue'
import './assets/css/font.css'

createApp(App)
  .use(PrimeVue, {
    theme: { preset: Aura },
    license:
      'eyJpZCI6IjRmYzFhZTZhLTZiMTItNGZhMi05YWNjLTgzMzU3ZjU4NDhmYSIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3ODk2NDcwNTAsImV4cCI6MTgyMTE4MzA1MH0.11ja55lut0HRzd-YIJXqaLNswCRCROdw9M_yS7og8y9Z0i6K5h03-HO3BGlusBX2gL02tfd84PA79jtwl76cDA',
  })
  .mount('#app')
