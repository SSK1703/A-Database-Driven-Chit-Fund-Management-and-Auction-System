// Catalog of all 19 DBMS Mini Project queries with descriptions, SQL, and categories

const PRESET_QUERIES = [
  {
    id: 'q1',
    number: 'Q1',
    name: 'Group Membership List',
    category: 'INNER JOIN',
    description: 'Retrieves all enrolled members of each chit group along with joined date, slot status, and payout win status.',
    sql: `SELECT cg.group_name, u.name AS member, gm.joined_date, gm.slot_status, gm.has_won_payout
FROM GroupMembers gm
JOIN ChitGroups cg ON cg.group_id = gm.group_id
JOIN Users u       ON u.user_id   = gm.user_id
ORDER BY cg.group_name, u.name;`
  },
  {
    id: 'q2',
    number: 'Q2',
    name: 'User Group Participation',
    category: 'LEFT JOIN',
    description: 'Lists every registered user and the number of chit groups they have joined (including users with 0 groups).',
    sql: `SELECT u.user_id, u.name, u.role, COUNT(gm.membership_id) AS groups_joined
FROM Users u LEFT JOIN GroupMembers gm ON gm.user_id = u.user_id
GROUP BY u.user_id, u.name, u.role
ORDER BY groups_joined DESC, u.name;`
  },
  {
    id: 'q3',
    number: 'Q3',
    name: 'Group Financial Aggregates',
    category: 'GROUP BY + AGGREGATES',
    description: 'Aggregates collection stats per group: total payments count, total collected sum, average payment, and maximum penalty.',
    sql: `SELECT cg.group_name, COUNT(DISTINCT mc.cycle_id) AS cycles_with_payments,
       COUNT(p.payment_id) AS payments, SUM(p.amount_paid) AS total_collected,
       AVG(p.amount_paid) AS avg_payment, MAX(p.penalty_amount) AS max_penalty
FROM ChitGroups cg
JOIN MonthlyCycles mc ON mc.group_id = cg.group_id
JOIN Payments p       ON p.cycle_id  = mc.cycle_id
GROUP BY cg.group_id, cg.group_name;`
  },
  {
    id: 'q4',
    number: 'Q4',
    name: 'Penalty Defaulters Filter',
    category: 'HAVING CLAUSE',
    description: 'Filters members who paid late or defaulted and had a total penalty greater than zero using the HAVING clause.',
    sql: `SELECT u.name, COUNT(*) AS bad_payments, SUM(p.penalty_amount) AS total_penalty
FROM Payments p JOIN Users u ON u.user_id = p.user_id
WHERE p.status IN ('late', 'defaulted')
GROUP BY u.user_id, u.name
HAVING SUM(p.penalty_amount) > 0
ORDER BY total_penalty DESC;`
  },
  {
    id: 'q5',
    number: 'Q5',
    name: 'Top 5 Highest Bids Overall',
    category: 'ORDER BY + LIMIT',
    description: 'Returns the top 5 highest auction bids across all groups and cycles.',
    sql: `SELECT cg.group_name, mc.month_number, u.name, b.bid_amount
FROM Bids b
JOIN MonthlyCycles mc ON mc.cycle_id = b.cycle_id
JOIN ChitGroups cg    ON cg.group_id = mc.group_id
JOIN Users u          ON u.user_id   = b.user_id
ORDER BY b.bid_amount DESC LIMIT 5;`
  },
  {
    id: 'q6',
    number: 'Q6',
    name: 'Bids Exceeding Average Bid',
    category: 'SCALAR SUBQUERY',
    description: 'Identifies all bids strictly higher than the overall average bid amount using a scalar subquery.',
    sql: `SELECT cycle_id, user_id, bid_amount
FROM Bids WHERE bid_amount > (SELECT AVG(bid_amount) FROM Bids)
ORDER BY bid_amount DESC;`
  },
  {
    id: 'q7',
    number: 'Q7',
    name: 'Auction Winner Members',
    category: 'IN SUBQUERY',
    description: 'Selects user details of members who have won an auction payout using an IN subquery against Payouts.',
    sql: `SELECT user_id, name FROM Users
WHERE user_id IN (SELECT winner_id FROM Payouts);`
  },
  {
    id: 'q8',
    number: 'Q8',
    name: 'Clean Record Members',
    category: 'NOT EXISTS',
    description: 'Finds members who have never been flagged in the Defaulters table using NOT EXISTS.',
    sql: `SELECT u.user_id, u.name FROM Users u
WHERE u.role = 'member'
  AND NOT EXISTS (SELECT 1 FROM Defaulters d WHERE d.user_id = u.user_id);`
  },
  {
    id: 'q9',
    number: 'Q9',
    name: 'Winning Bids Per Cycle',
    category: 'CORRELATED SUBQUERY',
    description: 'Retrieves the highest bid in each cycle by correlating the inner MAX(bid_amount) query with outer cycle_id.',
    sql: `SELECT b.cycle_id, b.user_id, b.bid_amount
FROM Bids b
WHERE b.bid_amount = (SELECT MAX(b2.bid_amount) FROM Bids b2 WHERE b2.cycle_id = b.cycle_id)
ORDER BY b.cycle_id;`
  },
  {
    id: 'q10',
    number: 'Q10',
    name: 'Members with Late Payments',
    category: 'CORRELATED EXISTS',
    description: 'Returns members who have made at least one late payment using correlated EXISTS.',
    sql: `SELECT u.name FROM Users u
WHERE EXISTS (SELECT 1 FROM Payments p WHERE p.user_id = u.user_id AND p.status = 'late');`
  },
  {
    id: 'q11',
    number: 'Q11',
    name: 'Payments Above Member Average',
    category: 'CORRELATED + AGGREGATE',
    description: 'Selects individual payments that are greater than the member\'s own historical average payment amount.',
    sql: `SELECT p.payment_id, p.user_id, p.cycle_id, p.amount_paid
FROM Payments p
WHERE p.amount_paid > (SELECT AVG(p2.amount_paid) FROM Payments p2 WHERE p2.user_id = p.user_id);`
  },
  {
    id: 'q12',
    number: 'Q12',
    name: 'Above-Average Performing Groups',
    category: 'NESTED SUBQUERY',
    description: 'Multi-level nested subquery that finds groups with total collections exceeding the average collection across all groups.',
    sql: `SELECT g.group_id, g.total
FROM (SELECT mc.group_id, SUM(p.amount_paid) AS total
      FROM MonthlyCycles mc JOIN Payments p ON p.cycle_id = mc.cycle_id
      GROUP BY mc.group_id) g
WHERE g.total > (SELECT AVG(x.total)
                 FROM (SELECT SUM(p.amount_paid) AS total
                       FROM MonthlyCycles mc JOIN Payments p ON p.cycle_id = mc.cycle_id
                       GROUP BY mc.group_id) x);`
  },
  {
    id: 'q13',
    number: 'Q13',
    name: 'Cycle-3 Bids Higher Than Any Cycle-1 Bid',
    category: 'ANY / ALL OPERATOR',
    description: 'Uses the ANY operator to select cycle 3 bids that are higher than at least one bid from cycle 1.',
    sql: `SELECT user_id, bid_amount FROM Bids
WHERE cycle_id = 3 AND bid_amount > ANY (SELECT bid_amount FROM Bids WHERE cycle_id = 1);`
  },
  {
    id: 'q14',
    number: 'Q14',
    name: 'Key Stakeholders (Organizers & Winners)',
    category: 'UNION',
    description: 'Combines users who are organizers of chit groups with users who have won an auction payout into a unified list.',
    sql: `SELECT u.name, 'Organizer' AS involvement FROM Users u
WHERE u.user_id IN (SELECT organizer_id FROM ChitGroups)
UNION
SELECT u.name, 'Winner' FROM Users u
WHERE u.user_id IN (SELECT winner_id FROM Payouts);`
  },
  {
    id: 'q15',
    number: 'Q15',
    name: 'Member Risk & Eligibility Classifier',
    category: 'CASE + FUNCTIONS',
    description: 'Evaluates member creditworthiness by passing user_id to stored function fn_risk_level and mapping via CASE to recommendations.',
    sql: `SELECT u.name, fn_risk_level(u.user_id) AS risk,
       CASE WHEN fn_risk_level(u.user_id) = 'LOW'    THEN 'Eligible for all groups'
            WHEN fn_risk_level(u.user_id) = 'MEDIUM' THEN 'Needs monitoring'
            ELSE 'Restrict new memberships' END AS recommendation
FROM Users u WHERE u.role = 'member';`
  },
  {
    id: 'q16',
    number: 'Q16',
    name: 'Complete Auction History of Closed Cycles',
    category: 'MULTI-TABLE JOIN',
    description: 'Joins Payouts, MonthlyCycles, ChitGroups, and Users to display full financial distribution per closed cycle.',
    sql: `SELECT cg.group_name, mc.month_number, w.name AS winner, po.amount_disbursed,
       po.dividend_per_member, mc.total_pool_amount
FROM Payouts po
JOIN MonthlyCycles mc ON mc.cycle_id = po.cycle_id
JOIN ChitGroups cg    ON cg.group_id = mc.group_id
JOIN Users w          ON w.user_id   = po.winner_id
ORDER BY cg.group_id, mc.month_number;`
  },
  {
    id: 'q17',
    number: 'Q17',
    name: 'Notifications Full-Text Search',
    category: 'FULL-TEXT SEARCH',
    description: 'Executes boolean mode full-text search against the indexed message column in Notifications.',
    sql: `SELECT notif_id, user_id, message
FROM Notifications WHERE MATCH(message) AGAINST('+payment +reminder' IN BOOLEAN MODE);`
  },
  {
    id: 'q18',
    number: 'Q18',
    name: 'Views Verification Query',
    category: 'DATABASE VIEWS',
    description: 'Queries vw_group_overview to demonstrate database view integration.',
    sql: `SELECT * FROM vw_group_overview;`
  },
  {
    id: 'q19',
    number: 'Q19',
    name: 'Bids Index Usage Explain Plan',
    category: 'INDEX USAGE & EXPLAIN',
    description: 'Verifies composite descending index idx_bids_cycle_amount usage on Bids.',
    sql: `EXPLAIN SELECT * FROM Bids WHERE cycle_id = 3 ORDER BY bid_amount DESC;`
  }
];

module.exports = { PRESET_QUERIES };
