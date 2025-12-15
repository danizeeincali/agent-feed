---
name: Design System
description: Comprehensive UI component design patterns, accessibility standards, and design system frameworks for consistent user interfaces
version: "1.0.0"
category: shared
_protected: false
_allowed_agents: ["page-builder-agent", "page-verification-agent", "dynamic-page-testing-agent"]
_last_updated: "2025-10-18"
---

# Design System Skill

## Purpose

Provides comprehensive frameworks for creating consistent, accessible, and maintainable user interfaces through systematic design patterns, component libraries, and design tokens. Ensures visual consistency and exceptional user experience across all interfaces.

## When to Use This Skill

- Building new UI components
- Designing page layouts and templates
- Ensuring accessibility compliance (WCAG 2.1 AA)
- Creating responsive designs
- Establishing visual consistency
- Implementing design tokens
- Building component libraries

## Core Frameworks

### 1. Design Token System

**Color Tokens**:
```css
/* Brand Colors */
--color-primary-50: #f0f9ff;
--color-primary-100: #e0f2fe;
--color-primary-200: #bae6fd;
--color-primary-300: #7dd3fc;
--color-primary-400: #38bdf8;
--color-primary-500: #0ea5e9;  /* Base primary */
--color-primary-600: #0284c7;
--color-primary-700: #0369a1;
--color-primary-800: #075985;
--color-primary-900: #0c4a6e;

/* Neutral Colors */
--color-neutral-50: #fafafa;
--color-neutral-100: #f5f5f5;
--color-neutral-200: #e5e5e5;
--color-neutral-300: #d4d4d4;
--color-neutral-400: #a3a3a3;
--color-neutral-500: #737373;
--color-neutral-600: #525252;
--color-neutral-700: #404040;
--color-neutral-800: #262626;
--color-neutral-900: #171717;

/* Semantic Colors */
--color-success: #10b981;
--color-warning: #f59e0b;
--color-error: #ef4444;
--color-info: #3b82f6;

/* Surface Colors */
--color-background: #ffffff;
--color-surface: #fafafa;
--color-surface-hover: #f5f5f5;

/* Text Colors */
--color-text-primary: #171717;
--color-text-secondary: #525252;
--color-text-tertiary: #a3a3a3;
--color-text-inverse: #ffffff;

/* Border Colors */
--color-border-light: #e5e5e5;
--color-border-medium: #d4d4d4;
--color-border-dark: #a3a3a3;
```

**Spacing Scale**:
```css
/* Based on 4px base unit */
--space-1: 4px;    /* 0.25rem */
--space-2: 8px;    /* 0.5rem */
--space-3: 12px;   /* 0.75rem */
--space-4: 16px;   /* 1rem */
--space-5: 20px;   /* 1.25rem */
--space-6: 24px;   /* 1.5rem */
--space-8: 32px;   /* 2rem */
--space-10: 40px;  /* 2.5rem */
--space-12: 48px;  /* 3rem */
--space-16: 64px;  /* 4rem */
--space-20: 80px;  /* 5rem */
--space-24: 96px;  /* 6rem */

/* Semantic Spacing */
--space-component-xs: var(--space-2);
--space-component-sm: var(--space-3);
--space-component-md: var(--space-4);
--space-component-lg: var(--space-6);
--space-component-xl: var(--space-8);

--space-section-sm: var(--space-8);
--space-section-md: var(--space-12);
--space-section-lg: var(--space-16);
--space-section-xl: var(--space-24);
```

**Typography Tokens**:
```css
/* Font Families */
--font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
  "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
--font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
  "Liberation Mono", monospace;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
--text-5xl: 3rem;      /* 48px */

/* Font Weights */
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-none: 1;
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;
```

**Border Radius**:
```css
--radius-none: 0;
--radius-sm: 0.125rem;   /* 2px */
--radius-base: 0.25rem;  /* 4px */
--radius-md: 0.375rem;   /* 6px */
--radius-lg: 0.5rem;     /* 8px */
--radius-xl: 0.75rem;    /* 12px */
--radius-2xl: 1rem;      /* 16px */
--radius-full: 9999px;   /* Fully rounded */
```

**Shadows**:
```css
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1),
             0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1),
             0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1),
             0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1),
             0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);
```

**Animation Tokens**:
```css
/* Durations */
--duration-fast: 150ms;
--duration-base: 250ms;
--duration-slow: 350ms;
--duration-slower: 500ms;

/* Easing Functions */
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### 2. Layout Patterns

**Container System**:
```css
.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--space-4);
  padding-right: var(--space-4);
}

