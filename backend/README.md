# tip n tell: backend (API)

The Express + MongoDB API behind the booking site. It does two jobs:

1. **Public data** for the customer site: open slots and design references.
2. **The owner's admin pages**: she signs in with her Google account and updates the
   calendar and her design photos herself, mostly from her phone.

A slot is a date, a time, a status (`open`, `pending` = on hold, `booked`) and whether it is
specially opened. Customers still send their request to her by Instagram DM; only she changes
a slot. Visitors are never asked for anything and nothing about them is stored. The **only**
personal data is what **she** types into a booked or on-hold slot (optional: a name or
Instagram name, what they booked, a short note). Only she can see it, and it is deleted 30
days after the appointment. See "Booking details (personal data)" below.

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
The dev login only works with `NODE_ENV=development` **and an empty `MONGODB_URI`** (the
temporary database); otherwise the server refuses to start and says what to change. Once you
use a real database, sign in with Google instead.

Without `frontend/.env.development` the frontend runs on sample data with no admin pages,
exactly like the GitHub Pages demo.

### Other commands

```bash
pnpm test     # backend tests (Vitest + supertest, each file gets its own temporary database)
pnpm seed     # put the sample slots and designs into the MONGODB_URI database (only if empty)
pnpm start    # run without auto-restart (what a host runs)
```

### The temporary database

