# Chart Components Usage Guide

This guide demonstrates how to use LineChart, BarChart, and PieChart components in the DynamicPageRenderer.

## Overview

The chart components are now registered in the DynamicPageRenderer and can be used by the page-builder-agent. Each component has:
- Full Zod schema validation
- Support for customization (colors, titles, legends, tooltips)
- Error handling for empty/invalid data
- TypeScript type safety

## Component Schemas

### 1. LineChart

**Use Case**: Time series data, trends over time, continuous data visualization

**Schema**:
```typescript
{
  type: "LineChart",
  props: {
    data: [
      {
        timestamp: string,      // ISO date or label
        value: number,          // Numeric value
        label?: string,         // Optional label override
        metadata?: object       // Optional metadata
      }
    ],
    config: {
      title: string,            // Required chart title
      xAxis?: string,           // Default: "Time"
      yAxis?: string,           // Default: "Value"
      colors?: string[],        // Default: ['#3B82F6']
      showGrid?: boolean,       // Default: true
      showLegend?: boolean      // Default: false
    },
    height?: number,            // Default: 300 (min: 100, max: 1000)
    showTrend?: boolean,        // Default: false - shows trend indicator
    gradient?: boolean,         // Default: false - fills area under line
    className?: string
  }
}
```

**Example Usage**:
```json
{
  "type": "LineChart",
  "props": {
    "data": [
      { "timestamp": "2025-01-01", "value": 100, "label": "Jan" },
      { "timestamp": "2025-02-01", "value": 150, "label": "Feb" },
      { "timestamp": "2025-03-01", "value": 120, "label": "Mar" },
      { "timestamp": "2025-04-01", "value": 180, "label": "Apr" },
      { "timestamp": "2025-05-01", "value": 200, "label": "May" }
    ],
    "config": {
      "title": "Monthly Revenue Growth",
      "xAxis": "Month",
      "yAxis": "Revenue ($)",
      "colors": ["#10B981"],
      "showGrid": true
    },
    "height": 400,
    "showTrend": true,
    "gradient": true
  }
}
```

**Advanced Example with Metadata**:
```json
{
  "type": "LineChart",
  "props": {
    "data": [
      {
        "timestamp": "2025-10-01T00:00:00Z",
        "value": 1250,
        "label": "Week 1",
        "metadata": { "users": 42, "conversions": 15 }
      },
      {
        "timestamp": "2025-10-08T00:00:00Z",
        "value": 1780,
        "label": "Week 2",
        "metadata": { "users": 58, "conversions": 22 }
      }
    ],
    "config": {
      "title": "User Engagement Metrics",
      "xAxis": "Week",
      "yAxis": "Active Users",
      "colors": ["#3B82F6"],
      "showGrid": true
    },
    "showTrend": true,
    "gradient": false
  }
}
```

---

### 2. BarChart

**Use Case**: Categorical data comparison, rankings, discrete values

**Schema**:
```typescript
{
  type: "BarChart",
  props: {
    data: [
      {
        timestamp: string,      // Can be category name
        value: number,
        label?: string,
        metadata?: object
      }
    ],
    config: {
      title: string,            // Required
      xAxis?: string,           // Default: "Category"
      yAxis?: string,           // Default: "Value"
      colors?: string[],        // Default: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
      showGrid?: boolean,       // Default: true
      showLegend?: boolean      // Default: true
    },
    height?: number,            // Default: 300
    showValues?: boolean,       // Default: false - shows value labels
    horizontal?: boolean,       // Default: false - vertical bars
    className?: string
  }
}
```

**Example Usage - Vertical Bars**:
```json
{
  "type": "BarChart",
  "props": {
    "data": [
      { "timestamp": "product-a", "value": 450, "label": "Product A" },
      { "timestamp": "product-b", "value": 320, "label": "Product B" },
      { "timestamp": "product-c", "value": 580, "label": "Product C" },
      { "timestamp": "product-d", "value": 210, "label": "Product D" }
    ],
    "config": {
      "title": "Product Sales Comparison",
      "xAxis": "Products",
      "yAxis": "Units Sold",
      "colors": ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"],
      "showGrid": true,
      "showLegend": true
    },
    "height": 350,
    "showValues": true,
    "horizontal": false
  }
}
```

