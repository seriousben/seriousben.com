HUGO_VERSION := 0.155.2
DOCKER_IMAGE := hugomods/hugo:$(HUGO_VERSION)
DOCKER_RUN := docker run --rm -v "$(PWD):/src" -w /src

.PHONY: build serve stop clean validate-tools new-tool

build:
	$(DOCKER_RUN) $(DOCKER_IMAGE) hugo --minify

serve:
	@docker stop hugo-server 2>/dev/null || true
	docker run -d --name hugo-server --rm -v "$(PWD):/src" -w /src -p 1313:1313 \
		$(DOCKER_IMAGE) hugo server --bind 0.0.0.0 -b http://localhost:1313/
	@echo "Server running at http://localhost:1313/"

stop:
	docker stop hugo-server

validate-tools:
	./validate-tools

new-tool:
	@./new-tool $(filter-out $@,$(MAKECMDGOALS))

%:
	@:

clean:
	rm -rf public resources
