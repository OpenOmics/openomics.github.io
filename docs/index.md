---
icon: lucide/home
---

<div id="animation-container"></div>

# Welcome to OpenOmics

We're a community of bioinformaticians and computational biologists building reproducible Snakemake pipelines for genomics and multi-omics analysis.

## What We Do

**Reproducible Workflows** - Creating Snakemake pipelines for bioinformatics analysis

**Open Source** - All our pipelines are open source and community-driven  

**Best Practices** - Following scientific computing standards and containerization

## Our Snakemake Pipelines

Browse our collection of [Snakemake Pipelines](projects.md) designed for various genomics and omics analyses.

## Why Snakemake?

!!! tip "Workflow Management"

    Snakemake provides a readable Python-based workflow definition language and a powerful execution environment that scales from single workstations to HPC clusters and cloud environments.

??? info "Key Features"
    
    - **Reproducibility** - Conda/container integration ensures consistent results
    - **Scalability** - Run on laptops, HPC clusters, or cloud infrastructure
    - **Readability** - Python-based syntax is easy to learn and maintain
    - **Flexibility** - Supports various workflow patterns and tools
    
    All OpenOmics pipelines leverage these features for robust bioinformatics analysis!

## Get Started

Ready to use our pipelines? Check out our [Snakemake Pipelines](projects.md) page to explore available workflows.

---

**Join our community!** Visit our [GitHub organization](https://github.com/OpenOmics) to contribute or report issues.

<script>
    import('./javascripts/terrain-animation.js')
      .then(module => {
          // Explicitly call init() every time the page is visited
          module.init();
      })
      .catch(err => console.error("Animation failed to load:", err));
</script>