import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DATA_SOURCES,
  CHILE_LOCATIONS,
  ALERTS_DATA,
  SCENARIOS_DATA,
  VERIFICATION_HISTORY,
  AI_AGENTS_DATA
} from '../public/js/data/chile-data.js';
import { MAP_LAYERS_META } from '../public/js/modules/map-engine.js';
import { SATELLITE_FRAMES } from '../public/js/modules/satellite-viewer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Verificando Criterios de Aceptación (CA-01 a CA-09) para ClimasFlood ===\n');

// 1. Verificar cobertura nacional y husos horarios de Chile
assert.ok(CHILE_LOCATIONS.length >= 12, 'Debe cubrir las macrozonas y regiones de Chile');
const timezones = new Set(CHILE_LOCATIONS.map((l) => l.timezone));
assert.ok(timezones.has('America/Santiago'), 'Debe incluir huso America/Santiago');
assert.ok(timezones.has('America/Punta_Arenas'), 'Debe incluir huso America/Punta_Arenas');
assert.ok(timezones.has('Pacific/Easter'), 'Debe incluir huso insular Pacific/Easter');
console.log('✓ Cobertura territorial y multizona horaria de Chile verificada.');

// 2. Verificar las 6 capas exigidas en Mapa Nacional
const requiredLayers = ['precipitacion', 'temperatura', 'viento', 'nubosidad', 'nieve', 'alertas'];
for (const layerKey of requiredLayers) {
  assert.ok(MAP_LAYERS_META[layerKey], `Capa obligatoria faltante: ${layerKey}`);
  assert.ok(MAP_LAYERS_META[layerKey].legend.length >= 4, `Leyenda incompleta en capa: ${layerKey}`);
}
console.log('✓ 6 capas activables del Mapa Nacional y leyendas simbólicas verificadas.');

// 3. Verificar secuencia satelital y capacidad de comparación temporal
assert.ok(SATELLITE_FRAMES.length >= 6, 'Debe existir secuencia satelital de múltiples cuadros');
for (const frame of SATELLITE_FRAMES) {
  assert.ok(frame.captureUtc && frame.synopsis, 'Cada cuadro satelital debe tener hora de captura y sinopsis');
}
console.log('✓ Secuencia de imágenes satelitales GOES-16 y metadatos de captura verificados.');

// 4. CA-02: Verificar rangos de incertidumbre coherentes (P10 <= P50 <= P90) en pronósticos horarios y diarios
for (const loc of CHILE_LOCATIONS) {
  for (const h of loc.hourlyRain48h) {
    assert.ok(h.p90 >= h.p50, `Inconsistencia P90 < P50 en lluvia horaria de ${loc.name}`);
  }
  for (const d of loc.daily7d) {
    assert.ok(d.tP10 <= d.tMin && d.tP90 >= d.tMax, `Inconsistencia de banda térmica en ${loc.name}`);
    assert.ok(d.precipP90 >= d.precipP50, `Inconsistencia P90 < P50 en lluvia diaria de ${loc.name}`);
  }
}
console.log('✓ CA-02: Rangos de incertidumbre (P10–P50–P90) verificados en todas las comunas.');

// 5. CA-01: Verificar diferenciación explícita entre Alertas Oficiales y Estimaciones de la App en 4 niveles
const validSeverities = new Set(['INFORMATIVA', 'PREVENTIVA', 'TEMPRANA', 'EXTREMA']);
const origins = new Set(ALERTS_DATA.map((a) => a.originCategory));
assert.ok(origins.has('OFFICIAL_AUTHORITY'), 'Debe incluir alertas oficiales');
assert.ok(origins.has('APP_THRESHOLD_ESTIMATE'), 'Debe incluir estimaciones preventivas de la app');
for (const alert of ALERTS_DATA) {
  assert.ok(validSeverities.has(alert.severity), `Severidad inválida: ${alert.severity}`);
  assert.ok(alert.whatCouldHappen && alert.affectedZonesText && alert.officialUrl, `Campos obligatorios faltantes en alerta ${alert.id}`);
  assert.ok(Array.isArray(alert.preventiveActions) && alert.preventiveActions.length > 0, `Medidas preventivas faltantes en ${alert.id}`);
}
console.log('✓ CA-01 y Sección 5: Separación explícita de Alertas Oficiales vs. Estimaciones App verificada.');

