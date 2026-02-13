#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Skill mapping
const skillMapping = {
  'temp_Babbling.csv': { id: 3, name: 'Babbling' },
  'temp_Coordination.csv': { id: 8, name: 'Coordination' },
  'temp_Foundations.csv': { id: 22, name: 'Foundations of Social Development' },
  'temp_HeadControl.csv': { id: 12, name: 'Head Control' },
  'temp_Memory.csv': { id: 17, name: 'Memory and Attention' },
  'temp_Newborn.csv': { id: 19, name: 'Newborn Reflexes and Posture' },
  'temp_Object.csv': { id: 7, name: 'Object Exploration' },
  'temp_Secure.csv': { id: 2, name: 'Secure Attachment' },
  'temp_Sensory.csv': { id: 6, name: 'Sensory Development' }
};

function parseCSV(filename, skillInfo) {
  console.log(`\nProcessing: ${filename}`);
  const content = fs.readFileSync(filename, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  
  if (lines.length < 2) {
    console.error(`Error: ${filename} has insufficient data`);
    return [];
  }

  // Parse header to extract percentiles
  const headers = lines[0].split(',');
  const percentiles = [];
  
  // Start from index 1 (skip first column which is skill name)
  for (let i = 1; i < headers.length && percentiles.length < 100; i++) {
    const val = headers[i].trim().replace(/"/g, '');
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0.01 && num <= 1.00) {
      percentiles.push(num);
    }
  }

  console.log(`  Found ${percentiles.length} percentile columns`);
  console.log(`  Found ${lines.length - 1} data rows`);

  const inserts = [];
  
  // Process each age row (skip header)
  for (let rowIdx = 1; rowIdx < lines.length && rowIdx <= 25; rowIdx++) {
    const row = lines[rowIdx].split(',');
    const age = parseInt(row[0]);
    
    if (isNaN(age) || age < 0 || age > 24) {
      continue;
    }

    // Process each percentile column
    for (let colIdx = 0; colIdx < percentiles.length; colIdx++) {
      const cellValue = row[colIdx + 1]; // +1 because first column is age
      
      if (!cellValue || cellValue.trim() === '') continue;

      // Convert "13%" to 0.13 or handle decimal values
      let probability;
      const cleaned = cellValue.trim().replace(/"/g, '');
      
      if (cleaned.includes('%')) {
        probability = parseFloat(cleaned.replace('%', '')) / 100;
      } else {
        probability = parseFloat(cleaned);
      }

      if (isNaN(probability) || probability < 0 || probability > 1) {
        console.warn(`  Warning: Invalid probability at age ${age}, col ${colIdx + 1}: ${cellValue}`);
        continue;
      }

      const percentile = percentiles[colIdx].toFixed(2);
      const prob = probability.toFixed(4);
      const skillName = skillInfo.name.replace(/'/g, "''");
      
      inserts.push(`(${skillInfo.id},'${skillName}',${age},${percentile},${prob},'en')`);
    }
  }

  console.log(`  Generated ${inserts.length} records`);
  return inserts;
}

// Main execution
console.log('=====================================');
console.log('CSV to SQL Converter for 9 Skills');
console.log('=====================================');

let allInserts = [];
let filesProcessed = 0;

for (const [filename, skillInfo] of Object.entries(skillMapping)) {
  try {
    const records = parseCSV(filename, skillInfo);
    allInserts.push(...records);
    filesProcessed++;
  } catch (error) {
    console.error(`Error processing ${filename}:`, error.message);
  }
}

console.log('\n=====================================');
console.log(`Total files processed: ${filesProcessed}/9`);
console.log(`Total records generated: ${allInserts.length}`);
console.log('=====================================\n');

// Generate SQL file with batches
const outputFile = 'COMPLETE_PERCENTILE_DATA.sql';
let sql = `-- =========================================\n`;
sql += `-- AUTO-GENERATED: Complete 9-Skill Probability Curves\n`;
sql += `-- =========================================\n`;
sql += `-- Generated: ${new Date().toISOString()}\n`;
sql += `-- Total records: ${allInserts.length}\n`;
sql += `-- Files processed: ${filesProcessed}/9\n\n`;

// Split into batches of 1000 for performance
const batchSize = 1000;
const numBatches = Math.ceil(allInserts.length / batchSize);

for (let i = 0; i < allInserts.length; i += batchSize) {
  const batch = allInserts.slice(i, i + batchSize);
  const batchNum = Math.floor(i / batchSize) + 1;
  
  sql += `-- Batch ${batchNum}/${numBatches} (${batch.length} records)\n`;
  sql += `INSERT INTO skill_percentile_curves (skill_id,skill_name,age_months,percentile,probability,locale) VALUES\n`;
  sql += batch.join(',\n');
  sql += ';\n\n';
}

fs.writeFileSync(outputFile, sql);

console.log(`✅ SQL file generated: ${outputFile}`);
console.log(`✅ File size: ${(fs.statSync(outputFile).size / 1024 / 1024).toFixed(2)} MB`);
console.log(`\nNext steps:`);
console.log(`1. Go to Lovable Cloud > Database`);
console.log(`2. Open SQL Editor`);
console.log(`3. Copy and paste the contents of ${outputFile}`);
console.log(`4. Execute the query`);
console.log(`\nExpected execution time: 30-60 seconds\n`);
