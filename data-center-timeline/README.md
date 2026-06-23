# Data Center Timeline Iframe

Static GitHub Pages package for embedding an interactive timeline in WordPress or Showit.

## Files

- `index.html` renders the iframe page.
- `styles.css` contains the responsive timeline layout.
- `app.js` loads public timeline data from Google Sheets and handles filters, key-event toggling, expansion, and iframe height messaging.

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

Edit the public Google Sheet used by the app:

- `date`
- `milestone`
- `notes`
- `isKeyEvent`
- `isEnabled`

The app reads sheet `gid=0` from:

```text
https://docs.google.com/spreadsheets/d/1_dWuZcHCB0_MwSL5PHTtXMPZgyGWTClt_cw_mCSC0ac/edit?gid=0#gid=0
```

The sheet must be shared so anonymous visitors can read it.

## Visibility

Only rows with `TRUE` in the `isEnabled` column are shown on the timeline. Rows with `FALSE` or a blank value are hidden entirely (they do not appear in search, counts, or the year filter). If the `isEnabled` column is missing from the sheet, all rows are shown.

## Key Events

Key events are marked in the Google Sheet with `TRUE` in the `isKeyEvent` column. Rows with `FALSE` or a blank value render as normal events. The app includes a `Key events only` toggle and marks key events with a star badge and subtle card shading.

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
