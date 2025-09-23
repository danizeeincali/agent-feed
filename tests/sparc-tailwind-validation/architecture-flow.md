# SPARC Phase 3: Architecture - CSS Compilation Flow

## CSS Compilation Architecture Map

```mermaid
graph TD
    A[Source CSS Files] --> B[PostCSS Processing]
    B --> C[Tailwind CSS Processing]
    C --> D[Autoprefixer]
    D --> E[CSS Optimization]
    E --> F[Bundle Generation]

    A1[src/styles/globals.css] --> A
    A2[frontend/src/index.css] --> A
    A3[Component CSS files] --> A

    B --> B1[@tailwind base processing]
    B --> B2[@tailwind components processing]
    B --> B3[@tailwind utilities processing]

    C --> C1[Content scanning]
    C --> C2[Class generation]
    C --> C3[Custom config application]

    F --> F1[Development bundle]
    F --> F2[Production bundle]
```

## Component Architecture Flow

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   React Components  │    │   CSS Class Usage   │    │   Generated Styles  │
│                     │    │                      │    │                     │
│ • AgentCard.jsx     │───▶│ className="bg-white  │───▶│ .bg-white {         │
│ • MainPage.tsx      │    │  shadow-lg p-4"      │    │   background: #fff; │
│ • Navigation.tsx    │    │                      │    │ }                   │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
          │                           │                           │
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   Build Process     │    │   Tailwind Scanning  │    │   CSS Compilation   │
│                     │    │                      │    │                     │
│ • Next.js Webpack   │───▶│ • Content paths      │───▶│ • PostCSS pipeline  │
│ • CSS Loader        │    │ • Class detection    │    │ • Autoprefixing     │
│ • PostCSS Plugin    │    │ • Purge unused       │    │ • Minification      │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
```

## File System Architecture

```
project-root/
├── tailwind.config.cjs          # Tailwind configuration
├── postcss.config.cjs           # PostCSS configuration
├── next.config.mjs              # Next.js build configuration
├── src/styles/
│   └── globals.css              # Global Tailwind styles
├── frontend/src/
│   ├── index.css                # Frontend-specific styles
│   ├── styles/
│   │   ├── agents.css           # Agent-specific styles
│   │   └── mobile-responsive.css # Responsive utilities
│   └── components/              # React components with Tailwind classes
└── .next/                       # Build output
    ├── static/chunks/           # JavaScript bundles
    └── static/css/              # Compiled CSS bundles
```

## Processing Pipeline Architecture

### 1. Development Mode
```
Source Change → Hot Module Replacement → CSS Recompilation → Browser Update
     │                    │                     │                  │
     │                    │                     │                  │
  File Watch          WebSocket              PostCSS            Live Reload
  (Chokidar)         Connection             Processing         (No Refresh)
```

### 2. Production Build
```
Source Files → Content Analysis → CSS Generation → Optimization → Bundle Output
     │              │                  │              │             │
     │              │                  │              │             │
  Glob Pattern   Class Extraction   Tailwind CSS   Minification   Static Assets
  Matching       & Validation       Generation     & Autoprefixer  (.next/static/)
```

## Configuration Integration Points

### PostCSS Configuration (postcss.config.cjs)
```javascript
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},    // Tailwind v4 PostCSS plugin
    autoprefixer: {},              // Browser prefixing
  },
}
```

### Tailwind Configuration (tailwind.config.cjs)
```javascript
module.exports = {
  content: [                       // Content scanning paths
    "./frontend/src/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: { extend: {...} },        // Custom theme extensions
  plugins: [...],                  // Custom plugins
}
```

### Next.js Integration (next.config.mjs)
```javascript
webpack: (config) => {
  // Enhanced CSS handling for Tailwind
  // PostCSS loader configuration
  // CSS module rules optimization
}
```

## Performance Architecture

### Build Performance
- **CSS Purging**: Removes unused Tailwind classes in production
- **Tree Shaking**: Eliminates unused JavaScript and CSS
- **Code Splitting**: Separates CSS into logical chunks
- **Caching**: Leverages Next.js build cache for faster rebuilds

### Runtime Performance
- **Critical CSS**: Inlines above-the-fold styles
- **Lazy Loading**: Loads non-critical styles asynchronously
- **HTTP/2 Optimization**: Efficient delivery of CSS chunks
- **Browser Caching**: Aggressive caching with cache busting

## Error Handling Architecture

### Build-Time Errors
```
CSS Syntax Error → PostCSS Parser → Error Reporter → Build Failure
     │                   │              │               │
Configuration Error → Tailwind Config → Warning Logger → Continue Build
     │                   │              │               │
Missing Class → Content Scanner → Warning Logger → Generate Fallback
```

### Runtime Errors
```
Missing Styles → CSS Not Loaded → Fallback Styles → Graceful Degradation
     │               │               │                     │
Browser Incompatible → Feature Detection → Polyfill Loading → Enhanced Experience
```

## Testing Architecture Integration

### Unit Testing
- **CSS Generation Tests**: Verify Tailwind classes generate correct CSS
- **Configuration Tests**: Validate config file parsing and application
- **Component Tests**: Ensure components render with expected styles

### Integration Testing
- **Build Process Tests**: Validate end-to-end CSS compilation
- **Browser Tests**: Cross-browser compatibility validation
- **Performance Tests**: Bundle size and load time validation

### Visual Testing
- **Screenshot Comparison**: Detect visual regressions
- **Responsive Testing**: Validate layouts across breakpoints
- **Accessibility Testing**: Ensure proper contrast and readability