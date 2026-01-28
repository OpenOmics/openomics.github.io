# OpenOmics Homepage

A website built with Python and Zensical to showcase OpenOmics Snakemake pipelines.

## Overview

This website automatically discovers and displays Snakemake pipelines from the OpenOmics GitHub organization. The build process fetches repository information from GitHub and generates a dynamic pipeline showcase page.

## Architecture

The site uses a **data-driven approach** with separation of concerns:

1. **Build-time data fetching** (`scripts/build_projects.py`)
   - Fetches all OpenOmics repositories from GitHub API
   - Scans each repository for Snakefiles
   - Saves pipeline data to `docs/pipelines-data.json`
   - Generates a minimal markdown page (`docs/projects.md`)

2. **Client-side rendering** (`docs/javascripts/load-pipelines.js`)
   - Loads pipeline data from JSON file
   - Dynamically creates HTML cards for each pipeline
   - Handles loading states and errors

3. **Static site generation** (Zensical)
   - Builds the final HTML from markdown
   - Copies JSON data and JavaScript to the `site/` directory

## Quick Start

### Prerequisites

**GitHub Personal Access Token Required**

This project requires a GitHub Personal Access Token to fetch repository data. This ensures reliable API access and avoids rate limiting.

1. **Create a token**: Visit [GitHub Settings → Tokens](https://github.com/settings/tokens/new)
2. **Permissions needed**: Select `public_repo` scope for public repositories
3. **Set environment variable**:
   ```bash
   export GITHUB_TOKEN='your_token_here'
   ```

### Installation

```bash
# Install Python dependencies
pip install -r requirements.txt

# Or use make
make install
```

### Generate Pipeline Data

```bash
# Set your GitHub token (required!)
export GITHUB_TOKEN='your_token_here'

# Fetch fresh data from GitHub
python scripts/build_projects.py

# Or use make
make generate
```

### Build the Site

```bash
# Build with fresh pipeline data
make build

# Or build without regenerating data
make quick-build
```

### Local Development

```bash
# Start development server
make serve

# Or manually
python -m zensical serve
```

## Project Structure

```
root
├── config.yml                          # Legacy config
├── zensical.toml                       # Zensical configuration
├── requirements.txt                    # Python dependencies
├── Makefile                            # Build commands
│
├── scripts/
│   ├── build_projects.py              # Fetches GitHub data & generates JSON
│
├── docs/                              # Source content
│   ├── index.md                       # Homepage
│   ├── about.md                       # About page
│   ├── projects.md                    # Pipelines page (auto-generated)
│   ├── pipelines-data.json            # Pipeline data (auto-generated)
│   │
│   ├── javascripts/
│   │   ├── load-pipelines.js          # Client-side rendering
│   │
│   └── stylesheets/
│       ├── pipeline-cards.css         # Pipeline card styles
│
└── site/                              # Built site (generated)
    ├── index.html
    ├── projects/
    │   └── index.html
    ├── pipelines-data.json           # Copied from docs/
    └── javascripts/
        └── load-pipelines.js         # Copied from docs/
```

## How It Works

### 1. Data Fetching (Build Time)

The `scripts/build_projects.py` script:

- Fetches all public repositories from the OpenOmics organization
- Checks each repository for a Snakefile in common locations:
  - `Snakefile`
  - `workflow/Snakefile`
  - `workflows/Snakefile`
  - etc.
- Extracts repository metadata:
  - Name, description, URL
  - Stars, forks, topics
  - Last update date
  - Snakefile location
- Saves data to `docs/pipelines-data.json`

**JSON Structure:**
```json
{
  "generated_at": "2026-01-27T12:43:09.812151",
  "count": 22,
  "pipelines": [
    {
      "name": "pipeline-name",
      "description": "Pipeline description",
      "url": "https://github.com/OpenOmics/pipeline-name",
      "language": "Python",
      "stars": 5,
      "forks": 3,
      "topics": ["tag1", "tag2"],
      "updated_at": "2026-01-27T18:08:04Z",
      "snakefile_location": "workflow/Snakefile"
    }
  ]
}
```

### 2. Page Generation (Build Time)

The script generates `docs/projects.md` with:
- Static header content (intro, info boxes)
- Empty container div: `<div id="pipelines-container">`
- Script tag to load the JavaScript
- Static footer content (about, getting started, etc.)

### 3. Dynamic Rendering (Runtime)

When users visit the page:
1. Browser loads `projects/index.html`
2. JavaScript (`load-pipelines.js`) executes
3. Fetches `pipelines-data.json`
4. Dynamically creates HTML cards for each pipeline
5. Inserts cards into the `pipelines-container` div

## Benefits

✅ **Separation of Concerns**: Data fetching is separate from presentation  
✅ **Reusable Data**: JSON can be consumed by other tools or pages  
✅ **Faster Builds**: Don't need to embed large HTML in markdown  
✅ **Flexible Frontend**: Easy to add sorting, filtering, or search  
✅ **Better Caching**: Browser can cache JavaScript separately from content  
✅ **API-Ready**: JSON file acts as a static API endpoint

## Available Commands

```bash
make help          # Show all available commands
make install       # Install Python dependencies
make generate      # Fetch GitHub data and generate JSON
make build         # Generate data + build static site
make quick-build   # Build without regenerating data
make serve         # Start development server
make deploy        # Build and prepare for deployment
make clean         # Remove build artifacts
make update        # Update pipeline data and rebuild
```

## Deployment

The site is deployed from the `site/` directory. After running `make build`, the `site/` directory contains:
- All static HTML pages
- `pipelines-data.json` (pipeline data)
- `javascripts/load-pipelines.js` (rendering script)
- All other assets (CSS, images, etc.)

## Configuration

### Zensical Configuration (`zensical.toml`)

The site is configured using Zensical, a Python-based static site generator. See `zensical.toml` for theme settings, navigation, and plugins.

### GitHub API

**GitHub Token Required**: The build script requires a GitHub Personal Access Token to be set as an environment variable.

```bash
# Create a token at: https://github.com/settings/tokens/new
# Only needs 'public_repo' scope

export GITHUB_TOKEN='your_token_here'
```

**Rate Limits with Authentication:**
- Authenticated requests: 5,000 requests per hour
- Unauthenticated requests: 60 requests per hour (NOT SUPPORTED)

The script will check for the token on startup and provide clear instructions if it's missing.

## Customization

### Add More Data Fields

Edit `scripts/build_projects.py` and update the `save_pipelines_data()` function:

```python
pipeline_data = {
    "name": repo.get('name'),
    # Add more fields from GitHub API
    "open_issues": repo.get('open_issues_count', 0),
    "license": repo.get('license', {}).get('name', 'Unknown'),
}
```

### Modify Card Design

Edit `docs/javascripts/load-pipelines.js` in the `createPipelineCard()` function to change the HTML structure.

Edit `docs/stylesheets/pipeline-cards.css` to update the styling.

**Current Design Features:**
- 3-column responsive grid layout
- Compact card design with smaller text
- Meta information with icons (language, stars, forks)
- Topic tags as pill-style badges (max 4 shown)
- Full-width "View Pipeline" button
- Updated date in footer
- No Snakefile location displayed

### Add Filtering/Sorting

Extend `load-pipelines.js` to add interactive controls:
- Filter by language, topics, or stars
- Sort by name, stars, or last update
- Search by keywords

## Troubleshooting

### GitHub API Rate Limit

**Problem:** Build fails with "API rate limit exceeded"

**Solution:** 
- Wait an hour for the rate limit to reset
- Use a GitHub Personal Access Token (see Configuration)
- Cache API responses during development

### Pipelines Not Displaying

**Problem:** Page shows "Loading pipelines..." forever

**Solution:**
- Check browser console for errors
- Verify `pipelines-data.json` exists in the `site/` directory
- Verify the JSON file is valid (use `python -m json.tool site/pipelines-data.json`)
- Check that JavaScript file was copied to `site/javascripts/`

### Build Errors

**Problem:** `make build` fails

**Solution:**
- Ensure Python dependencies are installed: `make install`
- Check that zensical is installed: `pip show zensical`
- Verify virtual environment is activated
- Check for syntax errors in Python scripts

## License

Copyright © 2026 OpenOmics Community - Open Source Bioinformatics
