-- Load all skill probability curves data
-- This script contains ~22,500 records organized by skill

-- Skill mapping:
-- Babbling = 3, Coordination = 8, Foundations of Social Development = 22
-- Head Control = 12, Memory and Attention = 17, Newborn Reflexes and Posture = 19
-- Object Exploration = 7, Secure Attachment = 2, Sensory Development = 6

-- Format: INSERT INTO skill_probability_curves (skill_id, skill_name, age_months, mark_key, probability, locale)

-- This is a placeholder file to demonstrate the structure
-- The actual inserts will be generated from parsing all CSVs
-- Each CSV has ~25 rows (ages 0-24) × ~100 columns (mark_keys 0.01-1.00)

-- Sample structure for Babbling (skill_id=3):
-- Age 0, mark_key 0.23: probability 0.007
INSERT INTO skill_probability_curves (skill_id, skill_name, age_months, mark_key, probability, locale) VALUES
(3, 'Babbling', 0, '0.23', 0.007, 'en'),
(3, 'Babbling', 0, '0.24', 0.016, 'en'),
(3, 'Babbling', 0, '0.25', 0.025, 'en');

-- Note: Due to the large size (~22,500 records), 
-- this file serves as a template. 
-- The full data loading will be done via a Python/Node script or direct DB import.