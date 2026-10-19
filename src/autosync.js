'use strict';

const { getProfile, mapLimit } = require('./kyara');
const store = require('./store');

const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 min
let statsCache = { at: 0, data: [] };
let syncing = false;

async function syncAll() {
  if (syncing) return;
  syncing = true;

  try {
    const mappings = store.getAllMappings();
    if (mappings.length === 0) {
      statsCache = { at: Date.now(), data: [] };
      return;
    }

    const results = await mapLimit(mappings, 5, async ({ kyaraId }) => {
      try {
        const profile = await getProfile(kyaraId, true);
        if (!profile || !profile.pseudo) return null;

        return {
          id: profile.id,
          pseudo: profile.pseudo,
          avatar: profile.avatar,
          owned: profile.owned || 0,
          mythics: profile.mythics || 0,
          boostersOpened: profile.boostersOpened || 0,
          ratio:
            profile.mythics > 0 ? profile.boostersOpened / profile.mythics : Infinity,
        };
      } catch {
        return null;
      }
    });

    const data = results
      .filter(Boolean)
      .sort((a, b) => {
        if (a.ratio !== b.ratio) return a.ratio - b.ratio;
        if (a.mythics !== b.mythics) return b.mythics - a.mythics;
        return a.pseudo.localeCompare(b.pseudo);
      });

    statsCache = { at: Date.now(), data };
    console.log(`[sync] ${data.length} joueurs synchronisés.`);
  } catch (err) {
    console.error('[sync] error:', err);
  } finally {
    syncing = false;
  }
}

function getSyncedStats() {
  return statsCache;
}

function startAutoSync() {
  console.log(`[sync] Auto-sync démarré (toutes les ${SYNC_INTERVAL_MS / 60000} min).`);
  syncAll();
  setInterval(syncAll, SYNC_INTERVAL_MS);
}

module.exports = { syncAll, getSyncedStats, startAutoSync };
