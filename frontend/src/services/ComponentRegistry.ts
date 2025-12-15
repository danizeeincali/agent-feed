/**
 * Component Registry Implementation
 * Maps agent specifications to shadcn/ui components with validation and security
 */

import React from 'react';
import * as z from 'zod';

// shadcn/ui component imports
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Switch } from '../components/ui/switch';
import { Slider } from '../components/ui/slider';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Calendar } from '../components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';

// Type imports
import type {
  ComponentRegistry,
  ComponentMapper,
  ValidationResult,
  SecurityPolicy,
  ComponentPerformanceHints,
  ComponentAccessibility,
  ComponentDocumentation,
  ButtonProps,
  InputProps,
  CardProps,
  BaseComponentProps
} from '../types/agent-dynamic-pages';

// Validation schemas using Zod
const basePropsSchema = z.object({
  id: z.string().optional(),
  className: z.string().optional(),
  style: z.record(z.any()).optional(),
  'data-testid': z.string().optional(),
  'aria-label': z.string().optional(),
  'aria-describedby': z.string().optional(),
  role: z.string().optional()
});

const buttonPropsSchema = basePropsSchema.extend({
  variant: z.enum(['default', 'destructive', 'outline', 'secondary', 'ghost', 'link']).optional(),
  size: z.enum(['default', 'sm', 'lg', 'icon']).optional(),
  disabled: z.boolean().optional(),
  loading: z.boolean().optional(),
  type: z.enum(['button', 'submit', 'reset']).optional(),
  children: z.any().optional()
});

const inputPropsSchema = basePropsSchema.extend({
  type: z.enum(['text', 'email', 'password', 'number', 'tel', 'url', 'search']).optional(),
  placeholder: z.string().optional(),
  value: z.string().optional(),
  defaultValue: z.string().optional(),
  disabled: z.boolean().optional(),
  readonly: z.boolean().optional(),
  required: z.boolean().optional(),
  pattern: z.string().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  min: z.union([z.number(), z.string()]).optional(),
  max: z.union([z.number(), z.string()]).optional(),
  step: z.union([z.number(), z.string()]).optional(),
  autoComplete: z.string().optional(),
  autoFocus: z.boolean().optional(),
  error: z.string().optional(),
  helperText: z.string().optional(),
  label: z.string().optional()
});

const cardPropsSchema = basePropsSchema.extend({
  title: z.string().optional(),
  description: z.string().optional(),
  children: z.any().optional(),
  variant: z.enum(['default', 'outline', 'filled']).optional(),
  padding: z.enum(['none', 'sm', 'md', 'lg']).optional(),
  elevation: z.enum(['none', 'sm', 'md', 'lg']).optional(),
  interactive: z.boolean().optional()
});

// Security sanitization utilities
class SecuritySanitizer {
  private static readonly ALLOWED_HTML_TAGS = [
    'p', 'div', 'span', 'strong', 'em', 'i', 'b', 'u', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote'
  ];

  private static readonly BLOCKED_ATTRIBUTES = [
    'onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur',
    'javascript:', 'data:', 'vbscript:', 'about:', 'mocha:'
  ];

