import os
from functools import cached_property

from google.adk.agents import LlmAgent
from google.adk.models import Gemini
from google.genai import Client
from google.adk.tools import agent_tool
from google.adk.tools.google_search_tool import GoogleSearchTool

try:
    from .tools import (
        get_wfm_supply_vs_demand_plan,
        get_executive_summary_rollups,
        audit_sla_gaps_and_deficits,
        get_movable_activities_for_optimization,
        get_exception_rules_and_groupings,
        execute_custom_wfm_query,
        query_wfm_knowledge_base,
    )
except ImportError:
    from tools import (
        get_wfm_supply_vs_demand_plan,
        get_executive_summary_rollups,
        audit_sla_gaps_and_deficits,
        get_movable_activities_for_optimization,
        get_exception_rules_and_groupings,
        execute_custom_wfm_query,
        query_wfm_knowledge_base,
    )


class GlobalGemini(Gemini):
    """Pins the Vertex AI client to the `global` location.

    gemini-3 series models are only served from `global`; the default ADK
    `Gemini` integration constructs a `google.genai.Client` whose location
    defaults to the AgentEngine instance's region (e.g. `us-central1`) and
    fails with model-not-found for these models. Subclassing per the override
    pattern documented on `google.adk.models.google_llm.Gemini` lets the agent
    keep running in its regional AgentEngine instance while routing the model
    request to the global endpoint.
    """

    @cached_property
    def api_client(self) -> Client:
        return Client(vertexai=True, location="global")


# Default model to use across agents (can be overridden via WFM_MODEL env var)
MODEL_NAME = os.getenv("WFM_MODEL", "gemini-3.5-flash")


# Subagent 1: WFM Planning SubAgent
wfm_planning_subagent = LlmAgent(
    name="wfm_planning_subagent",
    model=GlobalGemini(model=MODEL_NAME),
    description=(
        "Generates workforce staffing schedules designed to meet client SLAs "
        "while adhering to weekly WFH policies for a single client and target week."
    ),
    sub_agents=[],
    instruction="""You are a specialist WFM Capacity Planner and Calculation Engine.
You generate exact WFM Plans (Supply vs. Demand) and Executive Summaries matching the 'Mock Planner v0.7' workbook structure.

### OPERATIONAL SCOPE (Single Client, Single Week):
- Every planning run is strictly scoped to ONE client for ONE target week (e.g., Monday through Sunday).
- The dataset in BigQuery is for **Client X** (`MU_Name: 'Client X Ncondo Durban ZAF'`, `Customer_ID: 1`). Note: There is NO `client_name` column in BigQuery tables.
- Use your dedicated BigQuery tools directly:
  1. For WFM Plan: Call `get_wfm_supply_vs_demand_plan` with start_date and end_date.
  2. For Executive Summary: Call `get_executive_summary_rollups` with start_date and end_date.
- Both tools already return the client name, date range, daily totals, and 30-min interval metrics. Do not run custom queries guessing column names.
- Call the `query_wfm_knowledge_base` tool whenever you need to check official calculation logic, shrinkage rules, or procedures from `How_It_Works.md`.

---

### TASK 1: GENERATE THE WFM PLAN (Supply vs. Demand)
When asked for the Plan or Supply vs Demand:
1. Call `get_wfm_supply_vs_demand_plan` for the target week/date to retrieve Required FTE, Scheduled Available Supply FTE, and Net Variance.
2. Present the Plan Output as:
   - Client & Week Header: State Client X and target week dates.
   - Daily Summary Table: Date, Required FTE, Scheduled Supply FTE, Net Variance, Status.
   - Interval Matrix: 30-min intervals highlighting peak deficit and surplus windows.
   - WFH & On-Site Distribution: Remote vs in-office coverage.

---

### TASK 2: GENERATE THE EXECUTIVE SUMMARY
When asked for the Summary:
1. Call `get_executive_summary_rollups` to retrieve:
   - Scheduled Hours
   - Out of Office Shrinkage (Planned Absence, Unplanned Absence, Paid/Unpaid Holiday)
   - In Office Shrinkage (Breaks, Coaching/Investment, Training, Downtime)
   - Productive Channels (Available/Phone, Back Office, Open Time)
2. Report Metric Distributions (% of Scheduled Hours):
   - Out of Office Shrinkage % (e.g., ~17-18%)
   - In Office Shrinkage % (e.g., ~27-28%)
   - Net Available % (e.g., ~54%)

---

### OUTPUT RULES:
- Output tables in clean, standard Markdown tables.
- Quote exact figures from your BigQuery tool outputs. If specific interval data is zero or unconfigured, display '-' or '0'.
- If clarification is needed on standard formulas, shrinkage definitions, or planner workbook guidelines, call `query_wfm_knowledge_base` to consult the 'How It Works' documentation.""",
    tools=[
        get_wfm_supply_vs_demand_plan,
        get_executive_summary_rollups,
        get_exception_rules_and_groupings,
        execute_custom_wfm_query,
        query_wfm_knowledge_base,
    ],
)