If `MONGODB_URI` is empty (and `NODE_ENV` is `development` or `test`), the server starts a temporary
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
| `routes/` | Which URL goes to which controller function. `publicRoutes.js`, `adminRoutes.js`, and `siteRoutes.js` (serves the built website and its headers on the live site). |
| `controllers/` | The code for each route: read the request, check it, use the models, answer. |
| `middleware/` | Small functions that run before controllers: login check, Origin check, rate limits, photo upload, no-cache, errors. |
| `services/` | Helpers: input checks (`validate.js`), Singapore dates, photo clean-up (`images.js`), Google token check, photo storage (`storage/`: `diskStorage.js` on your computer, `cloudinaryStorage.js` on the live site). |
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
| `POST /session/dev` | Dev login. **Only exists** when `ALLOW_DEV_LOGIN=true`, not in production, with the temporary database; answers 404 unless the request comes straight from this computer. |
| `DELETE /session` | Sign out |
| `GET /slots?month=2026-12` | The whole month, past days included |
| `POST /slots` | Body `{ dates: [...], times: [...], special }`. Opens every time on every date; ones that already exist are skipped. |
| `PATCH /slots/:id` | Body `{ status }`, `{ special }` and/or `{ booking }` (details object, or `null` to clear). Details only on on-hold or booked slots; changing to `open` clears them. |
| `DELETE /slots/:id` | Remove a slot |
| `POST /slots/remove` | Body `{ ids: [...] }` (1 to 100 slot ids). Removes them and answers `{ removed: [the slots as they were, booking details included], missing }`. Ids already gone are skipped. |
| `POST /slots/restore` | Body `{ slots: [{ date, time, status, special, booking? }, ...] }` (1 to 100). The Undo button: puts removed slots back with the same status, special and booking details. Today up to 12 months ahead only; a day and time that already has a slot is skipped, never overwritten. Answers `{ created, skipped }`. |
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
| `NODE_ENV` | `development` on your computer, `production` on the live host. **Anything other than `development` or `test`** (capitals and spaces ignored), including empty or `prod`, counts as production. | **production** (all production checks) |
| `PORT` | Port to listen on | 8000 |
| `MONGODB_URI` | MongoDB connection string (e.g. from Atlas) | development: temporary database. production: **won't start** |
| `SESSION_SECRET` | Signs the login cookie. **At least 32 characters**, random. | development: a random one per start (you are signed out on restart). production: **won't start** |
| `ADMIN_EMAIL` | Her Gmail address: the **only** account allowed in | nobody can sign in with Google. production: **won't start** |
| `GOOGLE_CLIENT_ID` | The OAuth client ID from Google Cloud (not a secret) | login page says Google sign-in is not set up. production: **won't start** |
| `ALLOWED_ORIGINS` | The site's own address(es), comma separated, e.g. `https://tipntell.example.com` | development: `http://localhost:5173,http://localhost:5180`. On Render: Render's own address (`RENDER_EXTERNAL_URL`). Otherwise in production: **won't start** |
| `ALLOW_DEV_LOGIN` | `true` shows a Dev login button for local testing | off. `true` **won't start** unless `NODE_ENV` is development/test **and** `MONGODB_URI` is empty |
| `TRUST_PROXY` | Number of proxies in front of the server: `1` on Render or Railway, `2` with Cloudflare in front | development: none. production: **won't start** unless it is a whole number of 1 or more (`true` is never allowed) |
| `BOOKING_DETAILS_KEEP_DAYS` | Booking details are deleted from slots dated more than this many days ago (checked at start and daily). 1 to 365. The Policies page promises 30: change both together. | 30 |
| `STORAGE_DRIVER` | Where photos go: `local` (`backend/uploads/`) or `cloudinary` (the live site). Anything else: **won't start** | `local` (in production it starts, with a warning: a free host wipes its disk) |
| `CLOUDINARY_URL` | With `cloudinary`: `cloudinary://<api key>:<api secret>@<cloud name>` from the Cloudinary console. **Secret.** | with `cloudinary`: **won't start** |
| `SERVE_FRONTEND` | `true`: this server also serves the built website (`frontend/dist`), to try the live set-up locally. Production always does. | off (production: on) |
| `FRONTEND_DIR` | Folder of the built website | `frontend/dist`, found from the backend folder (not from where you start the server). If it has no `index.html` while the site is served: **won't start** |

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
| **Production is the default** | `config.js` | Only `NODE_ENV=development` or `test` turns production off. A missing or mistyped value (hosts don't set it for you) still gets every production check and no dev login. |
| **Dev login can't reach production** | `config.js`, `routes/adminRoutes.js`, `controllers/sessionController.js` | The route is only registered when `ALLOW_DEV_LOGIN=true` outside production. The server refuses to start if it is on in production or with a real database (`MONGODB_URI`). It answers 404 unless the request comes straight from this computer (no proxy, no `X-Forwarded-For`). |
| **Sessions are tied to the owner** | `services/adminSession.js`, `middleware/requireAdmin.js` | Each session records how it was made (`google` or `dev`). Only a Google session for the current `ADMIN_EMAIL` is accepted on the live site; changing `ADMIN_EMAIL` ends old sessions; a dev session made on a laptop never works in production, even on a shared database. Rejected sessions are deleted. |
| **Every photo is decoded and re-made** with `sharp` | `services/images.js` | Turns it upright, shrinks it to 1600 px, and saves a brand-new WebP with **no metadata**. Her photos are taken at home, so this is what guarantees the GPS location never reaches the public site. It can't be skipped, and a file that isn't a real picture gets a 400. |
| **Only the needed image readers are switched on** | `services/images.js` | All libvips loaders are blocked except the in-memory ones for JPEG, PNG, WebP, HEIF/AVIF and GIF, so SVG, TIFF, PDF and the rest are never even parsed. Pictures over 60 megapixels get a "too large" message. One photo is processed at a time with no cache, to suit a small server. |
| **Upload limits** (`multer`): 1 file, 8 MB, kept in memory | `middleware/upload.js` | Nothing unchecked is written to disk; huge uploads are refused. `sharp` also limits the pixel count. |
| **Random photo file names**, served with `nosniff` | `services/storage/diskStorage.js`, `app.js` | Names can't be guessed and say nothing about the photo; a delete can only touch files the driver made (no `../` tricks). |
| **Cloudinary photos follow the same rules** | `services/storage/cloudinaryStorage.js` | Only the cleaned photo from `processPhoto()` is uploaded (tested: WebP, no GPS, the phone's file name never sent). Each gets a random name in one folder; `remove()` ignores any name it didn't make and passes `invalidate: true`, so Cloudinary's CDN forgets a deleted photo too. |
| **Page headers that let Google sign-in work, and nothing more** | `routes/siteRoutes.js`, `app.js` | The website's pages and files get their own Content Security Policy (Google's script, frame and style allowed; otherwise scripts only from this site), `same-origin-allow-popups` for the sign-in popup, HSTS, `nosniff`, no framing and a `Permissions-Policy`. API answers keep helmet's strict defaults. `/admin` pages also get `X-Robots-Tag: noindex`. See "Headers for the site's pages" below. |
| **Input checks** on every value | `services/validate.js`, controllers | Dates, times, months, statuses, names (1-60 chars) and ids are checked by hand. Each must be a plain string or true/false, so an object like `{ "$gt": "" }` can never reach a database query (NoSQL injection). Anything else gets a 400. |
| **`helmet`** | `app.js` | Safe default headers (no framing, no MIME sniffing, a strict Content Security Policy for API answers, etc.). |
| **JSON body limit 10 kB** | `app.js` | Nothing here needs more; stops oversized requests. |
| **Rate limits** (`express-rate-limit`) | `middleware/rateLimits.js`, `routes/publicRoutes.js` | 10 sign-in attempts per 15 minutes per IP, 600 admin requests per 15 minutes, 120 public reads per minute (the health check is not limited). `TRUST_PROXY` (a number, never `true`) makes them see the real IP behind a host's proxy. |
| **60-second public cache** | `services/publicCache.js` | Months, each month's slots and the designs are remembered for a minute, so a flood of visitors costs one database read a minute (a free Atlas tier is small). Every admin change clears it, so her changes show at once. Browsers are not told to cache these answers. |
| **`Cache-Control: no-store`** and `X-Robots-Tag: noindex` on admin answers | `middleware/noStore.js` | Admin data is never kept in a browser or shared cache, or listed by search engines. The admin pages also add `<meta name="robots" content="noindex">`. |
| **Short, generic errors** | `middleware/errorHandler.js` | Visitors never see stack traces. The log notes only the method, path and message, never cookies, tokens or request bodies. For database validation errors only the kind of error is logged, because their message can quote a value (e.g. a name). |
| **Booking details stay private** | `controllers/publicController.js`, `adminSlotController.js`, `services/bookingCleanup.js` | The public slot answer is built field by field (date, time, status, special) and never includes `booking`; tests check this, including right after an admin change. Details are checked field by field (`cleanBooking` in `validate.js`), unknown fields are refused, and they are deleted 30 days after the appointment. |
| **Unsafe settings stop the server** | `config.js` | e.g. a `SESSION_SECRET` under 32 characters, or a production server with no secret, database, admin email, client ID or allowed origins. |

`pnpm audit` (18 Nov 2026, `cloudinary` included): the packages the live server uses have **no known
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
   name before the `?`, e.g. `...mongodb.net/tipntell-dev?retryWrites=true&w=majority`.
   Use **different database names** for laptops (`tipntell-dev`) and the live site (`tipntell`),
   ideally with separate database users.
5. Put it in `backend/.env` as `MONGODB_URI`, then run `pnpm seed` once if you want the sample
   slots and designs to start with.

**3. At deploy time**

Follow "Deploying to Render (free plan)" below.

## Deploying to Render (free plan)

The whole site runs as **one** Render "web service" in Singapore: Express answers `/api` and
also serves the built Vue site, so everything is on one address and the login cookie works.
Design photos go to Cloudinary. `render.yaml` (at the top of the repo) describes the service;
Render reads it, so you only type in the secrets. It holds no secrets itself, because the repo
is public.

What `render.yaml` does on every deploy:

- **Build:** turns on pnpm 12.3.4 (the `packageManager` in both `package.json` files), installs
  and builds the site with `VITE_API_URL=/api`, then installs the API's packages only (no test
  tools).