  static sanitizeProps<T extends Record<string, any>>(
    props: T, 
    allowedProps: string[]
  ): T {
    const sanitized = {} as T;

    for (const [key, value] of Object.entries(props)) {
      // Check if prop is allowed
      if (!allowedProps.includes(key)) {
        console.warn(`Blocked disallowed prop: ${key}`);
        continue;
      }

      // Sanitize string values
      if (typeof value === 'string') {
        sanitized[key as keyof T] = this.sanitizeString(value) as T[keyof T];
      }
      // Sanitize object values recursively
      else if (typeof value === 'object' && value !== null) {
        sanitized[key as keyof T] = this.sanitizeObject(value) as T[keyof T];
      }
      // Allow primitive values
      else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key as keyof T] = value;
      }
      // Block functions and other potentially dangerous types
      else if (typeof value === 'function') {
        console.warn(`Blocked function prop: ${key}`);
        continue;
      }
      else {
        sanitized[key as keyof T] = value;
      }
    }

    return sanitized;
  }

  private static sanitizeString(value: string): string {
    // Remove potentially dangerous attributes
    let sanitized = value;
    for (const blocked of this.BLOCKED_ATTRIBUTES) {
      sanitized = sanitized.replace(new RegExp(blocked, 'gi'), '');
    }

    // Basic HTML entity encoding for script prevention
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return sanitized;
  }

  private static sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeString(value);
        } else if (typeof value === 'object') {
          sanitized[key] = this.sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }

    return obj;
  }

  static validateUrl(url: string, allowedDomains: string[] = []): boolean {
    try {
      const urlObj = new URL(url);
      
      // Block dangerous protocols
      const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
      if (!allowedProtocols.includes(urlObj.protocol)) {
        return false;
      }

      // Check domain whitelist if provided
      if (allowedDomains.length > 0) {
        const isAllowed = allowedDomains.some(domain => 
          urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
        );
        if (!isAllowed) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }
}

// Component wrapper for additional security and monitoring
const createSecureComponent = <T extends BaseComponentProps>(
  Component: React.ComponentType<T>,
  displayName: string,
  security: SecurityPolicy
) => {
  const SecureComponent = React.forwardRef<any, T>((props, ref) => {
    // Performance monitoring
    const startTime = React.useMemo(() => performance.now(), []);
    
    React.useEffect(() => {
      const renderTime = performance.now() - startTime;
      if (renderTime > 100) { // Log slow renders
        console.warn(`Slow render detected for ${displayName}: ${renderTime.toFixed(2)}ms`);
      }
    }, [startTime]);

    // Sanitize props
    const sanitizedProps = SecuritySanitizer.sanitizeProps(props, security.allowedProps);

    // Validate URLs if present
    if (security.validateUrls) {
      Object.entries(sanitizedProps).forEach(([key, value]) => {
        if (typeof value === 'string' && (key.toLowerCase().includes('url') || key.toLowerCase().includes('href'))) {
          if (!SecuritySanitizer.validateUrl(value)) {
            console.warn(`Invalid URL blocked in ${displayName}.${key}: ${value}`);
            delete sanitizedProps[key as keyof T];
          }
        }
      });
    }

    return React.createElement(Component, { ...sanitizedProps, ref });
  });

  SecureComponent.displayName = `Secure(${displayName})`;
  return SecureComponent;
};

// Component Registry Implementation
class ComponentRegistryImpl implements ComponentRegistry {
  private validators = new Map<string, z.ZodSchema>();
  private securityPolicies = new Map<string, SecurityPolicy>();

  constructor() {
    this.initializeValidators();
    this.initializeSecurityPolicies();
  }

  private initializeValidators(): void {
    this.validators.set('Button', buttonPropsSchema);
    this.validators.set('Input', inputPropsSchema);
    this.validators.set('Card', cardPropsSchema);
    // Add more validators as needed
  }

  private initializeSecurityPolicies(): void {
    // Button security policy
    this.securityPolicies.set('Button', {
      allowedProps: [
        'id', 'className', 'style', 'data-testid', 'aria-label', 'aria-describedby', 'role',
        'variant', 'size', 'disabled', 'loading', 'type', 'children'
      ],
      blockedProps: ['onClick', 'onMouseOver', 'onFocus', 'dangerouslySetInnerHTML'],
      sanitizeHtml: true,
      validateUrls: false,
      allowExternalContent: false,
      maxDataSize: 1024,
      allowedChildren: []
    });

    // Input security policy
    this.securityPolicies.set('Input', {
      allowedProps: [
        'id', 'className', 'style', 'data-testid', 'aria-label', 'aria-describedby', 'role',
        'type', 'placeholder', 'value', 'defaultValue', 'disabled', 'readonly', 'required',
        'pattern', 'minLength', 'maxLength', 'min', 'max', 'step', 'autoComplete', 'autoFocus',
        'error', 'helperText', 'label'
      ],
      blockedProps: ['onChange', 'onBlur', 'onFocus', 'dangerouslySetInnerHTML'],
      sanitizeHtml: true,
      validateUrls: false,
      allowExternalContent: false,
      maxDataSize: 1024,
      allowedChildren: []
    });

    // Card security policy
    this.securityPolicies.set('Card', {
      allowedProps: [
        'id', 'className', 'style', 'data-testid', 'aria-label', 'aria-describedby', 'role',
        'title', 'description', 'children', 'variant', 'padding', 'elevation', 'interactive'
      ],
      blockedProps: ['onClick', 'dangerouslySetInnerHTML'],
      sanitizeHtml: true,
      validateUrls: false,
      allowExternalContent: false,
      maxDataSize: 10240, // 10KB for content
      allowedChildren: ['Button', 'Input', 'Badge', 'Avatar', 'Progress', 'Separator']
    });
  }

  private createComponentMapper<T>(
    component: React.ComponentType<T>,
    validatorKey: string,
    documentation: ComponentDocumentation
  ): ComponentMapper<T> {
    const validator = this.validators.get(validatorKey);
    const securityPolicy = this.securityPolicies.get(validatorKey);

    if (!validator || !securityPolicy) {
      throw new Error(`Missing validator or security policy for component: ${validatorKey}`);
    }

    return {
      component: createSecureComponent(component, validatorKey, securityPolicy),
      validator: (props: unknown): ValidationResult<T> => {
        try {
          const result = validator.parse(props);
          return {
            valid: true,
            data: result as T,
            errors: [],
            warnings: []
          };
        } catch (error) {
          if (error instanceof z.ZodError) {
            return {
              valid: false,
              errors: error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code,
                severity: 'error' as const
              })),
              warnings: []
            };
          }
          return {
            valid: false,
            errors: [{
              message: 'Validation failed',
              code: 'VALIDATION_ERROR',
              severity: 'error' as const
            }],
            warnings: []
          };
        }
      },
      sanitizer: (props: T): T => {
        return SecuritySanitizer.sanitizeProps(props, securityPolicy.allowedProps);
      },
      security: securityPolicy,
      performance: {
        lazy: false,
        memoize: true,
        virtualize: false,
        preload: false,
        priority: 'normal',
        maxRenderTime: 100,
        memoryUsage: 'low'
      },
      accessibility: {
        requiredProps: ['aria-label'],
        ariaSupport: true,
        keyboardNavigation: true,
        screenReaderFriendly: true,
        focusManagement: true,
        highContrast: true
      },
      documentation
    };
  }

  // Component Registry Implementation
  Button = this.createComponentMapper(Button, 'Button', {
    name: 'Button',
    description: 'Interactive button component with multiple variants and states',
    category: 'Form',
    examples: [
      {
        name: 'Default Button',
        description: 'Basic button with default styling',
        code: '{ "type": "Button", "props": { "children": "Click me" } }',
        props: { children: 'Click me' }
      }
    ],
    props: [
      {
        name: 'variant',
        type: 'string',
        required: false,
        default: 'default',
        description: 'Visual style variant',
        examples: ['default', 'destructive', 'outline']
      }
    ],
    accessibility: ['Keyboard navigation', 'Screen reader support', 'Focus management'],
    browserSupport: ['Chrome 90+', 'Firefox 88+', 'Safari 14+', 'Edge 90+']
  });

  Input = this.createComponentMapper(Input, 'Input', {
    name: 'Input',
    description: 'Text input field with validation and various input types',
    category: 'Form',
    examples: [
      {
        name: 'Text Input',
        description: 'Basic text input field',
        code: '{ "type": "Input", "props": { "placeholder": "Enter text..." } }',
        props: { placeholder: 'Enter text...' }
      }
    ],
    props: [
      {
        name: 'type',
        type: 'string',
        required: false,
        default: 'text',
        description: 'HTML input type',
        examples: ['text', 'email', 'password']
      }
    ],
    accessibility: ['Label association', 'Error announcements', 'Validation feedback'],
    browserSupport: ['Chrome 90+', 'Firefox 88+', 'Safari 14+', 'Edge 90+']
  });

  Card = this.createComponentMapper(Card, 'Card', {
    name: 'Card',
    description: 'Flexible content container with header, body, and footer sections',
    category: 'Layout',
    examples: [
      {
        name: 'Basic Card',
        description: 'Simple card with title and content',
        code: '{ "type": "Card", "props": { "title": "Card Title", "children": "Card content" } }',
        props: { title: 'Card Title', children: 'Card content' }
      }
    ],
    props: [
      {
        name: 'title',
        type: 'string',
        required: false,
        description: 'Card title text'
      }
    ],
    accessibility: ['Semantic structure', 'Keyboard navigation', 'Screen reader support'],
    browserSupport: ['Chrome 90+', 'Firefox 88+', 'Safari 14+', 'Edge 90+']
  });

  // Add more components...
  Badge = this.createComponentMapper(Badge, 'Badge', {
    name: 'Badge',
    description: 'Small status or label indicator',
    category: 'Display',
    examples: [],
    props: [],
    accessibility: [],
    browserSupport: []
  });

  Alert = this.createComponentMapper(Alert, 'Alert', {
    name: 'Alert',
    description: 'Prominent notification message',
    category: 'Feedback',
    examples: [],
    props: [],
    accessibility: [],
    browserSupport: []
  });

  Avatar = this.createComponentMapper(Avatar, 'Avatar', {
    name: 'Avatar',
    description: 'User profile image with fallback',
    category: 'Display',
    examples: [],
    props: [],
    accessibility: [],
    browserSupport: []
  });

  Progress = this.createComponentMapper(Progress, 'Progress', {
    name: 'Progress',
    description: 'Visual progress indicator',
    category: 'Feedback',
    examples: [],
    props: [],
    accessibility: [],
    browserSupport: []
  });

  // Layout components
  Container = this.createComponentMapper(
    ({ children, maxWidth = 'full', padding = 'md', centered = false, ...props }) => 
      React.createElement('div', {
        ...props,
        className: `container mx-auto ${maxWidth !== 'full' ? `max-w-${maxWidth}` : ''} ${padding !== 'none' ? `p-${padding}` : ''} ${centered ? 'flex items-center justify-center' : ''}`,
        children
      }),
    'Container',
    {
      name: 'Container',
      description: 'Layout container with responsive width and padding',
      category: 'Layout',
      examples: [],
      props: [],
      accessibility: [],
      browserSupport: []
    }
  );

  Separator = this.createComponentMapper(Separator, 'Separator', {
    name: 'Separator',
    description: 'Visual divider between content sections',
    category: 'Layout',
    examples: [],
    props: [],
    accessibility: [],
    browserSupport: []
  });

  // Add all other shadcn/ui components following the same pattern...
  // This is a foundation that can be extended with all remaining components

  // Method to validate component existence
  hasComponent(type: string): boolean {
    return type in this;
  }

  // Method to get component documentation
  getComponentDocs(type: string): ComponentDocumentation | null {
    const mapper = (this as any)[type] as ComponentMapper<any>;
    return mapper?.documentation || null;
  }

  // Method to validate component spec
  validateComponentSpec(type: string, props: unknown): ValidationResult {
    const mapper = (this as any)[type] as ComponentMapper<any>;
    if (!mapper) {
      return {
        valid: false,
        errors: [{
          message: `Unknown component type: ${type}`,
          code: 'UNKNOWN_COMPONENT',
          severity: 'error'
        }],
        warnings: []
      };
    }

    return mapper.validator(props);
  }

  // Method to get security policy
  getSecurityPolicy(type: string): SecurityPolicy | null {
    const mapper = (this as any)[type] as ComponentMapper<any>;
    return mapper?.security || null;
  }
}

// Singleton instance
export const componentRegistry = new ComponentRegistryImpl();

// Export for use in dynamic page rendering
export default componentRegistry;