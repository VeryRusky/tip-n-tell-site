# tip n tell: backend (API)

The Express + MongoDB API behind the booking site. It does two jobs:

1. **Public data** for the customer site: open slots and design references.
2. **The owner's admin pages**: she signs in with her Google account and updates the
   calendar and her design photos herself, mostly from her phone.

It stores **no customer data**: no names, phones, emails or notes. A slot is only a date, a
time, a status (`open`, `pending` = on hold, `booked`) and whether it is specially opened.
Customers still send their request to her by Instagram DM; only she changes a slot.

Built the way the WAD2 course teaches: Express 5, Mongoose, `routes/` → `controllers/` →
`models/`. One difference: the course examples use `require(...)` (CommonJS). This project
uses `import ... from ...` (ES modules, `"type": "module"` in `package.json`), the same as the
Vue frontend. They do the same thing; only the syntax differs.

## Run it

You need Node 22.18+ (or 24.12+) and pnpm.

```bash
cd backend
pnpm install
cp .env.example .env      # then edit .env (see "Settings" below)
pnpm dev                  # http://localhost:8000, restarts when you save a .js file
```

The **first** `pnpm dev` or `pnpm test` downloads a MongoDB program (about 780 MB, once) for
the temporary development database. After that it starts in a few seconds.

Then run the frontend against it, in a second terminal:

```bash
cd frontend
cp .env.example .env.development   # sets VITE_API_URL=/api
pnpm dev
```

Open the site as usual. The admin pages are at **`/admin`** (not linked anywhere on the site).
For local testing, set `ALLOW_DEV_LOGIN=true` in `backend/.env` and use the **Dev login** button,
since a real Google sign-in needs a Google client ID (see "Your own steps" below).

Without `frontend/.env.development` the frontend runs on sample data with no admin pages,
exactly like the GitHub Pages demo.

### Other commands

```bash
pnpm test     # backend tests (Vitest + supertest, each file gets its own temporary database)
pnpm seed     # put the sample slots and designs into the MONGODB_URI database (only if empty)
pnpm start    # run without auto-restart (what a host runs)
```

### The temporary database

If `MONGODB_URI` is empty (and `NODE_ENV` is not `production`), the server starts a temporary
in-memory MongoDB, fills it with the sample slots and designs, and prints:

```
[db] No MONGODB_URI set: using a TEMPORARY in-memory database with sample data. ...
```

Everything you change is lost when the server stops. (Photos you upload stay in
`backend/uploads/`, which is not committed; delete the folder whenever you like.)
To keep data, set `MONGODB_URI` to a real database such as MongoDB Atlas.

## Folder layout

| File / folder | What it does |
|---|---|
| `server.js` | Starts everything: reads settings, connects the database, listens on `PORT`. |
| `app.js` | Builds the Express app (middleware, routes, error handling). The tests use it directly. |
| `config.js` | Reads `.env`, checks it, and **refuses to start** if a setting is unsafe. |
| `db.js` | Connects to `MONGODB_URI`, or to the temporary database in development. |
| `models/` | Mongoose schemas: `Slot`, `Design`, and `Counter` (hands out design numbers). |
| `routes/` | Which URL goes to which controller function. `publicRoutes.js`, `adminRoutes.js`. |
| `controllers/` | The code for each route: read the request, check it, use the models, answer. |
| `middleware/` | Small functions that run before controllers: login check, Origin check, rate limits, photo upload, no-cache, errors. |
| `services/` | Helpers: input checks (`validate.js`), Singapore dates, photo clean-up (`images.js`), Google token check, photo storage (`storage/`). |
| `seed/` | Sample data (copied from `frontend/src/data/`) and the `pnpm seed` script. |
| `tests/` | Backend tests. `helpers.js` sets up a temporary database and app. |
| `uploads/` | Photos saved on your computer in development. **Never committed** (in `.gitignore`). |

## The API

All addresses start with `/api`. "Today" is always worked out in Singapore time.

**Public (no login)**

| Method and path | Answer |
|---|---|
| `GET /api/health` | `{ ok: true }` |
| `GET /api/slots/months` | Months with a slot today or later, e.g. `['2026-12', '2027-01']` |
| `GET /api/slots?month=2026-12` | That month's slots from today on: `{ id: '2026-12-12T14:00', date, time, status, special }` |
| `GET /api/designs` | Visible designs in her order: `{ id: 3, name, image: url or null, colors }`. `id` is the public design number. |

**Admin (`/api/admin`, owner only)**

