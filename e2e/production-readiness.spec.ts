import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PRODUCT_DIRS = ["src", "src-tauri/src"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".rs", ".json", ".css"]);
const EXCLUDED_SEGMENTS = new Set(["__tests__", "test", "tests", "target", "node_modules"]);

const BANNED_PATTERNS = [
  /\bMOCK_[A-Z0-9_]+\b/,
  /\bMock\b/,
  /\(mock\)/i,
  /Preview Mode/i,
  /Simulated/i,
  /browser-mode/i,
  /Module Under Development/i,
  /under development/i,
  /not implemented/i,
  /coming soon/i,
  /\bTODO\b/i,
  /real implementation/i,
  /for this context/i,
  /placeholder if/i,
];

function isExcluded(filePath: string) {
  return filePath
    .split(path.sep)
    .some((segment) => EXCLUDED_SEGMENTS.has(segment) || segment.endsWith(".test.ts") || segment.endsWith(".test.tsx"));
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (isExcluded(fullPath)) return [];
    if (entry.isDirectory()) return walk(fullPath);
    return SOURCE_EXTENSIONS.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

test("production source contains no placeholder, mock, preview, or unfinished implementation markers", () => {
  const offenders: string[] = [];

  for (const dir of PRODUCT_DIRS) {
    for (const file of walk(path.join(ROOT, dir))) {
      const text = fs.readFileSync(file, "utf8");
      const lines = text.split(/\r?\n/);
      lines.forEach((line, index) => {
        for (const pattern of BANNED_PATTERNS) {
          if (pattern.test(line)) {
            offenders.push(`${path.relative(ROOT, file)}:${index + 1}: ${line.trim()}`);
          }
        }
      });
    }
  }

  expect(offenders, offenders.join("\n")).toEqual([]);
});
