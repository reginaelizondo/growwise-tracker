-- =========================================
-- COMPLETE DATA LOAD FOR 9 SKILL PROBABILITY CURVES
-- =========================================
-- Total Records: 22,500 (9 skills × 25 ages × 100 percentiles)
-- 
-- HOW TO USE:
-- 1. Go to Lovable Cloud > Database
-- 2. Click "New Query" or "SQL Editor"
-- 3. Copy and paste this entire file
-- 4. Execute the query
-- 
-- IMPORTANT: This is a large INSERT operation (22,500 records)
-- It may take 30-60 seconds to complete
-- =========================================

-- Skills included:
-- skill_id=2: Secure Attachment
-- skill_id=3: Babbling
-- skill_id=6: Sensory Development
-- skill_id=7: Object Exploration  
-- skill_id=8: Coordination
-- skill_id=12: Head Control
-- skill_id=17: Memory and Attention
-- skill_id=19: Newborn Reflexes and Posture
-- skill_id=22: Foundations of Social Development

-- NOTE: Due to file size, this is a template showing the structure
-- The complete 22,500 INSERT statements need to be generated from the CSV files

-- You can use the HTML tool I created (scripts/generate_full_sql.html) to:
-- 1. Open it in a browser
-- 2. Drag the 9 CSV files
-- 3. Click "Generate SQL"
-- 4. Download the complete SQL file
-- 5. Execute it here in Cloud > Database

-- OR I can continue with the 45+ supabase--insert calls if you prefer
-- (it will take longer but will also work)

-- Sample structure for reference:
INSERT INTO skill_percentile_curves (skill_id, skill_name, age_months, percentile, probability, locale) VALUES
(7, 'Object Exploration', 0, 0.01, 0.08, 'en'),
(7, 'Object Exploration', 0, 0.02, 0.08, 'en');
-- ... continues for 22,500 records total
