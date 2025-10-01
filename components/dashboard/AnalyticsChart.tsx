// components/dashboard/AnalyticsChart.tsx
import React from 'react';
import { EventCountData } from '@/types/project';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface AnalyticsChartProps {
  data: EventCountData[];
}

// Function to format the date for the X-axis (e.g., 01/24)
const formatXAxis = (tickItem: string) => {
  if (tickItem) {
    // Assuming the format is YYYY-MM-DD
    return tickItem.substring(5).replace('-', '/'); 
  }
  return '';
};

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No event data available to display chart.
      </div>
    );
  }
  
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5, right: 20, left: -20, bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          
          {/* XAxis: Uses the date for the ticks, formatted to show MM/DD */}
          <XAxis 
            dataKey="date" 
            tickFormatter={formatXAxis} 
            padding={{ left: 10, right: 10 }} 
          />
          
          {/* YAxis: Automatically scales to the max count */}
          <YAxis 
            dataKey="count" 
            tickFormatter={(value) => value.toLocaleString()}
            domain={['auto', 'auto']} // Ensures YAxis starts at a reasonable point
          />
          
          {/* Tooltip: Shows data when hovering over the chart */}
          <Tooltip 
            formatter={(value: number) => [value.toLocaleString(), 'Events']}
            labelFormatter={(label) => `Date: ${formatXAxis(label)}`}
          />
          
          {/* Line: Plots the count data over the date */}
          <Line 
            type="monotone" 
            dataKey="count" 
            stroke="#4f46e5" // Indigo-600 color
            strokeWidth={2}
            dot={{ r: 4 }} // Small dots for data points
            activeDot={{ r: 8 }} // Larger dot on hover
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};