export async function pickDocument(): Promise<any> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt,.html,.htm";
    input.onchange = async (e: any) => {
      const file: File = e.target?.files?.[0];
      if (!file) { resolve({ canceled: true }); return; }
      const text = await file.text();
      resolve({
        canceled: false,
        assets: [{ uri: "web://" + file.name, name: file.name, mimeType: "text/plain", _webText: text }],
      });
    };
    input.click();
  });
}

export async function readFileAsString(uri: string, _meta?: any): Promise<string> {
  // On web, content was already read at pick time — uri won't be used
  return "";
}
