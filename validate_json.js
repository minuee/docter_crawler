
const fs = require('fs');
const path = require('path');

const dirPath = 'services/crawling_did_link/data/H01KR-11000005';
const filesToValidate = [
  'ai_analysis_request_20251120004009_김수연.json',
  'ai_analysis_request_20251120004009_임현영.json',
  'ai_analysis_request_20251120004010_곽신형.json',
  'ai_analysis_request_20251120004010_안혜선.json',
  'ai_analysis_request_20251120004010_임민지.json',
  'ai_analysis_request_20251120004011_손범석.json',
  'ai_analysis_request_20251120004011_신다은.json',
  'ai_analysis_request_20251120004012_김기조.json',
  'ai_analysis_request_20251120004013_김소연.json',
  'ai_analysis_request_20251120004013_남민정.json',
  'ai_analysis_request_20251120004013_윤혜령.json'
];

filesToValidate.forEach(file => {
  const filePath = path.join(dirPath, file);
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      JSON.parse(fileContent);
      console.log(`[SUCCESS] ${file} is a valid JSON.`);
    } catch (error) {
      console.error(`[ERROR] Failed to parse ${file}: ${error.message}`);
    }
  } else {
    console.warn(`[WARN] File not found: ${file}`);
  }
});
