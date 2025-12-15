import express from 'express'
import { generateComponentCatalog } from '../utils/schemaConverter.js'

const router = express.Router()

// GET /api/components/catalog - List all components with optional search/filter
router.get('/catalog', (req, res) => {
  try {
    const { category, search } = req.query

    let catalog = generateComponentCatalog()

    // Filter by category
    if (category) {
      catalog.components = catalog.components.filter(c =>
        c.category === category
      )
      catalog.totalComponents = catalog.components.length
    }

    // Search by name, description, or type
    if (search) {
      const searchLower = search.toLowerCase()
      catalog.components = catalog.components.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        c.description.toLowerCase().includes(searchLower) ||
        c.type.toLowerCase().includes(searchLower)
      )
      catalog.totalComponents = catalog.components.length
    }

    res.json({
      success: true,
      ...catalog
    })
  } catch (error) {
    console.error('Error generating component catalog:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate component catalog',
      message: error.message
    })
  }
})

// GET /api/components/catalog/:componentType - Get specific component
router.get('/catalog/:componentType', (req, res) => {
  try {
    const { componentType } = req.params
    const catalog = generateComponentCatalog()

    const component = catalog.components.find(c => c.type === componentType)

    if (!component) {
      return res.status(404).json({
        success: false,
        error: 'Component not found',
        message: `Component type "${componentType}" does not exist`,
        availableComponents: catalog.components.map(c => c.type)
      })
    }

    res.json({
      success: true,
      component
    })
  } catch (error) {
    console.error('Error fetching component:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch component',
      message: error.message
    })
  }
})

// GET /api/components/categories - List categories with component counts
router.get('/categories', (req, res) => {
  try {
    const catalog = generateComponentCatalog()

    const categoriesWithCounts = catalog.categories.map(category => ({
      name: category,
      count: catalog.components.filter(c => c.category === category).length,
      components: catalog.components
        .filter(c => c.category === category)
        .map(c => ({ type: c.type, name: c.name }))
    }))

    res.json({
      success: true,
      totalCategories: categoriesWithCounts.length,
      categories: categoriesWithCounts
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      message: error.message
    })
  }
})

export default router
