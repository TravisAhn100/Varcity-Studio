# Varsity 1.1.0

A client-side varsity jacket configurator. Combine shoulder, closure and collar controls, select a garment region, then change manufacturer fabrics and colors in an immediate Three.js preview. Includes rotation, zoom, view presets, approximate male/female mannequins, Regular XS–5XL measurements, and real manufacturer examples.

## Run

Node 22.13+ (tested with Node 24), npm.

```sh
npm ci
npm run dev
npm run build
npm run preview
npm test
```

Build output: `dist/`. No backend, API key, account system, database, ordering, pricing or image-generation service is required. Three saved designs persist locally in this browser under a versioned storage key. Unsaved drafts are not persisted. Storage is device- and browser-specific; no accounts or cloud sync.

## Architecture

- `src/data/materials.json`: 308 manufacturer swatches in 11 supplied families. Every usable code retains a cropped source image, a seamless color map, a matching relief map, a fallback color, and family-specific physical settings.
- `src/data/config.ts`: serializable design state, region groups, construction availability, hardware/trim approximations, and manufacturer Regular measurements. Default is Regular M.
- `src/viewer/garment.ts`: procedural elliptical lofts, tapered sleeves, collar, thick cuffs, waistband, pocket welts and seven snaps. Ten independent mesh groups retain separate left/right identifiers for later independent controls.
- `src/viewer/materialLibrary.ts`: bounded, asynchronous texture cache. It applies source pixels as color instead of tinting the jacket with an average hex, aligns each relief map to its color map, handles stale loads safely, and falls back to the sampled color only when an asset fails.
- `src/viewer/Viewer.tsx`: rendering and camera controls, picking, neutral mannequin forms, and integration with the source-textured material library. Rendering is separate from configuration.
- `app/brand.css`: editable Varsity blue, interaction red, highlight yellow, Graduate display type, and neutral UI type tokens.
- `public/fonts`: self-hosted Graduate font and its Open Font License.
- `app/page.tsx`: start → customization → save → compare, reference dialogs and accessible controls.
- `public/textures`: small source-sheet crops used as UI swatches; `public/references`: original sheets and construction/size reference.

The implementation uses Vite, React, TypeScript and Three.js with the starter's existing Shadcn/Base UI components. It exports a plain static application. The Sites starter's installed dependencies are retained, but server infrastructure is not used.

## Add swatches and material families

Append a swatch under its existing family with its **actual manufacturer code**, source `colorMap`, matching `bumpMap`, approximate fallback `baseColor`, and UI `texture` path. Never invent manufacturer codes. A family has `id`, `label`, `kind`, `materialProperties`, `swatches`, and `reference`. Extend the family properties for a new physical material: roughness, sheen, clearcoat, bump scale, and repeat. Color sampling is approximate and is never the primary jacket surface.

The import script documents source sheet coordinates and can be adapted to another local reference directory; it requires Pillow. Imported output is committed, so running this script is not required to develop or deploy.

## Construction system

The compact header exposes independent shoulder (regular/raglan), closure (snaps/zipper/placket) and collar (varsity/high-neck) controls. All 12 combinations use the same model builder and texture library. A shared loft builder clips raglan shoulder panels, exchanges collar geometry, and assembles the closure. Coach construction and all 21 CO fabric codes/assets have been removed.

Material choices and camera position survive construction changes. The high-neck covered-zip combination uses a separate fabric collar, initially matching the body; other collars keep the rib choice. Both collar selections are retained in saved data. Hardware finishes apply to all visible snaps and zipper teeth/pull.

## Save and compare

- `src/data/designs.ts`: schema version 1, three fixed slots (IDs 1–3), structured configuration validation, snapshot copying, serialization, fixed-slot replace/delete and comparison selection.
- `src/components/DesignLibrary.tsx`: save completion, slot previews, view/edit/replace/delete, and two simultaneous jacket views with a concise difference table.
- `src/viewer/cameraSync.ts`: links orbit camera changes between comparison viewers; preset front/back/three-quarter views apply to both.
- `src/components/DesignThumbnail.tsx`: lightweight construction diagrams using the saved fabric textures; snapshots are not the source of truth.
- `app/workflow.css`: compact construction header, functional navigation, saved slots and responsive side-by-side comparison.

