"""BigQuery tools for Workforce Management (WFM) Subagents.

Connects to host-np-project1.wfh BigQuery dataset:
- forecast_demand_data: Forecast volume, AHT, Required FTE per 30-min interval
- schedule_data: Agent rosters, scheduled activity blocks, shifts (Client in MU_Name)
- exception_list: Exception classification into Shrinkage, Absence, Breaks, Investment, etc.
"""

import os
from typing import Any, Dict, List, Optional
from google.cloud import bigquery

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "host-np-project1")
DATASET_ID = os.getenv("WFM_BQ_DATASET", "wfh")
DEFAULT_CLIENT_NAME = "Client X (MU: Client X Ncondo Durban ZAF)"


def _get_bq_client() -> bigquery.Client:
    """Returns an authenticated BigQuery Client."""
    return bigquery.Client(project=PROJECT_ID)


def get_wfm_supply_vs_demand_plan(
    start_date: str = "2026-08-24",
    end_date: Optional[str] = "2026-08-30",
    start_interval: str = "08:00",
    end_interval: str = "18:00",
) -> Dict[str, Any]:
    """Retrieves 30-minute interval Supply vs Demand plan for the client and target week/date range.

    Calculates:
    - Required FTE (from forecast_demand_data)
    - Scheduled Available Supply FTE (from schedule_data for Open Time)
    - Net Variance (Supply FTE - Required FTE)
    - Status: UNDERSTAFFED (Negative Variance) vs OVERSTAFFED (Positive Variance)
    - Daily roll-ups across the date range

    Args:
        start_date: Start date in 'YYYY-MM-DD' format (e.g. '2026-08-24').
        end_date: Optional end date in 'YYYY-MM-DD' (e.g. '2026-08-30'). If omitted or equal to start_date, queries single day.
        start_interval: Start interval in 'HH:MM' (24-hour format, e.g. '08:00').
        end_interval: End interval in 'HH:MM' (24-hour format, e.g. '18:00').

    Returns:
        A dict containing client name, date range, daily summary totals, and interval matrix.
    """
    try:
        client = _get_bq_client()
        effective_end = end_date if end_date else start_date

        query = f"""
        WITH intervals AS (
          SELECT DISTINCT Local_Date, Local_Time, Timestamp_Local
          FROM `{PROJECT_ID}.{DATASET_ID}.forecast_demand_data`
          WHERE Local_Date BETWEEN DATE('{start_date}') AND DATE('{effective_end}')
            AND Local_Time BETWEEN '{start_interval}' AND '{end_interval}'
        ),
        demand AS (
          SELECT 
            Local_Date, 
            Local_Time, 
            ROUND(SUM(Required_FTE), 2) AS required_fte,
            ROUND(SUM(Offered_Calls), 1) AS offered_calls,
            ROUND(AVG(AHT_Seconds), 1) AS avg_aht
          FROM `{PROJECT_ID}.{DATASET_ID}.forecast_demand_data`
          WHERE Local_Date BETWEEN DATE('{start_date}') AND DATE('{effective_end}')
          GROUP BY 1, 2
        ),
        supply AS (
          SELECT 
            i.Local_Date,
            i.Local_Time,
            ROUND(SUM(
              TIMESTAMP_DIFF(
                LEAST(s.End_Time_Local, TIMESTAMP_ADD(i.Timestamp_Local, INTERVAL 30 MINUTE)),
                GREATEST(s.Start_Time_Local, i.Timestamp_Local),
                SECOND
              ) / 1800.0
            ), 2) AS available_supply_fte
          FROM intervals i
          JOIN `{PROJECT_ID}.{DATASET_ID}.schedule_data` s
            ON DATE(s.Shift_Date) = i.Local_Date
            AND s.Start_Time_Local < TIMESTAMP_ADD(i.Timestamp_Local, INTERVAL 30 MINUTE)
            AND s.End_Time_Local > i.Timestamp_Local
            AND s.Activity_Exception_Name = 'Open Time'
          GROUP BY 1, 2
        )
        SELECT 
          CAST(i.Local_Date AS STRING) AS date,
          i.Local_Time AS interval_time,
          COALESCE(d.offered_calls, 0) AS offered_calls,
          COALESCE(d.avg_aht, 0) AS avg_aht_sec,
          COALESCE(d.required_fte, 0) AS required_fte,
          COALESCE(s.available_supply_fte, 0) AS supply_fte,
          ROUND(COALESCE(s.available_supply_fte, 0) - COALESCE(d.required_fte, 0), 2) AS net_variance,
          CASE 
            WHEN COALESCE(s.available_supply_fte, 0) < COALESCE(d.required_fte, 0) THEN 'UNDERSTAFFED'
            WHEN COALESCE(s.available_supply_fte, 0) > COALESCE(d.required_fte, 0) THEN 'OVERSTAFFED'
            ELSE 'BALANCED'
          END AS status
        FROM intervals i
        LEFT JOIN demand d USING (Local_Date, Local_Time)
        LEFT JOIN supply s USING (Local_Date, Local_Time)
        ORDER BY i.Local_Date, i.Local_Time
        """
        rows = [dict(r) for r in client.query(query).result()]

        # Daily aggregations
        daily_map: Dict[str, Dict[str, float]] = {}
        for r in rows:
            d = r["date"]
            if d not in daily_map:
                daily_map[d] = {"required_fte": 0.0, "supply_fte": 0.0}
            daily_map[d]["required_fte"] += r["required_fte"]
            daily_map[d]["supply_fte"] += r["supply_fte"]

        daily_summary = []
        for d, vals in sorted(daily_map.items()):
            req = round(vals["required_fte"], 1)
            sup = round(vals["supply_fte"], 1)
            daily_summary.append({
                "date": d,
                "required_fte_intervals": req,
                "supply_fte_intervals": sup,
                "net_variance": round(sup - req, 1),
                "status": "OVERSTAFFED" if sup > req else "UNDERSTAFFED",
            })

        tot_req = round(sum(r["required_fte"] for r in rows), 2)
        tot_sup = round(sum(r["supply_fte"] for r in rows), 2)
        understaffed_intervals = [
            f"{r['date']} {r['interval_time']}" for r in rows if r["status"] == "UNDERSTAFFED"
        ]

        return {
            "client_name": DEFAULT_CLIENT_NAME,
            "date_range": f"{start_date} to {effective_end}",
            "total_required_fte_intervals": tot_req,
            "total_supply_fte_intervals": tot_sup,
            "net_variance": round(tot_sup - tot_req, 2),
            "daily_summary": daily_summary,
            "understaffed_intervals_count": len(understaffed_intervals),
            "understaffed_intervals_sample": understaffed_intervals[:15],
            "intervals": rows,
        }
    except Exception as e:
        return {"error": f"Failed to retrieve supply vs demand plan: {str(e)}"}


