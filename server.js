const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const TAKEALOT_API_BASE = 'https://marketplace-api.takealot.com/v1';

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

app.use(cors());
app.use(express.json());

const extractApiKey = (req) => {
    const rawAuth = req.headers['authorization'] || '';
    return rawAuth.replace(/^Key\s+/i, '').trim();
};

const toDateOnly = (value) => {
    if (!value) return '';
    const str = String(value);
    return str.includes('T') ? str.split('T')[0] : str;
};

const parseResponseBody = async (response) => {
    const responseText = await response.text();
    try {
        return JSON.parse(responseText);
    } catch {
        return { rawText: responseText };
    }
};

const fetchTakealot = async (endpoint, req) => {
    const apiKey = extractApiKey(req);

    if (!apiKey) {
        return {
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            body: { error: 'Missing API Key. Please provide it in the Authorization header.' }
        };
    }

    const response = await fetch(`${TAKEALOT_API_BASE}${endpoint}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
        }
    });

    const body = await parseResponseBody(response);

    return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        body
    };
};

const proxyRequest = async (req, res, endpointBase) => {
    try {
        const query = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
        const endpoint = `${endpointBase}${query}`;

        const result = await fetchTakealot(endpoint, req);

        if (!result.ok) {
            console.warn(`[API Proxy] HTTP ${result.status} from target --> ${endpoint}`);
            return res.status(result.status).json({
                error: `Takealot API Error: ${result.statusText || 'Request failed'}`,
                details: result.body
            });
        }

        return res.status(200).json(result.body);
    } catch (error) {
        console.error(`[API Proxy] Critical Error bridging to ${endpointBase}:`, error);
        return res.status(500).json({
            error: 'Internal Server Proxy Error',
            message: error.message
        });
    }
};

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Seller OS Backend Proxy' });
});

app.get('/api/seller', (req, res) => proxyRequest(req, res, '/seller'));
app.get('/api/offers', (req, res) => proxyRequest(req, res, '/offers'));
app.get('/api/sales', (req, res) => proxyRequest(req, res, '/sales'));
app.get('/api/transactions', (req, res) => proxyRequest(req, res, '/transactions'));
app.get('/api/shipments', (req, res) => proxyRequest(req, res, '/shipments'));
app.get('/api/balances', (req, res) => proxyRequest(req, res, '/balances'));

/**
 * Robust Returns Aggregator
 * Pulls all pages safely and tolerates slight payload shape differences.
 */
app.get('/api/returns', async (req, res) => {
    const apiKey = extractApiKey(req);

    if (!apiKey) {
        return res.status(401).json({
            error: 'Missing API Key. Please provide it in the Authorization header.'
        });
    }

    try {
        let gte = req.query.return_date__gte || req.query.return_date_gte;
        let lte = req.query.return_date__lte || req.query.return_date_lte;

        if (!gte) {
            const date180 = new Date();
            date180.setDate(date180.getDate() - 180);
            gte = date180.toISOString().split('T')[0];
        }

        if (!lte) {
            lte = new Date().toISOString().split('T')[0];
        }

        gte = toDateOnly(gte);
        lte = toDateOnly(lte);

        let allReturns = [];
        let continuationToken = null;
        let previousToken = null;
        let pagesFetched = 0;
        let schemaMatched = false;
        const seenIds = new Set();

        while (pagesFetched < 50) {
            const params = new URLSearchParams();
            params.append('limit', '100');
            params.append('return_date__gte', gte);
            params.append('return_date__lte', lte);

            if (continuationToken) {
                params.append('continuation_token', continuationToken);
            }

            const endpoint = `/returns?${params.toString()}`;
            console.log(`[RETURNS] Fetching page ${pagesFetched + 1}: ${endpoint}`);

            const result = await fetchTakealot(endpoint, req);

            if (!result.ok) {
                console.error('[RETURNS] Upstream error:', result.status, result.body);

                if (pagesFetched === 0) {
                    return res.status(result.status).json({
                        error: `Takealot API Error: ${result.statusText || 'Request failed'}`,
                        details: result.body
                    });
                }

                break;
            }

            const data = result.body;

            let chunk = [];
            if (Array.isArray(data.returns)) {
                chunk = data.returns;
                schemaMatched = true;
            } else if (Array.isArray(data.items)) {
                chunk = data.items;
                schemaMatched = true;
            } else if (Array.isArray(data.results)) {
                chunk = data.results;
                schemaMatched = true;
            } else if (Array.isArray(data)) {
                chunk = data;
                schemaMatched = true;
            }

            const uniqueChunk = [];
            for (const item of chunk) {
                const uniqueId =
                    item?.return_reference_number ||
                    item?.seller_return_id ||
                    item?.id ||
                    JSON.stringify(item);

                if (!seenIds.has(uniqueId)) {
                    seenIds.add(uniqueId);
                    uniqueChunk.push(item);
                }
            }

            allReturns = [...allReturns, ...uniqueChunk];
            pagesFetched++;

            previousToken = continuationToken;
            continuationToken =
                data.continuation_token ||
                data.next_page_token ||
                null;

            if (!continuationToken) break;
            if (continuationToken === previousToken) break;
            if (chunk.length === 0) break;
        }

        console.log(`[RETURNS] Completed. pages=${pagesFetched}, total=${allReturns.length}`);

        return res.status(200).json({
            returns: allReturns,
            continuation_token: null,
            meta: {
                total: allReturns.length,
                pages: pagesFetched,
                schemaMatched,
                dateRange: { gte, lte }
            }
        });
    } catch (error) {
        console.error('[RETURNS] Aggregation crash:', error);
        return res.status(500).json({
            error: 'Internal Server Proxy Error while aggregating returns',
            message: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`🚀 Seller OS Proxy Server Active`);
    console.log(`Listening on http://localhost:${PORT}`);
    console.log(`Healthcheck: http://localhost:${PORT}/health`);
    console.log(`========================================\n`);
});