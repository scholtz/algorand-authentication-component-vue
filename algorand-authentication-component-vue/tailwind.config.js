/** @type {import('tailwindcss').Config} */
const primeui = require('tailwindcss-primeui')

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,vue,html}'],
  darkMode: ['selector', '[class="p-dark"]'],
  plugins: [primeui]
}
