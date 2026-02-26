/** Strip WebToEpub nav block from content (for display of already-imported chapters) */
export function stripWebToEpubNav(content: string): string {
  const navMatch = content.match(/^Chapter\s+\d+[^:]*\s*:\s*☰\s+[\d\s]*(?:Prologue|Epilogue)?\s*/);
  if (navMatch) {
    return content.slice(navMatch[0].length).trim();
  }
  return content;
}

/** Get display-friendly chapter title (WebToEpub uses xhtml0000, xhtml0001, etc.) */
export function getChapterDisplayTitle(
  title: string | null | undefined,
  index: number
): string {
  if (title && !/^xhtml\d+$/i.test(title)) {
    return title;
  }
  return `Chapter ${index + 1}`;
}

/** Get display-friendly book title (handles WebToEpub "Chapter Content", empty, etc.) */
export function getBookDisplayTitle(
  title: string | null | undefined,
  chapterCount?: number
): string {
  const t = (title || "").trim();
  if (!t) return "Untitled";
  if (/^chapter\s+content$/i.test(t)) {
    return chapterCount ? `Book (${chapterCount} chapters)` : "Imported Book";
  }
  return t;
}

/** Get display-friendly author (handles <unknown>, empty, etc.) */
export function getAuthorDisplayName(author: string | null | undefined): string {
  const a = (author || "").trim();
  if (!a || /^<unknown>$/i.test(a) || /^unknown$/i.test(a)) return "Unknown Author";
  return a;
}

/** Dedupe redundant bookmark labels like "Chapter 2 — Chapter 2" → "Chapter 2" */
export function getBookmarkDisplayLabel(label: string | null | undefined, chapterIndex: number): string {
  const l = (label || "").trim();
  if (!l) return `Chapter ${chapterIndex + 1}`;
  const match = l.match(/^Chapter\s+(\d+)\s*[—–-]\s*Chapter\s+\d+$/i);
  if (match) return `Chapter ${match[1]}`;
  return l;
}

/** Truncate long text with ellipsis for compact display */
export function truncateForDisplay(text: string, maxLength: number = 50): string {
  const t = (text || "").trim();
  if (t.length <= maxLength) return t;
  return t.slice(0, maxLength - 3).trim() + "…";
}
