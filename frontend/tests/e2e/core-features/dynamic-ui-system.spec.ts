import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:5173';

test.describe('Dynamic UI System - Template Rendering', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('1. Dashboard template renders correctly', async ({ page }) => {
    // Fetch dashboard template
    const response = await page.request.get(`${BASE_URL}/api/dynamic-ui/templates/dashboard`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.template.metadata.id).toBe('dashboard-v1');
    expect(data.template.metadata.name).toBe('Dashboard');
    expect(data.template.components).toContain('header');
    expect(data.template.components).toContain('Grid');
    expect(data.template.components).toContain('stat');
    expect(data.template.components).toContain('dataTable');

    // Verify layout structure
    expect(data.template.layout).toBeDefined();
    expect(data.template.layout.length).toBeGreaterThan(0);

    // Take screenshot of template data structure
    console.log('Dashboard Template:', JSON.stringify(data.template.metadata, null, 2));
  });

  test('2. Todo Manager template renders correctly', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/dynamic-ui/templates/todoManager`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.template.metadata.id).toBe('todo-manager-v1');
    expect(data.template.metadata.name).toBe('Todo List Manager');
    expect(data.template.components).toContain('header');
    expect(data.template.components).toContain('todoList');
    expect(data.template.components).toContain('stat');

    // Verify variables
    expect(data.template.variables).toHaveProperty('title');
    expect(data.template.variables).toHaveProperty('totalTasks');
    expect(data.template.variables).toHaveProperty('completedTasks');
  });

  test('3. Timeline template renders correctly', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/dynamic-ui/templates/timeline`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.template.metadata.id).toBe('timeline-v1');
    expect(data.template.metadata.name).toBe('Timeline');
    expect(data.template.components).toContain('header');
    expect(data.template.components).toContain('timeline');

    // Verify layout configuration
    const timelineComponent = data.template.layout.find((c: any) => c.type === 'timeline');
    expect(timelineComponent).toBeDefined();
    expect(timelineComponent.config.orientation).toBe('vertical');
  });

  test('4. Form Page template renders correctly', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/dynamic-ui/templates/formPage`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.template.metadata.id).toBe('form-page-v1');
    expect(data.template.metadata.name).toBe('Form Page');
    expect(data.template.components).toContain('header');
    expect(data.template.components).toContain('form');

    // Verify form fields in variables
    expect(data.template.variables.fields).toBeDefined();
    expect(Array.isArray(data.template.variables.fields)).toBe(true);
    expect(data.template.variables.fields.length).toBeGreaterThan(0);
  });

  test('5. Analytics Dashboard template renders correctly', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/dynamic-ui/templates/analytics`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.template.metadata.id).toBe('analytics-v1');
    expect(data.template.metadata.name).toBe('Analytics Dashboard');
    expect(data.template.components).toContain('header');
    expect(data.template.components).toContain('Grid');
    expect(data.template.components).toContain('stat');
    expect(data.template.components).toContain('tabs');
    expect(data.template.components).toContain('dataTable');

    // Verify KPI variables
    expect(data.template.variables).toHaveProperty('kpi1_label');
    expect(data.template.variables).toHaveProperty('kpi1_value');
    expect(data.template.variables).toHaveProperty('kpi2_label');
    expect(data.template.variables).toHaveProperty('kpi3_label');
    expect(data.template.variables).toHaveProperty('kpi4_label');
  });
});

