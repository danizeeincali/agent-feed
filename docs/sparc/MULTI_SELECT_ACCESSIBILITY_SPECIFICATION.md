# Accessibility Specification for Multi-Select Filtering

## WCAG 2.1 AA Compliance Requirements

### Overview
The multi-select filtering enhancement must meet WCAG 2.1 AA accessibility standards to ensure usability for all users, including those using assistive technologies.

## Keyboard Navigation Requirements

### Primary Navigation Patterns

#### Tab Navigation
```typescript
// Keyboard navigation sequence
TabOrder: [
  'filter-button',           // Main filter toggle
  'agent-input',            // Agent search input  
  'agent-suggestions',      // Agent suggestion list
  'agent-chips',           // Selected agent chips
  'hashtag-input',         // Hashtag search input
  'hashtag-suggestions',   // Hashtag suggestion list  
  'hashtag-chips',         // Selected hashtag chips
  'apply-filter',          // Apply filter button
  'clear-filter'           // Clear filter button
]
```

#### Arrow Key Navigation
```typescript
interface KeyboardNavigation {
  // Suggestion list navigation
  ArrowDown: 'Move to next suggestion';
  ArrowUp: 'Move to previous suggestion';
  
  // Chip navigation  
  ArrowLeft: 'Move to previous chip';
  ArrowRight: 'Move to next chip';
  
  // Input controls
  Escape: 'Close dropdown, clear focus';
  Enter: 'Select suggestion or submit';
  Space: 'Toggle dropdown (on buttons)';
  Delete: 'Remove focused chip';
  Backspace: 'Remove last chip (empty input)';
}
```

### Focus Management

#### Focus States
```css
/* High contrast focus indicators */
.filter-input:focus {
  outline: 3px solid #005fcc;
  outline-offset: 2px;
  box-shadow: 0 0 0 1px #ffffff, 0 0 0 4px #005fcc;
}

.filter-chip:focus {
  outline: 2px solid #005fcc;
  outline-offset: 1px;
  background-color: #e1f4ff;
}

.suggestion-item:focus {
  background-color: #005fcc;
  color: #ffffff;
  outline: 2px solid #ffffff;
  outline-offset: -2px;
}
```

#### Focus Trap Implementation
```typescript
const useFocusTrap = (containerRef: RefObject<HTMLElement>, isActive: boolean) => {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const trapFocus = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };
    
    document.addEventListener('keydown', trapFocus);
    return () => document.removeEventListener('keydown', trapFocus);
  }, [isActive, containerRef]);
};
```

## ARIA Implementation

### ARIA Labels and Roles

#### Multi-Select Input Component
```typescript
const MultiSelectInput: React.FC<Props> = ({ type, ...props }) => {
  return (
    <div 
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-owns={`${type}-suggestions`}
      aria-label={`Select multiple ${type}`}
    >
      <input
        type="text"
        role="searchbox"
        aria-autocomplete="list"
        aria-describedby={`${type}-help ${type}-status`}
        aria-label={`Search for ${type} to add`}
        aria-invalid={hasErrors}
        aria-errormessage={hasErrors ? `${type}-errors` : undefined}
      />
      
      <ul
        id={`${type}-suggestions`}
        role="listbox"
        aria-label={`Available ${type} options`}
        style={{ display: isOpen ? 'block' : 'none' }}
      >
        {suggestions.map((suggestion, index) => (
          <li
            key={suggestion.id}
            role="option"
            aria-selected={index === focusedIndex}
            aria-label={suggestion.displayName}
          >
            {suggestion.displayName}
          </li>
        ))}
      </ul>
    </div>
  );
};
```

#### Filter Chip Component
```typescript
const FilterChip: React.FC<Props> = ({ item, onRemove, ...props }) => {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`Remove ${item.displayName} from filter`}
      aria-describedby="chip-help"
      className="filter-chip"
      onKeyDown={(e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          onRemove(item.id);
        }
      }}
    >
      <span aria-hidden="true">{item.displayName}</span>
      <button
        type="button"
        aria-label={`Remove ${item.displayName}`}
        onClick={() => onRemove(item.id)}
        className="chip-remove-button"
      >
        <X aria-hidden="true" />
      </button>
    </span>
  );
};
```

### Live Regions for Dynamic Updates

