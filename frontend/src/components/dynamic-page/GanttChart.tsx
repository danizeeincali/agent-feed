import React, { useMemo, useState } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';

interface GanttChartProps {
  tasks: Array<{
    id: string;
    name: string;
    startDate: string;  // ISO date
    endDate: string;    // ISO date
    progress?: number;  // 0-100
    dependencies?: string[];  // task IDs
    assignee?: string;
    status?: 'todo' | 'in-progress' | 'done' | 'blocked';
  }>;
  viewMode?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  className?: string;
}

// Status color mapping
const STATUS_COLORS: Record<string, string> = {
  'todo': '#94a3b8',        // slate-400
  'in-progress': '#3b82f6', // blue-500
  'done': '#22c55e',        // green-500
  'blocked': '#ef4444',     // red-500
  'default': '#6366f1',     // indigo-500
};

// View mode mapping
const VIEW_MODE_MAP: Record<string, ViewMode> = {
  'day': ViewMode.Day,
  'week': ViewMode.Week,
  'month': ViewMode.Month,
  'quarter': ViewMode.QuarterDay,
  'year': ViewMode.Year,
};

const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  viewMode = 'month',
  className = '',
}) => {
  const [currentViewMode, setCurrentViewMode] = useState<ViewMode>(
    VIEW_MODE_MAP[viewMode] || ViewMode.Month
  );
  const [columnWidth, setColumnWidth] = useState<number>(60);

  // Transform input tasks to gantt-task-react format
  const ganttTasks = useMemo<Task[]>(() => {
    if (!tasks || tasks.length === 0) {
      return [];
    }

    return tasks.map((task) => {
      const startDate = new Date(task.startDate);
      const endDate = new Date(task.endDate);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error(`Invalid date for task ${task.id}:`, {
          startDate: task.startDate,
          endDate: task.endDate,
        });
        // Use fallback dates
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return {
          id: task.id,
          name: task.name,
          start: now,
          end: tomorrow,
          progress: task.progress || 0,
          type: 'task' as const,
          dependencies: task.dependencies || [],
          styles: {
            backgroundColor: STATUS_COLORS[task.status || 'default'],
            backgroundSelectedColor: STATUS_COLORS[task.status || 'default'],
            progressColor: adjustColorBrightness(STATUS_COLORS[task.status || 'default'], -20),
            progressSelectedColor: adjustColorBrightness(STATUS_COLORS[task.status || 'default'], -20),
          },
        };
      }

      return {
        id: task.id,
        name: task.name,
        start: startDate,
        end: endDate,
        progress: task.progress || 0,
        type: 'task' as const,
        dependencies: task.dependencies || [],
        styles: {
          backgroundColor: STATUS_COLORS[task.status || 'default'],
          backgroundSelectedColor: STATUS_COLORS[task.status || 'default'],
          progressColor: adjustColorBrightness(STATUS_COLORS[task.status || 'default'], -20),
          progressSelectedColor: adjustColorBrightness(STATUS_COLORS[task.status || 'default'], -20),
        },
      };
    });
  }, [tasks]);

  // Adjust column width based on view mode
  useMemo(() => {
    switch (currentViewMode) {
      case ViewMode.Day:
        setColumnWidth(200);
        break;
      case ViewMode.Week:
        setColumnWidth(150);
        break;
      case ViewMode.Month:
        setColumnWidth(100);
        break;
      case ViewMode.QuarterDay:
        setColumnWidth(60);
        break;
      case ViewMode.Year:
        setColumnWidth(40);
        break;
      default:
        setColumnWidth(100);
    }
  }, [currentViewMode]);

  // Handle view mode change
  const handleViewModeChange = (mode: ViewMode) => {
    setCurrentViewMode(mode);
  };

  // Custom task list header
  const TaskListHeader: React.FC<{
    headerHeight: number;
    rowWidth: string;
    fontFamily: string;
    fontSize: string;
  }> = ({ headerHeight, rowWidth, fontFamily, fontSize }) => {
    return (
      <div
        style={{
          height: headerHeight,
          fontFamily,
          fontSize,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          fontWeight: 600,
          color: '#475569',
        }}
      >
        <div style={{ width: rowWidth }}>Task Name</div>
      </div>
    );
  };

  // Custom task list table
  const TaskListTable: React.FC<{
    rowHeight: number;
    rowWidth: string;
    fontFamily: string;
    fontSize: string;
    locale: string;
    tasks: Task[];
    selectedTaskId: string;
    setSelectedTask: (taskId: string) => void;
  }> = ({ rowHeight, rowWidth, fontFamily, fontSize, tasks, selectedTaskId, setSelectedTask }) => {
    // Find original task data for assignee info
    const getOriginalTask = (taskId: string) => {
      return tasks.find((t) => t.id === taskId);
    };

    return (
      <div>
        {ganttTasks.map((task, index) => {
          const originalTask = tasks[index];
          const isSelected = task.id === selectedTaskId;

          return (
            <div
              key={task.id}
              style={{
                height: rowHeight,
                fontFamily,
                fontSize,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '1rem',
                paddingRight: '1rem',
                backgroundColor: isSelected ? '#f1f5f9' : index % 2 === 0 ? '#ffffff' : '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
              onClick={() => setSelectedTask(task.id)}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                }
              }}
            >
              <div style={{ width: rowWidth, display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                <div style={{ fontWeight: 500, color: '#1e293b' }}>{task.name}</div>
                {originalTask && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {originalTask.assignee && (
                      <span>Assignee: {originalTask.assignee}</span>
                    )}
                    {originalTask.status && (
                      <span>
                        <span
                          style={{
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: STATUS_COLORS[originalTask.status || 'default'],
                            marginRight: '4px',
                          }}
                        />
                        {originalTask.status}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render empty state
  if (!tasks || tasks.length === 0) {
    return (
      <div className={`gantt-chart-empty ${className}`}>
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#64748b',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
          }}
        >
          <p style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.5rem' }}>
            No tasks to display
          </p>
          <p style={{ fontSize: '0.875rem' }}>
            Add tasks with start and end dates to see your project timeline
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`gantt-chart-container ${className}`}>
      {/* View Mode Switcher */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: '#f8fafc',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontWeight: 600, color: '#475569', marginRight: '0.5rem', alignSelf: 'center' }}>
          View:
        </span>
        {[
          { mode: ViewMode.Day, label: 'Day' },
          { mode: ViewMode.Week, label: 'Week' },
          { mode: ViewMode.Month, label: 'Month' },
          { mode: ViewMode.QuarterDay, label: 'Quarter' },
          { mode: ViewMode.Year, label: 'Year' },
        ].map(({ mode, label }) => (
          <button
            key={label}
            onClick={() => handleViewModeChange(mode)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentViewMode === mode ? '#3b82f6' : '#ffffff',
              color: currentViewMode === mode ? '#ffffff' : '#475569',
              border: '1px solid',
              borderColor: currentViewMode === mode ? '#3b82f6' : '#cbd5e1',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (currentViewMode !== mode) {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
              }
            }}
            onMouseLeave={(e) => {
              if (currentViewMode !== mode) {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: '#f8fafc',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          flexWrap: 'wrap',
          fontSize: '0.875rem',
        }}
      >
        <span style={{ fontWeight: 600, color: '#475569', marginRight: '0.5rem' }}>
          Status:
        </span>
        {Object.entries(STATUS_COLORS)
          .filter(([key]) => key !== 'default')
          .map(([status, color]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  borderRadius: '2px',
                  backgroundColor: color,
                }}
              />
              <span style={{ color: '#475569', textTransform: 'capitalize' }}>
                {status.replace('-', ' ')}
              </span>
            </div>
          ))}
      </div>

      {/* Gantt Chart */}
      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <Gantt
            tasks={ganttTasks}
            viewMode={currentViewMode}
            locale="en-US"
            columnWidth={columnWidth}
            listCellWidth="250px"
            rowHeight={60}
            barCornerRadius={4}
            barProgressColor="#1e40af"
            barProgressSelectedColor="#1e3a8a"
            barBackgroundColor="#3b82f6"
            barBackgroundSelectedColor="#2563eb"
            projectProgressColor="#7c3aed"
            projectProgressSelectedColor="#6d28d9"
            projectBackgroundColor="#8b5cf6"
            projectBackgroundSelectedColor="#7c3aed"
            milestoneBackgroundColor="#f59e0b"
            milestoneBackgroundSelectedColor="#d97706"
            fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize="14px"
            arrowColor="#94a3b8"
            arrowIndent={20}
            todayColor="rgba(239, 68, 68, 0.2)"
            TooltipContent={({ task }) => {
              const originalTask = tasks.find((t) => t.id === task.id);
              return (
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#ffffff',
                    padding: '0.75rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    maxWidth: '250px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '1rem' }}>
                    {task.name}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div>
                      <strong>Start:</strong> {task.start.toLocaleDateString()}
                    </div>
                    <div>
                      <strong>End:</strong> {task.end.toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Progress:</strong> {task.progress}%
                    </div>
                    {originalTask?.assignee && (
                      <div>
                        <strong>Assignee:</strong> {originalTask.assignee}
                      </div>
                    )}
                    {originalTask?.status && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <strong>Status:</strong>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '0.25rem',
                            backgroundColor: STATUS_COLORS[originalTask.status || 'default'],
                            fontSize: '0.75rem',
                            textTransform: 'capitalize',
                          }}
                        >
                          {originalTask.status.replace('-', ' ')}
                        </span>
                      </div>
                    )}
                    {task.dependencies && task.dependencies.length > 0 && (
                      <div>
                        <strong>Dependencies:</strong> {task.dependencies.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
            TaskListHeader={TaskListHeader}
            TaskListTable={TaskListTable}
          />
        </div>
      </div>

      {/* Accessible fallback table */}
      <div style={{ position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}>
        <table role="table" aria-label="Project tasks timeline">
          <thead>
            <tr>
              <th>Task Name</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Progress</th>
              <th>Assignee</th>
              <th>Status</th>
              <th>Dependencies</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.name}</td>
                <td>{new Date(task.startDate).toLocaleDateString()}</td>
                <td>{new Date(task.endDate).toLocaleDateString()}</td>
                <td>{task.progress || 0}%</td>
                <td>{task.assignee || 'Unassigned'}</td>
                <td>{task.status || 'N/A'}</td>
                <td>{task.dependencies?.join(', ') || 'None'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Helper function to adjust color brightness
function adjustColorBrightness(color: string, percent: number): string {
  // Convert hex to RGB
  const num = parseInt(color.replace('#', ''), 16);
  const r = (num >> 16) + percent;
  const g = ((num >> 8) & 0x00ff) + percent;
  const b = (num & 0x0000ff) + percent;

  // Ensure values are within valid range
  const newR = Math.min(255, Math.max(0, r));
  const newG = Math.min(255, Math.max(0, g));
  const newB = Math.min(255, Math.max(0, b));

  return `rgb(${newR}, ${newG}, ${newB})`;
}

export default GanttChart;
