import vuetify, { transformAssetUrls } from "vite-plugin-vuetify";
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Use SPA mode with real-time client-side features
  ssr: false,
  nitro: {
    preset: 'firebase-hosting'
  },
  build: {
    transpile: ["vuetify"],
  },
  modules: [
    (_options, nuxt) => {
      nuxt.hooks.hook("vite:extendConfig", (config) => {
        // @ts-expect-error
        config.plugins.push(vuetify({ autoImport: true }));
      });
    }
  ],
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE_URL || "http://localhost:5001",
      apiBaseUrl: process.env.API_BASE_URL,
      programId: process.env.PROGRAM_ID,
      clusterUrl: process.env.CLUSTER_URL,
      mockSolana: process.env.MOCK_SOLANA
    },
  },
  devtools: { enabled: true },
  plugins: ["~/plugins/vuetify", "~/plugins/solana"],
  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'theme-color', content: '#1976d2' }
      ]
    }
  },
  vite: {
    vue: {
      template: {
        transformAssetUrls,
      },
    },
  },
});
