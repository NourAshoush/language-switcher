import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const localesDir = path.resolve(process.cwd(), "_locales");
const baseLocale = "en";

async function readMessages(locale) {
  const filePath = path.join(localesDir, locale, "messages.json");
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function main() {
  const localeEntries = await readdir(localesDir, { withFileTypes: true });
  const locales = localeEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const baseMessages = await readMessages(baseLocale);
  const baseKeys = Object.keys(baseMessages).sort();

  let hasErrors = false;

  for (const locale of locales) {
    const messages = await readMessages(locale);
    const keys = new Set(Object.keys(messages));
    const missing = baseKeys.filter((key) => !keys.has(key));

    if (missing.length > 0) {
      hasErrors = true;
      console.error(`${locale}: missing ${missing.length} keys`);
      for (const key of missing) {
        console.error(`  - ${key}`);
      }
    }
  }

  if (hasErrors) {
    process.exitCode = 1;
    return;
  }

  console.log(`Locale check passed for ${locales.length} locales.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
