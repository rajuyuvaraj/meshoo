/**
 * Security & Hashing Utilities for Varanasi Hub Console
 */

const AUTH_SALT = 'vns_hub_secure_salt_2026';

// Pre-computed salted SHA-256 hash for manager 'vaibhav' with password 'vaibhav@kan'
export const SECURE_MANAGER_CREDENTIALS = {
  usernameHash: 'e04d5b97f354dc19bc8ccff0171a9dae7b3e5337069b650c90a436f58626e402', // sha256('vaibhav' + AUTH_SALT)
  passwordHash: 'd60ab73766341bdab1f40ade3dfc02045aafe7856182a57b72b962eec70fd4f1', // sha256('vaibhav@kan' + AUTH_SALT)
  displayName: 'Vaibhav',
  role: 'Hub Manager',
};

/**
 * Compute SHA-256 hash using Web Crypto API
 * @param {string} input 
 * @param {string} salt 
 * @returns {Promise<string>} Hex-encoded hash
 */
export async function hashString(input, salt = AUTH_SALT) {
  const enc = new TextEncoder();
  const data = enc.encode(input + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant time comparison to prevent timing attacks
 */
export function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
