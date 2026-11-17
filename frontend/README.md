# tip n tell: customer site (draft)

A phone-first (and laptop-friendly) booking page for tip n tell. Customers pick an open slot, choose a service and design,
and send the request to her as an Instagram DM. One button copies a ready-made message and opens
Instagram: her chat (`ig.me/m/_tipntell`) on phones and tablets, or her profile on laptops, where the
customer chooses Message. `src/utils/device.js` decides which. The site never books anything itself and stores no
personal details. This draft runs on sample data with no backend.

Built with Vue 3 (`<script setup>`), Vite, Vue Router, Pinia and Bootstrap 5, in plain JavaScript.

**Version B** (this branch) shows how booking works as a short, self-playing Instagram-style
story card on the home page, and adds small motion to the booking steps. See `docs/version-b-notes.md`. To run it beside
version A, use `pnpm dev --port 5180 --strictPort`.

## Run it

```bash
pnpm install
pnpm dev      # http://localhost:5173
pnpm build    # production build in dist/
pnpm lint
```

## Where to change things

| To change | Edit |
|---|---|
| Instagram handle (`_tipntell`, confirmed; both Instagram links are built from it), brand name, area, 2pm advice, policy wording | `src/config/site.js` |
| Prices (services, add-ons, specially opened slot fee) | `src/data/prices.js` |
| Open slots, booked slots, specially opened slots | `src/data/slots.js` |
| Design names, colours, and photos later (`image: '/designs/3.jpg'`) | `src/data/designs.js` |
| Brand colours and fonts (and a seasonal theme) | `src/assets/theme.css` |

Pages never read `src/data/` directly. Everything goes through `src/services/api.js`, so when the
Express + MongoDB API exists, only the function bodies in that file need to change to Axios calls.

## Project layout

- `src/views/`: one file per page (Home, Policies, and the four booking steps)
- `src/components/`: small reusable pieces (calendar, option cards, `BookingLayout` for the booking steps, etc.)
- `src/stores/`: Pinia stores: `catalog` (prices and designs), `slots` (calendar), `booking` (the request being built)
- `src/router/`: routes, plus a guard that stops people skipping booking steps

## Screen sizes

Layouts use Bootstrap's grid and breakpoint classes in the templates (`container-lg`, `row`,
`col-md-*`, `col-lg-*`, `row-cols-*`, `order-md-*`, `g-*`, `d-none d-lg-block`, `sticky-top`).

- **Phones (< 768px):** one column. On booking steps the main buttons sit in a bar stuck to the bottom.
- **md (≥ 768px):** a few things go side by side: the calendar and the chosen day's times, service and
  add-on, prices and policies. The gallery shows 3 per row.
- **lg (≥ 992px):** two-column home hero, prices / good to know / where as three cards, gallery 4 per row.
  Booking steps get a right-hand "Your request" card that stays in view while scrolling, in place of
  the bottom bar.
- **xl (≥ 1200px):** design picker 4 per row; on the Send step the summary and the message sit side by side.

The only custom media queries are in `src/components/BookingLayout.vue`, because the grid can place
columns but cannot make one stick to the bottom (phones) or the top (laptops) of the screen.

## Demo deploy (GitHub Pages)

The demo is live at https://veryrusky.github.io/tip-n-tell-site/, served from the `gh-pages` branch.
While `demoMode: true` in `src/config/site.js`, every page shows a "Demo site" notice; set it to
`false` before the real launch.

To redeploy after changes (Git Bash):

```bash
MSYS_NO_PATHCONV=1 pnpm build --base=/tip-n-tell-site/
cp dist/index.html dist/404.html   # lets links like /book/time work on refresh
touch dist/.nojekyll
```

Then push the contents of `dist/` to the `gh-pages` branch (for example from a copy of `dist/`:
`git init -b gh-pages`, `git add -A`, `git commit`, `git push --force <repo-url> gh-pages`).
`MSYS_NO_PATHCONV=1` stops Git Bash on Windows from turning `/tip-n-tell-site/` into a Windows path.
