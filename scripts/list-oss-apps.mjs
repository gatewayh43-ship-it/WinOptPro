import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('./src/data/app_metadata.json', 'utf8'));
const openSourceLicenses = ['MIT','Apache','GPL','LGPL','BSD','MPL','CDDL','ISC','Creative Commons','CC-BY','Mozilla'];
const results = [];
for (const cat of data.categories) {
  for (const app of cat.apps) {
    if (app.github_link) continue;
    const lic = (app.license || '').toLowerCase();
    const isOS = openSourceLicenses.some(l => lic.includes(l.toLowerCase()));
    if (isOS) results.push({ name: app.name, license: app.license, website: app.website });
  }
}
console.log(JSON.stringify(results, null, 2));
console.log('Total:', results.length);
