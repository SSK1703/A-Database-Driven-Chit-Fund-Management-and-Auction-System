-- =====================================================================
--  CHITVAULT : Chit Fund Management and Auction System
-- =====================================================================

CREATE DATABASE IF NOT EXISTS chitvault;
USE chitvault;

CREATE TABLE Users (
    user_id        INT AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    email          VARCHAR(100) NOT NULL UNIQUE,
    phone          VARCHAR(15)  NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    role           ENUM('organizer','member','admin') NOT NULL DEFAULT 'member',
    kyc_verified   BOOLEAN DEFAULT FALSE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE KYCDocuments (
    doc_id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    doc_type        VARCHAR(50) NOT NULL,          -- Aadhar, PAN, etc.
    doc_number      VARCHAR(50) NOT NULL,
    verified_status ENUM('pending','verified','rejected') DEFAULT 'pending',
    uploaded_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE ChitGroups (
    group_id            INT AUTO_INCREMENT PRIMARY KEY,
    group_name          VARCHAR(100) NOT NULL,
    organizer_id        INT NOT NULL,
    total_amount        DECIMAL(12,2) NOT NULL,
    monthly_installment DECIMAL(10,2) NOT NULL,
    duration_months     INT NOT NULL,
    max_members         INT NOT NULL,
    start_date          DATE NOT NULL,
    status              ENUM('upcoming','active','completed','cancelled') DEFAULT 'upcoming',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES Users(user_id),
    CHECK (total_amount = monthly_installment * duration_months)
);

CREATE TABLE GroupMembers (
    membership_id   INT AUTO_INCREMENT PRIMARY KEY,
    group_id        INT NOT NULL,
    user_id         INT NOT NULL,
    joined_date     DATE DEFAULT (CURRENT_DATE),
    has_won_payout  BOOLEAN DEFAULT FALSE,
    slot_status     ENUM('active','defaulted','exited') DEFAULT 'active',
    FOREIGN KEY (group_id) REFERENCES ChitGroups(group_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES Users(user_id)
);

CREATE TABLE MonthlyCycles (
    cycle_id           INT AUTO_INCREMENT PRIMARY KEY,
    group_id           INT NOT NULL,
    month_number       INT NOT NULL,
    cycle_date         DATE NOT NULL,
    status             ENUM('collection','bidding','closed') DEFAULT 'collection',
    total_pool_amount  DECIMAL(12,2),
    winning_bid_amount DECIMAL(12,2),
    FOREIGN KEY (group_id) REFERENCES ChitGroups(group_id) ON DELETE CASCADE,
    UNIQUE (group_id, month_number)     -- one cycle per month per group
);

CREATE TABLE Payments (
    payment_id     INT AUTO_INCREMENT PRIMARY KEY,
    cycle_id       INT NOT NULL,
    user_id        INT NOT NULL,
    amount_paid    DECIMAL(10,2) NOT NULL,
    payment_date   DATE DEFAULT (CURRENT_DATE),
    status         ENUM('paid','late','defaulted') DEFAULT 'paid',
    penalty_amount DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (cycle_id) REFERENCES MonthlyCycles(cycle_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES Users(user_id),
    UNIQUE (cycle_id, user_id)          -- one payment per member per cycle
);

CREATE TABLE Bids (
    bid_id     INT AUTO_INCREMENT PRIMARY KEY,
    cycle_id   INT NOT NULL,
    user_id    INT NOT NULL,
    bid_amount DECIMAL(10,2) NOT NULL,
    bid_time   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_winner  BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (cycle_id) REFERENCES MonthlyCycles(cycle_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES Users(user_id),
    UNIQUE (cycle_id, user_id)          -- one bid per member per cycle
);

CREATE TABLE Payouts (
    payout_id           INT AUTO_INCREMENT PRIMARY KEY,
    cycle_id            INT NOT NULL UNIQUE,     -- exactly one payout per cycle
    winner_id           INT NOT NULL,
    amount_disbursed    DECIMAL(12,2) NOT NULL,
    dividend_per_member DECIMAL(10,2),
    disbursed_date      DATE DEFAULT (CURRENT_DATE),
    FOREIGN KEY (cycle_id)  REFERENCES MonthlyCycles(cycle_id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES Users(user_id)
);

CREATE TABLE Defaulters (
    default_id       INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL,
    group_id         INT NOT NULL,
    cycle_id         INT NOT NULL,
    amount_due       DECIMAL(10,2) NOT NULL,
    penalty_applied  DECIMAL(10,2) DEFAULT 0,
    resolved_status  ENUM('pending','resolved') DEFAULT 'pending',
    FOREIGN KEY (user_id)  REFERENCES Users(user_id),
    FOREIGN KEY (group_id) REFERENCES ChitGroups(group_id),
    FOREIGN KEY (cycle_id) REFERENCES MonthlyCycles(cycle_id)
);

CREATE TABLE Notifications (
    notif_id    INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    message     VARCHAR(255) NOT NULL,
    type        VARCHAR(50),
    sent_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_status BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- ------------------------- ORIGINAL 3 TRIGGERS -------------------------
DELIMITER //

-- Prevent a member who already won a payout in this group from bidding again
CREATE TRIGGER trg_prevent_repeat_bid
BEFORE INSERT ON Bids
FOR EACH ROW
BEGIN
    DECLARE already_won BOOLEAN;
    SELECT gm.has_won_payout INTO already_won
    FROM GroupMembers gm
    JOIN MonthlyCycles mc ON mc.group_id = gm.group_id
    WHERE mc.cycle_id = NEW.cycle_id AND gm.user_id = NEW.user_id;

    IF already_won = TRUE THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Member has already won a payout in this group and cannot bid again';
    END IF;
END//

-- Auto-flag a defaulter when a payment is marked 'defaulted'
CREATE TRIGGER trg_flag_defaulter
AFTER UPDATE ON Payments
FOR EACH ROW
BEGIN
    IF NEW.status = 'defaulted' AND OLD.status <> 'defaulted' THEN
        INSERT INTO Defaulters (user_id, group_id, cycle_id, amount_due, penalty_applied)
        SELECT NEW.user_id, mc.group_id, NEW.cycle_id, NEW.amount_paid, NEW.penalty_amount
        FROM MonthlyCycles mc WHERE mc.cycle_id = NEW.cycle_id;
    END IF;
END//

-- Lock the winner's flag once a payout is created for a cycle
CREATE TRIGGER trg_lock_winner
AFTER INSERT ON Payouts
FOR EACH ROW
BEGIN
    UPDATE GroupMembers gm
    JOIN MonthlyCycles mc ON mc.group_id = gm.group_id
    SET gm.has_won_payout = TRUE
    WHERE mc.cycle_id = NEW.cycle_id AND gm.user_id = NEW.winner_id;
END//

DELIMITER ;
-- =====================================================================
-- PART 1 : DDL EXTRAS  (ALTER / CREATE / DROP / INDEX / CONSTRAINTS)
-- =====================================================================
 
-- 1.1 ALTER : new column + extra constraints
ALTER TABLE Users ADD COLUMN city VARCHAR(50) AFTER phone;
ALTER TABLE Users ADD CONSTRAINT chk_phone_len CHECK (CHAR_LENGTH(phone) >= 10);
ALTER TABLE GroupMembers ADD CONSTRAINT uq_group_user UNIQUE (group_id, user_id);
ALTER TABLE Payments ADD CONSTRAINT chk_payment_amt CHECK (amount_paid >= 0 AND penalty_amount >= 0);
ALTER TABLE Bids ADD CONSTRAINT chk_bid_amt CHECK (bid_amount > 0);
ALTER TABLE ChitGroups ADD CONSTRAINT chk_min_members CHECK (max_members > 1);
ALTER TABLE Notifications MODIFY type VARCHAR(30) NOT NULL DEFAULT 'general';
 
-- 1.2 New table for audit logging
CREATE TABLE AuditLog (
    log_id      INT AUTO_INCREMENT PRIMARY KEY,
    table_name  VARCHAR(50)  NOT NULL,
    record_id   INT          NOT NULL,
    action      VARCHAR(30)  NOT NULL,
    old_value   VARCHAR(100),
    new_value   VARCHAR(100),
    changed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
 
-- 1.3 CREATE / ALTER / DROP demo on a scratch table
CREATE TABLE TempScratch (id INT PRIMARY KEY, note VARCHAR(50));
ALTER TABLE TempScratch ADD COLUMN created_on DATE;
ALTER TABLE TempScratch RENAME COLUMN note TO remarks;
ALTER TABLE TempScratch DROP COLUMN remarks;
DROP TABLE TempScratch;
 
-- 1.4 INDEXES (composite, descending, full-text)
CREATE INDEX idx_payments_status_cycle ON Payments (status, cycle_id);
CREATE INDEX idx_bids_cycle_amount     ON Bids (cycle_id, bid_amount DESC);
CREATE INDEX idx_cycles_group_status   ON MonthlyCycles (group_id, status);
CREATE INDEX idx_defaulters_user_stat  ON Defaulters (user_id, resolved_status);
CREATE INDEX idx_users_name            ON Users (name);
CREATE FULLTEXT INDEX ft_notif_message ON Notifications (message);
DROP INDEX idx_users_name ON Users;        -- DROP INDEX demo
SHOW INDEX FROM Payments;
 
-- =====================================================================
-- PART 2 : DML - INSERT (seed data)
-- =====================================================================
 
-- 2.1 Users  (1 admin, 2-3 organizers, 4-10 members, 11 test user)
INSERT INTO Users (user_id, name, email, phone, city, password_hash, role, kyc_verified) VALUES
(1,  'Admin Rao',     'admin@chitvault.com',   '9000000001', 'Bengaluru', 'hash_admin', 'admin',     TRUE),
(2,  'Ramesh Kumar',  'ramesh@chitvault.com',  '9000000002', 'Bengaluru', 'hash_r',     'organizer', TRUE),
(3,  'Lakshmi Devi',  'lakshmi@chitvault.com', '9000000003', 'Mysuru',    'hash_l',     'organizer', TRUE),
(4,  'Arjun Nair',    'arjun@mail.com',        '9000000004', 'Bengaluru', 'hash_a',     'member',    FALSE),
(5,  'Priya Sharma',  'priya@mail.com',        '9000000005', 'Chennai',   'hash_p',     'member',    FALSE),
(6,  'Karthik Reddy', 'karthik@mail.com',      '9000000006', 'Hyderabad', 'hash_k',     'member',    FALSE),
(7,  'Sneha Iyer',    'sneha@mail.com',        '9000000007', 'Bengaluru', 'hash_s',     'member',    FALSE),
(8,  'Rahul Verma',   'rahul@mail.com',        '9000000008', 'Pune',      'hash_rv',    'member',    FALSE),
(9,  'Divya Menon',   'divya@mail.com',        '9000000009', 'Kochi',     'hash_d',     'member',    FALSE),
(10, 'Mohan Das',     'mohan@mail.com',        '9000000010', 'Mysuru',    'hash_m',     'member',    FALSE),
(11, 'Test User',     'test@mail.com',         '9000000011', 'Delhi',     'hash_t',     'member',    FALSE);
 
-- 2.2 KYC documents
INSERT INTO KYCDocuments (user_id, doc_type, doc_number, verified_status) VALUES
(4,  'Aadhar', '1111-2222-3333', 'verified'),
(5,  'PAN',    'ABCDE1234F',     'verified'),
(6,  'Aadhar', '2222-3333-4444', 'verified'),
(7,  'PAN',    'BCDEF2345G',     'verified'),
(8,  'Aadhar', '3333-4444-5555', 'verified'),
(9,  'PAN',    'CDEFG3456H',     'verified'),
(10, 'Aadhar', '4444-5555-6666', 'verified'),
(11, 'Aadhar', '5555-6666-7777', 'pending');
 
-- 2.3 Chit groups  (total_amount = installment * months  -> CHECK satisfied)
INSERT INTO ChitGroups (group_id, group_name, organizer_id, total_amount, monthly_installment,
                        duration_months, max_members, start_date, status) VALUES
(1, 'Gold Savers Circle',   2, 100000, 12500, 8,  8,  '2026-01-01', 'active'),
(2, 'Silver Monthly Club',  3,  30000,  5000, 6,  6,  '2026-02-01', 'active'),
(3, 'Platinum Future Fund', 2, 240000, 20000, 12, 12, '2026-12-01', 'upcoming');
 
-- 2.4 Group members
INSERT INTO GroupMembers (group_id, user_id, joined_date) VALUES
(1,3,'2025-12-20'),(1,4,'2025-12-21'),(1,5,'2025-12-22'),(1,6,'2025-12-22'),
(1,7,'2025-12-23'),(1,8,'2025-12-24'),(1,9,'2025-12-25'),(1,10,'2025-12-26'),
(2,4,'2026-01-15'),(2,5,'2026-01-16'),(2,6,'2026-01-17'),
(2,7,'2026-01-18'),(2,8,'2026-01-19'),(2,9,'2026-01-20');
 
-- 2.5 Monthly cycles
INSERT INTO MonthlyCycles (cycle_id, group_id, month_number, cycle_date, status) VALUES
(1, 1, 1, '2026-01-05', 'bidding'),
(2, 1, 2, '2026-02-05', 'bidding'),
(3, 1, 3, '2026-03-05', 'bidding'),
(4, 2, 1, '2026-02-10', 'bidding'),
(5, 2, 2, '2026-03-10', 'collection');
 
-- 2.6 Payments (INSERT ... SELECT used to avoid repetition)
INSERT INTO Payments (cycle_id, user_id, amount_paid, payment_date, status)
SELECT 1, user_id, 12500, '2026-01-04', 'paid' FROM GroupMembers WHERE group_id = 1;
 
INSERT INTO Payments (cycle_id, user_id, amount_paid, payment_date, status)
SELECT 2, user_id, 12500, '2026-02-04', 'paid' FROM GroupMembers WHERE group_id = 1;
 
INSERT INTO Payments (cycle_id, user_id, amount_paid, payment_date, status)
SELECT 3, user_id, 12500, '2026-03-04', 'paid' FROM GroupMembers WHERE group_id = 1 AND user_id <> 10;
INSERT INTO Payments (cycle_id, user_id, amount_paid, payment_date, status, penalty_amount)
VALUES (3, 10, 0, '2026-03-06', 'late', 0);
 
INSERT INTO Payments (cycle_id, user_id, amount_paid, payment_date, status)
SELECT 4, user_id, 5000, '2026-02-09', 'paid' FROM GroupMembers WHERE group_id = 2;
 
INSERT INTO Payments (cycle_id, user_id, amount_paid, payment_date, status)
SELECT 5, user_id, 5000, '2026-03-09', 'paid' FROM GroupMembers WHERE group_id = 2 AND user_id IN (4,5,6);
 
-- 2.7 Bids (higher bid = bigger discount the winner gives up)
INSERT INTO Bids (cycle_id, user_id, bid_amount, bid_time) VALUES
(1, 4, 8000, '2026-01-05 10:00:00'), (1, 5, 9500, '2026-01-05 10:05:00'),
(1, 6, 7000, '2026-01-05 10:10:00'), (1, 7, 9000, '2026-01-05 10:15:00'),
(2, 6, 8500, '2026-02-05 10:00:00'), (2, 7, 9200, '2026-02-05 10:07:00'),
(2, 8, 7500, '2026-02-05 10:12:00'), (2, 3, 6000, '2026-02-05 10:20:00'),
(3, 3, 9000, '2026-03-05 10:00:00'), (3, 4, 8800, '2026-03-05 10:10:00'),
(3, 6, 9100, '2026-03-05 10:15:00'),
(4, 4, 3000, '2026-02-10 11:00:00'), (4, 5, 3500, '2026-02-10 11:05:00'),
(4, 9, 2800, '2026-02-10 11:10:00');
 
-- 2.8 Notifications
INSERT INTO Notifications (user_id, message, type, read_status) VALUES
(4, 'Welcome to ChitVault. Your KYC is verified.',           'welcome',  TRUE),
(5, 'Auction for cycle 1 opens tomorrow at 10 AM.',          'auction',  FALSE),
(6, 'Payment reminder: monthly installment is due.',         'reminder', FALSE),
(7, 'Auction results will be announced after bidding ends.', 'auction',  TRUE),
(8, 'Payment reminder: please pay before the cycle date.',   'reminder', FALSE);
 
-- 2.9 UPDATE : verify users whose KYC documents are verified (subquery in UPDATE)
UPDATE Users
SET kyc_verified = TRUE
WHERE user_id IN (SELECT user_id FROM KYCDocuments WHERE verified_status = 'verified');
 
-- =====================================================================
-- PART 3 : STORED FUNCTIONS, PROCEDURES, TRIGGERS, VIEWS
-- =====================================================================
DELIMITER //
 
-- ---------------------------- FUNCTIONS ------------------------------
DROP FUNCTION IF EXISTS fn_member_count//
CREATE FUNCTION fn_member_count(p_group INT) RETURNS INT
READS SQL DATA
BEGIN
    DECLARE v INT;
    SELECT COUNT(*) INTO v FROM GroupMembers
    WHERE group_id = p_group AND slot_status <> 'exited';
    RETURN v;
END//
 
DROP FUNCTION IF EXISTS fn_calc_penalty//
CREATE FUNCTION fn_calc_penalty(p_installment DECIMAL(10,2), p_days_late INT) RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    -- 2% flat penalty + Rs.10 per day late
    RETURN ROUND(p_installment * 0.02 + GREATEST(p_days_late, 0) * 10, 2);
END//
 
DROP FUNCTION IF EXISTS fn_total_paid//
CREATE FUNCTION fn_total_paid(p_user INT, p_group INT) RETURNS DECIMAL(12,2)
READS SQL DATA
BEGIN
    DECLARE v DECIMAL(12,2);
    SELECT IFNULL(SUM(p.amount_paid), 0) INTO v
    FROM Payments p JOIN MonthlyCycles mc ON mc.cycle_id = p.cycle_id
    WHERE p.user_id = p_user AND mc.group_id = p_group;
    RETURN v;
END//
 
DROP FUNCTION IF EXISTS fn_dividend//
CREATE FUNCTION fn_dividend(p_group INT, p_bid DECIMAL(10,2)) RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN
    -- winning bid (discount) is shared equally among all members
    RETURN ROUND(p_bid / fn_member_count(p_group), 2);
END//
 
DROP FUNCTION IF EXISTS fn_risk_level//
CREATE FUNCTION fn_risk_level(p_user INT) RETURNS VARCHAR(10)
READS SQL DATA
BEGIN
    DECLARE c INT;
    SELECT COUNT(*) INTO c FROM Defaulters WHERE user_id = p_user;
    RETURN CASE WHEN c = 0 THEN 'LOW' WHEN c = 1 THEN 'MEDIUM' ELSE 'HIGH' END;
END//
 
-- ----------------------------- TRIGGERS ------------------------------
-- (existing: trg_prevent_repeat_bid, trg_flag_defaulter, trg_lock_winner)
 
DROP TRIGGER IF EXISTS trg_limit_members//
CREATE TRIGGER trg_limit_members
BEFORE INSERT ON GroupMembers
FOR EACH ROW
BEGIN
    DECLARE mx INT;
    SELECT max_members INTO mx FROM ChitGroups WHERE group_id = NEW.group_id;
    IF fn_member_count(NEW.group_id) >= mx THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Group is full: max_members reached';
    END IF;
END//
 
DROP TRIGGER IF EXISTS trg_validate_bid//
CREATE TRIGGER trg_validate_bid
BEFORE INSERT ON Bids
FOR EACH ROW
FOLLOWS trg_prevent_repeat_bid
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_group  INT;
    DECLARE v_total  DECIMAL(12,2);
    DECLARE v_active INT;
 
    SELECT mc.status, mc.group_id, cg.total_amount INTO v_status, v_group, v_total
    FROM MonthlyCycles mc JOIN ChitGroups cg ON cg.group_id = mc.group_id
    WHERE mc.cycle_id = NEW.cycle_id;
 
    IF v_status <> 'bidding' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bidding is not open for this cycle';
    END IF;
    IF NEW.bid_amount > v_total * 0.30 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bid exceeds 30% of the chit value';
    END IF;
    SELECT COUNT(*) INTO v_active FROM GroupMembers
    WHERE group_id = v_group AND user_id = NEW.user_id AND slot_status = 'active';
    IF v_active = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only active group members can bid';
    END IF;
END//
 
DROP TRIGGER IF EXISTS trg_auto_penalty//
CREATE TRIGGER trg_auto_penalty
BEFORE INSERT ON Payments
FOR EACH ROW
BEGIN
    DECLARE v_inst DECIMAL(10,2);
    DECLARE v_due  DATE;
    IF NEW.status = 'late' AND IFNULL(NEW.penalty_amount, 0) = 0 THEN
        SELECT cg.monthly_installment, mc.cycle_date INTO v_inst, v_due
        FROM MonthlyCycles mc JOIN ChitGroups cg ON cg.group_id = mc.group_id
        WHERE mc.cycle_id = NEW.cycle_id;
        SET NEW.penalty_amount =
            fn_calc_penalty(v_inst, DATEDIFF(IFNULL(NEW.payment_date, CURDATE()), v_due));
    END IF;
END//
 
DROP TRIGGER IF EXISTS trg_notify_defaulter//
CREATE TRIGGER trg_notify_defaulter
AFTER INSERT ON Defaulters
FOR EACH ROW
BEGIN
    DECLARE v_pending INT;
    INSERT INTO Notifications (user_id, message, type)
    VALUES (NEW.user_id,
            CONCAT('You have been flagged as a defaulter for cycle ', NEW.cycle_id,
                   '. Please clear your dues to avoid exclusion.'), 'default');
 
    SELECT COUNT(*) INTO v_pending FROM Defaulters
    WHERE user_id = NEW.user_id AND group_id = NEW.group_id AND resolved_status = 'pending';
    IF v_pending >= 2 THEN
        UPDATE GroupMembers SET slot_status = 'defaulted'
        WHERE user_id = NEW.user_id AND group_id = NEW.group_id;
    END IF;
END//
 
DROP TRIGGER IF EXISTS trg_notify_payout//
CREATE TRIGGER trg_notify_payout
AFTER INSERT ON Payouts
FOR EACH ROW
FOLLOWS trg_lock_winner
BEGIN
    INSERT INTO Notifications (user_id, message, type)
    VALUES (NEW.winner_id,
            CONCAT('Congratulations! You won the auction for cycle ', NEW.cycle_id,
                   '. Payout amount: Rs. ', NEW.amount_disbursed), 'payout');
END//
 
DROP TRIGGER IF EXISTS trg_audit_group_status//
CREATE TRIGGER trg_audit_group_status
AFTER UPDATE ON ChitGroups
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO AuditLog (table_name, record_id, action, old_value, new_value)
        VALUES ('ChitGroups', NEW.group_id, 'STATUS_CHANGE', OLD.status, NEW.status);
    END IF;
END//
 
-- ---------------------------- PROCEDURES -----------------------------
DROP PROCEDURE IF EXISTS sp_add_member//
CREATE PROCEDURE sp_add_member(IN p_group INT, IN p_user INT)
BEGIN
    DECLARE v_kyc BOOLEAN;
    SELECT kyc_verified INTO v_kyc FROM Users WHERE user_id = p_user;
    IF v_kyc IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User does not exist';
    END IF;
    IF v_kyc = FALSE THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'KYC not verified: cannot join group';
    END IF;
    INSERT INTO GroupMembers (group_id, user_id) VALUES (p_group, p_user);
    SELECT CONCAT('User ', p_user, ' added to group ', p_group) AS result;
END//
 
DROP PROCEDURE IF EXISTS sp_record_payment//
CREATE PROCEDURE sp_record_payment(IN p_cycle INT, IN p_user INT, IN p_amount DECIMAL(10,2), IN p_date DATE)
BEGIN
    DECLARE v_inst   DECIMAL(10,2);
    DECLARE v_due    DATE;
    DECLARE v_status VARCHAR(10);
 
    SELECT cg.monthly_installment, mc.cycle_date INTO v_inst, v_due
    FROM MonthlyCycles mc JOIN ChitGroups cg ON cg.group_id = mc.group_id
    WHERE mc.cycle_id = p_cycle;
 
    IF v_inst IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid cycle';
    END IF;
    IF p_amount < v_inst THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Amount is less than the monthly installment';
    END IF;
 
    SET v_status = IF(p_date > v_due, 'late', 'paid');
    INSERT INTO Payments (cycle_id, user_id, amount_paid, payment_date, status)
    VALUES (p_cycle, p_user, p_amount, p_date, v_status);   -- trg_auto_penalty fills penalty if late
 
    SELECT CONCAT('Payment recorded as ', v_status) AS result;
END//
 
DROP PROCEDURE IF EXISTS sp_place_bid//
CREATE PROCEDURE sp_place_bid(IN p_cycle INT, IN p_user INT, IN p_amount DECIMAL(10,2))
BEGIN
    INSERT INTO Bids (cycle_id, user_id, bid_amount) VALUES (p_cycle, p_user, p_amount);
    SELECT 'Bid placed successfully' AS result;
END//
 
DROP PROCEDURE IF EXISTS sp_close_cycle//
CREATE PROCEDURE sp_close_cycle(IN p_cycle INT)
BEGIN
    DECLARE v_group  INT;
    DECLARE v_status VARCHAR(20);
    DECLARE v_total  DECIMAL(12,2);
    DECLARE v_bid_id INT;
    DECLARE v_winner INT;
    DECLARE v_bid    DECIMAL(10,2);
    DECLARE v_pool   DECIMAL(12,2);
 
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
 
    SELECT mc.group_id, mc.status, cg.total_amount INTO v_group, v_status, v_total
    FROM MonthlyCycles mc JOIN ChitGroups cg ON cg.group_id = mc.group_id
    WHERE mc.cycle_id = p_cycle;
 
    IF v_group IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid cycle';
    END IF;
    IF v_status = 'closed' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cycle is already closed';
    END IF;
 
    START TRANSACTION;
 
    -- highest bid wins; tie -> earliest bid
    SELECT bid_id, user_id, bid_amount INTO v_bid_id, v_winner, v_bid
    FROM Bids WHERE cycle_id = p_cycle
    ORDER BY bid_amount DESC, bid_time ASC, bid_id ASC LIMIT 1;
 
    IF v_bid_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No bids placed for this cycle';
    END IF;
 
    UPDATE Bids SET is_winner = TRUE WHERE bid_id = v_bid_id;
 
    SELECT IFNULL(SUM(amount_paid), 0) INTO v_pool FROM Payments WHERE cycle_id = p_cycle;
 
    INSERT INTO Payouts (cycle_id, winner_id, amount_disbursed, dividend_per_member)
    VALUES (p_cycle, v_winner, v_total - v_bid, fn_dividend(v_group, v_bid));
    -- fires trg_lock_winner (sets has_won_payout) and trg_notify_payout
 
    UPDATE MonthlyCycles
    SET status = 'closed', winning_bid_amount = v_bid, total_pool_amount = v_pool
    WHERE cycle_id = p_cycle;
 
    COMMIT;
 
    SELECT p_cycle AS cycle_id, v_winner AS winner_id, v_bid AS winning_bid,
           v_total - v_bid AS amount_disbursed, fn_dividend(v_group, v_bid) AS dividend_per_member;
END//
 
DROP PROCEDURE IF EXISTS sp_mark_defaulters//
CREATE PROCEDURE sp_mark_defaulters(IN p_cycle INT)
BEGIN
    DECLARE done    INT DEFAULT 0;
    DECLARE v_user  INT;
    DECLARE v_count INT DEFAULT 0;
    DECLARE v_cdate DATE;
    DECLARE cur CURSOR FOR
        SELECT gm.user_id
        FROM GroupMembers gm JOIN MonthlyCycles mc ON mc.group_id = gm.group_id
        WHERE mc.cycle_id = p_cycle AND gm.slot_status = 'active'
          AND gm.user_id NOT IN (SELECT user_id FROM Payments WHERE cycle_id = p_cycle);
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
 
    SELECT cycle_date INTO v_cdate FROM MonthlyCycles WHERE cycle_id = p_cycle;
 
    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO v_user;
        IF done = 1 THEN LEAVE read_loop; END IF;
 
        INSERT INTO Payments (cycle_id, user_id, amount_paid, payment_date, status)
        VALUES (p_cycle, v_user, 0, v_cdate, 'late');           -- penalty auto-calculated
        UPDATE Payments SET status = 'defaulted'
        WHERE cycle_id = p_cycle AND user_id = v_user;           -- fires trg_flag_defaulter
        SET v_count = v_count + 1;
    END LOOP;
    CLOSE cur;
 
    -- trg_flag_defaulter stores amount_paid (0) as amount_due; correct it to the installment
    UPDATE Defaulters d JOIN ChitGroups g ON g.group_id = d.group_id
    SET d.amount_due = g.monthly_installment
    WHERE d.amount_due = 0;
 
    SELECT v_count AS members_marked_defaulter;
END//
 
DROP PROCEDURE IF EXISTS sp_generate_cycles//
CREATE PROCEDURE sp_generate_cycles(IN p_group INT)
BEGIN
    DECLARE i       INT DEFAULT 1;
    DECLARE v_dur   INT;
    DECLARE v_start DATE;
    SELECT duration_months, start_date INTO v_dur, v_start FROM ChitGroups WHERE group_id = p_group;
    WHILE i <= v_dur DO
        INSERT IGNORE INTO MonthlyCycles (group_id, month_number, cycle_date)
        VALUES (p_group, i, DATE_ADD(v_start, INTERVAL (i - 1) MONTH));
        SET i = i + 1;
    END WHILE;
    SELECT CONCAT(v_dur, ' cycles generated for group ', p_group) AS result;
END//
 
DROP PROCEDURE IF EXISTS sp_group_summary//
CREATE PROCEDURE sp_group_summary(IN p_group INT)
BEGIN
    SELECT * FROM vw_group_overview WHERE group_id = p_group;
    SELECT u.name, gm.slot_status, gm.has_won_payout
    FROM GroupMembers gm JOIN Users u ON u.user_id = gm.user_id
    WHERE gm.group_id = p_group;
    SELECT month_number, cycle_date, status, winning_bid_amount
    FROM MonthlyCycles WHERE group_id = p_group ORDER BY month_number;
END//
 
DELIMITER ;
 
-- ------------------------------ VIEWS --------------------------------
CREATE OR REPLACE VIEW vw_group_overview AS
SELECT cg.group_id, cg.group_name, u.name AS organizer, cg.total_amount,
       cg.monthly_installment, cg.duration_months, cg.max_members,
       fn_member_count(cg.group_id) AS current_members,
       (SELECT COUNT(*) FROM MonthlyCycles mc
        WHERE mc.group_id = cg.group_id AND mc.status = 'closed') AS cycles_completed,
       cg.status
FROM ChitGroups cg JOIN Users u ON u.user_id = cg.organizer_id;
 
CREATE OR REPLACE VIEW vw_member_payment_summary AS
SELECT u.user_id, u.name, cg.group_id, cg.group_name,
       COUNT(p.payment_id)                AS payments_made,
       IFNULL(SUM(p.amount_paid), 0)      AS total_paid,
       IFNULL(SUM(p.penalty_amount), 0)   AS total_penalty,
       IFNULL(SUM(p.status = 'late'), 0)      AS late_count,
       IFNULL(SUM(p.status = 'defaulted'), 0) AS default_count
FROM GroupMembers gm
JOIN Users u        ON u.user_id  = gm.user_id
JOIN ChitGroups cg  ON cg.group_id = gm.group_id
LEFT JOIN MonthlyCycles mc ON mc.group_id = gm.group_id
LEFT JOIN Payments p       ON p.cycle_id = mc.cycle_id AND p.user_id = gm.user_id
GROUP BY u.user_id, u.name, cg.group_id, cg.group_name;
 
CREATE OR REPLACE VIEW vw_cycle_results AS
SELECT mc.cycle_id, cg.group_name, mc.month_number, mc.cycle_date, mc.status,
       w.name AS winner, mc.winning_bid_amount, po.amount_disbursed, po.dividend_per_member
FROM MonthlyCycles mc
JOIN ChitGroups cg ON cg.group_id = mc.group_id
LEFT JOIN Payouts po ON po.cycle_id = mc.cycle_id
LEFT JOIN Users w    ON w.user_id  = po.winner_id;
 
CREATE OR REPLACE VIEW vw_defaulter_report AS
SELECT d.default_id, u.name, u.phone, cg.group_name, mc.month_number,
       d.amount_due, d.penalty_applied, d.resolved_status
FROM Defaulters d
JOIN Users u         ON u.user_id   = d.user_id
JOIN ChitGroups cg   ON cg.group_id = d.group_id
JOIN MonthlyCycles mc ON mc.cycle_id = d.cycle_id;
 
CREATE OR REPLACE VIEW vw_bid_ranking AS
SELECT b.cycle_id, u.name, b.bid_amount, b.bid_time, b.is_winner,
       RANK() OVER (PARTITION BY b.cycle_id ORDER BY b.bid_amount DESC) AS bid_rank
FROM Bids b JOIN Users u ON u.user_id = b.user_id;
 
-- =====================================================================
-- PART 4 : RUNNING THE BUSINESS WORKFLOW (procedures + triggers in action)
-- =====================================================================
 
-- 4.1 Close past auctions (picks winner, creates payout, locks winner, notifies)
CALL sp_close_cycle(1);
CALL sp_close_cycle(2);
CALL sp_close_cycle(4);
 
-- 4.2 Cycle 3 : user 10 never paid -> mark as defaulted (fires trg_flag_defaulter)
UPDATE Payments SET status = 'defaulted', penalty_amount = 500
WHERE cycle_id = 3 AND user_id = 10;
UPDATE Defaulters d JOIN ChitGroups g ON g.group_id = d.group_id
SET d.amount_due = g.monthly_installment WHERE d.amount_due = 0;   -- fix amount_due
 
-- 4.3 Cycle 5 : one more payment, then auto-flag everyone who has not paid (cursor)
CALL sp_record_payment(5, 7, 5000, '2026-03-09');
CALL sp_mark_defaulters(5);
 
-- 4.4 New group : add KYC-verified members and auto-generate its 12 cycles
CALL sp_add_member(3, 4);
CALL sp_add_member(3, 5);
CALL sp_add_member(3, 6);
CALL sp_generate_cycles(3);
 
-- 4.5 Test functions
SELECT fn_member_count(1)           AS members_group1,
       fn_calc_penalty(12500, 3)    AS penalty_3_days_late,
       fn_total_paid(4, 1)          AS arjun_total_paid_group1,
       fn_dividend(1, 9500)         AS dividend_for_bid_9500,
       fn_risk_level(10)            AS mohan_risk,
       fn_risk_level(4)             AS arjun_risk;
 
CALL sp_group_summary(1);
 
-- 4.6 INSERT / UPDATE / DELETE on a temporary group (also fires the audit trigger)
INSERT INTO ChitGroups (group_id, group_name, organizer_id, total_amount, monthly_installment,
                        duration_months, max_members, start_date)
VALUES (4, 'Temporary Demo Group', 2, 50000, 10000, 5, 5, '2026-11-01');
 
UPDATE ChitGroups SET status = 'cancelled' WHERE group_id = 4;       -- trg_audit_group_status
SELECT * FROM AuditLog;
 
DELETE FROM ChitGroups WHERE group_id = 4;
DELETE FROM Notifications WHERE read_status = TRUE;                   -- housekeeping
 
-- =====================================================================
-- PART 5 : SELECT QUERIES (JOIN, GROUP BY, HAVING, ORDER BY, subqueries)
-- =====================================================================
 
-- Q1  INNER JOIN : members of each group
SELECT cg.group_name, u.name AS member, gm.joined_date, gm.slot_status, gm.has_won_payout
FROM GroupMembers gm
JOIN ChitGroups cg ON cg.group_id = gm.group_id
JOIN Users u       ON u.user_id   = gm.user_id
ORDER BY cg.group_name, u.name;
 
-- Q2  LEFT JOIN : every user with number of groups joined (0 allowed)
SELECT u.user_id, u.name, u.role, COUNT(gm.membership_id) AS groups_joined
FROM Users u LEFT JOIN GroupMembers gm ON gm.user_id = u.user_id
GROUP BY u.user_id, u.name, u.role
ORDER BY groups_joined DESC, u.name;
 
-- Q3  GROUP BY + aggregates : collection per group
SELECT cg.group_name, COUNT(DISTINCT mc.cycle_id) AS cycles_with_payments,
       COUNT(p.payment_id) AS payments, SUM(p.amount_paid) AS total_collected,
       AVG(p.amount_paid) AS avg_payment, MAX(p.penalty_amount) AS max_penalty
FROM ChitGroups cg
JOIN MonthlyCycles mc ON mc.group_id = cg.group_id
JOIN Payments p       ON p.cycle_id  = mc.cycle_id
GROUP BY cg.group_id, cg.group_name;
 
-- Q4  HAVING : members who paid penalties
SELECT u.name, COUNT(*) AS bad_payments, SUM(p.penalty_amount) AS total_penalty
FROM Payments p JOIN Users u ON u.user_id = p.user_id
WHERE p.status IN ('late', 'defaulted')
GROUP BY u.user_id, u.name
HAVING SUM(p.penalty_amount) > 0
ORDER BY total_penalty DESC;
 
-- Q5  ORDER BY + LIMIT : top 5 bids overall
SELECT cg.group_name, mc.month_number, u.name, b.bid_amount
FROM Bids b
JOIN MonthlyCycles mc ON mc.cycle_id = b.cycle_id
JOIN ChitGroups cg    ON cg.group_id = mc.group_id
JOIN Users u          ON u.user_id   = b.user_id
ORDER BY b.bid_amount DESC LIMIT 5;
 
-- Q6  Scalar subquery : bids above the overall average bid
SELECT cycle_id, user_id, bid_amount
FROM Bids WHERE bid_amount > (SELECT AVG(bid_amount) FROM Bids)
ORDER BY bid_amount DESC;
 
-- Q7  IN subquery : users who have won a payout
SELECT user_id, name FROM Users
WHERE user_id IN (SELECT winner_id FROM Payouts);
 
-- Q8  NOT EXISTS : members with a clean record (no defaulter entries)
SELECT u.user_id, u.name FROM Users u
WHERE u.role = 'member'
  AND NOT EXISTS (SELECT 1 FROM Defaulters d WHERE d.user_id = u.user_id);
 
-- Q9  CORRELATED subquery : highest bid in each cycle (the winning bids)
SELECT b.cycle_id, b.user_id, b.bid_amount
FROM Bids b
WHERE b.bid_amount = (SELECT MAX(b2.bid_amount) FROM Bids b2 WHERE b2.cycle_id = b.cycle_id)
ORDER BY b.cycle_id;
 
-- Q10 CORRELATED EXISTS : members who paid late at least once
SELECT u.name FROM Users u
WHERE EXISTS (SELECT 1 FROM Payments p WHERE p.user_id = u.user_id AND p.status = 'late');
 
-- Q11 CORRELATED + aggregate : payments bigger than that member's own average
SELECT p.payment_id, p.user_id, p.cycle_id, p.amount_paid
FROM Payments p
WHERE p.amount_paid > (SELECT AVG(p2.amount_paid) FROM Payments p2 WHERE p2.user_id = p.user_id);
 
-- Q12 NESTED (multi-level) subquery : groups collecting more than the average group
SELECT g.group_id, g.total
FROM (SELECT mc.group_id, SUM(p.amount_paid) AS total
      FROM MonthlyCycles mc JOIN Payments p ON p.cycle_id = mc.cycle_id
      GROUP BY mc.group_id) g
WHERE g.total > (SELECT AVG(x.total)
                 FROM (SELECT SUM(p.amount_paid) AS total
                       FROM MonthlyCycles mc JOIN Payments p ON p.cycle_id = mc.cycle_id
                       GROUP BY mc.group_id) x);
 
-- Q13 ANY / ALL : cycle-3 bids that beat at least one cycle-1 bid
SELECT user_id, bid_amount FROM Bids
WHERE cycle_id = 3 AND bid_amount > ANY (SELECT bid_amount FROM Bids WHERE cycle_id = 1);
 
-- Q14 UNION : everyone who is either an organizer of a group or a payout winner
SELECT u.name, 'Organizer' AS involvement FROM Users u
WHERE u.user_id IN (SELECT organizer_id FROM ChitGroups)
UNION
SELECT u.name, 'Winner' FROM Users u
WHERE u.user_id IN (SELECT winner_id FROM Payouts);
 
-- Q15 CASE + function : member reliability report
SELECT u.name, fn_risk_level(u.user_id) AS risk,
       CASE WHEN fn_risk_level(u.user_id) = 'LOW'    THEN 'Eligible for all groups'
            WHEN fn_risk_level(u.user_id) = 'MEDIUM' THEN 'Needs monitoring'
            ELSE 'Restrict new memberships' END AS recommendation
FROM Users u WHERE u.role = 'member';
 
-- Q16 Multi-table JOIN : full auction history of every closed cycle
SELECT cg.group_name, mc.month_number, w.name AS winner, po.amount_disbursed,
       po.dividend_per_member, mc.total_pool_amount
FROM Payouts po
JOIN MonthlyCycles mc ON mc.cycle_id = po.cycle_id
JOIN ChitGroups cg    ON cg.group_id = mc.group_id
JOIN Users w          ON w.user_id   = po.winner_id
ORDER BY cg.group_id, mc.month_number;
 
-- Q17 FULL-TEXT SEARCH on notifications
SELECT notif_id, user_id, message
FROM Notifications WHERE MATCH(message) AGAINST('+payment +reminder' IN BOOLEAN MODE);
SELECT notif_id, user_id, message
FROM Notifications WHERE MATCH(message) AGAINST('payout congratulations' IN BOOLEAN MODE);
 
-- Q18 Queries on the VIEWS
SELECT * FROM vw_group_overview;
SELECT * FROM vw_member_payment_summary ORDER BY total_penalty DESC;
SELECT * FROM vw_cycle_results;
SELECT * FROM vw_defaulter_report;
SELECT * FROM vw_bid_ranking WHERE bid_rank <= 2;
 
-- Q19 Index usage check (look at the "key" column)
EXPLAIN SELECT * FROM Bids WHERE cycle_id = 3 ORDER BY bid_amount DESC;
EXPLAIN SELECT * FROM Payments WHERE status = 'late' AND cycle_id = 2;
 
-- =====================================================================
-- PART 6 : TRANSACTIONS (COMMIT, ROLLBACK, SAVEPOINT, locking)
-- =====================================================================
 
-- T1  COMMIT : defaulter settles dues (3 statements succeed together)
START TRANSACTION;
UPDATE Payments SET amount_paid = 12500, status = 'late', payment_date = '2026-03-15'
WHERE cycle_id = 3 AND user_id = 10;
UPDATE Defaulters SET resolved_status = 'resolved' WHERE cycle_id = 3 AND user_id = 10;
INSERT INTO Notifications (user_id, message, type)
VALUES (10, 'Your overdue installment for cycle 3 has been settled. Thank you.', 'payment');
COMMIT;
SELECT * FROM Defaulters WHERE user_id = 10;
 
-- T2  ROLLBACK : mistaken bulk change is undone
START TRANSACTION;
UPDATE Payments SET amount_paid = 0 WHERE cycle_id = 1;
SELECT SUM(amount_paid) AS pool_inside_txn FROM Payments WHERE cycle_id = 1;   -- 0
ROLLBACK;
SELECT SUM(amount_paid) AS pool_after_rollback FROM Payments WHERE cycle_id = 1; -- 100000
 
-- T3  SAVEPOINT : partial rollback
START TRANSACTION;
INSERT INTO Notifications (user_id, message, type) VALUES (4, 'Notice A: keep this message', 'general');
SAVEPOINT after_notice_a;
INSERT INTO Notifications (user_id, message, type) VALUES (4, 'Notice B: discard this message', 'general');
ROLLBACK TO SAVEPOINT after_notice_a;
COMMIT;
SELECT message FROM Notifications WHERE user_id = 4;     -- only Notice A remains
 
-- T4  Row locking + isolation level
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION;
SELECT * FROM MonthlyCycles WHERE cycle_id = 3 FOR UPDATE;   -- locks the row
UPDATE MonthlyCycles SET cycle_date = '2026-03-06' WHERE cycle_id = 3;
COMMIT;