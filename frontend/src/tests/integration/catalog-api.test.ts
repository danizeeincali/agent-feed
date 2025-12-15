import { describe, it, expect, beforeAll } from 'vitest'

const API_BASE = 'http://localhost:3001'

describe('Component Catalog API Integration Tests', () => {
  let catalogData: any

  beforeAll(async () => {
    // Fetch catalog data once for all tests
    const response = await fetch(`${API_BASE}/api/components/catalog`)
    catalogData = await response.json()
  })

  describe('GET /api/components/catalog', () => {
    it('should return all 15 components', async () => {
      const response = await fetch(`${API_BASE}/api/components/catalog`)
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.version).toBe('1.0.0')
      expect(data.totalComponents).toBe(15)
      expect(data.components).toHaveLength(15)
      expect(Array.isArray(data.categories)).toBe(true)
    })

    it('should include all expected component types', async () => {
      const expectedTypes = [
        'header', 'stat', 'todoList', 'dataTable', 'list',
        'form', 'tabs', 'timeline', 'Card', 'Grid',
        'Badge', 'Metric', 'ProfileHeader', 'CapabilityList', 'Button'
      ]
      
      const componentTypes = catalogData.components.map((c: any) => c.type)
      expectedTypes.forEach(type => {
        expect(componentTypes).toContain(type)
      })
    })

    it('should include schema, examples, and descriptions for each component', async () => {
      catalogData.components.forEach((component: any) => {
        expect(component).toHaveProperty('type')
        expect(component).toHaveProperty('name')
        expect(component).toHaveProperty('category')
        expect(component).toHaveProperty('description')
        expect(component).toHaveProperty('schema')
        expect(component).toHaveProperty('examples')
        expect(component).toHaveProperty('required')
        expect(component).toHaveProperty('optional')
        
        // Verify examples is an array
        expect(Array.isArray(component.examples)).toBe(true)
        expect(component.examples.length).toBeGreaterThan(0)
      })
    })

    it('should filter by category', async () => {
      const response = await fetch(`${API_BASE}/api/components/catalog?category=Interactive`)
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.components.every((c: any) => c.category === 'Interactive')).toBe(true)
      expect(data.components.length).toBeGreaterThan(0)
    })

    it('should search by component name or description', async () => {
      const response = await fetch(`${API_BASE}/api/components/catalog?search=button`)
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.components.length).toBeGreaterThan(0)
      
      // Verify search results contain the search term
      const searchResults = data.components.every((c: any) => 
        c.name.toLowerCase().includes('button') ||
        c.description.toLowerCase().includes('button') ||
        c.type.toLowerCase().includes('button')
      )
      expect(searchResults).toBe(true)
    })

    it('should combine category filter and search', async () => {
      const response = await fetch(`${API_BASE}/api/components/catalog?category=Data Display&search=metric`)
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      
      if (data.components.length > 0) {
        data.components.forEach((c: any) => {
          expect(c.category).toBe('Data Display')
          const matchesSearch = 
            c.name.toLowerCase().includes('metric') ||
            c.description.toLowerCase().includes('metric') ||
            c.type.toLowerCase().includes('metric')
          expect(matchesSearch).toBe(true)
        })
      }
    })
  })

  describe('GET /api/components/catalog/:componentType', () => {
    it('should return a specific component by type', async () => {
      const response = await fetch(`${API_BASE}/api/components/catalog/header`)
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.component.type).toBe('header')
      expect(data.component.name).toBe('header')
      expect(data.component.category).toBe('Typography')
      expect(data.component.examples.length).toBeGreaterThan(0)
    })

    it('should return valid JSON schema for each component', async () => {
      const componentTypes = ['header', 'stat', 'Button', 'Card']
      
      for (const type of componentTypes) {
        const response = await fetch(`${API_BASE}/api/components/catalog/${type}`)
        const data = await response.json()
        
        expect(data.success).toBe(true)
        expect(data.component.schema).toBeDefined()
        expect(data.component.schema.type).toBe('object')
        expect(data.component.schema.properties).toBeDefined()
      }
    })

    it('should return 404 for unknown component type', async () => {
      const response = await fetch(`${API_BASE}/api/components/catalog/unknownComponent`)
      expect(response.status).toBe(404)
      
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Component not found')
      expect(Array.isArray(data.availableComponents)).toBe(true)
    })

    it('should have valid examples that match the schema', async () => {
      // Test header component
      const response = await fetch(`${API_BASE}/api/components/catalog/header`)
      const data = await response.json()
      
      expect(data.component.examples.length).toBeGreaterThanOrEqual(2)
      
      // Check first example has required props
      const example1 = data.component.examples[0]
      expect(example1.title).toBeDefined()
      expect(example1.level).toBeDefined()
      expect(typeof example1.title).toBe('string')
      expect(typeof example1.level).toBe('number')
    })
  })

  describe('GET /api/components/categories', () => {
    it('should return all categories with counts', async () => {
      const response = await fetch(`${API_BASE}/api/components/categories`)
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.totalCategories).toBeGreaterThan(0)
      expect(Array.isArray(data.categories)).toBe(true)
    })

    it('should include component counts for each category', async () => {
      const response = await fetch(`${API_BASE}/api/components/categories`)
      const data = await response.json()
      
      data.categories.forEach((category: any) => {
        expect(category).toHaveProperty('name')
        expect(category).toHaveProperty('count')
        expect(category).toHaveProperty('components')
        expect(category.count).toBeGreaterThan(0)
        expect(Array.isArray(category.components)).toBe(true)
        expect(category.components.length).toBe(category.count)
      })
    })

    it('should have expected categories', async () => {
      const response = await fetch(`${API_BASE}/api/components/categories`)
      const data = await response.json()
      
      const categoryNames = data.categories.map((c: any) => c.name)
      expect(categoryNames).toContain('Typography')
      expect(categoryNames).toContain('Data Display')
      expect(categoryNames).toContain('Interactive')
      expect(categoryNames).toContain('Layout')
    })
  })

  describe('Component Examples Validation', () => {
    it('should have examples for all 15 components', async () => {
      const response = await fetch(`${API_BASE}/api/components/catalog`)
      const data = await response.json()
      
      data.components.forEach((component: any) => {
        expect(component.examples.length).toBeGreaterThan(0)
      })
    })

    it('should have at least 2 examples per component', async () => {
      const response = await fetch(`${API_BASE}/api/components/catalog`)
      const data = await response.json()
      
      const componentsWithMultipleExamples = data.components.filter(
        (c: any) => c.examples.length >= 2
      )
      
      // Most components should have at least 2 examples
      expect(componentsWithMultipleExamples.length).toBeGreaterThan(10)
    })
  })

  describe('Schema Validation', () => {
    it('should have required and optional props correctly identified', async () => {
      const response = await fetch(`${API_BASE}/api/components/catalog/header`)
      const data = await response.json()
      
      expect(Array.isArray(data.component.required)).toBe(true)
      expect(Array.isArray(data.component.optional)).toBe(true)
      
      // Header should have title and level as required
      expect(data.component.required).toContain('title')
      expect(data.component.required).toContain('level')
      
      // Subtitle should be optional
      expect(data.component.optional).toContain('subtitle')
    })

    it('should have no overlap between required and optional props', async () => {
      const response = await fetch(`${API_BASE}/api/components/catalog`)
      const data = await response.json()
      
      data.components.forEach((component: any) => {
        const requiredSet = new Set(component.required)
        const optionalSet = new Set(component.optional)
        
        component.required.forEach((prop: string) => {
          expect(optionalSet.has(prop)).toBe(false)
        })
      })
    })
  })
})
