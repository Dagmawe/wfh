import React from 'react';
import { 
  Building2, 
  Calendar, 
  Sparkles, 
  Sun, 
  Moon, 
  Database, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';

export default function Header({
  clients = [],
  availableWeeks = ['2026-08-24'],
  selectedClient,
  onSelectClient,
  selectedWeek,
  onSelectWeek,
  selectedDay,
  onSelectDay,
  daysList = [],
  isDark,
  onToggleTheme,
  onOpenChat,
  onRefresh,
  isLoading,
  planMode = 'CURRENT',
  onTogglePlanMode,
}) {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#0c0c0f]/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-[1680px] mx-auto px-6 py-4 flex flex-col gap-3">
        {/* Top bar: Brand + Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                  WFM Enterprise Intelligence
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <Database className="w-3 h-3" /> BigQuery Grounded
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3" /> SLA 80/20 Standard
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Single-Client Base Planning, Interval Variance, SLA Health & Optimization
              </p>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2.5">
            {/* Plan Mode Toggle Pill (Current Baseline vs. AI Optimized Plan) */}
            <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => onTogglePlanMode && onTogglePlanMode('CURRENT')}
                title="View Current Raw Baseline Schedule"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  planMode === 'CURRENT'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 shadow-sm border border-zinc-200/60 dark:border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${planMode === 'CURRENT' ? 'bg-amber-500 ring-2 ring-amber-500/20' : 'bg-zinc-400'}`} />
                <span>Current Baseline</span>
              </button>
              <button
                type="button"
                onClick={() => onTogglePlanMode && onTogglePlanMode('OPTIMIZED')}
                title="View AI Remediated Plan with Zero-Cost Shift & Break Reallocations"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  planMode === 'OPTIMIZED'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${planMode === 'OPTIMIZED' ? 'text-amber-300' : 'text-zinc-400'}`} />
                <span>AI Optimized Plan</span>
              </button>
            </div>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh BigQuery Data"
              className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
            </button>

            <button
              onClick={onToggleTheme}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors shadow-sm"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="font-medium">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="font-medium">Dark Mode</span>
                </>
              )}
            </button>

            <button
              onClick={onOpenChat}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-sm transition-all hover:shadow-blue-500/25 active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              <span>AI Assistant</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar: Client, Week, Day Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center gap-3">
            {/* Client dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Client:</span>
              <select
                value={selectedClient}
                onChange={(e) => onSelectClient(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs rounded-lg px-2.5 py-1.5 font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                {clients.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name} ({c.mu_name || 'All MUs'})
                  </option>
                ))}
              </select>
            </div>

            {/* Week Commencing dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Week Commencing:
              </span>
              <select
                value={selectedWeek}
                onChange={(e) => onSelectWeek(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs rounded-lg px-2.5 py-1.5 font-medium font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                {availableWeeks.map((w) => (
                  <option key={w} value={w}>
                    {w} (Monday)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Day of Week Tabs */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
            <button
              onClick={() => onSelectDay('ALL')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                selectedDay === 'ALL'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Full Week
            </button>
            {daysList.map((d) => (
              <button
                key={d.date}
                onClick={() => onSelectDay(d.date)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                  selectedDay === d.date
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
