# Backend Codebase Snapshot

Here is the complete backend tree structure and all associated file contents based on your specifications.

## Folder Tree
```text
backend/
├── .env.example
├── package.json
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   ├── db.js
│   │   └── encryption.js
│   ├── controllers/
│   │   ├── dashboardController.js
│   │   ├── returnsController.js
│   │   └── sellerController.js
│   ├── jobs/
│   │   └── cronJobs.js
│   ├── middleware/
│   │   ├── errorMiddleware.js
│   │   └── logger.js
│   ├── routes/
│   │   ├── dashboardRoutes.js
│   │   ├── healthRoutes.js
│   │   ├── returnsRoutes.js
│   │   ├── salesRoutes.js
│   │   ├── sellerRoutes.js
│   │   └── webhookRoutes.js
│   └── services/
│       ├── syncService.js
│       └── takealotApi.js
```

<hr/>

## `package.json`
```json
{
  "name": "backend",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "dev": "node src/server.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@prisma/client": "^5.x",
    "cors": "^2.8.5",
    "dotenv": "^16.x",
    "express": "^4.18.2",
    "node-cron": "^3.0.3",
    "prisma": "^5.x"
  }
}
```

## `.env.example`
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (PostgreSQL/Supabase)
# Replace with your actual Supabase connection string.
# Ensure you use the session pooling URL (port 6543, pgbouncer) if using Supabase
DATABASE_URL="postgresql://user:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Secret Keys
# Used to symmetrically encrypt sensitive data (like Takealot API keys) before storing in DB.
ENCRYPTION_SECRET="replace-this-with-a-32-character-random-secure-string"

# Takealot Webhooks
# Optional: webhook signing secret if provided by Takealot to verify payload authenticity
WEBHOOK_SECRET="optional_webhook_signing_secret"
```

## `prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model SellerAccount {
  id                   String   @id @default(uuid())
  sellerId             Int?     @unique
  storeName            String
  // We store the Takealot API key symmetrically encrypted. 
  // It should never be exposed over the internal API.
  encryptedApiKey      String   
  encryptionIv         String   // Initialization vector for encryption
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  isActive             Boolean  @default(true)

  returns              Return[]
  sales                Sale[]
  transactions         Transaction[]
  offers               Offer[]
  syncRuns             SyncRun[]
  webhookEvents        WebhookEvent[]
}

model SyncRun {
  id              String   @id @default(uuid())
  sellerAccountId String
  sellerAccount   SellerAccount @relation(fields: [sellerAccountId], references: [id], onDelete: Cascade)
  
  moduleSynced    String   // e.g., "RETURNS", "SALES", "TRANSACTIONS"
  status          String   // e.g., "SUCCESS", "FAILED", "IN_PROGRESS"
  recordsFetched  Int      @default(0)
  errorMessage    String?
  startedAt       DateTime @default(now())
  completedAt     DateTime?
}

model Return {
  id                    String   @id @default(uuid())
  sellerAccountId       String
  sellerAccount         SellerAccount @relation(fields: [sellerAccountId], references: [id], onDelete: Cascade)
  
  // Core Takealot identifiers
  sellerReturnId        String?
  returnReferenceNumber String?
  orderId               String?
  offerId               String?
  sku                   String?
  tsin                  String?  // often referred to as tsn elsewhere, mirroring exact api key here if preferred
  productTitle          String?
  
  // Return lifecycle
  returnDate            DateTime?
  status                String?
  customerComment       String?
  returnReason          String?
  
  // Detailed metadata
  rawPayloadJson        Json?    
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Composite identification: ideally, reference number or seller return ID is unique per account
  @@unique([sellerAccountId, returnReferenceNumber])
}

model Sale {
  id                String   @id @default(uuid())
  sellerAccountId   String
  sellerAccount     SellerAccount @relation(fields: [sellerAccountId], references: [id], onDelete: Cascade)
  
  orderId           String
  orderDate         DateTime
  orderItemStatus   String
  tsn               String
  productTitle      String
  sellingPrice      Float
  
  rawTakealotData   Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([sellerAccountId, orderId, tsn]) // composite unique constraint example
}

