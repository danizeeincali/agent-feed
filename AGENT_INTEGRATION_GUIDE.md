# Agent Integration Guide: Dynamic UI System

## Quick Start

Integrate dynamic, validated UI components into your agent workflows in 4 simple steps:

### Step 1: Discover Available Components

```bash
curl http://localhost:3001/api/components/catalog
```

Browse the complete component library with schemas, examples, and validation rules.

### Step 2: Choose a Template

```bash
curl http://localhost:3001/api/dynamic-ui/templates
```

Available templates:
- **Dashboard** (`dashboard`) - Metrics and data visualization
- **Todo Manager** (`todoManager`) - Task management interface
- **Timeline** (`timeline`) - Chronological event display
- **Form Page** (`formPage`) - Data collection with validation
- **Analytics Dashboard** (`analytics`) - Comprehensive KPI view

### Step 3: Instantiate with Your Data

```bash
curl -X POST http://localhost:3001/api/dynamic-ui/templates/dashboard/instantiate \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "title": "Sales Dashboard",
      "subtitle": "Q4 2025 Performance",
      "metric1_label": "Revenue",
      "metric1_value": "$125,000",
      "metric1_change": "+15%"
    }
  }'
```

### Step 4: Render or Create Page

Use the returned page specification to:
- Render directly in your agent's UI
- Store as a dynamic page
- Modify and extend with additional components

---

## Validation System

### What Happens When Validation Fails?

The Dynamic UI System uses **Zod schemas** for runtime validation. When validation fails:

1. **API Returns Error Response**
   ```json
   {
     "success": false,
     "error": "Validation failed",
     "details": {
       "field": "props.variant",
       "message": "Invalid enum value. Expected 'default' | 'destructive' | 'outline' | 'secondary', received 'invalid'"
     }
   }
   ```

2. **Frontend Displays ValidationError Component**
   - Shows the component type
   - Lists all validation errors with field paths
   - Provides helpful tips linking to `/api/components/catalog`

3. **Security Sanitization Applied**
   - Potentially dangerous props are blocked
   - String values are HTML-escaped
   - URLs are validated against allowed domains

### Validation Workflow

```
Agent Spec → Schema Validation → Security Check → Sanitization → Render
              ↓ FAIL                ↓ FAIL          ↓ PASS
         Error Response      Block/Warn      Safe Component
```

---

## Component Reference

Get detailed information about any component:

```bash
# Get specific component
curl http://localhost:3001/api/components/catalog/Button

# Response includes:
# - name, category, description
# - JSON Schema for props validation
# - Examples with valid prop combinations
# - Required vs optional properties
```

### Component Categories

View components by category:

```bash
curl http://localhost:3001/api/components/catalog
```

Categories:
- **Interactive**: Button, etc.
- **Typography**: header, etc.
- **Layout**: Grid, Card, etc.
- **Data**: dataTable, list, etc.
- **Form**: Input fields, form containers
- **Feedback**: Alerts, notifications

---

## Template Usage Examples

### Dashboard Template

```typescript
const response = await fetch('http://localhost:3001/api/dynamic-ui/templates/dashboard/instantiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    variables: {
      title: 'Team Performance',
      subtitle: 'Real-time metrics',
      metric1_label: 'Active Projects',
      metric1_value: '12',
      metric1_change: '+3',
      metric1_icon: '📊',
      metric2_label: 'Team Members',
      metric2_value: '45',
      metric2_change: '+5',
      metric2_icon: '👥',
      metric3_label: 'Completion Rate',
      metric3_value: '94%',
      metric3_change: '+2%',
      metric3_icon: '✅'
    }
  })
});

const { page } = await response.json();
// Use page.layout to render components
```

### Todo Manager Template

```typescript
const response = await fetch('http://localhost:3001/api/dynamic-ui/templates/todoManager/instantiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    variables: {
      title: 'Sprint Tasks',
      totalTasks: 24,
      completedTasks: 18
    }
  })
});
```

### Timeline Template

```typescript
const response = await fetch('http://localhost:3001/api/dynamic-ui/templates/timeline/instantiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    variables: {
      title: 'Project Milestones',
      subtitle: 'Key achievements and upcoming goals'
    }
  })
});
```

### Form Page Template

