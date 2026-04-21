const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, 'src', 'pages'),
  path.join(__dirname, 'src', 'components')
];

const patterns = [
  // Font sizes
  { regex: /\btext-\[7px\]\b/g, replacement: 'text-xs' },
  { regex: /\btext-\[8px\]\b/g, replacement: 'text-xs' },
  { regex: /\btext-\[9px\]\b/g, replacement: 'text-xs' },
  { regex: /\btext-\[10px\]\b/g, replacement: 'text-sm' },
  { regex: /\btext-\[11px\]\b/g, replacement: 'text-sm' },
  
  // Primary Text Opacities
  { regex: /\btext-primary\/10\b/g, replacement: 'text-primary/60' },
  { regex: /\btext-primary\/15\b/g, replacement: 'text-primary/60' },
  { regex: /\btext-primary\/20\b/g, replacement: 'text-primary/70' },
  { regex: /\btext-primary\/25\b/g, replacement: 'text-primary/70' },
  { regex: /\btext-primary\/30\b/g, replacement: 'text-primary/80' },
  { regex: /\btext-primary\/40\b/g, replacement: 'text-primary/80' },

  // Secondary/Dark Background Opacities
  { regex: /\btext-white\/10\b/g, replacement: 'text-white/60' },
  { regex: /\btext-white\/15\b/g, replacement: 'text-white/60' },
  { regex: /\btext-white\/20\b/g, replacement: 'text-white/70' },
  { regex: /\btext-white\/30\b/g, replacement: 'text-white/80' },
  { regex: /\btext-white\/40\b/g, replacement: 'text-white/90' },
  
  // Custom dark colors
  { regex: /\btext-\[#0A1A0F\]\/10\b/g, replacement: 'text-[#0A1A0F]/60' },
  { regex: /\btext-\[#0A1A0F\]\/20\b/g, replacement: 'text-[#0A1A0F]/70' },
  { regex: /\btext-\[#0A1A0F\]\/30\b/g, replacement: 'text-[#0A1A0F]/80' },
  { regex: /\btext-\[#0A1A0F\]\/40\b/g, replacement: 'text-[#0A1A0F]/90' },
  
  // Other potential low contrast colors specific to this codebase
  { regex: /\btext-\[#1A2E1C\]\/10\b/g, replacement: 'text-[#1A2E1C]/60' },
  { regex: /\btext-\[#1A2E1C\]\/20\b/g, replacement: 'text-[#1A2E1C]/70' },
  { regex: /\btext-\[#1A2E1C\]\/30\b/g, replacement: 'text-[#1A2E1C]/80' },
  { regex: /\btext-\[#1A2E1C\]\/40\b/g, replacement: 'text-[#1A2E1C]/90' },
];

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      for (const { regex, replacement } of patterns) {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          modified = true;
        }
      }
      
      if (modified) {
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`Updated accessibility in ${fullPath}`);
      }
    }
  }
}

targetDirs.forEach(processDirectory);
console.log('Accessibility refactoring complete.');
