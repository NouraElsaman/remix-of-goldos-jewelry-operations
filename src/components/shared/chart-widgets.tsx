/**
 * Reusable Recharts wrappers.
 *
 * Business-agnostic chart primitives used across Dashboard, Analytics, Reports.
 * No domain knowledge — callers supply data and labels.
 *
 * Using Recharts v2 which is already installed in the project.
 */

import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart as ReAreaChart,
  Area,
  Cell,
  PieChart as RePieChart,
  Pie,
  Legend,
} from "recharts";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ChartDataPoint = { label: string; value: number };

// ── Shared chart color palette (consuming CSS design tokens via oklch) ─────

const CHART_COLORS = [
  "var(--color-gold)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
] as const;

// ── Custom tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  formatter?: ((v: number) => string) | undefined;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0]!.value;
  return (
    <div className="rounded-xl border border-border/80 bg-surface/95 px-3.5 py-2.5 text-xs shadow-floating backdrop-blur-md">
      {label ? (
        <p className="mb-0.5 font-medium text-muted-foreground/80">{label}</p>
      ) : null}
      <p data-numeric className="text-sm font-bold text-foreground">
        {formatter ? formatter(value) : value.toLocaleString()}
      </p>
    </div>
  );
}

// ── Bar chart ──────────────────────────────────────────────────────────────

/**
 * Responsive vertical bar chart.
 * `valueFormatter` lets callers render currency, weight, count, etc.
 */
export function BarChartWidget({
  data,
  height = 240,
  color = CHART_COLORS[0],
  valueFormatter,
  className,
}: {
  data: ChartDataPoint[];
  height?: number | undefined;
  color?: string | undefined;
  valueFormatter?: ((v: number) => string) | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ReBarChart
          data={data.map((d) => ({ name: d.label, value: d.value }))}
          barSize={28}
          margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--color-border)"
            strokeDasharray="4 2"
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            {...(valueFormatter ? { tickFormatter: valueFormatter } : {})}
          />
          <Tooltip
            content={<ChartTooltip formatter={valueFormatter} />}
            cursor={{ fill: "var(--color-accent)", radius: 6 }}
          />
          <Bar
            dataKey="value"
            fill={color}
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Area chart ─────────────────────────────────────────────────────────────

export function AreaChartWidget({
  data,
  height = 240,
  color = CHART_COLORS[0],
  valueFormatter,
  className,
}: {
  data: ChartDataPoint[];
  height?: number | undefined;
  color?: string | undefined;
  valueFormatter?: ((v: number) => string) | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ReAreaChart
          data={data.map((d) => ({ name: d.label, value: d.value }))}
          margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--color-border)"
            strokeDasharray="4 2"
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            domain={["dataMin - 100", "dataMax + 100"]}
            {...(valueFormatter ? { tickFormatter: valueFormatter } : {})}
          />
          <Tooltip
            content={<ChartTooltip formatter={valueFormatter} />}
            cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#areaGradient)"
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </ReAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Donut / Pie chart ──────────────────────────────────────────────────────

export type PieSlice = {
  label: string;
  value: number;
  color?: string | undefined;
};

export function DonutChartWidget({
  data,
  height = 240,
  valueFormatter,
  className,
}: {
  data: PieSlice[];
  height?: number | undefined;
  valueFormatter?: ((v: number) => string) | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RePieChart>
          <Pie
            data={data.map((d) => ({ name: d.label, value: d.value }))}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((slice, index) => (
              <Cell
                key={slice.label}
                fill={slice.color ?? CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip formatter={valueFormatter} />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value) => (
              <span style={{ color: "var(--color-muted-foreground)" }}>
                {value}
              </span>
            )}
          />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Re-export for convenience ─────────────────────────────────────────────

export type { ReactNode };
