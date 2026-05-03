const API_BASE_URL = 'http://localhost:3000/api';

export const getApiKey = () => '';
export const saveApiKey = () => { };
export const clearApiKey = () => { };

export const fetchBackend = async (endpoint, options = {}) => {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            },
            ...options
        });

        let data = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            throw new Error(data.error || data.message || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('Backend Connection Error:', error);

        if (
            error.name === 'TypeError' ||
            error.message?.includes('Failed to fetch') ||
            error.message?.includes('fetch')
        ) {
            throw new Error('Connection failed: Ensure backend is running on port 3000.');
        }

        throw error;
    }
};

export const apiService = {
    seller: {
        connect: async (apiKey) =>
            await fetchBackend('/seller/connect', {
                method: 'POST',
                body: JSON.stringify({ apiKey })
            }),

        getConnected: async () =>
            await fetchBackend('/seller/connected'),

        verify: async () =>
            await fetchBackend('/seller/verify'),

        disconnect: async () =>
            await fetchBackend('/seller/disconnect', {
                method: 'POST'
            })
    }
};