/* Responsive max-widths */
@media (min-width: 640px) {
  .container { max-width: 640px; }
}
@media (min-width: 768px) {
  .container { max-width: 768px; }
}
@media (min-width: 1024px) {
  .container { max-width: 1024px; }
}
@media (min-width: 1280px) {
  .container { max-width: 1280px; }
}
@media (min-width: 1536px) {
  .container { max-width: 1536px; }
}
```

**Grid System**:
```css
/* 12-column responsive grid */
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-4);
}

/* Column spans */
.col-span-1 { grid-column: span 1 / span 1; }
.col-span-2 { grid-column: span 2 / span 2; }
.col-span-3 { grid-column: span 3 / span 3; }
.col-span-4 { grid-column: span 4 / span 4; }
.col-span-6 { grid-column: span 6 / span 6; }
.col-span-8 { grid-column: span 8 / span 8; }
.col-span-12 { grid-column: span 12 / span 12; }

/* Responsive variants */
@media (min-width: 768px) {
  .md\:col-span-4 { grid-column: span 4 / span 4; }
  .md\:col-span-6 { grid-column: span 6 / span 6; }
  .md\:col-span-8 { grid-column: span 8 / span 8; }
}
```

**Flexbox Utilities**:
```css
.flex { display: flex; }
.inline-flex { display: inline-flex; }

/* Direction */
.flex-row { flex-direction: row; }
.flex-col { flex-direction: column; }

/* Justify */
.justify-start { justify-content: flex-start; }
.justify-end { justify-content: flex-end; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }

/* Align */
.items-start { align-items: flex-start; }
.items-center { align-items: center; }
.items-end { align-items: flex-end; }
.items-stretch { align-items: stretch; }

/* Gap */
.gap-2 { gap: var(--space-2); }
.gap-4 { gap: var(--space-4); }
.gap-6 { gap: var(--space-6); }
```

**Common Layout Patterns**:

**Stack Layout (Vertical Spacing)**:
```css
.stack {
  display: flex;
  flex-direction: column;
}

.stack-xs { gap: var(--space-2); }
.stack-sm { gap: var(--space-3); }
.stack-md { gap: var(--space-4); }
.stack-lg { gap: var(--space-6); }
.stack-xl { gap: var(--space-8); }
```

**Cluster Layout (Horizontal Wrapping)**:
```css
.cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  align-items: center;
}
```

**Sidebar Layout**:
```css
.sidebar-layout {
  display: grid;
  gap: var(--space-6);
}

@media (min-width: 768px) {
  .sidebar-layout {
    grid-template-columns: 250px 1fr;
  }
}
```

**Card Grid**:
```css
.card-grid {
  display: grid;
  gap: var(--space-6);
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}
```

### 3. Component Patterns

**Button Component**:
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  children: ReactNode;
  onClick?: () => void;
}

// Styles
const buttonStyles = {
  base: `
    inline-flex items-center justify-center
    font-medium rounded-md
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  variant: {
    primary: `
      bg-primary-600 text-white
      hover:bg-primary-700
      focus:ring-primary-500
    `,
    secondary: `
      bg-neutral-200 text-neutral-900
      hover:bg-neutral-300
      focus:ring-neutral-500
    `,
    ghost: `
      bg-transparent text-primary-600
      hover:bg-primary-50
      focus:ring-primary-500
    `,
    danger: `
      bg-error text-white
      hover:bg-red-700
      focus:ring-error
    `
  },
  size: {
    sm: 'text-sm px-3 py-1.5 gap-1.5',
    md: 'text-base px-4 py-2 gap-2',
    lg: 'text-lg px-6 py-3 gap-2.5'
  }
};
```

**Input Component**:
```typescript
interface InputProps {
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  icon?: ReactNode;
}

// Accessibility requirements
const inputA11y = {
  // Always associate label with input
  label: { htmlFor: inputId },
  input: { id: inputId, 'aria-describedby': helperTextId },

  // Error handling
  errorMessage: { id: errorId, role: 'alert' },
  inputWithError: { 'aria-invalid': true, 'aria-describedby': errorId },

  // Required fields
  requiredInput: { 'aria-required': true }
};
```

**Card Component**:
```typescript
interface CardProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  clickable?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

const cardStyles = {
  base: 'rounded-lg overflow-hidden',
  variant: {
    elevated: 'bg-white shadow-md',
    outlined: 'bg-white border border-neutral-200',
    filled: 'bg-neutral-50'
  },
  padding: {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  },
  clickable: 'cursor-pointer hover:shadow-lg transition-shadow'
};
```

**Modal Component**:
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

// Accessibility requirements
const modalA11y = {
  overlay: {
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': titleId
  },
  closeButton: {
    'aria-label': 'Close dialog'
  },
  // Focus trap: Keep focus within modal
  // Return focus to trigger element on close
};
```

### 4. Responsive Design Framework

