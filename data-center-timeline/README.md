# Data Center Timeline Iframe

Static GitHub Pages package for embedding an interactive timeline in WordPress or Showit.

## Files

- `index.html` renders the iframe page.
- `styles.css` contains the responsive timeline layout.
- `app.js` loads `data/timeline.json` and handles filters, key-event toggling, expansion, and iframe height messaging.
- `data/timeline.json` is the public data file used by the page.
- `scripts/export-timeline.mjs` regenerates JSON from the Excel workbook.

## Local Preview

From this folder:

```powershell
python -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

## Updating the Data

Install the optional converter dependency once:

```powershell
npm install
```

Regenerate `data/timeline.json` from the workbook:

```powershell
npm run export:data -- "C:\path\to\Data Center Timeline updated 040626.xlsx"
```

The converter reads the `Timeline no graph` sheet and exports `DATE`, `MILESTONE`, `Height`, `NOTES`, and an optional key-event column.

## Key Events

Key events are marked in `data/timeline.json` with:

```json
"isKeyEvent": true
```

Events without `isKeyEvent` or with `false` render as normal events. The app includes a `Key events only` toggle and marks key events with a star badge and subtle card shading.

To preserve key events when regenerating from Excel, add a column named `KEY EVENT`, `Key Event`, or `isKeyEvent`. The converter treats `true`, `yes`, `y`, `1`, `key`, and `starred` as key-event values.

## GitHub Pages

1. Put this `data-center-timeline/` folder in a GitHub Pages repository.
2. Commit and push.
3. Enable GitHub Pages for the branch that contains this folder.
4. Use the published folder URL as the iframe `src`.

Example iframe:

```html
<iframe
  src="https://YOUR-GITHUB-USER.github.io/YOUR-REPO/data-center-timeline/"
  title="Hermantown Data Center Timeline"
  style="width: 100%; height: 900px; border: 0;"
  loading="lazy"
></iframe>
```

For a simple Showit embed, start with a fixed height around `900px` to `1200px`. If the page feels cramped, increase the iframe height in Showit.
