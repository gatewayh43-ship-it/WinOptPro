const fs = require('fs');
const t = require('../src/data/tweaks.json');

const cats = {};
t.forEach(x => {
    if (!cats[x.category]) cats[x.category] = [];
    cats[x.category].push(x);
});

const riskEmoji = { Green: '🟢', Yellow: '🟡', Red: '🔴' };

let out = `# WinOpt Pro — Tweaks Reference

Complete reference for all ${t.length} system tweaks available in WinOpt Pro.

## Risk Level Guide

| Badge | Level | Meaning |
|---|---|---|
| 🟢 | Safe | Recommended for all users. Easily reversible. |
| 🟡 | Caution | May affect some system behaviour. Read the description before applying. |
| 🔴 | Expert | Requires Expert Mode to be enabled. Significant system changes — understand what you're doing. |

> ⚠️ All tweaks are fully reversible via the **Revert** button in the app.

---

`;

Object.entries(cats).forEach(([cat, items]) => {
    out += `## ${cat}\n\n`;
    items.forEach(item => {
        const risk = riskEmoji[item.riskLevel] || '⚪';
        const expert = item.requiresExpertMode ? ' ⚠️ **Expert Mode Required**' : '';
        out += `### ${risk} ${item.name}${expert}\n\n`;
        out += `**ID:** \`${item.id}\` | **Category:** ${item.category} | **Risk:** ${item.riskLevel}\n\n`;
        out += `${item.description}\n\n`;

        if (item.educationalContext) {
            const ec = item.educationalContext;
            if (ec.howItWorks) out += `**How it works:** ${ec.howItWorks}\n\n`;
            if (ec.pros) out += `**Benefits:** ${ec.pros}\n\n`;
            if (ec.cons) out += `**Risks/Cons:** ${ec.cons}\n\n`;
            if (ec.expertDetails) out += `**Expert details:** ${ec.expertDetails}\n\n`;
            if (ec.interactions) out += `**Interactions with other tweaks:** ${ec.interactions}\n\n`;
        }

        out += `<details>\n<summary>Commands</summary>\n\n`;
        out += `**Apply:**\n\`\`\`powershell\n${item.execution.code}\n\`\`\`\n\n`;
        out += `**Revert:**\n\`\`\`powershell\n${item.execution.revertCode}\n\`\`\`\n\n`;
        out += `</details>\n\n---\n\n`;
    });
});

fs.writeFileSync('./docs/TWEAKS_REFERENCE.md', out);
console.log(`Written ${out.length} chars, ${out.split('\n').length} lines`);
