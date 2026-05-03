const { decrypt } = require('../config/encryption');

class TakealotApiClient {
    /**
     * @param {string} rawKey - Unencrypted API Key (used during initial connection test)
     * @param {string} encryptedKey - Encrypted API Key (used for standard db lookups)
     * @param {string} iv - Decryption initialization vector
     */
    constructor({ rawKey, encryptedKey, iv } = {}) {
        if (rawKey) {
            this.apiKey = rawKey.trim();
        } else if (encryptedKey && iv) {
            this.apiKey = decrypt(encryptedKey, iv).trim();
        } else {
            throw new Error('Missing authentication material for Takealot client');
        }

        this.baseURL = 'https://marketplace-api.takealot.com/v1';
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Key': this.apiKey
        };
    }

    maskKey(key) {
        if (!key) return 'missing';
        if (key.length <= 8) return '***';
        return `${key.slice(0, 4)}...${key.slice(-4)}`;
    }

    /**
     * Core universal fetcher with timeout and safe parsing
     */
    async _fetchWithTimeout(endpoint, options = {}, timeoutMs = 15000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const url = `${this.baseURL}${endpoint}`;

            const safeHeaders = {
                ...this.getHeaders(),
                ...(options.headers || {})
            };

            console.log('[TAKEALOT REQUEST]', {
                method: options.method || 'GET',
                endpoint,
                url,
                apiKey: this.maskKey(this.apiKey),
                headers: {
                    ...safeHeaders,
                    'X-API-Key': this.maskKey(this.apiKey)
                },
                body: options.body || null
            });

            const response = await fetch(url, {
                ...options,
                headers: safeHeaders,
                signal: controller.signal
            });

            const rawText = await response.text();
            let data;

            try {
                data = rawText ? JSON.parse(rawText) : {};
            } catch {
                data = { message: rawText };
            }

            console.log('[TAKEALOT RESPONSE]', {
                method: options.method || 'GET',
                endpoint,
                status: response.status,
                statusText: response.statusText,
                body: data
            });

            if (!response.ok) {
                const err = new Error(
                    data.message ||
                    data.error ||
                    `Takealot API Error: ${response.status} ${response.statusText}`
                );
                err.statusCode = response.status;
                err.details = data;
                throw err;
            }

            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                const err = new Error(`Takealot API request timed out after ${timeoutMs}ms`);
                err.statusCode = 504;
                throw err;
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async verifyConnection() {
        return await this._fetchWithTimeout('/seller');
    }

    async fetchReturns(filters = {}) {
        const urlParams = new URLSearchParams();

        if (filters.gte) urlParams.append('return_date__gte', String(filters.gte).split('T')[0]);
        if (filters.lte) urlParams.append('return_date__lte', String(filters.lte).split('T')[0]);
        if (filters.pageToken) urlParams.append('continuation_token', filters.pageToken);

        urlParams.append('limit', '100');

        const queryString = urlParams.toString() ? `?${urlParams.toString()}` : '';
        return await this._fetchWithTimeout(`/returns${queryString}`);
    }

    async fetchSales(pageToken = null) {
        const urlParams = new URLSearchParams();

        if (pageToken) {
            urlParams.append('continuation_token', pageToken);
        }

        const queryString = urlParams.toString() ? `?${urlParams.toString()}` : '';
        return await this._fetchWithTimeout(`/sales${queryString}`);
    }

    async fetchOffers(pageToken = null) {
        const urlParams = new URLSearchParams();

        urlParams.append('limit', '100');

        if (pageToken) {
            urlParams.append('continuation_token', pageToken);
        }

        const queryString = urlParams.toString() ? `?${urlParams.toString()}` : '';
        return await this._fetchWithTimeout(`/offers${queryString}`);
    }

    async updateOfferById(offerId, payload = {}) {
        if (!offerId) {
            throw new Error('offerId is required');
        }

        return await this._fetchWithTimeout(`/offers/${offerId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
    }
}

module.exports = TakealotApiClient;