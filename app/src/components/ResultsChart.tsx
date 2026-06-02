'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const CHART_COLORS = [
  '#8B5CF6',
  '#06B6D4',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#6366F1',
  '#14B8A6',
];

interface ResultsChartProps {
  results: {
    options: string[];
    votes: number[];
    totalVotes: number;
  };
}

// ===== Custom Tooltip =====
interface TooltipPayloadItem {
  value: number;
  name: string;
  payload: {
    name: string;
    votes: number;
    percentage: number;
    fill: string;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0];
  return (
    <div className="glass-strong rounded-xl px-4 py-3 shadow-xl border border-white/10">
      <p className="text-white font-semibold text-sm mb-1">{data.payload.name}</p>
      <div className="flex items-center gap-3">
        <span className="text-gray-300 text-sm">{data.value} votes</span>
        <span className="text-gray-500 text-xs">({data.payload.percentage}%)</span>
      </div>
    </div>
  );
}

// ===== Custom Legend =====
interface LegendPayloadItem {
  value: string;
  color: string;
}

interface CustomLegendProps {
  payload?: LegendPayloadItem[];
}

function CustomLegend({ payload }: CustomLegendProps) {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-400 text-xs">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ResultsChart({ results }: ResultsChartProps) {
  const { options, votes, totalVotes } = results;

  const chartData = options.map((name, idx) => ({
    name: name.length > 15 ? name.slice(0, 15) + '...' : name,
    fullName: name,
    votes: votes[idx] || 0,
    percentage: totalVotes > 0 ? Math.round(((votes[idx] || 0) / totalVotes) * 100) : 0,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  const pieData = chartData.filter((d) => d.votes > 0);

  return (
    <div className="space-y-8">
      {/* Bar Chart */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Vote Distribution
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} barSize={48}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }} />
            <Bar dataKey="votes" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            Vote Share
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="votes"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                innerRadius={60}
                paddingAngle={3}
                strokeWidth={0}
                label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} (${Math.round((percent || 0) * 100)}%)`}
                labelLine={{ stroke: '#6B7280' }}
              >
                {pieData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Breakdown Table */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Detailed Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-white/5">
                <th className="text-left py-3 px-4">Option</th>
                <th className="text-right py-3 px-4">Votes</th>
                <th className="text-right py-3 px-4">Share</th>
                <th className="text-left py-3 px-4 w-1/3">Progress</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((item, idx) => (
                <tr
                  key={idx}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-gray-200 text-sm font-medium">
                        {item.fullName}
                      </span>
                    </div>
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className="text-white font-semibold text-sm">{item.votes}</span>
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className="text-gray-400 text-sm">{item.percentage}%</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="w-full bg-gray-800/50 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.fill,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