def get_executive_summary_rollups(
    start_date: str = "2026-08-24",
    end_date: str = "2026-08-30",
) -> Dict[str, Any]:
    """Generates Executive Summary roll-up metrics matching Mock Planner v0.7 workbook structure.

    Computes:
    - Scheduled Hours
    - Out of Office Shrinkage (Planned Absence, Unplanned Absence, Paid/Unpaid Holiday)
    - In Office Shrinkage (Breaks, Coaching/Investment, Training, Downtime)
    - Productive Channels (Available/Phone, Back Office, Open Time)
    - Metric Distributions (% of Scheduled Hours for each category)

    Args:
        start_date: Start date in 'YYYY-MM-DD' (e.g. '2026-08-24').
        end_date: End date in 'YYYY-MM-DD' (e.g. '2026-08-30').

    Returns:
        A dict with daily category roll-ups in hours and percentage distributions.
    """
    try:
        client = _get_bq_client()
        query = f"""
        WITH tagged AS (
          SELECT 
            DATE(Shift_Date) AS shift_d,
            Total_Minutes,
            CASE 
              WHEN Activity_Exception_Group IN (
                'Paid / Approved Time Off', 'Unpaid / Approved Time Off', 
                'Unpaid / Unexpected Absence', 'Paid Holiday', 'Unpaid Holiday'
              ) OR Activity_Exception_Name IN (
                'Absence Unpaid', 'Approved Time Off', 'UnApproved Absence', 
                'Sickness Paid SA ONLY', 'Late-Leave Early'
              ) THEN 'Out_of_Office_Shrinkage'
              WHEN Activity_Exception_Group IN (
                'Paid Break', 'Unpaid Break', 'Training', 
                'Development / Meeting', 'Other Paid Offboard'
              ) OR Activity_Exception_Name IN (
                'Break', 'Lunch', 'Non Billable Training', 
                'Coaching 1:1 Offline', 'Team Meeting', 'Non-Billable DownTime'
              ) THEN 'In_Office_Shrinkage'
              WHEN Activity_Exception_Group = 'Board Time' 
                OR Activity_Exception_Name IN ('Open Time', 'Back Office') THEN 'Productive_Channels'
              ELSE 'Other'
            END AS category
          FROM `{PROJECT_ID}.{DATASET_ID}.schedule_data`
          WHERE DATE(Shift_Date) BETWEEN DATE('{start_date}') AND DATE('{end_date}')
        )
        SELECT 
          CAST(shift_d AS STRING) AS date,
          ROUND(SUM(Total_Minutes) / 60.0, 1) AS scheduled_hours,
          ROUND(SUM(IF(category = 'Productive_Channels', Total_Minutes, 0)) / 60.0, 1) AS productive_hours,
          ROUND(SUM(IF(category = 'In_Office_Shrinkage', Total_Minutes, 0)) / 60.0, 1) AS in_office_shrinkage_hours,
          ROUND(SUM(IF(category = 'Out_of_Office_Shrinkage', Total_Minutes, 0)) / 60.0, 1) AS out_of_office_shrinkage_hours,
          ROUND(SUM(IF(category = 'Productive_Channels', Total_Minutes, 0)) * 100.0 / NULLIF(SUM(Total_Minutes), 0), 1) AS net_available_pct,
          ROUND(SUM(IF(category = 'In_Office_Shrinkage', Total_Minutes, 0)) * 100.0 / NULLIF(SUM(Total_Minutes), 0), 1) AS in_office_shrinkage_pct,
          ROUND(SUM(IF(category = 'Out_of_Office_Shrinkage', Total_Minutes, 0)) * 100.0 / NULLIF(SUM(Total_Minutes), 0), 1) AS out_of_office_shrinkage_pct
        FROM tagged
        GROUP BY 1
        ORDER BY 1
        """
        days = [dict(r) for r in client.query(query).result()]
        
        total_scheduled = round(sum(d["scheduled_hours"] for d in days), 1)
        total_prod = round(sum(d["productive_hours"] for d in days), 1)
        total_in_off = round(sum(d["in_office_shrinkage_hours"] for d in days), 1)
        total_out_off = round(sum(d["out_of_office_shrinkage_hours"] for d in days), 1)
        
        return {
            "client_name": DEFAULT_CLIENT_NAME,
            "date_range": f"{start_date} to {end_date}",
            "weekly_totals": {
                "total_scheduled_hours": total_scheduled,
                "productive_hours": total_prod,
                "in_office_shrinkage_hours": total_in_off,
                "out_of_office_shrinkage_hours": total_out_off,
                "net_available_pct": round(total_prod * 100.0 / total_scheduled, 1) if total_scheduled else 0,
                "in_office_shrinkage_pct": round(total_in_off * 100.0 / total_scheduled, 1) if total_scheduled else 0,
                "out_of_office_shrinkage_pct": round(total_out_off * 100.0 / total_scheduled, 1) if total_scheduled else 0,
            },
            "daily_breakdown": days,
        }
    except Exception as e:
        return {"error": f"Failed to retrieve executive summary rollups: {str(e)}"}