test.describe('Dynamic UI System - Template Instantiation', () => {
  test('6. Template instantiation works with valid variables', async ({ page }) => {
    const variables = {
      title: 'Sales Dashboard',
      subtitle: 'Q4 2025 Performance',
      metric1_label: 'Revenue',
      metric1_value: '$125,000',
      metric1_change: '+15%',
      metric1_icon: '💰',
      metric2_label: 'Customers',
      metric2_value: '1,250',
      metric2_change: '+8%',
      metric2_icon: '👥',
      metric3_label: 'Orders',
      metric3_value: '3,450',
      metric3_change: '+12%',
      metric3_icon: '📦'
    };

    const response = await page.request.post(`${BASE_URL}/api/dynamic-ui/templates/dashboard/instantiate`, {
      data: { variables }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.page).toBeDefined();

    // Verify that variables were replaced in layout
    const headerComponent = data.page.layout.find((c: any) => c.id === 'header');
    expect(headerComponent).toBeDefined();
    expect(headerComponent.config.title).toBe('Sales Dashboard');
    expect(headerComponent.config.subtitle).toBe('Q4 2025 Performance');

    const metric1Component = data.page.layout.find((c: any) => c.id === 'metric-1');
    expect(metric1Component.config.label).toBe('Revenue');
    expect(metric1Component.config.value).toBe('$125,000');
    expect(metric1Component.config.change).toBe('+15%');
  });

  test('7. Template instantiation works without variables (uses defaults)', async ({ page }) => {
    const response = await page.request.post(`${BASE_URL}/api/dynamic-ui/templates/todoManager/instantiate`, {
      data: { variables: {} }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.page).toBeDefined();

    // Should use default variables
    const headerComponent = data.page.layout.find((c: any) => c.id === 'header');
    expect(headerComponent).toBeDefined();
  });

  test('8. Template instantiation fails with invalid template ID', async ({ page }) => {
    const response = await page.request.post(`${BASE_URL}/api/dynamic-ui/templates/nonexistent/instantiate`, {
      data: { variables: {} }
    });

    expect(response.status()).toBe(404);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe('Template not found');
  });
});

test.describe('Dynamic UI System - Component Catalog API', () => {
  test('9. Component catalog loads and displays all components', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/components/catalog`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.components).toBeDefined();
    expect(Array.isArray(data.components)).toBe(true);
    expect(data.totalComponents).toBeGreaterThan(0);

    // Verify essential components exist
    const componentTypes = data.components.map((c: any) => c.type);
    expect(componentTypes).toContain('Button');
    expect(componentTypes).toContain('Card');
    expect(componentTypes).toContain('Badge');
    expect(componentTypes).toContain('Grid');

    // Verify component structure
    const buttonComponent = data.components.find((c: any) => c.type === 'Button');
    expect(buttonComponent.name).toBeDefined();
    expect(buttonComponent.category).toBeDefined();
    expect(buttonComponent.schema).toBeDefined();
    expect(buttonComponent.examples).toBeDefined();
    expect(Array.isArray(buttonComponent.examples)).toBe(true);
  });

  test('10. Search specific component type works', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/components/catalog/Button`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.component.type).toBe('Button');
    expect(data.component.name).toBe('Button');
    expect(data.component.category).toBeDefined();
    expect(data.component.schema).toBeDefined();

    // Verify schema structure
    expect(data.component.schema).toHaveProperty('$ref');
    expect(data.component.examples).toBeDefined();
    expect(Array.isArray(data.component.examples)).toBe(true);
  });

  test('11. Category filtering works', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/components/catalog`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.components).toBeDefined();

    // Verify categories exist in components
    const categories = [...new Set(data.components.map((c: any) => c.category))];
    expect(categories.length).toBeGreaterThan(0);

    // Verify each category has at least one component
    categories.forEach((category: any) => {
      const componentsInCategory = data.components.filter((c: any) => c.category === category);
      expect(componentsInCategory.length).toBeGreaterThan(0);
    });
  });

  test('12. Invalid component type returns 404', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/components/catalog/NonExistentComponent`);
    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Component not found');
  });
});

test.describe('Dynamic UI System - Template Listing', () => {
  test('13. Get all templates returns complete list', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/dynamic-ui/templates`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.templates).toBeDefined();
    expect(Array.isArray(data.templates)).toBe(true);
    expect(data.total).toBe(5); // dashboard, todoManager, timeline, formPage, analytics

    // Verify all expected templates exist
    const templateIds = data.templates.map((t: any) => t.id);
    expect(templateIds).toContain('dashboard-v1');
    expect(templateIds).toContain('todo-manager-v1');
    expect(templateIds).toContain('timeline-v1');
    expect(templateIds).toContain('form-page-v1');
    expect(templateIds).toContain('analytics-v1');
  });

  test('14. Filter templates by category', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/dynamic-ui/templates?category=dashboard`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.templates.length).toBeGreaterThan(0);

    // All returned templates should be in dashboard category
    data.templates.forEach((template: any) => {
      expect(template.category).toBe('dashboard');
    });
  });

  test('15. Filter templates by tags', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/dynamic-ui/templates?tags=analytics`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.templates.length).toBeGreaterThan(0);

    // All returned templates should have 'analytics' tag
    data.templates.forEach((template: any) => {
      expect(template.tags).toContain('analytics');
    });
  });
});

test.describe('Dynamic UI System - Component Schema Validation', () => {
  test('16. Button component schema is properly defined', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/components/catalog/Button`);
    const data = await response.json();

    expect(data.component.schema).toBeDefined();
    expect(data.component.schema.definitions.Button).toBeDefined();

    const buttonDef = data.component.schema.definitions.Button;
    expect(buttonDef.properties.variant).toBeDefined();
    expect(buttonDef.properties.variant.enum).toContain('default');
    expect(buttonDef.properties.variant.enum).toContain('destructive');
    expect(buttonDef.properties.variant.enum).toContain('outline');
    expect(buttonDef.properties.variant.enum).toContain('secondary');

    expect(buttonDef.properties.children).toBeDefined();
    expect(buttonDef.required).toContain('children');
  });

  test('17. Card component schema is properly defined', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/components/catalog/Card`);
    const data = await response.json();

    expect(data.component.schema).toBeDefined();
    expect(data.component.schema.definitions.Card).toBeDefined();

    const cardDef = data.component.schema.definitions.Card;
    expect(cardDef.properties.title).toBeDefined();
    expect(cardDef.properties.title.type).toBe('string');

    // Verify Card has examples
    expect(data.component.examples).toBeDefined();
    expect(data.component.examples.length).toBeGreaterThan(0);
  });
});
