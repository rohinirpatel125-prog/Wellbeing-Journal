# Wellbeing Journal

A private journal for tracking **sleep, mood, energy, stress and daily routines**, with trend charts and gentle
pattern comparisons. It describes *your own* patterns only and never diagnoses anything.

**Stack:** React (Vite) · Node.js + Express REST API · MongoDB (Mongoose) · express-validator · responsive CSS

## Features
- Add, edit, delete daily entries (one per date): sleep hours, mood/energy/stress (1-5), routines, notes
- Trends: 7 / 14 / 30 / 90-day averages, change vs the previous period, line chart and sleep bar chart
- Pattern comparisons, e.g. "mood on 7+ hour sleep days vs shorter nights", "days with exercise vs without" (only shown with 3+ days in each group, always worded as observations, not causes)
- Validation on both client and server, consistent JSON error responses, friendly error messages
- Responsive layout (phone to desktop) and automatic dark mode

## Project structure
```
wellbeing-journal-app/
├── server/                 Express API
│   ├── server.js           connects to MongoDB, starts the server
│   ├── app.js              middleware + routes
│   ├── models/Entry.js     Mongoose schema (with validation)
│   ├── routes/entries.js   REST endpoints
│   ├── middleware/         validate.js (express-validator), errorHandler.js
│   ├── stats.js            averages + pattern comparison logic
│   ├── seed.js             sample data (45 days)
│   ├── test.js             automated tests
│   └── .env.example        configuration template
└── client/                 React app (Vite)
    └── src/ App.jsx, api.js, components/ (EntryForm, EntryList, Trends), styles.css
```

## REST API
| Method | URL | Purpose |
|---|---|---|
| GET | `/api/health` | health check |
| GET | `/api/entries` | list entries (newest first) |
| GET | `/api/entries/stats?days=30` | averages, previous-period comparison, chart series, pattern notes |
| POST | `/api/entries` | create (201) |
| PUT | `/api/entries/:id` | update |
| DELETE | `/api/entries/:id` | delete (204) |

Errors always look like `{ "error": "ValidationError", "message": "...", "details": [{ "field": "mood", "message": "..." }] }`
with status 400 (invalid input), 404 (not found), 409 (duplicate date) or 500.

---

# How to run it in VS Code (step by step)

## Step 1 - Install the tools (one time)
1. **VS Code** - https://code.visualstudio.com
2. **Node.js LTS** (v18 or newer) - https://nodejs.org . Check in a terminal: `node -v` and `npm -v`.
3. **MongoDB** - choose ONE (see Step 3).
4. Optional VS Code extensions: *MongoDB for VS Code* (to view your data), *ES7+ React snippets*, *Thunder Client* (to test the API).

