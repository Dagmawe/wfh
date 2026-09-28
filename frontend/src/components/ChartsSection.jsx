import React from 'react';
import ReactECharts from 'echarts-for-react';
import { TrendingUp, BarChart3, PieChart as PieIcon, MapPin } from 'lucide-react';

export default function ChartsSection({
  intervals = [],
  summaryData,
  staffingData,
  isDark,
  selectedDayLabel,
}) {
  const textColor = isDark ? '#d4d4d8' : '#3f3f46';
  const gridLineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tooltipBg = isDark ? '#18181b' : '#ffffff';
  const tooltipBorder = isDark ? '#27272a' : '#e4e4e7';
  const tooltipText = isDark ? '#fafafa' : '#09090b';

  // 1. Prepare Data for Supply vs Demand Chart
  const times = intervals.map((i) => i.interval_time || (i.timestamp_local ? i.timestamp_local.slice(11, 16) : ''));
  const requiredFTEs = intervals.map((i) => i.required_fte || 0);
  const supplyFTEs = intervals.map((i) => (i.supply_fte ?? i.available_supply_fte ?? 0));
  const variances = intervals.map((i) => (i.net_variance ?? i.variance_fte ?? ((i.supply_fte ?? i.available_supply_fte ?? 0) - (i.required_fte ?? 0))));

  const supplyDemandOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      textStyle: { color: tooltipText, fontSize: 12, fontFamily: 'DM Sans, sans-serif' },
      formatter: (params) => {
        if (!params || !params.length) return '';
        const time = params[0].axisValue;
        const req = params.find((p) => p.seriesName === 'Required FTE')?.value ?? 0;
        const sup = params.find((p) => p.seriesName === 'Available Supply FTE')?.value ?? 0;
        const diff = (sup - req).toFixed(1);
        const diffColor = diff >= 0 ? '#10b981' : '#ef4444';
        const diffLabel = diff >= 0 ? `+${diff} (Surplus)` : `${diff} (Deficit)`;

        return `
          <div style="font-weight: 600; margin-bottom: 4px;">Interval: ${time}</div>
          <div style="display:flex; justify-content:space-between; gap:16px;">
            <span style="color:#f59e0b;">Required FTE:</span>
            <strong>${req}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; gap:16px;">
            <span style="color:#3b82f6;">Available Supply FTE:</span>
            <strong>${sup}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; gap:16px; margin-top:4px; padding-top:4px; border-top:1px solid ${tooltipBorder};">
            <span>Staffing Variance:</span>
            <strong style="color:${diffColor};">${diffLabel}</strong>
          </div>
        `;
      },
    },
    legend: {
      data: ['Required FTE', 'Available Supply FTE'],
      textStyle: { color: textColor, fontSize: 11, fontFamily: 'DM Sans, sans-serif' },
      top: 0,
      right: 10,
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: '8%',
      top: '12%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: times,
      axisLine: { lineStyle: { color: gridLineColor } },
      axisTick: { alignWithLabel: true },
      axisLabel: { color: textColor, fontSize: 10, interval: 3 },
    },
    yAxis: {
      type: 'value',
      name: 'FTE (Headcount Equivalent)',
      nameTextStyle: { color: textColor, fontSize: 10 },
      splitLine: { lineStyle: { color: gridLineColor } },
      axisLabel: { color: textColor, fontSize: 10 },
    },
    series: [
      {
        name: 'Required FTE',
        type: 'line',
        smooth: true,
        data: requiredFTEs,
        itemStyle: { color: '#f59e0b' },
        lineStyle: { width: 2.5 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245, 158, 11, 0.25)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0.02)' },
            ],
          },
        },
      },
      {
        name: 'Available Supply FTE',
        type: 'line',
        smooth: true,
        data: supplyFTEs,
        itemStyle: { color: '#3b82f6' },
        lineStyle: { width: 2.5 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.25)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.02)' },
            ],
          },
        },
      },
    ],
  };

  // 2. Prepare Data for Net Staffing Variance Bar Chart (Over vs Under Staffed)
  const varianceBarOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      textStyle: { color: tooltipText, fontSize: 12, fontFamily: 'DM Sans, sans-serif' },
      formatter: (params) => {
        if (!params || !params.length) return '';
        const time = params[0].axisValue;
        const val = params[0].value;
        const status = val >= 0 ? 'Surplus (Over-Staffed)' : 'Deficit (Under-Staffed)';
        const color = val >= 0 ? '#10b981' : '#ef4444';
        return `
          <div style="font-weight: 600; margin-bottom: 2px;">Interval: ${time}</div>
          <div style="color: ${color}; font-weight: bold;">${status}: ${val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)} FTE</div>
        `;
      },
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: '8%',
      top: '12%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: times,
      axisLine: { lineStyle: { color: gridLineColor } },
      axisTick: { alignWithLabel: true },
      axisLabel: { color: textColor, fontSize: 10, interval: 3 },
    },
    yAxis: {
      type: 'value',
      name: 'Variance FTE (+Surplus / -Deficit)',
      nameTextStyle: { color: textColor, fontSize: 10 },
      splitLine: { lineStyle: { color: gridLineColor } },
      axisLabel: { color: textColor, fontSize: 10 },
    },
    series: [
      {
        name: 'Variance FTE',
        type: 'bar',
        data: variances.map((v) => ({
          value: v,
          itemStyle: {
            color: v >= 0 ? '#10b981' : '#ef4444',
            borderRadius: v >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3],
          },
        })),
      },
    ],
  };

  // 3. Shrinkage Donut Chart
  const weekly = summaryData?.weekly_totals || {};
  const productiveHours = weekly.productive_hours || weekly.productive_channels_hours || 0;
  const inOfficeHours = weekly.in_office_shrinkage_hours || 0;
  const outOfficeHours = weekly.out_of_office_shrinkage_hours || 0;
  const downtimeHours = weekly.other_downtime_hours || 0;

  const shrinkageOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      textStyle: { color: tooltipText, fontSize: 12 },
      formatter: '{b}: <strong>{c} hrs</strong> ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 5,
      top: 'center',
      textStyle: { color: textColor, fontSize: 10, fontFamily: 'DM Sans, sans-serif' },
    },
    series: [
      {
        name: 'Hours Distribution',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold',
            formatter: '{d}%',
            color: tooltipText,
          },
        },
        data: [
          { value: Number(productiveHours.toFixed(1)), name: 'Productive Channels', itemStyle: { color: '#3b82f6' } },
          { value: Number(inOfficeHours.toFixed(1)), name: 'In-Office Shrinkage', itemStyle: { color: '#f59e0b' } },
          { value: Number(outOfficeHours.toFixed(1)), name: 'Out-of-Office Shrinkage', itemStyle: { color: '#ef4444' } },
          { value: Number(downtimeHours.toFixed(1)), name: 'System Downtime / Other', itemStyle: { color: '#8b5cf6' } },
        ],
      },
    ],
  };

  // 4. On-site vs WFH distribution
  const totalHc = staffingData?.total_headcount || 1;
  const onsite = staffingData?.onsite_headcount || 0;
  const wfh = staffingData?.wfh_headcount || 0;
  const onsitePct = Math.round((onsite / totalHc) * 100);
  const wfhPct = Math.round((wfh / totalHc) * 100);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Chart Row: Supply vs Demand Curve (Full Width) */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Base Plan: Required Demand vs. Available Supply Curve (30-Minute Intervals)
            </h3>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            {selectedDayLabel || 'All Intervals'}
          </span>
        </div>
        <ReactECharts
          option={supplyDemandOption}
          style={{ height: '320px', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>

      {/* Second Row: Staffing Variance + Shrinkage Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interval Staffing Variance Bar Chart (Takes 2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Interval Staffing Variance (+Surplus Over-Staffed / -Deficit Under-Staffed)
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Over-Staffed
              </span>
              <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Under-Staffed (SLA Risk)
              </span>
            </div>
          </div>
          <ReactECharts
            option={varianceBarOption}
            style={{ height: '240px', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>

        {/* Shrinkage & Activity Distribution Donut Chart (Takes 1 col) */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PieIcon className="w-4 h-4 text-purple-500" />
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Hours & Shrinkage Rollup
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              Breakdown of total scheduled hours by operational activity
            </p>
            <ReactECharts
              option={shrinkageOption}
              style={{ height: '170px', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </div>

          {/* Onsite vs WFH mini widget */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-500" /> On-site vs. WFH Split
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {onsite} on-site / {wfh} WFH
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
              <div
                style={{ width: `${onsitePct}%` }}
                className="bg-indigo-500 h-full"
                title={`On-site: ${onsitePct}%`}
              />
              <div
                style={{ width: `${wfhPct}%` }}
                className="bg-emerald-500 h-full"
                title={`WFH: ${wfhPct}%`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
