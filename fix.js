const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const adminDir = path.join(publicDir, 'admin');

function walkSync(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    let filepath = path.join(dir, file);
    let stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      walkSync(filepath, callback);
    } else if (stats.isFile()) {
      callback(filepath);
    }
  });
}

const fixLinksRegexes = [
  { regex: /github\.com\/8ora\b/g, replace: 'github.com/8oraa' },
  { regex: /linkedin\.com\/in\/8ora\/?/g, replace: 'linkedin.com/in/8oraa/' },
  { regex: /twitter\.com\/8ora\b/g, replace: 'x.com/8oraa' },
  { regex: /<span>8<\/span><span>R<\/span><span>O<\/span><span>A<\/span>/g, replace: '<span>8</span><span>O</span><span>R</span><span>A</span>' }
];

walkSync(publicDir, (filepath) => {
  if (filepath.endsWith('.html')) {
    let content = fs.readFileSync(filepath, 'utf8');
    let changed = false;
    
    for (const rule of fixLinksRegexes) {
      if (rule.regex.test(content)) {
        content = content.replace(rule.regex, rule.replace);
        changed = true;
      }
    }
    
    // Add Instagram to footers where LinkedIn is
    if (content.includes('<a href="https://linkedin.com/in/8oraa/" target="_blank" class="footer-link">LinkedIn</a>') && !content.includes('Instagram')) {
      content = content.replace('<a href="https://linkedin.com/in/8oraa/" target="_blank" class="footer-link">LinkedIn</a>', '<a href="https://linkedin.com/in/8oraa/" target="_blank" class="footer-link">LinkedIn</a>\n        <a href="https://www.instagram.com/8oraa" target="_blank" class="footer-link">Instagram</a>');
      changed = true;
    }
    
    // Add Instagram to contact page socials
    if (filepath.endsWith('contact.html') && !content.includes('instagram.com')) {
      const igHTML = `
              <a href="https://www.instagram.com/8oraa" target="_blank" class="social-link" title="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>`;
      content = content.replace('</a>\n            </div>', '</a>' + igHTML + '\n            </div>');
      changed = true;
    }
    
    if (changed) {
      fs.writeFileSync(filepath, content, 'utf8');
      console.log('Fixed', filepath);
    }
  }
});

const databaseJS = path.join(__dirname, 'database.js');
let dbContent = fs.readFileSync(databaseJS, 'utf8');
if (dbContent.includes('twitter.com/8ora')) {
  for (const rule of fixLinksRegexes) {
    dbContent = dbContent.replace(rule.regex, rule.replace);
  }
  // add instagram to settings
  if (!dbContent.includes('key: \'instagram\'')) {
    dbContent = dbContent.replace('{ key: \'twitter\', value: \'https://x.com/8oraa\' }', '{ key: \'twitter\', value: \'https://x.com/8oraa\' },\n    { key: \'instagram\', value: \'https://www.instagram.com/8oraa\' }');
  }
  fs.writeFileSync(databaseJS, dbContent);
  console.log('Fixed database.js');
}

// Update admin.js to display the instagram field
const adminJsPath = path.join(__dirname, 'public', 'js', 'admin.js');
let adminJs = fs.readFileSync(adminJsPath, 'utf8');
if (!adminJs.includes('name="instagram"')) {
   adminJs = adminJs.replace('<div class="form-group"><label class="form-label">Twitter</label><input class="form-input" name="twitter" value="${settings.twitter||\'\'}"></div>', '<div class="form-group"><label class="form-label">Twitter/X</label><input class="form-input" name="twitter" value="${settings.twitter||\'\'}"></div>\n            <div class="form-group"><label class="form-label">Instagram</label><input class="form-input" name="instagram" value="${settings.instagram||\'\'}"></div>');
   fs.writeFileSync(adminJsPath, adminJs);
   console.log('Fixed admin.js');
}

console.log('Done');
