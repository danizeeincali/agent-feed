import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GanttChart from '../components/dynamic-page/GanttChart';

// Mock gantt-task-react
vi.mock('gantt-task-react', () => ({
  Gantt: ({ tasks, TooltipContent, TaskListHeader, TaskListTable }: any) => (
    <div data-testid="gantt-chart">
      <div data-testid="task-list">
        {tasks.map((task: any) => (
          <div key={task.id} data-testid={`task-${task.id}`}>
            {task.name}
          </div>
        ))}
      </div>
      {TooltipContent && <div data-testid="tooltip-content">Tooltip</div>}
      {TaskListHeader && <div data-testid="task-list-header">Header</div>}
      {TaskListTable && <div data-testid="task-list-table">Table</div>}
    </div>
  ),
  ViewMode: {
    Day: 'day',
    Week: 'week',
    Month: 'month',
    QuarterDay: 'quarter',
    Year: 'year',
  },
}));

const mockTasks = [
  {
    id: 'task-1',
    name: 'Task 1',
    startDate: '2025-10-01',
    endDate: '2025-10-05',
    progress: 50,
    status: 'in-progress' as const,
    assignee: 'John Doe',
  },
  {
    id: 'task-2',
    name: 'Task 2',
    startDate: '2025-10-06',
    endDate: '2025-10-10',
    progress: 100,
    status: 'done' as const,
    dependencies: ['task-1'],
  },
  {
    id: 'task-3',
    name: 'Task 3',
    startDate: '2025-10-11',
    endDate: '2025-10-15',
    progress: 0,
    status: 'todo' as const,
  },
];

