import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";

export async function pickDocument() {
  return DocumentPicker.getDocumentAsync({
    type: ["application/epub+zip", "text/plain", "application/pdf", "text/html"],
    copyToCacheDirectory: true,
  });
}

export async function readFileAsString(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: "utf8" as any });
}
