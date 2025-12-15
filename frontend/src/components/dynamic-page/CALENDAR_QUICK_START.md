# Calendar Component - Quick Start Guide

## 🚀 5-Minute Integration Guide

### Step 1: Import the Component

```tsx
import { Calendar } from '@/components/dynamic-page';
```

### Step 2: Basic Usage

```tsx
// Single date selection
<Calendar mode="single" />

// Multiple dates
<Calendar mode="multiple" />

// Date range
<Calendar mode="range" />
```

### Step 3: Add Events

```tsx
const events = [
  {
    date: '2025-10-15',
    title: 'Team Meeting',
    description: 'Weekly sync'
  },
  {
    date: '2025-10-20',
    title: 'Product Launch'
  }
];

<Calendar
  mode="single"
  events={events}
/>
```

### Step 4: Enable API Integration

```tsx
<Calendar
  mode="single"
  events={events}
  onDateSelect="/api/calendar/select"
/>
```

That's it! Your calendar is ready to use.

---

## 📋 Complete Example

```tsx
import React from 'react';
import { Calendar } from '@/components/dynamic-page';

function MyPage() {
  const events = [
    {
      date: '2025-10-15',
      title: 'Team Meeting',
      description: 'Weekly sync with development team'
    },
    {
      date: '2025-10-20',
      title: 'Product Launch',
      description: 'New feature release'
    }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Event Calendar</h1>

      <Calendar
        mode="range"
        events={events}
        onDateSelect="/api/calendar/book"
        className="max-w-md mx-auto"
      />
    </div>
  );
}

export default MyPage;
```

---

## 🎯 Common Use Cases

### Use Case 1: Event Booking Calendar

```tsx
<Calendar
  mode="single"
  events={availableSlots}
  onDateSelect="/api/bookings/create"
/>
```

**API Payload:**
```json
{
  "mode": "single",
  "selectedDate": "2025-10-15"
}
```

### Use Case 2: Date Range Filter

```tsx
<Calendar
  mode="range"
  onDateSelect="/api/reports/filter"
/>
```

**API Payload:**
```json
{
  "mode": "range",
  "from": "2025-10-10",
  "to": "2025-10-20"
}
```

### Use Case 3: Multi-Day Event Selection

```tsx
<Calendar
  mode="multiple"
  events={holidays}
  onDateSelect="/api/schedule/update"
/>
```

**API Payload:**
```json
{
  "mode": "multiple",
  "selectedDates": ["2025-10-10", "2025-10-15", "2025-10-20"]
}
```

---

## 🔧 Dynamic Page Template Configuration

### Template JSON Structure

```json
{
  "pageType": "calendar",
  "content": {
    "component": "Calendar",
    "props": {
      "mode": "{{mode}}",
      "selectedDate": "{{selectedDate}}",
      "events": "{{events}}",
      "onDateSelect": "{{apiEndpoint}}"
    }
  }
}
```

### Template Variables

```json
{
  "mode": "range",
  "selectedDate": "2025-10-05",
  "apiEndpoint": "/api/agents/agent-123/calendar/select",
  "events": [
    {
      "date": "2025-10-15",
      "title": "Milestone Deadline",
      "description": "Q4 deliverable due"
    }
  ]
}
```

---

## 🎨 Styling & Customization

### Add Custom Classes

```tsx
<Calendar
  mode="single"
  className="shadow-xl rounded-xl border-2 border-blue-500"
/>
```

### Override Specific Styles

```css
/* In your CSS file */
.calendar-container .rdp-day_selected {
  background-color: #10b981 !important; /* Green */
}

.calendar-container .rdp-day_today {
  background-color: #fef3c7; /* Yellow */
}
```

---

## 📊 Backend API Implementation

### Express.js Example

```javascript
app.post('/api/calendar/select', (req, res) => {
  const { mode, selectedDate, selectedDates, from, to } = req.body;

  if (mode === 'single') {
    console.log('Selected date:', selectedDate);
    // Process single date
  } else if (mode === 'multiple') {
    console.log('Selected dates:', selectedDates);
    // Process multiple dates
  } else if (mode === 'range') {
    console.log('Date range:', from, 'to', to);
    // Process date range
  }

  res.json({ success: true, message: 'Date selection received' });
});
```

### Python/Flask Example

```python
@app.route('/api/calendar/select', methods=['POST'])
def calendar_select():
    data = request.json
    mode = data.get('mode')

    if mode == 'single':
        selected_date = data.get('selectedDate')
        print(f'Selected date: {selected_date}')
    elif mode == 'multiple':
        selected_dates = data.get('selectedDates')
        print(f'Selected dates: {selected_dates}')
    elif mode == 'range':
        date_from = data.get('from')
        date_to = data.get('to')
        print(f'Date range: {date_from} to {date_to}')

    return jsonify({'success': True, 'message': 'Date selection received'})
```

---

## 🧪 Testing

### Run Component Tests

```bash
npm test -- Calendar.test.tsx --run
```

### Test API Integration

```bash
# Open browser console
# Select a date in the calendar
# Check network tab for POST request to your API endpoint
```

---

## 🐛 Troubleshooting

### Issue: Events not showing

**Solution:** Ensure dates are in ISO format (YYYY-MM-DD)

```tsx
// ✅ Correct
{ date: '2025-10-15', title: 'Event' }

// ❌ Incorrect
{ date: '10/15/2025', title: 'Event' }
```

### Issue: API not being called

**Solution:** Check that onDateSelect prop is provided

```tsx
// ✅ API will be called
<Calendar onDateSelect="/api/calendar" />

// ❌ API won't be called (prop missing)
<Calendar />
```

### Issue: Styling conflicts

**Solution:** Ensure react-day-picker styles are imported

```tsx
import 'react-day-picker/dist/style.css';
```

---

## 📚 Additional Resources

- **Full Documentation:** [README.md](./README.md)
- **Complete Examples:** [Calendar.example.tsx](./Calendar.example.tsx)
- **Interactive Demo:** [CalendarDemo.tsx](./CalendarDemo.tsx)
- **Implementation Summary:** [CALENDAR_SUMMARY.md](./CALENDAR_SUMMARY.md)
- **Test Suite:** [Calendar.test.tsx](../../tests/components/Calendar.test.tsx)

---

## ✅ Checklist for Integration

- [ ] Import the Calendar component
- [ ] Choose selection mode (single/multiple/range)
- [ ] Prepare events array (if needed)
- [ ] Set up API endpoint (if needed)
- [ ] Test in browser
- [ ] Verify API payload format
- [ ] Test on mobile devices
- [ ] Check accessibility (keyboard navigation)

---

## 🎉 You're Ready!

The Calendar component is production-ready and fully tested. If you encounter any issues, refer to the documentation files or test suite for examples and troubleshooting.

**Happy coding! 🚀**
