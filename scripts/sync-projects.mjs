import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  documentationTargetFromRoot,
  humanizeRepositoryName,
  isDocCRenderPage,
  mergeProjects,
  validateCatalog,
} from "./project-catalog.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = resolve(root, "data/projects.json");
const catalogSource = await readFile(catalogPath, "utf8");
const catalog = validateCatalog(JSON.parse(catalogSource));
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const concurrency = Math.max(1, Number.parseInt(process.env.SYNC_CONCURRENCY ?? "8", 10));

const apiHeaders = {
  Accept: "application/vnd.github+json",
  "User-Agent": "pages-home-project-sync",
  "X-GitHub-Api-Version": "2022-11-28",
};

if (token) {
  apiHeaders.Authorization = `Bearer ${token}`;
}

async function listPublicRepositories(owner) {
  const repositories = [];

  for (let page = 1; ; page += 1) {
    const url = `https://api.github.com/users/${encodeURIComponent(owner)}/repos?type=owner&sort=full_name&per_page=100&page=${page}`;
    const response = await fetch(url, { headers: apiHeaders, signal: AbortSignal.timeout(15_000) });

    if (!response.ok) {
      throw new Error(`GitHub repository discovery failed with HTTP ${response.status}`);
    }

    const pageRepositories = await response.json();
    repositories.push(...pageRepositories);

    if (pageRepositories.length < 100) {
      return repositories;
    }
  }
}

async function fetchText(url) {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "pages-home-project-sync" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}

function normalizePagesUrl(url) {
  const normalized = new URL(url);

  if (!normalized.pathname.endsWith("/")) {
    normalized.pathname += "/";
  }

  normalized.search = "";
  normalized.hash = "";

  return normalized.href;
}

async function discoverDocumentationProject(repository, owner) {
  if (repository.archived || repository.disabled || repository.fork) {
    return null;
  }

  const pagesHost = `${owner.toLowerCase()}.github.io`;
  const candidates = new Set([`https://${pagesHost}/${repository.name}/`]);

  if (repository.homepage) {
    try {
      const homepage = new URL(repository.homepage);

      if (homepage.protocol === "https:" && homepage.hostname.toLowerCase() === pagesHost) {
        candidates.add(normalizePagesUrl(homepage));
      }
    } catch {
      // Ignore malformed repository homepage metadata and continue with the standard Pages URL.
    }
  }

  for (const documentationUrl of candidates) {
    const rootHtml = await fetchText(documentationUrl);

    if (!rootHtml) {
      continue;
    }

    let confirmed = isDocCRenderPage(rootHtml);
    const target = documentationTargetFromRoot(rootHtml, documentationUrl);

    if (!confirmed && target) {
      const documentationHtml = await fetchText(target);
      confirmed = documentationHtml ? isDocCRenderPage(documentationHtml) : false;
    }

    if (confirmed) {
      const name = humanizeRepositoryName(repository.name);

      return {
        repository: repository.name,
        name,
        description: repository.description?.trim() || `${name} developer documentation.`,
        documentationUrl: normalizePagesUrl(documentationUrl),
        repositoryUrl: repository.html_url,
      };
    }
  }

  return null;
}

async function discoverProjects(repositories, owner) {
  const discovered = [];
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, repositories.length) }, async () => {
    while (nextIndex < repositories.length) {
      const repository = repositories[nextIndex];
      nextIndex += 1;
      const project = await discoverDocumentationProject(repository, owner);

      if (project) {
        discovered.push(project);
        console.log(`Discovered DocC project: ${project.repository}`);
      }
    }
  });

  await Promise.all(workers);

  return discovered;
}

const repositories = await listPublicRepositories(catalog.owner);
console.log(`Checking ${repositories.length} public repositories for DocC sites.`);
const discoveredProjects = await discoverProjects(repositories, catalog.owner);
const projects = mergeProjects(catalog.projects, discoveredProjects);
const updatedSource = `${JSON.stringify({ ...catalog, projects }, null, 2)}\n`;

if (updatedSource === catalogSource) {
  console.log(`Project catalog is current with ${projects.length} entries.`);
} else {
  await writeFile(catalogPath, updatedSource);
  console.log(`Updated project catalog to ${projects.length} entries.`);
}
