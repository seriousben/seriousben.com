/**
 * Tailwind CSS Configuration
 * Preserves the original typography system while adding Tailwind utilities
 */
module.exports = {
  content: [
    './content/**/*.md',
    './layouts/**/*.html',
    './themes/seriousben/layouts/**/*.html',
    './themes/seriousben/assets/**/*.js',
  ],
  theme: {
    extend: {
      // Preserve original font stack
      fontFamily: {
        serif: ['cardo', 'georgia', 'serif'],
        sans: ['helvetica', 'arial', 'geneva', 'sans-serif'],
        mono: ['Monaco', 'Lucida Console', 'Bitstream Vera Sans Mono', 'Courier', 'monospace'],
      },

      // Preserve original color palette
      colors: {
        primary: '#222',
        'code-bg': '#f6f6f6',
      },

      // Preserve spacing units from original design
      container: {
        center: true,
        padding: {
          DEFAULT: '0.625rem', // 10px
          sm: '1rem',
          lg: '1.25rem',
          xl: '2rem',
        },
      },

      // Match original breakpoints
      screens: {
        'medium': '800px',
      },

      // Preserve typography scale (from Shevy)
      fontSize: {
        '2.5xl': ['2.5em', { lineHeight: '1.2' }],
        '4xl': ['4em', { lineHeight: '1em' }],
      },

      // Preserve article content widths
      maxWidth: {
        article: '650px',
        code: '800px',
        highlight: '600px',
        content: '1000px',
        toc: '550px',
      },
    },
  },
  plugins: [
    // Use Tailwind's typography plugin for prose styling
    // This will work with the font stack we defined
    require('@tailwindcss/typography'),
  ],
}