model Transaction {
  id                String   @id @default(uuid())
  sellerAccountId   String
  sellerAccount     SellerAccount @relation(fields: [sellerAccountId], references: [id], onDelete: Cascade)
  
  transactionId     String
  transactionDate   DateTime
  description       String
  amount            Float
  type              String   // e.g., "Credit", "Debit"
  
  rawTakealotData   Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([sellerAccountId, transactionId])
}

model Offer {
  id                String   @id @default(uuid())
  sellerAccountId   String
  sellerAccount     SellerAccount @relation(fields: [sellerAccountId], references: [id], onDelete: Cascade)
  
  tsn               String
  offerId           String?
  title             String
  price             Float
  status            String
  
  rawTakealotData   Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([sellerAccountId, tsn])
}

model WebhookEvent {
  id                String   @id @default(uuid())
  sellerAccountId   String
  sellerAccount     SellerAccount @relation(fields: [sellerAccountId], references: [id], onDelete: Cascade)
  
  eventType         String   // e.g., "Sale Status Changed"
  eventId           String?
  payload           Json     // The raw webhook payload received from Takealot
  processed         Boolean  @default(false)
  
  receivedAt        DateTime @default(now())
  processedAt       DateTime?
}
```

## `src/server.js`
```javascript
// backend/src/server.js
require('dotenv').config();
const app = require('./app');
const prisma = require('./config/db');
const cronJobs = require('./jobs/cronJobs');

const PORT = process.env.PORT || 3000;

