/**
 * SPARC Specification: Complete Tailwind CSS Configuration
 * Based on Unified Design System Specification
 *
 * This configuration implements the design tokens and specifications
 * defined in SPARC_UNIFIED_TAILWIND_DESIGN_SPECIFICATION.md
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./frontend/src/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./frontend/index.html",
    "./index.html",
  ],

  theme: {
    extend: {
      // === BRAND COLORS ===
      colors: {
        // Primary Brand Purple Gradient Theme
        brand: {
          purple: {
            light: '#667eea',
            dark: '#764ba2',
            50: '#f0f4ff',
            100: '#e5edff',
            200: '#d1deff',
            300: '#b4c6ff',
            400: '#96a7ff',
            500: '#667eea',
            600: '#5a6fd8',
            700: '#4f60c4',
            800: '#4552b0',
            900: '#764ba2'
          }
        },

        // Semantic Colors
        semantic: {
          success: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d'
          },
          warning: {
            50: '#fffbeb',
            100: '#fef3c7',
            200: '#fde68a',
            300: '#fcd34d',
            400: '#fbbf24',
            500: '#f59e0b',
            600: '#d97706',
            700: '#b45309',
            800: '#92400e',
            900: '#78350f'
          },
          error: {
            50: '#fef2f2',
            100: '#fecaca',
            200: '#fca5a5',
            300: '#f87171',
            400: '#f56565',
            500: '#ef4444',
            600: '#dc2626',
            700: '#b91c1c',
            800: '#991b1b',
            900: '#7f1d1d'
          },
          info: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a'
          }
        },

        // Enhanced Neutral System
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a'
        }
      },

      // === TYPOGRAPHY ===
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Monaco',
          'Cascadia Code',
          'monospace'
        ]
      },

      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],     // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }], // 14px
        'base': ['1rem', { lineHeight: '1.5rem' }],    // 16px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }], // 18px
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],  // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],     // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],  // 36px
        '5xl': ['3rem', { lineHeight: '1' }],          // 48px
        '6xl': ['3.75rem', { lineHeight: '1' }]        // 60px
      },

      // === LAYOUT & SPACING ===
      container: {
        center: true,
        padding: '1rem',
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px'
        }
      },

      spacing: {
        '18': '4.5rem',   // 72px
        '72': '18rem',    // 288px
        '84': '21rem',    // 336px
        '96': '24rem',    // 384px
      },

      // === EFFECTS & ANIMATIONS ===
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 25px -5px rgba(0, 0, 0, 0.04)',
        'strong': '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        'brand': '0 10px 40px -10px rgba(102, 126, 234, 0.3)',
        'brand-strong': '0 20px 50px -10px rgba(102, 126, 234, 0.4)'
      },

      dropShadow: {
        'soft': '0 2px 4px rgba(0, 0, 0, 0.1)',
        'medium': '0 4px 8px rgba(0, 0, 0, 0.15)',
        'strong': '0 8px 16px rgba(0, 0, 0, 0.2)'
      },

      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-brand-reverse': 'linear-gradient(315deg, #667eea 0%, #764ba2 100%)',
        'gradient-brand-vertical': 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
        'gradient-soft': 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        'gradient-dark': 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
      },

      // === ANIMATIONS ===
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-down': 'fadeInDown 0.5s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'float': 'float 3s ease-in-out infinite'
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      },

      // === TRANSITIONS ===
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
        '450': '450ms'
      },

      transitionTimingFunction: {
        'in-expo': 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
        'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      },

      // === BORDERS & RADIUS ===
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem'
      },

      borderWidth: {
        '3': '3px'
      },

      // === RESPONSIVE DESIGN ===
      screens: {
        'xs': '475px',
        '3xl': '1680px'
      },

      // === Z-INDEX SCALE ===
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100'
      }
    }
  },

  plugins: [
    // Add custom component styles
    function({ addComponents, addUtilities, theme }) {
      addComponents({
        // === CARD COMPONENTS ===
        '.card': {
          backgroundColor: theme('colors.white'),
          borderRadius: theme('borderRadius.xl'),
          boxShadow: theme('boxShadow.medium'),
          padding: theme('spacing.6'),
          border: `1px solid ${theme('colors.neutral.200')}`,
          transition: 'all 0.3s ease'
        },
        '.card:hover': {
          boxShadow: theme('boxShadow.strong'),
          transform: 'translateY(-2px)'
        },

        '.card-brand': {
          backgroundColor: theme('colors.white'),
          borderRadius: theme('borderRadius.xl'),
          boxShadow: theme('boxShadow.brand'),
          padding: theme('spacing.6'),
          border: `1px solid ${theme('colors.brand.purple.200')}`,
          transition: 'all 0.3s ease'
        },
        '.card-brand:hover': {
          boxShadow: theme('boxShadow.brand-strong'),
          transform: 'translateY(-4px)'
        },

        // === BUTTON COMPONENTS ===
        '.btn': {
          fontWeight: theme('fontWeight.medium'),
          paddingTop: theme('spacing.3'),
          paddingBottom: theme('spacing.3'),
          paddingLeft: theme('spacing.6'),
          paddingRight: theme('spacing.6'),
          borderRadius: theme('borderRadius.lg'),
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:focus': {
            outline: 'none',
            ringWidth: '4px',
            ringOpacity: '20%'
          }
        },

        '.btn-primary': {
          backgroundColor: theme('colors.brand.purple.500'),
          color: theme('colors.white'),
          '&:hover': {
            backgroundColor: theme('colors.brand.purple.600')
          },
          '&:focus': {
            ringColor: theme('colors.brand.purple.500')
          }
        },

        '.btn-secondary': {
          backgroundColor: theme('colors.neutral.100'),
          color: theme('colors.neutral.700'),
          '&:hover': {
            backgroundColor: theme('colors.neutral.200')
          },
          '&:focus': {
            ringColor: theme('colors.neutral.300')
          }
        },

        '.btn-outline': {
          border: `2px solid ${theme('colors.brand.purple.500')}`,
          color: theme('colors.brand.purple.500'),
          backgroundColor: 'transparent',
          '&:hover': {
            backgroundColor: theme('colors.brand.purple.500'),
            color: theme('colors.white')
          },
          '&:focus': {
            ringColor: theme('colors.brand.purple.500')
          }
        },

        // === BADGE COMPONENTS ===
        '.badge': {
          display: 'inline-flex',
          alignItems: 'center',
          paddingLeft: theme('spacing.3'),
          paddingRight: theme('spacing.3'),
          paddingTop: theme('spacing.1'),
          paddingBottom: theme('spacing.1'),
          borderRadius: theme('borderRadius.full'),
          fontSize: theme('fontSize.xs'),
          fontWeight: theme('fontWeight.medium')
        },

        '.badge-success': {
          backgroundColor: theme('colors.semantic.success.100'),
          color: theme('colors.semantic.success.800')
        },

        '.badge-warning': {
          backgroundColor: theme('colors.semantic.warning.100'),
          color: theme('colors.semantic.warning.800')
        },

        '.badge-error': {
          backgroundColor: theme('colors.semantic.error.100'),
          color: theme('colors.semantic.error.800')
        },

        '.badge-info': {
          backgroundColor: theme('colors.semantic.info.100'),
          color: theme('colors.semantic.info.800')
        },

        // === LAYOUT COMPONENTS ===
        '.page-container': {
          minHeight: '100vh',
          backgroundImage: theme('backgroundImage.gradient-brand')
        },

        '.content-container': {
          maxWidth: theme('container.screens.xl'),
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: theme('spacing.4'),
          paddingRight: theme('spacing.4'),
          paddingTop: theme('spacing.8'),
          paddingBottom: theme('spacing.8')
        },

        '.grid-responsive': {
          display: 'grid',
          gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
          gap: theme('spacing.6'),
          '@media (min-width: 640px)': {
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
          },
          '@media (min-width: 1024px)': {
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'
          },
          '@media (min-width: 1280px)': {
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))'
          }
        }
      });

      addUtilities({
        // === CUSTOM UTILITIES ===
        '.text-gradient-brand': {
          backgroundImage: theme('backgroundImage.gradient-brand'),
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text'
        },

        '.bg-glass': {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        },

        '.bg-glass-dark': {
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 0, 0, 0.2)'
        },

        // Screen reader utilities
        '.sr-only': {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: '0'
        },

        '.not-sr-only': {
          position: 'static',
          width: 'auto',
          height: 'auto',
          padding: '0',
          margin: '0',
          overflow: 'visible',
          clip: 'auto',
          whiteSpace: 'normal'
        }
      });
    }
  ]
};