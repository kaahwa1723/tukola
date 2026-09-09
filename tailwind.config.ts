import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2952E8',
        accent: '#00C8FF',
        navy: '#0A0F2C',
        'dark-bg': '#060B1F',
        surface: '#F0F4FF',
        brand: {
          50:  '#E8F4FF',
          100: '#C5E3FF',
          200: '#8EC9FF',
          300: '#4AABFF',
          400: '#00C8FF',
          500: '#2952E8',
          600: '#1E40D0',
          700: '#1A2DB8',
          800: '#12208A',
          900: '#0A1260',
        },
        tukola: {
          cyan:  '#00C8FF',
          blue:  '#2952E8',
          mid:   '#1E40D0',
          navy:  '#1A2DB8',
          dark:  '#0F1B6E',
        },
      },
      backgroundImage: {
        'tukola-gradient': 'linear-gradient(135deg, #00C8FF 0%, #2952E8 50%, #1A2DB8 100%)',
        'tukola-gradient-v': 'linear-gradient(180deg, #00C8FF 0%, #2952E8 60%, #1A2DB8 100%)',
        'tukola-gradient-r': 'linear-gradient(135deg, #1A2DB8 0%, #2952E8 50%, #00C8FF 100%)',
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
      },
      fontFamily: {
        heading: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        orbitron: ['Orbitron', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'tukola': '0 8px 32px rgba(41, 82, 232, 0.35)',
        'tukola-lg': '0 20px 60px rgba(41, 82, 232, 0.4)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255,255,255,0.2)',
        'card': '0 2px 16px rgba(41, 82, 232, 0.08), 0 1px 3px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 32px rgba(41, 82, 232, 0.15), 0 2px 8px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'loading-bar': 'loadingBar 2s ease-in-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up-d1': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
        'slide-up-d2': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both',
        'slide-up-d3': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'marquee': 'marquee 30s linear infinite',
        'float-orb': 'float-orb 15s ease-in-out infinite',
        'ken-burns': 'ken-burns 6s ease-out forwards',
      },
      keyframes: {
        loadingBar: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 200, 255, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 200, 255, 0.8), 0 0 80px rgba(41, 82, 232, 0.3)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'float-orb': {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0, 0) scale(1)' },
        },
        'ken-burns': {
          '0%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1.15)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
