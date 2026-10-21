# Atlas

An interactive AI ecosystem map for putting news stories in context. Built with React and Vite; includes companies, models, hardware, infrastructure, tools, applications, and research.

## Development

Requires Node.js 22 or newer and npm.

```sh
npm ci
npm run dev
```

The development server uses port 5173 by default. No API keys, accounts, database, or external services are required. Fonts are bundled locally.

## Use

- **News context:** paste a headline or excerpt and select **Find entities**. Known names and aliases are matched locally; the first match is selected on the map. Click another match to change focus. No article content is sent to a service, and URLs are not fetched.
- **Map:** the overview shows 33 entries. Select **Show all** for the complete 80-entry dataset. Drag to pan, or focus the canvas and use arrow keys. Use the zoom controls or `+` / `-`.
- **Relationships:** selecting an entity focuses its direct connections and shows details beside the map. **2 steps** includes connections through another entity. Labels and arrows retain the original relationship direction. Two-step paths can be read in the details panel.
- **Scope:** the focused map defaults to **Products & infrastructure**, excluding historical origins, research publication links, and consortium memberships. **All relationships** includes those links. Historical edges are dashed.
- **Directory:** search names, factual summaries, and tags, or filter by category. Closing an entity restores the previous view and filters.
- **Saved entities:** bookmarks stay in the current browser's local storage.
- **Keyboard:** `/` or `Ctrl/Cmd+K` focuses search. `Escape` closes the entity panel, navigation, or help dialog. The entity panel leaves the map interactive; only the help dialog traps focus.

The map identifies documented connections to investigate. It does not infer a story's consequences, estimate financial exposure, or assert that all connected entities will be affected. Headline matching uses literal names and aliases; unfamiliar or ambiguous terms may need a manual search.

## Checks

```sh
npm test
npm run test:e2e
npm run build
```

Unit tests validate the dataset, bounded graph traversal, original edge direction, operational relationship filtering, and headline name matching. Browser tests cover headline context, direct and two-step maps, relationship scope, non-modal detail navigation, restored filters, bookmarks, map controls, and mobile layout.

Browser tests use `/usr/bin/chromium` when available. Elsewhere, install a Playwright browser with `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to your Chromium executable. Playwright starts the development server if it is not already running.

To inspect the production bundle:

```sh
npm run build
npm run preview
```

`dist/` is a static website and can be deployed to a static hosting provider. Deployment has not been configured.

## Curating the ecosystem

The first edition contains **80 entities and 96 selected relationships** in `src/data/ecosystem.js`. Official entity websites are linked per entry. Coverage is curated and is not exhaustive or continuously refreshed. Map position and node size do not indicate rankings or market share. Relationships preserve historical wording where applicable.

Add or update entities in the data module and run `npm test`. Relationship endpoints must reference existing IDs. New entries are automatically available in search, the directory, category views, and the full map. To add an entity to the overview map, include its ID in `featuredIds` and give it a position in `src/components/EcosystemMap.jsx`.

The map uses deterministic layouts, SVG connections, and HTML buttons. No third-party graph service or tracking code is used.

Graph traversal, relationship scope, and headline matching are implemented in `src/lib/graph.js`. Add aliases and matching tests there when extending the dataset.
