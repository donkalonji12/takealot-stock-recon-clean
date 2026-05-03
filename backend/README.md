# Takealot Seller OS - Backend

This folder contains the production-ready Node.js & Express backend bridging local React clients with the Takealot API.

## Core Features
* **PostgreSQL / Prisma ORM**: Relational schema separating Seller profiles, localized caching of Returns, Sales, Transactions, and generic event webhook logging.
* **Autonomous Cron Jobs**: Scheduled loops (`node-cron`) automatically keep your local cache perfectly synchronized with Takealot every 10-15 minutes, ensuring your frontend never waits on external API lag.
* **Secure Token Handling**: Raw Takealot keys are cleanly validated via `/seller`, then symmetrically encrypted via AES-256-CBC prior to Database injection.
* **Webhooks Ready**: Standard raw-byte payload capture routing stands ready for signature validation.

## Initial Setup

1. **Dependencies**
   Inside the `backend/` directory, ensure everything is fully installed:
   ```bash
   npm install
   ```

2. **Environment Variables**
   Duplicate `.env.example` directly into `.env`:
   ```bash
   cp .env.example .env
   ```
   **Require `.env` strings:**
   * `DATABASE_URL`: Your Supabase or local postgres url string.
   * `ENCRYPTION_SECRET`: A secure 32-character AES cipher secret (e.g. `fallback_32_byte_secret_key_12345` is used currently in dev code if absent, but you should explicitly set this in production).
   * `DISABLE_CRON`: Set to `"true"` if you want to test routing without triggering 10 minute background data updates.

3. **Database Migration**
   Execute the Prisma mapping. Assuming a fresh remote database, run:
   ```bash
   npx prisma db push
   # Alternatively `npx prisma migrate dev`
   ```
   This immediately guarantees the Node client matches the backend schema.

4. **Starting the Server**
   ```bash
   npm run dev
   ```
   *Express automatically secures port 3000.*

---

## Connecting the Frontend

Your `src/pages` React interface can now be wholly redirected from external Takealot fetches.

Inside your React components (or `api.js` frontend config):
1. **Connect Account Page**: Make a `POST` to `http://localhost:3000/api/sellers/connect` matching `{ apiKey: "your-raw-string" }`.
2. **Dashboard**: Instead of parallel mapping across Returns/Sales, fetch `GET http://localhost:3000/api/dashboard`
3. **Returns Page**: Map data rows via `GET http://localhost:3000/api/returns` and pull quick metrics via `GET http://localhost:3000/api/returns/summary`.

*(Note: Ensure your Vite dev-server URL is whitelisted by your Express CORS defaults, which currently accepts all standard local hosts).*