**Example Usage - Horizontal Bars**:
```json
{
  "type": "BarChart",
  "props": {
    "data": [
      { "timestamp": "team-a", "value": 95, "label": "Team Alpha" },
      { "timestamp": "team-b", "value": 87, "label": "Team Beta" },
      { "timestamp": "team-c", "value": 92, "label": "Team Gamma" },
      { "timestamp": "team-d", "value": 78, "label": "Team Delta" }
    ],
    "config": {
      "title": "Team Performance Scores",
      "xAxis": "Score",
      "yAxis": "Teams",
      "colors": ["#8B5CF6", "#EC4899", "#14B8A6", "#F97316"],
      "showGrid": true,
      "showLegend": false
    },
    "height": 300,
    "showValues": true,
    "horizontal": true
  }
}
```

---

### 3. PieChart

**Use Case**: Proportional data, market share, distribution percentages

**Schema**:
```typescript
{
  type: "PieChart",
  props: {
    data: [
      {
        timestamp: string,
        value: number,          // Must be >= 0
        label?: string,
        metadata?: object
      }
    ],
    config: {
      title: string,            // Required
      xAxis?: string,           // Default: ""
      yAxis?: string,           // Default: ""
      colors?: string[],        // Default: 8 colors
      showGrid?: boolean,       // Default: false
      showLegend?: boolean      // Default: true
    },
    height?: number,            // Default: 300
    donut?: boolean,            // Default: false - creates donut chart
    showTotal?: boolean,        // Default: false - shows total in center/header
    className?: string
  }
}
```

**Example Usage - Basic Pie Chart**:
```json
{
  "type": "PieChart",
  "props": {
    "data": [
      { "timestamp": "chrome", "value": 6500, "label": "Chrome" },
      { "timestamp": "firefox", "value": 1800, "label": "Firefox" },
      { "timestamp": "safari", "value": 2200, "label": "Safari" },
      { "timestamp": "edge", "value": 1200, "label": "Edge" },
      { "timestamp": "other", "value": 300, "label": "Other" }
    ],
    "config": {
      "title": "Browser Market Share",
      "colors": ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"],
      "showLegend": true
    },
    "height": 400,
    "donut": false,
    "showTotal": true
  }
}
```

**Example Usage - Donut Chart**:
```json
{
  "type": "PieChart",
  "props": {
    "data": [
      { "timestamp": "mobile", "value": 45000, "label": "Mobile" },
      { "timestamp": "desktop", "value": 35000, "label": "Desktop" },
      { "timestamp": "tablet", "value": 15000, "label": "Tablet" },
      { "timestamp": "other", "value": 5000, "label": "Other" }
    ],
    "config": {
      "title": "Traffic Sources",
      "colors": ["#EC4899", "#3B82F6", "#10B981", "#F59E0B"],
      "showLegend": true
    },
    "height": 350,
    "donut": true,
    "showTotal": true
  }
}
```

---

## Complete Page Example

Here's a complete page specification using all three chart types:

