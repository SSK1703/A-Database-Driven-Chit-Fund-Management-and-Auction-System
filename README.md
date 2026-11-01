# CHITVAULT: A Database-Driven Chit Fund Management and Auction System

**DBMS Mini Project | PES University (Section H)**  
**Group 10:**
- **Shasank SK** (SRN: `PES2UG24CS460`)
- **Samartha MS** (SRN: `PES2UG24CS435`)

---

## 🚀 Live System Overview

**ChitVault** is a full-stack, production-grade web application and database management interface built directly on top of the MySQL database `chitvault`. It provides an intuitive, high-performance user interface for managing chit fund groups, reverse auctions, installment payments, defaulter sweeps, KYC verification, and live evaluation of DBMS concepts.

### 🌐 Access URL
- **Local Web UI & API Server**: [http://localhost:5000](http://localhost:5000)

---

## 🛠️ System Architecture

- **Database**: MySQL Community Server 8.0 (`chitvault`)
- **Backend API**: Node.js & Express (`server/index.js`) with `mysql2` connection pooling and multiple statements support.
- **Frontend UI**: React 19, Tailwind CSS v4, Lucide Icons, Vite 8 (`client/`)
- **DBMS Enforcements**: Stored Procedures, Functions, Before/After Triggers, Views, Check Constraints, and ACID Transactions.

---

## 📁 Database Schema Details

### Tables (10 Core Entities + AuditLog)
1. **`Users`**: Primary stakeholder identity table (`admin`, `organizer`, `member`) with phone length check.
2. **`KYCDocuments`**: Identity verification records (Aadhar, PAN) with verification status.
3. **`ChitGroups`**: Chit schemes enforcing `CHECK (total_amount = monthly_installment * duration_months)` and `CHECK (max_members > 1)`.
4. **`GroupMembers`**: Enrolled members in each chit group with `slot_status` and `has_won_payout` flag.
5. **`MonthlyCycles`**: Monthly cycle records (`collection`, `bidding`, `closed`) with `UNIQUE (group_id, month_number)`.
6. **`Payments`**: Installment records with `UNIQUE (cycle_id, user_id)` and status (`paid`, `late`, `defaulted`).
7. **`Bids`**: Auction bids with `UNIQUE (cycle_id, user_id)` and discount bid amounts.
8. **`Payouts`**: Disbursed funds to the cycle winner with member dividend records.
9. **`Defaulters`**: Flagged members with pending dues and penalties.
10. **`Notifications`**: System broadcast messages with full-text search capability.
11. **`AuditLog`**: Automated trigger audit history recording table status transitions.

---

## ⚙️ Stored Logic & Database Objects

### Stored Procedures
- `sp_add_member(p_group, p_user)`: Enrolls user if KYC is verified and group capacity has not been breached.
- `sp_generate_cycles(p_group)`: Auto-generates all monthly cycles for a newly created group.
- `sp_place_bid(p_cycle, p_user, p_amount)`: Submits auction bid with trigger validations.
- `sp_close_cycle(p_cycle)`: Atomically determines highest bidder, updates winner status, computes dividends, inserts payout, and notifies winner.
- `sp_record_payment(p_cycle, p_user, p_amount, p_date)`: Records installment and computes penalty.
- `sp_mark_defaulters(p_cycle)`: Cursor that iterates over non-paying active members, flags them as defaulted, and fires triggers.
- `sp_group_summary(p_group)`: Returns summary overview, enrolled members, and cycle status.

### Stored Functions
- `fn_member_count(p_group)`: Returns number of active members in a group.
- `fn_calc_penalty(p_installment, p_days_late)`: Deterministic calculation: 2% flat penalty + ₹10 per day late.
- `fn_total_paid(p_user, p_group)`: Sums total installments paid by a user for a scheme.
- `fn_dividend(p_group, p_bid)`: Calculates dividend distributed equally to each member.
- `fn_risk_level(p_user)`: Evaluates credit risk (LOW, MEDIUM, HIGH) based on defaulter history.

### Database Triggers
- `trg_prevent_repeat_bid` (BEFORE INSERT ON Bids): Disallows members who already won a payout from bidding again.
- `trg_validate_bid` (BEFORE INSERT ON Bids): Validates bidding status, caps bid at 30% of total chit fund, and ensures member is active.
- `trg_limit_members` (BEFORE INSERT ON GroupMembers): Enforces `max_members` capacity on group enrollment.
- `trg_auto_penalty` (BEFORE INSERT ON Payments): Automatically calculates penalty for late payments.
- `trg_flag_defaulter` (AFTER UPDATE ON Payments): Inserts defaulter record when payment is marked 'defaulted'.
- `trg_notify_defaulter` (AFTER INSERT ON Defaulters): Dispatches notification and excludes member if &ge; 2 pending defaults.
- `trg_lock_winner` (AFTER INSERT ON Payouts): Sets `has_won_payout = TRUE` on GroupMembers.
- `trg_notify_payout` (AFTER INSERT ON Payouts): Dispatches congratulatory payout notification to winner.
- `trg_audit_group_status` (AFTER UPDATE ON ChitGroups): Records status changes to `AuditLog`.

### Views
- `vw_group_overview`: Financial progress and active membership counts per group.
- `vw_member_payment_summary`: Aggregate payments, penalties, and default counts per member.
- `vw_cycle_results`: Auction results, winning bid, payout disbursed, and dividends.
- `vw_defaulter_report`: Audit report of all defaulters with contact info and amounts due.
- `vw_bid_ranking`: Bids ranked per cycle using `RANK() OVER (PARTITION BY cycle_id ORDER BY bid_amount DESC)`.

---

## 🖥️ How to Run

1. **Ensure MySQL 8.0 is running**:
   - The local service `MySQL80` on port `3306` must be active.
   - Credentials configured in `.env` (default: `root` / `shasank03_07`).

2. **Start the Unified Server**:
   ```powershell
   npm start
   ```
   *Starts the Express server on [http://localhost:5000](http://localhost:5000) which serves both the REST API and the React UI.*

3. **Development Mode (with Hot Reload)**:
   ```powershell
   npm run dev
   ```
   *Runs backend server on port 5000 and Vite dev server on port 5173.*