def audit_sla_gaps_and_deficits(
    target_date: str = "2026-08-24",
    sl_goal_pct: int = 80,
    max_occupancy_pct: int = 90,
) -> Dict[str, Any]:
    """Audits 30-minute intervals for staffing deficits, SLA breach risks, and root causes.

    Detects:
    - Every interval where Planned Available Supply FTE < Required FTE.
    - Calculates Net Deficit and severity (CRITICAL > 15%, MODERATE 5-15%, MINOR < 5%).
    - Evaluates SLA compliance vs the 80/20 standard target.
    - Identifies root causes (volume spike, training clustering, break clustering).

    Args:
        target_date: Date in 'YYYY-MM-DD' (e.g. '2026-08-24').
        sl_goal_pct: Target Service Level Goal % (default 80%).
        max_occupancy_pct: Max allowed occupancy % (default 90%).

    Returns:
        A dict with executive health check status, critical/moderate gaps, and root causes.
    """
    try:
        client = _get_bq_client()
        query = f"""
        WITH intervals AS (
          SELECT DISTINCT Local_Date, Local_Time, Timestamp_Local
          FROM `{PROJECT_ID}.{DATASET_ID}.forecast_demand_data`
          WHERE Local_Date = DATE('{target_date}')
        ),
        demand AS (
          SELECT 
            Local_Date, 
            Local_Time, 
            ROUND(SUM(Required_FTE), 2) AS required_fte,
            ROUND(SUM(Offered_Calls), 1) AS offered_calls
          FROM `{PROJECT_ID}.{DATASET_ID}.forecast_demand_data`
          WHERE Local_Date = DATE('{target_date}')
          GROUP BY 1, 2
        ),
        supply AS (
          SELECT 
            i.Local_Date,
            i.Local_Time,
            ROUND(SUM(
              TIMESTAMP_DIFF(
                LEAST(s.End_Time_Local, TIMESTAMP_ADD(i.Timestamp_Local, INTERVAL 30 MINUTE)),
                GREATEST(s.Start_Time_Local, i.Timestamp_Local),
                SECOND
              ) / 1800.0
            ), 2) AS available_supply_fte
          FROM intervals i
          JOIN `{PROJECT_ID}.{DATASET_ID}.schedule_data` s
            ON DATE(s.Shift_Date) = i.Local_Date
            AND s.Start_Time_Local < TIMESTAMP_ADD(i.Timestamp_Local, INTERVAL 30 MINUTE)
            AND s.End_Time_Local > i.Timestamp_Local
            AND s.Activity_Exception_Name = 'Open Time'
          GROUP BY 1, 2
        ),
        offline_activity AS (
          SELECT 
            i.Local_Time,
            COUNTIF(s.Activity_Exception_Name = 'Non Billable Training') AS training_count,
            COUNTIF(s.Activity_Exception_Name = 'Coaching 1:1 Offline') AS coaching_count,
            COUNTIF(s.Activity_Exception_Name = 'Team Meeting') AS meeting_count,
            COUNTIF(s.Activity_Exception_Name IN ('Break', 'Lunch')) AS break_lunch_count
          FROM intervals i
          JOIN `{PROJECT_ID}.{DATASET_ID}.schedule_data` s
            ON DATE(s.Shift_Date) = i.Local_Date
            AND s.Start_Time_Local < TIMESTAMP_ADD(i.Timestamp_Local, INTERVAL 30 MINUTE)
            AND s.End_Time_Local > i.Timestamp_Local
          GROUP BY 1
        )
        SELECT 
          i.Local_Time AS interval_time,
          COALESCE(d.offered_calls, 0) AS offered_calls,
          COALESCE(d.required_fte, 0) AS required_fte,
          COALESCE(s.available_supply_fte, 0) AS scheduled_supply_fte,
          ROUND(COALESCE(s.available_supply_fte, 0) - COALESCE(d.required_fte, 0), 2) AS variance,
          ROUND(
            (COALESCE(d.required_fte, 0) - COALESCE(s.available_supply_fte, 0)) * 100.0 / NULLIF(d.required_fte, 0), 1
          ) AS deficit_pct_of_required,
          CASE 
            WHEN COALESCE(d.required_fte, 0) = 0 THEN 'OK'
            WHEN (COALESCE(d.required_fte, 0) - COALESCE(s.available_supply_fte, 0)) / d.required_fte > 0.15 THEN 'CRITICAL'
            WHEN (COALESCE(d.required_fte, 0) - COALESCE(s.available_supply_fte, 0)) / d.required_fte > 0.05 THEN 'MODERATE'
            WHEN COALESCE(s.available_supply_fte, 0) < COALESCE(d.required_fte, 0) THEN 'MINOR'
            ELSE 'OK'
          END AS severity,
          CASE 
            WHEN COALESCE(s.available_supply_fte, 0) < COALESCE(d.required_fte, 0) THEN '🔴 High SLA Risk (Below 80/20)'
            ELSE '🟢 On Track'
          END AS sla_risk,
          COALESCE(oa.training_count, 0) AS offline_training_agents,
          COALESCE(oa.coaching_count, 0) AS coaching_agents,
          COALESCE(oa.meeting_count, 0) AS meeting_agents,
          COALESCE(oa.break_lunch_count, 0) AS break_lunch_agents
        FROM intervals i
        LEFT JOIN demand d USING (Local_Date, Local_Time)
        LEFT JOIN supply s USING (Local_Date, Local_Time)
        LEFT JOIN offline_activity oa USING (Local_Time)
        WHERE COALESCE(d.required_fte, 0) > 0 
          AND COALESCE(s.available_supply_fte, 0) < COALESCE(d.required_fte, 0)
        ORDER BY i.Local_Time
        """
        gaps = [dict(r) for r in client.query(query).result()]
        
        critical_count = sum(1 for g in gaps if g["severity"] == "CRITICAL")
        moderate_count = sum(1 for g in gaps if g["severity"] == "MODERATE")
        
        if critical_count > 0:
            health_status = "🔴 SLA Breach Risk"
        elif moderate_count > 0:
            health_status = "🟡 Moderate Risk"
        else:
            health_status = "🟢 On Track"

        return {
            "client_name": DEFAULT_CLIENT_NAME,
            "target_date": target_date,
            "executive_health_check": health_status,
            "critical_gaps_count": critical_count,
            "moderate_gaps_count": moderate_count,
            "total_deficit_intervals": len(gaps),
            "deficit_intervals": gaps,
        }
    except Exception as e:
        return {"error": f"Failed to audit SLA gaps: {str(e)}"}


