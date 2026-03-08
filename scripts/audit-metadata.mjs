import { readFileSync } from 'fs';
const { categories } = JSON.parse(readFileSync('./src/data/app_metadata.json', 'utf8'));

let total = 0;
const issues = { noLogo: [], noPros: [], noCons: [], noWebsite: [], noDescription: [], noReviews: [], shortDesc: [], noGithub: [] };

for (const cat of categories) {
  for (const app of cat.apps) {
    total++;
    const tag = `[${cat.name}] ${app.name}`;
    if (!app.logo || app.logo === '') issues.noLogo.push(tag);
    if (!app.website || app.website === '') issues.noWebsite.push(tag);
    if (!app.description) issues.noDescription.push(tag);
    else if (app.description.length < 40) issues.shortDesc.push(`${tag} (${app.description.length} chars)`);
    if (!app.insights?.pros?.length) issues.noPros.push(tag);
    if (!app.insights?.cons?.length) issues.noCons.push(tag);
    if (!app.reviews?.length) issues.noReviews.push(tag);
    if (!app.github_link) issues.noGithub.push(tag);
  }
}

console.log(`Total apps: ${total}`);
console.log(`\nCategories:`);
for (const cat of categories) console.log(`  ${cat.name}: ${cat.apps.length} apps`);

console.log(`\n--- Issues ---`);
console.log(`Missing logo:        ${issues.noLogo.length}`);
console.log(`Missing website:     ${issues.noWebsite.length}`);
console.log(`Missing description: ${issues.noDescription.length}`);
console.log(`Short description:   ${issues.shortDesc.length}`);
console.log(`Missing pros:        ${issues.noPros.length}`);
console.log(`Missing cons:        ${issues.noCons.length}`);
console.log(`Missing reviews:     ${issues.noReviews.length}`);
console.log(`Missing github:      ${issues.noGithub.length}`);

if (issues.noLogo.length)    { console.log('\nNo logo:');    issues.noLogo.forEach(x => console.log(' ', x)); }
if (issues.noPros.length)    { console.log('\nNo pros:');    issues.noPros.forEach(x => console.log(' ', x)); }
if (issues.noCons.length)    { console.log('\nNo cons:');    issues.noCons.forEach(x => console.log(' ', x)); }
if (issues.noReviews.length) { console.log('\nNo reviews:');  issues.noReviews.slice(0,20).forEach(x => console.log(' ', x)); if(issues.noReviews.length>20) console.log(`  ...and ${issues.noReviews.length-20} more`); }
if (issues.shortDesc.length) { console.log('\nShort desc:'); issues.shortDesc.forEach(x => console.log(' ', x)); }

// Sample one full app to show schema
const sample = categories[0].apps[0];
console.log('\n--- Sample app schema ---');
console.log(JSON.stringify(sample, null, 2).substring(0, 600));
