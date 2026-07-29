import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = resolve(root, "index.html");
const html = await readFile(htmlPath, "utf8");
const css = await readFile(resolve(root, "styles.css"), "utf8");

const requiredCopy = [
  "Documentation for",
  "the things I build.",
  "Swift packages and developer tools,",
  "Container Compose",
  "Devcontainer",
];

for (const text of requiredCopy) {
  assert.ok(html.includes(text), `Missing required copy: ${text}`);
}

assert.match(html, /<html lang="en">/);
assert.match(html, /<main>/);
assert.match(html, /<nav[^>]+aria-label="Primary navigation"/);
assert.match(html, /class="skip-link" href="#projects"/);
assert.equal(
  [...html.matchAll(/<article class="project-row">/g)].length,
  2,
  "The project directory must contain exactly two verified projects",
);

const expectedLinks = [
  "https://stephenlclarke.github.io/container-compose/",
  "https://stephenlclarke.github.io/devcontainer/",
  "https://github.com/stephenlclarke/container-compose",
  "https://github.com/stephenlclarke/devcontainer",
];

for (const link of expectedLinks) {
  assert.ok(html.includes(`href="${link}"`), `Missing project link: ${link}`);
}

assert.ok(css.includes("--color-background: #ffffff;"), "The design requires a true white background");
assert.ok(css.includes(".skip-link:focus"), "The keyboard skip link must have a visible focus state");
assert.ok(css.includes("a:focus-visible"), "Links must have a visible focus treatment");
assert.ok(!html.includes('href="#"'), "Placeholder links are not allowed");

const localReferences = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((reference) => !/^(?:https?:|mailto:|#|\/$)/.test(reference));

for (const reference of localReferences) {
  await access(resolve(root, reference));
}

console.log(`Validated ${requiredCopy.length} copy requirements, ${expectedLinks.length} project links, and ${localReferences.length} local assets.`);