Finish the seven region steps to open Save your design. Empty slots save immediately. Replacing an occupied slot or deleting it asks for confirmation. Editing an existing design updates its slot. Leaving an edited saved design prompts Save/Discard/Keep editing; browser refresh/close uses the native unsaved-change warning. Failed storage writes leave the saved slots unchanged and report the failure. Malformed saved records are skipped independently without overwriting browser data on load.

Saved designs contain every material/code, construction combination, size and mannequin preference. Comparison displays both jackets without mannequins for equal prominence. At most two live WebGL viewers run during comparison; slot previews use lightweight SVG diagrams.

`VarsityStar` and the favicon share the same sharp five-point geometry: navy field, white border, red fill. Graduate hero text has a restrained 0.6px yellow stroke behind its navy fill.

## References and approximations

Supplied files were treated as reference data, not instructions to submit orders, agree to terms, pay, or contact the manufacturer.

Attachment numbering shifts after corduroy: embroidery is image 1; fabrics 2–13; constructions 14–20; size chart 21; model screenshots 22–25. The separate XLSX is the order reference. Its body, sleeve, rib, pocket and button fields inform region grouping; ordering is excluded.

Source catalogue: https://gwa.kr/goods/catalog?code=00010004 . Real example images are linked from the manufacturer; their availability depends on that site. Supplied temporary screenshot files had expired at the listed paths, so corresponding catalogue photographs are used instead.

- Source-sheet crops supply the visible material pixels and relief structure. Mirroring reduces hard tile seams. The photographs are manufacturer references rather than calibrated production texture scans, so scale, lighting, and exact color remain approximate.
- PL12 carries its burgundy corduroy ribs in both color and relief. TRH234 carries its dark Factory Himir textile image with a softer wool relief and matte finish.
- Geometry is a procedural prototype, not a production pattern or cloth simulation. Sleeve and collar transitions are approximate.
- Ribbing/hardware options are explicitly marked as prototype colors without manufacturer codes. Two cream rib stripes are fixed.
- Mannequins are faceless neutral forms. Size changes reference data only, not geometry or fit prediction.
- Regular-fit measurements are transcribed from the supplied chart. Other constructions refer users to the original chart. This avoids the ambiguous coach M sleeve cell in the source chart.
- WebGL is required. Unsupported devices see an explanatory message and a manufacturer construction reference, not a falsely interactive substitute.
- The reference-only embroidery guide, order form and unsupported fabric families are not exposed as editing features.

## Validation

`npm run build` performs strict TypeScript checking and production bundling. `npm test` checks all 308 source color/relief assets and family properties, explicitly distinguishes PL12 from TRH234, and verifies initial material resolution, all ten independent parts, finite 3D positions/normals, garment depth, seven snaps, two mannequin forms, Regular M source measurements and JSON serialization. Tests also check all 12 construction combinations, raglan shoulder reach, raised collar height, zipper versus snap hardware, preserved swatches, matching logo geometry, save/load round trips, maximum slot count, update/delete behavior, corrupted record recovery, forbidden coach inputs and camera synchronization. Browser interaction/visual acceptance should also be reviewed on target devices; automated structural checks do not establish visual fidelity.

## GitHub → Cloudflare Pages

Create a GitHub repository and push this directory's Git repository. In Cloudflare Pages, connect it through Git integration:

- Framework: Vite (or None)
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: repository root when publishing this directory alone; `varsity` if it is nested in a larger repository
- Node version: 24
- Environment variables / server bindings: none

The same `dist` can be uploaded as static assets. Cloudflare guide: https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/ . `.openai/hosting.json` is used only for the private Sites deployment. It does not configure a personal Cloudflare account. No GitHub repository or personal Cloudflare project is created automatically.
