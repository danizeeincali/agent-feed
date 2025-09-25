import React from 'react';
import { cn } from '@/lib/utils';
import { ChartDataPoint, ChartConfig } from '../types/analytics';

interface BarChartProps {
  data: ChartDataPoint[];
  config: ChartConfig;
  height?: number;
  showValues?: boolean;
  horizontal?: boolean;
  className?: string;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  config,
  height = 300,
  showValues = false,
  horizontal = false,
  className
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{config.title}</h3>
        <div
          className="flex items-center justify-center text-gray-500"
          style={{ height: `${height}px` }}
        >
          No data available
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(point => point.value));
  const padding = 40;

  // Calculate SVG dimensions
  const svgWidth = 600;
  const svgHeight = height;
  const chartWidth = svgWidth - (padding * 2);
  const chartHeight = svgHeight - (padding * 2);

  const barWidth = horizontal
    ? chartHeight / data.length * 0.8
    : chartWidth / data.length * 0.8;
  const barSpacing = horizontal
    ? chartHeight / data.length * 0.2
    : chartWidth / data.length * 0.2;

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
      </div>

      <div className="relative">
        <svg width="100%" height={height} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="overflow-visible">
          {/* Grid lines */}
          {config.showGrid && (
            <>
              {horizontal ? (
                // Vertical grid lines for horizontal bars
                [0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                  const x = padding + ratio * chartWidth;
                  return (
                    <line
                      key={`grid-${index}`}
                      x1={x}
                      y1={padding}
                      x2={x}
                      y2={padding + chartHeight}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                  );
                })
              ) : (
                // Horizontal grid lines for vertical bars
                [0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                  const y = padding + ratio * chartHeight;
                  return (
                    <line
                      key={`grid-${index}`}
                      x1={padding}
                      y1={y}
                      x2={padding + chartWidth}
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                  );
                })
              )}
            </>
          )}

          {/* Bars */}
          {data.map((point, index) => {
            const colorIndex = index % config.colors.length;
            const color = config.colors[colorIndex];

            if (horizontal) {
              // Horizontal bars
              const barHeight = barWidth;
              const barLength = (point.value / maxValue) * chartWidth;
              const x = padding;
              const y = padding + (index * (barHeight + barSpacing));

              return (
                <g key={index}>
                  <rect
                    x={x}
                    y={y}
                    width={barLength}
                    height={barHeight}
                    fill={color}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    data-tooltip={`${point.label || ''}: ${point.value}`}
                  />
                  {showValues && (
                    <text
                      x={x + barLength + 5}
                      y={y + barHeight / 2 + 4}
                      className="text-xs fill-gray-700"
                      textAnchor="start"
                    >
                      {point.value}
                    </text>
                  )}
                </g>
              );
            } else {
              // Vertical bars
              const barHeightValue = (point.value / maxValue) * chartHeight;
              const x = padding + (index * (barWidth + barSpacing));
              const y = padding + chartHeight - barHeightValue;

              return (
                <g key={index}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeightValue}
                    fill={color}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    data-tooltip={`${point.label || ''}: ${point.value}`}
                  />
                  {showValues && (
                    <text
                      x={x + barWidth / 2}
                      y={y - 5}
                      className="text-xs fill-gray-700"
                      textAnchor="middle"
                    >
                      {point.value}
                    </text>
                  )}
                </g>
              );
            }
          })}

          {/* Axis labels */}
          {horizontal ? (
            <>
              {/* Y-axis labels (categories) */}
              {data.map((point, index) => {
                const y = padding + (index * (barWidth + barSpacing)) + barWidth / 2;
                return (
                  <text
                    key={`y-label-${index}`}
                    x={padding - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="text-xs fill-gray-500"
                  >
                    {point.label || `Item ${index + 1}`}
                  </text>
                );
              })}

              {/* X-axis labels (values) */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const x = padding + ratio * chartWidth;
                const value = maxValue * ratio;
                return (
                  <text
                    key={`x-label-${index}`}
                    x={x}
                    y={padding + chartHeight + 20}
                    textAnchor="middle"
                    className="text-xs fill-gray-500"
                  >
                    {value.toFixed(0)}
                  </text>
                );
              })}
            </>
          ) : (
            <>
              {/* X-axis labels (categories) */}
              {data.map((point, index) => {
                const x = padding + (index * (barWidth + barSpacing)) + barWidth / 2;
                return (
                  <text
                    key={`x-label-${index}`}
                    x={x}
                    y={padding + chartHeight + 20}
                    textAnchor="middle"
                    className="text-xs fill-gray-500"
                  >
                    {point.label || `Item ${index + 1}`}
                  </text>
                );
              })}

              {/* Y-axis labels (values) */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const y = padding + ratio * chartHeight;
                const value = maxValue - (maxValue * ratio);
                return (
                  <text
                    key={`y-label-${index}`}
                    x={padding - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="text-xs fill-gray-500"
                  >
                    {value.toFixed(0)}
                  </text>
                );
              })}
            </>
          )}
        </svg>
      </div>

      {/* Axis titles */}
      <div className="mt-4 flex justify-between items-end">
        <div className="text-xs text-gray-500">{config.xAxis}</div>
        {!horizontal && (
          <div className="text-xs text-gray-500 transform -rotate-90 origin-center">{config.yAxis}</div>
        )}
      </div>

      {/* Legend */}
      {config.showLegend && data.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {data.map((point, index) => {
            const colorIndex = index % config.colors.length;
            const color = config.colors[colorIndex];
            return (
              <div key={index} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-gray-600">
                  {point.label || `Series ${index + 1}`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BarChart;