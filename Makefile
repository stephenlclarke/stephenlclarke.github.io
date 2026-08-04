SITE_DIR := _site
SITE_ASSETS := assets/docc-illustration.png
SITE_FILES := index.html styles.css .nojekyll
CONTAINER_API_FILES := api/index.html

.PHONY: build clean render serve sync test

build: clean
	mkdir -p $(SITE_DIR)/api $(SITE_DIR)/assets $(SITE_DIR)/projects
	cp $(SITE_FILES) $(SITE_DIR)/
	cp $(SITE_ASSETS) $(SITE_DIR)/assets/
	cp $(CONTAINER_API_FILES) $(SITE_DIR)/api/

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
	bash -n scripts/build-container-api-docs.sh
	bash -n scripts/build-project-docs.sh
