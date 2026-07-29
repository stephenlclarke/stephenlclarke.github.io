SITE_DIR := _site
SITE_ASSETS := assets/docc-illustration.png
SITE_FILES := index.html styles.css .nojekyll

.PHONY: build clean render serve sync test

build: clean
	mkdir -p $(SITE_DIR)/assets
	cp $(SITE_FILES) $(SITE_DIR)/
	cp $(SITE_ASSETS) $(SITE_DIR)/assets/

clean:
	rm -rf _site

render:
	node scripts/render-projects.mjs

serve: build
	python3 -m http.server 8000 --directory $(SITE_DIR)

sync:
	node scripts/sync-projects.mjs
	node scripts/render-projects.mjs

test:
	node --test --experimental-test-coverage scripts/project-catalog.test.mjs
	node scripts/render-projects.mjs --check
	node scripts/check-site.mjs