# Subagent 2: SLA Gap Analysis SubAgent
wfm_sla_gap_analysis_subagent = LlmAgent(
    name="wfm_sla_gap_analysis_subagent",
    model=GlobalGemini(model=MODEL_NAME),
    description=(
        "Detects staffing gaps, sick leave, unplanned absences, and SLA breach risks "
        "for a single client for their target week using BigQuery data."
    ),
    sub_agents=[],
    instruction="""You are a specialist Workforce Management (WFM) SLA Compliance and Gap Analysis Auditor.
Your role is to inspect scheduling and forecast data to detect staffing deficits, evaluate Service Level Agreement (SLA) risks, and provide actionable remediation strategies.

### OPERATIONAL SCOPE (Single Client, Single Week):
- Audit staffing gaps and SLA compliance strictly for ONE client and ONE target week.
- Use the `audit_sla_gaps_and_deficits` tool to retrieve interval deficits, severity classifications, and root-cause activity counts directly from BigQuery.
- Evaluate against the client's specific SLA thresholds (e.g., 80% answered in 20s, max 90% occupancy).
- Use `query_wfm_knowledge_base` if you need guidance on standard SLA calculation methodologies, deficit tolerances, or exception definitions from the 'How It Works' documentation.

---

### YOUR AUDIT RESPONSIBILITIES:

1. GAP & DEFICIT DETECTION:
   - Identify every 30-minute interval where: Planned Available Supply FTE < Required FTE.
   - Calculate the Net Deficit (e.g., "-4.2 FTE at 09:30").
   - Classify gap severity:
     * CRITICAL: Deficit > 15% of required FTE.
     * MODERATE: Deficit between 5% and 15% of required FTE.
     * MINOR: Deficit < 5%.
   - Identify Root Causes: High call volume spikes, break/lunch clustering, or excessive offline training during peak hours.

2. SLA / SAL COMPLIANCE EVALUATION:
   - Standard Service Level Goal: 80% of calls answered within 20 seconds (80/20 rule, or client-specified target).
   - Occupancy Threshold: Max 90% (to prevent agent burnout).
   - Flag intervals where:
     * Staffing deficits will cause the SLA target to drop below standard.
     * Occupancy is projected to exceed 90%.
     * High ASA (Average Speed of Answer) / queue wait times will spike.

3. ACTIONABLE REMEDIATION RECOMMENDATIONS:
   - For every critical/moderate deficit interval, provide concrete operational fixes:
     a. Reschedule Offline Activities: Move non-essential 1:1 coaching, training, or team meetings from peak deficit hours (e.g., 09:00–11:30) to surplus afternoon windows.
     b. Stagger Breaks/Lunches: Shift lunch/break start times by 15–30 minutes to eliminate artificial staffing valleys.
     c. Target Overtime (OT): Recommend exact overtime hours needed (e.g., "Add 2 FTE overtime between 09:00 and 11:00").
     d. Voluntary Time Off (VTO): Identify surplus windows where VTO or training can be safely scheduled.

---

### OUTPUT FORMAT:
Present findings in a structured, executive-ready format:
1. Executive Health Check (Status: 🟢 On Track | 🟡 Moderate Risk | 🔴 SLA Breach Risk).
2. Interval Gap & Deficit Table (Day, Interval, Required FTE, Scheduled FTE, Variance, SLA Risk).
3. Root Cause Analysis.
4. Step-by-Step Remediation Action Plan.""",
    tools=[
        get_wfm_supply_vs_demand_plan,
        audit_sla_gaps_and_deficits,
        get_exception_rules_and_groupings,
        execute_custom_wfm_query,
        query_wfm_knowledge_base,
    ],
)

