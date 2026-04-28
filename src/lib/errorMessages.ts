// Translates raw PowerShell / Win32 / cmd error strings into user-friendly copy.
//
// Match order: HRESULT codes first, then well-known substrings. Falls back to
// the original string trimmed to a sane length if nothing matches.

interface Rule {
  match: RegExp | string;
  message: string;
}

const RULES: Rule[] = [
  { match: "0x80070005", message: "Permission denied. The target may be protected by Windows — try running WinOpt as Administrator." },
  { match: "0x80070002", message: "The target file or registry key was not found on this system." },
  { match: "0x80070032", message: "The requested operation is not supported on this system." },
  { match: "0x800700B7", message: "That entry already exists." },
  { match: /access\s+is\s+denied/i, message: "Access denied. Run WinOpt as Administrator and try again." },
  { match: /access\s+denied/i, message: "Access denied. Run WinOpt as Administrator and try again." },
  { match: /cannot\s+find\s+the\s+(file|path)/i, message: "The target file, path, or registry key does not exist on this system." },
  { match: /requested\s+operation\s+requires\s+elevation/i, message: "This operation requires administrator privileges. Restart WinOpt as Administrator." },
  { match: /the\s+system\s+cannot\s+find/i, message: "The target was not found on this system." },
  { match: /process\s+.*\s+not\s+found/i, message: "The process is no longer running." },
  { match: /service\s+.*\s+(does\s+not\s+exist|not\s+found)/i, message: "That Windows service is not installed on this system." },
  { match: /timed?\s*out/i, message: "The operation timed out. The system may be busy — try again in a moment." },
  { match: /network\s+path\s+was\s+not\s+found/i, message: "Network path unreachable. Check your network connection." },
  { match: /not\s+recognized\s+as\s+(an\s+)?(internal|external|cmdlet)/i, message: "Required Windows tool is missing — your installation may be missing components." },
];

const MAX_FALLBACK_LEN = 240;

export function translateError(raw: string | null | undefined): string {
  if (!raw) return "Unknown error.";
  const trimmed = raw.trim();
  if (!trimmed) return "Unknown error.";

  for (const rule of RULES) {
    if (typeof rule.match === "string") {
      if (trimmed.toLowerCase().includes(rule.match.toLowerCase())) return rule.message;
    } else if (rule.match.test(trimmed)) {
      return rule.message;
    }
  }

  return trimmed.length > MAX_FALLBACK_LEN
    ? trimmed.slice(0, MAX_FALLBACK_LEN) + "…"
    : trimmed;
}
