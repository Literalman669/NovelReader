import { pickDocument, readFileAsString } from "./fs-helper";

export interface ParsedBook {
  title: string;
  author: string;
  description: string;
  coverBase64: string | null;
  chapters: { title: string; content: string }[];
  format: "epub" | "txt" | "pdf" | "html";
}

export async function pickAndImportFile(): Promise<ParsedBook | null> {
  const result = await pickDocument() as any;
  if (!result || result.canceled) return null;

  // Web path: fs-helper.web.ts sets _webText on the asset
  if (result.assets?.[0]?._webText !== undefined) {
    const asset = result.assets[0];
    const text: string = asset._webText;
    const title = (asset.name as string).replace(/\.[^/.]+$/, "");
    const chunkSize = 5000;
    const chapters: { title: string; content: string }[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chapters.push({ title: `Part ${Math.floor(i / chunkSize) + 1}`, content: text.slice(i, i + chunkSize) });
    }
    return { title, author: "Unknown", description: "", coverBase64: null, format: "txt", chapters };
  }

  // Native path
  if (!result.assets?.[0]) return null;
  const asset = result.assets[0];
  const uri: string = asset.uri;
  const name: string = asset.name ?? "Unknown";
  const mimeType: string = asset.mimeType ?? "";

  if (mimeType.includes("epub") || name.endsWith(".epub")) {
    return parseEpub(name);
  } else if (mimeType.includes("pdf") || name.endsWith(".pdf")) {
    return parsePdf(name);
  } else if (mimeType.includes("html") || name.endsWith(".html") || name.endsWith(".htm")) {
    return parseHtml(uri, name);
  } else {
    return parseTxt(uri, name);
  }
}

export async function importFromUrl(url: string): Promise<ParsedBook | null> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    return extractChaptersFromHtml(html, url);
  } catch {
    return null;
  }
}

async function parseTxt(uri: string, name: string): Promise<ParsedBook> {
  const content = await readFileAsString(uri);

  const title = name.replace(/\.txt$/i, "").trim();
  const chunkSize = 5000;
  const chapters: { title: string; content: string }[] = [];

  if (content.length <= chunkSize) {
    chapters.push({ title: "Chapter 1", content });
  } else {
    let i = 0;
    let chapterNum = 1;
    while (i < content.length) {
      const chunk = content.slice(i, i + chunkSize);
      chapters.push({ title: `Chapter ${chapterNum}`, content: chunk });
      i += chunkSize;
      chapterNum++;
    }
  }

  return {
    title,
    author: "Unknown",
    description: "",
    coverBase64: null,
    chapters,
    format: "txt",
  };
}

function parseEpub(name: string): ParsedBook {
  const title = name.replace(/\.epub$/i, "").trim();
  return {
    title,
    author: "Unknown",
    description: "Imported from EPUB",
    coverBase64: null,
    chapters: [
      {
        title: "Chapter 1",
        content:
          "EPUB content loaded. Use the built-in reader to view this book.",
      },
    ],
    format: "epub",
  };
}

function parsePdf(name: string): ParsedBook {
  const title = name.replace(/\.pdf$/i, "").trim();
  return {
    title,
    author: "Unknown",
    description: "Imported from PDF",
    coverBase64: null,
    chapters: [
      {
        title: "Document",
        content: "PDF content loaded. Use the built-in PDF reader.",
      },
    ],
    format: "pdf",
  };
}

async function parseHtml(uri: string, name: string): Promise<ParsedBook> {
  const content = await readFileAsString(uri);
  return extractChaptersFromHtml(content, name.replace(/\.html?$/i, ""));
}

function extractChaptersFromHtml(html: string, title: string): ParsedBook {
  const cleanText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{3,}/g, "\n\n")
    .trim();

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const extractedTitle = titleMatch
    ? titleMatch[1].trim()
    : title || "Imported Web Novel";

  const chunkSize = 5000;
  const chapters: { title: string; content: string }[] = [];
  let i = 0;
  let chapterNum = 1;

  if (cleanText.length <= chunkSize) {
    chapters.push({ title: "Chapter 1", content: cleanText });
  } else {
    while (i < cleanText.length) {
      chapters.push({
        title: `Chapter ${chapterNum}`,
        content: cleanText.slice(i, i + chunkSize),
      });
      i += chunkSize;
      chapterNum++;
    }
  }

  return {
    title: extractedTitle,
    author: "Unknown",
    description: "",
    coverBase64: null,
    chapters,
    format: "html",
  };
}
