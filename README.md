# pages_home

A compact front door for Stephen Clarke's published developer documentation.

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

The `Deploy GitHub Pages` workflow validates and builds the static site before publishing `_site`. Pushes to `main`, including automatic project-catalogue updates, deploy the refreshed homepage.

## Design source

The accepted desktop design reference is stored at `design/homepage-concept.png`. The production hero illustration is stored separately in `assets/docc-illustration.png`.
