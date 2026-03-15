import { mkdir, readdir, readFile, stat, writeFile, copyFile } from "fs/promises";
import path from "path";

const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".txt",
]);

export async function copyDirectory(sourceDir: string, targetDir: string): Promise<void> {
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
      continue;
    }

    await copyFile(sourcePath, targetPath);
  }
}

export async function replaceTokensInDirectory(
  rootDir: string,
  tokens: Record<string, string>
): Promise<void> {
  const entries = await readdir(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      await replaceTokensInDirectory(entryPath, tokens);
      continue;
    }

    if (!textExtensions.has(path.extname(entry.name))) {
      continue;
    }

    const fileStats = await stat(entryPath);
    if (fileStats.size > 256 * 1024) {
      continue;
    }

    let content = await readFile(entryPath, "utf-8");
    for (const [token, value] of Object.entries(tokens)) {
      content = content.replaceAll(`__${token}__`, value);
    }
    await writeFile(entryPath, content, "utf-8");
  }
}
