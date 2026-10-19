import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://adequate88.github.io',
  integrations: [sitemap()],
  // Projects and Writing were merged into /work; keep the old index URLs working.
  redirects: {
    '/projects': '/work',
    '/blog': '/work',
  },
  markdown: {
    // Colours come from the --astro-code-* tokens, so code follows the light/dark theme.
    shikiConfig: { theme: 'css-variables' },
  },
});