async function bootstrap() {
    try {
        // Test database connection
        await prisma.$connect();
        console.log('✅ Connected to Postgres Database via Prisma');

        // Initialize scheduled sync jobs
        cronJobs.init();
        console.log('✅ Background Sync Jobs Initialized');

        app.listen(PORT, () => {
            console.log(`🚀 Takealot Backend Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

bootstrap();
```

## `src/app.js`
```javascript
// backend/src/app.js
const express = require('express');
const cors = require('cors');
const errorMiddleware = require('./middleware/errorMiddleware');
const logger = require('./middleware/logger');

// Route Imports
const healthRoutes = require('./routes/healthRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const returnsRoutes = require('./routes/returnsRoutes');
const salesRoutes = require('./routes/salesRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Global Middleware
app.use(cors());
// Crucial: Use JSON parsing for all routes EXCEPT webhooks which usually need raw body for signature validation
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json()); 
app.use(logger);

// Base Routes
app.use('/api/health', healthRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Custom Error Handling (must be placed after all routes)
app.use(errorMiddleware);

module.exports = app;
```

## `src/routes/healthRoutes.js`
```javascript
// backend/src/routes/healthRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../config/db');

router.get('/', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ success: true, data: { status: 'healthy', db: 'connected' } });
    } catch (err) {
        res.status(503).json({ success: false, error: 'Database disconnected' });
    }
});

module.exports = router;
```

## `src/routes/dashboardRoutes.js`
```javascript
// backend/src/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// GET /api/dashboard
router.get('/', dashboardController.getDashboardSummary);

module.exports = router;
```

## `src/routes/sellerRoutes.js`
```javascript
// backend/src/routes/sellerRoutes.js
const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');

router.post('/connect', sellerController.connectAccount);
router.get('/me', sellerController.getMyAccount);

module.exports = router;
```

## `src/routes/returnsRoutes.js`
```javascript
// backend/src/routes/returnsRoutes.js
const express = require('express');
const router = express.Router();
const returnsController = require('../controllers/returnsController');

router.get('/', returnsController.getReturns);
router.get('/summary', returnsController.getSummary);
router.post('/sync', returnsController.triggerSync);

module.exports = router;
```

## `src/routes/salesRoutes.js`
```javascript
// backend/src/routes/salesRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../config/db');

router.get('/', async (req, res, next) => {
    try {
        const sales = await prisma.sale.findMany({
            orderBy: { orderDate: 'desc' },
            take: 100
        });
        res.json({ success: true, items: sales });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
```

## `src/routes/webhookRoutes.js`
```javascript
// backend/src/routes/webhookRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../config/db');

router.post('/takealot', async (req, res, next) => {
    try {
        // NOTE: req.body is a raw buffer here because of express.raw() in app.js
        const rawPayload = req.body;
        const signature = req.headers['x-takealot-signature'] || 'unknown'; // Example
        
        // TODO: Validate webhook signature using process.env.WEBHOOK_SECRET

        const parsedPayload = JSON.parse(rawPayload.toString());
        
        // Save the webhook event for async processing or audit trail
        const storedWebhook = await prisma.webhookEvent.create({
            data: {
                sellerAccountId: "DEFAULT", // TODO: lookup seller account by payload details
                eventType: parsedPayload.event_type || 'Unknown',
                eventId: parsedPayload.event_id || null,
                payload: parsedPayload,
                processed: false
            }
        });

        // Respond immediately to Takealot to prevent timeouts
        res.status(202).json({ success: true, message: 'Webhook received' });

        // TODO: Fire off async worker to process the webhook (update Sale/Offer records in DB)

    } catch (err) {
        next(err);
    }
});

module.exports = router;
```

## `src/config/db.js`
```javascript
// backend/src/config/db.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
module.exports = prisma;
```

## `src/config/encryption.js`
```javascript
// backend/src/config/encryption.js
const crypto = require('crypto');

// The secret must be exactly 32 bytes for AES-256-CBC
// In a real production app, this should throw an error if missing
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'fallback_32_byte_secret_key_12345';
const ALGORITHM = 'aes-256-cbc';

module.exports = {
    /**
     * Symmetrically encrypts a string (e.g., Takealot API key)
     */
    encrypt: (text) => {
        // Generate a random 16-byte initialization vector
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(
            ALGORITHM, 
            Buffer.from(ENCRYPTION_SECRET.padEnd(32, '0').slice(0, 32)), 
            iv
        );
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return {
            encryptedData: encrypted,
            iv: iv.toString('hex')
        };
    },

    /**
     * Decrypts the symmetrically encrypted string
     */
    decrypt: (encryptedData, iv) => {
        const decipher = crypto.createDecipheriv(
            ALGORITHM, 
            Buffer.from(ENCRYPTION_SECRET.padEnd(32, '0').slice(0, 32)), 
            Buffer.from(iv, 'hex')
        );
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }
};
```

## `src/controllers/dashboardController.js`
```javascript
// backend/src/controllers/dashboardController.js
const prisma = require('../config/db');

const getDashboardSummary = async (req, res, next) => {
    try {
        // Fast parallel querying from database locally
        const [returnsCount, salesAggregation, recentReturns] = await Promise.all([
            // Calculate open returns
            prisma.return.count({
                where: {
                    status: {
                        in: ['Pending', 'Open', 'pending', 'open']
                    }
                }
            }),
            
            // Calculate overall sales volume (Placeholder for advanced profit logic)
            prisma.sale.aggregate({
                _sum: {
                    sellingPrice: true
                }
            }),

            // Fetch a few recent returns just to check health/recency
            prisma.return.findMany({
                take: 1,
                orderBy: { createdAt: 'desc' }
            })
        ]);

        // Placeholders for external logic not yet fully migrated to DB sync
        const claimsFiledPlaceholder = 0; 
        const pendingShipmentsPlaceholder = 0;
        
        // Estimated Profit Placeholder Logic
        // In a strict production system, Net Profit = Sales - Cost of Goods - Takealot Fees - Return Deductions.
        // For now, we take a placeholder rough margin calculation if exact transaction deductions aren't loaded.
        const totalSalesRevenue = salesAggregation._sum.sellingPrice || 0;
        const estimatedNetProfit = totalSalesRevenue > 0 ? (totalSalesRevenue * 0.45) : 0; // 45% margin placeholder

        res.status(200).json({
            success: true,
            data: {
                openReturns: returnsCount,
                estimatedNetProfit: estimatedNetProfit,
                claimsFiled: claimsFiledPlaceholder,
                pendingShipments: pendingShipmentsPlaceholder,
                lastSyncedAt: recentReturns.length > 0 ? recentReturns[0].createdAt : null,
                metrics: {
                    totalRevenue: totalSalesRevenue
                }
            }
        });

    } catch (error) {
        // Resilient fallback: Do not crash, handle cleanly
        console.error("Dashboard Aggregation Error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to aggregate dashboard data",
            data: {
                openReturns: 0,
                estimatedNetProfit: 0,
                claimsFiled: 0,
                pendingShipments: 0,
                lastSyncedAt: null,
                metrics: {
                    totalRevenue: 0
                }
            }
        });
    }
};

module.exports = {
    getDashboardSummary
};
```

## `src/controllers/returnsController.js`
```javascript
// backend/src/controllers/returnsController.js
const prisma = require('../config/db');
const SyncService = require('../services/syncService');

const triggerSync = async (req, res, next) => {
    try {
        // Grab the active account logically (ideally via auth middleware later)
        const account = await prisma.sellerAccount.findFirst({
            where: { isActive: true }
        });

        if (!account) {
            return res.status(400).json({ success: false, error: "No active seller account configured" });
        }

        // Trigger sync asynchronously or await it
        // Depending on volume, this could be slow. For now, await it to report exact counts.
        const result = await SyncService.syncReturns(account.id);

        res.status(200).json({
            success: true,
            data: {
                message: "Returns sync mapped successfully",
                details: result
            }
        });
    } catch (error) {
        next(error);
    }
};

// ========================================================
// FUTURE MODULE HOOKUPS:
// - Offers (GET /api/offers, POST /api/offers/sync)
// - Pricing Automation (POST /api/pricing/rules)
// - Claims (GET /api/claims, POST /api/claims/file)
// - Shipments (GET /api/shipments)
// - Profit Reporting (GET /api/profit/summary)
// ========================================================

const getReturns = async (req, res, next) => {
    try {
        // Read directly from our resilient database cache
        const returns = await prisma.return.findMany({
            orderBy: { returnDate: 'desc' },
            take: 250 // reasonable explicit limit for frontend rendering
        });

        // Read latest sync timestamp to return to frontend
        const latestSync = await prisma.syncRun.findFirst({
            where: { moduleSynced: "RETURNS", status: "SUCCESS" },
            orderBy: { completedAt: 'desc' }
        });

        res.status(200).json({
            success: true,
            data: {
                items: returns,
                meta: { 
                    total: returns.length,
                    lastSyncedAt: latestSync ? latestSync.completedAt : null 
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

const getSummary = async (req, res, next) => {
    try {
        const returns = await prisma.return.findMany({
            select: {
                status: true,
                returnReason: true,
                sku: true,
                productTitle: true
            }
        });

        let defectiveCount = 0;
        let highRiskSkus = 0;
        const reasons = {};
        const skuCounts = {};

        returns.forEach(r => {
            const reasonLower = (r.returnReason || '').toLowerCase();
            if (reasonLower.includes('defective') || reasonLower.includes('damaged')) {
                defectiveCount++;
            }

            const reasonStr = r.returnReason || 'Unknown';
            reasons[reasonStr] = (reasons[reasonStr] || 0) + 1;

            if (r.sku) {
                skuCounts[r.sku] = (skuCounts[r.sku] || 0) + 1;
            }
        });

        // Count high risk SKUs (e.g. >= 3 returns)
        Object.values(skuCounts).forEach(count => {
            if (count >= 3) highRiskSkus++;
        });

        // Read latest sync timestamp to return to frontend
        const latestSync = await prisma.syncRun.findFirst({
            where: { moduleSynced: "RETURNS", status: "SUCCESS" },
            orderBy: { completedAt: 'desc' }
        });

        res.status(200).json({
            success: true,
            data: {
                totalReturns: returns.length,
                defectiveDamaged: defectiveCount,
                highRiskSkus: highRiskSkus,
                topReasons: reasons,
                lastSyncedAt: latestSync ? latestSync.completedAt : null
            }
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    triggerSync,
    getReturns,
    getSummary
};
```

## `src/controllers/sellerController.js`
```javascript
// backend/src/controllers/sellerController.js
const prisma = require('../config/db');
const { encrypt } = require('../config/encryption');
const TakealotApiClient = require('../services/takealotApi');

const connectAccount = async (req, res, next) => {
    try {
        const { apiKey } = req.body;

        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
            return res.status(400).json({ success: false, error: "Missing or invalid API key" });
        }

        // 1. Instantiate the reusable client utilizing the raw key provided by the user
        const client = new TakealotApiClient({ rawKey: apiKey.trim() });

        // 2. Validate against Takealot servers
        // If this throws an error (e.g. 401, timeout), it'll bubble down to the catch block and global error handler
        const profile = await client.verifyConnection();

        if (!profile || !profile.seller_id) {
            return res.status(400).json({ success: false, error: "Unrecognized platform response during connection validation" });
        }

        // 3. Encrypt the valid key
        const { encryptedData, iv } = encrypt(apiKey.trim());

        // 4. Upsert against existing seller accounts mapping to the given sellerId
        const sellerAccount = await prisma.sellerAccount.upsert({
            where: {
                sellerId: profile.seller_id
            },
            update: {
                storeName: profile.seller_name || `Store ${profile.seller_id}`,
                encryptedApiKey: encryptedData,
                encryptionIv: iv,
                isActive: true
            },
            create: {
                sellerId: profile.seller_id,
                storeName: profile.seller_name || `Store ${profile.seller_id}`,
                encryptedApiKey: encryptedData,
                encryptionIv: iv,
                isActive: true
            }
        });

        res.status(200).json({
            success: true,
            data: {
                seller_id: sellerAccount.sellerId,
                business_name: sellerAccount.storeName,
                status: sellerAccount.isActive ? 'Active' : 'Inactive',
                connected_at: sellerAccount.updatedAt
            }
        });
    } catch (error) {
        // Map common 401 scenarios to a friendly description if needed, otherwise bubble up
        if (error.statusCode === 401 || error.statusCode === 403) {
            error.message = "Invalid API Key provided. Takealot rejected the connection attempt.";
        }
        next(error);
    }
};

const getMyAccount = async (req, res, next) => {
    try {
        // Without full user JWT sessions at the moment, simply pull the first active SellerAccount
        const account = await prisma.sellerAccount.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });

        if (!account) {
            return res.status(404).json({ success: false, error: "No connected Takealot profiles found" });
        }

        // Try lookup of latest SUCCESSFUL sync run
        const latestSync = await prisma.syncRun.findFirst({
            where: {
                sellerAccountId: account.id,
                status: 'SUCCESS'
            },
            orderBy: { completedAt: 'desc' }
        });

        res.status(200).json({
            success: true,
            data: {
                seller_id: account.sellerId,
                business_name: account.storeName,
                status: account.isActive ? 'Active' : 'Inactive',
                last_successful_sync_at: latestSync ? latestSync.completedAt : null
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    connectAccount,
    getMyAccount
};
```

## `src/services/takealotApi.js`
```javascript
// backend/src/services/takealotApi.js
const { decrypt } = require('../config/encryption');

class TakealotApiClient {
    /**
     * @param {string} rawKey - Unencrypted API Key (used during initial connection test)
     * @param {string} encryptedKey - Encrypted API Key (used for standard db lookups)
     * @param {string} iv - Decryption initialization vector
     */
    constructor({ rawKey, encryptedKey, iv } = {}) {
        if (rawKey) {
            this.apiKey = rawKey;
        } else if (encryptedKey && iv) {
            this.apiKey = decrypt(encryptedKey, iv);
        } else {
            throw new Error("Missing authentication material for Takealot client");
        }
        
        this.baseURL = 'https://marketplace-api.takealot.com/v1';
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Key ${this.apiKey}`
        };
    }

    /**
     * Core universal fetcher with timeout and safe parsing
     */
    async _fetchWithTimeout(endpoint, options = {}, timeoutMs = 15000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const url = `${this.baseURL}${endpoint}`;
            const response = await fetch(url, {
                ...options,
                headers: this.getHeaders(),
                signal: controller.signal
            });

            // Handle standard HTTP errors
            if (!response.ok) {
                let errorBody = {};
                try {
                    errorBody = await response.json();
                } catch (e) {
                    // Safe fallback if Takealot returns an unparsable string
                    errorBody = { message: await response.text() };
                }

                // Format a clean error
                const err = new Error(errorBody.message || errorBody.error || `Takealot API Error: ${response.status} ${response.statusText}`);
                err.statusCode = response.status;
                throw err;
            }

            // Safe JSON parse on success
            const data = await response.json();
            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                const err = new Error(`Takealot API Request timed out after ${timeoutMs}ms`);
                err.statusCode = 504;
                throw err;
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Validates the API key by querying the /seller endpoint
     */
    async verifyConnection() {
        return await this._fetchWithTimeout('/seller');
    }

    async fetchReturns(filters = {}) {
        const urlParams = new URLSearchParams();
        if (filters.gte) urlParams.append('return_date__gte', filters.gte);
        if (filters.lte) urlParams.append('return_date__lte', filters.lte);
        if (filters.pageToken) urlParams.append('page_token', filters.pageToken);
        
        const queryString = urlParams.toString() ? `?${urlParams.toString()}` : '';
        return await this._fetchWithTimeout(`/returns${queryString}`);
    }

    async fetchSales(gteDate, lteDate) {
        // TODO: Implement pagination logic later
        return [];
    }
}

module.exports = TakealotApiClient;
```

## `src/services/syncService.js`
```javascript
// backend/src/services/syncService.js
const prisma = require('../config/db');
const TakealotApiClient = require('./takealotApi');

class SyncService {
    /**
     * Helper to prevent concurrent sync overlapping for a single module per account
     */
    static async _aquireSyncLock(sellerAccountId, moduleName) {
        // Prevent zombies by checking for jobs running less than 1 hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        const activeRun = await prisma.syncRun.findFirst({
            where: {
                sellerAccountId,
                moduleSynced: moduleName,
                status: "IN_PROGRESS",
                startedAt: { gte: oneHourAgo }
            }
        });

        if (activeRun) {
            console.log(`[SYNC LOCK] Active sync already running for ${moduleName} (Account: ${sellerAccountId})`);
            return null;
        }

        // Create the lock record
        return await prisma.syncRun.create({
            data: {
                sellerAccountId: sellerAccountId,
                moduleSynced: moduleName,
                status: "IN_PROGRESS"
            }
        });
    }

    static async syncReturns(sellerAccountId) {
        console.log(`[SYNC RUN] Starting RETURNS sync for account ${sellerAccountId}...`);
        
        let syncRun;
        try {
            const account = await prisma.sellerAccount.findUnique({
                where: { id: sellerAccountId }
            });

            if (!account) throw new Error("Seller Account not found");

            syncRun = await this._aquireSyncLock(sellerAccountId, "RETURNS");
            if (!syncRun) return { success: false, reason: "LOCKED" }; 

            const client = new TakealotApiClient({ 
                encryptedKey: account.encryptedApiKey, 
                iv: account.encryptionIv 
            });

            // Target the last 180 days by default for safety on manual/cron full-sync
            const dateGte = new Date();
            dateGte.setDate(dateGte.getDate() - 180);
            const gteStr = dateGte.toISOString().split('T')[0];
            const lteStr = new Date().toISOString().split('T')[0];

            let pageToken = null;
            let totalRecordsFetched = 0;
            let pagesProcessed = 0;

            // Handle Pagination Loop natively
            do {
                const payload = await client.fetchReturns({
                    gte: gteStr,
                    lte: lteStr,
                    pageToken: pageToken
                });
                
                const items = payload.returns || payload.items || [];
                
                if (items.length > 0) {
                    totalRecordsFetched += items.length;
                    
                    for (const item of items) {
                        const returnRefStr = (item.return_reference_number || `FALLBACK-ID-${item.order_item_id || item.return_id || Math.random()}`).toString();
                        
                        await prisma.return.upsert({
                            where: {
                                sellerAccountId_returnReferenceNumber: {
                                    sellerAccountId: account.id,
                                    returnReferenceNumber: returnRefStr
                                }
                            },
                            update: {
                                status: item.status?.toString(),
                                returnReason: (item.return_reason || item.seller_return_reason?.description || 'Unknown').toString(),
                                customerComment: item.customer_comment?.toString(),
                                rawPayloadJson: item
                            },
                            create: {
                                sellerAccountId: account.id,
                                sellerReturnId: item.seller_return_id?.toString() || item.return_id?.toString(),
                                returnReferenceNumber: returnRefStr,
                                orderId: item.order_id?.toString() || item.order_item_id?.toString(),
                                offerId: item.offer_id?.toString(),
                                sku: item.sku?.toString(),
                                tsin: item.tsin?.toString() || item.tsn?.toString(),
                                productTitle: item.title?.toString() || item.product_title?.toString() || 'Unknown Product',
                                returnDate: item.date ? new Date(item.date) : (item.return_date ? new Date(item.return_date) : new Date()),
                                status: item.status?.toString(),
                                returnReason: (item.return_reason || item.seller_return_reason?.description || 'Unknown').toString(),
                                customerComment: item.customer_comment?.toString(),
                                rawPayloadJson: item
                            }
                        });
                    }
                }
                
                pagesProcessed++;
                pageToken = payload.next_page_token || payload.continuation_token || null;
                
            } while (pageToken);

            // Mark as SUCCESS
            await prisma.syncRun.update({
                where: { id: syncRun.id },
                data: {
                    status: "SUCCESS",
                    recordsFetched: totalRecordsFetched,
                    completedAt: new Date()
                }
            });

            console.log(`[SYNC RUN] SUCCESS: RETURNS | Fetched: ${totalRecordsFetched} | Account: ${sellerAccountId}`);
            return { success: true, recordsFetched: totalRecordsFetched, pages: pagesProcessed };

        } catch (error) {
            console.error(`[SYNC RUN] FAILED: RETURNS | Error: ${error.message}`);
            if (syncRun) {
                await prisma.syncRun.update({
                    where: { id: syncRun.id },
                    data: {
                        status: "FAILED",
                        errorMessage: error.message,
                        completedAt: new Date()
                    }
                });
            }
            throw error; // Bubble up for controller handling
        }
    }

    static async syncSales(sellerAccountId) {
        console.log(`[SYNC RUN] Starting SALES sync for account ${sellerAccountId}...`);
        let syncRun = await this._aquireSyncLock(sellerAccountId, "SALES");
        if (!syncRun) return { success: false, reason: "LOCKED" };

        try {
            // TODO: Wire up TakealotApiClient.fetchSales and map DB upserts here
            const fakeSaleCountFetched = 0;
            
            await prisma.syncRun.update({
                where: { id: syncRun.id },
                data: { status: "SUCCESS", recordsFetched: fakeSaleCountFetched, completedAt: new Date() }
            });

            console.log(`[SYNC RUN] SUCCESS: SALES | Fetched: ${fakeSaleCountFetched} | Account: ${sellerAccountId}`);
            return { success: true, recordsFetched: fakeSaleCountFetched };
        } catch (error) {
            console.error(`[SYNC RUN] FAILED: SALES | Error: ${error.message}`);
            await prisma.syncRun.update({
                where: { id: syncRun.id },
                data: { status: "FAILED", errorMessage: error.message, completedAt: new Date() }
            });
            throw error;
        }
    }

    static async syncTransactions(sellerAccountId) {
        console.log(`[SYNC RUN] Starting TRANSACTIONS sync for account ${sellerAccountId}...`);
        let syncRun = await this._aquireSyncLock(sellerAccountId, "TRANSACTIONS");
        if (!syncRun) return { success: false, reason: "LOCKED" };

        try {
            // TODO: Wire up TakealotApiClient and map DB upserts here
            const fakeTxCountFetched = 0;
            
            await prisma.syncRun.update({
                where: { id: syncRun.id },
                data: { status: "SUCCESS", recordsFetched: fakeTxCountFetched, completedAt: new Date() }
            });

            console.log(`[SYNC RUN] SUCCESS: TRANSACTIONS | Fetched: ${fakeTxCountFetched} | Account: ${sellerAccountId}`);
            return { success: true, recordsFetched: fakeTxCountFetched };
        } catch (error) {
            console.error(`[SYNC RUN] FAILED: TRANSACTIONS | Error: ${error.message}`);
            await prisma.syncRun.update({
                where: { id: syncRun.id },
                data: { status: "FAILED", errorMessage: error.message, completedAt: new Date() }
            });
            throw error;
        }
    }

    /**
     * Triggers all core data pipelines for a given account sequentially.
     */
    static async syncAll(sellerAccountId) {
        console.log(`[SYNC BATCH] Running manual batch sync for account ${sellerAccountId}...`);
        
        let results = {};
        
        try { results.returns = await this.syncReturns(sellerAccountId); } catch(e) { results.returns = { success: false, error: e.message }; }
        try { results.sales = await this.syncSales(sellerAccountId); } catch(e) { results.sales = { success: false, error: e.message }; }
        try { results.transactions = await this.syncTransactions(sellerAccountId); } catch(e) { results.transactions = { success: false, error: e.message }; }

        console.log(`[SYNC BATCH] Batch completed for account ${sellerAccountId}`);
        return results;
    }
}

module.exports = SyncService;
```

## `src/jobs/cronJobs.js`
```javascript
// backend/src/jobs/cronJobs.js
const cron = require('node-cron');
const prisma = require('../config/db');
const SyncService = require('../services/syncService');

function init() {
    if (process.env.DISABLE_CRON === 'true') {
        console.log('[CRON] Scheduled jobs disabled via DISABLE_CRON env flag.');
        return;
    }

    console.log('[CRON] Initializing background sync scheduler...');

    // Helper to run a specific sync method for all active accounts without crashing
    const runForActiveAccounts = async (syncMethodName) => {
        try {
            const activeAccounts = await prisma.sellerAccount.findMany({
                where: { isActive: true }
            });

            for (const account of activeAccounts) {
                try {
                    await SyncService[syncMethodName](account.id);
                } catch (err) {
                    console.error(`[CRON] Unhandled error running ${syncMethodName} for account ${account.id}:`, err);
                }
            }
        } catch (globalErr) {
            console.error(`[CRON] Fatal error checking active accounts for ${syncMethodName}:`, globalErr);
        }
    };

    // 1. Returns Sync - Every 10 Minutes
    cron.schedule('*/10 * * * *', () => {
        console.log('[CRON TRIGGER] Executing Returns Sync...');
        runForActiveAccounts('syncReturns');
    });

    // 2. Sales Sync - Every 10 Minutes
    cron.schedule('*/10 * * * *', () => {
        console.log('[CRON TRIGGER] Executing Sales Sync...');
        runForActiveAccounts('syncSales');
    });

    // 3. Transactions Sync - Every 15 Minutes
    cron.schedule('*/15 * * * *', () => {
        console.log('[CRON TRIGGER] Executing Transactions Sync...');
        runForActiveAccounts('syncTransactions');
    });

    console.log('[CRON] Background sync scheduler successfully bound to 10m/15m intervals.');
}

module.exports = { init };
```

## `src/middleware/errorMiddleware.js`
```javascript
// backend/src/middleware/errorMiddleware.js
module.exports = (err, req, res, next) => {
    console.error('🔥 Global Error Caught:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        error: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};
```

## `src/middleware/logger.js`
```javascript
// backend/src/middleware/logger.js
module.exports = (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
};
```
