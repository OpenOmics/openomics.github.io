# OpenOmics

A React website for the OpenOmics community, built into static HTML, CSS, and JavaScript with Vite. The charcoal, ivory, and chartreuse design opens with “Start decoding / Complex biology” and concentric rings of nucleotide sequences rotating into alignment. A full-width fading nucleotide banner leads into an editorial sequence study. The site includes a dedicated explorer for 31 projects, onboarding guidance, and community links, with readable copy and controls on desktop and mobile.

## Develop

Use Node 24 LTS (`.nvmrc`), then:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Direct dependency versions are pinned in `package.json`, and the committed `package-lock.json` records the resolved dependency tree. Use `npm ci` to install from that lockfile. CI also includes the lockfile in the build artifact.

## Build and preview

```sh
npm test
npm run build
npm run preview
```

The complete deployable website is in **`dist/`**. No Node server, API service, credentials, or database is needed in production. Serve it over HTTP(S); opening `index.html` directly as a `file://` URL does not load module scripts correctly.

The build renders each page to HTML, then hydrates it in the browser. The homepage copy and the pipeline page's repository links are available without JavaScript. Search, filters, repository details, copy actions, and the canvas animation become interactive after hydration. Native FAQ disclosures work without JavaScript.

| URL | Static file | Content |
| --- | --- | --- |
| `/` | `dist/index.html` | Landing page, mission, collection link, getting started, and community |
| `/pipelines/` | `dist/pipelines/index.html` | Full pipeline explorer with more room for browsing and documentation |

The pipeline page works when opened directly, refreshed, or visited with JavaScript disabled. Navigation uses normal links, so it requires no SPA fallback or client-side router. During development, the Vite server resolves the same page identities from the URL. The former homepage `#pipelines` bookmark reaches the collection link.

The footer year is captured once during the build and passed to the client, preventing hydration differences at year boundaries. The hero plays one eight-second ring alignment and then stops scheduling animation frames. Pause, resume, and replay controls are available. Reduced-motion visitors immediately see the completed artwork and may explicitly choose to play it. Offscreen and hidden-tab time does not advance the animation; listeners, observers, frames, and cached graphics are released on unmount.

The animation uses Canvas 2D with cached character sprites, a bounded character field, fewer characters on mobile, a pixel-density cap of 1.5, and a drawing target of 30 frames per second. Twenty-one concentric nucleotide tracks rotate in alternating directions, at different rates, before easing to rest from the inside outward. Their highlighted ATG motifs meet on one fixed registration axis. Radii and spacing stay constant; characters move with their track instead of independently. The headline, navigation, and controls remain HTML. Desktop and mobile SVG fallbacks use the same deterministic rings and settled character positions as the canvas. They are included in the server-rendered page and remain visible without JavaScript or if canvas initialization fails. Mobile uses nine rings in a dedicated composition below the headline and controls. The animation adds no third-party dependency, video download, or runtime network request. Frame rate still depends on the device and should be measured on representative phones before release.

## Project structure

| Location | Purpose |
| --- | --- |
| `src/App.jsx` | Page composition |
| `src/components/` | Navigation, hero, content, pipeline explorer |
| `src/styles.css` | Responsive design and motion preferences |
| `src/data/pipelines.json` | Reviewed catalog and source metadata |
| `src/lib/catalog.js` | Pure search, category, and selection helpers |
| `src/lib/sequence-field.js` | Shared concentric-ring geometry, cached glyphs, and deterministic rotation |
| `src/components/SequenceStill.jsx` | Responsive server-rendered still compositions using the shared geometry |
| `src/lib/sequence-animation.js` | Animation timing, pause/replay, visibility, and reduced-motion lifecycle |
| `src/lib/routes.js` | Shared page metadata and links, including subdirectory deployments |
| `src/main.jsx` | Client startup and hydration |
| `src/entry-server.jsx` | Build-time HTML renderer |
| `scripts/build.mjs` | Static output, metadata, redirects, and sitemap |
| `tests/` | Catalog, deployment-path, and browser regression checks |
| `.github/workflows/docs.yml` | Pull-request validation and Pages deployment |

## Content and catalog

Edit `src/data/pipelines.json` to update the explorer. The catalog currently contains **31 projects**, including pipelines, an R package, and command-line tools. It began with the **3 February 2026** catalog snapshot and was expanded on **24 November 2026** with CellSight, PDtoMSstats, microbe-count, tcr-seek, and snakevision. DLscID and iso-seek were removed from the current catalog before this expansion. Categories and short descriptions are editorial; PDtoMSstats appears under Proteomics, and cfChIP-seek, cyte-seek, and parabricks-benchmark appear under Archived.

