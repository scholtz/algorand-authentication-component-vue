/** @type {import('tailwindcss').Config} */
const primeui = require('tailwindcss-primeui')

export default {
  important: true,

  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,vue,html}',
    './node_modules/algorand-authentication-component-vue/**/*.{js,ts,jsx,tsx}' // 👈 include the dependency
  ],
  darkMode: ['selector', '[class="p-dark"]'],
  plugins: [primeui]
}