def get_movable_activities_for_optimization(
    target_date: str = "2026-08-24",
    deficit_start_time: str = "08:00",
    deficit_end_time: str = "11:30",
) -> Dict[str, Any]:
    """Finds movable offline activities during deficit windows and identifies surplus afternoon intervals.

    Used by the Optimizer Subagent to implement Tier 1 (zero-cost activity reallocation)
    and Tier 2 (break/lunch staggering):
    - Identifies agents scheduled for Non Billable Training, Coaching 1:1, Team Meetings
      during deficit hours.
    - Identifies afternoon surplus intervals where supply exceeds required FTE to receive
      reallocated activities.

    Args:
        target_date: Date in 'YYYY-MM-DD' (e.g. '2026-08-24').
        deficit_start_time: Start time of deficit period (e.g. '08:00').
        deficit_end_time: End time of deficit period (e.g. '11:30').

    Returns:
        A dict with movable activities during deficits and recommended surplus destination windows.
    """
    try:
        client = _get_bq_client()
        
        # 1. Movable activities during deficit period
        q_movable = f"""
        SELECT 
          Person_Name,
          Activity_Exception_Name,
          Activity_Exception_Group,
          CAST(TIME(Start_Time_Local) AS STRING) AS start_time,
          CAST(TIME(End_Time_Local) AS STRING) AS end_time,
          Total_Minutes,
          'Tier 1 (Zero-Cost Reallocation)' AS intervention_tier
        FROM `{PROJECT_ID}.{DATASET_ID}.schedule_data`
        WHERE DATE(Shift_Date) = DATE('{target_date}')
          AND Activity_Exception_Name IN ('Non Billable Training', 'Coaching 1:1 Offline', 'Team Meeting')
          AND FORMAT_TIMESTAMP('%H:%M', Start_Time_Local) BETWEEN '{deficit_start_time}' AND '{deficit_end_time}'
        ORDER BY Start_Time_Local, Person_Name
        LIMIT 30
        """
        movable_activities = [dict(r) for r in client.query(q_movable).result()]

        # 2. Surplus afternoon intervals that can absorb activities
        q_surplus = f"""
        WITH intervals AS (
          SELECT DISTINCT Local_Date, Local_Time, Timestamp_Local
          FROM `{PROJECT_ID}.{DATASET_ID}.forecast_demand_data`
          WHERE Local_Date = DATE('{target_date}') AND Local_Time >= '12:00'
        ),
        demand AS (
          SELECT Local_Date, Local_Time, ROUND(SUM(Required_FTE), 2) AS required_fte
          FROM `{PROJECT_ID}.{DATASET_ID}.forecast_demand_data`
          WHERE Local_Date = DATE('{target_date}')
          GROUP BY 1, 2
        ),
        supply AS (
          SELECT 
            i.Local_Date,
            i.Local_Time,
            ROUND(SUM(
              TIMESTAMP_DIFF(
                LEAST(s.End_Time_Local, TIMESTAMP_ADD(i.Timestamp_Local, INTERVAL 30 MINUTE)),
                GREATEST(s.Start_Time_Local, i.Timestamp_Local),
                SECOND
              ) / 1800.0
            ), 2) AS available_supply_fte
          FROM intervals i
          JOIN `{PROJECT_ID}.{DATASET_ID}.schedule_data` s
            ON DATE(s.Shift_Date) = i.Local_Date
            AND s.Start_Time_Local < TIMESTAMP_ADD(i.Timestamp_Local, INTERVAL 30 MINUTE)
            AND s.End_Time_Local > i.Timestamp_Local
            AND s.Activity_Exception_Name = 'Open Time'
          GROUP BY 1, 2
        )
        SELECT 
          i.Local_Time AS surplus_interval,
          COALESCE(d.required_fte, 0) AS required_fte,
          COALESCE(s.available_supply_fte, 0) AS supply_fte,
          ROUND(COALESCE(s.available_supply_fte, 0) - COALESCE(d.required_fte, 0), 2) AS surplus_fte
        FROM intervals i
        JOIN demand d USING (Local_Date, Local_Time)
        JOIN supply s USING (Local_Date, Local_Time)
        WHERE COALESCE(s.available_supply_fte, 0) > COALESCE(d.required_fte, 0)
        ORDER BY surplus_fte DESC
        LIMIT 10
        """
        surplus_windows = [dict(r) for r in client.query(q_surplus).result()]

        return {
            "client_name": DEFAULT_CLIENT_NAME,
            "target_date": target_date,
            "deficit_window": f"{deficit_start_time} to {deficit_end_time}",
            "movable_activities_count": len(movable_activities),
            "movable_activities": movable_activities,
            "recommended_surplus_destination_windows": surplus_windows,
        }
    except Exception as e:
        return {"error": f"Failed to get movable activities: {str(e)}"}


