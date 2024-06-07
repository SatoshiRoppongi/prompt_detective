// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  buildModules: [
    '@nuxt/typescript-build',
    '@nuxtjs/vuetify'
  ],
  plugins: [
    '@/plugins/vuetify',
    '@/plugins/solana'
  ],
  vite: {
    // plugings: [vuetify()],
    resolve: {
      alias: {
        "@": "/frontend",
      }
    }
  }
})
