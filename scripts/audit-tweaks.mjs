import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('./src/data/tweaks.json', 'utf8'));
const missing = data.filter(x => !x.validationCmd);
console.log('Missing validationCmd:', missing.length);
missing.forEach(x => console.log(x.id, '|', x.category, '|', x.execution?.code?.substring(0,60)));
