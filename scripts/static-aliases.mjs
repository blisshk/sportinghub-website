import { copyFile } from "node:fs/promises";

// Old routes redirect to English; each locale also preserves .html bookmarks.
for (const route of ["booking", "coming-soon", "terms"]) {
  await copyFile(`out/${route}/index.html`, `out/${route}.html`);
  for (const locale of ["en", "zh-HK"]) {
    await copyFile(
      `out/${locale}/${route}/index.html`,
      `out/${locale}/${route}.html`,
    );
  }
}
