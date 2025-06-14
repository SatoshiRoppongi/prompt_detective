import vuetify, { transformAssetUrls } from "vite-plugin-vuetify";
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  build: {
    transpile: ["vuetify"],
  },
  modules: [
    (_options, nuxt) => {
      nuxt.hooks.hook("vite:extendConfig", (config) => {
        // @ts-expect-error
        config.plugins.push(vuetify({ autoImport: true }));
      });
    },
    // "@nuxt/typescript-build",
    // "@nuxtjs/vuetify",
    //...
  ],
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.API_BASE_URL,
      programId: process.env.PROGRAM_ID,
      clusterUrl: process.env.CLUSTER_URL,
      mockSolana: process.env.MOCK_SOLANA
    },
  },
  buildModules: ["@nuxt/typescript-build", "@nuxtjs/vuetify"],
  devtools: { enabled: true },
  plugins: ["@/plugins/vuetify", "@/plugins/solana"],
  vite: {
    // plugings: [vuetify()],
    resolve: {
      alias: {
        "@": "/frontend",
      },
    },

    vue: {
      template: {
        transformAssetUrls,
      },
    },
  },
});
