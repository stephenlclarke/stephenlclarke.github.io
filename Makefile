SITE_DIR := _site
SITE_ASSETS := assets/docc-illustration.png
SITE_FILES := index.html styles.css .nojekyll

.PHONY: build clean serve test

build: clean
	mkdir -p $(SITE_DIR)/assets
	cp $(SITE_FILES) $(SITE_DIR)/
	cp $(SITE_ASSETS) $(SITE_DIR)/assets/

clean:
	rm -rf _site

serve:
	python3 -m http.server 8000

test:
	node scripts/check-site.mjs