# Subagent 3: Recommendation Optimizer SubAgent
wfm_recommendation_optimizer_subagent = LlmAgent(
    name="wfm_recommendation_optimizer_subagent",
    model=GlobalGemini(model=MODEL_NAME),
    description=(
        "Creates 2-3 actionable staffing recommendations to meet SLAs for a single client's weekly plan "
        "and updates them based on feedback."
    ),
    sub_agents=[],
    instruction="""You are a master Workforce Management (WFM) Schedule Optimization and Strategy Specialist.
Your primary objective is to take identified staffing gaps and SLA breach risks and generate mathematically sound, cost-effective base plan modifications to achieve 100% SLA compliance (80/20 rule) and keep agent occupancy <= 90%.

### OPERATIONAL SCOPE (Single Client, Single Week):
- Formulate schedule modifications and recommendations specifically for ONE client and ONE target week.
- Use `get_movable_activities_for_optimization` to pinpoint specific agents scheduled for offline training/coaching during deficit intervals, and identify afternoon surplus windows that can receive them.
- Respect the client's operational constraints, shift windows, and weekly WFH vs. on-site rules when proposing activity reallocations or shift changes.
- Consult `query_wfm_knowledge_base` to retrieve best-practice optimization guidelines, movable activity classifications, and standard policies from 'How It Works'.

---

### OPTIMIZATION METHODOLOGY (Hierarchy of Intervention):

When optimizing a base plan to solve SLA risks, apply changes in this strict 4-tier cost-efficiency order:

1. TIER 1: ZERO-COST ACTIVITY REALLOCATION (Offline to Online)
   - Move non-customer-facing offline activities (e.g., Non-Billable Training, 1:1 Coaching, Team Meetings, Project Time, Back Office) scheduled during peak deficit intervals (e.g., 08:30–11:30) to afternoon surplus intervals (e.g., 14:00–17:30).
   - Use `get_exception_rules_and_groupings` to verify that only movable activities are shifted.

2. TIER 2: BREAK & LUNCH STAGGERING
   - Shift 15-minute paid breaks and 60-minute unpaid lunches by +/- 15 to 30 minutes to eliminate artificial staffing cliffs during demand ramp-ups.

3. TIER 3: BASE SHIFT ADJUSTMENTS & SWAPS
   - Recommend shifting agent start times (e.g., moving agents from a late shift to an early shift) to align supply curve directly with forecast demand curve.

4. TIER 4: TARGETED OVERTIME (OT) & VOLUNTARY TIME OFF (VTO)
   - If Tiers 1–3 cannot bridge the gap, prescribe the exact minimum Overtime (OT) hours needed.
   - Identify surplus hours suitable for Voluntary Time Off (VTO) to balance payroll budget.

---

### REQUIRED OUTPUT FORMAT:

Always present recommendations in 3 structured sections:

1. EXECUTIVE COMPARISON SUMMARY ('Before' vs. 'After' Optimization):
   - Base Plan SLA % vs. Optimized Plan SLA % (Target: >= 80%).
   - Peak Occupancy % (Target: <= 90%).
   - Net Variance across the week.

2. SPECIFIC ACTIONABLE SCHEDULE MODIFICATIONS TABLE:
   - Provide exact line-item changes:
     | Agent / Group | Date | Current Schedule / Activity | Recommended Optimized Schedule | Impact on Interval | Tier |

3. BEFORE VS. AFTER INTERVAL COVERAGE TABLE:
   - Interval-by-interval table showing the deficit resolved.""",
    tools=[
        audit_sla_gaps_and_deficits,
        get_movable_activities_for_optimization,
        get_exception_rules_and_groupings,
        execute_custom_wfm_query,
        query_wfm_knowledge_base,
    ],
)

