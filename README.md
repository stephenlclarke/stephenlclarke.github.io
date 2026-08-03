# pages_home

A compact front door for Stephen Clarke's published developer documentation.

## Container developer APIs

The site publishes one atomic container API collection at <https://stephenlclarke.github.io/api/>. The collection contains DocC output generated from the current `stephenlclarke` forks of `container-engine-api`, `container`, `containerization`, `container-k8s`, `container-builder-shim`, and `container-compose` under stable repository-named paths. Fork documentation is always the primary destination; Apple upstream DocC or source repositories are linked secondarily for comparison where they exist.

Each source repository owns its documentation build entrypoint and CI validation. The user-site deployment checks out their current `main` branches, builds all six sites on macOS, and merges them into the same Pages artifact as the homepage. This avoids competing Pages deployments and cross-repository write tokens. A daily scheduled build publishes source documentation updates even when this repository has not changed.

## Project catalogue

Published documentation is tracked in `data/projects.json`. The project rows in `index.html` are generated from that catalogue.

## Automatic project discovery

The `Sync documentation projects` workflow runs every day at 06:17 UTC and can also be started manually. It:

1. Lists public repositories owned by `stephenlclarke`.
2. Probes each standard `https://stephenlclarke.github.io/<repository>/` address.
3. Follows a documentation redirect and confirms that the destination uses the DocC render shell.
4. Adds newly discovered projects to `data/projects.json`.
5. Regenerates the project rows, runs the test suite, and commits only when the catalogue changed.

Existing catalogue entries are retained if a site is temporarily unavailable. Their curated names and descriptions are preserved, while verified documentation and repository URLs may be refreshed. This makes discovery addition-oriented and avoids removing a project because of a transient publishing failure.

## Local development

```sh
make test
make serve
```

Open <http://localhost:8000>. Run `make build` to assemble the deployable static site in `_site`.

Run `make sync` to perform the same public discovery locally. No broad personal access token is required; the GitHub Actions workflow uses its repository-scoped token only for API rate limiting and committing catalogue changes.

## Production publishing

The repository is named `stephenlclarke.github.io`, which makes the production URL:

<https://stephenlclarke.github.io/>

The `Deploy GitHub Pages` workflow validates and builds the static site and container API collection before publishing `_site`. Pushes to `main`, including automatic project-catalogue updates, deploy the refreshed homepage. The workflow can also be started manually and runs daily to pick up API changes from the source repositories.

## Design source

The accepted desktop design reference is stored at `design/homepage-concept.png`. The production hero illustration is stored separately in `assets/docc-illustration.png`.
