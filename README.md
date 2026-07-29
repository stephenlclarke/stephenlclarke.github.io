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

## Publishing at the account root

GitHub reserves `https://stephenlclarke.github.io/` for a user site published from a repository named `stephenlclarke.github.io`. This private `pages_home` repository can remain the source repository, but production deployment to the account root needs either:

1. a `stephenlclarke/stephenlclarke.github.io` deployment repository; or
2. this repository renamed to `stephenlclarke.github.io`.

An arbitrary repository named `pages_home` publishes as a project site at `https://stephenlclarke.github.io/pages_home/`, not at the account root.

## Design source

The accepted desktop design reference is stored at `design/homepage-concept.png`. The production hero illustration is stored separately in `assets/docc-illustration.png`.
