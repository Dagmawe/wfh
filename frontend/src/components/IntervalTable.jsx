import React, { useState, useMemo } from 'react';
import { 
  Filter, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  PhoneCall, 
  Layers 
} from 'lucide-react';

export default function IntervalTable({
  intervals = [],
  selectedInterval,
  onSelectInterval,
}) {
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'DEFICITS' | 'CRITICAL' | 'SURPLUS'
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    return intervals.filter((item) => {
      const time = item.interval_time || (item.timestamp_local ? item.timestamp_local.slice(11, 16) : '');
      const sup = item.supply_fte ?? item.available_supply_fte ?? 0;
      const req = item.required_fte ?? 0;
      const variance = item.net_variance ?? item.variance_fte ?? (sup - req);
      const isDeficit = variance < -0.05;
      const isCritical = item.severity === 'CRITICAL' || (item.required_fte > 0 && Math.abs(variance) / item.required_fte > 0.15);

      if (searchTerm && !time.includes(searchTerm)) {
        return false;
      }

      if (filterType === 'DEFICITS') return isDeficit;
      if (filterType === 'CRITICAL') return isCritical && isDeficit;
      if (filterType === 'SURPLUS') return !isDeficit;
      return true;
    });
  }, [intervals, filterType, searchTerm]);

  return (
    <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            30-Minute Interval Staffing & SLA Audit Grid
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono">
            {filteredData.length} of {intervals.length} intervals
          </span>
        </div>

        {/* Filters and search */}
        <div className="flex items-center gap-2.5">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search time (e.g. 09:30)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 w-48"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                filterType === 'ALL'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('DEFICITS')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                filterType === 'DEFICITS'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              All Deficits
            </button>
            <button
              onClick={() => setFilterType('CRITICAL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                filterType === 'CRITICAL'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Critical Only
            </button>
            <button
              onClick={() => setFilterType('SURPLUS')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                filterType === 'SURPLUS'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Surplus
            </button>
          </div>
        </div>
      </div>

      {/* Table Container with virtual/scrollable viewport */}
      <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[11px] border-b border-zinc-200 dark:border-zinc-800 z-10">
            <tr>
              <th className="py-2.5 px-4">Interval</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3 text-right">Required Demand</th>
              <th className="py-2.5 px-3 text-right">Available Supply</th>
              <th className="py-2.5 px-3 text-right">Variance (FTE)</th>
              <th className="py-2.5 px-3 text-center">Staffing Status</th>
              <th className="py-2.5 px-3 text-center">SLA Health</th>
              <th className="py-2.5 px-3 text-right">Offered / AHT</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No intervals match the selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredData.map((row, idx) => {
                const time = row.interval_time || (row.timestamp_local ? row.timestamp_local.slice(11, 16) : 'N/A');
                const dateStr = row.date || (row.local_date ? String(row.local_date).slice(0, 10) : '');
                const req = row.required_fte ?? 0;
                const sup = row.supply_fte ?? row.available_supply_fte ?? 0;
                const variance = row.net_variance ?? row.variance_fte ?? (sup - req);
                const isDeficit = variance < -0.05;
                const isCritical = row.severity === 'CRITICAL' || (req > 0 && Math.abs(variance) / req > 0.15);
                const isSelected = selectedInterval && (selectedInterval.interval_time === time && selectedInterval.local_date === row.local_date);

                return (
                  <tr
                    key={idx}
                    onClick={() => onSelectInterval(row)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-900/30'
                        : isCritical && isDeficit
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                    }`}
                  >
                    {/* Time */}
                    <td className="py-2.5 px-4 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {time}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400 font-mono">
                      {dateStr}
                    </td>

                    {/* Required FTE */}
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-zinc-900 dark:text-zinc-200">
                      {req.toFixed(2)}
                    </td>

                    {/* Available Supply FTE */}
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-blue-600 dark:text-blue-400">
                      {sup.toFixed(2)}
                    </td>

                    {/* Variance */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={variance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        {variance > 0 ? `+${variance.toFixed(2)}` : variance.toFixed(2)}
                      </span>
                    </td>

                    {/* Staffing Status badge */}
                    <td className="py-2.5 px-3 text-center">
                      {isCritical && isDeficit ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                          CRITICAL GAP
                        </span>
                      ) : isDeficit ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                          UNDER-STAFFED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          OVER-STAFFED
                        </span>
                      )}
                    </td>

                    {/* SLA Health */}
                    <td className="py-2.5 px-3 text-center">
                      {isDeficit ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" /> Risk
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 80/20 Met
                        </span>
                      )}
                    </td>

                    {/* Offered Calls & AHT */}
                    <td className="py-2.5 px-3 text-right font-mono text-zinc-500 dark:text-zinc-400">
                      {row.offered_calls != null ? `${row.offered_calls} calls` : '-'}
                      {row.avg_handle_time_sec ? ` · ${row.avg_handle_time_sec}s` : ''}
                    </td>

                    {/* Action button */}
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectInterval(row);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
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
  );
}
