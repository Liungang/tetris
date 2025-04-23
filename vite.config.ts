import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  // 设置基础路径为仓库名称，适配GitHub Pages部署
  base: '/tetris/',
  plugins: [vue()],
  server: {
    port: 3000
  },
  optimizeDeps: {
    include: ['pixi.js']
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
}) 