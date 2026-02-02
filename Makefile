# Makefile for OpenOmics Homepage

.PHONY: help install generate build serve deploy clean update test-search validate quick-build

help:  ## Show this help message
	@echo "╔════════════════════════════════════════════════════════════════╗"
	@echo "║         OpenOmics Homepage - Available Commands                ║"
	@echo "╚════════════════════════════════════════════════════════════════╝"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Note: 'generate' and 'build' require GITHUB_TOKEN to be set"
	@echo "      export GITHUB_TOKEN='your_token_here'"
	@echo ""

install:  ## Install Python dependencies
	pip install -r requirements.txt

generate:  ## Generate pipeline listings from GitHub (creates searchable content)
	@echo "🔍 Generating pipeline listings with searchable content..."
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
	@echo "✅ Pipeline data generated with search indexing support"

build: generate  ## Generate pipelines and build the static site (full build)
	@echo "🏗️  Building static site with Zensical..."
	python -m zensical build
	@echo "✅ Site built successfully in ./site/"
	@echo "   Pipelines are now searchable in the site search!"

serve:  ## Start local development server
	@echo "🚀 Starting development server..."
	python -m zensical serve

quick-build:  ## Build without regenerating pipelines (uses existing data)
	@echo "⚡ Quick build (skipping pipeline generation)..."
	python -m zensical build
	@echo "✅ Site built in ./site/"

deploy: build  ## Build and prepare for deployment (full build + deploy prep)
	@echo "📦 Preparing for deployment..."
	@echo "✅ Site built in ./site/"
	@echo "   Ready to deploy to GitHub Pages!"

clean:  ## Clean build artifacts
	@echo "🧹 Cleaning build artifacts..."
	rm -rf site/
	@echo "✅ Cleaned build artifacts"

update:  ## Update pipeline listings and rebuild (full refresh)
	@echo "🔄 Updating pipeline listings and rebuilding site..."
	@if [ -z "$$GITHUB_TOKEN" ]; then \
		echo ""; \
		echo "❌ ERROR: GITHUB_TOKEN not set!"; \
		echo "  export GITHUB_TOKEN='your_token_here'"; \
		echo ""; \
		exit 1; \
	fi
	python scripts/build_projects.py
	python -m zensical build
	@echo "✅ Update complete! Pipelines refreshed and site rebuilt."

test-search:  ## Test that pipeline search content was generated
	@echo "🔍 Checking if searchable content exists in projects.md..."
	@if grep -q "BEGIN SEARCHABLE PIPELINE CONTENT" docs/projects.md; then \
		echo "✅ Searchable content found in docs/projects.md"; \
		echo ""; \
		grep -c "Pipeline" docs/projects.md | awk '{print "   Found " $$1 " pipeline references"}'; \
	else \
		echo "❌ Searchable content NOT found!"; \
		echo "   Run 'make generate' to create it."; \
	fi

validate:  ## Validate the build setup
	@echo "🔍 Validating build setup..."
	@echo ""
	@echo "Checking dependencies..."
	@command -v python3 >/dev/null 2>&1 && echo "  ✅ Python 3 installed" || echo "  ❌ Python 3 not found"
	@python3 -c "import zensical" 2>/dev/null && echo "  ✅ Zensical installed" || echo "  ❌ Zensical not installed (run 'make install')"
	@python3 -c "import requests" 2>/dev/null && echo "  ✅ Requests installed" || echo "  ❌ Requests not installed (run 'make install')"
	@echo ""
	@echo "Checking GitHub token..."
	@if [ -z "$$GITHUB_TOKEN" ]; then \
		echo "  ⚠️  GITHUB_TOKEN not set (required for 'make generate')"; \
	else \
		echo "  ✅ GITHUB_TOKEN is set"; \
	fi
	@echo ""
	@echo "Checking generated files..."
	@if [ -f "docs/pipelines-data.json" ]; then \
		echo "  ✅ pipelines-data.json exists"; \
	else \
		echo "  ⚠️  pipelines-data.json not found (run 'make generate')"; \
	fi
	@if grep -q "BEGIN SEARCHABLE PIPELINE CONTENT" docs/projects.md 2>/dev/null; then \
		echo "  ✅ Searchable content in projects.md"; \
	else \
		echo "  ⚠️  Searchable content not found (run 'make generate')"; \
	fi
	@echo ""
