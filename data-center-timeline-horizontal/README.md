# Data Center Timeline Horizontal Iframe

Static GitHub Pages package for embedding a horizontal interactive timeline in WordPress or Showit.

## Files

- `index.html` renders the iframe page.
- `styles.css` contains the responsive horizontal timeline layout.
- `app.js` loads `data/timeline.json` and handles filters, expansion, and iframe height messaging.
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

The converter reads the `Timeline no graph` sheet and exports only `DATE`, `MILESTONE`, `Height`, and `NOTES`.

## GitHub Pages

1. Put this `data-center-timeline-horizontal/` folder in a GitHub Pages repository.
2. Commit and push.
3. Enable GitHub Pages for the branch that contains this folder.
4. Use the published folder URL as the iframe `src`.

Example iframe:

```html
<iframe
  src="https://YOUR-GITHUB-USER.github.io/YOUR-REPO/data-center-timeline-horizontal/"
  title="Hermantown Data Center Timeline - Horizontal"
  style="width: 100%; height: 900px; border: 0;"
  loading="lazy"
></iframe>
```

For a simple Showit embed, start with a fixed height around `650px` to `900px`. The event cards scroll horizontally inside the iframe.
