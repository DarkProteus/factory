import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages отдаёт сайт из /<репозиторий>/, путь задаёт workflow деплоя.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
});
