import React from 'react';
import { cn } from '@/lib/utils';
import { ChartDataPoint, ChartConfig } from '../types/analytics';

interface PieChartProps {
  data: ChartDataPoint[];
  config: ChartConfig;
  height?: number;
  donut?: boolean;
  showTotal?: boolean;
  className?: string;
}

const PieChart: React.FC<PieChartProps> = ({
  data,
  config,
  height = 300,
  donut = false,
  showTotal = false,
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

  const total = data.reduce((sum, point) => sum + point.value, 0);
  const centerX = 300;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 40;
  const innerRadius = donut ? radius * 0.5 : 0;

  // Calculate angles for each slice
  let currentAngle = -90; // Start from top
  const slices = data.map((point, index) => {
    const percentage = (point.value / total) * 100;
    const angleSlice = (point.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleSlice;
    currentAngle = endAngle;

    const colorIndex = index % config.colors.length;
    const color = config.colors[colorIndex];

    return {
      ...point,
      startAngle,
      endAngle,
      percentage,
      color
    };
  });

  // Function to create SVG path for arc
  const createArcPath = (startAngle: number, endAngle: number, outerRadius: number, innerRadius: number = 0) => {
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + outerRadius * Math.cos(startAngleRad);
    const y1 = centerY + outerRadius * Math.sin(startAngleRad);
    const x2 = centerX + outerRadius * Math.cos(endAngleRad);
    const y2 = centerY + outerRadius * Math.sin(endAngleRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    if (innerRadius === 0) {
      // Full pie slice
      return `M ${centerX} ${centerY} L ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    } else {
      // Donut slice
      const x3 = centerX + innerRadius * Math.cos(endAngleRad);
      const y3 = centerY + innerRadius * Math.sin(endAngleRad);
      const x4 = centerX + innerRadius * Math.cos(startAngleRad);
      const y4 = centerY + innerRadius * Math.sin(startAngleRad);

      return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    }
  };

  // Function to get label position
  const getLabelPosition = (startAngle: number, endAngle: number, radius: number) => {
    const midAngle = (startAngle + endAngle) / 2;
    const midAngleRad = (midAngle * Math.PI) / 180;
    const labelRadius = radius * 0.7;

    return {
      x: centerX + labelRadius * Math.cos(midAngleRad),
      y: centerY + labelRadius * Math.sin(midAngleRad)
    };
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
        {showTotal && (
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{total.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width={centerX * 2} height={height} className="overflow-visible">
            {/* Pie slices */}
            {slices.map((slice, index) => {
              const path = createArcPath(slice.startAngle, slice.endAngle, radius, innerRadius);

              return (
                <path
                  key={index}
                  d={path}
                  fill={slice.color}
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer transition-opacity hover:opacity-80"
                  data-tooltip={`${slice.label || ''}: ${slice.value} (${slice.percentage.toFixed(1)}%)`}
                />
              );
            })}

            {/* Labels */}
            {slices.map((slice, index) => {
              // Only show label if slice is large enough
              if (slice.percentage < 5) return null;

              const labelPos = getLabelPosition(slice.startAngle, slice.endAngle, radius);

              return (
                <text
                  key={`label-${index}`}
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs fill-white font-medium"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                >
                  {slice.percentage.toFixed(0)}%
                </text>
              );
            })}

            {/* Center content for donut charts */}
            {donut && showTotal && (
              <g>
                <text
                  x={centerX}
                  y={centerY - 5}
                  textAnchor="middle"
                  className="text-lg font-bold fill-gray-900"
                >
                  {total.toLocaleString()}
                </text>
                <text
                  x={centerX}
                  y={centerY + 15}
                  textAnchor="middle"
                  className="text-sm fill-gray-500"
                >
                  Total
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Legend */}
      {config.showLegend && (
        <div className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {slices.map((slice, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-sm text-gray-700 truncate">
                    {slice.label || `Series ${index + 1}`}
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-medium text-gray-900">
                    {slice.value.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {slice.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">{data.length}</div>
            <div className="text-xs text-gray-500">Categories</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.max(...data.map(d => d.value)).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Largest</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.round(total / data.length).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Average</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PieChart;