#### Status Announcements
```typescript
const FilterStatusAnnouncer: React.FC = () => {
  const [announcement, setAnnouncement] = useState<string>('');
  
  const announceFilterChange = (agents: FilterItem[], hashtags: FilterItem[]) => {
    const agentCount = agents.length;
    const hashtagCount = hashtags.length;
    
    let message = '';
    if (agentCount > 0 && hashtagCount > 0) {
      message = `Filter updated: ${agentCount} agent${agentCount !== 1 ? 's' : ''} and ${hashtagCount} hashtag${hashtagCount !== 1 ? 's' : ''} selected`;
    } else if (agentCount > 0) {
      message = `Filter updated: ${agentCount} agent${agentCount !== 1 ? 's' : ''} selected`;
    } else if (hashtagCount > 0) {
      message = `Filter updated: ${hashtagCount} hashtag${hashtagCount !== 1 ? 's' : ''} selected`;
    } else {
      message = 'All filters cleared';
    }
    
    setAnnouncement(message);
    
    // Clear announcement after brief delay
    setTimeout(() => setAnnouncement(''), 1000);
  };
  
  return (
    <div
      aria-live="polite"
      aria-atomic="true" 
      className="sr-only"
    >
      {announcement}
    </div>
  );
};
```

#### Results Count Updates
```typescript
const ResultsAnnouncer: React.FC<{ count: number; loading: boolean }> = ({ count, loading }) => {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="sr-only"
    >
      {loading ? 'Loading results...' : `${count} posts found`}
    </div>
  );
};
```

## Screen Reader Support

### Descriptive Text and Help Content

#### Context and Instructions
```typescript
const FilterHelpText: React.FC = () => {
  return (
    <div>
      <div id="agent-help" className="sr-only">
        Type to search for agents. Press Enter to add custom agents. 
        Use Tab to navigate between fields and Delete key to remove selected agents.
      </div>
      
      <div id="hashtag-help" className="sr-only">
        Type to search for hashtags. Press Enter to add custom hashtags.
        Use Tab to navigate between fields and Delete key to remove selected hashtags.
      </div>
      
      <div id="chip-help" className="sr-only">
        Press Delete or Backspace to remove this filter item.
      </div>
      
      <div id="filter-logic-help" className="sr-only">
        Filters within the same category use OR logic. 
        Filters across categories use AND logic.
        For example: Agent A OR Agent B, AND Hashtag 1 OR Hashtag 2.
      </div>
    </div>
  );
};
```

#### Error Messages
```typescript
const FilterErrors: React.FC<{ errors: FilterError[] }> = ({ errors }) => {
  return (
    <div>
      {errors.map(error => (
        <div
          key={error.code}
          id={`${error.field}-errors`}
          role="alert"
          aria-live="assertive"
          className="error-message"
        >
          {error.message}
          {error.suggestions.length > 0 && (
            <div className="error-suggestions">
              Suggestions: {error.suggestions.join(', ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
```

## High Contrast and Visual Accessibility

### Color Contrast Requirements

#### Color Palette
```css
:root {
  /* High contrast color system */
  --filter-primary: #005fcc;      /* 4.5:1 contrast on white */
  --filter-secondary: #7b1fa2;    /* 4.5:1 contrast on white */
  --filter-success: #2e7d32;      /* 4.5:1 contrast on white */
  --filter-error: #d32f2f;        /* 4.5:1 contrast on white */
  --filter-warning: #f57c00;      /* 4.5:1 contrast on white */
  
  /* Focus indicators */  
  --focus-outline: #005fcc;
  --focus-shadow: rgba(0, 95, 204, 0.25);
  
  /* High contrast mode overrides */
  --hc-background: Canvas;
  --hc-text: CanvasText;
  --hc-border: CanvasText;
  --hc-focus: Highlight;
}

@media (prefers-contrast: high) {
  :root {
    --filter-primary: var(--hc-text);
    --filter-secondary: var(--hc-text);
    --focus-outline: var(--hc-focus);
  }
  
  .filter-chip {
    border: 2px solid var(--hc-border);
    background: var(--hc-background);
    color: var(--hc-text);
  }
  
  .suggestion-item:hover,
  .suggestion-item:focus {
    background: var(--hc-focus);
    color: var(--hc-background);
  }
}
```

