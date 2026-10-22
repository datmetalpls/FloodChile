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
import { auditSourceCatalog } from '../public/js/modules/source-audit.js';
import { extractDmcObservation, normalizeDmcObservation, normalizeDmcStations, normalizeDmcStation, parseDmcStationPayload, fetchDmcStation, fetchDmcObservation } from '../public/js/modules/dmc-api.js';
import { parseConafDailyReport } from '../public/js/modules/conaf-api.js';
import { validateNonNegativeMetrics } from '../server/ingestion-store.js';

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

// 4. CA-02: Verificar coherencia de los escenarios de muestra, sin tratarlos como percentiles
for (const loc of CHILE_LOCATIONS) {
  for (const h of loc.hourlyRain48h) {
    assert.ok(h.upperScenarioMm >= h.forecastMm, `Escenario superior menor que el pronóstico base en ${loc.name}`);
  }
  for (const d of loc.daily7d) {
    assert.ok(d.tempLowReferenceC <= d.tMin && d.tempHighReferenceC >= d.tMax, `Inconsistencia de banda térmica en ${loc.name}`);
    assert.ok(d.precipUpperScenarioMm >= d.precipForecastMm, `Escenario superior menor que el pronóstico base en ${loc.name}`);
  }
}
console.log('✓ CA-02: Coherencia de pronóstico base y escenarios superiores de muestra verificada.');

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

// 7. CA-03: Verificar que la estructura de demostración histórica esté disponible
assert.ok(VERIFICATION_HISTORY.length >= 5, 'Debe mantener registro de predicciones anteriores');
for (const ver of VERIFICATION_HISTORY) {
  const diff = Math.abs(ver.predictedPrecipMm - ver.observedPrecipMm);
  assert.ok(Math.abs(diff - ver.precipAbsErrorMm) < 0.15, `Error absoluto mal calculado en ${ver.id}`);
}
console.log('✓ CA-03: Datos sintéticos de demostración y consistencia aritmética verificados.');

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

// Los registros HITL precargados son demostraciones y nunca disparan notificaciones o audio.
assert.ok(AI_AGENTS_DATA.hitlQueue.every((item) => item.simulationOnly), 'Toda la cola precargada debe estar marcada como simulación');
assert.equal(AI_AGENTS_DATA.evidenceRegistry['EV-SAE-01'].dataType, 'DEMO_ESCENARIO');
const appSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');
assert.match(appSource, /decision === 'APROBADO_POR_SUPERVISOR_HUMANO' && !item\.simulationOnly/);
assert.match(appSource, /if \(item\.simulationOnly\) return/);
assert.match(appSource, /STATE\.alertOriginFilter === 'OFFICIAL_AUTHORITY' && a\.isLiveScraped/);
assert.match(appSource, /isDemoRecord: true/);
assert.match(appSource, /STATE\.liveSenapredAlerts = res\.sourceAvailable \? res\.alerts : \[\]/);
assert.doesNotMatch(appSource, /isSaeActivation|btnTriggerSaePush|EMERGENCIA_SAE_ACTIVADA/);
assert.match(appSource, /title: 'Publicación para revisar en el portal SENAPRED'/);
assert.match(appSource, /Severidad de muestra: \$\{sev\.label\}/);
const indexSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
assert.match(indexSource, /SAE en tiempo real: sin integración validada/);
assert.doesNotMatch(indexSource, /saeEmergencyLiveBanner|btnTriggerSaePush/);
console.log('✓ Escenarios HITL de muestra no activan audio, Web Push ni despacho externo.');

// 8a. Auditor de fuentes: fechas vencidas contradicen ONLINE y requieren revisión.
const sourceAudit = auditSourceCatalog([
  { id: 'source-a', name: 'Fuente A', shortName: 'A', url: 'https://example.org', accessNotes: 'Catálogo', status: 'ONLINE', lastUpdatedUtc: '2026-10-19T00:00:00Z', ttlMinutes: 60 }
], { now: Date.parse('2026-10-20T00:00:00Z') });
assert.equal(sourceAudit.reviewRequired, true);
assert.match(sourceAudit.findings[0].problems[1], /ONLINE/);
console.log('✓ Auditor de fuentes: TTL vencido y estado ONLINE quedan pendientes de revisión humana.');

const liveAudit = auditSourceCatalog([
  { id: 'openmeteo-multi', name: 'Open-Meteo', shortName: 'Open-Meteo', url: 'https://example.org', accessNotes: 'API', status: 'ONLINE', lastUpdatedUtc: '2026-10-20T00:00:00Z', ttlMinutes: 180 }
], {
  now: Date.parse('2026-10-20T00:10:00Z'),
  openMeteo: { syncedLocationCount: 2, totalLocationCount: 2, lastSuccessAtUtc: '2026-10-20T00:05:00Z' }
});
assert.equal(liveAudit.runtimeChecks[0].status, 'RESPUESTA_RECIENTE');
assert.equal(liveAudit.reviewRequired, false);
console.log('✓ Auditor de fuentes: la consulta reciente de Open-Meteo se valida con cobertura y TTL.');

