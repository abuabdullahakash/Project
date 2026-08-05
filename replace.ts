import fs from 'fs';
import path from 'path';
function replaceInFiles(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInFiles(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('bg-[#020617]')) {
        content = content.replace(/bg-\[#020617\]/g, 'bg-[#0f172a]');
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
replaceInFiles('./src');
