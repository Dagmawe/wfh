# Workforce Management (WFM) Planning System & Procedures
**Source**: Mock Planner - Basic v0.7.xltm

## Overview
This document outlines the standard operating procedures, calculation logic, data flows, and configuration rules for the Workforce Management (WFM) planning and scheduling workbook.

---

## 1. Source Data Refresh Process
The workbook relies on two primary automated/system data exports:
1. **`Forecast_Demand_Data.csv` (Table: `tbl_ForecastDemand`)**:
   - Contains half-hourly forecasted contact volume, AHT (Average Handle Time), and required FTE per Contact Type (CT).
   - Pasted directly into the forecast table starting in the first empty row without manually inserting blank rows.
2. **`Schedule_Data.csv` (Table: `tbl_ScheduleData`)**:
   - Contains scheduled agent shifts, intervals, rosters, and adherence/exception states.
   - Feeds all supply and category calculations across the workbook.

---

## 2. Configuration Parameters (Config Tab)
- **Selected Contact Types (CTs)** (Range: `C4:C23`): Defines which contact queues (e.g., `Call Type 1`, `Call Type 2`, `Call Type 3`, `Call Type 4`) are included in Demand calculations.
- **Selected Primary CT_Skills** (Range: `G4:G23`): Defines which schedule skill profiles are included in Supply calculations.
- **Week Commencing (WC)** (Dropdown: `J4`):
  - Selects the active Monday (e.g., `24-Aug-2026`).
  - Drives dates and interval windows across **Demand**, **Supply**, **Summary**, **Assumptions**, and **Supply vs Demand** tabs simultaneously.
  - Sourced dynamically from `Lists!F2`.

---

## 3. Calculation & Planning Tabs

### A. Demand Tab
- Aggregates **Offered Calls**, **Service Level Goals (e.g., 80%)**, **Threshold Seconds (e.g., 20s)**, **AHT Seconds**, and **Required FTE** per half-hour interval for the selected Week Commencing.
- Directly powered by `Forecast_Demand_Data.csv`.

### B. Supply Tab
- Calculates scheduled headcount and hours for each activity category per half-hour interval:
  - **Available / On Queue**: `Available`, `Chat`, `Email`, `Multimedia`, `Outbound`, `Overtime`
  - **Breaks / Downtime**: `Paid Break`, `Unpaid Break / Lunch`, `System Downtime`, `Back Office`
  - **Absences & Leave**: `Absence`, `Planned Absence`, `Holiday Paid`, `Holiday Unpaid`
- **Planned Reductions**: Applies shrinkage and planned absence percentage reductions from the **Assumptions** tab proportionally across available activity categories.

### C. Summary Tab
- Daily roll-up of every Supply category into total scheduled hours per day for the week.
- Displays metric distributions as a percentage of total scheduled hours.

### D. Assumptions Tab
- Configures shrinkage and absence assumption percentages (e.g., Planned Absence %, Out of Office Shrinkage %, Holiday %).
- Dynamically splits hours reduction across productive channels (Available, Chat, Email, etc.) weighted by each category's daily baseline share.

### E. Supply vs. Demand Tab
- Compares **Required FTE** (from Demand) against **Planned Available + Overtime FTE** (from Supply) to compute daily and interval variances (Understaffed vs. Overstaffed).

---

## 4. Reference & Helper Tabs
- **`Lists`**: Contains master validation lists for dropdown menus and anchor dates.
- **`Supply_Calc`**: Pre-filtered start/end times per Supply category used to accelerate interval-overlap evaluations.
- **`Exception Lists`**: Master classification mapping schedule activity exception names to standardized categories and shrinkage eligibility.
