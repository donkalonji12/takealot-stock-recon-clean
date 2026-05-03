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
