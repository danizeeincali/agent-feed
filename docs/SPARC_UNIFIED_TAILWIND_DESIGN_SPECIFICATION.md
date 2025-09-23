# SPARC Specification: Unified Tailwind CSS Design System

## Document Information
- **Phase**: SPARC Specification Phase
- **Created**: 2025-09-22
- **Purpose**: Define comprehensive unified styling approach using Tailwind CSS
- **Scope**: All pages and components across the Agent Feed application

## 1. Executive Summary

This specification defines a unified design system using Tailwind CSS as the single source of truth for styling across all pages in the Agent Feed application. The system establishes consistent visual patterns, accessibility standards, and professional appearance while maintaining scalability and maintainability.

## 2. Design System Architecture

### 2.1 Core Philosophy
- **Single Source of Truth**: Tailwind CSS utility classes for all styling
- **Consistency First**: Standardized components and patterns
- **Accessibility Focused**: WCAG 2.1 AA compliance throughout
- **Performance Optimized**: Minimal CSS bundle size through utility-first approach
- **Developer Experience**: Predictable, maintainable styling patterns

### 2.2 Design Tokens Structure
```
Design System Hierarchy:
├── Colors (Brand, Semantic, Neutral)
├── Typography (Scale, Weights, Line Heights)
├── Spacing (Consistent 8px grid system)
├── Layout (Grid, Containers, Breakpoints)
├── Components (Cards, Buttons, Forms, Navigation)
├── Effects (Shadows, Gradients, Animations)
└── Accessibility (Focus, Contrast, Screen Reader)
```

## 3. Color Specification

### 3.1 Primary Brand Colors
```css
/* Purple Gradient Theme */
--gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
--purple-primary: #667eea
--purple-secondary: #764ba2

/* Tailwind Configuration */
colors: {
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
  }
}
```

### 3.2 Semantic Color Palette
```css
semantic: {
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d'
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309'
  },
  error: {
    50: '#fef2f2',
    100: '#fecaca',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c'
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8'
  }
}
```

### 3.3 Neutral Color System
```css
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
```

## 4. Typography Specification

### 4.1 Font Stack
```css
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
}
```

### 4.2 Typography Scale
```css
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
}
```

### 4.3 Typography Usage Patterns
```html
<!-- Page Titles -->
<h1 class="text-4xl md:text-5xl font-bold text-white text-center mb-8">

<!-- Section Headings -->
<h2 class="text-2xl md:text-3xl font-semibold text-neutral-800 mb-6">

<!-- Card Titles -->
<h3 class="text-xl font-semibold text-neutral-800 mb-4">

<!-- Body Text -->
<p class="text-base text-neutral-600 leading-relaxed">

<!-- Small Text -->
<span class="text-sm text-neutral-500">
```

## 5. Layout and Spacing Specification

### 5.1 Container System
```css
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
}
```

### 5.2 Spacing Scale (8px Grid System)
```css
spacing: {
  'px': '1px',
  '0': '0',
  '0.5': '0.125rem', // 2px
  '1': '0.25rem',    // 4px
  '2': '0.5rem',     // 8px
  '3': '0.75rem',    // 12px
  '4': '1rem',       // 16px
  '5': '1.25rem',    // 20px
  '6': '1.5rem',     // 24px
  '8': '2rem',       // 32px
  '10': '2.5rem',    // 40px
  '12': '3rem',      // 48px
  '16': '4rem',      // 64px
  '20': '5rem',      // 80px
  '24': '6rem',      // 96px
  '32': '8rem'       // 128px
}
```

### 5.3 Grid System
```html
<!-- Main Layout Grid -->
<div class="min-h-screen bg-gradient-to-br from-brand-purple-light to-brand-purple-dark">
  <div class="container mx-auto px-4 py-8">
    <!-- Content Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <!-- Grid Items -->
    </div>
  </div>
</div>
```

## 6. Component Specifications

### 6.1 Card Components
```html
<!-- Primary Card -->
<div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-neutral-200">
  <!-- Card Content -->
</div>

<!-- Agent Card Specification -->
<div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-neutral-200 hover:transform hover:-translate-y-1">
  <div class="flex justify-between items-start mb-4">
    <h3 class="text-xl font-semibold text-neutral-800 line-clamp-2">Agent Name</h3>
    <span class="px-3 py-1 bg-success-100 text-success-700 text-sm font-medium rounded-full">Active</span>
  </div>
  <p class="text-neutral-600 text-sm mb-4 line-clamp-3">Description text</p>
  <div class="flex justify-between items-center text-xs text-neutral-500">
    <span>Priority: P0</span>
    <span>Type: User-Facing</span>
  </div>
</div>
```

