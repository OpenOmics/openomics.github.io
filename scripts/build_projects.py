#!/usr/bin/env python3
"""
Build-time script to generate the projects page with OpenOmics Snakemake pipelines.
This is automatically run during the Zensical build process.

Requires GITHUB_TOKEN environment variable to be set.
"""

import sys
import os
import json
import requests
from datetime import datetime
import time


def get_github_token():
    """Get GitHub token from environment variable or exit with error."""
    token = os.environ.get('GITHUB_TOKEN')
    if not token:
        print("\n" + "=" * 70, file=sys.stderr)
        print("❌ ERROR: GitHub token not found!", file=sys.stderr)
        print("=" * 70, file=sys.stderr)
        print("\nThis script requires a GitHub Personal Access Token to avoid", file=sys.stderr)
        print("API rate limiting and ensure reliable data fetching.", file=sys.stderr)
        print("\nTo fix this:", file=sys.stderr)
        print("\n1. Create a GitHub Personal Access Token:", file=sys.stderr)
        print("   https://github.com/settings/tokens/new", file=sys.stderr)
        print("\n2. Set the GITHUB_TOKEN environment variable:", file=sys.stderr)
        print("   export GITHUB_TOKEN='your_token_here'", file=sys.stderr)
        print("\n3. Run the script again", file=sys.stderr)
        print("\nFor public repositories, you only need the 'public_repo' scope.", file=sys.stderr)
        print("=" * 70 + "\n", file=sys.stderr)
        sys.exit(1)
    
    return token


def get_headers():
    """Get headers for GitHub API requests with authentication."""
    token = get_github_token()
    return {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'OpenOmics-Website-Builder'
    }


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
    
    headers = get_headers()
    
    for location in common_locations:
        url = f"https://api.github.com/repos/{org_name}/{repo_name}/contents/{location}"
        try:
            response = requests.get(url, headers=headers)
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
    headers = get_headers()
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
            response = requests.get(url, params=params, headers=headers)
            response.raise_for_status()
            
            # Check rate limit
            remaining = response.headers.get('X-RateLimit-Remaining')
            if remaining:
                print(f"  API Rate Limit Remaining: {remaining}")
            
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
            # Check if it's an auth error
            if hasattr(e, 'response') and e.response is not None:
                if e.response.status_code == 401:
                    print("\n❌ Authentication failed! Check your GITHUB_TOKEN.", file=sys.stderr)
                    sys.exit(1)
            break
    
    return all_repos


def filter_snakemake_pipelines(org_name, repos, exclusion_set={}):
    """Filter repositories to only include those with Snakefiles."""
    snakemake_repos = []
    total = len(repos)
    
    print(f"Checking {total} repositories for Snakefiles...")
    
    for i, repo in enumerate(repos, 1):
        repo_name = repo.get('name', 'Unknown')
        print(f"  [{i}/{total}] Checking {repo_name}...", end=' ', flush=True)
        
        has_snake, location = has_snakefile(org_name, repo_name)
        if has_snake and repo_name not in exclusion_set:
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


def generate_searchable_content(pipelines):
    """
    Generate hidden but searchable Markdown content for pipeline discovery.
    
    This content is invisible to users but indexed by Material for MkDocs search,
    allowing users to find pipelines by name, description, topics, and language.
    
    Args:
        pipelines: List of pipeline repository dictionaries
        
    Returns:
        String of Markdown content with search-optimized text
    """
    lines = []
    lines.append('<!-- BEGIN SEARCHABLE PIPELINE CONTENT -->')
    lines.append('<!-- This content is hidden but enables search indexing of pipeline data -->')
    lines.append('<div class="pipeline-search-content" style="display:none;" aria-hidden="true">')
    lines.append('')
    
    for pipeline in pipelines:
        name = pipeline.get('name', 'Unknown')
        description = pipeline.get('description', 'Snakemake pipeline')
        language = pipeline.get('language', 'Python')
        topics = pipeline.get('topics', [])
        stars = pipeline.get('stargazers_count', 0)
        forks = pipeline.get('forks_count', 0)
        
        # Create search-optimized text combining all relevant information
        topics_text = ', '.join(topics) if topics else 'bioinformatics, computational biology'
        
        # Format as a searchable paragraph for each pipeline
        lines.append(f'**{name} Pipeline**: {description}. ')
        lines.append(f'This {language} Snakemake workflow focuses on: {topics_text}. ')
        lines.append(f'GitHub repository with {stars} stars and {forks} forks. ')
        lines.append(f'Technologies: Snakemake, {language}, bioinformatics, genomics, computational biology.')
        lines.append('')
    
    lines.append('</div>')
    lines.append('<!-- END SEARCHABLE PIPELINE CONTENT -->')
    lines.append('')
    
    return '\n'.join(lines)