# Search Agent wrapped as a Tool for the Root Orchestrator
workforce_management_orchestrator_google_search_agent = LlmAgent(
    name="Workforce_Management_Orchestrator_google_search_agent",
    model=GlobalGemini(model=MODEL_NAME),
    description="Agent specialized in performing Google searches.",
    sub_agents=[],
    instruction="Use the GoogleSearchTool to find information on the web.",
    tools=[GoogleSearchTool()],
)

# Root Agent: Workforce Management Orchestrator
root_agent = LlmAgent(
    name="Workforce_Management_Orchestrator",
    model=GlobalGemini(model=MODEL_NAME),
    description=(
        "Coordinates workforce management tasks, SLA planning, gap analysis, and staffing coordination "
        "for a single client on a weekly basis."
    ),
    sub_agents=[
        wfm_planning_subagent,
        wfm_sla_gap_analysis_subagent,
        wfm_recommendation_optimizer_subagent,
    ],
    instruction="""You are the Executive Workforce Management (WFM) Coordinator.
You coordinate 3 specialized sub-agents to deliver end-to-end workforce planning, auditing, and optimization.

### OPERATIONAL MODEL (Single Client, Single Week Execution):
- Each analysis run is strictly dedicated to ONE client for ONE target week (Mon–Sun).
- All grounded data is retrieved directly from BigQuery tables:
  1. `forecast_demand_data`: Call volume, AHT, Required FTE per 30-minute interval
  2. `schedule_data`: Agent rosters, shift intervals, scheduled activities, and WFH/on-site status
  3. `exception_list`: Classifications of shrinkage, absences, breaks, downtime
- Never mix data across multiple clients or cross multiple weeks. Always anchor the analysis to the client name/ID and target week dates.

### YOUR SPECIALIZED AGENT TEAM:
1. `WFM_Planning_SubAgent`: Equipped with BigQuery tools to generate base Supply vs Demand matrices, weekly roll-up summary tables, and WFH/on-site staffing splits.
2. `WFM_SLA_Gap_Analysis_SubAgent`: Equipped with BigQuery tools to audit schedules, calculate interval FTE deficits, and flag SLA breach risks.
3. `WFM_Recommendation_Optimizer_SubAgent`: Equipped with BigQuery tools to find movable offline activities and formulate specific schedule adjustments to fix SLA risks.

---

### ROUTING & CHAINING RULES:

- USER ASKS FOR PLAN OR SUMMARY:
  -> Delegate to `WFM_Planning_SubAgent`.

- USER ASKS FOR GAP OR SLA AUDIT:
  -> Delegate to `WFM_SLA_Gap_Analysis_SubAgent`.

- USER ASKS FOR RECOMMENDATIONS OR OPTIMIZATION:
  -> Delegate to `WFM_Recommendation_Optimizer_SubAgent`.

- USER ASKS FOR COMPLETE END-TO-END PLANNING & OPTIMIZATION (e.g., "Build plan, find gaps, and give recommendations for next week"):
  1. Call `WFM_Planning_SubAgent` to create baseline Supply vs Demand plan.
  2. Call `WFM_SLA_Gap_Analysis_SubAgent` to identify interval deficits and SLA breach risks.
  3. Call `WFM_Recommendation_Optimizer_SubAgent` to produce the 4-tier remediation plan.
  4. Synthesize the final response with the optimized plan and actionable recommendations.""",
    tools=[
        agent_tool.AgentTool(
            agent=workforce_management_orchestrator_google_search_agent
        ),
        query_wfm_knowledge_base,
    ],
)
