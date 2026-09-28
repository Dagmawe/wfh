import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import KPICards from './components/KPICards';
import SlaRiskHeatmap from './components/SlaRiskHeatmap';
import ChartsSection from './components/ChartsSection';
import IntervalTable from './components/IntervalTable';
import BasePlanGridView from './components/BasePlanGridView';
import AssumptionsView from './components/AssumptionsView';
import AgentRosterView from './components/AgentRosterView';
import WeeklyStaffingView from './components/WeeklyStaffingView';
import InvestigationDrawer from './components/InvestigationDrawer';
import ChatPanel from './components/ChatPanel';
import { 
  AlertCircle, 
  BarChart3, 
  Layers, 
  Sliders, 
  Users, 
  Sparkles,
  CalendarClock
} from 'lucide-react';

export default function App() {
  const [clients, setClients] = useState([
    { id: 'client_x', name: 'Client X', mu_name: 'Client X Ncondo Durban ZAF', available_weeks: ['2026-08-24'], default_week: '2026-08-24' },
  ]);
  const [availableWeeks, setAvailableWeeks] = useState(['2026-08-24']);
  const [selectedClient, setSelectedClient] = useState('Client X');
  const [selectedWeek, setSelectedWeek] = useState('2026-08-24');
  const [selectedDay, setSelectedDay] = useState('ALL');

  // Dynamically compute the 7 days of the selected week commencing date
  const daysList = useMemo(() => {
    if (!selectedWeek) return [];
    const list = [];
    const baseDate = new Date(`${selectedWeek}T00:00:00`);
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const label = `${dayNames[i]} ${monthNames[d.getMonth()]} ${d.getDate()}`;
      list.push({ date: iso, label });
    }
    return list;
  }, [selectedWeek]);

  // Navigation Tabs: 'DASHBOARD' | 'BASE_PLAN' | 'ASSUMPTIONS' | 'AGENTS'
  const [activeTab, setActiveTab] = useState('DASHBOARD');

  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('wfm_theme');
      if (saved !== null) {
        return saved === 'dark';
      }
    } catch (e) {}
    return true;
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState(null);
  const [initialChatPrompt, setInitialChatPrompt] = useState(null);

  // API Data States
  const [planData, setPlanData] = useState(null);
  const [slaData, setSlaData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [staffingData, setStaffingData] = useState(null);

  // Plan Mode: 'CURRENT' (Baseline schedule) vs 'OPTIMIZED' (AI Remediated)
  const [planMode, setPlanMode] = useState('CURRENT');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync theme to HTML root element & localStorage
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('wfm_theme', 'dark');
      } catch (e) {}
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('wfm_theme', 'light');
      } catch (e) {}
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // Fetch clients metadata dynamically on mount
  useEffect(() => {
    fetch('/api/wfm/clients')
      .then((res) => res.json())
      .then((data) => {
        if (data.clients && data.clients.length > 0) {
          setClients(data.clients);
          setSelectedClient(data.clients[0].name);
          if (data.all_weeks && data.all_weeks.length > 0) {
            setAvailableWeeks(data.all_weeks);
            setSelectedWeek(data.all_weeks[0]);
          } else if (data.clients[0].available_weeks && data.clients[0].available_weeks.length > 0) {
            setAvailableWeeks(data.clients[0].available_weeks);
            setSelectedWeek(data.clients[0].available_weeks[0]);
          }
        }
      })
      .catch((err) => console.warn('Could not fetch clients from backend:', err));
  }, []);

  // Fetch Core WFM Dashboard Data with dynamic dates and plan mode
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const startDate = selectedWeek || '2026-08-24';
    const endD = new Date(`${startDate}T00:00:00`);
    endD.setDate(endD.getDate() + 6);
    const endDate = endD.toISOString().slice(0, 10);
    const auditDay = selectedDay === 'ALL' ? startDate : selectedDay;

    try {
      const [planRes, slaRes, summaryRes, staffingRes] = await Promise.all([
        fetch(`/api/wfm/base-plan?client_name=${encodeURIComponent(selectedClient)}&start_date=${startDate}&end_date=${endDate}&plan_mode=${planMode}`),
        fetch(`/api/wfm/sla-audit?client_name=${encodeURIComponent(selectedClient)}&target_date=${auditDay}&sl_goal_pct=80&max_occupancy_pct=90&plan_mode=${planMode}`),
        fetch(`/api/wfm/summary?client_name=${encodeURIComponent(selectedClient)}&start_date=${startDate}&end_date=${endDate}&plan_mode=${planMode}`),
        fetch(`/api/wfm/staffing?client_name=${encodeURIComponent(selectedClient)}&start_date=${startDate}&end_date=${endDate}&target_date=${auditDay}&plan_mode=${planMode}`),
      ]);

      if (!planRes.ok || !slaRes.ok || !summaryRes.ok) {
        throw new Error('One or more WFM analytics endpoints returned an error.');
      }

      const [pData, sData, sumData, stData] = await Promise.all([
        planRes.json(),
        slaRes.json(),
        summaryRes.json(),
        staffingRes.json(),
      ]);

      setPlanData(pData);
      setSlaData(sData);
      setSummaryData(sumData);
      setStaffingData(stData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Unable to connect to WFM Analytics API');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClient, selectedWeek, selectedDay, planMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter intervals according to selected day
  const displayedIntervals = useMemo(() => {
    if (!planData || !planData.intervals) return [];
    if (selectedDay === 'ALL') return planData.intervals;
    return planData.intervals.filter((i) => {
      const dateStr = String(i.date || i.local_date || '').slice(0, 10);
      return dateStr === selectedDay;
    });
  }, [planData, selectedDay]);

  const selectedDayLabel = useMemo(() => {
    if (selectedDay === 'ALL') return `Full Week Commencing ${selectedWeek} (All Intervals)`;
    const found = daysList.find((d) => d.date === selectedDay);
    return found ? found.label : selectedDay;
  }, [selectedDay, selectedWeek, daysList]);

  const handleAskAIFromDrawer = (prompt) => {
    setSelectedInterval(null);
    setInitialChatPrompt(prompt);
    setIsChatOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      {/* Top Header & Global Filters */}
      <Header
        clients={clients}
        availableWeeks={availableWeeks}
        selectedClient={selectedClient}
        onSelectClient={setSelectedClient}
        selectedWeek={selectedWeek}
        onSelectWeek={setSelectedWeek}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        daysList={daysList}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenChat={() => setIsChatOpen(true)}
        onRefresh={fetchData}
        isLoading={isLoading}
        planMode={planMode}
        onTogglePlanMode={setPlanMode}
      />

      {/* Main Workspace */}
      <main className="max-w-[1680px] mx-auto px-6 py-6 flex-1 w-full flex flex-col gap-6">
        {/* Navigation Tabs replicating Customer Planning Workbook */}
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'DASHBOARD'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Executive Overview & Heatmap</span>
          </button>

          <button
            onClick={() => setActiveTab('BASE_PLAN')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'BASE_PLAN'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Base Plan (Supply vs Demand)</span>
          </button>

          <button
            onClick={() => setActiveTab('ASSUMPTIONS')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'ASSUMPTIONS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Shrinkage Assumptions</span>
          </button>

          <button
            onClick={() => setActiveTab('AGENTS')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'AGENTS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Agents for the Week (192 Roster)</span>
          </button>

          <button
            onClick={() => setActiveTab('STAFFING_BREAKS')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'STAFFING_BREAKS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            <span>Staffing & Breaks</span>
          </button>
        </div>

        {/* Error Notification Banner if backend is not reachable */}
        {error && (
          <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>
                <strong>Analytics API Warning:</strong> {error}. Running in demonstration mode with cached BigQuery schemas.
              </span>
            </div>
            <button
              onClick={fetchData}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* TAB 1: EXECUTIVE DASHBOARD */}
        {activeTab === 'DASHBOARD' && (
          <>
            {/* 1. Executive KPI Summary Cards */}
            <KPICards
              slaData={slaData}
              summaryData={summaryData}
              staffingData={staffingData}
              planData={planData}
              isLoading={isLoading}
              planMode={planMode}
            />

            {/* 2. Weekly SLA Risk Heatmap Matrix (Day x 30-min Intervals) */}
            <SlaRiskHeatmap
              allIntervals={planData?.intervals || []}
              daysList={daysList}
              isDark={isDark}
              onSelectInterval={setSelectedInterval}
              planMode={planMode}
            />

            {/* 3. Interactive Charts Section (Supply vs Demand & Variance) */}
            <ChartsSection
              intervals={displayedIntervals}
              summaryData={summaryData}
              staffingData={staffingData}
              isDark={isDark}
              selectedDayLabel={selectedDayLabel}
            />

            {/* 4. 30-Minute Interval Staffing & SLA Audit Grid */}
            <IntervalTable
              intervals={displayedIntervals}
              selectedInterval={selectedInterval}
              onSelectInterval={setSelectedInterval}
            />
          </>
        )}

        {/* TAB 2: BASE PLAN (SUPPLY VS DEMAND LEDGER) */}
        {activeTab === 'BASE_PLAN' && (
          <>
            <KPICards
              slaData={slaData}
              summaryData={summaryData}
              staffingData={staffingData}
              planData={planData}
              isLoading={isLoading}
              planMode={planMode}
            />
            <BasePlanGridView
              allIntervals={planData?.intervals || []}
              selectedDay={selectedDay}
              onSelectInterval={setSelectedInterval}
              planMode={planMode}
              onTogglePlanMode={setPlanMode}
              beforeVsAfterSummary={planData?.before_vs_after_summary}
            />
          </>
        )}

        {/* TAB 3: ASSUMPTIONS & HOURS REDUCTION */}
        {activeTab === 'ASSUMPTIONS' && (
          <AssumptionsView
            selectedClient={selectedClient}
            selectedWeek={selectedWeek}
          />
        )}

        {/* TAB 4: AGENTS FOR THE WEEK (ROSTER) */}
        {activeTab === 'AGENTS' && (
          <AgentRosterView
            selectedClient={selectedClient}
            selectedWeek={selectedWeek}
          />
        )}

        {/* TAB 5: STAFFING & BREAKS TIMELINE */}
        {activeTab === 'STAFFING_BREAKS' && (
          <WeeklyStaffingView
            selectedClient={selectedClient}
            selectedWeek={selectedWeek}
            selectedDay={selectedDay}
            daysList={daysList}
            isDark={isDark}
            onOpenChat={(prompt) => {
              setInitialChatPrompt(prompt);
              setIsChatOpen(true);
            }}
          />
        )}
      </main>

      {/* Investigation Details Drawer (when user inspects an interval) */}
      <InvestigationDrawer
        isOpen={Boolean(selectedInterval)}
        onClose={() => setSelectedInterval(null)}
        interval={selectedInterval}
        onAskAI={handleAskAIFromDrawer}
      />

      {/* Embedded ADK AI Assistant Drawer */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialPrompt={initialChatPrompt}
        onClearInitialPrompt={() => setInitialChatPrompt(null)}
        contextData={{
          client: selectedClient,
          week: selectedWeek,
          selectedDay: selectedDay,
          activeTab: activeTab,
          totalIntervals: displayedIntervals.length,
          healthStatus: slaData?.health_status,
          criticalDeficits: slaData?.critical_deficit_count,
        }}
      />
    </div>
  );
}
