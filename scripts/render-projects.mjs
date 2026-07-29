import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderHomepage, validateCatalog } from "./project-catalog.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const homepagePath = resolve(root, "index.html");
const catalogPath = resolve(root, "data/projects.json");
const checkOnly = process.argv.includes("--check");

const homepage = await readFile(homepagePath, "utf8");
const catalog = validateCatalog(JSON.parse(await readFile(catalogPath, "utf8")));
const rendered = renderHomepage(homepage, catalog.projects);

if (checkOnly) {
  assert.equal(homepage, rendered, "index.html is not synchronized with data/projects.json; run `make render`");
  console.log(`Homepage is synchronized with ${catalog.projects.length} projects.`);
} else if (homepage === rendered) {
  console.log(`Homepage already contains ${catalog.projects.length} synchronized projects.`);
} else {
  await writeFile(homepagePath, rendered);
  console.log(`Rendered ${catalog.projects.length} projects into index.html.`);
}
