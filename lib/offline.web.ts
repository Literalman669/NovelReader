export async function getDb(): Promise<any> { return null; }
export async function saveBookOffline(..._args: any[]): Promise<void> {}
export async function getOfflineBooks(_userId: string): Promise<any[]> { return []; }
export async function getOfflineChapter(_bookId: string, _chapterIndex: number): Promise<null> { return null; }
export async function saveProgressOffline(..._args: any[]): Promise<void> {}
export async function getProgressOffline(_bookId: string): Promise<null> { return null; }
export async function deleteOfflineBook(_bookId: string): Promise<void> {}
