# Makefile for OpenOmics Homepage

.PHONY: help install generate build serve deploy clean

help:  ## Show this help message
	@echo "OpenOmics Homepage - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""

install:  ## Install Python dependencies
	pip install -r requirements.txt

generate:  ## Generate pipeline listings from GitHub
	@if [ -z "$$GITHUB_TOKEN" ]; then \
		echo ""; \
		echo "❌ ERROR: GITHUB_TOKEN not set!"; \
		echo ""; \
		echo "Please set your GitHub Personal Access Token:"; \
		echo "  export GITHUB_TOKEN='your_token_here'"; \
		echo ""; \
		echo "Create a token at: https://github.com/settings/tokens/new"; \
		echo ""; \
		exit 1; \
	fi
	python scripts/build_projects.py

build: generate  ## Generate pipelines and build the static site
	python -m zensical build

serve:  ## Start local development server
	python -m zensical serve

quick-build:  ## Build without regenerating pipelines
	python -m zensical build

deploy: build  ## Build and prepare for deployment
	@echo "Site built in ./site/"
	@echo "Ready to deploy!"

clean:  ## Clean build artifacts
	rm -rf site/
	@echo "Cleaned build artifacts"

update:  ## Update pipeline listings and rebuild
	@echo "Updating pipeline listings..."
	python scripts/build_projects.py
	@echo "Rebuilding site..."
	python -m zensical build
	@echo "Done!"