## Step 2 - Open the project
1. Unzip `wellbeing-journal-app.zip`.
2. VS Code -> **File -> Open Folder** -> choose `wellbeing-journal-app`.
3. Open the terminal: **Terminal -> New Terminal** (shortcut Ctrl + `).

## Step 3 - Set up MongoDB (choose A or B)

### Option A - MongoDB on your own computer (simplest to explain)
1. Download **MongoDB Community Server** from https://www.mongodb.com/try/download/community and install it.
   On Windows keep "Install MongoDB as a Service" ticked and also install **MongoDB Compass** (a free viewer).
2. Make sure it is running:
   - Windows: it starts automatically as a service (check *Services -> MongoDB Server*).
   - macOS (Homebrew): `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`
   - Linux: `sudo systemctl start mongod`
3. Your connection string is:
   `mongodb://127.0.0.1:27017/wellbeing_journal`
   (the database `wellbeing_journal` is created automatically the first time data is saved).

### Option B - MongoDB Atlas (free cloud database)
1. Sign up at https://www.mongodb.com/cloud/atlas -> **Create a free (M0) cluster**.
2. **Database Access** -> *Add New Database User* -> choose a username and password (avoid `@ : /` in the password; if you use them they must be URL-encoded).
3. **Network Access** -> *Add IP Address* -> *Allow access from anywhere* (`0.0.0.0/0`) for a college demo, or add your own IP.
4. **Database -> Connect -> Drivers** -> copy the connection string. Put your user, password and a database name in it:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/wellbeing_journal?retryWrites=true&w=majority`

## Step 4 - Configure and start the API (Terminal 1)
```bash
cd server
npm install
```
Create the settings file: copy `server/.env.example` to a new file named **`.env`** (in the `server` folder) and set `MONGODB_URI` to your string from Step 3. The server also checks the project folder and its parent folder for `.env` files, in that order, so an existing workspace-level `.env` can be used:
```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/wellbeing_journal
CLIENT_ORIGIN=http://localhost:5173
```
Then (optional, recommended for the demo) load sample data and start:
```bash
npm run seed      # adds 45 days of sample entries (replaces existing entries)
npm run dev       # starts the API with auto-restart
```
You should see:
```
MongoDB connected
API running at http://localhost:5000
```
Open http://localhost:5000/api/health in a browser: it should show `{"status":"ok"}`.

## Step 5 - Start the React app (Terminal 2)
Click the **+** in the VS Code terminal panel to open a second terminal:
```bash
cd client
npm install
npm run dev
```
Open **http://localhost:5173** . Both terminals must stay running.

## Step 6 - Check it works (use this as your demo script)
1. **History** tab: sample entries from the seed script appear (this proves the MongoDB connection).
2. **Trends** tab: switch 7d / 14d / 30d / 90d, read the charts and the "Patterns in your entries" box.
3. **Log** tab: try to save an empty form -> validation messages appear. Add a real entry for today -> saved.
4. Try saving a second entry for the same date -> the "already have an entry" error (409) appears.
5. **History**: edit and delete an entry.
6. Resize the browser window (or press F12 -> device toolbar) to show the phone layout.
7. Show the data in MongoDB: in Compass connect to your URI, open database `wellbeing_journal` -> collection `entries`. Or in the VS Code MongoDB extension click *Add Connection*.
8. Run the tests: in the `server` folder run `npm test`.

## Troubleshooting
| Problem | Fix |
|---|---|
| `Missing MONGODB_URI` | `.env` is missing or has no `MONGODB_URI`. The server checks `server/`, the project folder, and its parent folder. File must be named exactly `.env`. |
| `MongoDB connection failed ... ECONNREFUSED` | Local MongoDB is not running. Start the service (Step 3A). |
| `bad auth` (Atlas) | Wrong username/password in the connection string. |
| `Could not connect to any servers` (Atlas) | Your IP is not allowed: Network Access -> add IP / `0.0.0.0/0`. |
| Page shows "Cannot reach the server" | API is not running, or not on port 5000. Check Terminal 1. |
| `EADDRINUSE: port 5000` | Another app uses 5000. Change `PORT` in `.env` **and** the proxy port in `client/vite.config.js`. |
| `npm` not recognised | Reinstall Node.js and restart VS Code. |
| PowerShell blocks scripts on Windows | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or use the Command Prompt terminal. |

---

# What to submit (checklist)
1. **Source code** - the project folder zipped. **Delete `node_modules` folders first** (they are huge and re-created by `npm install`) and **do not include your `.env`** because it holds your database password. `.env.example` is enough.
2. **Short report** (1-2 pages): problem, features, tech stack and architecture, API table, how validation / error handling / responsiveness are done, how privacy and "no diagnosis" are handled, screenshots, limitations and future work. Sections above can be reused.
3. **Screenshots**: Log form with a validation error, History list, Trends page (desktop and phone width), the `entries` collection in Compass, the terminal showing "MongoDB connected", and `npm test` passing.
4. **Demo/viva**: follow the Step 6 script. Be ready to explain: why one entry per date (unique index), why client *and* server validation, what the 400/404/409/500 responses mean, how the Vite proxy avoids CORS problems in development, and why pattern notes are phrased as observations.

## Limitations / future work
Single-user (no login), so run it only on your own computer; add authentication (JWT) before any shared hosting. Possible extras: export to CSV, reminders, more metrics, weekly summaries.

## Privacy and safety note
All data stays in your own MongoDB. The app does not give medical advice. Insights compare your own entries and are not causal or diagnostic.