- **Start:** `cd backend && node server.js`. Render checks `/api/health` to know it is up.
- **Settings it sets for you:** `NODE_VERSION`, `NODE_ENV=production`, `TRUST_PROXY=1`,
  `STORAGE_DRIVER=cloudinary`, `VITE_API_URL=/api`, `VITE_DEMO_MODE=true` (the "Demo site"
  notice stays on) and a random `SESSION_SECRET` made by Render.
- **Settings you type in once:** `MONGODB_URI`, `ADMIN_EMAIL`, `GOOGLE_CLIENT_ID`,
  `CLOUDINARY_URL`. `ALLOW_DEV_LOGIN` is not there, and must never be added.

### Steps

1. **Push `render.yaml`.** Render reads it from GitHub, so commit and push the `version-b`
   branch first. Every later push to `version-b` deploys again, so only push what works.

2. **Cloudinary (photos).** Sign up for a free account at [cloudinary.com](https://cloudinary.com/).
   In the console, find your API keys: the page shows a *Cloud name*, an *API Key*, an
   *API Secret* (hidden until you reveal it) and a ready-made *API environment variable* that
   looks like `CLOUDINARY_URL=cloudinary://<api key>:<api secret>@<cloud name>`.
   Keep the part **after** `CLOUDINARY_URL=`, with the real secret in place of any
   `<your_api_secret>` placeholder. This is a secret: don't paste it into chats, issues or files
   in the repo.

3. **MongoDB Atlas (a separate database for the hosted site).**
   1. *Database Access → Add New Database User*: a new user just for the hosted site (e.g.
      `tipntell-live`) with an auto-generated password (letters and numbers only, so it needs
      no escaping). Give it read and write on the **`tipntell`** database only.
   2. *Network Access → Add IP Address → Allow access from anywhere* (`0.0.0.0/0`). Render's
      free plan has no fixed address to list instead; the user name and password still
      protect the database.
   3. *Connect → Drivers*: copy the connection string, put the new user's password in, and add
      **`tipntell`** before the `?`:
      `mongodb+srv://tipntell-live:<password>@<cluster>.mongodb.net/tipntell?retryWrites=true&w=majority`.
      Your laptop keeps using `tipntell-dev`, so a test on your computer never touches the
      hosted site's data.
   4. The new database starts empty: no slots and no designs. She adds them in `/admin`.

4. **Create the service on Render.**
   1. Sign up at [render.com](https://render.com/) (signing up with GitHub is easiest) and
      allow Render to read the `VeryRusky/tip-n-tell-site` repository.
   2. In the Render dashboard: **New → Blueprint**, choose the repository, give the Blueprint a
      name (e.g. `tip n tell`) and pick the branch **`version-b`**.
   3. Render lists one new web service, `tipntell` (Node, Singapore, Free), and asks for the
      four values marked `sync: false`. Type in:

      | Key | What to type |
      |---|---|
      | `MONGODB_URI` | The connection string from step 3 (database `tipntell`) |
      | `ADMIN_EMAIL` | Her Gmail address, in lower case |
      | `GOOGLE_CLIENT_ID` | The OAuth client ID (ends in `.apps.googleusercontent.com`). The one you use on your laptop is fine; it is not a secret. |
      | `CLOUDINARY_URL` | The `cloudinary://...` value from step 2 |

      Leave `SESSION_SECRET` to Render (it makes a random one).
   4. Click **Deploy Blueprint**. The first build takes a few minutes. The log should end
      with `[api] Listening on ...` and `[site] Serving the website from ...`, and must not
      show `Warning: STORAGE_DRIVER is "local"`. If the server refuses to start, the log says
      which setting to fix: fix it under the service's **Environment** tab and deploy again.
   5. The site's address is shown at the top of the service page, e.g.
      `https://tipntell.onrender.com` (Render adds a few letters if the name is taken).

5. **Google sign-in.** In Google Cloud Console, open the OAuth client
   (*APIs & Services → Credentials*) and add the Render address from step 4.5 under
   **Authorized JavaScript origins**, exactly as shown (`https://`, no slash at the end). No
   redirect URI is needed. Changes can take a few minutes to work. While the consent screen is
   in *Testing*, her Gmail must be a test user.

6. **Smoke test.** Do "After deploy, a 5-minute smoke test" in the go-live checklist below,
   using the Render address. Admin changes only work from that exact address: the server uses
   it as `ALLOWED_ORIGINS` automatically (from Render's `RENDER_EXTERNAL_URL`).

### What "sleeps after 15 minutes" means

A free Render service **sleeps** when nobody has visited for 15 minutes. The next visitor waits
about a minute while Render wakes it (Render shows a loading page), then it is fast again.
Nothing is lost: slots and booking details are in Atlas, photos in Cloudinary. Anything saved
on the server's own disk is wiped on every sleep, restart and deploy, which is why photos must
not use the `local` driver here. A free service is fine for testing and for the demo; for real
customers a paid plan is better.

### Later: paid plan, demo notice off, her own domain

- **Paid plan (no sleeping):** in `render.yaml`, change `plan: free` to a paid plan such as
  `0.5c-512mb` (Render's current list: [compute plans](https://render.com/docs/compute-plans)),
  then commit and push. Render applies the Blueprint change. Keep Cloudinary: a paid server's
  disk is still wiped on each deploy.
- **Demo notice off:** when she takes real bookings, change `VITE_DEMO_MODE` to `'false'` in
  `render.yaml`, commit and push; the next build hides the notice. Change it in `render.yaml`,
  not only in the dashboard, so the next Blueprint update doesn't put it back. Go through the
  go-live checklist first (the GitHub Pages demo never sets it, so it keeps its notice).
- **Changing a secret** (e.g. a new Cloudinary key): service → **Environment** → edit →
  save and deploy. The four typed-in values are never changed by `render.yaml`.
- **Her own domain:** add it in Render (service → Settings → Custom Domains), then set
  `ALLOWED_ORIGINS=https://<her domain>` in the Environment tab, add the domain to Google's
  Authorized JavaScript origins, and send visitors from the `onrender.com` address to it (see
  "About ALLOWED_ORIGINS").
- **New packages:** commit the updated `pnpm-lock.yaml`; the build refuses a lockfile that
  doesn't match `package.json`. If you update pnpm on your computer, change `packageManager`
  in both `package.json` files to the same version.

### Try the live set-up on your computer

```bash
cd frontend
MSYS_NO_PATHCONV=1 VITE_API_URL=/api pnpm build   # MSYS_NO_PATHCONV=1: Git Bash only
cd ../backend
SERVE_FRONTEND=true ALLOWED_ORIGINS=http://localhost:8000 pnpm dev
```

Then open `http://localhost:8000`: the site and the API come from one address, with the same
headers as the live site (except `upgrade-insecure-requests`, which is live-only).

## Go-live checklist (settings on the host)

From the security review of 18 Nov 2026. Tick every box before the site takes real bookings.

**Environment variables**
- [ ] `NODE_ENV=production`. (Anything other than `development`/`test` also counts as
      production, but write it out so it is clear.)
- [ ] `ALLOW_DEV_LOGIN`: **not set at all** on the host.
- [ ] `SESSION_SECRET`: a **new** 64-character random value made for the host only, never used
      on a laptop (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
- [ ] `MONGODB_URI`: the **live** database name (e.g. `/tipntell`), different from the one
      laptops use (e.g. `/tipntell-dev`), with its own Atlas user and a long random password.
- [ ] `ADMIN_EMAIL`: her Gmail, lower case.
- [ ] `GOOGLE_CLIENT_ID`: the live client ID. In Google Cloud, add the live `https://` address
      to *Authorized JavaScript origins*. Publish the consent screen or keep her as a test user.
- [ ] `ALLOWED_ORIGINS`: exactly the address in her browser bar (see "About ALLOWED_ORIGINS" below).
      On Render it can stay unset while the site uses its `onrender.com` address (the server
      then uses `RENDER_EXTERNAL_URL`). Set it once she has her own domain.
- [ ] `TRUST_PROXY=1` on Render or Railway (`2` if Cloudflare is added in front). **Never**
      `true`: the server refuses to start with it.
- [ ] `STORAGE_DRIVER=cloudinary` (in `render.yaml`) and `CLOUDINARY_URL` (dashboard). A free
      host's local disk is wiped on every deploy, restart and sleep. The deploy log must
      **not** show `Warning: STORAGE_DRIVER is "local" in production`.
- [ ] `VITE_DEMO_MODE`: `'true'` while testing; `'false'` in `render.yaml` once she takes real
      bookings.
- [ ] Before the first live sign-in: empty the live `sessions` collection.

**Same address, proxy and HTTPS**
- [ ] The site and `/api` are served from **one** HTTPS address. With `render.yaml` this is
      done for you: Express serves `frontend/dist` itself. (Otherwise the cookie becomes
      third-party and Safari drops it.)
- [ ] HTTPS is forced: Render redirects HTTP to HTTPS, and the pages send HSTS.
- [ ] The frontend is built with `VITE_API_URL=/api`. The GitHub Pages demo is still built
      **without** it.
- [ ] The HTML pages send the headers below ("Headers for the site's pages"); `siteRoutes.js`
      does this. After deploy, sign in once and check the browser console for CSP errors.
- [ ] The public `/api` rate limit and the 60-second cache are in place (they are, in this code).

**Atlas**
- [ ] Network access: `0.0.0.0/0` only if the host has no fixed IP. The database user can
      read and write only the live database.
- [ ] Turn on Atlas alerts (connections, operations) so a flood is noticed.

**Privacy**
- [ ] Re-read the Privacy notice on the Policies page: it must still match what the site
      stores (booking details, who sees them, deleted after `BOOKING_DETAILS_KEEP_DAYS` days).

**After deploy, a 5-minute smoke test**
- [ ] `/admin/login` shows **no** "Dev login" button, and
      `curl -X POST https://<site>/api/admin/session/dev -H "Origin: https://<site>"`
      returns **404**.
- [ ] Sign in works and the cookie in DevTools shows `Secure`, `HttpOnly`, `SameSite=Strict`.
- [ ] Sign out, then reload `/admin`: you are sent back to the login page.
- [ ] Upload a phone photo. Its address starts with `https://res.cloudinary.com/`. Download it
      from the site and check that it has no location (e.g. with an online EXIF viewer).
- [ ] Reload on `/book/time` and on `/admin/designs`: the page loads (not "Not found").
- [ ] Delete a test design: its old photo address stops working (it may take a few minutes).
- [ ] Open the browser console (F12) on the home page, a booking step, `/admin/login` and the
      designs page: no red "Content Security Policy" messages.
- [ ] `pnpm audit --prod` in `backend/` is clean.

### Headers for the site's pages

The API sends helmet's strict defaults on `/api` answers and photos. Those defaults would
**break Google sign-in** on the HTML pages (they block Google's script and its popup), so
`routes/siteRoutes.js` sends this set on the website's pages and files instead (security
review, finding M4). Checked in a browser: no CSP errors on any page.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://accounts.google.com/gsi/client;
  frame-src https://accounts.google.com/gsi/;
  connect-src 'self' https://accounts.google.com/gsi/;
  style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style;
  img-src 'self' data: blob: https://res.cloudinary.com;
  font-src 'self';
  object-src 'none'; base-uri 'self'; form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests
Cross-Origin-Opener-Policy: same-origin-allow-popups
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000
X-Content-Type-Options: nosniff
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()
```

- `'unsafe-inline'` is for **styles** only (Vue writes some inline `style="--d: 0"`
  attributes). Scripts stay strict: the build has no inline scripts and no `eval`.
- Added to M4's list: `blob:` in `img-src`, because the admin's "Add a design" preview shows the
  chosen photo from a `blob:` address before it is uploaded (it is blocked without it).
  `data:` is for Bootstrap's built-in icons. Photos from `/uploads` (your computer) are `'self'`.
- `upgrade-insecure-requests` is only sent in production: on `http://localhost` it would turn
  every request into `https://` and break the page.
- Also sent: `X-Frame-Options: DENY` (same as `frame-ancestors 'none'`) and, on `/admin`
  addresses, `X-Robots-Tag: noindex`.
- Caching: files in `assets/` (their names change with every build) are kept for a year;
  `index.html` is never cached, so a new deploy shows at once.

### Booking details (personal data)

What is held: on a booked or on-hold slot, she may note (all optional) the customer's name or
Instagram name (up to 40 characters), the service, the design (a number or "own"), add-ons,
the price, and a short note (up to 200 characters). Nothing else: unknown fields are refused,
and the admin page reminds her to keep allergy or health information in her DMs.

Who can see it: only her, signed in to the admin pages. The public `/api/slots` answer never
contains it (built field by field in `publicController.js`, checked by tests). Admin answers
are `no-store`. The values are never logged.

How long: `services/bookingCleanup.js` deletes the details from every slot dated more than
`BOOKING_DETAILS_KEEP_DAYS` (30) days ago, when the server starts and once a day. The slot
itself stays. A database backup (e.g. Atlas snapshots) may hold them a little longer.

Customers' rights (Singapore PDPA): the Policies page says what is kept, that it is deleted
30 days after the appointment, and to DM her to see, correct or delete it. She can do that
herself in the slot's details sheet ("Clear details").

### If her phone is lost (signing out every device)

A session lasts 7 days from sign-in; there is no "sign out everywhere" button. To sign out
**every** device at once, empty the `sessions` collection in the live Atlas database
(Atlas → *Browse Collections* → `sessions` → delete all documents). She then signs in again
with Google. Changing `ADMIN_EMAIL` also ends every session.

### About ALLOWED_ORIGINS

Admin changes are only accepted when the browser's `Origin` header matches **exactly**.
Behind a proxy that header still comes from her browser, so the value must be exactly what her
address bar shows: `https://`, no slash at the end, and the right `www` (or not). Best: pick one
address and redirect every other one (`www`, `*.onrender.com`) to it, then list only that one.
If the site is reachable on two addresses, admin changes only work on the listed one.

### Optional: also match her Google account id (`sub`)

The owner is matched by email. Google recommends its permanent account id (the `sub` claim)
as the real identity. For a Gmail address email is fine; but if `ADMIN_EMAIL` were ever a
non-Gmail address whose domain lapsed, someone could create a Google account with it. An
optional extra step: after her first real sign-in, log her `sub` once, store it as
`ADMIN_GOOGLE_SUB`, and require it to match too. (Not built yet.)

### Rules for the Cloudinary driver

Built in `services/storage/cloudinaryStorage.js` and tested in `tests/cloudinary.test.js`
(with a pretend Cloudinary, so the tests never contact the real service): upload
**only** the cleaned buffer from `processPhoto()` (never `req.file`); use a random `public_id`
(never the original file name); check the key's pattern before `destroy`; and pass
`invalidate: true` so a deleted photo also leaves Cloudinary's CDN. (A **hidden** design's
photo URL still loads for anyone who already has it, and browsers may keep it for a year;
**deleting** the design removes the file. The admin designs page says so.)