def get_exception_rules_and_groupings(search_term: str = "") -> List[Dict[str, Any]]:
    """Looks up exception classifications in the grounded exception_list table.

    Helps agents distinguish between:
    - Movable offline activities (e.g., Training, Coaching 1:1, Team Meetings)
    - Immovable shrinkage/absences (e.g., PTO, Sick Leave, Unpaid Absence)
    - Breaks and Lunches

    Args:
        search_term: Optional keyword to filter exceptions (e.g. 'Training', 'Absence', 'Break').

    Returns:
        A list of matching exception categories and rules.
    """
    try:
        client = _get_bq_client()
        where_clause = ""
        if search_term:
            where_clause = f"WHERE LOWER(EXCEPTION) LIKE LOWER('%{search_term}%') OR LOWER(`Primary Category`) LIKE LOWER('%{search_term}%')"
            
        query = f"""
        SELECT 
          EXCEPTION AS exception_name,
          Exception_Type AS exception_type,
          `Primary Category` AS primary_category,
          `Grouping` AS exception_grouping,
          Exception_Shrinkage AS is_shrinkage
        FROM `{PROJECT_ID}.{DATASET_ID}.exception_list`
        {where_clause}
        LIMIT 50
        """
        return [dict(r) for r in client.query(query).result()]
    except Exception as e:
        return [{"error": f"Failed to get exception rules: {str(e)}"}]


