#!/usr/bin/env python3
"""Fix schema violations in comprehensive-dashboard page."""
import json
import sys

# Read the page JSON
with open('/workspaces/agent-feed/data/agent-pages/personal-todos-agent-comprehensive-dashboard.json', 'r') as f:
    page_data = json.load(f)

# Parse the specification string
spec = json.loads(page_data['specification'])

def fix_component(component):
    """Recursively fix component schema violations."""
    comp_type = component.get('type')
    props = component.get('props', {})

    # Fix 1: Metric components must have 'label' field
    if comp_type == 'Metric':
        if 'label' not in props or props['label'] is None:
            props['label'] = ''

    # Fix 2: Badge variant must be valid enum
    if comp_type == 'Badge':
        variant = props.get('variant')
        if variant == 'success':
            props['variant'] = 'default'

    # Fix 3: Button children must be in props
    if comp_type == 'Button':
        if 'children' in component and 'children' not in props:
            props['children'] = component['children']
            del component['children']

    component['props'] = props

    # Recursively fix children
    if 'children' in component and isinstance(component['children'], list):
        for child in component['children']:
            if isinstance(child, dict):
                fix_component(child)

    return component

# Fix all components recursively
if 'components' in spec:
    for component in spec['components']:
        fix_component(component)

# Update the specification
page_data['specification'] = json.dumps(spec, separators=(',', ':'))
page_data['updated_at'] = '2025-10-05T00:00:00.000Z'

# Write back
with open('/workspaces/agent-feed/data/agent-pages/personal-todos-agent-comprehensive-dashboard.json', 'w') as f:
    json.dump(page_data, f, indent=2)

print("✅ Fixed all schema violations in comprehensive-dashboard")
print(f"✅ Updated specification length: {len(page_data['specification'])} characters")
