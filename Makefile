HUGO_VERSION := 0.155.2
DOCKER_IMAGE := hugomods/hugo:$(HUGO_VERSION)
DOCKER_RUN := docker run --rm -v "$(PWD):/src" -w /src

.PHONY: build serve stop clean css css-watch lint

build:
	$(DOCKER_RUN) $(DOCKER_IMAGE) hugo --minify

build: css-build

serve:
	@docker stop hugo-server 2>/dev/null || true
	docker run -d --name hugo-server --rm -v "$(PWD):/src" -w /src -p 1313:1313 \
		$(DOCKER_IMAGE) hugo server --bind 0.0.0.0 -b http://localhost:1313/
	@echo "Server running at http://localhost:1313/"

stop:
	docker stop hugo-server

clean:
	rm -rf public resources themes/seriousben/assets/scss/tailwind-output.css node_modules

css-build:
	@if command -v npm > /dev/null 2>&1; then \
		npm ci && \
		npm run build:css; \
	else \
		echo "npm not found - skipping Tailwind CSS build"; \
	fi

css-watch:
	@if command -v npm > /dev/null 2>&1; then \
		npm run watch:css; \
	else \
		echo "npm not found - cannot watch CSS changes"; \
	fi

lint:
	./spellcheck.sh
