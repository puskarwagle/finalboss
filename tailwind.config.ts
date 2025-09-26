import type { Config } from 'tailwindcss'
import daisyui from 'daisyui'

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  plugins: [daisyui],
  daisyui: {
    themes: ['corporate'],
    base: true,
    styled: true,
    utils: true,
    logs: true,
    rtl: false,
  },
} satisfies Config