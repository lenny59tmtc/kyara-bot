'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const MAP_FILE = path.join(DATA_DIR, 'players.json');

let cache = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function load() {
  if (cache) return cache;
  ensureDir();
  try {
    cache = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
  } catch {
    cache = {};
  }
  return cache;
}

function save() {
  ensureDir();
  fs.writeFileSync(MAP_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

/** Map a Discord user ID to a Kyara account ID */
function setMapping(discordId, kyaraId) {
  const data = load();
  const key = String(discordId);
  if (data[key] === kyaraId) return;
  data[key] = kyaraId;
  save();
}

/** Get the Kyara account ID for a Discord user ID */
function getMapping(discordId) {
  return load()[String(discordId)] || null;
}

/** Remove a mapping */
function removeMapping(discordId) {
  const data = load();
  delete data[String(discordId)];
  save();
}

/** Get all mappings as array of { discordId, kyaraId } */
function getAllMappings() {
  const data = load();
  return Object.entries(data).map(([discordId, kyaraId]) => ({ discordId, kyaraId }));
}

module.exports = { setMapping, getMapping, removeMapping, getAllMappings };
