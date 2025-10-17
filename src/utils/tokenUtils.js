// src/utils/tokenUtils.js

/**
 * Formats the token usage for display.
 * @param {number | undefined} usage - The number of tokens used.
 * @param {number | undefined} quota - The total token quota.
 * @returns {string} - A formatted string like "Tokens: 50 / 4096".
 */
export const formatTokenUsage = (usage, quota) => {
  if (typeof usage === 'undefined' || typeof quota === 'undefined') {
    return 'Tokens: N/A';
  }
  return `Tokens: ${usage} / ${quota}`;
};