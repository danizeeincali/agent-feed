# Chart Components Quick Reference

Quick copy-paste examples for LineChart, BarChart, and PieChart.

## LineChart - Basic

```json
{
  "type": "LineChart",
  "props": {
    "data": [
      { "timestamp": "2025-10-01", "value": 100, "label": "Day 1" },
      { "timestamp": "2025-10-02", "value": 150, "label": "Day 2" },
      { "timestamp": "2025-10-03", "value": 120, "label": "Day 3" },
      { "timestamp": "2025-10-04", "value": 180, "label": "Day 4" }
    ],
    "config": {
      "title": "Daily Activity",
      "xAxis": "Date",
      "yAxis": "Count"
    }
  }
}
```

## LineChart - With Trend & Gradient

```json
{
  "type": "LineChart",
  "props": {
    "data": [
      { "timestamp": "2025-01", "value": 1200, "label": "Jan" },
      { "timestamp": "2025-02", "value": 1500, "label": "Feb" },
      { "timestamp": "2025-03", "value": 1800, "label": "Mar" }
    ],
    "config": {
      "title": "Monthly Growth",
      "colors": ["#10B981"],
      "showGrid": true
    },
    "height": 400,
    "showTrend": true,
    "gradient": true
  }
}
```

## BarChart - Vertical

```json
{
  "type": "BarChart",
  "props": {
    "data": [
      { "timestamp": "cat-a", "value": 450, "label": "Category A" },
      { "timestamp": "cat-b", "value": 320, "label": "Category B" },
      { "timestamp": "cat-c", "value": 580, "label": "Category C" }
    ],
    "config": {
      "title": "Sales by Category",
      "xAxis": "Categories",
      "yAxis": "Sales"
    },
    "showValues": true
  }
}
```

## BarChart - Horizontal

```json
{
  "type": "BarChart",
  "props": {
    "data": [
      { "timestamp": "team-1", "value": 95, "label": "Team Alpha" },
      { "timestamp": "team-2", "value": 87, "label": "Team Beta" },
      { "timestamp": "team-3", "value": 92, "label": "Team Gamma" }
    ],
    "config": {
      "title": "Team Scores"
    },
    "horizontal": true,
    "showValues": true
  }
}
```

## PieChart - Basic

```json
{
  "type": "PieChart",
  "props": {
    "data": [
      { "timestamp": "seg-1", "value": 45, "label": "Segment 1" },
      { "timestamp": "seg-2", "value": 30, "label": "Segment 2" },
      { "timestamp": "seg-3", "value": 25, "label": "Segment 3" }
    ],
    "config": {
      "title": "Market Share"
    }
  }
}
```

## PieChart - Donut with Total

```json
{
  "type": "PieChart",
  "props": {
    "data": [
      { "timestamp": "mobile", "value": 6000, "label": "Mobile" },
      { "timestamp": "desktop", "value": 4000, "label": "Desktop" }
    ],
    "config": {
      "title": "Traffic Sources",
      "colors": ["#3B82F6", "#10B981"]
    },
    "donut": true,
    "showTotal": true,
    "height": 400
  }
}
```

## Complete Dashboard Example

```json
{
  "specification": {
    "components": [
      {
        "type": "header",
        "props": { "title": "Analytics", "level": 1 }
      },
      {
        "type": "Grid",
        "props": { "cols": 2 },
        "children": [
          {
            "type": "LineChart",
            "props": {
              "data": [
                { "timestamp": "2025-10-01", "value": 1200 },
                { "timestamp": "2025-10-02", "value": 1500 }
              ],
              "config": { "title": "Users" },
              "showTrend": true,
              "gradient": true
            }
          },
          {
            "type": "BarChart",
            "props": {
              "data": [
                { "timestamp": "a", "value": 450, "label": "A" },
                { "timestamp": "b", "value": 320, "label": "B" }
              ],
              "config": { "title": "Sales" },
              "showValues": true
            }
          }
        ]
      },
      {
        "type": "PieChart",
        "props": {
          "data": [
            { "timestamp": "free", "value": 60, "label": "Free" },
            { "timestamp": "paid", "value": 40, "label": "Paid" }
          ],
          "config": { "title": "Plans" },
          "donut": true
        }
      }
    ]
  }
}
```

## Common Props

### All Charts
- `data`: Array of `{ timestamp, value, label?, metadata? }`
- `config.title`: Required string
- `config.colors`: Array of hex colors (optional)
- `config.showGrid`: Boolean (optional)
- `config.showLegend`: Boolean (optional)
- `height`: Number 100-1000 (optional, default 300)
- `className`: String (optional)

### LineChart Specific
- `showTrend`: Boolean - Shows ↗/↘ indicator
- `gradient`: Boolean - Fills area under line

### BarChart Specific
- `showValues`: Boolean - Shows numbers on bars
- `horizontal`: Boolean - Horizontal vs vertical

### PieChart Specific
- `donut`: Boolean - Donut vs pie chart
- `showTotal`: Boolean - Shows total in center/header

## Default Colors

**LineChart**: `['#3B82F6']` (blue)

**BarChart**: `['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']`

**PieChart**: `['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']`

## Validation Rules

- `data`: Minimum 1 item
- `config.title`: Required, non-empty
- `value`: Must be number (non-negative for PieChart)
- `height`: 100-1000 if specified
- `colors`: Minimum 1 color if specified

## Error Messages

| Error | Cause |
|-------|-------|
| "Title is required" | Missing or empty config.title |
| "At least one data point is required" | Empty data array |
| "Value must be non-negative" | Negative value in PieChart |
| "Height must be between 100-1000" | Invalid height value |

## For More Details

- **Full Documentation**: `/src/examples/chart-components-usage.md`
- **Test Examples**: `/src/examples/chart-components-test.ts`
- **Implementation**: `/src/components/charts/README.md`