def execute_custom_wfm_query(sql_query: str) -> List[Dict[str, Any]]:
    """Safely executes a read-only SELECT query against the BigQuery WFM dataset.

    Note on Schemas:
    - `host-np-project1.wfh.schedule_data`: Columns are Shift_Date, Interval_Timestamp_Local,
      Start_Time_Local, End_Time_Local, Person_Name, Job_Title, Activity_Exception_Name,
      Activity_Exception_Group, Total_Minutes, MU_Name. Note: Client is stored in `MU_Name`.
    - `host-np-project1.wfh.forecast_demand_data`: Columns are Local_Date, Local_Time,
      CT_ID, CT_Name, Offered_Calls, AHT_Seconds, Required_FTE, Revised_FTE,
      Service_Level_Goal_Pct, Max_Occupancy_Pct, Customer_ID.
    - `host-np-project1.wfh.exception_list`: Columns are EXCEPTION, Exception_Type,
      `Primary Category`, `Grouping`, Exception_Shrinkage.

    Args:
        sql_query: A SQL SELECT statement.

    Returns:
        List of row dictionaries resulting from the query (capped at 100 rows).
    """
    try:
        cleaned = sql_query.strip()
        if not cleaned.upper().startswith("SELECT") and not cleaned.upper().startswith("WITH"):
            return [{"error": "Only read-only SELECT or WITH statements are allowed."}]
        
        upper = cleaned.upper()
        for kw in ["DROP ", "DELETE ", "TRUNCATE ", "UPDATE ", "INSERT ", "ALTER ", "CREATE "]:
            if kw in upper:
                return [{"error": f"DML/DDL command '{kw.strip()}' is not permitted."}]
                
        client = _get_bq_client()
        query_job = client.query(cleaned)
        return [dict(r) for r in query_job.result(max_results=100)]
    except Exception as e:
        return [{"error": f"BigQuery SQL Error: {str(e)}. (Tip: In schedule_data, use `MU_Name` for client name; `Grouping` must be backticked)"}]


