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

        // Add metadata (language, stars, forks)
        cardHtml += `
                <div class="pipeline-meta">
                    <span class="meta-item">
                        <span class="meta-icon">💻</span>
                        <span class="meta-text">${language}</span>
                    </span>
                    <span class="meta-item">
                        <span class="meta-icon">⭐</span>
                        <span class="meta-text">${stars}</span>
                    </span>
                    <span class="meta-item">
                        <span class="meta-icon">🔱</span>
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