The existing descriptions were reviewed on **18 November 2026**; the five additions were checked against their GitHub READMEs, usage guides, and relevant source files on **24 November 2026**. Each detail view retains its own review date and source links. Metadata preserves the original snapshot date and source, tracks the latest catalog update separately, and records the current count. The site does not fetch GitHub at runtime.

For each entry maintain the exact repository name, canonical GitHub URL, short description, category array, and topic array. Its `details` object supplies the explorer's richer content:

| Field | Content |
| --- | --- |
| `overview` | What the project does and the research task it supports |
| `type` (optional) | Software form shown beside the categories, such as `R package`, `Analysis workflow`, `Pipeline`, or `Command-line tool` |
| `inputs` | Documented input data and reference requirements |
| `outputs` | Principal documented results, reports, or artifacts |
| `notes` | Practical prerequisites and important documented limitations |
| `documentationUrl` | Current project instructions |
| `sourceUrl` | Source used to write the description |
| `reviewedOn` | Date those details were checked, in `YYYY-MM-DD` format |
| `status` (optional) | Documented `archived`, `scaffold`, or `template` status; omit when not established |
| `sources` (optional) | Labeled supporting documentation or workflow source links when the overview relies on multiple files |

Search includes project types, overviews, inputs, outputs, practical notes, and documented status labels. The expanded view keeps source and documentation links close to each description; run guidance is a native disclosure to keep the main facts easy to scan. Archived projects and development scaffolds are explicitly labeled. Where a repository does not document a detail, say so rather than infer a capability. A documentation review is not an execution benchmark or scientific validation.

Update each project’s review date when checking its description. When membership changes, update `metadata.count`, `updatedDate`, and `updatedDisplayDate`; retain the original snapshot provenance. Run `npm test` and inspect search/category behavior after edits. The production build never fetches GitHub or needs a token.

The React/Vite site replaces the former Python/Zensical site. The old `docs/` pages, Python catalog generator, Makefile, and Zensical configuration have been removed; their history remains available in Git. Maintain current content in `src/components/` and `src/data/pipelines.json`.

## Checks

```sh
npm run check                  # Unit checks and verified static build
npx playwright install chromium
npm run test:browser           # Serves dist temporarily, then closes it
```

Browser checks exercise both prerendered pages, direct navigation and refresh, hydration, the JavaScript-disabled catalog and hero fallback, search and filters, empty-state reset, repository selection, copy behavior, mobile navigation, animation pause/resume/completion/replay, reduced motion, legacy URLs, readable text sizes, full-width nucleotide artwork on ultrawide screens, and horizontal overflow. CI installs Chromium with its OS dependencies. Failure screenshots are uploaded with the workflow artifacts. If using an installed system browser, set `PLAYWRIGHT_EXECUTABLE_PATH` to its full path when running browser checks.

Unit tests also exercise animation timing and cleanup with controlled scheduling, hidden and offscreen suspension, resize behavior, failure fallback, bounded geometry, and cached glyph rendering. These checks do not replace a production build or a real-device performance review.

## GitHub Pages

The `.github/workflows/docs.yml` workflow builds and validates this React/Vite site, then publishes `dist/` to GitHub Pages. It replaces the former Zensical deployment workflow.

The default deployment target is `https://openomics.github.io/`. Pull requests run checks and upload a review build. The deploy job runs only for `main`, after the build and browser checks pass. Set the repository's **Settings → Pages → Source** to **GitHub Actions** if it is not already configured that way.

The old `/projects/` and `/projects.html` URLs redirect to `/pipelines/`. `/about/` and `/about.html` redirect to the homepage's approach section. A standalone `404.html`, `robots.txt`, sitemap covering both pages, page-specific metadata and canonical URLs, and a PNG logo used for the header and favicon are included.

For a different host or a project subdirectory, set the public URL at build time:

```sh
SITE_URL=https://example.org/openomics/ npm run build
```

The asset base is derived from the URL path. An optional `SITE_BASE` must match it. Use the same environment when running `npm run preview`. For a custom GitHub Pages domain, configure the domain in repository settings and add the corresponding `public/CNAME` file before building.

## Design notes

The concentric-ring animation is an illustrative metaphor for sequence alignment and making complex data legible. It does not depict measured sequence data, execute a pipeline, or perform a sequence-alignment algorithm. The interface does not imply clinical validation of any workflow. Consult each repository's documentation, requirements, and license before using or modifying its code.

Design reference: [Content Architecture](https://www.contentarchitecture.dev/). React implementation and genomics artwork are specific to OpenOmics.
