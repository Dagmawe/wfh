import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, Building, Laptop, Clock, ShieldCheck, Filter, Download } from 'lucide-react';

export default function AgentRosterView({ selectedClient, selectedWeek }) {
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('ALL'); // 'ALL' | 'ONSITE' | 'WFH'

  const startDate = selectedWeek || '2026-08-24';
  const endD = new Date(`${startDate}T00:00:00`);
  endD.setDate(endD.getDate() + 6);
  const endDate = endD.toISOString().slice(0, 10);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/wfm/agents?client_name=${encodeURIComponent(selectedClient)}&start_date=${startDate}&end_date=${endDate}`)
      .then((res) => res.json())
      .then((json) => {
        setAgents(json.agents || []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, [selectedClient, selectedWeek, startDate, endDate]);

  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      const matchSearch =
        !searchTerm ||
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(a.person_id).includes(searchTerm) ||
        String(a.login_id).includes(searchTerm) ||
        (a.email && a.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchLocation =
        locationFilter === 'ALL'
          ? true
          : locationFilter === 'WFH'
          ? a.is_wfh
          : !a.is_wfh;

      return matchSearch && matchLocation;
    });
  }, [agents, searchTerm, locationFilter]);

  const totalHeadcount = agents.length;
  const totalHours = agents.reduce((acc, a) => acc + (a.total_scheduled_hours || 0), 0);
  const avgHours = totalHeadcount > 0 ? (totalHours / totalHeadcount).toFixed(1) : 0;
  const totalProd = agents.reduce((acc, a) => acc + (a.productive_hours || 0), 0);
  const totalShrink = agents.reduce((acc, a) => acc + (a.shrinkage_hours || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Roster Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
            Total Active Agents
          </div>
          <div className="text-3xl font-extrabold font-mono text-zinc-950 dark:text-zinc-50">
            {totalHeadcount}
          </div>
          <div className="text-xs text-zinc-400 mt-2 font-mono">
            Target Week: {startDate} to {endDate}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
            Average Weekly Hours
          </div>
          <div className="text-3xl font-extrabold font-mono text-blue-600 dark:text-blue-400">
            {avgHours} <span className="text-sm font-normal text-zinc-500">hrs/agent</span>
          </div>
          <div className="text-xs text-zinc-400 mt-2">
            Total: {totalHours.toLocaleString()} Scheduled Hours
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
            Productive Channel Hours
          </div>
          <div className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
            {totalProd.toLocaleString()} <span className="text-sm font-normal text-zinc-500">hrs</span>
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
            {totalHours > 0 ? ((totalProd / totalHours) * 100).toFixed(1) : 0}% Productive Share
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
            Shrinkage Hours
          </div>
          <div className="text-3xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
            {totalShrink.toLocaleString()} <span className="text-sm font-normal text-zinc-500">hrs</span>
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
            {totalHours > 0 ? ((totalShrink / totalHours) * 100).toFixed(1) : 0}% Total Shrinkage
          </div>
        </div>
      </div>

      {/* Agents Table */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Weekly Scheduled Agent Roster
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono">
              {filteredAgents.length} agents
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search agent name, ID, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 w-64"
              />
            </div>

            {/* Location filter */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
              <button
                onClick={() => setLocationFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  locationFilter === 'ALL'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                All Sites
              </button>
              <button
                onClick={() => setLocationFilter('ONSITE')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  locationFilter === 'ONSITE'
                    ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                On-site Only
              </button>
              <button
                onClick={() => setLocationFilter('WFH')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  locationFilter === 'WFH'
                    ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                WFH Only
              </button>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[11px] border-b border-zinc-200 dark:border-zinc-800 z-10">
              <tr>
                <th className="py-2.5 px-4">Agent Name</th>
                <th className="py-2.5 px-3">Person ID / Login</th>
                <th className="py-2.5 px-3">Job Title</th>
                <th className="py-2.5 px-3">Management Unit (Site)</th>
                <th className="py-2.5 px-3 text-center">Days</th>
                <th className="py-2.5 px-3 text-right">Scheduled (Hrs)</th>
                <th className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">Productive (Hrs)</th>
                <th className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">Shrinkage (Hrs)</th>
                <th className="py-2.5 px-4">Productivity Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-zinc-500">
                    No agents match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAgents.map((agent) => {
                  const prodRatio = agent.total_scheduled_hours > 0
                    ? Math.round((agent.productive_hours / agent.total_scheduled_hours) * 100)
                    : 0;

                  return (
                    <tr key={agent.person_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="py-2.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        {agent.name}
                        {agent.email && (
                          <span className="block text-[11px] font-normal text-zinc-400 font-mono">
                            {agent.email}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-zinc-600 dark:text-zinc-400">
                        {agent.person_id} · <span className="text-zinc-400">{agent.login_id}</span>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300">
                        {agent.job_title || 'Advisor'}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1">
                          {agent.is_wfh ? (
                            <Laptop className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Building className="w-3 h-3 text-indigo-500" />
                          )}
                          {agent.mu_name}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-medium text-zinc-800 dark:text-zinc-200">
                        {agent.days_scheduled}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {agent.total_scheduled_hours.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                        {agent.productive_hours.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-600 dark:text-amber-400 font-medium">
                        {agent.shrinkage_hours.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
                            <div
                              style={{ width: `${prodRatio}%` }}
                              className="bg-emerald-500 h-full rounded-full"
                            />
                          </div>
                          <span className="font-mono text-[11px] text-zinc-500">
                            {prodRatio}%
                          </span>
                        </div>
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
