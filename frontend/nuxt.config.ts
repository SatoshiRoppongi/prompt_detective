import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
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
    //...
  ],
  devtools: { enabled: true },
  buildModules: ["@nuxt/typescript-build", "@nuxtjs/vuetify"],
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
        transformAssetUrls
      }
    }
  },
});
