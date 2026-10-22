import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HISTORY_DIR = process.env.CLIMASFLOOD_DATA_DIR
  ? path.resolve(process.env.CLIMASFLOOD_DATA_DIR)
  : fileURLToPath(new URL('../data/ingestion/', import.meta.url));
const KEEP_DAYS = 30;
let writeQueue = Promise.resolve();

export function makeIngestionRecord({ sourceId, entityId, dataType, retrievedAtUtc, validAt = null, sourceReportedAtLocal = null, sourceTimeRaw = null, values, units, sourceUrl, quality }) {
  return {
    schemaVersion: 1,
    sourceId,
    entityId,
    dataType,
    retrievedAtUtc,
    validAt,
    sourceReportedAtLocal,
    sourceTimeRaw,
    values,
    units,
    sourceUrl,
    quality
  };
}

export function validateNonNegativeMetrics(metrics, bounds = {}) {
  const issues = [];
  const values = {};
  for (const [key, raw] of Object.entries(metrics)) {
    if (raw == null || raw === '') continue;
    const value = Number(raw);
    const [min = 0, max = Infinity] = bounds[key] || [];
    if (!Number.isFinite(value) || value < min || value > max) issues.push(`${key} fuera de rango`);
    else values[key] = value;
  }
  const status = issues.length ? 'REVIEW' : !Object.keys(values).length ? 'REVIEW' : Object.keys(values).length < Object.keys(metrics).length ? 'PARTIAL' : 'PASS';
  if (!Object.keys(values).length) issues.push('La respuesta no contiene valores medibles');
  return { values, quality: { status, issues } };
}

export function appendIngestionRecord(record) {
  writeQueue = writeQueue.then(async () => {
    const day = record.retrievedAtUtc.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Estampa de ingesta inválida');
    const directory = HISTORY_DIR;
    await fs.mkdir(directory, { recursive: true });
    const filename = path.join(directory, `${day}.ndjson`);
    await fs.appendFile(filename, `${JSON.stringify(record)}\n`, { encoding: 'utf8', flag: 'a' });
    const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (!entry.isFile() || !/^\d{4}-\d{2}-\d{2}\.ndjson$/.test(entry.name)) continue;
      if (Date.parse(entry.name.slice(0, 10)) < cutoff) await fs.unlink(path.join(directory, entry.name));
    }
  });
  return writeQueue;
}

export async function readIngestionRecords({ sourceId, entityId, days = 7, limit = 5000 }) {
  const directory = HISTORY_DIR;
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const files = entries
    .filter((entry) => entry.isFile() && /^\d{4}-\d{2}-\d{2}\.ndjson$/.test(entry.name))
    .filter((entry) => Date.parse(entry.name.slice(0, 10)) >= cutoff)
    .sort((a, b) => a.name.localeCompare(b.name));
  const records = [];
  for (const file of files) {
    const lines = (await fs.readFile(path.join(directory, file.name), 'utf8')).split('\n');
    for (const line of lines) {
      if (!line) continue;
      const record = JSON.parse(line);
      if (record.sourceId === sourceId && (!entityId || record.entityId === entityId)) records.push(record);
    }
  }
  return records.slice(-limit);
}
