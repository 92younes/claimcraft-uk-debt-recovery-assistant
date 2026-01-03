/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './index.tsx',
    './components/**/*.{js,jsx,ts,tsx}',
    './pages/**/*.{js,jsx,ts,tsx}',
    './layouts/**/*.{js,jsx,ts,tsx}',
    './hooks/**/*.{js,jsx,ts,tsx}',
    './services/**/*.{js,jsx,ts,tsx}',
    './store/**/*.{js,jsx,ts,tsx}',
    './utils/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      // ========================================
      // TYPOGRAPHY
      // ========================================
      fontFamily: {
        display: ['"Crimson Text"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Monaco', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }], // 10px
        'xs': ['0.75rem', { lineHeight: '1rem' }],       // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],   // 14px
        'base': ['1rem', { lineHeight: '1.5rem' }],      // 16px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],   // 18px
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],    // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],       // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],  // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],    // 36px
      },

      letterSpacing: {
        'tightest': '-0.05em',
        'tighter': '-0.025em',
        'tight': '-0.015em',
        'normal': '0em',
        'wide': '0.025em',
        'wider': '0.05em',
        'widest': '0.1em',
      },

      // ========================================
      // COLORS - Design Tokens
      // ========================================
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
          950: '#042f2e',
        },
        // Extended neutral palette
        surface: {
          DEFAULT: '#f8fafc',
          raised: '#ffffff',
          overlay: 'rgba(15, 23, 42, 0.5)',
        },
      },

      // ========================================
      // SPACING - Extended scale
      // ========================================
      spacing: {
        '4.5': '1.125rem',  // 18px
        '5.5': '1.375rem',  // 22px
        '13': '3.25rem',    // 52px
        '15': '3.75rem',    // 60px
        '18': '4.5rem',     // 72px
        '22': '5.5rem',     // 88px
        '26': '6.5rem',     // 104px
        '30': '7.5rem',     // 120px
      },

      // ========================================
      // BORDER RADIUS - Consistent scale
      // ========================================
      borderRadius: {
        'xs': '0.25rem',    // 4px
        'sm': '0.375rem',   // 6px
        'md': '0.5rem',     // 8px
        'lg': '0.625rem',   // 10px
        'xl': '0.75rem',    // 12px
        '2xl': '1rem',      // 16px
        '3xl': '1.5rem',    // 24px
        '4xl': '2rem',      // 32px
      },

      // ========================================
      // BOX SHADOWS - Premium depth system
      // ========================================
      boxShadow: {
        // Soft shadows (Stripe-inspired)
        'soft-xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'soft-md': '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 8px 24px -4px rgba(0, 0, 0, 0.1), 0 4px 8px -2px rgba(0, 0, 0, 0.05)',
        'soft-xl': '0 12px 32px -4px rgba(0, 0, 0, 0.12), 0 6px 12px -3px rgba(0, 0, 0, 0.06)',
        'soft-2xl': '0 24px 48px -8px rgba(0, 0, 0, 0.15), 0 12px 24px -6px rgba(0, 0, 0, 0.08)',

        // Colored shadows
        'teal': '0 4px 14px 0 rgba(20, 184, 166, 0.25)',
        'teal-lg': '0 8px 25px 0 rgba(20, 184, 166, 0.3)',
        'teal-sm': '0 2px 8px 0 rgba(20, 184, 166, 0.2)',

        // Inner shadows
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.04)',
        'inner-xs': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.03)',

        // Button shadows
        'btn': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
        'btn-hover': '0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'btn-active': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',

        // Focus ring shadows
        'focus-ring': '0 0 0 2px rgba(20, 184, 166, 0.5)',
        'focus-ring-offset': '0 0 0 2px #fff, 0 0 0 4px rgba(20, 184, 166, 0.5)',

        // Card hover
        'card-hover': '0 8px 24px -6px rgba(0, 0, 0, 0.12), 0 12px 16px -8px rgba(0, 0, 0, 0.08)',
      },

      // ========================================
      // ANIMATIONS & KEYFRAMES
      // ========================================
      keyframes: {
        // Fade animations
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-out': {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(4px)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },

        // Slide animations
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-out-right': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-down': {
          '0%': { transform: 'translateY(-16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },

        // Scale animations
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'scale-out': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
        'scale-in-bounce': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },

        // Spring animation (for buttons, cards)
        'spring': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.97)' },
          '100%': { transform: 'scale(1)' },
        },

        // Pulse animations
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '1' },
          '100%': { transform: 'scale(1.3)', opacity: '0' },
        },

        // Shimmer for loading
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'shimmer-fast': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },

        // Glow animation
        'glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(20, 184, 166, 0.4)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(20, 184, 166, 0.4)' },
        },

        // Bounce subtle
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },

        // Wiggle for attention
        'wiggle': {
          '0%, 100%': { transform: 'rotate(-1deg)' },
          '50%': { transform: 'rotate(1deg)' },
        },

        // Progress bar
        'progress': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },

        // Spin with ease
        'spin-ease': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },

        // Float animation
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },

        // Expand animation (for modals)
        'expand': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },

        // Count up (for numbers)
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },

        // Backdrop blur in
        'backdrop-in': {
          '0%': { backdropFilter: 'blur(0px)', backgroundColor: 'rgba(15, 23, 42, 0)' },
          '100%': { backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.5)' },
        },
      },

      animation: {
        // Basic animations
        'fade-in': 'fade-in 0.2s ease-out forwards',
        'fade-out': 'fade-out 0.2s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
        'fade-in-down': 'fade-in-down 0.3s ease-out forwards',

        // Slide animations
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
        'slide-out-right': 'slide-out-right 0.3s ease-out forwards',
        'slide-in-left': 'slide-in-left 0.3s ease-out forwards',
        'slide-in-up': 'slide-in-up 0.4s ease-out forwards',
        'slide-in-down': 'slide-in-down 0.25s ease-out forwards',

        // Scale animations
        'scale-in': 'scale-in 0.2s ease-out forwards',
        'scale-out': 'scale-out 0.2s ease-out forwards',
        'scale-in-bounce': 'scale-in-bounce 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',

        // Spring animation
        'spring': 'spring 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',

        // Continuous animations
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'shimmer': 'shimmer 2s infinite linear',
        'shimmer-fast': 'shimmer-fast 1.5s infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'bounce-subtle': 'bounce-subtle 1s ease-in-out infinite',
        'wiggle': 'wiggle 0.3s ease-in-out',
        'spin-ease': 'spin-ease 1s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',

        // UI animations
        'expand': 'expand 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'count-up': 'count-up 0.5s ease-out forwards',
        'backdrop-in': 'backdrop-in 0.2s ease-out forwards',
        'progress': 'progress 0.5s ease-out forwards',
      },

      // ========================================
      // TRANSITIONS
      // ========================================
      transitionDuration: {
        '0': '0ms',
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '175': '175ms',
        '200': '200ms',
        '225': '225ms',
        '250': '250ms',
        '275': '275ms',
        '300': '300ms',
        '350': '350ms',
        '400': '400ms',
        '500': '500ms',
        '600': '600ms',
        '700': '700ms',
      },

      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'snappy': 'cubic-bezier(0.2, 0, 0, 1)',
        'expressive': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      // ========================================
      // LAYOUT
      // ========================================
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },

      maxWidth: {
        'modal-xs': '20rem',   // 320px
        'modal-sm': '24rem',   // 384px
        'modal-md': '28rem',   // 448px
        'modal-lg': '32rem',   // 512px
        'modal-xl': '36rem',   // 576px
        'modal-2xl': '42rem',  // 672px
        'modal-3xl': '48rem',  // 768px
        'modal-full': 'calc(100vw - 2rem)',
      },

      zIndex: {
        '1': '1',
        '2': '2',
        '5': '5',
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },

      // ========================================
      // BACKDROP
      // ========================================
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '40px',
      },

      // ========================================
      // OPACITY SCALE
      // ========================================
      opacity: {
        '2': '0.02',
        '3': '0.03',
        '4': '0.04',
        '6': '0.06',
        '8': '0.08',
        '12': '0.12',
        '15': '0.15',
        '35': '0.35',
        '45': '0.45',
        '55': '0.55',
        '65': '0.65',
        '85': '0.85',
        '98': '0.98',
      },
    },
  },
  plugins: [],
};

