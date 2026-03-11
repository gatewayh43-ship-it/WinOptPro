// Fix #3: Last 8 missing links + fix HWiNFO encoding + correct Foxit PDF Reader ID
import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('./src/data/app_metadata.json', 'utf8'));

const sourceLinks = {
  'Everything':        'https://www.voidtools.com/downloads/',
  'OP Auto Clicker':   'https://github.com/OP-Auto-Clicker/OP-Auto-Clicker',
  'Wise Toys':         'https://www.wisecleaner.com/wise-care-365.html',
  'Dropbox':           'https://www.dropbox.com/install',
  'Foxit PDF Editor':  'https://apps.microsoft.com/detail/xpdnzd76fp5jr7',
  'PuTTY':             'https://www.chiark.greenend.org.uk/~sgtatham/putty/download.html',
};

// Foxit PDF Reader was set to wrong ID in v2 — correct it
const corrections = {
  'Foxit PDF Reader':  'https://apps.microsoft.com/detail/xpfcg5nrkxqpkt',
};

let fixed = 0, corrected = 0, nameFixed = 0;

for (const cat of data.categories) {
  for (const app of cat.apps) {
    // Fix corrupted HWiNFO® encoding (Â® → ®)
    if (app.name === 'HWiNFO\u00C2\u00AE') {
      app.name = 'HWiNFO\u00AE';
      app.github_link = 'https://www.hwinfo.com/download/';
      nameFixed++;
      fixed++;
      continue;
    }

    // Apply new links
    if (!app.github_link && sourceLinks[app.name]) {
      app.github_link = sourceLinks[app.name];
      fixed++;
    }

    // Correct wrong Foxit PDF Reader URL
    if (corrections[app.name] && app.github_link !== corrections[app.name]) {
      app.github_link = corrections[app.name];
      corrected++;
    }
  }
}

writeFileSync('./src/data/app_metadata.json', JSON.stringify(data, null, 2));
console.log(`New links added:  ${fixed}`);
console.log(`Links corrected:  ${corrected}`);
console.log(`Names fixed:      ${nameFixed}`);
