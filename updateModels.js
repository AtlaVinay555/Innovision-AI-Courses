import fs from 'fs';
import path from 'path';

const filesToUpdate = [
  "src/app/api/youtube/summarize/route.js",
  "src/app/api/youtube/roadmap/route.js",
  "src/app/api/youtube/quiz/route.js",
  "src/app/api/youtube/exercises/route.js",
  "src/app/api/youtube/generate-course/route.js",
  "src/app/api/studio/enhance/route.js",
  "src/app/api/recommendations/route.js",
  "src/app/api/code/generate-website/route.js",
  "src/app/api/ai/generate/route.js"
];

for (const file of filesToUpdate) {
  const fullPath = path.resolve(file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf-8');
    content = content.replace(/"gemini-2\.0-flash"/g, '"gemini-2.5-flash"');
    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
}
