import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('./src/data/app_metadata.json', 'utf8'));
const results = [];
for (const cat of data.categories) {
  for (const app of cat.apps) {
    if (!app.github_link) {
      results.push({ cat: cat.name, name: app.name, license: app.license, website: app.website });
    }
  }
}
// Group by category
const byCat = {};
for (const r of results) {
  if (!byCat[r.cat]) byCat[r.cat] = [];
  byCat[r.cat].push(r);
}
for (const [cat, apps] of Object.entries(byCat)) {
  console.log(`\n=== ${cat} (${apps.length}) ===`);
  for (const a of apps) console.log(`  ${a.name} | ${a.license} | ${a.website}`);
}
console.log('\nTotal missing:', results.length);
