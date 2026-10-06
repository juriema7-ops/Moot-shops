# Moot Shops — static directory

Browse-only public shop directory for **Villieria · Queenswood · Waverley** (Pretoria East / Moot).

## Deploy root

Host the contents of this folder as the site root:

```
/workspace/market_builder/directory/
```

Files to deploy (everything in this folder):

| File | Role |
|---|---|
| `index.html` | Page shell |
| `styles.css` | Mobile-first styles |
| `app.js` | Search, suburb/category filters, card rendering |
| `shops.json` | Shop data (generated) |
| `build.py` | Rebuild script (optional on the server; keep for maintainers) |
| `README.md` | This file |

No build step is required at deploy time if `shops.json` is already present.

## Rebuild `shops.json`

From this folder (or any cwd):

```bash
python3 build.py
```

Reads `../area_shops.csv` and overwrites `shops.json`.

## Local preview

```bash
cd /workspace/market_builder/directory
python3 -m http.server 8080
```

Open `http://localhost:8080/`. Opening `index.html` as a `file://` URL will not load `shops.json` in most browsers.

## Behaviour notes

- **66 shops** from the CSV; rows whose `status_notes` contain `UNCERTAIN` are included with a “listing uncertain” badge and slightly de-emphasised cards.
- Suburb filter groups: raw labels such as `Villieria (Waverley Plaza)`, `Queenswood (verify)`, and `Villieria / Waverley border` map to **Villieria / Queenswood / Waverley**. Cards still show the original suburb text.
- Images: only hotlinkable URLs (e.g. `.png` / `.jpg` on a public CDN) are used as `<img src>`. Facebook pages and website roots become a warm category placeholder with a “photo coming” note. Nothing is scraped.
- Afrikaans names are left unchanged.
- Phase 1 is directory-only (footer note about collection later). No checkout, payments, or seller accounts.

## Counts (after last build)

Run `build.py` and check its stdout, or open `shops.json` (`count` / `uncertain_count`).
