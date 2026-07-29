# pages_home

A compact front door for Stephen Clarke's published developer documentation.

## Included documentation

- [Container Compose](https://stephenlclarke.github.io/container-compose/)
- [Devcontainer](https://stephenlclarke.github.io/devcontainer/)

Only verified, live GitHub Pages destinations are included. Add future projects as another `.project-row` in `index.html` and extend the assertions in `scripts/check-site.mjs`.

## Local development

```sh
make test
make serve
```

Open <http://localhost:8000>. Run `make build` to assemble the deployable static site in `_site`.

## Publishing at the account root

GitHub reserves `https://stephenlclarke.github.io/` for a user site published from a repository named `stephenlclarke.github.io`. This private `pages_home` repository can remain the source repository, but production deployment to the account root needs either:

1. a `stephenlclarke/stephenlclarke.github.io` deployment repository; or
2. this repository renamed to `stephenlclarke.github.io`.

An arbitrary repository named `pages_home` publishes as a project site at `https://stephenlclarke.github.io/pages_home/`, not at the account root.

## Design source

The accepted desktop design reference is stored at `design/homepage-concept.png`. The production hero illustration is stored separately in `assets/docc-illustration.png`.
