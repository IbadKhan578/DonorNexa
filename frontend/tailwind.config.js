/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: '#F6F3EE',
        surf: '#FFFFFF',
        sunk: '#EDE8E0',
        ink: '#1B1A18',
        ink2: '#524E47',
        ink3: '#6F6A61',
        line: '#E0DACF',
        line2: '#BDB6A8',
        pri: {
          DEFAULT: '#B3202A',
          hover: '#951A23',
          soft: '#FBE8E5',
          ink: '#7A141B'
        },
        sec: {
          DEFAULT: '#1F5F5B',
          soft: '#E1EFEC'
        },
        urg: {
          DEFAULT: '#A85A0A',
          soft: '#FCEED8'
        },
        nor: {
          DEFAULT: '#3E5A70',
          soft: '#E5ECF1'
        },
        ok: {
          DEFAULT: '#2B7239',
          soft: '#E3F1E4'
        },
        err: {
          DEFAULT: '#C02626',
          soft: '#FCE9E8'
        },
        inf: {
          DEFAULT: '#2D5B88',
          soft: '#E3EDF6'
        }
      },
      fontFamily: {
        serif: ['Fraunces', 'serif'],
        sans: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
