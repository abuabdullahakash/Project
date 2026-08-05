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
      
      const str1 = "theme === 'dark' ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200'";
      const glass1 = "theme === 'dark' ? 'bg-[#0f172a]/90 backdrop-blur-2xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]' : 'bg-white/90 backdrop-blur-2xl border-slate-200 shadow-[0_8px_32px_rgba(0,0,0,0.1)]'";
      
      const str2 = "theme === 'dark' ? 'bg-[#0f172a] border-white/10' : 'bg-white border-gray-200'";
      const glass2 = "theme === 'dark' ? 'bg-[#0f172a]/90 backdrop-blur-2xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]' : 'bg-white/90 backdrop-blur-2xl border-gray-200 shadow-[0_8px_32px_rgba(0,0,0,0.1)]'";
      
      let changed = false;
      if (content.includes(str1)) {
        content = content.split(str1).join(glass1);
        changed = true;
      }
      if (content.includes(str2)) {
        content = content.split(str2).join(glass2);
        changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
replaceInFiles('./src');
