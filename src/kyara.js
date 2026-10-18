'use strict';

const BASE_URL = 'https://kyara.games/api';
const USER_AGENT = 'KyaraSuceurBot/1.0 (Discord bot; +https://kyara.games)';
const SEARCH_TTL_MS = 15 * 60 * 1000;
const PROFILE_TTL_MS = 15 * 60 * 1000;
const CONCURRENCY = 5;
const DELAY_BETWEEN_MS = 150;

const searchCache = new Map();
const profileCache = new Map();

function cacheGet(map, key, ttl) {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > ttl) {
    map.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(map, key, value) {
  map.set(key, { value, at: Date.now() });
}

async function fetchJson(path, { retries = 2 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
      });
      if (!res.ok) {
        const err = new Error(`Kyara API ${res.status} on ${path}`);
        err.status = res.status;
        throw err;
      }
      return await res.json();
    } catch (err) {
      lastError = err;
      if (err.status && err.status >= 400 && err.status < 500 && err.status !== 429) {
        throw err;
      }
      if (attempt < retries) {
        await sleep(500 * (attempt + 1));
      }
    }
  }
  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract the Discord user ID from a Kyara avatar URL.
 * Format: https://cdn.discordapp.com/avatars/{discordUserId}/{hash}.webp?size=128
 */
function extractDiscordId(avatarUrl) {
  if (!avatarUrl) return null;
  const match = avatarUrl.match(/cdn\.discordapp\.com\/avatars\/(\d+)\//);
  return match ? match[1] : null;
}

/**
 * Search Kyara by a pseudo query. Returns ALL found players (fuzzy).
 */
async function searchRaw(query) {
  const key = query.trim().toLowerCase();
  if (!key) return [];

  const cacheKey = `raw:${key}`;
  const cached = cacheGet(searchCache, cacheKey, SEARCH_TTL_MS);
  if (cached !== null) return cached;

  const data = await fetchJson(
    `/leaderboard/ladder?by=collection&q=${encodeURIComponent(query.trim())}`
  );
  const found = Array.isArray(data?.found) ? data.found : [];
  cacheSet(searchCache, cacheKey, found);
  return found;
}

/**
 * Search a Kyara player by pseudo.
 * Strategy:
 * 1. Search by query
 * 2. First try Discord ID match via avatar (most reliable)
 * 3. Fall back to exact pseudo match (case-insensitive)
 */
async function searchPlayer(query, discordId = null) {
  const results = await searchRaw(query);
  if (results.length === 0) return null;

  // 1. Discord ID match via avatar URL (bulletproof)
  if (discordId) {
    const byId = results.find((p) => extractDiscordId(p.avatar) === discordId);
    if (byId) return byId;
  }

  // 2. Exact pseudo match (case-insensitive)
  const key = query.trim().toLowerCase();
  const byName = results.find((p) => (p.pseudo || '').toLowerCase() === key);
  if (byName) return byName;

  return null;
}

/**
 * Fetch a Kyara player profile by UUID. Returns profile object or null.
 */
async function getProfile(id, force = false) {
  const key = String(id);
  if (!force) {
    const cached = cacheGet(profileCache, key, PROFILE_TTL_MS);
    if (cached !== null) return cached;
  }

  try {
    const data = await fetchJson(`/users/${encodeURIComponent(id)}`);
    cacheSet(profileCache, key, data);
    return data;
  } catch (err) {
    if (err.status === 404 || err.status === 400) {
      cacheSet(profileCache, key, null);
      return null;
    }
    throw err;
  }
}

/**
 * Run async tasks over items with limited concurrency.
 */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
      if (index < items.length) await sleep(DELAY_BETWEEN_MS);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Build full ranking entry from a Kyara player object.
 */
async function buildEntry(player) {
  if (!player || !player.id) return null;
  if (!player.mythics || player.mythics <= 0) return null;

  const profile = await getProfile(player.id);
  const boostersOpened = profile?.boostersOpened;
  if (typeof boostersOpened !== 'number' || boostersOpened <= 0) return null;

  const ratio = boostersOpened / player.mythics;
  return {
    pseudo: player.pseudo,
    id: player.id,
    avatar: player.avatar,
    discordId: extractDiscordId(player.avatar),
    mythics: player.mythics,
    boostersOpened,
    ratio,
  };
}

module.exports = {
  searchPlayer,
  searchRaw,
  getProfile,
  buildEntry,
  extractDiscordId,
  mapLimit,
};
