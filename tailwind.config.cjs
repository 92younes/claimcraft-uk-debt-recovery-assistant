/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      // Custom font family for headings
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
      },

      // Design tokens for consistent colors
      colors: {
        // Primary brand colors (teal-based)
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6', // Primary
          600: '#0d9488', // Primary dark
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },

      // Animation keyframes
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-out': {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(4px)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-out-right': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },

      // Animation utilities
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-out-right': 'slide-out-right 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },

      // Consistent spacing scale (extending defaults)
      spacing: {
        '4.5': '1.125rem', // 18px
        '5.5': '1.375rem', // 22px
        '13': '3.25rem',   // 52px
        '15': '3.75rem',   // 60px
        '18': '4.5rem',    // 72px
        '22': '5.5rem',    // 88px
      },

      // Border radius tokens
      borderRadius: {
        '4xl': '2rem',     // 32px
      },

      // Box shadow tokens
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.1)',
        'soft-lg': '0 4px 16px -4px rgba(0, 0, 0, 0.12)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
      },

      // Typography scale
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }], // 10px
      },

      // Z-index scale for layering
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },

      // Transition duration tokens
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
      },

      // Screen breakpoints (extending defaults for consistency)
      screens: {
        'xs': '475px',
      },

      // Max-width tokens for modals and containers
      maxWidth: {
        'modal-sm': '24rem',  // 384px
        'modal-md': '28rem',  // 448px
        'modal-lg': '32rem',  // 512px
        'modal-xl': '36rem',  // 576px
        'modal-2xl': '42rem', // 672px
      },
    },
  },
  plugins: [],
};
