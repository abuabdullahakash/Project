import fs from 'fs';
import path from 'path';

function addMicroInteractions(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      addMicroInteractions(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Add hover:scale-105 active:scale-95 to prominent buttons ending in shadow or transition
      // We'll target buttons that have 'bg-' followed by some color and 'text-white'
      
      const btnRegex = /className="([^"]*bg-(?:blue|red|green|indigo|purple|emerald)[^"]*text-white[^"]*transition-all[^"]*)"/g;
      const glassBtnRegex = /className=\{`([^`]*bg-(?:blue|red|green|indigo|purple|emerald)[^`]*text-white[^`]*transition-all[^`]*)`\}/g;

      content = content.replace(btnRegex, (match, classNames) => {
        if (!classNames.includes('active:scale-95')) {
          changed = true;
          return `className="${classNames} hover:scale-105 active:scale-95"`;
        }
        return match;
      });

      content = content.replace(glassBtnRegex, (match, classNames) => {
        if (!classNames.includes('active:scale-95')) {
          changed = true;
          return `className={\`${classNames} hover:scale-105 active:scale-95\`}`;
        }
        return match;
      });

      if (changed) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
addMicroInteractions('./src');