#### Focus Indicators
```css
.filter-element {
  /* Minimum 2px outline for visibility */
  outline: 2px solid transparent;
  outline-offset: 2px;
  transition: outline-color 0.15s ease;
}

.filter-element:focus {
  outline-color: var(--focus-outline);
  box-shadow: 0 0 0 4px var(--focus-shadow);
}

/* Ensure focus visibility in Windows High Contrast Mode */
@media (prefers-contrast: high) {
  .filter-element:focus {
    outline: 2px solid var(--hc-focus);
    outline-offset: 2px;
  }
}
```

## Motion and Animation Accessibility

### Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  .filter-dropdown,
  .filter-chip,
  .suggestion-item {
    transition: none;
    animation: none;
  }
  
  /* Provide instant feedback instead of animations */
  .filter-loading {
    background-image: none;
  }
  
  .filter-loading::after {
    content: "Loading...";
  }
}

@media (prefers-reduced-motion: no-preference) {
  .filter-dropdown {
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  
  .filter-chip {
    transition: background-color 0.15s ease, transform 0.1s ease;
  }
}
```

## Touch and Mobile Accessibility

### Touch Target Sizes
```css
.filter-chip,
.filter-button,
.suggestion-item {
  /* Minimum 44px touch target per WCAG */
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
}

.chip-remove-button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px;
}

/* Increase spacing on touch devices */
@media (pointer: coarse) {
  .filter-chip {
    margin: 4px;
    padding: 16px 20px;
  }
  
  .suggestion-item {
    padding: 16px 20px;
    border-bottom: 1px solid #e0e0e0;
  }
}
```

### Mobile-Specific Considerations
```typescript
const MobileFilterPanel: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // On mobile, use full-screen modal for better UX
  if (isMobile) {
    return (
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        aria-label="Filter options"
        role="dialog"
        aria-modal="true"
      >
        <FilterContent />
      </Modal>
    );
  }
  
  return <FilterContent />;
};
```

## Testing Requirements

### Automated Accessibility Testing
```typescript
// Jest + @testing-library/jest-dom accessibility tests
describe('MultiSelect Accessibility', () => {
  test('should have proper ARIA attributes', () => {
    render(<MultiSelectInput type="agents" />);
    
    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(combobox).toHaveAttribute('aria-haspopup', 'listbox');
    
    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toHaveAttribute('aria-autocomplete', 'list');
    expect(searchInput).toHaveAccessibleName();
  });
  
  test('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<MultiSelectInput type="agents" />);
    
    const input = screen.getByRole('searchbox');
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    
    expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'true');
  });
  
  test('should announce changes to screen readers', async () => {
    render(<FilterPanel />);
    
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });
});
```

### Manual Testing Checklist

#### Keyboard Navigation
- [ ] Tab order is logical and complete
- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are clearly visible
- [ ] Escape key closes dropdowns appropriately
- [ ] Arrow keys navigate suggestion lists
- [ ] Enter/Space keys activate appropriate elements

#### Screen Reader Testing
- [ ] All elements have appropriate labels
- [ ] Dynamic changes are announced
- [ ] Error messages are announced immediately
- [ ] Context and instructions are available
- [ ] Table/list relationships are clear

#### High Contrast Mode
- [ ] All elements remain visible in high contrast
- [ ] Focus indicators work in high contrast
- [ ] Color is not the only means of conveying information
- [ ] Text contrast meets 4.5:1 minimum ratio

#### Mobile/Touch Testing  
- [ ] Touch targets meet 44px minimum
- [ ] Gestures work as expected
- [ ] Zoom up to 200% maintains functionality
- [ ] Screen rotation maintains usability

## Implementation Priority

### Phase 1: Core Accessibility (Critical)
1. Keyboard navigation support
2. Basic ARIA implementation  
3. Focus management
4. Screen reader announcements

### Phase 2: Enhanced Support (Important)
1. High contrast mode support
2. Reduced motion preferences
3. Error message accessibility
4. Mobile touch optimization

### Phase 3: Advanced Features (Nice-to-have)
1. Voice control optimization
2. Switch device support
3. Advanced screen reader features
4. Personalization preferences

This accessibility specification ensures the multi-select filtering system is usable by all users, regardless of their abilities or assistive technologies used.