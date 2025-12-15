import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ValidationError } from '../../components/ValidationError'
import { ZodError } from 'zod'
import { HeaderSchema } from '../../schemas/componentSchemas'

describe('Validation Integration', () => {
  it('should render ValidationError component with proper error messages', () => {
    // Create a Zod error by validating invalid props
    let zodError: ZodError | null = null
    try {
      HeaderSchema.parse({ level: 7 }) // Missing title, invalid level
    } catch (error) {
      if (error instanceof ZodError) {
        zodError = error
      }
    }

    expect(zodError).not.toBeNull()

    // Render the ValidationError component
    const { container } = render(
      <ValidationError componentType="header" errors={zodError!} />
    )

    // Check that the error message is displayed
    expect(screen.getByText('Component Validation Error')).toBeInTheDocument()
    expect(screen.getByText(/header/i)).toBeInTheDocument()

    // Check that the tip message is displayed
    expect(screen.getByText(/Check the component schema documentation/i)).toBeInTheDocument()
    expect(screen.getByText('/api/components/catalog')).toBeInTheDocument()

    // Verify error styling is present
    const errorContainer = container.querySelector('.bg-red-50')
    expect(errorContainer).toBeInTheDocument()
  })

  it('should display multiple validation errors', () => {
    let zodError: ZodError | null = null
    try {
      // This will create multiple errors: missing title, invalid level
      HeaderSchema.parse({ level: 10 })
    } catch (error) {
      if (error instanceof ZodError) {
        zodError = error
      }
    }

    expect(zodError).not.toBeNull()
    expect(zodError!.errors.length).toBeGreaterThan(0)

    render(<ValidationError componentType="header" errors={zodError!} />)

    // Check that "Issues found:" is displayed
    expect(screen.getByText('Issues found:')).toBeInTheDocument()
  })

  it('should show field paths in error messages', () => {
    let zodError: ZodError | null = null
    try {
      // Create an error with a specific field path
      HeaderSchema.parse({ title: '', level: 1 })
    } catch (error) {
      if (error instanceof ZodError) {
        zodError = error
      }
    }

    expect(zodError).not.toBeNull()

    const { container } = render(<ValidationError componentType="header" errors={zodError!} />)

    // The error path should be shown in font-mono elements
    const monoElements = container.querySelectorAll('.font-mono')
    expect(monoElements.length).toBeGreaterThan(0)

    // At least one should show the 'title' field path
    const titleElement = Array.from(monoElements).find(el => el.textContent?.includes('title'))
    expect(titleElement).toBeDefined()
  })
})
