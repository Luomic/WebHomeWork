import { createApp } from "vue";
import PrimeVue from "primevue/config";
import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";

import App from "./App.vue";
import "./assets/css/font.css";

const NoirPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: "#f7f7f7",
      100: "#ededed",
      200: "#e0e0e0",
      300: "#c9c9c9",
      400: "#a3a3a3",
      500: "#000000",
      600: "#3a3a3a",
      700: "#262626",
      800: "#4d4d4d",
      900: "#666666",
      950: "#0a0a0a",
      color: "{primary.500}",
      contrastColor: "#ffffff",
      hoverColor: "{primary.600}",
      activeColor: "{primary.700}",
    },
  },
});

createApp(App)
  .use(PrimeVue, {
    theme: {
      preset: NoirPreset,
      options: {
        darkModeSelector: ".to-dark",
      },
    },
    license:
      "eyJpZCI6IjRmYzFhZTZhLTZiMTItNGZhMi05YWNjLTgzMzU3ZjU4NDhmYSIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3ODk2NDcwNTAsImV4cCI6MTgyMTE4MzA1MH0.11ja55lut0HRzd-YIJXqaLNswCRCROdw9M_yS7og8y9Z0i6K5h03-HO3BGlusBX2gL02tfd84PA79jtwl76cDA",
  })
  .mount("#app");
