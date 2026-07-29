import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://adequate88.github.io',
  integrations: [sitemap()],
});