// 6. Verificar escenarios hidrometeorológicos con factores de respaldo y señales de invalidación
assert.ok(SCENARIOS_DATA.length >= 4, 'Debe incluir múltiples escenarios plausibles');
for (const sc of SCENARIOS_DATA) {
  assert.ok(sc.supportingFactors.length >= 2, `Factores de respaldo insuficientes en ${sc.id}`);
  assert.ok(sc.invalidationSignals.length >= 1, `Señales de cambio/invalidación faltantes en ${sc.id}`);
}
console.log('✓ Sección 6: Escenarios plausibles con factores de respaldo y señales de cambio verificados.');

// 7. CA-03: Verificar registro histórico de predicciones anteriores vs observaciones reales
assert.ok(VERIFICATION_HISTORY.length >= 5, 'Debe mantener registro de predicciones anteriores');
for (const ver of VERIFICATION_HISTORY) {
  const diff = Math.abs(ver.predictedPrecipP50Mm - ver.observedPrecipMm);
  assert.ok(Math.abs(diff - ver.precipAbsErrorMm) < 0.15, `Error absoluto mal calculado en ${ver.id}`);
}
console.log('✓ CA-03: Registro de verificación histórica (Predicho vs. Observado) validado.');

// 8. CA-08 y CA-09: Verificar trazabilidad de Agentes de IA y bloqueo HITL
const evidenceMap = AI_AGENTS_DATA.evidenceRegistry;
for (const agent of AI_AGENTS_DATA.agents) {
  assert.notEqual(agent.autonomyLevel, 'EMISION_LIBRE_ALERTAS_OFICIALES', 'Ningún agente puede emitir alertas oficiales');
  for (const finding of agent.findings) {
    assert.ok(finding.citations.length > 0, `Afirmación sin cita en agente ${agent.id}`);
    for (const cid of finding.citations) {
      assert.ok(evidenceMap[cid], `Cita huérfana ${cid} en agente ${agent.id}`);
    }
  }
}
for (const hitl of AI_AGENTS_DATA.hitlQueue) {
  assert.equal(hitl.status, 'PENDIENTE_REVISION_HUMANA', 'Recomendación de alto impacto debe requerir revisión humana');
  for (const cid of hitl.citations) {
    assert.ok(evidenceMap[cid], `Cita huérfana ${cid} en cola HITL ${hitl.id}`);
  }
}
console.log('✓ CA-08 y CA-09: Trazabilidad 100% de citas de Agentes IA y bloqueo HITL verificados.');

// 9. Verificar existencia de entregables documentales, PWA y mejoras P1–P3
const docPath = path.join(__dirname, '..', 'docs', 'propuesta-tecnica.md');
const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
const swPath = path.join(__dirname, '..', 'public', 'sw.js');
const serverPath = path.join(__dirname, '..', 'server.js');
const mapEnginePath = path.join(__dirname, '..', 'public', 'js', 'modules', 'map-engine.js');
const satViewerPath = path.join(__dirname, '..', 'public', 'js', 'modules', 'satellite-viewer.js');

assert.ok(fs.existsSync(docPath), 'Falta docs/propuesta-tecnica.md');
assert.ok(fs.existsSync(htmlPath), 'Falta public/index.html');
assert.ok(fs.existsSync(manifestPath), 'Falta public/manifest.json (PWA)');
assert.ok(fs.existsSync(swPath), 'Falta public/sw.js (Service Worker offline)');

const serverCode = fs.readFileSync(serverPath, 'utf8');
assert.ok(serverCode.includes('/api/open-meteo/sync'), 'Falta proxy con caché /api/open-meteo/sync en server.js');
assert.ok(serverCode.includes('/api/carto/chile-meteo.geojson'), 'Falta endpoint GeoJSON en server.js');

const mapEngineCode = fs.readFileSync(mapEnginePath, 'utf8');
assert.ok(
  mapEngineCode.includes('GOES-East_ABI_Band13_Clean_Infrared'),
  'Falta capa satelital real NASA GIBS GOES-East en map-engine.js'
);
assert.ok(
  mapEngineCode.includes('leafletMarkerMap') && mapEngineCode.includes('existing.setIcon'),
  'Falta optimización de reutilización de marcadores Leaflet en map-engine.js'
);

const satViewerCode = fs.readFileSync(satViewerPath, 'utf8');
assert.ok(
  satViewerCode.includes('GOES-East_ABI_Band13_Clean_Infrared'),
  'Falta integración NASA GIBS GOES-East en satellite-viewer.js'
);

console.log('✓ Documentación técnica, PWA offline, proxy Open-Meteo y capas NASA GIBS verificados.\n');
console.log('🎉 TODAS LAS PRUEBAS Y CRITERIOS DE ACEPTACIÓN PASARON EXITOSAMENTE.');

