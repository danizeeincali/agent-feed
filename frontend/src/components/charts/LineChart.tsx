import React from 'react';
import { cn } from '@/lib/utils';
import { ChartDataPoint, ChartConfig } from '@/types/analytics';

interface LineChartProps {
  data: ChartDataPoint[];
  config: ChartConfig;
  height?: number;
  showTrend?: boolean;
  gradient?: boolean;
  className?: string;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  config,
  height = 300,
  showTrend = false,
  gradient = false,
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
  const minValue = Math.min(...data.map(point => point.value));
  const range = maxValue - minValue;
  const padding = 40;

  // Calculate SVG dimensions
  const svgWidth = 600;
  const svgHeight = height;
  const chartWidth = svgWidth - (padding * 2);
  const chartHeight = svgHeight - (padding * 2);

  // Create path for line chart
  const createPath = (points: ChartDataPoint[]) => {
    if (points.length === 0) return '';

    const pathPoints = points.map((point, index) => {
      const x = padding + (index / (points.length - 1)) * chartWidth;
      const y = padding + ((maxValue - point.value) / range) * chartHeight;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    });

    return pathPoints.join(' ');
  };

  // Create gradient path for area chart
  const createGradientPath = (points: ChartDataPoint[]) => {
    if (points.length === 0) return '';

    const linePath = createPath(points);
    const lastPoint = points[points.length - 1];
    const lastX = padding + ((points.length - 1) / (points.length - 1)) * chartWidth;
    const bottomY = padding + chartHeight;

    return `${linePath} L ${lastX} ${bottomY} L ${padding} ${bottomY} Z`;
  };

  const path = createPath(data);
  const gradientPath = gradient ? createGradientPath(data) : '';

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
        {showTrend && data.length > 1 && (
          <div className="text-sm">
            {data[data.length - 1].value > data[0].value ? (
              <span className="text-green-600">↗ Trending up</span>
            ) : (
              <span className="text-red-600">↘ Trending down</span>
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <svg width="100%" height={height} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="overflow-visible">
          <defs>
            {gradient && (
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={config.colors[0]} stopOpacity="0.3" />
                <stop offset="100%" stopColor={config.colors[0]} stopOpacity="0.05" />
              </linearGradient>
            )}
          </defs>

          {/* Grid lines */}
          {config.showGrid && (
            <>
              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const y = padding + ratio * chartHeight;
                return (
                  <line
                    key={`h-grid-${index}`}
                    x1={padding}
                    y1={y}
                    x2={padding + chartWidth}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Vertical grid lines */}
              {data.map((_, index) => {
                if (index % Math.ceil(data.length / 5) === 0) {
                  const x = padding + (index / (data.length - 1)) * chartWidth;
                  return (
                    <line
                      key={`v-grid-${index}`}
                      x1={x}
                      y1={padding}
                      x2={x}
                      y2={padding + chartHeight}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                  );
                }
                return null;
              })}
            </>
          )}

          {/* Gradient area */}
          {gradient && gradientPath && (
            <path
              d={gradientPath}
              fill="url(#lineGradient)"
              stroke="none"
            />
          )}

          {/* Line path */}
          <path
            d={path}
            fill="none"
            stroke={config.colors[0]}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {data.map((point, index) => {
            const x = padding + (index / (data.length - 1)) * chartWidth;
            const y = padding + ((maxValue - point.value) / range) * chartHeight;

            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill={config.colors[0]}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer"
                data-tooltip={`${point.label || ''}: ${point.value}`}
              />
            );
          })}

          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = padding + ratio * chartHeight;
            const value = maxValue - (ratio * range);
            return (
              <text
                key={`y-label-${index}`}
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-gray-500"
              >
                {typeof value === 'number' ? value.toFixed(0) : value}
              </text>
            );
          })}

          {/* X-axis labels */}
          {data.map((point, index) => {
            if (index % Math.ceil(data.length / 5) === 0) {
              const x = padding + (index / (data.length - 1)) * chartWidth;
              return (
                <text
                  key={`x-label-${index}`}
                  x={x}
                  y={padding + chartHeight + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-500"
                >
                  {point.label || new Date(point.timestamp).toLocaleTimeString()}
                </text>
              );
            }
            return null;
          })}
        </svg>
      </div>

      {/* X and Y axis labels */}
      <div className="mt-4 flex justify-between items-end">
        <div className="text-xs text-gray-500">{config.xAxis}</div>
        <div className="text-xs text-gray-500 transform -rotate-90 origin-center">{config.yAxis}</div>
      </div>
    </div>
  );
};

export default LineChart;