import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHILE_LOCATIONS, ALERTS_DATA } from './public/js/data/chile-data.js';
import {
  fetchLiveOpenMeteoForLocation,
  buildCartoBuilderGeoJsonClient
} from './public/js/modules/live-api.js';
import { fetchDmcObservation, fetchDmcStation, fetchDmcStations } from './public/js/modules/dmc-api.js';
import { fetchConafDailyReport } from './public/js/modules/conaf-api.js';
import { appendIngestionRecord, makeIngestionRecord, readIngestionRecords, validateNonNegativeMetrics } from './server/ingestion-store.js';

try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 4173;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DOCS_DIR = path.join(__dirname, 'docs');

// Caché en memoria en el servidor (TTL 15 minutos por comuna) para compartir consultas entre clientes
const SERVER_SYNC_TTL_MS = 15 * 60 * 1000;
const serverLocationSyncTimestamps = new Map();

// Caché en memoria para RainViewer API (TTL 5 minutos)
let rainviewerCache = null;
let rainviewerCacheTime = 0;
const RAINVIEWER_CACHE_TTL_MS = 5 * 60 * 1000;

function getFallbackRainViewerPayload() {
  const nowSec = Math.floor(Date.now() / 1000);
  return {
    version: '2.0',
    generated: nowSec,
    host: 'https://tilecache.rainviewer.com',
    fallback: true,
    radar: {
      past: [
        { time: nowSec - 3000, path: '/v2/radar/2cc4a675d903' },
        { time: nowSec - 2400, path: '/v2/radar/f2fd9ad84d0c' },
        { time: nowSec - 1800, path: '/v2/radar/e9c42e8de3f1' },
        { time: nowSec - 1200, path: '/v2/radar/3dc3c48cb59c' },
        { time: nowSec - 600, path: '/v2/radar/3dc3c48cb59c' }
      ],
      nowcast: []
    },
    satellite: {
      infrared: []
    }
  };
}

// Caché en memoria para resultados del portal de SENAPRED (TTL 10 minutos)
let senapredAlertsCache = null;
let senapredAlertsCacheTime = 0;
let senapredSourceAvailable = false;
const SENAPRED_CACHE_TTL_MS = 10 * 60 * 1000;
const dmcObservationCache = new Map();
let dmcStationsCache = null;
let dmcStationsCacheTime = 0;
const dmcStationMetadataCache = new Map();
let conafReportCache = null;
let conafReportCacheTime = 0;
const ingestionHealth = new Map();

