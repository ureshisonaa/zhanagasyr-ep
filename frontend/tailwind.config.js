/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Монохромная палитра — Часть 4 ТЗ, "Цветовая палитра"
        ink: {
          0: '#FFFFFF',
          50: '#F5F5F5',
          100: '#E5E5E5',
          200: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          700: '#404040',
          900: '#171717',
          950: '#000000',
        },
        // Функциональные цвета — только для статусов/уведомлений/ошибок
        success: '#16A34A',
        danger: '#DC2626',
        warning: '#CA8A04',
        info: '#2563EB',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '1600px',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
    },
  },
  plugins: [],
};
