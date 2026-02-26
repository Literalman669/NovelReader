import ePub from "epubjs";

export interface ParsedBook {
  title: string;
  author: string;
  description: string;
  coverBase64: string | null;
  format: "epub" | "txt" | "pdf" | "html";
  chapters: { title: string; content: string }[];
}

async function parseEpubFile(file: File): Promise<ParsedBook> {
  const arrayBuffer = await file.arrayBuffer();
  const book = ePub(arrayBuffer as any);
  await book.ready;

  const metadata = await book.loaded.metadata;
  const spine = await book.loaded.spine;

  const title = metadata?.title || file.name.replace(/\.epub$/i, "");
  let author = metadata?.creator || "Unknown";
  if (/^<unknown>$/i.test(author)) author = "Unknown";
  const description = metadata?.description || "";

  const chapters: { title: string; content: string }[] = [];
  const spineItems = (spine as any).items || (spine as any).spineItems || [];

  for (let i = 0; i < spineItems.length; i++) {
    const item = spineItems[i];
    try {
      const doc = await book.load(item.href);
      let text = "";
      if (doc instanceof Document || (doc as any)?.body) {
        text = ((doc as any).body || (doc as any).documentElement)?.textContent || "";
      } else if (typeof doc === "string") {
        const parser = new DOMParser();
        const parsed = parser.parseFromString(doc, "text/html");
        text = parsed.body?.textContent || "";
      }
      text = text.replace(/\s+/g, " ").trim();
      text = stripWebToEpubNav(text);
      let title = item.idref || `Chapter ${chapters.length + 1}`;
      if (/^xhtml\d+$/i.test(title)) {
        const chapterMatch = text.match(/^(Chapter\s+\d+[^:]*|Prologue|Epilogue|Chapter\s+[IVXLCDM]+)/i);
        title = chapterMatch ? chapterMatch[1].trim() : `Chapter ${chapters.length + 1}`;
      }
      if (text.length > 0) {
        chapters.push({ title, content: text });
      }
    } catch {
      // skip sections that fail to load
    }
  }

  // If no chapters extracted, create a placeholder
  if (chapters.length === 0) {
    chapters.push({ title: "Chapter 1", content: "Could not extract text from this EPUB." });
  }

  book.destroy();
  return { title, author, description, coverBase64: null, format: "epub", chapters };
}

export async function pickAndImportFile(): Promise<ParsedBook | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt,.html,.htm,.epub";
    input.onchange = async (e: any) => {
      const file: File = e.target.files?.[0];
      if (!file) { resolve(null); return; }

      const name = file.name.toLowerCase();

      // EPUB files need special parsing
      if (name.endsWith(".epub")) {
        try {
          const parsed = await parseEpubFile(file);
          resolve(parsed);
        } catch (err) {
          console.error("EPUB parse error:", err);
          resolve(null);
        }
        return;
      }

      // HTML files - strip tags and decode entities
      if (name.endsWith(".html") || name.endsWith(".htm")) {
        const html = await file.text();
        const title = file.name.replace(/\.[^/.]+$/, "");
        const body = decodeHtmlEntities(
          html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
        );
        const chunkSize = 5000;
        const chapters = [];
        for (let i = 0; i < body.length; i += chunkSize) {
          chapters.push({ title: `Chapter ${Math.floor(i / chunkSize) + 1}`, content: body.slice(i, i + chunkSize) });
        }
        resolve({ title, author: "Unknown", description: "", coverBase64: null, format: "html", chapters });
        return;
      }

      // Plain text files
      const text = await file.text();
      const title = file.name.replace(/\.[^/.]+$/, "");
      const chunkSize = 5000;
      const chapters = [];
      for (let i = 0; i < text.length; i += chunkSize) {
        chapters.push({ title: `Chapter ${Math.floor(i / chunkSize) + 1}`, content: text.slice(i, i + chunkSize) });
      }
      resolve({ title, author: "Unknown", description: "", coverBase64: null, format: "txt", chapters });
    };
    input.click();
  });
}

/** Strip WebToEpub nav block: "Chapter N : ☰ 1 2 3 ... Prologue" at start of content */
function stripWebToEpubNav(text: string): string {
  const navMatch = text.match(/^Chapter\s+\d+[^:]*\s*:\s*☰\s+[\d\s]*(?:Prologue|Epilogue)?\s*/);
  if (navMatch) {
    return text.slice(navMatch[0].length).trim();
  }
  return text;
}

function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

export async function importFromUrl(url: string): Promise<ParsedBook | null> {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = decodeHtmlEntities(titleMatch?.[1]?.trim() ?? url);
    const body = decodeHtmlEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    const chunkSize = 5000;
    const chapters = [];
    for (let i = 0; i < body.length; i += chunkSize) {
      chapters.push({ title: `Part ${Math.floor(i / chunkSize) + 1}`, content: body.slice(i, i + chunkSize) });
    }
    return { title, author: "Unknown", description: `Imported from ${url}`, coverBase64: null, format: "html", chapters };
  } catch {
    return null;
  }
}