**Breakpoint System**:
```typescript
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet portrait
  lg: '1024px',  // Tablet landscape / Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px' // Extra large desktop
};

// Mobile-first approach
const responsive = {
  // Base styles apply to mobile
  base: { fontSize: '14px', padding: '8px' },

  // Progressively enhance for larger screens
  sm: { fontSize: '14px', padding: '12px' },
  md: { fontSize: '16px', padding: '16px' },
  lg: { fontSize: '16px', padding: '20px' },
  xl: { fontSize: '18px', padding: '24px' }
};
```

**Responsive Patterns**:

**Responsive Typography**:
```css
.heading-responsive {
  font-size: var(--text-2xl);
  line-height: var(--leading-tight);
}

@media (min-width: 768px) {
  .heading-responsive {
    font-size: var(--text-3xl);
  }
}

@media (min-width: 1024px) {
  .heading-responsive {
    font-size: var(--text-4xl);
  }
}
```

**Responsive Images**:
```html
<picture>
  <source
    media="(min-width: 1024px)"
    srcset="image-large.jpg"
  />
  <source
    media="(min-width: 768px)"
    srcset="image-medium.jpg"
  />
  <img
    src="image-small.jpg"
    alt="Descriptive alt text"
    loading="lazy"
  />
</picture>
```

**Container Queries** (Modern approach):
```css
.card-container {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card-content {
    display: grid;
    grid-template-columns: 1fr 2fr;
  }
}
```

### 5. Accessibility (WCAG 2.1 AA) Standards

**Color Contrast Requirements**:
```
NORMAL TEXT (< 18pt / < 14pt bold):
  - Minimum contrast ratio: 4.5:1
  - Enhanced contrast: 7:1 (AAA)

LARGE TEXT (≥ 18pt / ≥ 14pt bold):
  - Minimum contrast ratio: 3:1
  - Enhanced contrast: 4.5:1 (AAA)

UI COMPONENTS & GRAPHICS:
  - Minimum contrast ratio: 3:1
```

**Keyboard Navigation**:
```typescript
// All interactive elements must be keyboard accessible
const keyboardA11y = {
  // Visible focus indicators
  focusVisible: 'focus:ring-2 focus:ring-primary-500 focus:outline-none',

  // Logical tab order
  tabIndex: {
    interactive: 0,
    nonInteractive: -1,
    customOrder: 'Use tabindex="0" and manage focus programmatically'
  },

  // Keyboard event handlers
  keyboardEvents: {
    Enter: 'Activate buttons/links',
    Space: 'Activate buttons, toggle checkboxes',
    Escape: 'Close modals/dropdowns',
    ArrowKeys: 'Navigate lists/menus/tabs'
  }
};
```

**ARIA Patterns**:

**Buttons**:
```html
<button
  type="button"
  aria-label="Descriptive label"
  aria-pressed="false" <!-- For toggle buttons -->
  aria-expanded="false" <!-- For disclosure buttons -->
>
  Button Text
</button>
```

**Form Controls**:
```html
<div class="form-field">
  <label for="email-input">
    Email Address
    <span aria-label="required">*</span>
  </label>
  <input
    id="email-input"
    type="email"
    required
    aria-required="true"
    aria-invalid="false"
    aria-describedby="email-helper email-error"
  />
  <span id="email-helper" class="helper-text">
    We'll never share your email
  </span>
  <span id="email-error" class="error-text" role="alert">
    <!-- Error message when invalid -->
  </span>
</div>
```

**Landmark Regions**:
```html
<header role="banner">
  <nav role="navigation" aria-label="Main navigation">
    <!-- Navigation content -->
  </nav>
</header>

<main role="main">
  <article aria-labelledby="article-title">
    <h1 id="article-title">Article Title</h1>
    <!-- Article content -->
  </article>
</main>

<aside role="complementary" aria-label="Related content">
  <!-- Sidebar content -->
</aside>

<footer role="contentinfo">
  <!-- Footer content -->
</footer>
```

**Skip Links**:
```html
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<main id="main-content">
  <!-- Main content -->
</main>

<style>
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--color-primary-600);
  color: white;
  padding: 8px;
  text-decoration: none;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
</style>
```

**Screen Reader Patterns**:
```html
<!-- Visually hidden but screen reader accessible -->
<span class="sr-only">
  Screen reader only text
</span>

<style>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>

<!-- Hide from screen readers -->
<div aria-hidden="true">
  Decorative content
</div>
```

### 6. Dark Mode Support

**Theme Token Structure**:
```css
:root {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #fafafa;
  --color-text-primary: #171717;
  --color-text-secondary: #525252;
}

[data-theme="dark"] {
  --color-bg-primary: #171717;
  --color-bg-secondary: #262626;
  --color-text-primary: #fafafa;
  --color-text-secondary: #a3a3a3;
}

/* Use semantic tokens in components */
.component {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}
```

