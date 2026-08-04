import assert from "node:assert/strict";

export const PROJECTS_START = "          <!-- PROJECTS:START -->";
export const PROJECTS_END = "          <!-- PROJECTS:END -->";

const ACRONYMS = new Map([
  ["api", "API"],
  ["cli", "CLI"],
  ["docc", "DocC"],
  ["ios", "iOS"],
  ["k8s", "Kubernetes"],
  ["macos", "macOS"],
  ["swiftui", "SwiftUI"],
  ["ui", "UI"],
]);

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function validateHttpsUrl(value, label) {
  const url = new URL(value);
  assert.equal(url.protocol, "https:", `${label} must use HTTPS`);
}

function validateIconUrl(value, label) {
  if (/^https:\/\//.test(value)) {
    validateHttpsUrl(value, label);
    return;
  }

  assert.ok(!value.startsWith("/"), `${label} must be relative to the site root or use HTTPS`);
  assert.ok(!value.split("/").includes(".."), `${label} must not traverse outside the site root`);
  assert.match(value, /\.png$/, `${label} must reference a PNG image`);
}

export function validateCatalog(catalog) {
  assert.equal(typeof catalog.owner, "string", "Catalog owner must be a string");
  assert.ok(catalog.owner.length > 0, "Catalog owner must not be empty");
  assert.ok(Array.isArray(catalog.projects), "Catalog projects must be an array");

  const repositories = new Set();

  for (const project of catalog.projects) {
    for (const field of ["repository", "name", "description", "iconUrl", "documentationUrl", "repositoryUrl"]) {
      assert.equal(typeof project[field], "string", `${project.repository ?? "Project"} ${field} must be a string`);
      assert.ok(project[field].length > 0, `${project.repository ?? "Project"} ${field} must not be empty`);
    }

    assert.ok(!repositories.has(project.repository), `Duplicate project repository: ${project.repository}`);
    repositories.add(project.repository);
    validateHttpsUrl(project.documentationUrl, `${project.repository} documentationUrl`);
    validateHttpsUrl(project.repositoryUrl, `${project.repository} repositoryUrl`);
    validateIconUrl(project.iconUrl, `${project.repository} iconUrl`);
  }

  return catalog;
}

export function humanizeRepositoryName(repository) {
  return repository
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => ACRONYMS.get(word.toLowerCase()) ?? `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function isDocCRenderPage(html) {
  const normalized = html.toLowerCase();
  const hasLegacyRenderShell = /var\s+baseurl\s*=/.test(normalized) && normalized.includes("chunk-vendors");

  return (
    hasLegacyRenderShell ||
    normalized.includes('name="generator" content="apple swift-docc"') ||
    normalized.includes("swift-docc-render") ||
    normalized.includes("docc-render")
  );
}

export function documentationTargetFromRoot(html, rootUrl) {
  const metaRefresh = html.match(/<meta[^>]+http-equiv=["']?refresh["']?[^>]+content=["'][^"']*url\s*=\s*([^"';>]+)[^"']*["']/i);
  const documentationLink = html.match(/href=["']([^"']*(?:^|\/)documentation\/[^"']*)["']/im);
  const target = metaRefresh?.[1]?.trim() ?? documentationLink?.[1]?.trim();

  if (!target) {
    return null;
  }

  try {
    return new URL(target.replaceAll("&amp;", "&"), rootUrl).href;
  } catch {
    return null;
  }
}

export function mergeProjects(existingProjects, discoveredProjects) {
  const discoveredByRepository = new Map(discoveredProjects.map((project) => [project.repository, project]));
  const existingRepositories = new Set(existingProjects.map((project) => project.repository));

  const merged = existingProjects.map((project) => {
    const discovered = discoveredByRepository.get(project.repository);

    if (!discovered) {
      return project;
    }

    return {
      ...project,
      documentationUrl: discovered.documentationUrl,
      repositoryUrl: discovered.repositoryUrl,
    };
  });

  for (const project of discoveredProjects) {
    if (!existingRepositories.has(project.repository)) {
      merged.push(project);
    }
  }

  return merged.sort((left, right) => left.name.localeCompare(right.name, "en", { sensitivity: "base" }));
}

export function renderProjectRows(projects) {
  return projects
    .map(
      (project) => `          <article class="project-row">
            <div class="project-title">
              <img class="project-icon" src="${escapeHtml(project.iconUrl)}" width="72" height="72" alt="">
              <h3>${escapeHtml(project.name)}</h3>
            </div>
            <p>${escapeHtml(project.description)}</p>
            <a class="row-link" href="${escapeHtml(project.documentationUrl)}">
              Read documentation
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M5 12h14M13 6l6 6-6 6"></path>
              </svg>
            </a>
            <a class="row-link" href="${escapeHtml(project.repositoryUrl)}">
              View on GitHub
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M5 12h14M13 6l6 6-6 6"></path>
              </svg>
            </a>
          </article>`,
    )
    .join("\n\n");
}

export function renderHomepage(html, projects) {
  const start = html.indexOf(PROJECTS_START);
  const end = html.indexOf(PROJECTS_END);

  assert.notEqual(start, -1, `Missing homepage marker: ${PROJECTS_START.trim()}`);
  assert.notEqual(end, -1, `Missing homepage marker: ${PROJECTS_END.trim()}`);
  assert.ok(start < end, "Homepage project markers are out of order");

  const prefix = html.slice(0, start + PROJECTS_START.length);
  const suffix = html.slice(end);

  return `${prefix}\n${renderProjectRows(projects)}\n${suffix}`;
}
