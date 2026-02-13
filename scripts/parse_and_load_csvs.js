const fs = require('fs');

// Mapping of CSV files to skill information
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

let allInsertValues = [];
let totalRecords = 0;

for (const [csvFile, skillInfo] of Object.entries(skillMapping)) {
  try {
    const content = fs.readFileSync(csvFile, 'utf-8');
    const lines = content.trim().split('\n');
    
    // First line contains headers (skill name and percentiles)
    const headers = lines[0].split(',');
    
    // Extract percentile columns (skip first column which is skill name)
    // The percentiles are: 0.01, 0.02, 0.03, ..., 1.00
    const percentileColumns = [];
    for (let i = 1; i < headers.length && i <= 100; i++) {
      const percentileValue = headers[i].trim();
      if (percentileValue && !isNaN(parseFloat(percentileValue))) {
        percentileColumns.push(parseFloat(percentileValue));
      }
    }
    
    console.log(`Processing ${csvFile}: ${skillInfo.name} (skill_id=${skillInfo.id})`);
    console.log(`  Found ${percentileColumns.length} percentile columns`);
    console.log(`  Found ${lines.length - 1} age rows`);
    
    // Process data rows (ages 0-24)
    for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
      const row = lines[rowIdx].split(',');
      const age = parseInt(row[0]);
      
      if (isNaN(age)) continue;
      
      // Process each percentile column
      for (let colIdx = 0; colIdx < percentileColumns.length; colIdx++) {
        const percentile = percentileColumns[colIdx];
        const cellValue = row[colIdx + 1]; // +1 because first column is age
        
        if (!cellValue) continue;
        
        // Convert percentage string "13%" to decimal 0.13
        let probability;
        if (typeof cellValue === 'string' && cellValue.includes('%')) {
          probability = parseFloat(cellValue.replace('%', '')) / 100;
        } else {
          probability = parseFloat(cellValue);
        }
        
        if (isNaN(probability)) continue;
        
        // Format for SQL INSERT
        const insertValue = `(${skillInfo.id}, '${skillInfo.name.replace(/'/g, "''")}', ${age}, ${percentile.toFixed(2)}, ${probability.toFixed(4)}, 'en')`;
        allInsertValues.push(insertValue);
        totalRecords++;
      }
    }
  } catch (error) {
    console.error(`Error processing ${csvFile}:`, error.message);
  }
}

console.log(`\nTotal records to insert: ${totalRecords}`);
console.log(`Generating SQL file...`);

// Split into batches of 1000 for manageable INSERT statements
const batchSize = 1000;
const batches = [];
for (let i = 0; i < allInsertValues.length; i += batchSize) {
  batches.push(allInsertValues.slice(i, i + batchSize));
}

// Generate SQL file with batched inserts
let sqlContent = `-- Auto-generated SQL to load 9 skill probability curves
-- Total records: ${totalRecords}
-- Generated: ${new Date().toISOString()}
\n`;

batches.forEach((batch, idx) => {
  sqlContent += `\n-- Batch ${idx + 1} of ${batches.length} (${batch.length} records)\n`;
  sqlContent += `INSERT INTO skill_percentile_curves (skill_id, skill_name, age_months, percentile, probability, locale) VALUES\n`;
  sqlContent += batch.join(',\n');
  sqlContent += ';\n';
});

fs.writeFileSync('load_all_percentile_data.sql', sqlContent);
console.log(`\nSQL file generated: load_all_percentile_data.sql`);
console.log(`Total batches: ${batches.length}`);
console.log(`\nRun this SQL file in your database to load all data.`);
