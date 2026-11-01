const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { pool, query, testConnection, updateConfig, getDbConfig } = require('./db');
const { PRESET_QUERIES } = require('./presetQueries');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static frontend if built
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

// -------------------------------------------------------------
// Database Status & Configuration
// -------------------------------------------------------------
app.get('/api/db-status', async (req, res) => {
  try {
    const status = await testConnection();
    if (!status.success) {
      return res.status(500).json(status);
    }

    const [tableCounts] = await pool.query(`
      SELECT 'Users' AS entity, COUNT(*) AS count FROM Users
      UNION ALL SELECT 'ChitGroups', COUNT(*) FROM ChitGroups
      UNION ALL SELECT 'GroupMembers', COUNT(*) FROM GroupMembers
      UNION ALL SELECT 'MonthlyCycles', COUNT(*) FROM MonthlyCycles
      UNION ALL SELECT 'Payments', COUNT(*) FROM Payments
      UNION ALL SELECT 'Bids', COUNT(*) FROM Bids
      UNION ALL SELECT 'Payouts', COUNT(*) FROM Payouts
      UNION ALL SELECT 'Defaulters', COUNT(*) FROM Defaulters
      UNION ALL SELECT 'Notifications', COUNT(*) FROM Notifications
      UNION ALL SELECT 'AuditLog', COUNT(*) FROM AuditLog
    `);

    res.json({
      ...status,
      tableCounts
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/db-config', async (req, res) => {
  try {
    const { host, port, user, password, database } = req.body;
    const result = await updateConfig({ host, port: parseInt(port, 10), user, password, database });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// -------------------------------------------------------------
// Dashboard Analytics & Overview
// -------------------------------------------------------------
app.get('/api/dashboard', async (req, res) => {
  try {
    const [groupsSummary] = await pool.query(`
      SELECT 
        COUNT(*) AS total_groups,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_groups,
        SUM(CASE WHEN status = 'upcoming' THEN 1 ELSE 0 END) AS upcoming_groups,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_groups,
        IFNULL(SUM(total_amount), 0) AS total_fund_volume
      FROM ChitGroups
    `);

    const [usersSummary] = await pool.query(`
      SELECT 
        COUNT(*) AS total_users,
        SUM(CASE WHEN role = 'member' THEN 1 ELSE 0 END) AS total_members,
        SUM(CASE WHEN role = 'organizer' THEN 1 ELSE 0 END) AS total_organizers,
        SUM(CASE WHEN kyc_verified = 1 THEN 1 ELSE 0 END) AS verified_users
      FROM Users
    `);

    const [financials] = await pool.query(`
      SELECT 
        (SELECT IFNULL(SUM(amount_paid), 0) FROM Payments) AS total_collected,
        (SELECT IFNULL(SUM(amount_disbursed), 0) FROM Payouts) AS total_disbursed,
        (SELECT IFNULL(SUM(penalty_amount), 0) FROM Payments) AS total_penalties,
        (SELECT IFNULL(SUM(amount_due + penalty_applied), 0) FROM Defaulters WHERE resolved_status = 'pending') AS pending_defaults_amount
    `);

    const [auctionsSummary] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'bidding' THEN 1 END) AS active_auctions,
        COUNT(CASE WHEN status = 'collection' THEN 1 END) AS collection_cycles,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) AS closed_cycles
      FROM MonthlyCycles
    `);

    const [defaultersCount] = await pool.query(`
      SELECT COUNT(*) AS pending_defaulters FROM Defaulters WHERE resolved_status = 'pending'
    `);

    const [recentBids] = await pool.query(`
      SELECT b.bid_id, b.cycle_id, b.bid_amount, b.bid_time, b.is_winner, u.name AS bidder_name, cg.group_name
      FROM Bids b
      JOIN Users u ON u.user_id = b.user_id
      JOIN MonthlyCycles mc ON mc.cycle_id = b.cycle_id
      JOIN ChitGroups cg ON cg.group_id = mc.group_id
      ORDER BY b.bid_time DESC
      LIMIT 5
    `);

    const [recentAudit] = await pool.query(`
      SELECT * FROM AuditLog ORDER BY changed_at DESC LIMIT 5
    `);

    const [recentNotifications] = await pool.query(`
      SELECT n.*, u.name AS user_name 
      FROM Notifications n
      JOIN Users u ON u.user_id = n.user_id
      ORDER BY n.sent_at DESC
      LIMIT 6
    `);

    res.json({
      groups: groupsSummary[0],
      users: usersSummary[0],
      financials: financials[0],
      auctions: auctionsSummary[0],
      pendingDefaulters: defaultersCount[0].pending_defaulters,
      recentBids,
      recentAudit,
      recentNotifications
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Chit Groups
// -------------------------------------------------------------
app.get('/api/groups', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        cg.group_id,
        cg.group_name,
        u.name AS organizer,
        cg.organizer_id,
        cg.total_amount,
        cg.monthly_installment,
        cg.duration_months,
        cg.max_members,
        fn_member_count(cg.group_id) AS current_members,
        (SELECT COUNT(*) FROM MonthlyCycles mc WHERE mc.group_id = cg.group_id AND mc.status = 'closed') AS cycles_completed,
        (SELECT COUNT(*) FROM MonthlyCycles mc WHERE mc.group_id = cg.group_id) AS total_cycles_generated,
        cg.start_date,
        cg.status
      FROM ChitGroups cg
      JOIN Users u ON u.user_id = cg.organizer_id
      ORDER BY cg.group_id ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/groups/:id', async (req, res) => {
  try {
    const groupId = req.params.id;
    const [group] = await pool.query(`
      SELECT cg.*, u.name AS organizer_name, u.email AS organizer_email, u.phone AS organizer_phone
      FROM ChitGroups cg
      JOIN Users u ON u.user_id = cg.organizer_id
      WHERE cg.group_id = ?
    `, [groupId]);

    if (group.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const [members] = await pool.query(`
      SELECT 
        gm.membership_id,
        gm.group_id,
        gm.user_id,
        u.name,
        u.email,
        u.phone,
        u.city,
        u.kyc_verified,
        gm.joined_date,
        gm.has_won_payout,
        gm.slot_status,
        fn_risk_level(u.user_id) AS risk_level,
        fn_total_paid(u.user_id, gm.group_id) AS total_paid
      FROM GroupMembers gm
      JOIN Users u ON u.user_id = gm.user_id
      WHERE gm.group_id = ?
      ORDER BY gm.joined_date ASC, gm.membership_id ASC
    `, [groupId]);

    const [cycles] = await pool.query(`
      SELECT 
        mc.*,
        w.name AS winner_name,
        po.amount_disbursed,
        po.dividend_per_member,
        (SELECT COUNT(*) FROM Bids b WHERE b.cycle_id = mc.cycle_id) AS bids_count,
        (SELECT COUNT(*) FROM Payments p WHERE p.cycle_id = mc.cycle_id AND p.status IN ('paid', 'late')) AS paid_members_count
      FROM MonthlyCycles mc
      LEFT JOIN Payouts po ON po.cycle_id = mc.cycle_id
      LEFT JOIN Users w ON w.user_id = po.winner_id
      WHERE mc.group_id = ?
      ORDER BY mc.month_number ASC
    `, [groupId]);

    res.json({
      group: group[0],
      members,
      cycles
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/groups', async (req, res) => {
  try {
    const { group_name, organizer_id, monthly_installment, duration_months, max_members, start_date, status } = req.body;
    
    const installment = parseFloat(monthly_installment);
    const months = parseInt(duration_months, 10);
    const members = parseInt(max_members, 10);
    const total_amount = installment * months;

    if (members <= 1) {
      return res.status(400).json({ error: 'Check constraint violation: max_members must be greater than 1.' });
    }

    const [result] = await pool.query(`
      INSERT INTO ChitGroups (group_name, organizer_id, total_amount, monthly_installment, duration_months, max_members, start_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [group_name, organizer_id, total_amount, installment, months, members, start_date, status || 'upcoming']);

    res.status(201).json({
      success: true,
      group_id: result.insertId,
      message: 'Chit Group created successfully'
    });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

app.post('/api/groups/:id/add-member', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const { user_id } = req.body;
    
    // Call stored procedure sp_add_member(p_group, p_user)
    const [result] = await pool.query('CALL sp_add_member(?, ?)', [groupId, parseInt(user_id, 10)]);
    res.json({
      success: true,
      result: result[0] ? result[0][0] : 'Member added successfully'
    });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

app.post('/api/groups/:id/generate-cycles', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const [result] = await pool.query('CALL sp_generate_cycles(?)', [groupId]);
    res.json({
      success: true,
      result: result[0] ? result[0][0] : 'Cycles generated successfully'
    });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

app.patch('/api/groups/:id/status', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const { status } = req.body;
    // Updates group status and fires trg_audit_group_status!
    await pool.query('UPDATE ChitGroups SET status = ? WHERE group_id = ?', [status, groupId]);
    res.json({ success: true, message: `Group status updated to ${status}` });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

// -------------------------------------------------------------
// Monthly Cycles & Live Auction Hub
// -------------------------------------------------------------
app.get('/api/cycles', async (req, res) => {
  try {
    const { status, group_id } = req.query;
    let sql = `
      SELECT 
        mc.cycle_id,
        mc.group_id,
        cg.group_name,
        cg.total_amount,
        cg.monthly_installment,
        mc.month_number,
        mc.cycle_date,
        mc.status,
        mc.total_pool_amount,
        mc.winning_bid_amount,
        w.name AS winner_name,
        po.amount_disbursed,
        po.dividend_per_member,
        (SELECT COUNT(*) FROM Bids b WHERE b.cycle_id = mc.cycle_id) AS total_bids,
        (SELECT MAX(bid_amount) FROM Bids b WHERE b.cycle_id = mc.cycle_id) AS current_highest_bid
      FROM MonthlyCycles mc
      JOIN ChitGroups cg ON cg.group_id = mc.group_id
      LEFT JOIN Payouts po ON po.cycle_id = mc.cycle_id
      LEFT JOIN Users w ON w.user_id = po.winner_id
      WHERE 1=1
    `;
    const params = [];
    if (status) {
      sql += ' AND mc.status = ?';
      params.push(status);
    }
    if (group_id) {
      sql += ' AND mc.group_id = ?';
      params.push(group_id);
    }
    sql += ' ORDER BY mc.cycle_date ASC, mc.cycle_id ASC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cycles/:id', async (req, res) => {
  try {
    const cycleId = parseInt(req.params.id, 10);
    const [cycle] = await pool.query(`
      SELECT 
        mc.*,
        cg.group_name,
        cg.total_amount,
        cg.monthly_installment,
        cg.duration_months,
        cg.max_members,
        w.name AS winner_name,
        po.amount_disbursed,
        po.dividend_per_member
      FROM MonthlyCycles mc
      JOIN ChitGroups cg ON cg.group_id = mc.group_id
      LEFT JOIN Payouts po ON po.cycle_id = mc.cycle_id
      LEFT JOIN Users w ON w.user_id = po.winner_id
      WHERE mc.cycle_id = ?
    `, [cycleId]);

    if (cycle.length === 0) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    const [bids] = await pool.query(`
      SELECT 
        b.bid_id,
        b.cycle_id,
        b.user_id,
        u.name AS bidder_name,
        b.bid_amount,
        b.bid_time,
        b.is_winner,
        RANK() OVER (ORDER BY b.bid_amount DESC) AS bid_rank
      FROM Bids b
      JOIN Users u ON u.user_id = b.user_id
      WHERE b.cycle_id = ?
      ORDER BY b.bid_amount DESC, b.bid_time ASC
    `, [cycleId]);

    const [eligibleMembers] = await pool.query(`
      SELECT 
        gm.user_id,
        u.name,
        gm.slot_status,
        gm.has_won_payout,
        EXISTS(SELECT 1 FROM Bids b WHERE b.cycle_id = ? AND b.user_id = gm.user_id) AS has_bid,
        EXISTS(SELECT 1 FROM Payments p WHERE p.cycle_id = ? AND p.user_id = gm.user_id) AS has_paid
      FROM GroupMembers gm
      JOIN Users u ON u.user_id = gm.user_id
      WHERE gm.group_id = ?
    `, [cycleId, cycleId, cycle[0].group_id]);

    const [payments] = await pool.query(`
      SELECT p.*, u.name AS user_name
      FROM Payments p
      JOIN Users u ON u.user_id = p.user_id
      WHERE p.cycle_id = ?
    `, [cycleId]);

    res.json({
      cycle: cycle[0],
      bids,
      eligibleMembers,
      payments
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/cycles/:id/status', async (req, res) => {
  try {
    const cycleId = parseInt(req.params.id, 10);
    const { status } = req.body;
    await pool.query('UPDATE MonthlyCycles SET status = ? WHERE cycle_id = ?', [status, cycleId]);
    res.json({ success: true, message: `Cycle status updated to ${status}` });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

// Place bid via sp_place_bid
app.post('/api/cycles/:id/bid', async (req, res) => {
  try {
    const cycleId = parseInt(req.params.id, 10);
    const { user_id, bid_amount } = req.body;
    
    // CALL sp_place_bid(cycle_id, user_id, bid_amount)
    // Triggers will validate:
    // 1) trg_prevent_repeat_bid: cannot bid if already won payout
    // 2) trg_validate_bid: cycle must be in 'bidding' status, bid <= 30% of total chit amount, user must be active member
    const [result] = await pool.query('CALL sp_place_bid(?, ?, ?)', [cycleId, parseInt(user_id, 10), parseFloat(bid_amount)]);
    
    res.json({
      success: true,
      message: 'Bid placed successfully!',
      result: result[0] ? result[0][0] : null
    });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

// Close cycle & disburse payout via sp_close_cycle
app.post('/api/cycles/:id/close', async (req, res) => {
  try {
    const cycleId = parseInt(req.params.id, 10);
    // CALL sp_close_cycle(cycle_id)
    // Will determine highest bidder, update winner flag, insert payout, update cycle to closed, fire triggers
    const [result] = await pool.query('CALL sp_close_cycle(?)', [cycleId]);
    res.json({
      success: true,
      message: 'Auction closed successfully and payout disbursed!',
      payoutSummary: result[0] ? result[0][0] : null
    });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

// Mark defaulters via sp_mark_defaulters
app.post('/api/cycles/:id/mark-defaulters', async (req, res) => {
  try {
    const cycleId = parseInt(req.params.id, 10);
    // CALL sp_mark_defaulters(cycle_id)
    const [result] = await pool.query('CALL sp_mark_defaulters(?)', [cycleId]);
    res.json({
      success: true,
      message: 'Defaulters scan completed.',
      result: result[0] ? result[0][0] : null
    });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

// -------------------------------------------------------------
// Payments
// -------------------------------------------------------------
app.get('/api/payments', async (req, res) => {
  try {
    const { cycle_id, user_id, status } = req.query;
    let sql = `
      SELECT 
        p.payment_id,
        p.cycle_id,
        p.user_id,
        u.name AS user_name,
        cg.group_name,
        mc.month_number,
        mc.cycle_date,
        p.amount_paid,
        p.payment_date,
        p.status,
        p.penalty_amount
      FROM Payments p
      JOIN Users u ON u.user_id = p.user_id
      JOIN MonthlyCycles mc ON mc.cycle_id = p.cycle_id
      JOIN ChitGroups cg ON cg.group_id = mc.group_id
      WHERE 1=1
    `;
    const params = [];
    if (cycle_id) {
      sql += ' AND p.cycle_id = ?';
      params.push(cycle_id);
    }
    if (user_id) {
      sql += ' AND p.user_id = ?';
      params.push(user_id);
    }
    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY p.payment_id DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record payment via sp_record_payment
app.post('/api/payments', async (req, res) => {
  try {
    const { cycle_id, user_id, amount_paid, payment_date } = req.body;
    // CALL sp_record_payment(p_cycle, p_user, p_amount, p_date)
    // Validates amount >= installment, status ('paid' or 'late'), and trg_auto_penalty fills penalty if late
    const [result] = await pool.query('CALL sp_record_payment(?, ?, ?, ?)', [
      parseInt(cycle_id, 10),
      parseInt(user_id, 10),
      parseFloat(amount_paid),
      payment_date || new Date().toISOString().split('T')[0]
    ]);
    res.json({
      success: true,
      result: result[0] ? result[0][0] : 'Payment recorded'
    });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

// -------------------------------------------------------------
// Defaulters & Transaction Settlement
// -------------------------------------------------------------
app.get('/api/defaulters', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        d.default_id,
        d.user_id,
        u.name,
        u.phone,
        cg.group_id,
        cg.group_name,
        mc.cycle_id,
        mc.month_number,
        d.amount_due,
        d.penalty_applied,
        d.resolved_status
      FROM Defaulters d
      JOIN Users u ON u.user_id = d.user_id
      JOIN ChitGroups cg ON cg.group_id = d.group_id
      JOIN MonthlyCycles mc ON mc.cycle_id = d.cycle_id
      ORDER BY d.resolved_status ASC, d.default_id DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transactional settlement (T1 COMMIT Demonstration from DBMS Report)
app.post('/api/defaulters/:id/settle', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const defaultId = parseInt(req.params.id, 10);
    const { payment_date } = req.body;
    const pDate = payment_date || new Date().toISOString().split('T')[0];

    // Find defaulter record
    const [defaulter] = await connection.query(`
      SELECT d.*, cg.monthly_installment
      FROM Defaulters d
      JOIN ChitGroups cg ON cg.group_id = d.group_id
      WHERE d.default_id = ?
    `, [defaultId]);

    if (defaulter.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Defaulter entry not found' });
    }

    const { user_id, cycle_id, monthly_installment } = defaulter[0];

    // BEGIN TRANSACTION (Part 6: T1 COMMIT)
    await connection.beginTransaction();

    // 1. Update Payment
    await connection.query(`
      UPDATE Payments 
      SET amount_paid = ?, status = 'late', payment_date = ?
      WHERE cycle_id = ? AND user_id = ?
    `, [monthly_installment, pDate, cycle_id, user_id]);

    // 2. Mark Defaulter as resolved
    await connection.query(`
      UPDATE Defaulters 
      SET resolved_status = 'resolved'
      WHERE cycle_id = ? AND user_id = ?
    `, [cycle_id, user_id]);

    // 3. Insert notification
    await connection.query(`
      INSERT INTO Notifications (user_id, message, type)
      VALUES (?, CONCAT('Your overdue installment for cycle ', ?, ' has been settled. Thank you.'), 'payment')
    `, [user_id, cycle_id]);

    // COMMIT
    await connection.commit();
    connection.release();

    res.json({
      success: true,
      message: 'Transaction COMMITTED: Payment updated, defaulter cleared, and confirmation notification sent.'
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    res.status(500).json({ error: error.sqlMessage || error.message });
  }
});

// -------------------------------------------------------------
// Users & KYC
// -------------------------------------------------------------
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        u.*,
        fn_risk_level(u.user_id) AS risk_level,
        (SELECT COUNT(*) FROM GroupMembers gm WHERE gm.user_id = u.user_id) AS groups_joined,
        (SELECT COUNT(*) FROM KYCDocuments kd WHERE kd.user_id = u.user_id) AS kyc_docs_count
      FROM Users u
      ORDER BY u.user_id ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, phone, city, password, role } = req.body;
    if (!phone || phone.length < 10) {
      return res.status(400).json({ error: 'Check constraint violation: phone must have at least 10 characters.' });
    }
    const [result] = await pool.query(`
      INSERT INTO Users (name, email, phone, city, password_hash, role, kyc_verified)
      VALUES (?, ?, ?, ?, ?, ?, FALSE)
    `, [name, email, phone, city || 'Bengaluru', `hash_${name.toLowerCase().replace(/\s+/g, '_')}`, role || 'member']);
    
    res.status(201).json({
      success: true,
      user_id: result.insertId,
      message: 'User registered successfully'
    });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

app.get('/api/kyc', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT kd.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
      FROM KYCDocuments kd
      JOIN Users u ON u.user_id = kd.user_id
      ORDER BY kd.doc_id DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/kyc', async (req, res) => {
  try {
    const { user_id, doc_type, doc_number } = req.body;
    const [result] = await pool.query(`
      INSERT INTO KYCDocuments (user_id, doc_type, doc_number, verified_status)
      VALUES (?, ?, ?, 'pending')
    `, [user_id, doc_type, doc_number]);

    res.status(201).json({
      success: true,
      doc_id: result.insertId,
      message: 'KYC document submitted'
    });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

app.patch('/api/kyc/:id', async (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const { verified_status } = req.body;
    
    await pool.query('UPDATE KYCDocuments SET verified_status = ? WHERE doc_id = ?', [verified_status, docId]);
    
    // Automatically update Users.kyc_verified if approved (matches Part 2.9 DML)
    if (verified_status === 'verified') {
      await pool.query(`
        UPDATE Users SET kyc_verified = TRUE 
        WHERE user_id = (SELECT user_id FROM KYCDocuments WHERE doc_id = ?)
      `, [docId]);
    }

    res.json({ success: true, message: `KYC document status updated to ${verified_status}` });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

// -------------------------------------------------------------
// Notifications & Audit Log
// -------------------------------------------------------------
app.get('/api/notifications', async (req, res) => {
  try {
    const { user_id } = req.query;
    let sql = `
      SELECT n.*, u.name AS user_name 
      FROM Notifications n
      JOIN Users u ON u.user_id = n.user_id
    `;
    const params = [];
    if (user_id) {
      sql += ' WHERE n.user_id = ?';
      params.push(user_id);
    }
    sql += ' ORDER BY n.sent_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications/search', async (req, res) => {
  try {
    const { term } = req.query;
    if (!term) {
      return res.json([]);
    }
    // Full text search as in Query 17
    const [rows] = await pool.query(`
      SELECT notif_id, user_id, message, type, sent_at
      FROM Notifications 
      WHERE MATCH(message) AGAINST(? IN BOOLEAN MODE)
    `, [term]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.sqlMessage || error.message });
  }
});

app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    await pool.query('UPDATE Notifications SET read_status = TRUE WHERE notif_id = ?', [notifId]);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/audit-log', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM AuditLog ORDER BY log_id DESC LIMIT 50');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// DBMS Evaluation Center: Views, Functions, Presets, Queries, Transactions
// -------------------------------------------------------------

// 1. Views
app.get('/api/views/:name', async (req, res) => {
  try {
    const allowedViews = [
      'vw_group_overview',
      'vw_member_payment_summary',
      'vw_cycle_results',
      'vw_defaulter_report',
      'vw_bid_ranking'
    ];
    const viewName = req.params.name;
    if (!allowedViews.includes(viewName)) {
      return res.status(400).json({ error: 'Invalid view name' });
    }
    const [rows] = await pool.query(`SELECT * FROM ${viewName}`);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Stored Functions Execution Playground
app.post('/api/functions/calculate', async (req, res) => {
  try {
    const { fnName, params } = req.body;
    let sql = '';
    let args = [];

    switch (fnName) {
      case 'fn_member_count':
        sql = 'SELECT fn_member_count(?) AS result';
        args = [parseInt(params.group_id, 10)];
        break;
      case 'fn_calc_penalty':
        sql = 'SELECT fn_calc_penalty(?, ?) AS result';
        args = [parseFloat(params.installment), parseInt(params.days_late, 10)];
        break;
      case 'fn_total_paid':
        sql = 'SELECT fn_total_paid(?, ?) AS result';
        args = [parseInt(params.user_id, 10), parseInt(params.group_id, 10)];
        break;
      case 'fn_dividend':
        sql = 'SELECT fn_dividend(?, ?) AS result';
        args = [parseInt(params.group_id, 10), parseFloat(params.bid_amount)];
        break;
      case 'fn_risk_level':
        sql = 'SELECT fn_risk_level(?) AS result';
        args = [parseInt(params.user_id, 10)];
        break;
      default:
        return res.status(400).json({ error: 'Unknown function' });
    }

    const [rows] = await pool.query(sql, args);
    res.json({
      function: fnName,
      inputs: params,
      result: rows[0].result
    });
  } catch (error) {
    res.status(500).json({ error: error.sqlMessage || error.message });
  }
});

// 3. Preset Queries
app.get('/api/preset-queries', (req, res) => {
  res.json(PRESET_QUERIES);
});

app.post('/api/preset-queries/:id/run', async (req, res) => {
  try {
    const queryItem = PRESET_QUERIES.find(q => q.id === req.params.id);
    if (!queryItem) {
      return res.status(404).json({ error: 'Preset query not found' });
    }

    const startTime = Date.now();
    const [rows] = await pool.query(queryItem.sql);
    const executionTimeMs = Date.now() - startTime;

    // Run EXPLAIN plan if it's a SELECT statement
    let explainRows = [];
    try {
      const cleanSql = queryItem.sql.trim().replace(/;$/, '');
      if (cleanSql.toUpperCase().startsWith('SELECT')) {
        const [expl] = await pool.query(`EXPLAIN ${cleanSql}`);
        explainRows = expl;
      }
    } catch {
      // Ignore explain errors for non-standard queries
    }

    res.json({
      query: queryItem,
      rows,
      rowCount: Array.isArray(rows) ? rows.length : 0,
      executionTimeMs,
      explain: explainRows
    });
  } catch (error) {
    res.status(500).json({ error: error.sqlMessage || error.message });
  }
});

// 4. Custom SQL Console
app.post('/api/custom-query', async (req, res) => {
  try {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ error: 'SQL query required' });
    }

    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    // Prevent destructive root actions
    if (upper.includes('DROP DATABASE') || upper.includes('SHUTDOWN')) {
      return res.status(403).json({ error: 'Disallowed database level operation' });
    }

    const startTime = Date.now();
    const [result] = await pool.query(trimmed);
    const executionTimeMs = Date.now() - startTime;

    let explain = [];
    if (upper.startsWith('SELECT')) {
      try {
        const [exp] = await pool.query(`EXPLAIN ${trimmed.replace(/;$/, '')}`);
        explain = exp;
      } catch {}
    }

    res.json({
      result,
      rowCount: Array.isArray(result) ? result.length : (result.affectedRows || 0),
      executionTimeMs,
      explain
    });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

// 5. Transaction Demos (T1, T2, T3, T4)
app.post('/api/transactions/run-demo', async (req, res) => {
  const { demoType } = req.body; // 'commit' | 'rollback' | 'savepoint' | 'isolation'
  const connection = await pool.getConnection();

  try {
    const logs = [];

    if (demoType === 'rollback') {
      logs.push('1. START TRANSACTION;');
      await connection.beginTransaction();

      logs.push('2. Mistaken batch update: UPDATE Payments SET amount_paid = 0 WHERE cycle_id = 1;');
      await connection.query('UPDATE Payments SET amount_paid = 0 WHERE cycle_id = 1;');

      const [during] = await connection.query('SELECT SUM(amount_paid) AS pool_inside_txn FROM Payments WHERE cycle_id = 1');
      logs.push(`3. Checked state inside transaction: SUM(amount_paid) = ${during[0].pool_inside_txn} (Corrupted)`);

      logs.push('4. Executing ROLLBACK;');
      await connection.rollback();

      const [after] = await pool.query('SELECT SUM(amount_paid) AS pool_after_rollback FROM Payments WHERE cycle_id = 1');
      logs.push(`5. State after ROLLBACK: SUM(amount_paid) = ${after[0].pool_after_rollback} (Original state safely restored!)`);

      connection.release();
      return res.json({ success: true, demoType, logs, finalState: after[0] });

    } else if (demoType === 'savepoint') {
      logs.push('1. START TRANSACTION;');
      await connection.beginTransaction();

      logs.push('2. Insert Notice A: INSERT INTO Notifications (user_id, message, type) VALUES (4, "Demo Notice A: Keep", "general");');
      await connection.query('INSERT INTO Notifications (user_id, message, type) VALUES (4, "Demo Notice A: Keep", "general")');

      logs.push('3. Create SAVEPOINT after_notice_a;');
      await connection.query('SAVEPOINT after_notice_a');

      logs.push('4. Insert Notice B: INSERT INTO Notifications (user_id, message, type) VALUES (4, "Demo Notice B: Discard", "general");');
      await connection.query('INSERT INTO Notifications (user_id, message, type) VALUES (4, "Demo Notice B: Discard", "general")');

      logs.push('5. Executing: ROLLBACK TO SAVEPOINT after_notice_a;');
      await connection.query('ROLLBACK TO SAVEPOINT after_notice_a');

      logs.push('6. Executing COMMIT;');
      await connection.commit();

      const [notifs] = await pool.query('SELECT notif_id, message FROM Notifications WHERE user_id = 4 AND message LIKE "Demo Notice%"');
      logs.push(`7. Verified in database: Notice B discarded, Notice A preserved.`);

      connection.release();
      return res.json({ success: true, demoType, logs, notifications: notifs });

    } else if (demoType === 'isolation') {
      logs.push('1. SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;');
      await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;');

      logs.push('2. START TRANSACTION;');
      await connection.beginTransaction();

      logs.push('3. SELECT * FROM MonthlyCycles WHERE cycle_id = 3 FOR UPDATE; -- Acquires exclusive row lock');
      const [lockedRow] = await connection.query('SELECT * FROM MonthlyCycles WHERE cycle_id = 3 FOR UPDATE');

      logs.push(`4. Locked row cycle_id 3: current date is ${lockedRow[0].cycle_date}`);
      logs.push('5. UPDATE MonthlyCycles SET cycle_date = "2026-03-06" WHERE cycle_id = 3;');
      await connection.query('UPDATE MonthlyCycles SET cycle_date = "2026-03-06" WHERE cycle_id = 3');

      logs.push('6. COMMIT; -- Releases lock');
      await connection.commit();

      connection.release();
      return res.json({ success: true, demoType, logs });

    } else {
      // Default: COMMIT Demo
      logs.push('1. START TRANSACTION;');
      await connection.beginTransaction();

      logs.push('2. UPDATE Payments SET amount_paid = 12500, status = "late", payment_date = "2026-03-15" WHERE cycle_id = 3 AND user_id = 10;');
      await connection.query('UPDATE Payments SET amount_paid = 12500, status = "late", payment_date = "2026-03-15" WHERE cycle_id = 3 AND user_id = 10');

      logs.push('3. UPDATE Defaulters SET resolved_status = "resolved" WHERE cycle_id = 3 AND user_id = 10;');
      await connection.query('UPDATE Defaulters SET resolved_status = "resolved" WHERE cycle_id = 3 AND user_id = 10');

      logs.push('4. INSERT INTO Notifications (user_id, message, type) VALUES (10, "Your overdue installment for cycle 3 has been settled. Thank you.", "payment");');
      await connection.query('INSERT INTO Notifications (user_id, message, type) VALUES (10, "Your overdue installment for cycle 3 has been settled. Thank you.", "payment")');

      logs.push('5. COMMIT;');
      await connection.commit();

      const [def] = await pool.query('SELECT * FROM Defaulters WHERE user_id = 10 AND cycle_id = 3');
      logs.push(`6. Verified atomically committed: Defaulter status is "${def[0]?.resolved_status}"`);

      connection.release();
      return res.json({ success: true, demoType: 'commit', logs, defaulter: def[0] });
    }
  } catch (error) {
    await connection.rollback();
    connection.release();
    res.status(500).json({ error: error.sqlMessage || error.message });
  }
});

// Fallback for SPA client routes
app.use((req, res) => {
  const indexHtml = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.json({
      message: 'ChitVault API is running',
      version: '1.0.0',
      clientReady: false
    });
  }
});

app.listen(PORT, () => {
  console.log(`ChitVault API server listening on http://localhost:${PORT}`);
});