def generate_projects_page(org_name, pipelines):
    """Generate the complete projects.md page with searchable content."""
    
    # Generate searchable content block for search indexing
    searchable_content = generate_searchable_content(pipelines)
    
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

{searchable_content}

## Available Pipelines

<div id="pipelines-container">
<!-- Pipelines will be loaded from pipelines-data.json -->
</div>

<script src="../javascripts/load-pipelines.js"></script>

"""
    
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
    
    return header + footer


def save_pipelines_data(pipelines, output_dir="docs"):
    """Save pipeline data to JSON file for client-side rendering."""
    data = {
        "generated_at": datetime.now().isoformat(),
        "count": len(pipelines),
        "pipelines": []
    }
    
    for repo in pipelines:
        pipeline_data = {
            "name": repo.get('name', 'Unknown'),
            "description": repo.get('description', 'Snakemake pipeline'),
            "url": repo.get('html_url', '#'),
            "language": repo.get('language', 'Python'),
            "stars": repo.get('stargazers_count', 0),
            "forks": repo.get('forks_count', 0),
            "topics": repo.get('topics', []),
            "updated_at": repo.get('updated_at', ''),
            "snakefile_location": repo.get('snakefile_location', 'Snakefile')
        }
        data["pipelines"].append(pipeline_data)
    
    # Sort by stars (highest first)
    data["pipelines"].sort(key=lambda p: p.get("stars", 0), reverse=True)
    
    # Write to JSON file
    json_file = os.path.join(output_dir, "pipelines-data.json")
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    return json_file


def main():
    
    org_name = "OpenOmics"
    # Set of repos to exlude
    exclusion_set = {
        "NHLBI-1084",
        "SnakeMaker",
        "SnakeMaker_alt",
        "brakerMake",
        "mutation-seek",
        "DeepSeq",
        "ATAC-seq",
        "SQANTImake",
        "Long-read-genome-assembly"
    }
    
    # Verify GitHub token is set (will exit if not found)
    print("Checking GitHub authentication...")
    token = get_github_token()
    print(f"✓ GitHub token found (starts with: {token[:4]}...)\n")
    
    print(f"Fetching repositories from {org_name}...")
    all_repos = fetch_repos(org_name)
    
    if not all_repos:
        print("No repositories found or error occurred.")
        sys.exit(1)
    
    print(f"\nFound {len(all_repos)} total repositories")
    
    # Filter for Snakemake pipelines
    print("\nFiltering for Snakemake pipelines...\n")
    snakemake_pipelines = filter_snakemake_pipelines(org_name, all_repos, exclusion_set)

    
    if not snakemake_pipelines:
        print("\n⚠️  No Snakemake pipelines found")
        sys.exit(1)
    
    print(f"\n✓ Found {len(snakemake_pipelines)} Snakemake pipelines")
    
    # Save pipeline data to JSON
    print("\nSaving pipeline data to JSON...")
    json_file = save_pipelines_data(snakemake_pipelines)
    print(f"✓ Saved data to {json_file}")
    
    # Generate markdown with searchable content
    print("\nGenerating projects.md with searchable content...")
    markdown_content = generate_projects_page(org_name, snakemake_pipelines)
    
    # Write to file
    output_file = os.path.join("docs", "projects.md")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(markdown_content)
    
    print(f"✓ Generated {output_file}")
    print(f"  • Listed {len(snakemake_pipelines)} Snakemake pipelines")
    print(f"  • Added hidden searchable content for search indexing")
    print(f"  • Pipelines are now discoverable via site search")
    print("\n✅ Build complete! Run 'make build' or 'zensical build' to update the search index.")


if __name__ == '__main__':
    main()
