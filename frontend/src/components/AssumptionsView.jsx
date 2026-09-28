import React, { useState, useEffect } from 'react';
import { Settings2, Calculator, ArrowRight, ShieldCheck, Info, RefreshCw } from 'lucide-react';

export default function AssumptionsView({ selectedClient, selectedWeek }) {
  const [targetOoo, setTargetOoo] = useState(26.0);
  const [targetAbsence, setTargetAbsence] = useState(20.0);
  const [targetHoliday, setTargetHoliday] = useState(6.0);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAssumptions = () => {
    setIsLoading(true);
    const startDate = selectedWeek || '2026-08-24';
    const endD = new Date(`${startDate}T00:00:00`);
    endD.setDate(endD.getDate() + 6);
    const endDate = endD.toISOString().slice(0, 10);

    fetch(
      `/api/wfm/assumptions?client_name=${encodeURIComponent(selectedClient)}&start_date=${startDate}&end_date=${endDate}&target_ooo_shrinkage_pct=${targetOoo}&target_absence_pct=${targetAbsence}&target_holiday_pct=${targetHoliday}`
    )
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchAssumptions();
  }, [selectedClient, selectedWeek, targetOoo, targetAbsence, targetHoliday]);

  const rows = data?.assumptions_table || [];
  const totSched = data?.total_scheduled_hours || 0;
  const totReduction = data?.total_hours_reduction || 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner: Automation & Toil Elimination */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                Automated Shrinkage Assumptions & Hours Reduction
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium">
                  Replaces Manual Excel Formulas
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Eliminates Excel <code>#NAME?</code> reference corruptions by computing current schedule shrinkage vs. assumptions directly from BigQuery.
              </p>
            </div>
          </div>

          <button
            onClick={fetchAssumptions}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Recalculate
          </button>
        </div>

        {/* Interactive Sliders for Assumptions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800/80">
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Out of Office Shrinkage Target</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">{targetOoo.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="40"
              step="0.5"
              value={targetOoo}
              onChange={(e) => setTargetOoo(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-[11px] text-zinc-400">Workbook standard: 26.0%</span>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Target Absence %</span>
              <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-sm">{targetAbsence.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="35"
              step="0.5"
              value={targetAbsence}
              onChange={(e) => setTargetAbsence(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <span className="text-[11px] text-zinc-400">Unplanned / Sickness benchmark: 20.0%</span>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Target Holiday Paid %</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">{targetHoliday.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={targetHoliday}
              onChange={(e) => setTargetHoliday(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-[11px] text-zinc-400">Paid Leave target: 6.0%</span>
          </div>
        </div>
      </div>

      {/* Assumptions Table matching Excel Tab */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Assumptions Calculation Matrix (Replicating Workbook 'Assumptions' Tab)
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">
              Total Scheduled: <strong className="text-zinc-900 dark:text-zinc-100 font-mono">{totSched.toLocaleString()} hrs</strong>
            </span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              Total Hours Reduction: <strong className="font-mono">-{totReduction.toLocaleString()} hrs</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[11px] border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-3 text-right">Scheduled (Hrs)</th>
                <th className="py-3 px-3 text-right bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300">
                  Current OOO %
                </th>
                <th className="py-3 px-3 text-right bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300">
                  Assumption OOO %
                </th>
                <th className="py-3 px-3 text-right">Absence %</th>
                <th className="py-3 px-3 text-right">Holiday %</th>
                <th className="py-3 px-3 text-right bg-zinc-200/50 dark:bg-zinc-800/40">
                  Plan OOO %
                </th>
                <th className="py-3 px-3 text-right text-amber-600 dark:text-amber-400">
                  % To Be Added
                </th>
                <th className="py-3 px-4 text-right bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 font-bold">
                  Hours Reduction
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-zinc-500">
                    No assumption data available for week.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 font-mono">
                    <td className="py-2.5 px-4 font-sans font-medium text-zinc-900 dark:text-zinc-100">
                      {r.date}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-800 dark:text-zinc-200">
                      {r.scheduled_hours.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-right bg-blue-50/30 dark:bg-blue-950/10 font-bold text-blue-600 dark:text-blue-400">
                      {r.current_ooo_shrinkage_pct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right bg-purple-50/30 dark:bg-purple-950/10 font-bold text-purple-600 dark:text-purple-400">
                      {r.assumption_ooo_shrinkage_pct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-600 dark:text-zinc-400">
                      {r.assumption_absence_pct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-600 dark:text-zinc-400">
                      {r.assumption_holiday_pct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right bg-zinc-100/50 dark:bg-zinc-800/20 font-bold text-zinc-900 dark:text-zinc-100">
                      {r.plan_ooo_shrinkage_pct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400 font-bold">
                      +{r.pct_to_add_to_plan.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-4 text-right bg-rose-50/30 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400 font-bold">
                      -{r.hours_reduction.toFixed(1)} hrs
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Formula Explainer Footer */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2 text-xs text-zinc-600 dark:text-zinc-300">
          <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
            <Info className="w-3.5 h-3.5 text-blue-500" /> Standard Calculation Logic:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-5 text-[11px]">
            <div>
              <strong>1. % To Be Added To Plan:</strong> Calculated as <code>MAX(0, Target OOO % - Current OOO %)</code>. This accounts for unbooked future absences.
            </div>
            <div>
              <strong>2. Hours Reduction:</strong> Calculated as <code>Scheduled Hours × (% To Be Added)</code>. Subtracted proportionally from gross channel availability.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
