import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // Relative base so the built assets resolve correctly whether the site is
  // served from a GitHub Pages project subpath (username.github.io/repo/)
  // or a custom domain at the root.
  base: './',
  plugins: [vue()],
})
