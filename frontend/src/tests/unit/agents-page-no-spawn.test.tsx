import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import RealAgentManager from '../../components/RealAgentManager'

// Mock the API service
vi.mock('../../services/apiServiceIsolated', () => ({
  default: {
    getAgents: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: '1',
          name: 'Test Agent',
          slug: 'test-agent',
          status: 'active',
          created_at: new Date().toISOString(),
          capabilities: ['test']
        }
      ]
    }),
    on: vi.fn(),
    off: vi.fn()
  }
}))

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('RealAgentManager - Spawn Agent Removal', () => {
  describe('UI Elements Removed', () => {
    it('should not render "Spawn Agent" button', async () => {
      renderWithRouter(<RealAgentManager />)

      await waitFor(() => {
        expect(screen.queryByText('Spawn Agent')).not.toBeInTheDocument()
      })
    })

    it('should not render "Activate" buttons on agent cards', async () => {
      renderWithRouter(<RealAgentManager />)

      await waitFor(() => {
        expect(screen.queryByText('Activate')).not.toBeInTheDocument()
      })
    })

    it('should not render "Create First Agent" button', async () => {
      renderWithRouter(<RealAgentManager />)

      await waitFor(() => {
        expect(screen.queryByText('Create First Agent')).not.toBeInTheDocument()
      })
    })
  })

  describe('Functionality Verification', () => {
    it('should render agents list successfully', async () => {
      renderWithRouter(<RealAgentManager />)

      await waitFor(() => {
        expect(screen.getByText('Test Agent')).toBeInTheDocument()
      })
    })

    it('should render search input', async () => {
      renderWithRouter(<RealAgentManager />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search agents...')).toBeInTheDocument()
      })
    })

    it('should render refresh button', async () => {
      renderWithRouter(<RealAgentManager />)

      await waitFor(() => {
        expect(screen.getByLabelText(/refresh/i)).toBeInTheDocument()
      })
    })
  })

  describe('No Console Errors', () => {
    it('should not log any errors during render', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      renderWithRouter(<RealAgentManager />)

      await waitFor(() => {
        expect(screen.getByText('Test Agent')).toBeInTheDocument()
      })

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
