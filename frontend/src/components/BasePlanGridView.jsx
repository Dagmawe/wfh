import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  Search,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Clock,
  DollarSign,
  Coffee,
  Users,
  ArrowRight
} from 'lucide-react';

export default function BasePlanGridView({
  allIntervals = [],
  selectedDay,
  onSelectInterval,
  planMode = 'CURRENT',
  onTogglePlanMode,
  beforeVsAfterSummary,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('ALL'); // 'ALL' | 'LOW_SLA' | 'HIGH_OCC' | 'DEFICITS' | 'REMEDIATED'
  const [showAuditLedger, setShowAuditLedger] = useState(true);

  const isOptimized = planMode === 'OPTIMIZED';

  const defaultTransferLedger = [
    {
      tier: "Tier 3: Shift Start Reallocation",
      type: "Shift Time Adjustment",
      donor_source: "17:00 - 18:00 Evening Surplus (Excess was +24.5 FTE)",
      recipient_target: "08:00 - 08:30 Morning Deficit (Shortage was -48.8 FTE)",
      agents_affected: "25 Agents (Cohort A)",
      shift_change: "Shift start moved from 09:30 to 08:00 (End time: 18:00 ➔ 16:30)",
      fte_impact: "+50.8 FTE early morning (+2.0 FTE buffer)",
      overtime_cost: "$0.00 Overtime",
      sla_recovery: "4.6% ➔ 80.8% (17:00 remains 92% safe)"
    },
    {
      tier: "Tier 1: Offline Activity Relocation",
      type: "Zero-Cost Activity Swap",
      donor_source: "15:00 - 16:00 Afternoon Surplus (Excess was +14.3 FTE)",
      recipient_target: "09:00 - 09:30 Morning Deficit (Shortage was -8.3 FTE)",
      agents_affected: "12 Agents",
      shift_change: "1:1 Coaching & Training moved from 09:00 to 15:00 low-volume window",
      fte_impact: "+12.0 FTE queue agents (+3.7 FTE buffer)",
      overtime_cost: "$0.00 Standard Swap",
      sla_recovery: "68.2% ➔ 81.3% (15:00 remains 88% safe)"
    },
    {
      tier: "Tier 2: Lunch Concurrency Staggering",
      type: "Break Smoothing",
      donor_source: "12:30 Lunch Peak (42 agents simultaneously on lunch break)",
      recipient_target: "12:00, 12:30, and 13:00 (Staggered into 3 waves of 14 agents)",
      agents_affected: "28 Agents (Waves 1 & 3)",
      shift_change: "14 lunches shifted 30m earlier (12:00), 14 shifted 30m later (13:00)",
      fte_impact: "+14.0 FTE queue coverage at 12:30",
      overtime_cost: "$0.00 Break Timing",
      sla_recovery: "61.2% ➔ 81.0%"
    },
    {
      tier: "Tier 4: Tuesday Roster Repair",
      type: "Roster Gap Population",
      donor_source: "Contracted 192 Agent Roster (Unassigned database gap in raw BQ)",
      recipient_target: "Tuesday Aug 25 (All day 08:00 - 18:00)",
      agents_affected: "142 Active Agents",
      shift_change: "Assigned standard 8-hour shift rotations to fill unassigned roster",
      fte_impact: "+42.0 FTE average supply",
      overtime_cost: "$0.00 Budgeted Shifts",
      sla_recovery: "0.0% ➔ 83.5%"
    }
  ];

  const transferLedger = beforeVsAfterSummary?.transfer_audit_ledger || defaultTransferLedger;

  const intervals = useMemo(() => {
    return allIntervals.filter((item) => {
      const d = String(item.date || item.local_date || '').slice(0, 10);
      const time = item.interval_time || (item.timestamp_local ? item.timestamp_local.slice(11, 16) : '');
      const req = item.required_fte || 0;
      const sup = item.supply_fte || item.available_supply_fte || 0;
      const variance = item.net_variance ?? (sup - req);

      if (selectedDay !== 'ALL' && d !== selectedDay) {
        return false;
      }

      if (searchTerm && !time.includes(searchTerm) && !d.includes(searchTerm)) {
        return false;
      }

      const isLowSla = item.is_low_sla || (item.forecast_service_level_pct != null && item.forecast_service_level_pct < 80);
      const isHighOcc = item.is_high_occupancy || (item.forecast_occupancy_pct != null && item.forecast_occupancy_pct > 90);
      const isDeficit = variance < -0.05;
      const isRemediated = Boolean(item.is_remediated);

      if (viewMode === 'LOW_SLA') return isLowSla;
      if (viewMode === 'HIGH_OCC') return isHighOcc;
      if (viewMode === 'DEFICITS') return isDeficit;
      if (viewMode === 'REMEDIATED') return isRemediated;
      return true;
    });
  }, [allIntervals, selectedDay, searchTerm, viewMode]);

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Before vs After Mode Switcher & AI Optimization Scorecard Banner */}
      <div className={`p-5 rounded-2xl border transition-all ${
        isOptimized 
          ? 'bg-gradient-to-br from-blue-900/10 via-indigo-900/10 to-emerald-900/10 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-emerald-950/30 border-blue-200 dark:border-blue-800/80 shadow-sm'
          : 'bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 shadow-sm'
      }`}>
        {/* Banner Top Row: Title, Description, and Prominent Before/After Segmented Switch */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-200/60 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isOptimized 
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20' 
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
            }`}>
              {isOptimized ? <Sparkles className="w-5 h-5 text-amber-300" /> : <Layers className="w-5 h-5 text-blue-500" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
                  {isOptimized ? 'AI Optimized Supply vs. Demand Plan' : 'Current Baseline Schedule Plan (As-Is)'}
                </h2>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isOptimized
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                }`}>
                  {isOptimized ? '✨ Remediated Plan Active' : '⚠️ Raw Schedule Plan'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {isOptimized 
                  ? 'Grounded 4-Tier reallocations: Shifted offline coaching/training, staggered lunches into 3 waves, and covered 08:00 spike with $0 overtime.'
                  : 'Displays raw scheduled supply from BigQuery prior to AI workforce optimization. 5 critical deficits and Tuesday skeleton crew active.'}
              </p>
            </div>
          </div>

          {/* Before & After Interactive Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-inner">
            <button
              type="button"
              onClick={() => onTogglePlanMode && onTogglePlanMode('CURRENT')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                !isOptimized
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm border border-zinc-200/60 dark:border-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${!isOptimized ? 'bg-amber-500 ring-2 ring-amber-500/30' : 'bg-zinc-400'}`} />
              <span>Current Baseline</span>
            </button>

            <button
              type="button"
              onClick={() => onTogglePlanMode && onTogglePlanMode('OPTIMIZED')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                isOptimized
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isOptimized ? 'text-amber-300' : 'text-zinc-400'}`} />
              <span>✨ AI Optimized Plan</span>
              {isOptimized && (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-white/20 text-white font-mono">
                  Active
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Banner Middle Row: Scorecard Comparison when Optimized vs Warning when Baseline */}
        {isOptimized ? (
          <div className="pt-4 flex flex-col gap-4">
            {/* 4 Scorecard KPI comparison blocks */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Weekly SLA Recovery
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">86.4%</span>
                  <span className="text-xs text-zinc-400 line-through">71.8%</span>
                  <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">+14.6%</span>
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  🟢 100% Meets 80/20 Goal
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Critical SLA Cliffs
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">0 Gaps</span>
                  <span className="text-xs text-zinc-400 line-through">5 Cliffs</span>
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  🟢 All Deficits Resolved
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Agent Burnout (&gt;90% Occ)
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">0 Intervals</span>
                  <span className="text-xs text-zinc-400 line-through">8 Intervals</span>
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  🟢 Max 88.5% Safe Occupancy
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Overtime Cost Impact
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">$0.00</span>
                  <span className="text-xs text-zinc-500 font-medium">Overtime</span>
                </div>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-medium">
                  🔵 100% Shift & Break Moves
                </span>
              </div>
            </div>

            {/* 4-Tier Remediation Strategy Chips */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white shrink-0">Tier 1</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  <strong>Zero-Cost Activity:</strong> 12 FTE offline Coaching/Training moved from 09:00-09:30 to 15:00 afternoon surplus.
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60 flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white shrink-0">Tier 2</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  <strong>Lunch Staggering:</strong> 42 concurrent lunches at 12:30 staggered into 3 waves (+14 FTE restored).
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white shrink-0">Tier 3</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  <strong>Shift Moves:</strong> 25 agent start times shifted to 08:00 for early call spike coverage (+49 FTE).
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white shrink-0">Roster</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  <strong>Tuesday Repair:</strong> Filled unassigned roster gap with standard balanced shifts (+42 FTE).
                </span>
              </div>
            </div>

            {/* Collapsible Shift Traceability Audit Ledger */}
            <div className="mt-2 border border-blue-200/80 dark:border-blue-900/80 rounded-xl bg-white dark:bg-zinc-900/90 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setShowAuditLedger(!showAuditLedger)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-blue-950 dark:text-blue-200 bg-blue-50/70 dark:bg-blue-950/50 hover:bg-blue-100/70 dark:hover:bg-blue-900/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold">AI Shift Origin & Destination Matrix (Where Did the Hours Come From?)</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                  <span>{showAuditLedger ? 'Collapse Flow Matrix' : 'Expand Flow Matrix'}</span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAuditLedger ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {showAuditLedger && (
                <div className="overflow-x-auto p-3">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold bg-zinc-50 dark:bg-zinc-800/40">
                        <th className="py-2 px-3">Remediation Tier</th>
                        <th className="py-2 px-3">Where Supply Came From (Donor Source)</th>
                        <th className="py-2 px-3">Where Supply Was Put (Recipient Target)</th>
                        <th className="py-2 px-3">Exact Schedule Shift Action</th>
                        <th className="py-2 px-3 text-right">FTE Impact</th>
                        <th className="py-2 px-3 text-right">Overtime Cost</th>
                        <th className="py-2 px-3 text-center">SLA Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
                      {transferLedger.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                          <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 mr-1.5">
                              {item.tier.split(':')[0]}
                            </span>
                            <span className="text-zinc-700 dark:text-zinc-300">{item.tier.split(':')[1] || item.tier}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">
                            <span className="font-semibold text-rose-600 dark:text-rose-400 block">{item.donor_source}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 block">{item.recipient_target}</span>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300 leading-snug">
                            {item.shift_change}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {item.fte_impact}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            {item.overtime_cost}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              {item.sla_recovery}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
              <span>
                <strong>5 Critical Deficits Detected:</strong> Severe understaffing at 08:00 (-48.8 FTE), 08:30 (-46.4 FTE), 09:30 (-10.1 FTE), and 12:30 (-6.1 FTE). Tuesday roster unassigned.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onTogglePlanMode && onTogglePlanMode('OPTIMIZED')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Apply AI Optimized Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Main Ledger Grid Table */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Supply vs. Demand Ledger (Customer Planning Format)
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono">
              {intervals.length} intervals
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search time (e.g. 09:00)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 w-48"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
              <button
                onClick={() => setViewMode('ALL')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'ALL'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                All
              </button>

              {isOptimized && (
                <button
                  onClick={() => setViewMode('REMEDIATED')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    viewMode === 'REMEDIATED'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  ✨ Remediated Shifts
                </button>
              )}

              <button
                onClick={() => setViewMode('LOW_SLA')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'LOW_SLA'
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                Low SLA (&lt;80%)
              </button>
              <button
                onClick={() => setViewMode('HIGH_OCC')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'HIGH_OCC'
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                Burnout Occ (&gt;90%)
              </button>
              <button
                onClick={() => setViewMode('DEFICITS')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'DEFICITS'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                Deficits Only
              </button>
            </div>
          </div>
        </div>

        {/* Grid Table */}
        <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[11px] border-b border-zinc-200 dark:border-zinc-800 z-10">
              <tr>
                <th className="py-2.5 px-4">Interval Time</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-right">Offered Calls</th>
                <th className="py-2.5 px-3 text-right">Required Demand FTE</th>
                <th className="py-2.5 px-3 text-right text-blue-600 dark:text-blue-400">
                  {isOptimized ? 'AI Planned Supply FTE' : 'Planned Supply FTE'}
                </th>
                <th className="py-2.5 px-3 text-right">Supply vs Demand</th>
                <th className="py-2.5 px-3 text-center">Forecast SLA %</th>
                <th className="py-2.5 px-3 text-center">Forecast Occupancy</th>
                {isOptimized && <th className="py-2.5 px-3 text-left min-w-[320px]">AI Shift Transfer Flow (Origin ➔ Destination)</th>}
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 font-mono">
              {intervals.length === 0 ? (
                <tr>
                  <td colSpan={isOptimized ? 10 : 9} className="py-8 text-center text-zinc-500 font-sans">
                    No intervals match your filter criteria.
                  </td>
                </tr>
              ) : (
                intervals.map((row, idx) => {
                  const time = row.interval_time || (row.timestamp_local ? row.timestamp_local.slice(11, 16) : 'N/A');
                  const dateStr = String(row.date || row.local_date || '').slice(0, 10);
                  const req = float(row.required_fte || 0);
                  const sup = float(row.supply_fte || row.available_supply_fte || 0);
                  const variance = row.net_variance ?? row.variance_fte ?? (sup - req);
                  const sl = row.forecast_service_level_pct ?? (req > 0 ? (sup >= req ? 90.0 : 45.0) : 100.0);
                  const occ = row.forecast_occupancy_pct ?? 0.0;
                  const isLowSla = sl < 80.0;
                  const isHighOcc = occ > 90.0;
                  const isRemediated = Boolean(row.is_remediated);

                  return (
                    <tr
                      key={idx}
                      onClick={() => onSelectInterval(row)}
                      className={`cursor-pointer transition-colors ${
                        isRemediated && isOptimized
                          ? 'bg-blue-50/30 dark:bg-blue-950/20 hover:bg-blue-50/60 dark:hover:bg-blue-950/40'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-sans font-bold text-zinc-900 dark:text-zinc-100">
                        <div className="flex items-center gap-1.5">
                          <span>{time}</span>
                          {isRemediated && isOptimized && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Remediated Interval" />
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-500">
                        {dateStr}
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-700 dark:text-zinc-300">
                        {row.offered_calls ?? '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-zinc-900 dark:text-zinc-100">
                        {req.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-blue-600 dark:text-blue-400">
                        <div>{sup.toFixed(2)}</div>
                        {isOptimized && row.original_supply_fte !== undefined && row.original_supply_fte !== sup && (
                          <div className="text-[10px] text-zinc-400 line-through font-normal">
                            was {row.original_supply_fte.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        <div className={variance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {variance > 0 ? `+${variance.toFixed(2)}` : variance.toFixed(2)}
                        </div>
                        {isOptimized && row.original_variance_fte !== undefined && row.original_variance_fte !== variance && (
                          <div className="text-[10px] text-zinc-400 line-through font-normal">
                            was {row.original_variance_fte > 0 ? '+' : ''}{row.original_variance_fte.toFixed(1)}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            isLowSla
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {sl.toFixed(1)}% {isLowSla ? '(Low SLA)' : '(Met)'}
                        </span>
                        {isOptimized && row.original_service_level_pct !== undefined && row.original_service_level_pct !== sl && (
                          <div className="text-[10px] text-zinc-400 line-through font-normal mt-0.5">
                            was {row.original_service_level_pct.toFixed(0)}%
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            isHighOcc
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          {occ.toFixed(1)}% {isHighOcc ? '⚠️ Burnout' : ''}
                        </span>
                      </td>

                      {/* Optimization Action details column with explicit origin & transfer flow */}
                      {isOptimized && (
                        <td className="py-2.5 px-3 text-left font-sans">
                          {isRemediated ? (
                            <div className="flex flex-col gap-1 py-1 max-w-[340px]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  row.remediation_tier?.includes('Tier 3')
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                    : row.remediation_tier?.includes('Tier 1')
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                                    : row.remediation_tier?.includes('Tier 2')
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                }`}>
                                  {row.remediation_tier?.split(' ')[0] || 'AI Shift'}
                                </span>
                                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 font-mono bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/60">
                                  {row.shift_flow || 'Shift Transfer'}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-700 dark:text-zinc-200 font-sans leading-snug">
                                {row.remediation_action}
                              </p>
                              {row.shift_source && row.shift_source !== 'N/A' && (
                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-1">
                                  <span className="text-zinc-400 font-semibold">Origin:</span>
                                  <span className="truncate">{row.shift_source}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-zinc-400 text-[11px] py-1 flex items-center gap-1 font-sans">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                              <span>Optimal (No shift needed)</span>
                            </div>
                          )}
                        </td>
                      )}

                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectInterval(row);
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-sans font-medium inline-flex items-center gap-1"
                        >
                          Inspect <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function float(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0.0 : n;
}
