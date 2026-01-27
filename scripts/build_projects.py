#!/usr/bin/env python3
"""
Build-time script to generate the projects page with OpenOmics Snakemake pipelines.
This is automatically run during the Zensical build process.
"""

import sys
import os
import requests
from datetime import datetime
import time


def has_snakefile(org_name, repo_name):
    """Check if a repository contains a Snakefile in common locations."""
    common_locations = [
        'Snakefile',
        'snakefile',
        'workflow/Snakefile',
        'workflow/snakefile',
        'workflows/Snakefile',
        'workflows/snakefile',
        'snakemake/Snakefile',
        'snakemake/snakefile'
    ]
    
    for location in common_locations:
        url = f"https://api.github.com/repos/{org_name}/{repo_name}/contents/{location}"
        try:
            response = requests.get(url)
            if response.status_code == 200:
                return True, location
            # Small delay to avoid rate limiting
            time.sleep(0.5)
        except requests.RequestException:
            continue
    
    return False, None


def fetch_repos(org_name):
    """Fetch all public repositories from GitHub organization."""
    url = f"https://api.github.com/orgs/{org_name}/repos"
    all_repos = []
    page = 1
    per_page = 100
    
    while True:
        params = {
            "sort": "updated",
            "per_page": per_page,
            "page": page,
            "type": "public"
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            repos = response.json()
            
            if not repos:
                break
                
            all_repos.extend(repos)
            
            if len(repos) < per_page:
                break
                
            page += 1
            time.sleep(1)  # Rate limiting
            
        except requests.RequestException as e:
            print(f"Error fetching repos: {e}", file=sys.stderr)
            break
    
    return all_repos


def filter_snakemake_pipelines(org_name, repos):
    """Filter repositories to only include those with Snakefiles."""
    snakemake_repos = []
    total = len(repos)
    
    print(f"Checking {total} repositories for Snakefiles...")
    
    for i, repo in enumerate(repos, 1):
        repo_name = repo.get('name', 'Unknown')
        print(f"  [{i}/{total}] Checking {repo_name}...", end=' ', flush=True)
        
        has_snake, location = has_snakefile(org_name, repo_name)
        if has_snake:
            print(f"✓ Found at {location}")
            repo['snakefile_location'] = location
            snakemake_repos.append(repo)
        else:
            print("✗ No Snakefile")
    
    return snakemake_repos


def generate_repo_card_markdown(repo):
    """Generate markdown for a single repository card."""
    name = repo.get('name', 'Unknown')
    description = repo.get('description', 'Snakemake pipeline')
    url = repo.get('html_url', '#')
    language = repo.get('language', 'Python')
    stars = repo.get('stargazers_count', 0)
    forks = repo.get('forks_count', 0)
    topics = repo.get('topics', [])
    updated = repo.get('updated_at', '')
    snakefile_location = repo.get('snakefile_location', 'Snakefile')
    
    # Format updated date
    if updated:
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(updated.replace('Z', '+00:00'))
            updated_str = dt.strftime('%B %d, %Y')
        except Exception:
            updated_str = 'Recently'
    else:
        updated_str = 'Unknown'
    
    # Build markdown with markdown="1" attribute to allow markdown processing inside HTML
    markdown = f"""
<div class="pipeline-card" markdown="1">

### [{name}]({url})

{description}

<div class="pipeline-meta" markdown="1">
<span class="pipeline-language">**Language:** {language}</span> | 
<span class="pipeline-stars">⭐ {stars}</span> | 
<span class="pipeline-forks">🔱 {forks}</span>
</div>

<div class="pipeline-info" markdown="1">
**Snakefile:** `{snakefile_location}` | **Updated:** {updated_str}
</div>
"""
    
    if topics:
        topic_tags = ' '.join([f'`{topic}`' for topic in topics[:6]])
        markdown += f'\n**Topics:** {topic_tags}\n'
    
    markdown += f'\n[:material-github: View Pipeline]({url}){{ .md-button }}\n\n</div>\n'
    
    return markdown


def generate_projects_page(org_name, pipelines):
    """Generate the complete projects.md page."""
    
    header = f"""---
icon: lucide/folder-git-2
---

# Our Snakemake Pipelines

Explore our collection of **{len(pipelines)} Snakemake workflow{'s' if len(pipelines) != 1 else ''}** for bioinformatics and genomics analysis, built by the OpenOmics community.

!!! success "Pipeline Discovery"
    
    This page was automatically generated on **{datetime.now().strftime('%B %d, %Y at %I:%M %p')}** by scanning all [{org_name}](https://github.com/{org_name}) repositories for Snakemake pipelines.
    
    Found **{len(pipelines)}** pipeline{'s' if len(pipelines) != 1 else ''} by checking common locations: `Snakefile`, `workflow/Snakefile`, etc.

!!! info "What is Snakemake?"
    
    [Snakemake](https://snakemake.readthedocs.io/) is a workflow management system that creates reproducible and scalable data analyses. All pipelines below contain a Snakefile for workflow orchestration.

---

## Available Pipelines

"""
    
    # Generate cards for each pipeline
    pipeline_cards = [generate_repo_card_markdown(repo) for repo in pipelines]
    
    footer = f"""
---

## About Our Pipelines

Our Snakemake pipelines are designed to:

- **Automate** complex bioinformatics workflows
- **Ensure reproducibility** across different computing environments
- **Scale** from laptop to HPC clusters
- **Follow best practices** in scientific computing

Each pipeline includes:
- Detailed documentation
- Example datasets
- Configuration templates
- Environment specifications

## Getting Started

To use any of our pipelines:

1. **Clone the repository** from GitHub
2. **Install Snakemake** (see [installation guide](https://snakemake.readthedocs.io/en/stable/getting_started/installation.html))
3. **Follow the README** in each repository for specific instructions
4. **Customize** the configuration file for your data

---

## All Repositories

Browse all OpenOmics repositories:

[:material-github: Visit {org_name} on GitHub](https://github.com/{org_name}){{ .md-button .md-button--primary }}

## Contributing

We welcome contributions to all our pipelines! Each repository has contribution guidelines. Join our community of bioinformaticians and developers!

---

<small>*To regenerate this page, run: `python scripts/build_projects.py`*</small>
"""
    
    return header + '\n'.join(pipeline_cards) + footer


def main():
    org_name = "OpenOmics"
    
    print(f"Fetching repositories from {org_name}...")
    all_repos = fetch_repos(org_name)
    
    if not all_repos:
        print("No repositories found or error occurred.")
        sys.exit(1)
    
    print(f"\nFound {len(all_repos)} total repositories")
    
    # Filter for Snakemake pipelines
    print("\nFiltering for Snakemake pipelines...\n")
    snakemake_pipelines = filter_snakemake_pipelines(org_name, all_repos)
    
    if not snakemake_pipelines:
        print("\n⚠️  No Snakemake pipelines found")
        sys.exit(1)
    
    print(f"\n✓ Found {len(snakemake_pipelines)} Snakemake pipelines")
    
    # Generate markdown
    print("\nGenerating projects.md...")
    markdown_content = generate_projects_page(org_name, snakemake_pipelines)
    
    # Write to file
    output_file = os.path.join("docs", "projects.md")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(markdown_content)
    
    print(f"✓ Generated {output_file}")
    print(f"  Listed {len(snakemake_pipelines)} Snakemake pipelines")
    print("\n✅ Build complete! Run 'zensical build' to see the changes.")


if __name__ == '__main__':
    main()