RAG_CORPUS_NAME = os.getenv(
    "WFM_RAG_CORPUS",
    "projects/394198810595/locations/us-central1/ragCorpora/7822391912928641024"
)


def query_wfm_knowledge_base(
    query: str = "base plan calculation logic",
) -> Dict[str, Any]:
    """Queries the Vertex AI RAG Corpus (wfh-knowledge) containing 'How_It_Works.md'.

    Provides official planning rules, calculation logic, data flows, and procedures:
    - Source data specifications (Forecast_Demand_Data, Schedule_Data)
    - Config rules (Selected CTs, Selected Primary CT_Skills, Week Commencing)
    - Demand, Supply, Summary, Assumptions, and Supply vs Demand calculations
    - Activity classifications and shrinkage reduction rules

    Args:
        query: Question or topic to retrieve from the knowledge base (e.g. 'How does base plan calculation work?', 'shrinkage reduction logic').

    Returns:
        A dict with retrieved documentation contexts and sources.
    """
    try:
        import vertexai
        from vertexai.preview import rag

        vertexai.init(project=PROJECT_ID, location="us-central1")
        res = rag.retrieval_query(
            rag_resources=[rag.RagResource(rag_corpus=RAG_CORPUS_NAME)],
            text=query,
            similarity_top_k=2,
            vector_distance_threshold=0.8,
        )
        contexts = [c.text for c in res.contexts.contexts]
        if not contexts:
            local_path = os.path.join(os.path.dirname(__file__), "How_It_Works.md")
            if os.path.exists(local_path):
                with open(local_path, "r", encoding="utf-8") as f:
                    contexts = [f.read()]

        return {
            "query": query,
            "corpus": "wfh-knowledge",
            "matches_count": len(contexts),
            "contexts": contexts,
        }
    except Exception as e:
        try:
            local_path = os.path.join(os.path.dirname(__file__), "How_It_Works.md")
            if os.path.exists(local_path):
                with open(local_path, "r", encoding="utf-8") as f:
                    return {
                        "query": query,
                        "source": "local_fallback",
                        "contexts": [f.read()],
                    }
        except Exception:
            pass
        return {"error": f"Knowledge base retrieval failed: {str(e)}"}

