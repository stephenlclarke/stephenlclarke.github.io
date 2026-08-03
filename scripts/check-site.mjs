import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderHomepage, validateCatalog } from "./project-catalog.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = resolve(root, "index.html");
const html = await readFile(htmlPath, "utf8");
const containerApiHtml = await readFile(resolve(root, "api/index.html"), "utf8");
const css = await readFile(resolve(root, "styles.css"), "utf8");
const catalog = validateCatalog(JSON.parse(await readFile(resolve(root, "data/projects.json"), "utf8")));

const requiredCopy = [
  "Documentation for",
  "the things I build.",
  "Swift packages and developer tools,",
];

for (const text of requiredCopy) {
  assert.ok(html.includes(text), `Missing required copy: ${text}`);
}

assert.equal(html, renderHomepage(html, catalog.projects), "Homepage projects do not match the project catalog");
assert.match(html, /<html lang="en">/);
assert.match(html, /<main>/);
assert.match(html, /<nav[^>]+aria-label="Primary navigation"/);
assert.match(html, /class="skip-link" href="#documentation"/);
assert.match(html, /<h3>Container developer APIs<\/h3>/);
assert.match(html, /href="api\/"/);
assert.equal(
  [...html.matchAll(/<article class="project-row">/g)].length,
  catalog.projects.length,
  "The project directory must contain every catalogued project",
);

const expectedLinks = catalog.projects.flatMap((project) => [project.documentationUrl, project.repositoryUrl]);

for (const link of expectedLinks) {
  assert.ok(html.includes(`href="${link}"`), `Missing project link: ${link}`);
}

for (const project of catalog.projects) {
  assert.ok(html.includes(project.name), `Missing project name: ${project.name}`);
  assert.ok(html.includes(project.description), `Missing project description: ${project.description}`);
}

assert.ok(css.includes("--color-background: #ffffff;"), "The design requires a true white background");
assert.ok(css.includes(".skip-link:focus"), "The keyboard skip link must have a visible focus state");
assert.ok(css.includes("a:focus-visible"), "Links must have a visible focus treatment");
assert.ok(!html.includes("Browse documentation"), "The removed hero button must not be rendered");
assert.ok(!css.includes(".primary-link"), "Removed hero button styles must not remain");
assert.ok(!html.includes('href="#"'), "Placeholder links are not allowed");

const containerApiRepositories = [
  "container-engine-api",
  "container",
  "containerization",
  "container-k8s",
  "container-builder-shim",
  "container-compose",
  "devcontainer",
];

for (const repository of containerApiRepositories) {
  assert.ok(containerApiHtml.includes(`href="${repository}/"`), `Missing container API link: ${repository}`);
  assert.ok(
    containerApiHtml.includes(`https://github.com/stephenlclarke/${repository}`),
    `Missing container repository link: ${repository}`,
  );
}

for (const upstreamDocumentationUrl of [
  "https://apple.github.io/container/documentation/",
  "https://apple.github.io/containerization/documentation/",
  "https://github.com/apple/container-builder-shim",
]) {
  assert.ok(containerApiHtml.includes(upstreamDocumentationUrl), `Missing Apple upstream link: ${upstreamDocumentationUrl}`);
}

assert.equal(
  [...containerApiHtml.matchAll(/>Read fork API<\/a>/g)].length,
  2,
  "Fork DocC must be the primary action for both Apple-derived projects",
);

const localReferences = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((reference) => !/^(?:https?:|mailto:|#|\/$)/.test(reference));

for (const reference of localReferences) {
  await access(resolve(root, reference));
}

console.log(`Validated ${requiredCopy.length} copy requirements, ${expectedLinks.length} project links, and ${localReferences.length} local assets.`);
