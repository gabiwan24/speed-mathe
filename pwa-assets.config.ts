import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config';

// logo.svg is full-bleed with its marks inside the maskable safe zone, so no padding is needed;
// the yellow background guards against a white ring.
const yellow = { background: '#fbff00' };

export default defineConfig({
  preset: {
    ...preset,
    maskable: { ...preset.maskable, padding: 0, resizeOptions: yellow },
    apple: { ...preset.apple, padding: 0, resizeOptions: yellow },
  },
  images: ['public/logo.svg'],
});
