-- Script to load complete probability curve data for 9 skills
-- Run this via: Lovable Cloud > Database > Run this script manually
-- Or use supabase--insert tool to load in batches

-- This file contains the complete INSERT statements for 22,500 records
-- Format: INSERT INTO skill_probability_curves (skill_id, skill_name, age_months, mark_key, probability, locale)

-- Instructions:
-- 1. The migration already deleted old data for skills 2,3,6,7,8,12,17,19,22
-- 2. Now we need to insert the new 100-percentile data
-- 3. Use the supabase--insert tool or run this SQL directly in the database

-- Total inserts needed: 9 skills × 25 ages × 100 percentiles = 22,500 records
-- This script is a template - the actual INSERT statements will be generated from the CSV files
