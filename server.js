import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHILE_LOCATIONS, ALERTS_DATA } from './public/js/data/chile-data.js';
import {
  fetchLiveOpenMeteoForLocation,
  buildCartoBuilderGeoJsonClient
} from './public/js/modules/live-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 4173;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DOCS_DIR = path.join(__dirname, 'docs');

// Caché en memoria en el servidor (TTL 15 minutos por comuna) para compartir consultas entre clientes
const SERVER_SYNC_TTL_MS = 15 * 60 * 1000;
const serverLocationSyncTimestamps = new Map();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
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
        'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/'
      ],
      cartoBuilderGeoJsonEndpoint: '/api/carto/chile-meteo.geojson',
      cachedLocationsCount: serverLocationSyncTimestamps.size,
      epistemologyPolicy: 'STRICT_SEPARATION_OBS_FORECAST_SCENARIO_ALERT',
      agentGuardrails: 'ACTIVE_HITL_ENFORCED'
    });
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
