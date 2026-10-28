# RationWise: Ingredient Values Transfer Update

## What changed
- On Step 3, the workbook ingredient button is **Add ingredients in the formulation**.
- For the ruminant-composition worksheet, the original spreadsheet states values are on a **dry-matter basis** and supplies **DM % as-fed**; compatible composition figures are copied into the existing formulation ingredient row.
- Other source sheets do not consistently identify the nutritional basis or dry matter. The user must select dry-matter or as-fed basis, and supply dry-matter percent when absent, before numeric transfer. As-fed concentrations are converted to per kg dry matter based on the supplied dry matter percentage.
- Source `RDP %` and `RUP %` are not silently interpreted as `% of dry-matter ration`; they are not copied to incompatible fields.
- Total lysine is not copied into a digestible lysine field. Missing values remain blank. Ingredient prices, laboratory analyses, safety review and rights information are not fabricated.
- The orange 'Draft reference · Not validated' badge is removed from the ingredient library, without removing source provenance or scientific limitations.

## Upload to GitHub (do NOT upload an additional dist folder)
1. Back up your existing repository version.
2. In the existing repository, browse to **rationwise / dist /**.
3. Extract the update ZIP, and upload these five individual files into the open `dist` directory:
   - `index.html`
   - `operational.js`
   - `complete-ui.js`
   - `excel-standards-ui.js`
   - `workbook-ingredient-transfer.js` (new)
4. Commit to `main`; the existing Cloudflare Git connection should redeploy.
5. Confirm the updated button and source-basis conversion using Step 3 → Barley grain, then enter a real price and complete missing nutrients before calculating.

## Important scientific note
The data originated in owner-supplied workbooks that cite third-party sources. Mathematical transfer does not establish commercial redistribution rights or laboratory/feeding approval. Verify third-party rights, applicability and feed safety before using resulting rations in practice.