```json
{
  "id": "analytics-dashboard",
  "agentId": "analytics-agent",
  "title": "Analytics Dashboard",
  "version": 1,
  "layout": "single-column",
  "status": "published",
  "specification": {
    "components": [
      {
        "type": "header",
        "props": {
          "title": "Analytics Dashboard",
          "level": 1,
          "subtitle": "Real-time insights and performance metrics"
        }
      },
      {
        "type": "Grid",
        "props": {
          "cols": 2,
          "gap": 6
        },
        "children": [
          {
            "type": "LineChart",
            "props": {
              "data": [
                { "timestamp": "2025-10-01", "value": 1200, "label": "Oct 1" },
                { "timestamp": "2025-10-02", "value": 1350, "label": "Oct 2" },
                { "timestamp": "2025-10-03", "value": 1180, "label": "Oct 3" },
                { "timestamp": "2025-10-04", "value": 1520, "label": "Oct 4" },
                { "timestamp": "2025-10-05", "value": 1680, "label": "Oct 5" },
                { "timestamp": "2025-10-06", "value": 1750, "label": "Oct 6" },
                { "timestamp": "2025-10-07", "value": 1920, "label": "Oct 7" }
              ],
              "config": {
                "title": "Daily Active Users",
                "xAxis": "Date",
                "yAxis": "Users",
                "colors": ["#3B82F6"],
                "showGrid": true
              },
              "height": 300,
              "showTrend": true,
              "gradient": true
            }
          },
          {
            "type": "BarChart",
            "props": {
              "data": [
                { "timestamp": "feature-a", "value": 450, "label": "Feature A" },
                { "timestamp": "feature-b", "value": 320, "label": "Feature B" },
                { "timestamp": "feature-c", "value": 580, "label": "Feature C" },
                { "timestamp": "feature-d", "value": 210, "label": "Feature D" },
                { "timestamp": "feature-e", "value": 390, "label": "Feature E" }
              ],
              "config": {
                "title": "Feature Adoption",
                "xAxis": "Features",
                "yAxis": "Adoptions",
                "colors": ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"],
                "showGrid": true,
                "showLegend": true
              },
              "height": 300,
              "showValues": true
            }
          }
        ]
      },
      {
        "type": "PieChart",
        "props": {
          "data": [
            { "timestamp": "free", "value": 12000, "label": "Free Plan" },
            { "timestamp": "basic", "value": 8500, "label": "Basic Plan" },
            { "timestamp": "pro", "value": 4200, "label": "Pro Plan" },
            { "timestamp": "enterprise", "value": 1300, "label": "Enterprise" }
          ],
          "config": {
            "title": "Customer Distribution by Plan",
            "colors": ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"],
            "showLegend": true
          },
          "height": 400,
          "donut": true,
          "showTotal": true
        }
      }
    ]
  },
  "metadata": {
    "description": "Comprehensive analytics dashboard with multiple chart types",
    "tags": ["analytics", "charts", "dashboard"]
  }
}
```

---

## Validation & Error Handling

### Valid Data Requirements

1. **Data Array**: Must have at least 1 data point
2. **Config.title**: Required, must be non-empty string
3. **Values**: Must be numbers (PieChart requires non-negative)
4. **Height**: If specified, must be between 100-1000px

### Empty Data Handling

All charts gracefully handle empty data:
```json
{
  "type": "LineChart",
  "props": {
    "data": [],
    "config": { "title": "No Data Chart" }
  }
}
```
This will display: "No data available" message with the chart title.

### Invalid Data Examples

**Missing Required Title**:
```json
{
  "type": "LineChart",
  "props": {
    "data": [{ "timestamp": "2025-10-01", "value": 100 }],
    "config": {}  // ❌ Missing title
  }
}
```
Error: "Title is required"

**Empty Data Array**:
```json
{
  "type": "BarChart",
  "props": {
    "data": [],  // ❌ No data points
    "config": { "title": "Sales Chart" }
  }
}
```
Error: "At least one data point is required"

**Negative Value in PieChart**:
```json
{
  "type": "PieChart",
  "props": {
    "data": [
      { "timestamp": "a", "value": 100 },
      { "timestamp": "b", "value": -50 }  // ❌ Negative value
    ],
    "config": { "title": "Distribution" }
  }
}
```
Error: "Value must be non-negative"

**Invalid Height**:
```json
{
  "type": "LineChart",
  "props": {
    "data": [{ "timestamp": "2025-10-01", "value": 100 }],
    "config": { "title": "Chart" },
    "height": 50  // ❌ Below minimum
  }
}
```
Error: "Height must be between 100-1000"

---

## Best Practices

### 1. Data Preparation
- Ensure consistent timestamp formats
- Provide meaningful labels for better UX
- Include metadata for richer tooltips

### 2. Color Selection
- Use brand colors for consistency
- Ensure sufficient contrast for accessibility
- Limit to 5-8 colors for clarity

### 3. Chart Choice
- **LineChart**: Trends, time series, continuous data
- **BarChart**: Comparisons, rankings, categorical data
- **PieChart**: Proportions, percentages, parts of whole

### 4. Performance
- Keep data points under 100 for smooth rendering
- Use appropriate height based on data density
- Consider horizontal BarChart for many categories

### 5. Accessibility
- Always provide descriptive titles
- Use labels instead of relying only on colors
- Enable showGrid for easier value reading

---

## Integration with DynamicPageRenderer

The charts are fully integrated with:
- ✅ Zod schema validation
- ✅ Error boundaries and graceful degradation
- ✅ TypeScript type safety
- ✅ Responsive layouts (Grid, Card wrappers)
- ✅ Consistent styling with existing components

Page-builder-agent can use these charts by including them in the `specification.components` array as shown in the examples above.
