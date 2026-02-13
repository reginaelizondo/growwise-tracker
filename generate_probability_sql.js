// Script to generate SQL migration from 9 probability curve CSVs
const fs = require('fs');

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

let sqlValues = [];

for (const [csvFile, skillInfo] of Object.entries(skillMapping)) {
  const content = fs.readFileSync(csvFile, 'utf-8');
  const lines = content.trim().split('\n');
  
  // First line is headers - parse percentile columns
  const headers = lines[0].split(',');
  const percentiles = headers.slice(1); // Skip first column (skill name)
  
  // Process data rows (ages 0-24)
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    const age = parseInt(row[0]);
    
    // Process each percentile column
    for (let j = 1; j < row.length; j++) {
      const percentile = percentiles[j - 1];
      const probabilityStr = row[j];
      
      // Convert "13%" to 0.13
      const probability = parseFloat(probabilityStr.replace('%', '')) / 100;
      
      sqlValues.push(
        `(${skillInfo.id}, '${skillInfo.name.replace(/'/g, "''")}', ${age}, '${percentile}', ${probability}, 'en')`
      );
    }
  }
}

// Generate SQL migration file
const sql = `-- Load 9 skill probability curves with 100 percentiles each
-- Total records: 9 skills × 25 ages × 100 percentiles = 22,500 records

-- Delete old data (5 discrete percentiles) for these 9 skills
DELETE FROM skill_probability_curves 
WHERE skill_id IN (2, 3, 6, 7, 8, 12, 17, 19, 22);

-- Insert new data with 100 percentiles
INSERT INTO skill_probability_curves (skill_id, skill_name, age_months, mark_key, probability, locale) VALUES
${sqlValues.join(',\n')};
`;

fs.writeFileSync('load_9_probability_curves.sql', sql);
console.log(`Generated SQL with ${sqlValues.length} records`);
