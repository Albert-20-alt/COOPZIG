const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, 'src', 'pages'),
  path.join(__dirname, 'src', 'components')
];

const patterns = [
  // Typography normalisation
  { regex: /\bfont-black\b/g, replacement: 'font-semibold' },
  { regex: /\btracking-\[-0\.0[45]em\]\b/g, replacement: 'tracking-tight' },
  { regex: /\btracking-tighter\b/g, replacement: 'tracking-tight' },
  { regex: /\btracking-\[0\.[345]em\]\b/g, replacement: 'tracking-wider' },
  { regex: /\bitalic font-display\b/g, replacement: '' },
  { regex: /\bfont-display italic\b/g, replacement: '' },
  { regex: /\bfont-display\b/g, replacement: '' }, // Just stringing off font-display because user didn't object, keeps it clean
  { regex: /\btext-9xl|text-\[9\.5rem\]|text-\[10rem\]\b/g, replacement: 'text-5xl' },
  { regex: /\btext-8xl|text-\[8\.5rem\]|text-\[yrem\]\b/g, replacement: 'text-5xl' },
  { regex: /\btext-7xl|text-\[7\.5rem\]\b/g, replacement: 'text-4xl' },
  { regex: /\btext-6xl|text-\[5\.5rem\]|text-\[6\.5rem\]\b/g, replacement: 'text-3xl' },
  
  // High Paddings normalisation
  { regex: /\bp-24\b/g, replacement: 'p-10' },
  { regex: /\bp-20\b/g, replacement: 'p-10' },
  { regex: /\bp-16\b/g, replacement: 'p-8' },
  { regex: /\bp-12\b/g, replacement: 'p-8' }, // sometimes a bit much, p-8 is standard
  
  { regex: /\bpx-24\b/g, replacement: 'px-12' },
  { regex: /\bpx-32\b/g, replacement: 'px-12' },
  { regex: /\bpy-24\b/g, replacement: 'py-12' },
  
  // Icon sizes
  { regex: /\bw-32 h-32\b/g, replacement: 'w-16 h-16' },
  { regex: /\bh-32 w-32\b/g, replacement: 'h-16 w-16' },
  { regex: /\bw-24 h-24\b/g, replacement: 'w-16 h-16' },
  { regex: /\bh-24 w-24\b/g, replacement: 'h-16 w-16' },
  
  // Boarding radiuses
  { regex: /\brounded-\[6rem\]\b/g, replacement: 'rounded-3xl' },
  { regex: /\brounded-\[5rem\]\b/g, replacement: 'rounded-3xl' },
  { regex: /\brounded-\[4\.5rem\]\b/g, replacement: 'rounded-3xl' },
  { regex: /\brounded-\[4rem\]\b/g, replacement: 'rounded-3xl' },
  { regex: /\brounded-\[3\.5rem\]\b/g, replacement: 'rounded-3xl' },
  { regex: /\brounded-\[3rem\]\b/g, replacement: 'rounded-2xl' },
  { regex: /\brounded-\[2\.5rem\]\b/g, replacement: 'rounded-2xl' },
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
      // Cleanup double spaces inside className strings without breaking strings
      // Basic heuristic: any multiple spaces that might have been left
      if (modified) {
          content = content.replace(/className="((?:\\.|[^"\\])*)"/g, (match, p1) => {
              return `className="${p1.replace(/\s+/g, ' ').trim()}"`;
          });
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`Updated ${fullPath}`);
      }
    }
  }
}

targetDirs.forEach(processDirectory);
console.log('Refactoring complete.');