### 6.2 Button Components
```html
<!-- Primary Button -->
<button class="bg-brand-purple-light hover:bg-brand-purple-dark text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 focus:ring-4 focus:ring-brand-purple-light focus:ring-opacity-20 focus:outline-none">
  Primary Action
</button>

<!-- Secondary Button -->
<button class="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium py-3 px-6 rounded-lg transition-all duration-200 focus:ring-4 focus:ring-neutral-300 focus:ring-opacity-20 focus:outline-none">
  Secondary Action
</button>

<!-- Outline Button -->
<button class="border-2 border-brand-purple-light text-brand-purple-light hover:bg-brand-purple-light hover:text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 focus:ring-4 focus:ring-brand-purple-light focus:ring-opacity-20 focus:outline-none">
  Outline Action
</button>
```

### 6.3 Status Badge Components
```html
<!-- Success Badge -->
<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
  <span class="w-2 h-2 bg-success-500 rounded-full mr-2"></span>
  Active
</span>

<!-- Warning Badge -->
<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
  <span class="w-2 h-2 bg-warning-500 rounded-full mr-2"></span>
  Pending
</span>

<!-- Error Badge -->
<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-error-100 text-error-800">
  <span class="w-2 h-2 bg-error-500 rounded-full mr-2"></span>
  Error
</span>

<!-- Priority Badges -->
<span class="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-error-500 text-white">P0</span>
<span class="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-warning-500 text-white">P1</span>
<span class="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-info-500 text-white">P2</span>
```

### 6.4 Form Components
```html
<!-- Input Field -->
<div class="space-y-2">
  <label class="block text-sm font-medium text-neutral-700">Field Label</label>
  <input type="text" class="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-4 focus:ring-brand-purple-light focus:ring-opacity-20 focus:border-brand-purple-light focus:outline-none transition-all duration-200" placeholder="Enter value">
</div>

<!-- Search Input -->
<div class="relative">
  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
    <svg class="h-5 w-5 text-neutral-400"><!-- Search icon --></svg>
  </div>
  <input type="search" class="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-4 focus:ring-brand-purple-light focus:ring-opacity-20 focus:border-brand-purple-light focus:outline-none" placeholder="Search...">
</div>
```

## 7. Navigation and Layout Structure

### 7.1 Main Layout Pattern
```html
<div class="min-h-screen bg-gradient-to-br from-brand-purple-light to-brand-purple-dark">
  <!-- Header -->
  <header class="bg-white/10 backdrop-blur-md border-b border-white/20">
    <div class="container mx-auto px-4 py-4">
      <!-- Navigation content -->
    </div>
  </header>

  <!-- Main Content -->
  <main class="container mx-auto px-4 py-8">
    <!-- Page content -->
  </main>

  <!-- Footer (if needed) -->
  <footer class="bg-white/5 backdrop-blur-md border-t border-white/20 mt-auto">
    <div class="container mx-auto px-4 py-6">
      <!-- Footer content -->
    </div>
  </footer>
</div>
```

### 7.2 Sidebar Navigation
```html
<nav class="bg-white shadow-lg border-r border-neutral-200 w-64 h-screen fixed left-0 top-0 overflow-y-auto">
  <div class="p-6">
    <!-- Logo -->
    <div class="flex items-center space-x-3 mb-8">
      <div class="w-10 h-10 bg-gradient-to-br from-brand-purple-light to-brand-purple-dark rounded-lg flex items-center justify-center">
        <svg class="w-6 h-6 text-white"><!-- Logo icon --></svg>
      </div>
      <span class="text-xl font-bold text-neutral-800">AgentLink</span>
    </div>

    <!-- Navigation Items -->
    <ul class="space-y-2">
      <li>
        <a href="#" class="flex items-center space-x-3 px-4 py-3 rounded-lg text-neutral-700 hover:bg-brand-purple-50 hover:text-brand-purple-700 transition-all duration-200">
          <svg class="w-5 h-5"><!-- Icon --></svg>
          <span>Navigation Item</span>
        </a>
      </li>
    </ul>
  </div>
</nav>
```

## 8. Responsive Design Specifications

### 8.1 Breakpoint Strategy
```css
screens: {
  'sm': '640px',   // Small tablets and large phones
  'md': '768px',   // Tablets
  'lg': '1024px',  // Small laptops
  'xl': '1280px',  // Large laptops and desktops
  '2xl': '1536px'  // Large desktops
}
```

### 8.2 Responsive Patterns
```html
<!-- Responsive Grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">

<!-- Responsive Typography -->
<h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">

<!-- Responsive Spacing -->
<div class="p-4 md:p-6 lg:p-8">

<!-- Responsive Visibility -->
<div class="hidden md:block">Desktop Only</div>
<div class="block md:hidden">Mobile Only</div>
```

## 9. Animation and Interaction Specifications

### 9.1 Transition Standards
```css
transition: {
  'default': 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  'fast': 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  'slow': 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)'
}
```

