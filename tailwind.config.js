/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nvidia: {
          green: '#76B900',
          darkgreen: '#5a8f00',
          black: '#1a1a1a',
          gray: '#2a2a2a',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
      stroke: {
        'nvidia-green': '#76B900',
      },
    },
  },
  plugins: [],
}