```typescript
const response = await fetch('http://localhost:3001/api/dynamic-ui/templates/formPage/instantiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    variables: {
      title: 'Feedback Form',
      subtitle: 'Help us improve',
      fields: [
        { label: 'Name', type: 'text', required: true },
        { label: 'Email', type: 'email', required: true },
        { label: 'Rating', type: 'number', required: false },
        { label: 'Comments', type: 'textarea', required: true }
      ],
      submitLabel: 'Send Feedback'
    }
  })
});
```

### Analytics Dashboard Template

```typescript
const response = await fetch('http://localhost:3001/api/dynamic-ui/templates/analytics/instantiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    variables: {
      title: 'Business Analytics',
      subtitle: 'Q4 2025 Performance Overview',
      kpi1_label: 'Revenue',
      kpi1_value: '$2.4M',
      kpi1_change: '+18%',
      kpi1_icon: '💰',
      kpi2_label: 'Customers',
      kpi2_value: '12,450',
      kpi2_change: '+22%',
      kpi2_icon: '👥',
      kpi3_label: 'Conversion',
      kpi3_value: '3.8%',
      kpi3_change: '+0.5%',
      kpi3_icon: '📈',
      kpi4_label: 'Avg Order',
      kpi4_value: '$193',
      kpi4_change: '+$12',
      kpi4_icon: '💳'
    }
  })
});
```

---

## Troubleshooting

### Common Errors

#### 1. Template Not Found
```json
{
  "success": false,
  "error": "Template not found",
  "message": "No template found with id: invalidTemplate"
}
```
**Solution**: Use `/api/dynamic-ui/templates` to list available template IDs.

#### 2. Component Not Found
```json
{
  "success": false,
  "error": "Component not found",
  "message": "Component type \"InvalidComponent\" does not exist"
}
```
**Solution**: Check `/api/components/catalog` for valid component types.

#### 3. Invalid Props
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "field": "props.variant",
    "message": "Invalid enum value"
  }
}
```
**Solution**: Check component schema at `/api/components/catalog/:componentType` for valid prop values.

#### 4. Missing Required Props
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "field": "props.children",
    "message": "Required"
  }
}
```
**Solution**: Review component's `required` array in schema.

---

## Best Practices

### When to Use Templates

**Use templates when:**
- Building standard UI patterns (dashboards, forms, timelines)
- Rapid prototyping agent interfaces
- Ensuring consistent UX across agents
- Leveraging pre-validated component compositions

**Use custom layouts when:**
- Building highly specialized visualizations
- Requiring unique component arrangements
- Needing fine-grained control over interactions
- Implementing novel UI patterns

### Template Customization

Templates are starting points. After instantiation:

1. **Extend the layout** - Add additional components
2. **Modify component props** - Adjust styling, behavior
3. **Add interactions** - Wire up event handlers
4. **Integrate data bindings** - Connect to live data sources

### Security Considerations

- **Never trust user input** - All data passes through validation
- **Use allowed domains** - Specify `allowedDomains` in security config
- **Sanitize HTML** - System automatically escapes HTML entities
- **Review blocked props** - Check security policy for each component
- **Monitor violations** - Security violations are logged and returned

### Performance Optimization

- **Use lazy loading** - For components below the fold
- **Implement virtualization** - For large lists (>100 items)
- **Minimize nesting** - Keep component depth < 10 levels
- **Batch API calls** - Fetch multiple templates in parallel
- **Cache responses** - Template structures rarely change

---

## API Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/dynamic-ui/templates` | GET | List all templates |
| `/api/dynamic-ui/templates/:id` | GET | Get specific template |
| `/api/dynamic-ui/templates/:id/instantiate` | POST | Fill template with data |
| `/api/components/catalog` | GET | List all components |
| `/api/components/catalog/:type` | GET | Get component schema |

For detailed API documentation, see [API_REFERENCE.md](./API_REFERENCE.md).

---

## Next Steps

1. **Explore Templates** - Browse `/api/dynamic-ui/templates` to see what's available
2. **Try Instantiation** - Use the examples above to create your first dynamic page
3. **Review Components** - Check `/api/components/catalog` to understand component capabilities
4. **Build Custom Pages** - Combine templates and custom components for unique experiences
5. **Integrate with Agents** - Connect templates to your agent workflows

For component library details, see [COMPONENT_LIBRARY_DOCUMENTATION.md](./COMPONENT_LIBRARY_DOCUMENTATION.md).