| Method and path | What it does |
|---|---|
| `GET /config` | (public) `{ googleClientId, devLogin }`, so the login page knows what to show |
| `GET /session` | `{ signedIn, email }` |
| `POST /session/google` | Body `{ credential }` (Google's ID token). Starts a session if it is her account. |
| `POST /session/dev` | Dev login. **Only exists** when `ALLOW_DEV_LOGIN=true` and not in production. |
| `DELETE /session` | Sign out |
| `GET /slots?month=2026-12` | The whole month, past days included |
| `POST /slots` | Body `{ dates: [...], times: [...], special }`. Opens every time on every date; ones that already exist are skipped. |
| `PATCH /slots/:id` | Body `{ status }` and/or `{ special }` |
| `DELETE /slots/:id` | Remove a slot |
| `GET /designs` | Every design, hidden ones too |
| `POST /designs` | Form upload: `name` + `image`. New designs go first. |
| `PATCH /designs/:id` | Body `{ name }` and/or `{ hidden }` |
| `PUT /designs/:id/image` | Form upload: a new `image` (the old photo file is deleted) |
| `PUT /designs/order` | Body `{ ids: [every design id in the new order] }` |
| `DELETE /designs/:id` | Delete the design and its photo |

Design **numbers** never change and are never reused (customers write "Design: #3 Cherry
bows" in their DM). The `Counter` model remembers the last number given out, so after
deleting #9 the next new design is #10, not #9.

## Settings (`backend/.env`)

Copy `.env.example` to `.env`. `.env` is never committed.

| Variable | What it is | If empty |
|---|---|---|
| `NODE_ENV` | `development` on your computer, `production` on the live host | development |
| `PORT` | Port to listen on | 8000 |
| `MONGODB_URI` | MongoDB connection string (e.g. from Atlas) | development: temporary database. production: **won't start** |
| `SESSION_SECRET` | Signs the login cookie. **At least 32 characters**, random. | development: a random one per start (you are signed out on restart). production: **won't start** |
| `ADMIN_EMAIL` | Her Gmail address: the **only** account allowed in | nobody can sign in with Google. production: **won't start** |
| `GOOGLE_CLIENT_ID` | The OAuth client ID from Google Cloud (not a secret) | login page says Google sign-in is not set up. production: **won't start** |
| `ALLOWED_ORIGINS` | The site's own address(es), comma separated, e.g. `https://tipntell.example.com` | development: `http://localhost:5173,http://localhost:5180`. production: **won't start** |
| `ALLOW_DEV_LOGIN` | `true` shows a Dev login button for local testing | off. `true` with `NODE_ENV=production` **won't start** |
| `TRUST_PROXY` | Number of proxies in front of the server (usually `1` on a host like Render) | none |
| `STORAGE_DRIVER` | Where photos go: `local` (`backend/uploads/`). Cloudinary comes at deploy. | `local` |

Make a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Security measures, and why each one is there

| Measure | Where | Why |
|---|---|---|
| **Google sign-in only, one allowed email** | `controllers/sessionController.js`, `services/googleVerifier.js` | No passwords to leak or guess, no sign-up route. The server checks Google's token itself (`verifyIdToken` with our client ID as the audience), requires `email_verified`, and compares the email with `ADMIN_EMAIL` (ignoring capital letters). |
| **Server-side sessions** (`express-session` + `connect-mongo`) | `app.js` | The cookie holds only a random id; the login lives in the database and can be ended by signing out. The session id is **regenerated at login** so an id planted earlier is useless. |
| **Cookie flags**: `httpOnly`, `sameSite: 'strict'`, `secure` in production, about 7 days | `app.js` | Page scripts can't read the cookie; other websites can't make the browser send it; it only travels over HTTPS on the live site. |
| **Same origin, no CORS** | `frontend/vite.config.js` proxy | The site and API share one address, so the cookie is first-party (Safari on iPhone blocks third-party cookies). No other website is allowed to call the API from a browser. |
| **Origin check on every change** | `middleware/checkOrigin.js` | Stops "cross-site request forgery": a POST/PATCH/PUT/DELETE is refused unless its `Origin` header is in `ALLOWED_ORIGINS`. |
| **Dev login can't reach production** | `config.js`, `routes/adminRoutes.js` | The route is only registered when `ALLOW_DEV_LOGIN=true` and not production, and the server refuses to start if both are set. |
| **Every photo is decoded and re-made** with `sharp` | `services/images.js` | Turns it upright, shrinks it to 1600 px, and saves a brand-new WebP with **no metadata**. Her photos are taken at home, so this is what guarantees the GPS location never reaches the public site. It can't be skipped, and a file that isn't a real picture gets a 400. |
| **Upload limits** (`multer`): 1 file, 8 MB, kept in memory | `middleware/upload.js` | Nothing unchecked is written to disk; huge uploads are refused. `sharp` also limits the pixel count. |
| **Random photo file names**, served with `nosniff` | `services/storage/diskStorage.js`, `app.js` | Names can't be guessed and say nothing about the photo; a delete can only touch files the driver made (no `../` tricks). |
| **Input checks** on every value | `services/validate.js`, controllers | Dates, times, months, statuses, names (1-60 chars) and ids are checked by hand. Each must be a plain string or true/false, so an object like `{ "$gt": "" }` can never reach a database query (NoSQL injection). Anything else gets a 400. |
| **`helmet`** | `app.js` | Safe default headers (no framing, no MIME sniffing, a strict Content Security Policy for API answers, etc.). |
| **JSON body limit 10 kB** | `app.js` | Nothing here needs more; stops oversized requests. |
| **Rate limits** (`express-rate-limit`) | `middleware/rateLimits.js` | 10 sign-in attempts per 15 minutes per IP, 600 admin requests per 15 minutes. `TRUST_PROXY` makes them see the real IP behind a host's proxy. |
| **`Cache-Control: no-store`** and `X-Robots-Tag: noindex` on admin answers | `middleware/noStore.js` | Admin data is never kept in a browser or shared cache, or listed by search engines. The admin pages also add `<meta name="robots" content="noindex">`. |
| **Short, generic errors** | `middleware/errorHandler.js` | Visitors never see stack traces. The log notes only the method, path and message, never cookies, tokens or request bodies. |
| **Unsafe settings stop the server** | `config.js` | e.g. a `SESSION_SECRET` under 32 characters, or a production server with no secret, database, admin email, client ID or allowed origins. |

`pnpm audit` (18 Nov 2026): the packages the live server uses have **no known
vulnerabilities** (`pnpm audit --prod`). Two advisories are in development-only tools:
one high (`picomatch` ReDoS, via `nodemon` and `vitest`; no fixed version exists yet) and one
moderate (`minimatch`, via `nodemon`). They don't run on the live server.

## Your own steps (later)

These need your own accounts, so they were not done for you.

**1. Google sign-in (client ID)**

1. Go to [Google Cloud Console](https://console.cloud.google.com/), create a project (e.g. "tip n tell").
2. *APIs & Services → OAuth consent screen*: choose **External**, fill in the app name and your
   email. The only scopes needed are the basic ones (email, profile), which need no review.
   While it is in *Testing*, add her Gmail under **Test users** (or press *Publish app*).
3. *APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.*
4. Under **Authorized JavaScript origins** add `http://localhost`, `http://localhost:5173`
   (and `:5180` if you use it), and later the live site's address (`https://...`).
   No redirect URIs are needed.
5. Copy the client ID (ends in `.apps.googleusercontent.com`) into `backend/.env` as
   `GOOGLE_CLIENT_ID`, and put her Gmail address in `ADMIN_EMAIL`. Restart `pnpm dev`.

**2. MongoDB Atlas (a database that keeps data)**

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas).
2. *Database Access*: add a database user with a long random password.
3. *Network Access*: allow your computer's IP; for a free host whose IP changes, allow
   `0.0.0.0/0` (the user name and password still protect it).
4. *Connect → Drivers*: copy the connection string, put the password in, and add the database
   name before the `?`, e.g. `...mongodb.net/tipntell?retryWrites=true&w=majority`.
5. Put it in `backend/.env` as `MONGODB_URI`, then run `pnpm seed` once if you want the sample
   slots and designs to start with.

**3. At deploy time**

- Photos: the free hosts wipe their disk on every deploy, so the live site needs Cloudinary.
  Create a free [Cloudinary](https://cloudinary.com/) account and keep its `CLOUDINARY_URL`
  ready; the deploy work adds the Cloudinary driver where `services/storage/index.js` says
  `TODO (deploy session)`.
- The site and API must be on **one address** (for the cookie): e.g. Express also serves the
  built frontend, or the static host forwards `/api` and `/uploads` to the API.
- On the host set `NODE_ENV=production`, `SESSION_SECRET`, `MONGODB_URI`, `ADMIN_EMAIL`,
  `GOOGLE_CLIENT_ID`, `ALLOWED_ORIGINS=https://<the site>`, `TRUST_PROXY=1`, and **not**
  `ALLOW_DEV_LOGIN`. Build the frontend with `VITE_API_URL=/api`.
- Add the live address to the Google client's Authorized JavaScript origins.
