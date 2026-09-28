import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Users,
  Clock,
  Coffee,
  Utensils,
  Search,
  Filter,
  Download,
  AlertTriangle,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Info,
  Layers,
  GraduationCap
} from 'lucide-react';

export default function WeeklyStaffingView({
  selectedClient,
  selectedWeek,
  selectedDay: propSelectedDay,
  daysList,
  isDark,
  onOpenChat,
}) {
  // If the user picked a specific day globally, use it; otherwise default to Monday
  const defaultDate = (daysList && daysList.length > 0) ? daysList[0].date : (selectedWeek || '2026-08-24');
  const [activeDate, setActiveDate] = useState(
    propSelectedDay && propSelectedDay !== 'ALL' ? propSelectedDay : defaultDate
  );

  // Sync if prop changes and is not 'ALL'
  useEffect(() => {
    if (propSelectedDay && propSelectedDay !== 'ALL') {
      setActiveDate(propSelectedDay);
    }
  }, [propSelectedDay]);

  const [scheduleData, setScheduleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState('ALL'); // 'ALL' | 'BREAKS' | 'LUNCH' | 'TRAINING'
  const [viewMode, setViewMode] = useState('TIMELINE'); // 'TIMELINE' | 'LEDGER'

  // Pagination for large rosters
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  // Timeline reference window (06:00 to 18:30 = 12.5 hrs = 750 mins)
  const TIMELINE_START_MINUTES = 6 * 60; // 06:00 = 360
  const TIMELINE_END_MINUTES = 18 * 60 + 30; // 18:30 = 1110
  const TOTAL_TIMELINE_SPAN = TIMELINE_END_MINUTES - TIMELINE_START_MINUTES; // 750 minutes

  // Fetch schedule and break concurrency from API
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const startDate = selectedWeek || '2026-08-24';
    const endD = new Date(`${startDate}T00:00:00`);
    endD.setDate(endD.getDate() + 6);
    const endDate = endD.toISOString().slice(0, 10);

    fetch(
      `/api/wfm/weekly-staffing-schedule?client_name=${encodeURIComponent(
        selectedClient
      )}&target_date=${activeDate}&start_date=${startDate}&end_date=${endDate}`
    )
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setScheduleData(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load weekly staffing schedule:', err);
          setError(err.message || 'Error loading schedule');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedClient, selectedWeek, activeDate]);

  // Convert "HH:MM" string to minutes from 00:00
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length < 2) return 0;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  // Filter agent schedules
  const filteredAgents = useMemo(() => {
    if (!scheduleData || !scheduleData.agent_schedules) return [];
    return scheduleData.agent_schedules.filter((agent) => {
      const matchSearch =
        !searchTerm ||
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(agent.person_id).includes(searchTerm) ||
        (agent.job_title && agent.job_title.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchActivity = true;
      if (activityFilter === 'BREAKS') {
        matchActivity = agent.activities?.some((a) => a.category === 'BREAK');
      } else if (activityFilter === 'LUNCH') {
        matchActivity = agent.activities?.some((a) => a.category === 'LUNCH');
      } else if (activityFilter === 'TRAINING') {
        matchActivity = agent.activities?.some(
          (a) => a.category === 'TRAINING' || a.category === 'COACHING'
        );
      }

      return matchSearch && matchActivity;
    });
  }, [scheduleData, searchTerm, activityFilter]);

  const totalPages = Math.ceil(filteredAgents.length / pageSize) || 1;
  const paginatedAgents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAgents.slice(start, start + pageSize);
  }, [filteredAgents, currentPage, pageSize]);

  // Reset page on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activityFilter, activeDate]);

  // Summary Metrics
  const summary = scheduleData?.summary || {
    total_staffed_agents: 0,
    total_scheduled_hours: 0,
    total_productive_hours: 0,
    total_break_hours: 0,
    peak_break_interval: '12:30',
    peak_break_agents: 0,
  };

  const productiveShare =
    summary.total_scheduled_hours > 0
      ? ((summary.total_productive_hours / summary.total_scheduled_hours) * 100).toFixed(1)
      : '0';

  // Prepare Interval Distribution EChart Option
  const intervals = scheduleData?.intervals_distribution || [];
  const times = intervals.map((i) => i.interval_time || '');
  const availableData = intervals.map((i) => i.available_agents || 0);
  const breakData = intervals.map((i) => i.break_agents || 0);
  const lunchData = intervals.map((i) => i.lunch_agents || 0);
  const trainingData = intervals.map((i) => i.training_agents || 0);
  const backOfficeData = intervals.map((i) => i.back_office_agents || 0);

  const textColor = isDark ? '#d4d4d8' : '#3f3f46';
  const gridLineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tooltipBg = isDark ? '#18181b' : '#ffffff';
  const tooltipBorder = isDark ? '#27272a' : '#e4e4e7';
  const tooltipText = isDark ? '#fafafa' : '#09090b';

  const chartOption = {
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
        let html = `<div style="font-weight:700; margin-bottom:6px; border-bottom:1px solid ${tooltipBorder}; padding-bottom:4px;">Interval: ${time}</div>`;
        let total = 0;
        let offPhone = 0;
        params.forEach((p) => {
          total += Number(p.value || 0);
          if (p.seriesName === 'Lunch' || p.seriesName === '15-min Break') {
            offPhone += Number(p.value || 0);
          }
          html += `
            <div style="display:flex; justify-content:space-between; gap:16px; font-size:11px; margin-top:2px;">
              <span style="color:${p.color};">${p.marker} ${p.seriesName}:</span>
              <strong style="font-family:monospace;">${p.value} agents</strong>
            </div>
          `;
        });
        const breakPct = total > 0 ? ((offPhone / total) * 100).toFixed(0) : 0;
        html += `
          <div style="display:flex; justify-content:space-between; gap:16px; font-size:11px; margin-top:6px; padding-top:4px; border-top:1px solid ${tooltipBorder}; color:#f43f5e; font-weight:600;">
            <span>Total on Break / Lunch:</span>
            <span>${offPhone} (${breakPct}%)</span>
          </div>
        `;
        return html;
      },
    },
    legend: {
      data: ['Available (On-Phone)', 'Lunch', '15-min Break', 'Training & Coaching', 'Back Office'],
      textStyle: { color: textColor, fontSize: 11, fontFamily: 'DM Sans, sans-serif' },
      bottom: 0,
    },
    grid: {
      left: '2%',
      right: '2%',
      top: '12%',
      bottom: '14%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: times,
      axisLine: { lineStyle: { color: isDark ? '#3f3f46' : '#d4d4d8' } },
      axisLabel: { color: textColor, fontSize: 10, rotate: 45 },
    },
    yAxis: {
      type: 'value',
      name: 'Agent Count',
      nameTextStyle: { color: textColor, fontSize: 10 },
      splitLine: { lineStyle: { color: gridLineColor } },
      axisLabel: { color: textColor, fontSize: 10 },
    },
    series: [
      {
        name: 'Available (On-Phone)',
        type: 'bar',
        stack: 'total',
        data: availableData,
        itemStyle: { color: '#10b981' },
      },
      {
        name: 'Lunch',
        type: 'bar',
        stack: 'total',
        data: lunchData,
        itemStyle: { color: '#f59e0b' },
      },
      {
        name: '15-min Break',
        type: 'bar',
        stack: 'total',
        data: breakData,
        itemStyle: { color: '#f43f5e' },
      },
      {
        name: 'Training & Coaching',
        type: 'bar',
        stack: 'total',
        data: trainingData,
        itemStyle: { color: '#8b5cf6' },
      },
      {
        name: 'Back Office',
        type: 'bar',
        stack: 'total',
        data: backOfficeData,
        itemStyle: { color: '#64748b' },
      },
    ],
  };

  // CSV Export Function
  const handleExportCSV = () => {
    if (!scheduleData || !scheduleData.agent_schedules) return;
    const headers = [
      'Person ID',
      'Name',
      'Job Title',
      'Shift Date',
      'Shift Start',
      'Shift End',
      'Total Sched Hours',
      'Productive Hours',
      'Break Mins',
      'Activities Count',
    ];
    const rows = scheduleData.agent_schedules.map((a) => [
      a.person_id,
      `"${a.name}"`,
      `"${a.job_title || ''}"`,
      a.shift_date,
      a.shift_start,
      a.shift_end,
      a.total_scheduled_hours,
      a.productive_hours,
      a.total_break_minutes,
      a.activities ? a.activities.length : 0,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `WFM_Staffing_Shifts_${activeDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Activity Category styling helper
  const getActivityColor = (category) => {
    switch (category) {
      case 'AVAILABLE':
        return 'bg-emerald-500 hover:bg-emerald-400 text-white';
      case 'LUNCH':
        return 'bg-amber-500 hover:bg-amber-400 text-white';
      case 'BREAK':
        return 'bg-rose-500 hover:bg-rose-400 text-white';
      case 'TRAINING':
      case 'COACHING':
        return 'bg-purple-500 hover:bg-purple-400 text-white';
      case 'TIME_OFF':
        return 'bg-zinc-400 hover:bg-zinc-300 text-zinc-900';
      default:
        return 'bg-slate-500 hover:bg-slate-400 text-white';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Day Selector Navigation Bar */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mr-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            Select Day:
          </span>
          {daysList && daysList.length > 0 ? (
            daysList.map((d) => {
              const isSelected = d.date === activeDate;
              return (
                <button
                  key={d.date}
                  onClick={() => setActiveDate(d.date)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'bg-zinc-100 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span>{d.label}</span>
                </button>
              );
            })
          ) : (
            <span className="text-xs text-zinc-400 font-mono">{activeDate}</span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (onOpenChat) {
                onOpenChat(
                  `Analyze break and lunch concurrency for ${activeDate}. Are simultaneous lunch schedules at ${summary.peak_break_interval} causing an SLA deficit? How can we smooth offline hours?`
                );
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span>AI Break Audit</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium rounded-lg transition-colors border border-zinc-200 dark:border-zinc-700"
            title="Download CSV of shifts & breaks"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Staffed Agents */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Staffed Agents
            </span>
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono text-zinc-950 dark:text-zinc-50">
            {isLoading ? '...' : summary.total_staffed_agents}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-mono">
            Active Roster on {activeDate}
          </div>
        </div>

        {/* Card 2: Total Hours & Productive Hours */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Scheduled vs Productive
            </span>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
              {isLoading ? '...' : summary.total_productive_hours}h
            </span>
            <span className="text-xs text-zinc-400">/ {summary.total_scheduled_hours}h sched</span>
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
            {productiveShare}% Channel Utilization
          </div>
        </div>

        {/* Card 3: Total Break & Lunch Time */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Total Breaks & Lunch
            </span>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
            {isLoading ? '...' : summary.total_break_hours} <span className="text-sm font-normal text-zinc-500">hrs</span>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            Includes 15-min rest & 30-min lunch
          </div>
        </div>

        {/* Card 4: Concurrency Peak Warning */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Peak Break Concurrency
            </span>
            <div className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono text-rose-600 dark:text-rose-400">
            {isLoading ? '...' : `${summary.peak_break_agents} agents`}
          </div>
          <div className="text-xs text-rose-600 dark:text-rose-400 mt-2 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Peak window at {summary.peak_break_interval}</span>
          </div>
        </div>
      </div>

      {/* Break & Activity Concurrency Distribution Chart */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>30-Minute Break & Activity Concurrency Distribution</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Tracks how 15-minute breaks, lunches, and offline training cluster throughout operating hours (06:00 - 18:00)
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> On-Phone
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Lunch
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> Break
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span> Training
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ReactECharts
            option={chartOption}
            style={{ height: '100%', width: '100%' }}
            notMerge={true}
            lazyUpdate={true}
          />
        </div>
      </div>

      {/* Agent Shift Timeline & Ledger Controls */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span>Agent Shift Schedules & Break Timeline</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Showing {filteredAgents.length} scheduled agents for {activeDate}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
              <button
                onClick={() => setViewMode('TIMELINE')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  viewMode === 'TIMELINE'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                Gantt Timeline
              </button>
              <button
                onClick={() => setViewMode('LEDGER')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  viewMode === 'LEDGER'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                Roster Table
              </button>
            </div>

            {/* Activity Category Filter */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none text-xs"
              >
                <option value="ALL">All Staffed</option>
                <option value="BREAKS">Has 15-min Break</option>
                <option value="LUNCH">Has Lunch Scheduled</option>
                <option value="TRAINING">Has Training/Offline</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search agent name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-52"
              />
            </div>
          </div>
        </div>

        {/* VIEW 1: GANTT TIMELINE VIEW */}
        {viewMode === 'TIMELINE' && (
          <div className="mt-4 flex flex-col gap-3">
            {/* Timeline Header (Hours scale 06:00 to 18:30) */}
            <div className="grid grid-cols-12 gap-2 text-[10px] text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-2 px-2 font-mono">
              <div className="col-span-3 text-xs font-sans text-zinc-500 font-semibold">
                Agent / Position
              </div>
              <div className="col-span-9 relative flex justify-between pr-2">
                <span>06:00</span>
                <span>08:00</span>
                <span>10:00</span>
                <span>12:00</span>
                <span>14:00</span>
                <span>16:00</span>
                <span>18:30</span>
              </div>
            </div>

            {/* Agent Timeline Rows */}
            {isLoading ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                Loading agent shift segments from BigQuery...
              </div>
            ) : paginatedAgents.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                No staffed agents match the selected search or activity filters.
              </div>
            ) : (
              <div className="flex flex-col gap-2 divide-y divide-zinc-100 dark:divide-zinc-900">
                {paginatedAgents.map((agent) => {
                  return (
                    <div
                      key={agent.person_id}
                      className="grid grid-cols-12 gap-2 items-center pt-2 px-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 rounded-lg transition-colors group"
                    >
                      {/* Left: Agent Info */}
                      <div className="col-span-3 min-w-0 pr-2">
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {agent.name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                          <span className="font-mono">ID: {agent.person_id}</span>
                          <span>•</span>
                          <span className="font-mono text-blue-600 dark:text-blue-400">
                            {agent.shift_start} - {agent.shift_end}
                          </span>
                        </div>
                      </div>

                      {/* Right: Gantt Schedule Bar */}
                      <div className="col-span-9 relative h-7 bg-zinc-100 dark:bg-zinc-900 rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-800/80">
                        {/* Hour reference background guidelines */}
                        <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
                          <div className="w-px h-full bg-zinc-400"></div>
                          <div className="w-px h-full bg-zinc-400"></div>
                          <div className="w-px h-full bg-zinc-400"></div>
                          <div className="w-px h-full bg-zinc-400"></div>
                          <div className="w-px h-full bg-zinc-400"></div>
                          <div className="w-px h-full bg-zinc-400"></div>
                        </div>

                        {/* Activity Segments */}
                        {agent.activities &&
                          agent.activities.map((act, idx) => {
                            const startM = timeToMinutes(act.start_time);
                            const endM = timeToMinutes(act.end_time);

                            // Calculate % offset and width relative to 06:00 - 18:30 (750 mins)
                            const leftOffset = Math.max(
                              0,
                              ((startM - TIMELINE_START_MINUTES) / TOTAL_TIMELINE_SPAN) * 100
                            );
                            const rightEdge = Math.min(
                              100,
                              ((endM - TIMELINE_START_MINUTES) / TOTAL_TIMELINE_SPAN) * 100
                            );
                            const widthPct = Math.max(0.5, rightEdge - leftOffset);

                            if (endM < TIMELINE_START_MINUTES || startM > TIMELINE_END_MINUTES) {
                              return null;
                            }

                            return (
                              <div
                                key={idx}
                                style={{
                                  left: `${leftOffset}%`,
                                  width: `${widthPct}%`,
                                }}
                                className={`absolute top-0 bottom-0 ${getActivityColor(
                                  act.category
                                )} flex items-center justify-center text-[9px] font-bold transition-all cursor-pointer group/seg`}
                                title={`${act.activity}: ${act.start_time} - ${act.end_time} (${act.duration_minutes}m)`}
                              >
                                {widthPct > 8 && (
                                  <span className="truncate px-1 opacity-90">
                                    {act.category === 'LUNCH'
                                      ? 'Lunch'
                                      : act.category === 'BREAK'
                                      ? 'Brk'
                                      : act.activity}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-3 px-2 mt-2">
              <span className="text-xs text-zinc-500">
                Showing {paginatedAgents.length} of {filteredAgents.length} agents
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-800 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5 inline mr-1" />
                  Prev
                </button>
                <span className="text-xs font-mono text-zinc-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-800 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 inline ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: ROSTER TABLE / LEDGER VIEW */}
        {viewMode === 'LEDGER' && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Agent</th>
                  <th className="py-2.5 px-3">Job Title</th>
                  <th className="py-2.5 px-3 font-mono">Shift Window</th>
                  <th className="py-2.5 px-3 font-mono text-right">Sched Hrs</th>
                  <th className="py-2.5 px-3 font-mono text-right">Prod Hrs</th>
                  <th className="py-2.5 px-3 font-mono text-right">Break Mins</th>
                  <th className="py-2.5 px-3">Activity Segments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {paginatedAgents.map((agent) => (
                  <tr
                    key={agent.person_id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    <td className="py-2 px-3 font-medium text-zinc-900 dark:text-zinc-100">
                      <div>{agent.name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">ID: {agent.person_id}</div>
                    </td>
                    <td className="py-2 px-3 text-zinc-500">{agent.job_title || 'CSR'}</td>
                    <td className="py-2 px-3 font-mono text-blue-600 dark:text-blue-400 font-semibold">
                      {agent.shift_start} - {agent.shift_end}
                    </td>
                    <td className="py-2 px-3 font-mono text-right text-zinc-700 dark:text-zinc-300">
                      {agent.total_scheduled_hours}h
                    </td>
                    <td className="py-2 px-3 font-mono text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                      {agent.productive_hours}h
                    </td>
                    <td className="py-2 px-3 font-mono text-right text-amber-600 dark:text-amber-400 font-semibold">
                      {agent.total_break_minutes}m
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        {agent.activities?.map((act, i) => (
                          <span
                            key={i}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${getActivityColor(
                              act.category
                            )}`}
                            title={`${act.start_time} - ${act.end_time}`}
                          >
                            {act.activity}: {act.duration_minutes}m
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-3 px-2 mt-2">
              <span className="text-xs text-zinc-500">
                Showing {paginatedAgents.length} of {filteredAgents.length} agents
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-800 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5 inline mr-1" />
                  Prev
                </button>
                <span className="text-xs font-mono text-zinc-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-800 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 inline ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