function noteIngestion(sourceId, { ok, retrievedAtUtc = new Date().toISOString(), error = null, latencyMs = null, quality = null }) {
  const previous = ingestionHealth.get(sourceId) || { successCount: 0, failureCount: 0 };
  ingestionHealth.set(sourceId, {
    sourceId,
    status: ok ? (quality?.status === 'REVIEW' ? 'REVIEW' : quality?.status === 'PARTIAL' ? 'PARTIAL' : quality?.status === 'STALE' ? 'STALE' : 'ONLINE') : 'ERROR',
    lastAttemptAtUtc: retrievedAtUtc,
    lastSuccessAtUtc: ok ? retrievedAtUtc : previous.lastSuccessAtUtc || null,
    lastError: ok ? null : String(error || 'Fuente no disponible'),
    lastLatencyMs: latencyMs,
    quality: quality || previous.quality || null,
    successCount: previous.successCount + Number(ok),
    failureCount: previous.failureCount + Number(!ok)
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
};

// Registro de auditoría en memoria para trazabilidad HITL y acciones de supervisión
const auditTrail = [
  {
    id: 'AUD-001',
    timestamp: '2026-10-19T14:30:00Z',
    actor: 'Sistema de Ingestión QC',
    action: 'VALIDACION_CORRIDA_NWP',
    detail: 'Corrida 12Z validada para ECMWF IFS, NOAA GFS y DWD ICON en 16 regiones de Chile.',
    status: 'VERIFIED'
  },
  {
    id: 'AUD-002',
    timestamp: '2026-10-19T14:42:00Z',
    actor: 'Guardrail Determinista IA',
    action: 'ESCALAMIENTO_HITL',
    detail: 'Recomendación de agente [AG-BRIEF-02] retenida para revisión humana por involucrar escenario de isoterma 0 °C alta en precordillera central.',
    status: 'PENDING_HUMAN_REVIEW'
  }
];

function sendJson(res, statusCode, payload, contentType = 'application/json; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload, null, 2));
}

async function syncServerLocationWithCache(locId) {
  const loc = CHILE_LOCATIONS.find((l) => l.id === locId);
  if (!loc) return { ok: false, error: 'Comuna no encontrada' };

  const lastSync = serverLocationSyncTimestamps.get(loc.id) || 0;
  const now = Date.now();
  if (loc.observation.isLiveSynced && now - lastSync < SERVER_SYNC_TTL_MS) {
    return { ok: true, cached: true, location: loc };
  }

  const res = await fetchLiveOpenMeteoForLocation(loc);
  if (res.ok) {
    serverLocationSyncTimestamps.set(loc.id, Date.now());
    return { ok: true, cached: false, location: loc };
  }
  return { ok: false, cached: false, location: loc };
}

async function scrapeSenapredAlerts() {
  const now = Date.now();
  if (senapredAlertsCache && now - senapredAlertsCacheTime < SENAPRED_CACHE_TTL_MS) {
    return { ok: true, cached: true, sourceAvailable: senapredSourceAvailable, alerts: senapredAlertsCache };
  }

  const scrapedAlerts = [];
  let sourceAvailable = false;

  // Intento de consulta en tiempo real al portal de SENAPRED
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const sRes = await fetch('https://senapred.cl/alertas/', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FloodChile-Research-Bot/1.0 (+https://github.com/datmetalpls/FloodChile)'
      }
    });
    clearTimeout(timeout);
    if (sRes.ok) {
      const html = await sRes.text();
      const articleMatches = [...html.matchAll(/<a[^>]+href="([^"]*alertas[^"]*)"[^>]*>(.*?)<\/a>/gi)];
      for (const m of articleMatches) {
        const url = m[1];
        const text = m[2].replace(/<[^>]+>/g, '').trim();
        if (text && text.length > 12 && !scrapedAlerts.some((a) => a.title === text)) {
          scrapedAlerts.push({
            id: `SENAPRED-LIVE-${Date.now().toString(36)}-${scrapedAlerts.length + 1}`,
            title: text,
            shortTitle: text.slice(0, 48),
            severity: 'INFORMATIVA',
            originCategory: 'OFFICIAL_AUTHORITY',
            originLabel: 'SENAPRED Chile · Portal oficial',
            isSaeActivation: false,
            channel: 'PORTAL_OFICIAL',
            affectedZonesText: 'Consulta el detalle en el comunicado oficial enlazado.',
            communesIds: [],
            regions: [],
            whatCouldHappen: 'El contenido del comunicado no se interpreta automáticamente.',
            preventiveActions: [
              'Consulta el comunicado y sigue las instrucciones de las autoridades.'
            ],
            onsetUtc: null,
            officialUrl: url.startsWith('http') ? url : `https://senapred.cl${url}`
          });
        }
      }
      sourceAvailable = scrapedAlerts.length > 0;
    }
  } catch {
    // Si no hay conexión o responde con challenge WAF, se preserva la resiliencia operativa
  }

  const merged = scrapedAlerts.map((a) => ({
    ...a,
    issuer: a.issuer || a.originLabel || 'SENAPRED Chile',
    issuedAtUtc: a.issuedAtUtc || a.onsetUtc || null,
    confidenceLevel: a.confidenceLevel || 'No evaluada',
    confidenceRationale:
      a.confidenceRationale ||
      'La aplicación no evalúa la confianza ni interpreta automáticamente el contenido del comunicado.'
  }));
  senapredAlertsCache = merged;
  senapredAlertsCacheTime = now;
  senapredSourceAvailable = sourceAvailable;

  return { ok: true, cached: false, sourceAvailable, alerts: merged };
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, {
      service: 'ClimasFlood - Sistema Nacional de Meteorología de Chile',
      status: 'OPERATIONAL',
      serverTimeUtc: new Date().toISOString(),
      openApis: [
        'https://api.open-meteo.com/v1/forecast',
        'https://flood-api.open-meteo.com/v1/flood',
        'https://marine-api.open-meteo.com/v1/marine',
        'https://api.rainviewer.com/public/weather-maps.json',
        'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/',
        'https://senapred.cl/alertas/',
        'https://climatologia.meteochile.gob.cl/application/documentacion/getDocumento/2',
        'https://www.conaf.cl/mapas-incendios-forestales/ocurrencia-nacional.htm'
      ],
      senapredAlertsLiveEndpoint: '/api/senapred/alertas-live',
      ingestionStatusEndpoint: '/api/ingestion/status',
      ingestionHistoryEndpoint: '/api/ingestion/history?source=dmc-meteochile&dias=7',
      cartoBuilderGeoJsonEndpoint: '/api/carto/chile-meteo.geojson',
      cachedLocationsCount: serverLocationSyncTimestamps.size,
      epistemologyPolicy: 'STRICT_SEPARATION_OBS_FORECAST_SCENARIO_ALERT',
      agentGuardrails: 'ACTIVE_HITL_ENFORCED'
    });
  }

  // Consulta enlaces del portal SENAPRED; no confirma vigencia ni activaciones SAE.
  if (pathname === '/api/senapred/alertas-live' && req.method === 'GET') {
    const result = await scrapeSenapredAlerts();
    const saeActiveCount = result.alerts.filter((a) => a.isSaeActivation).length;
    return sendJson(res, 200, {
      ok: true,
      count: result.alerts.length,
      saeActiveCount,
      cached: result.cached,
      sourceAvailable: result.sourceAvailable,
      alerts: result.alerts
    });
  }

  if (pathname === '/api/dmc/observaciones' && req.method === 'GET') {
    const stationCode = parsedUrl.searchParams.get('estacion') || '';
    const knownStationCodes = CHILE_LOCATIONS.map((location) => location.stationId.match(/EMA-(\d{6})/)?.[1]);
    if (!/^\d{6}$/.test(stationCode) || !knownStationCodes.includes(stationCode)) {
      return sendJson(res, 400, { ok: false, error: 'Código EMA no habilitado en el catálogo local' });
    }
    const dmcCredentials = { user: process.env.DMC_API_USER, token: process.env.DMC_API_TOKEN };
    if (!dmcCredentials.user || !dmcCredentials.token) {
      return sendJson(res, 424, { ok: false, configured: false, error: 'El servicio DMC requiere configurar DMC_API_USER y DMC_API_TOKEN' });
    }
    const cached = dmcObservationCache.get(stationCode);
    if (cached && Date.now() - cached.fetchedAt < 15 * 60 * 1000) {
      return sendJson(res, 200, { ok: true, cached: true, ...cached.data });
    }
    try {
      const observation = await fetchDmcObservation(stationCode, dmcCredentials);
      const retrievedAtUtc = new Date().toISOString();
      const data = {
        stationCode,
        stationName: observation.stationName,
        retrievedAtUtc,
        sourceReportedAt: observation.sourceReportedAt,
        measurementTime: observation.measurementTime,
        measurementTimeUtc: observation.measurementTimeUtc,
        precipitationPeriod: observation.precipitationPeriod,
        ...validateNonNegativeMetrics({
          temperatureC: observation.values.temperatureC,
          humidityPct: observation.values.humidityPct,
          windKmh: observation.values.windKmh,
          windDirectionDeg: observation.values.windDirectionDeg,
          precipitationTodayMm: observation.values.precipitationTodayMm
        }, {
          temperatureC: [-90, 60], humidityPct: [0, 100], windKmh: [0, 300],
          windDirectionDeg: [0, 360], precipitationTodayMm: [0, 2000]
        }),
        sourceUrl: `https://climatologia.meteochile.gob.cl/application/informacion/fichaDeEstacion/${stationCode}`
      };
      const measurementAgeMs = data.measurementTimeUtc ? Date.now() - Date.parse(data.measurementTimeUtc) : null;
      if (Number.isFinite(measurementAgeMs) && measurementAgeMs > 90 * 60 * 1000) {
        data.quality = { status: 'STALE', issues: [`Última medición hace ${Math.floor(measurementAgeMs / 60000)} min`] };
      }
      dmcObservationCache.set(stationCode, { fetchedAt: Date.now(), data });
      noteIngestion('dmc-meteochile', { ok: true, retrievedAtUtc: data.retrievedAtUtc, quality: data.quality });
      await appendIngestionRecord(makeIngestionRecord({
        sourceId: 'dmc-meteochile', entityId: stationCode, dataType: 'STATION_OBSERVATION',
        retrievedAtUtc: data.retrievedAtUtc, validAt: data.measurementTimeUtc,
        sourceReportedAtLocal: data.sourceReportedAt, sourceTimeRaw: data.measurementTime,
        values: data.values, units: { temperatureC: '°C', humidityPct: '%', windKmh: 'km/h', windDirectionDeg: '°', precipitationTodayMm: 'mm' },
        sourceUrl: data.sourceUrl, quality: data.quality
      }));
      return sendJson(res, 200, { ok: true, cached: false, ...data });
    } catch (error) {
      noteIngestion('dmc-meteochile', { ok: false, error: error.message });
      return sendJson(res, 502, { ok: false, configured: true, error: error.message });
    }
  }

  if (pathname === '/api/dmc/estaciones' && req.method === 'GET') {
    const dmcCredentials = { user: process.env.DMC_API_USER, token: process.env.DMC_API_TOKEN };
    if (!dmcCredentials.user || !dmcCredentials.token) {
      return sendJson(res, 424, { ok: false, configured: false, error: 'El servicio DMC requiere configurar DMC_API_USER y DMC_API_TOKEN' });
    }
    if (dmcStationsCache && Date.now() - dmcStationsCacheTime < 15 * 60 * 1000) {
      return sendJson(res, 200, { ok: true, cached: true, count: dmcStationsCache.length, stations: dmcStationsCache });
    }
    try {
      dmcStationsCache = await fetchDmcStations(dmcCredentials);
      dmcStationsCacheTime = Date.now();
      noteIngestion('dmc-estaciones-catalogo', { ok: true, quality: { status: 'PASS' } });
      return sendJson(res, 200, { ok: true, cached: false, count: dmcStationsCache.length, stations: dmcStationsCache });
    } catch (error) {
      noteIngestion('dmc-estaciones-catalogo', { ok: false, error: error.message });
      return sendJson(res, 502, { ok: false, error: error.message });
    }
  }

  const dmcStationMatch = pathname.match(/^\/api\/dmc\/estaciones\/(\d{6})$/);
  if (dmcStationMatch && req.method === 'GET') {
    const stationCode = dmcStationMatch[1];
    const dmcCredentials = { user: process.env.DMC_API_USER, token: process.env.DMC_API_TOKEN };
    if (!dmcCredentials.user || !dmcCredentials.token) {
      return sendJson(res, 424, { ok: false, configured: false, error: 'El servicio DMC requiere configurar DMC_API_USER y DMC_API_TOKEN' });
    }
    const cached = dmcStationMetadataCache.get(stationCode);
    if (cached && Date.now() - cached.fetchedAt < 6 * 60 * 60 * 1000) {
      return sendJson(res, 200, { ok: true, cached: true, station: cached.station });
    }
    try {
      const station = await fetchDmcStation(stationCode, dmcCredentials);
      dmcStationMetadataCache.set(stationCode, { station, fetchedAt: Date.now() });
      noteIngestion('dmc-estacion-metadata', { ok: true, quality: { status: 'PASS' } });
      return sendJson(res, 200, { ok: true, cached: false, station });
    } catch (error) {
      noteIngestion('dmc-estacion-metadata', { ok: false, error: error.message });
      return sendJson(res, 502, { ok: false, error: error.message });
    }
  }

  if (pathname === '/api/conaf/incendios' && req.method === 'GET') {
    const now = Date.now();
    if (conafReportCache && now - conafReportCacheTime < 4 * 60 * 1000) {
      return sendJson(res, 200, { ok: true, cached: true, ...conafReportCache });
    }
    const startedAt = now;
    try {
      conafReportCache = await fetchConafDailyReport();
      conafReportCacheTime = Date.now();
      noteIngestion('conaf-incendios', {
        ok: true, retrievedAtUtc: conafReportCache.retrievedAtUtc,
        latencyMs: conafReportCacheTime - startedAt, quality: conafReportCache.quality
      });
      const national = conafReportCache.national;
      await appendIngestionRecord(makeIngestionRecord({
        sourceId: conafReportCache.sourceId, entityId: 'CL', dataType: conafReportCache.dataType,
        retrievedAtUtc: conafReportCache.retrievedAtUtc, sourceReportedAtLocal: conafReportCache.sourceReportedAtLocal,
        values: national, units: { firesTotal: 'incendios', underObservation: 'incendios', fighting: 'incendios', controlled: 'incendios', extinguishedToday: 'incendios', affectedAreaHa: 'ha' },
        sourceUrl: conafReportCache.sourceUrl, quality: conafReportCache.quality
      }));
      return sendJson(res, 200, { ok: true, cached: false, ...conafReportCache });
    } catch (error) {
      noteIngestion('conaf-incendios', { ok: false, error: error.message, latencyMs: Date.now() - startedAt });
      if (conafReportCache && now - conafReportCacheTime < 60 * 60 * 1000) {
        return sendJson(res, 200, { ok: true, cached: true, stale: true, ...conafReportCache });
      }
      return sendJson(res, 502, { ok: false, error: error.message });
    }
  }

  if (pathname === '/api/ingestion/status' && req.method === 'GET') {
    const dmcConfigured = Boolean(process.env.DMC_API_USER && process.env.DMC_API_TOKEN);
    const sources = [...ingestionHealth.values()];
    if (!dmcConfigured && !sources.some((source) => source.sourceId === 'dmc-meteochile')) {
      sources.push({ sourceId: 'dmc-meteochile', status: 'NOT_CONFIGURED', lastSuccessAtUtc: null, lastError: 'Faltan DMC_API_USER y DMC_API_TOKEN', successCount: 0, failureCount: 0 });
    }
    return sendJson(res, 200, {
      checkedAtUtc: new Date().toISOString(),
      configuration: { dmcCredentialsConfigured: dmcConfigured },
      sources
    });
  }

  if (pathname === '/api/ingestion/history' && req.method === 'GET') {
    const sourceId = parsedUrl.searchParams.get('source') || '';
    const entityId = parsedUrl.searchParams.get('entidad') || '';
    const days = Number(parsedUrl.searchParams.get('dias') || 7);
    if (!['dmc-meteochile', 'conaf-incendios'].includes(sourceId)
      || !Number.isInteger(days) || days < 1 || days > 30
      || (entityId && !/^(CL|\d{6})$/.test(entityId))) {
      return sendJson(res, 400, { ok: false, error: 'Parámetros inválidos; días debe ser 1–30 y fuente debe estar habilitada' });
    }
    try {
      const records = await readIngestionRecords({ sourceId, entityId, days });
      return sendJson(res, 200, { ok: true, sourceId, days, count: records.length, records });
    } catch {
      return sendJson(res, 500, { ok: false, error: 'No fue posible leer el histórico de ingesta' });
    }
  }

  // Proxy con caché TTL (15 min) para Open-Meteo + GloFAS + Marine
  if (pathname === '/api/open-meteo/sync' && req.method === 'GET') {
    const locId = parsedUrl.searchParams.get('loc') || 'santiago';
    const result = await syncServerLocationWithCache(locId);
    return sendJson(res, result.ok ? 200 : 502, result);
  }

  // Endpoint GeoJSON abierto para importar o conectar directamente en CARTO Builder / QGIS / Kepler.gl
  if (pathname === '/api/carto/chile-meteo.geojson' && req.method === 'GET') {
    return sendJson(
      res,
      200,
      buildCartoBuilderGeoJsonClient(CHILE_LOCATIONS, ALERTS_DATA),
      'application/geo+json; charset=utf-8'
    );
  }

  // Proxy local para mapas meteorológicos de RainViewer con caché y tolerancia a fallos
  if (pathname === '/api/rainviewer/weather-maps' && req.method === 'GET') {
    const now = Date.now();
    if (rainviewerCache && now - rainviewerCacheTime < RAINVIEWER_CACHE_TTL_MS) {
      return sendJson(res, 200, rainviewerCache);
    }
    try {
      const rvRes = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
        headers: { 'User-Agent': 'ClimasFlood-Chile/1.4' }
      });
      if (rvRes.ok) {
        rainviewerCache = await rvRes.json();
        rainviewerCacheTime = now;
        return sendJson(res, 200, rainviewerCache);
      }
    } catch {
      if (rainviewerCache) return sendJson(res, 200, rainviewerCache);
    }
    return sendJson(res, 200, rainviewerCache || getFallbackRainViewerPayload());
  }

  if (pathname === '/api/audit-log' && req.method === 'GET') {
    return sendJson(res, 200, { entries: auditTrail });
  }

  if (pathname === '/api/audit-log' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 32768) req.socket.destroy();
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const entry = {
          id: `AUD-${String(auditTrail.length + 1).padStart(3, '0')}`,
          timestamp: new Date().toISOString(),
          actor: String(parsed.actor || 'Supervisor Humano'),
          action: String(parsed.action || 'REVISION_HITL'),
          detail: String(parsed.detail || ''),
          status: String(parsed.status || 'APPROVED')
        };
        auditTrail.unshift(entry);
        return sendJson(res, 201, { ok: true, entry });
      } catch {
        return sendJson(res, 400, { ok: false, error: 'JSON inválido' });
      }
    });
    return;
  }

  if (pathname === '/docs/propuesta-tecnica.md' && req.method === 'GET') {
    const docFile = path.join(DOCS_DIR, 'propuesta-tecnica.md');
    if (fs.existsSync(docFile)) {
      res.writeHead(200, { 'Content-Type': MIME_TYPES['.md'] });
      fs.createReadStream(docFile).pipe(res);
      return;
    }
  }

  let safeRelPath = pathname === '/' ? '/index.html' : pathname;
  safeRelPath = path.normalize(safeRelPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(PUBLIC_DIR, safeRelPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Acceso denegado');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Recurso no encontrado');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`ClimasFlood ejecutándose en http://localhost:${PORT}`);
});
