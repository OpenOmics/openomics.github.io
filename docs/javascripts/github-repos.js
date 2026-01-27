/**
 * GitHub Repository Showcase - Snakemake Pipelines
 * Fetches and displays Snakemake pipeline repositories from OpenOmics organization
 */

const GITHUB_ORG = 'OpenOmics'; // OpenOmics GitHub organization
const MAX_REPOS = 100; // Fetch more repos to filter for Snakemake pipelines

async function fetchGitHubRepos() {
    try {
        const response = await fetch(`https://api.github.com/orgs/${GITHUB_ORG}/repos?sort=updated&per_page=${MAX_REPOS}`);
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        const repos = await response.json();
        return repos;
    } catch (error) {
        console.error('Error fetching GitHub repos:', error);
        return [];
    }
}

async function hasSnakefile(repo) {
    // Check multiple common locations for Snakefile (case-insensitive)
    // GitHub's code search API requires authentication, so we check common locations directly
    const commonLocations = [
        'Snakefile',
        'snakefile',
        'workflow/Snakefile',
        'workflow/snakefile',
        'workflows/Snakefile',
        'workflows/snakefile',
        'snakemake/Snakefile',
        'snakemake/snakefile'
    ];
    
    try {
        // Check each common location
        for (const path of commonLocations) {
            const response = await fetch(
                `https://api.github.com/repos/${GITHUB_ORG}/${repo.name}/contents/${path}`
            );
            if (response.ok) {
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error(`Error checking ${repo.name} for Snakefile:`, error);
        return false;
    }
}

async function filterSnakemakePipelines(repos) {
    // Check each repo for Snakefile in common locations
    const snakemakePipelines = [];
    
    // Process repos in small batches to show progress
    for (let i = 0; i < repos.length; i++) {
        const repo = repos[i];
        console.log(`Checking ${i + 1}/${repos.length}: ${repo.name}...`);
        
        const isSnakemake = await hasSnakefile(repo);
        if (isSnakemake) {
            console.log(`  ✓ Found Snakefile in ${repo.name}`);
            snakemakePipelines.push(repo);
        }
        
        // Small delay to be respectful of API limits
        if (i < repos.length - 1 && (i + 1) % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    return snakemakePipelines;
}

function createRepoCard(repo) {
    const language = repo.language || 'Snakemake';
    const stars = repo.stargazers_count || 0;
    const forks = repo.forks_count || 0;
    const description = repo.description || 'Snakemake pipeline - No description available';
    
    return `
        <div class="repo-card">
            <div class="repo-header">
                <h3>
                    <a href="${repo.html_url}" target="_blank" rel="noopener">
                        ${repo.name}
                    </a>
                </h3>
                <span class="repo-badge snakemake">🐍 Snakemake</span>
            </div>
            <p class="repo-description">${description}</p>
            <div class="repo-meta">
                <span class="repo-language">
                    <span class="language-dot" style="background-color: ${getLanguageColor(language)}"></span>
                    ${language}
                </span>
                <span class="repo-stars">⭐ ${stars}</span>
                <span class="repo-forks">🔱 ${forks}</span>
            </div>
            ${repo.topics && repo.topics.length > 0 ? `
                <div class="repo-topics">
                    ${repo.topics.slice(0, 5).map(topic => `<span class="topic-tag">${topic}</span>`).join('')}
                </div>
            ` : ''}
            <div class="repo-actions">
                <a href="${repo.html_url}" class="repo-button" target="_blank" rel="noopener">
                    View Pipeline →
                </a>
            </div>
        </div>
    `;
}

function getLanguageColor(language) {
    const colors = {
        'JavaScript': '#f1e05a',
        'TypeScript': '#2b7489',
        'Python': '#3572A5',
        'Java': '#b07219',
        'Go': '#00ADD8',
        'Rust': '#dea584',
        'Ruby': '#701516',
        'PHP': '#4F5D95',
        'C++': '#f34b7d',
        'C': '#555555',
        'C#': '#178600',
        'Swift': '#ffac45',
        'Kotlin': '#A97BFF',
        'HTML': '#e34c26',
        'CSS': '#563d7c',
        'Shell': '#89e051',
        'Vue': '#41b883',
        'React': '#61dafb',
    };
    return colors[language] || '#858585';
}

async function displayGitHubRepos() {
    const container = document.getElementById('github-repos-container');
    if (!container) return;

    // Show loading state
    container.innerHTML = '<div class="repo-loading">🔍 Fetching OpenOmics repositories...</div>';

    const repos = await fetchGitHubRepos();
    
    if (repos.length === 0) {
        container.innerHTML = '<div class="repo-error">Unable to load repositories. Please check the organization name.</div>';
        return;
    }

    // Filter for Snakemake pipelines
    container.innerHTML = `
        <div class="repo-loading">
            🐍 Searching for Snakemake pipelines in ${repos.length} repositories...<br>
            <small>Checking common locations: Snakefile, workflow/Snakefile, etc.</small><br>
            <small>Check browser console for progress</small>
        </div>
    `;
    
    const snakemakePipelines = await filterSnakemakePipelines(repos);
    
    if (snakemakePipelines.length === 0) {
        container.innerHTML = '<div class="repo-error">No Snakemake pipelines found. Checked common locations: Snakefile, workflow/Snakefile, workflows/Snakefile, etc.</div>';
        return;
    }

    // Create grid of repository cards
    const repoGrid = snakemakePipelines.map(repo => createRepoCard(repo)).join('');
    container.innerHTML = `
        <div class="pipeline-count">Found ${snakemakePipelines.length} Snakemake pipeline${snakemakePipelines.length !== 1 ? 's' : ''}</div>
        <div class="repo-grid">${repoGrid}</div>
    `;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', displayGitHubRepos);
} else {
    displayGitHubRepos();
}
