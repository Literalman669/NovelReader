import { Platform } from "react-native";

let db: any | null = null;

export async function getDb(): Promise<any> {
  if (Platform.OS === "web") return null;
  if (!db) {
    const SQLite = require("expo-sqlite");
    db = await SQLite.openDatabaseAsync("novelreader.db");
    await initSchema(db);
  }
  return db;
}

async function initSchema(db: any) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS offline_books (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT,
      cover_base64 TEXT,
      format TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS offline_chapters (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      chapter_index INTEGER NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      FOREIGN KEY (book_id) REFERENCES offline_books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS offline_progress (
      book_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      chapter_index INTEGER NOT NULL DEFAULT 0,
      scroll_position REAL NOT NULL DEFAULT 0,
      character_position INTEGER NOT NULL DEFAULT 0,
      last_read_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS offline_bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      chapter_index INTEGER NOT NULL,
      character_position INTEGER NOT NULL,
      label TEXT,
      note TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

export async function saveBookOffline(book: {
  id: string;
  userId: string;
  title: string;
  author: string;
  coverBase64: string | null;
  format: string;
  chapters: { id: string; index: number; title: string; content: string }[];
}) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO offline_books (id, user_id, title, author, cover_base64, format, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [book.id, book.userId, book.title, book.author, book.coverBase64, book.format, new Date().toISOString()]
  );

  for (const ch of book.chapters) {
    await db.runAsync(
      `INSERT OR REPLACE INTO offline_chapters (id, book_id, chapter_index, title, content)
       VALUES (?, ?, ?, ?, ?)`,
      [ch.id, book.id, ch.index, ch.title, ch.content]
    );
  }
}

export async function getOfflineBooks(userId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.getAllAsync("SELECT * FROM offline_books WHERE user_id = ?", [userId]);
}

export async function getOfflineChapter(bookId: string, chapterIndex: number) {
  const db = await getDb();
  if (!db) return null;
  return db.getFirstAsync(
    "SELECT content, title FROM offline_chapters WHERE book_id = ? AND chapter_index = ?",
    [bookId, chapterIndex]
  );
}

export async function saveProgressOffline(
  userId: string,
  bookId: string,
  chapterIndex: number,
  scrollPosition: number,
  charPosition: number
) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO offline_progress
     (book_id, user_id, chapter_index, scroll_position, character_position, last_read_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [bookId, userId, chapterIndex, scrollPosition, charPosition, new Date().toISOString()]
  );
}

export async function getProgressOffline(bookId: string) {
  const db = await getDb();
  if (!db) return null;
  return db.getFirstAsync("SELECT * FROM offline_progress WHERE book_id = ?", [bookId]);
}

export async function deleteOfflineBook(bookId: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM offline_books WHERE id = ?", [bookId]);
}