### 9.2 Animation Classes
```html
<!-- Hover Effects -->
<div class="hover:transform hover:-translate-y-1 hover:shadow-xl transition-all duration-300">

<!-- Loading States -->
<div class="animate-pulse bg-neutral-200 rounded-lg h-4 w-full">

<!-- Fade In -->
<div class="animate-fade-in opacity-0 animate-delay-100">

<!-- Slide In -->
<div class="transform translate-x-full animate-slide-in-left">
```

## 10. Accessibility Specifications

### 10.1 Focus Management
```css
/* Focus ring specifications */
focus:ring-4 focus:ring-brand-purple-light focus:ring-opacity-20 focus:outline-none

/* Focus visible for keyboard navigation */
focus-visible:ring-4 focus-visible:ring-brand-purple-light focus-visible:ring-opacity-20
```

### 10.2 Color Contrast Requirements
- **Normal Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3:1 contrast ratio
- **Interactive Elements**: Minimum 4.5:1 contrast ratio
- **Focus Indicators**: Minimum 3:1 contrast ratio

### 10.3 Screen Reader Support
```html
<!-- Semantic HTML -->
<main role="main" aria-label="Main content">
<nav role="navigation" aria-label="Primary navigation">
<section aria-labelledby="section-heading">

<!-- ARIA Labels -->
<button aria-label="Close dialog" aria-describedby="close-help">
<input aria-describedby="field-error" aria-invalid="true">

<!-- Skip Links -->
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white px-4 py-2 rounded-lg">
  Skip to main content
</a>
```

## 11. Performance Specifications

### 11.1 CSS Bundle Optimization
- **Purge unused classes**: Enable Tailwind's purge functionality
- **Critical CSS**: Inline critical path CSS for above-the-fold content
- **Lazy loading**: Load non-critical CSS asynchronously

### 11.2 Image Optimization
```html
<!-- Responsive Images -->
<img src="image.jpg"
     srcset="image-320.jpg 320w, image-640.jpg 640w, image-1024.jpg 1024w"
     sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
     alt="Descriptive alt text"
     loading="lazy"
     class="w-full h-auto rounded-lg">
```

## 12. Implementation Guidelines

### 12.1 CSS Class Naming Convention
```html
<!-- Component-based approach -->
<div class="agent-card">                    <!-- Component wrapper -->
<div class="agent-card__header">            <!-- Component element -->
<div class="agent-card__title">             <!-- Component element -->
<div class="agent-card--featured">          <!-- Component modifier -->

<!-- Utility-first approach -->
<div class="bg-white rounded-xl shadow-lg p-6">
```

### 12.2 Development Workflow
1. **Design First**: Start with design tokens and component specifications
2. **Build Components**: Create reusable component patterns
3. **Test Accessibility**: Validate WCAG compliance
4. **Optimize Performance**: Purge unused CSS and optimize bundles
5. **Document Patterns**: Maintain component library documentation

### 12.3 Quality Assurance Checklist
- [ ] Consistent use of design tokens
- [ ] WCAG 2.1 AA accessibility compliance
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Mobile-first responsive design
- [ ] Performance optimization (< 50KB CSS bundle)
- [ ] Component reusability and maintainability

## 13. Migration Strategy

### 13.1 Phase 1: Foundation Setup
1. Update Tailwind configuration with design tokens
2. Create base component library
3. Implement main layout structure

### 13.2 Phase 2: Component Migration
1. Migrate existing components to Tailwind patterns
2. Update navigation and layout components
3. Standardize form and interactive elements

### 13.3 Phase 3: Page-by-Page Migration
1. Convert main page to new design system
2. Update agents page with unified styling
3. Apply consistent patterns to all remaining pages

### 13.4 Phase 4: Optimization and Cleanup
1. Remove legacy CSS files
2. Optimize Tailwind configuration
3. Document final component library

## 14. Maintenance and Evolution

### 14.1 Design System Governance
- **Single Source of Truth**: This specification document
- **Change Management**: All updates require specification update
- **Version Control**: Track design system versions with releases
- **Documentation**: Maintain up-to-date component examples

### 14.2 Future Enhancements
- **Dark Mode Support**: Implement systematic dark theme
- **Advanced Animations**: Add micro-interactions and transitions
- **Component Variants**: Expand component library with more variations
- **Design Tools Integration**: Sync with Figma/Sketch design files

---

## Conclusion

This SPARC specification provides a comprehensive foundation for implementing a unified Tailwind CSS design system across the Agent Feed application. The system prioritizes consistency, accessibility, and performance while maintaining developer productivity and design flexibility.

The purple gradient theme (#667eea to #764ba2) serves as the primary brand expression, with white card components providing clean content presentation. The typography hierarchy ensures clear information architecture, while the responsive grid system supports all device types.

Implementation should follow the phased approach outlined above, with continuous testing and validation against the accessibility and performance specifications defined in this document.