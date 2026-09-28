import React from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Users, 
  ArrowRight, 
  Sparkles, 
  ShieldAlert, 
  HelpCircle 
} from 'lucide-react';

export default function InvestigationDrawer({
  isOpen,
  onClose,
  interval,
  onAskAI,
}) {
  if (!isOpen || !interval) return null;

  const time = interval.interval_time || (interval.timestamp_local ? interval.timestamp_local.slice(11, 16) : 'N/A');
  const dateStr = interval.date || (interval.local_date ? String(interval.local_date).slice(0, 10) : '');
  const req = interval.required_fte ?? 0;
  const sup = interval.supply_fte ?? interval.available_supply_fte ?? 0;
  const variance = interval.net_variance ?? interval.variance_fte ?? (sup - req);
  const isDeficit = variance < -0.05;
  const isCritical = interval.severity === 'CRITICAL' || (req > 0 && Math.abs(variance) / req > 0.15);

  const activities = interval.scheduled_activities || {};
  const rootCauses = interval.root_causes || [];

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white dark:bg-[#0c0c0f] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-40 flex flex-col transition-all">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-sm text-zinc-950 dark:text-zinc-50">
            Interval Investigation: <span className="font-mono text-blue-600 dark:text-blue-400">{time}</span>
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 text-xs">
        {/* Status Callout */}
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-3 ${
            isCritical && isDeficit
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
              : isDeficit
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          {isDeficit ? (
            <ShieldAlert className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-bold text-sm mb-0.5">
              {isCritical && isDeficit ? 'Critical SLA Breach Risk' : isDeficit ? 'Staffing Deficit Warning' : 'Staffing Requirements Met'}
            </div>
            <p className="leading-relaxed opacity-90">
              {isDeficit
                ? `Available supply (${sup.toFixed(1)} FTE) is lower than required demand (${req.toFixed(1)} FTE) by ${Math.abs(variance).toFixed(1)} FTE.`
                : `Supply meets required demand with a buffer of +${variance.toFixed(1)} FTE.`}
            </p>
          </div>
        </div>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 p-3 rounded-lg">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">Required Demand</span>
            <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{req.toFixed(2)} FTE</span>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 p-3 rounded-lg">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">Available Supply</span>
            <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">{sup.toFixed(2)} FTE</span>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 p-3 rounded-lg">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">Variance</span>
            <span className={`text-xl font-bold font-mono ${variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {variance > 0 ? `+${variance.toFixed(2)}` : variance.toFixed(2)} FTE
            </span>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 p-3 rounded-lg">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">Offered Calls / AHT</span>
            <span className="text-base font-bold font-mono text-zinc-800 dark:text-zinc-200">
              {interval.offered_calls ?? '-'} calls / {interval.avg_aht_sec ?? interval.avg_handle_time_sec ?? '-'}s
            </span>
          </div>
        </div>

        {/* Scheduled Activities Breakdown */}
        <div>
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-zinc-500" /> Scheduled Agent Activities in Interval
          </h4>
          {Object.keys(activities).length === 0 ? (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-zinc-500 text-center">
              No detailed activity roster captured for this interval.
            </div>
          ) : (
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
              {Object.entries(activities).map(([activity, count]) => {
                const isOfflineShrinkage =
                  activity.toLowerCase().includes('training') ||
                  activity.toLowerCase().includes('coaching') ||
                  activity.toLowerCase().includes('meeting') ||
                  activity.toLowerCase().includes('break') ||
                  activity.toLowerCase().includes('lunch');

                return (
                  <div key={activity} className="px-3 py-2 flex items-center justify-between bg-white dark:bg-[#0c0c0f]">
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                      {activity}
                      {isOfflineShrinkage && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          Offline
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{count} agents</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Shift Reallocation Flow Card (When in AI Optimized Plan) */}
        {interval.is_remediated && (
          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-amber-500" /> AI Shift Reallocation Flow
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white font-mono">
                {interval.remediation_tier || 'AI Shift'}
              </span>
            </div>

            {/* Visual Donor to Recipient Flow Diagram */}
            <div className="flex items-center gap-2 text-xs bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-0.5">Where Supply Came From (Donor)</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400 leading-tight block text-[11px] truncate">
                  {interval.shift_source || 'Surplus Hours Pool'}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-0.5">Where Supply Went (Target)</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 leading-tight block text-[11px] truncate">
                  {interval.shift_dest || `${time} Queue`}
                </span>
              </div>
            </div>

            <div className="text-zinc-700 dark:text-zinc-300 text-xs leading-relaxed">
              <strong>Exact Action:</strong> {interval.remediation_action}
            </div>

            {interval.original_supply_fte !== undefined && (
              <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/60 flex items-center justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">Baseline Supply: <strong className="line-through">{interval.original_supply_fte.toFixed(1)} FTE</strong></span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">AI Supply: {sup.toFixed(1)} FTE (+{(sup - interval.original_supply_fte).toFixed(1)})</span>
              </div>
            )}
          </div>
        )}

        {/* Root Cause & Remediation Strategy (when un-remediated deficit) */}
        {isDeficit && !interval.is_remediated && (
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5" /> Recommended Remediation Action
            </div>
            <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed text-xs">
              <strong>Tier 1 Optimization:</strong> Reschedule non-customer facing activities (Training, 1:1 Coaching) scheduled between 09:00 and 11:30 to afternoon surplus windows (14:00–17:00) to recover the required FTE without overtime cost.
            </p>
          </div>
        )}
      </div>

      {/* Footer: Ask AI to solve */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
        <button
          onClick={() => {
            const prompt = `Can you analyze the staffing deficit at ${time} on ${dateStr} (Required: ${req} FTE, Available: ${sup} FTE, Net Deficit: ${variance} FTE) and recommend specific agent schedule adjustments to resolve the SLA breach risk?`;
            onAskAI(prompt);
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-sm transition-all hover:shadow-blue-500/25 active:scale-[0.98]"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-200" />
          <span>Ask AI Agent to Optimize This Interval</span>
        </button>
      </div>
    </div>
  );
}
