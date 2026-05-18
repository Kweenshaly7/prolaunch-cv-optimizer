const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(dir + '/' + file).isDirectory()) {
      if(file !== 'node_modules' && file !== '.git') {
        filelist = walkSync(dir + '/' + file, filelist);
      }
    } else {
      filelist.push(path.join(dir, file));
    }
  });
  return filelist;
};

const files = walkSync('.');

const newRoot = ':root{--primary:#0A84FF;--navy:#1E3A6E;--teal:#19A08C;--teal-dark:#158f7d;--light-blue:#E8F3FF;--white:#FFFFFF;--gray:#6B7280;--border:#e2ead8;--green:#0A84FF;--green-dark:#0066CC;--green-pale:#E8F3FF;--forest:#1E3A6E;--forest-light:#2A4D8C;--cream:#FFFFFF;--amber:#f59e0b;}';

files.forEach(file => {
  if (file.endsWith('.html') || file.endsWith('.js')) {
    if (file === 'update.js') return;
    
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace :root
    if (file.endsWith('.html') && file !== 'index.html' && !file.includes('index.html')) {
      const rootRegex = /:root\s*\{[^}]+\}/g;
      if (rootRegex.test(content)) {
        content = content.replace(rootRegex, newRoot);
      }
    }

    // Rename ProLaunch Careers -> LaunchIQ
    content = content.replace(/ProLaunch Careers/g, 'LaunchIQ');
    content = content.replace(/ProLaunch_Document/g, 'LaunchIQ_Document');

    // Replace other "ProLaunch" unless it's "ProLaunch Technologies"
    const parts = content.split('ProLaunch');
    let newContent = parts[0];
    for(let i=1; i<parts.length; i++) {
      if (parts[i].startsWith(' Technologies')) {
        newContent += 'ProLaunch' + parts[i];
      } else {
        newContent += 'LaunchIQ' + parts[i];
      }
    }
    content = newContent;

    // Specific replace for generate-docx.js
    if (file.replace(/\\/g, '/').endsWith('api/generate-docx.js')) {
      content = content.replace(/const FOREST  = "124745";/g, 'const FOREST  = "1E3A6E";');
      content = content.replace(/const GREEN   = "7BB640";/g, 'const GREEN   = "0A84FF";');
      content = content.replace(/const CREAM   = "F7F9F4";/g, 'const CREAM   = "FFFFFF";');
    }

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('Updated', file);
    }
  }
});