**Dark Mode Best Practices**:
```
CONTRAST INVERSION:
  - Don't just invert colors
  - Reduce contrast slightly in dark mode
  - Use softer whites (off-white, not pure white)

ELEVATION:
  - Light mode: Elevation = darker shadows
  - Dark mode: Elevation = lighter surfaces

COLOR ADJUSTMENTS:
  - Reduce saturation in dark mode
  - Adjust color intensity for readability
  - Test all colors for sufficient contrast
```

### 7. Component Composition Patterns

**Compound Components**:
```typescript
// Parent manages state, children receive props via context
const Tabs = ({ children, defaultValue }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
};

Tabs.List = ({ children }) => {
  return <div role="tablist">{children}</div>;
};

Tabs.Tab = ({ value, children }) => {
  const { activeTab, setActiveTab } = useTabsContext();
  return (
    <button
      role="tab"
      aria-selected={activeTab === value}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
};

Tabs.Panel = ({ value, children }) => {
  const { activeTab } = useTabsContext();
  return activeTab === value ? (
    <div role="tabpanel">{children}</div>
  ) : null;
};

// Usage
<Tabs defaultValue="tab1">
  <Tabs.List>
    <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
    <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
  <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
</Tabs>
```

**Render Props Pattern**:
```typescript
interface DataListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => ReactNode;
  renderEmpty?: () => ReactNode;
  loading?: boolean;
}

const DataList = <T,>({
  data,
  renderItem,
  renderEmpty,
  loading
}: DataListProps<T>) => {
  if (loading) return <Spinner />;
  if (data.length === 0) {
    return renderEmpty ? renderEmpty() : <p>No items</p>;
  }

  return (
    <ul>
      {data.map((item, index) => (
        <li key={index}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
};
```

**Polymorphic Components**:
```typescript
type AsProp<C extends React.ElementType> = {
  as?: C;
};

type PropsToOmit<C extends React.ElementType, P> = keyof (AsProp<C> & P);

type PolymorphicComponentProp<
  C extends React.ElementType,
  Props = {}
> = React.PropsWithChildren<Props & AsProp<C>> &
  Omit<React.ComponentPropsWithoutRef<C>, PropsToOmit<C, Props>>;

// Usage: Can render as any element
<Text as="h1">Heading</Text>
<Text as="p">Paragraph</Text>
<Text as="span">Span</Text>
```

## Best Practices

### For Design Tokens:
1. **Use Semantic Names**: `--color-primary` not `--color-blue`
2. **Maintain Scales**: Consistent progression in spacing/sizing
3. **Document Tokens**: Clear usage guidelines for each token
4. **Version Token Changes**: Breaking changes need version bumps
5. **Test Across Themes**: Validate tokens in light and dark modes

### For Component Design:
1. **Accessibility First**: Build accessible from the start
2. **Composable Architecture**: Small, reusable, combinable pieces
3. **Consistent APIs**: Similar components have similar prop patterns
4. **Proper Semantics**: Use correct HTML elements
5. **Error States**: Handle loading, error, empty states

### For Responsive Design:
1. **Mobile First**: Start with mobile, enhance for desktop
2. **Content-Based Breakpoints**: Break where content needs it
3. **Touch Targets**: Minimum 44x44px for touch interfaces
4. **Test on Real Devices**: Emulators aren't enough
5. **Performance**: Optimize images, lazy load, reduce layout shifts

### For Accessibility:
1. **Keyboard Test Everything**: Never rely only on mouse
2. **Screen Reader Test**: Use NVDA, JAWS, VoiceOver
3. **Color Contrast**: Use tools to verify contrast ratios
4. **Focus Indicators**: Always visible, never remove outlines without replacement
5. **Semantic HTML**: Use proper elements for better a11y

## Integration with Other Skills

- **component-library**: Implement React components following these patterns
- **testing-patterns**: Accessibility and visual regression testing
- **code-standards**: Maintain consistent implementation
- **documentation-standards**: Document component usage and patterns

## Success Metrics

- **WCAG 2.1 AA Compliance**: 100% of components accessible
- **Design Consistency**: <5% deviation from design system
- **Component Reusability**: 80%+ of UI from shared components
- **Performance**: <100ms component render times
- **Responsive Coverage**: Works perfectly mobile through desktop
- **Theme Support**: Full light/dark mode coverage

## References

- [design-tokens.md](design-tokens.md) - Complete token reference
- [component-library.md](component-library.md) - All available components
- [accessibility-guide.md](accessibility-guide.md) - A11y implementation guide
- [responsive-patterns.md](responsive-patterns.md) - Responsive design techniques
- [wcag-checklist.md](wcag-checklist.md) - WCAG 2.1 AA compliance checklist

---

**Remember**: Great design systems empower teams to build consistent, accessible, beautiful interfaces efficiently. Invest in the system, reap benefits across every project. Accessibility is not optional—it's a baseline requirement for quality software.
