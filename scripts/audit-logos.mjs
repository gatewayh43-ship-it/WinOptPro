import { readFileSync, readdirSync } from 'fs';
const { categories } = JSON.parse(readFileSync('./src/data/app_metadata.json', 'utf8'));

// Build set of logo files that exist
const logoFiles = new Set(readdirSync('./public/app_logos').map(f => f.toLowerCase()));

const missingLogo = [];
const brokenLogoPath = [];

for (const cat of categories) {
  for (const app of cat.apps) {
    const logoPath = app.logo; // e.g. "/app_logos/Google.Chrome.png"
    if (!logoPath) {
      missingLogo.push(`${cat.name}/${app.name}`);
      continue;
    }
    // Skip external URLs (ui-avatars, etc.) — those are valid
    if (logoPath.startsWith('http')) continue;
    // Extract filename from path
    const filename = logoPath.split('/').pop();
    if (!logoFiles.has(filename.toLowerCase())) {
      brokenLogoPath.push(`${cat.name}/${app.name} → ${filename}`);
    }
  }
}

console.log(`Logo files on disk: ${logoFiles.size}`);
console.log(`Apps with no logo field: ${missingLogo.length}`);
console.log(`Apps with logo path but file missing: ${brokenLogoPath.length}`);
if (brokenLogoPath.length) {
  console.log('\nBroken logos:');
  brokenLogoPath.forEach(x => console.log(' ', x));
}