const sourceIngestionAudit = auditSourceCatalog([], {
  now: Date.parse('2026-10-21T00:10:00Z'),
  ingestion: [{ sourceId: 'conaf-incendios', name: 'CONAF', status: 'REVIEW', lastSuccessAtUtc: '2026-10-21T00:05:00Z', ttlMinutes: 15 }]
});
assert.equal(sourceIngestionAudit.runtimeChecks[0].status, 'DATOS_REQUIEREN_REVISION');
assert.equal(sourceIngestionAudit.reviewRequired, true);
console.log('✓ Auditor de fuentes: respuestas recientes con anomalías de QC quedan retenidas para revisión.');

const unconfiguredAudit = auditSourceCatalog([], {
  now: Date.parse('2026-10-21T00:10:00Z'),
  ingestion: [{ sourceId: 'dmc-meteochile', name: 'DMC', status: 'NOT_CONFIGURED', lastSuccessAtUtc: null, lastError: 'Faltan credenciales' }]
});
assert.equal(unconfiguredAudit.runtimeChecks[0].status, 'NO_CONFIGURADA');
assert.match(unconfiguredAudit.runtimeChecks[0].detail, /Faltan credenciales/);
console.log('✓ Auditor de fuentes: credenciales DMC ausentes se exponen como conector no configurado.');

const partialLiveAudit = auditSourceCatalog([], {
  now: Date.parse('2026-10-20T00:10:00Z'),
  openMeteo: { syncedLocationCount: 1, totalLocationCount: 2, lastSuccessAtUtc: '2026-10-20T00:05:00Z' }
});
assert.equal(partialLiveAudit.runtimeChecks[0].status, 'COBERTURA_PARCIAL');
assert.equal(partialLiveAudit.reviewRequired, true);
console.log('✓ Auditor de fuentes: detecta cobertura incompleta de Open-Meteo.');

// 8b. Un fallo de ingesta no debe convertirse en alerta oficial ni activación SAE.
const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
assert.match(serverSource, /const merged = scrapedAlerts\.map/);
assert.match(serverSource, /isSaeActivation: false/);
assert.match(serverSource, /sourceAvailable,\s*alerts: result\.alerts/);
assert.doesNotMatch(serverSource, /SENAPRED-SAE-2026-01|DMC-AVISO-A320-2026|SENAPRED-AMARILLA-2026-03/);
console.log('✓ Ingesta: no convierte datos de contingencia en alertas oficiales ni activaciones SAE.');

const dmcFixture = {
  timezone: 'UTC', fechaCreacion: '2026-10-21 11:05:00',
  datosEstaciones: {
    estacion: { codigoNacional: '330020', nombreEstacion: 'Quinta Normal' },
    datos: [{ momento: '2026-10-21 11:00:00', temperatura: '18.2 °C', humedadRelativa: '63 %', fuerzaDelVientoPromedio10Minutos: '10 kt', direccionDelVientoPromedio10Minutos: '350 °', aguaCaida24Horas: '0.4 mm' }]
  }
};
assert.equal(extractDmcObservation(dmcFixture, '330020').temperatura, '18.2 °C');
assert.equal(extractDmcObservation(dmcFixture, '999999'), null);
const dmcNormalized = normalizeDmcObservation(dmcFixture, '330020');
assert.equal(dmcNormalized.stationName, 'Quinta Normal');
assert.equal(dmcNormalized.values.windKmh, 18.5);
assert.equal(dmcNormalized.measurementTimeUtc, '2026-10-21T11:00:00.000Z');
assert.equal(dmcNormalized.precipitationPeriod, '12:01–12:00 UTC');
const stationPayload = { metaDatos: { estacion: { codigoNacional: 330020, NombreEstacion: 'Quinta Normal' } } };
assert.deepEqual(parseDmcStationPayload(JSON.stringify(stationPayload)), stationPayload);
assert.deepEqual(parseDmcStationPayload(`<p class="alert">getModelo</p><pre>Array ([Id] =&gt; 1)</pre>${JSON.stringify(stationPayload)}`), stationPayload);
assert.throws(() => parseDmcStationPayload('<html>Error DMC</html>'), /sin JSON válido/);
const dmcStations = normalizeDmcStations({ datosEstacion: [{ codigoNacional: 330020, nombreEstacion: 'Quinta Normal, Santiago', NombreRegion: 'Metropolitana de Santiago', latitud: '-33.44500', longitud: '-70.68278', altura: 520 }, { codigoNacional: 'bad' }] });
assert.equal(dmcStations.length, 1);
assert.equal(dmcStations[0].stationCode, '330020');
assert.equal(dmcStations[0].latitude, -33.445);
const dmcStation = normalizeDmcStation({ timezone: 'UTC', fechaGeneracion: '2026-10-21 05:00:00', metaDatos: { estacion: { codigoNacional: 330020, NombreEstacion: 'Quinta Normal, Santiago', Comuna: 'Estación Central ', Provincia: 'Santiago ', NumeroRegion: 13, LatitudDecimal: -33.445, LongitudDecimal: -70.683, AltitudCubetaBarometrica: 521, Vigencia: 1 } } });
assert.equal(dmcStation.stationCode, '330020');
assert.equal(dmcStation.active, true);
assert.equal(dmcStation.commune, 'Estación Central');
await assert.rejects(fetchDmcObservation('330020'), /DMC_API_USER y DMC_API_TOKEN/);
const originalFetch = global.fetch;
global.fetch = async () => new Response(JSON.stringify({ momento: '2026-10-21 05:10:13', mensaje: 'Usuario o token inválidos' }), { headers: { 'Content-Type': 'application/json' } });
try {
  global.fetch = async () => new Response(JSON.stringify(stationPayload));
  await assert.rejects(fetchDmcStation('330007', { user: 'test', token: 'test' }), /otra estación/);
  global.fetch = async () => new Response(JSON.stringify({ mensaje: 'Usuario o token inválidos' }));
  await assert.rejects(fetchDmcObservation('330020', { user: 'test', token: 'test' }), /no aceptó las credenciales/);
  global.fetch = async () => new Response(JSON.stringify({ momento: '2026-10-21 05:10:13', mensaje: 'Este servicio ha sido bloqueada para el usuario que consulta' }), { headers: { 'Content-Type': 'application/json' } });
  await assert.rejects(fetchDmcObservation('330020', { user: 'test', token: 'test' }), /bloqueó este servicio/);
} finally {
  global.fetch = originalFetch;
}
assert.match(serverSource, /sourceAvailable = scrapedAlerts\.length > 0/);
assert.match(serverSource, /api\/dmc\/observaciones/);
assert.match(serverSource, /api\/dmc\/estaciones/);
assert.match(serverSource, /fetchDmcStation/);
assert.match(appSource, /DMC EMA ·/);
assert.match(appSource, /usuario o API key rechazados/);
assert.match(appSource, /usuario sin habilitación para este servicio/);
assert.match(appSource, /response\.json\(\)\s*\.then\(\(data\) => response\.ok \? data : \{ \.\.\.data, ok: false \}\)/);
console.log('✓ DMC EMA: contrato documentado, normalización/unidades/hora y credenciales requeridas verificados.');

