/**
 * Load and display Snakemake pipelines from JSON data
 * This script reads pipeline data saved during build time
 */

(function() {
    'use strict';

    /**
     * Format a date string to a readable format
     */
    function formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        try {
            const date = new Date(dateString);
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Recently';
        }
    }

    /**
     * Create HTML for a single pipeline card
     */
    function createPipelineCard(pipeline) {
        const name = pipeline.name || 'Unknown';
        const description = pipeline.description || 'Snakemake pipeline';
        const url = pipeline.url || '#';
        const language = pipeline.language || 'Python';
        const stars = pipeline.stars || 0;
        const forks = pipeline.forks || 0;
        const topics = pipeline.topics || [];
        const updatedAt = formatDate(pipeline.updated_at);

        // Create the card HTML with improved layout
        let cardHtml = `
            <div class="pipeline-card">
                <div class="pipeline-header">
                    <h4>
                        <a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>
                    </h4>
                </div>
                
                <p class="pipeline-description">${description}</p>
        `;

        // Add topics if available (before meta)
        if (topics.length > 0) {
            const topicTags = topics.slice(0, 4).map(topic => `<span class="topic-tag">${topic}</span>`).join('');
            cardHtml += `
                <div class="pipeline-topics">
                    ${topicTags}
                </div>
            `;
        }

        // Add metadata (language, stars, forks) with Octicons
        cardHtml += `
                <div class="pipeline-meta">
                    <span class="meta-item">
                        <svg class="meta-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25Z"></path><path d="M7.25 8a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 .75.75v2.75h.75a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.5V8.75h-.25A.75.75 0 0 1 7.25 8ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>
                        <span class="meta-text">${language}</span>
                    </span>
                    <span class="meta-item">
                        <svg class="meta-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path></svg>
                        <span class="meta-text">${stars}</span>
                    </span>
                    <span class="meta-item">
                        <svg class="meta-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"></path></svg>
                        <span class="meta-text">${forks}</span>
                    </span>
                </div>
        `;

        // Add footer with date and button
        cardHtml += `
                <div class="pipeline-footer">
                    <span class="pipeline-updated">Updated: ${updatedAt}</span>
                    <a href="${url}" class="md-button md-button--primary" target="_blank" rel="noopener noreferrer">
                        View Pipeline
                    </a>
                </div>
            </div>
        `;

        return cardHtml;
    }

    /**
     * Load pipelines data and render cards
     */
    async function loadPipelines() {
        const container = document.getElementById('pipelines-container');
        
        if (!container) {
            console.error('Pipelines container not found');
            return;
        }

        // Show loading state
        container.innerHTML = '<div class="loading-message">Loading pipelines...</div>';

        try {
            // Fetch the JSON data
            const response = await fetch('../pipelines-data.json');
            
            if (!response.ok) {
                throw new Error(`Failed to load pipelines data: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.pipelines || data.pipelines.length === 0) {
                container.innerHTML = '<div class="no-pipelines">No pipelines found.</div>';
                return;
            }

            // Generate HTML for all pipeline cards
            const pipelinesHtml = data.pipelines
                .map(pipeline => createPipelineCard(pipeline))
                .join('\n');

            // Update the container
            container.innerHTML = pipelinesHtml;

            console.log(`Loaded ${data.pipelines.length} pipelines`);

        } catch (error) {
            console.error('Error loading pipelines:', error);
            container.innerHTML = `
                <div class="error-message">
                    <p>⚠️ Failed to load pipelines data.</p>
                    <p>Please try refreshing the page or contact support if the problem persists.</p>
                </div>
            `;
        }
    }

    // Load pipelines when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadPipelines);
    } else {
        loadPipelines();
    }
})();
