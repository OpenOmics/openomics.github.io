#!/usr/bin/env python3
"""
DEPRECATED: This script has been replaced by build_projects.py

Please use the new build script instead:
    python scripts/build_projects.py

The new script provides better error handling, rate limiting,
and generates a more polished projects page.
"""

import sys

print("=" * 70)
print("⚠️  This script is deprecated!")
print("=" * 70)
print()
print("Please use the new build script instead:")
print()
print("    python scripts/build_projects.py")
print()
print("The new script:")
print("  ✓ Better rate limit handling")
print("  ✓ Improved error messages")  
print("  ✓ Nicer pipeline cards")
print("  ✓ Shows Snakefile locations")
print()
print("=" * 70)

sys.exit(1)


def has_snakefile(org_name, repo_name):
    """Check if a repository contains a Snakefile in common locations."""
    # Common locations for Snakefile
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
        except requests.RequestException:
            continue
    
    return False, None


def fetch_repos(org_name, max_repos=100):
    """Fetch repositories from GitHub API."""
    url = f"https://api.github.com/orgs/{org_name}/repos"
    params = {
        "sort": "updated",
        "per_page": max_repos,
        "type": "public"
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error fetching repos: {e}", file=sys.stderr)
        return []


def filter_snakemake_pipelines(org_name, repos):
    """Filter repositories to only include those with Snakefiles."""
    snakemake_repos = []
    print(f"Checking {len(repos)} repositories for Snakefiles...")
    
    for i, repo in enumerate(repos, 1):
        repo_name = repo.get('name', 'Unknown')
        print(f"  [{i}/{len(repos)}] Checking {repo_name}...", end=' ')
        
        has_snake, location = has_snakefile(org_name, repo_name)
        if has_snake:
            print(f"✓ Found at {location}")
            snakemake_repos.append(repo)
        else:
            print("✗ No Snakefile")
    
    return snakemake_repos


def generate_repo_markdown(repo):
    """Generate markdown for a single repository."""
    name = repo.get('name', 'Unknown')
    description = repo.get('description', 'No description available')
    url = repo.get('html_url', '#')
    language = repo.get('language', 'Code')
    stars = repo.get('stargazers_count', 0)
    forks = repo.get('forks_count', 0)
    topics = repo.get('topics', [])
    updated = repo.get('updated_at', '')
    
    # Format updated date
    if updated:
        try:
            dt = datetime.fromisoformat(updated.replace('Z', '+00:00'))
            updated_str = dt.strftime('%B %d, %Y')
        except Exception:
            updated_str = updated
    else:
        updated_str = 'Unknown'
    
    markdown = f"""
### [{name}]({url})

{description}

**Language:** {language} | **Stars:** ⭐ {stars} | **Forks:** 🔱 {forks}  
**Last Updated:** {updated_str}
"""
    
    if topics:
        tags = ' '.join([f'`{topic}`' for topic in topics[:5]])
        markdown += f"\n**Topics:** {tags}\n"
    
    markdown += f"\n[:material-github: View Repository]({url}){{ .md-button }}\n"
    
    return markdown


def generate_projects_page(org_name, repos):
    """Generate the complete projects.md page."""
    header = f"""---
icon: lucide/folder-git-2
---

# Our Snakemake Pipelines

Explore our collection of Snakemake workflows for bioinformatics and genomics analysis from [{org_name}](https://github.com/{org_name}).

!!! info "Auto-Generated"
    This page was automatically generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}
    
    Found **{len(repos)} Snakemake pipeline{'s' if len(repos) != 1 else ''}** in the {org_name} organization.
    
    To regenerate, run: `python scripts/generate-repos.py {org_name}`

## Available Pipelines

"""
    
    repo_sections = [generate_repo_markdown(repo) for repo in repos]
    
    footer = f"""
---

## About Our Pipelines

Our Snakemake pipelines are designed to:

- **Automate** complex bioinformatics workflows
- **Ensure reproducibility** across different computing environments
- **Scale** from laptop to HPC clusters
- **Follow best practices** in scientific computing

## All Repositories

Browse all {org_name} repositories on GitHub:

[:material-github: Visit {org_name} on GitHub](https://github.com/{org_name}){{ .md-button .md-button--primary }}

## Contributing

We welcome contributions to all our pipelines! Each repository has contribution guidelines.
"""
    
    return header + '\n'.join(repo_sections) + footer


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/generate-repos.py [organization-name]")
        print("Example: python scripts/generate-repos.py OpenOmics")
        sys.exit(1)
    
    org_name = sys.argv[1]
    max_repos = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    
    print(f"Fetching repositories for organization: {org_name}")
    all_repos = fetch_repos(org_name, max_repos)
    
    if not all_repos:
        print("No repositories found or error occurred.")
        sys.exit(1)
    
    print(f"Found {len(all_repos)} total repositories")
    
    # Filter for Snakemake pipelines
    snakemake_repos = filter_snakemake_pipelines(org_name, all_repos)
    
    if not snakemake_repos:
        print("No Snakemake pipelines found (no repositories with Snakefile)")
        sys.exit(1)
    
    print(f"\n✓ Found {len(snakemake_repos)} Snakemake pipelines")
    
    # Generate markdown
    markdown_content = generate_projects_page(org_name, snakemake_repos)
    
    # Write to file
    output_file = "docs/projects.md"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(markdown_content)
    
    print(f"\n✓ Generated {output_file}")
    print(f"  Listed {len(snakemake_repos)} Snakemake pipelines")
    print("\nRun 'zensical serve' or 'zensical build' to see the changes.")


if __name__ == '__main__':
    main()