const conafFixture = `<p>Fecha: 21-10-2026 Hora 12:00:00</p><table>
  <tr><th>Región</th><th>Total Incendios</th><th>Bajo observación</th><th>En combate</th><th>Controlado</th><th>Extinguido en este día</th><th>Superficie afectada (ha)</th></tr>
  <tr><td>Metropolitana</td><td>2</td><td>1</td><td>1</td><td>0</td><td>0</td><td>3.5</td></tr>
  <tr><td>Total</td><td>2</td><td>1</td><td>1</td><td>0</td><td>0</td><td>3.5</td></tr>
</table>`;
const conafData = parseConafDailyReport(conafFixture, '2026-10-21T12:01:00Z');
assert.equal(conafData.regions[0].firesTotal, 2);
assert.equal(conafData.quality.status, 'PASS');
assert.equal(parseConafDailyReport(conafFixture.replace('<td>2</td><td>1</td>', '<td>3</td><td>1</td>'), '2026-10-21T12:01:00Z').quality.status, 'REVIEW');
assert.equal(validateNonNegativeMetrics({ temperatureC: -150 }, { temperatureC: [-90, 60] }).quality.status, 'REVIEW');
assert.equal(validateNonNegativeMetrics({ temperatureC: 12, humidityPct: null }, { temperatureC: [-90, 60], humidityPct: [0, 100] }).quality.status, 'PARTIAL');
assert.match(serverSource, /api\/conaf\/incendios/);
console.log('✓ CONAF: parsea reporte regional y escala inconsistencias sin convertir cifras en alertas.');

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

const appJsPath = path.join(__dirname, '..', 'public', 'js', 'app.js');
const appJsCode = fs.readFileSync(appJsPath, 'utf8');
assert.ok(
  appJsCode.includes("tabId === 'tab-predictivo'") && appJsCode.includes('renderPredictiveAndVerificationSection'),
  'activateTab debe renderizar explícitamente tab-predictivo'
);
assert.ok(
  appJsCode.includes("tabId === 'tab-agentes'") && appJsCode.includes('renderAgentsSection'),
  'activateTab debe renderizar explícitamente tab-agentes'
);
assert.ok(
  appJsCode.includes("tabId === 'tab-fuentes'") && appJsCode.includes('renderSourcesAndCriteriaSection'),
  'activateTab debe renderizar explícitamente tab-fuentes'
);
assert.ok(
  appJsCode.includes('try { renderPredictiveAndVerificationSection(); } catch'),
  'refreshAllViews debe aislar renderPredictiveAndVerificationSection en try/catch'
);

console.log('✓ Resiliencia de renderizado dinámico en activateTab y refreshAllViews verificada.');
console.log('✓ Documentación técnica, PWA offline, proxy Open-Meteo y capas NASA GIBS verificados.\n');
console.log('🎉 TODAS LAS PRUEBAS Y CRITERIOS DE ACEPTACIÓN PASARON EXITOSAMENTE.');

