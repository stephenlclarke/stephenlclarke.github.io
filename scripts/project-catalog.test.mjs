import assert from "node:assert/strict";
import test from "node:test";
import {
  documentationTargetFromRoot,
  humanizeRepositoryName,
  isDocCRenderPage,
  mergeProjects,
  renderHomepage,
  validateCatalog,
} from "./project-catalog.mjs";

const existingProject = {
  repository: "container-compose",
  name: "Container Compose",
  description: "Curated description.",
  documentationUrl: "https://stephenlclarke.github.io/container-compose/",
  repositoryUrl: "https://github.com/stephenlclarke/container-compose",
};

test("humanizes repository names and preserves common technical acronyms", () => {
  assert.equal(humanizeRepositoryName("container-compose"), "Container Compose");
  assert.equal(humanizeRepositoryName("swiftui_docc-api"), "SwiftUI DocC API");
});

test("detects supported DocC render shells", () => {
  assert.equal(isDocCRenderPage('<script>var baseUrl = "/demo/"</script><script src="chunk-vendors.js"></script>'), true);
  assert.equal(isDocCRenderPage('<meta name="generator" content="Apple Swift-DocC">'), true);
  assert.equal(isDocCRenderPage("<main>Ordinary project website</main>"), false);
});

test("extracts documentation redirects relative to the project root", () => {
  const html = '<meta http-equiv="refresh" content="0; url=./documentation/example/">';
  assert.equal(
    documentationTargetFromRoot(html, "https://stephenlclarke.github.io/example/"),
    "https://stephenlclarke.github.io/example/documentation/example/",
  );
  assert.equal(documentationTargetFromRoot("<main>No documentation redirect</main>", "https://example.com/"), null);
});

test("merges additions while preserving curated copy and refreshing URLs", () => {
  const discovered = [
    {
      ...existingProject,
      description: "Repository description that must not replace curated copy.",
      documentationUrl: "https://stephenlclarke.github.io/container-compose/v2/",
    },
    {
      repository: "new-docs",
      name: "New Docs",
      description: "New documentation.",
      documentationUrl: "https://stephenlclarke.github.io/new-docs/",
      repositoryUrl: "https://github.com/stephenlclarke/new-docs",
    },
  ];

  assert.deepEqual(mergeProjects([existingProject], discovered), [
    {
      ...existingProject,
      documentationUrl: "https://stephenlclarke.github.io/container-compose/v2/",
    },
    discovered[1],
  ]);
});

test("validates catalogue shape and rejects duplicates", () => {
  const catalog = { owner: "stephenlclarke", projects: [existingProject] };
  assert.equal(validateCatalog(catalog), catalog);
  assert.throws(
    () => validateCatalog({ owner: "stephenlclarke", projects: [existingProject, existingProject] }),
    /Duplicate project repository/,
  );
});

test("renders escaped project data between stable homepage markers", () => {
  const homepage = "<main>\n          <!-- PROJECTS:START -->\nold\n          <!-- PROJECTS:END -->\n</main>\n";
  const rendered = renderHomepage(homepage, [
    {
      ...existingProject,
      name: "Compose <Core>",
      description: 'A "safe" & useful package.',
    },
  ]);

  assert.match(rendered, /Compose &lt;Core&gt;/);
  assert.match(rendered, /A &quot;safe&quot; &amp; useful package\./);
  assert.doesNotMatch(rendered, /\nold\n/);
});
