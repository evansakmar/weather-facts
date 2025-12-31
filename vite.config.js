import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/weather-facts/",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Weather Facts",
        short_name: "Weather",
        description: "The world's most boring weather app",
        theme_color: "#c6c6c6",
        background_color: "#ffffff",
        icons: [
          {
            src: "icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
        display: "standalone",
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/v1\/forecast/,
            handler: "NetworkFirst",
            options: {
              cacheName: "forecast-data",
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        settings: "settings.html",
      },
    },
  },
});