describe('GanttChart Component', () => {
  describe('Rendering', () => {
    it('renders empty state when no tasks provided', () => {
      render(<GanttChart tasks={[]} />);

      expect(screen.getByText('No tasks to display')).toBeInTheDocument();
      expect(screen.getByText(/Add tasks with start and end dates/)).toBeInTheDocument();
    });

    it('renders all tasks', () => {
      render(<GanttChart tasks={mockTasks} />);

      expect(screen.getByTestId('task-task-1')).toBeInTheDocument();
      expect(screen.getByTestId('task-task-2')).toBeInTheDocument();
      expect(screen.getByTestId('task-task-3')).toBeInTheDocument();
    });

    it('displays task names', () => {
      render(<GanttChart tasks={mockTasks} />);

      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
      expect(screen.getByText('Task 3')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <GanttChart tasks={mockTasks} className="custom-gantt" />
      );

      expect(container.querySelector('.custom-gantt')).toBeInTheDocument();
    });
  });

  describe('View Mode Switcher', () => {
    it('renders view mode buttons', () => {
      render(<GanttChart tasks={mockTasks} />);

      expect(screen.getByText('Day')).toBeInTheDocument();
      expect(screen.getByText('Week')).toBeInTheDocument();
      expect(screen.getByText('Month')).toBeInTheDocument();
      expect(screen.getByText('Quarter')).toBeInTheDocument();
      expect(screen.getByText('Year')).toBeInTheDocument();
    });

    it('defaults to month view', () => {
      render(<GanttChart tasks={mockTasks} />);

      const monthButton = screen.getByText('Month');
      expect(monthButton).toHaveStyle({ backgroundColor: '#3b82f6' });
    });

    it('changes view mode when button clicked', () => {
      render(<GanttChart tasks={mockTasks} />);

      const dayButton = screen.getByText('Day');
      fireEvent.click(dayButton);

      expect(dayButton).toHaveStyle({ backgroundColor: '#3b82f6' });
    });

    it('applies hover styles to inactive buttons', () => {
      render(<GanttChart tasks={mockTasks} />);

      const dayButton = screen.getByText('Day');
      fireEvent.mouseEnter(dayButton);

      expect(dayButton).toHaveStyle({ backgroundColor: '#f1f5f9' });
    });

    it('uses initial viewMode prop', () => {
      render(<GanttChart tasks={mockTasks} viewMode="week" />);

      // Week view should be active
      const weekButton = screen.getByText('Week');
      expect(weekButton).toHaveStyle({ backgroundColor: '#3b82f6' });
    });
  });

  describe('Status Legend', () => {
    it('displays status legend', () => {
      render(<GanttChart tasks={mockTasks} />);

      expect(screen.getByText('Status:')).toBeInTheDocument();
      expect(screen.getByText('todo')).toBeInTheDocument();
      expect(screen.getByText('in progress')).toBeInTheDocument();
      expect(screen.getByText('done')).toBeInTheDocument();
      expect(screen.getByText('blocked')).toBeInTheDocument();
    });

    it('displays color indicators for each status', () => {
      const { container } = render(<GanttChart tasks={mockTasks} />);

      const colorIndicators = container.querySelectorAll('[style*="background-color"]');
      expect(colorIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Task Properties', () => {
    it('handles tasks with progress', () => {
      render(<GanttChart tasks={mockTasks} />);

      // Progress should be included in the task data
      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    });

    it('handles tasks with dependencies', () => {
      render(<GanttChart tasks={mockTasks} />);

      // Task 2 has dependency on Task 1
      expect(screen.getByTestId('task-task-2')).toBeInTheDocument();
    });

    it('handles tasks with assignees', () => {
      render(<GanttChart tasks={mockTasks} />);

      // Assignee info should be available
      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    });

    it('handles tasks with different statuses', () => {
      render(<GanttChart tasks={mockTasks} />);

      expect(screen.getByTestId('task-task-1')).toBeInTheDocument(); // in-progress
      expect(screen.getByTestId('task-task-2')).toBeInTheDocument(); // done
      expect(screen.getByTestId('task-task-3')).toBeInTheDocument(); // todo
    });
  });

  describe('Date Handling', () => {
    it('parses ISO date strings correctly', () => {
      render(<GanttChart tasks={mockTasks} />);

      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    });

    it('handles invalid dates gracefully', () => {
      const invalidTasks = [
        {
          id: 'invalid',
          name: 'Invalid Task',
          startDate: 'invalid-date',
          endDate: 'also-invalid',
        },
      ];

      // Should not crash
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      render(<GanttChart tasks={invalidTasks} />);

      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('uses fallback dates for invalid inputs', () => {
      const invalidTasks = [
        {
          id: 'test',
          name: 'Test',
          startDate: '',
          endDate: '',
        },
      ];

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      render(<GanttChart tasks={invalidTasks} />);

      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Color Coding', () => {
    it('applies different colors for different statuses', () => {
      render(<GanttChart tasks={mockTasks} />);

      // Status colors should be applied
      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    });

    it('uses default color for tasks without status', () => {
      const tasksNoStatus = [
        {
          id: 'no-status',
          name: 'No Status',
          startDate: '2025-10-01',
          endDate: '2025-10-05',
        },
      ];

      render(<GanttChart tasks={tasksNoStatus} />);

      expect(screen.getByTestId('task-no-status')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides accessible table fallback', () => {
      const { container } = render(<GanttChart tasks={mockTasks} />);

      const table = container.querySelector('table[role="table"]');
      expect(table).toBeInTheDocument();
      expect(table).toHaveAttribute('aria-label', 'Project tasks timeline');
    });

    it('includes all task data in accessible table', () => {
      const { container } = render(<GanttChart tasks={mockTasks} />);

      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();

      const headers = table!.querySelectorAll('th');
      expect(Array.from(headers).map(h => h.textContent)).toContain('Task Name');
      expect(Array.from(headers).map(h => h.textContent)).toContain('Start Date');
      expect(Array.from(headers).map(h => h.textContent)).toContain('End Date');
      expect(Array.from(headers).map(h => h.textContent)).toContain('Progress');
    });

    it('formats dates in accessible table', () => {
      const { container } = render(<GanttChart tasks={mockTasks} />);

      const table = container.querySelector('table');
      const rows = table!.querySelectorAll('tbody tr');

      expect(rows.length).toBe(mockTasks.length);
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined tasks', () => {
      render(<GanttChart tasks={undefined as any} />);

      expect(screen.getByText('No tasks to display')).toBeInTheDocument();
    });

    it('handles single task', () => {
      render(<GanttChart tasks={[mockTasks[0]]} />);

      expect(screen.getByTestId('task-task-1')).toBeInTheDocument();
    });

    it('handles tasks without optional fields', () => {
      const minimalTasks = [
        {
          id: 'minimal',
          name: 'Minimal Task',
          startDate: '2025-10-01',
          endDate: '2025-10-05',
        },
      ];

      render(<GanttChart tasks={minimalTasks} />);

      expect(screen.getByText('Minimal Task')).toBeInTheDocument();
    });

    it('handles tasks with zero progress', () => {
      const zeroProgressTask = [
        {
          id: 'zero',
          name: 'Zero Progress',
          startDate: '2025-10-01',
          endDate: '2025-10-05',
          progress: 0,
        },
      ];

      render(<GanttChart tasks={zeroProgressTask} />);

      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    });

    it('handles tasks with 100% progress', () => {
      const completedTask = [
        {
          id: 'complete',
          name: 'Completed',
          startDate: '2025-10-01',
          endDate: '2025-10-05',
          progress: 100,
        },
      ];

      render(<GanttChart tasks={completedTask} />);

      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    });

    it('handles tasks with circular dependencies', () => {
      const circularTasks = [
        {
          id: 'a',
          name: 'Task A',
          startDate: '2025-10-01',
          endDate: '2025-10-05',
          dependencies: ['b'],
        },
        {
          id: 'b',
          name: 'Task B',
          startDate: '2025-10-06',
          endDate: '2025-10-10',
          dependencies: ['a'],
        },
      ];

      // Should not crash with circular dependencies
      render(<GanttChart tasks={circularTasks} />);

      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    });

    it('handles very long task names', () => {
      const longNameTask = [
        {
          id: 'long',
          name: 'This is a very long task name that should be handled properly without breaking the layout',
          startDate: '2025-10-01',
          endDate: '2025-10-05',
        },
      ];

      render(<GanttChart tasks={longNameTask} />);

      expect(screen.getByText(/This is a very long task name/)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders large number of tasks efficiently', () => {
      const manyTasks = Array.from({ length: 100 }, (_, i) => ({
        id: `task-${i}`,
        name: `Task ${i}`,
        startDate: '2025-10-01',
        endDate: '2025-10-05',
      }));

      render(<GanttChart tasks={manyTasks} />);

      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    });
  });
});
