const DMC_ROOT = 'https://climatologia.meteochile.gob.cl/application/servicios/getDatosRecientesEma';
const DMC_STATIONS_URL = 'https://climatologia.meteochile.gob.cl/application/servicios/getEstacionesRedEma';
const DMC_STATION_URL = 'https://climatologia.meteochile.gob.cl/application/servicios/getEstacion';

function numericMeasurement(value) {
  if (value == null) return null;
  const match = String(value).match(/-?\d+(?:[.,]\d+)?/);
  if (!match) return null;
  const number = Number(match[0].replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

export function normalizeDmcStations(payload) {
  if (!Array.isArray(payload?.datosEstacion)) return [];
  return payload.datosEstacion
    .filter((station) => /^\d{6}$/.test(String(station.codigoNacional ?? '')))
    .map((station) => ({
      stationCode: String(station.codigoNacional),
      stationName: station.nombreEstacion || null,
      regionName: station.NombreRegion || null,
      latitude: numericMeasurement(station.latitud),
      longitude: numericMeasurement(station.longitud),
      elevationM: numericMeasurement(station.altura)
    }));
}

export async function fetchDmcStations({ user, token } = {}) {
  if (!user || !token) throw new Error('DMC requiere DMC_API_USER y DMC_API_TOKEN');
  const url = new URL(DMC_STATIONS_URL);
  url.searchParams.set('usuario', user);
  url.searchParams.set('token', token);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`DMC respondió ${response.status}`);
  const payload = await response.json();
  const stations = normalizeDmcStations(payload);
  if (!stations.length) throw new Error('El catálogo DMC no contiene estaciones reconocibles');
  return stations;
}

export function normalizeDmcStation(payload) {
  const station = payload?.metaDatos?.estacion;
  if (!station || !/^\d{6}$/.test(String(station.codigoNacional ?? ''))) return null;
  return {
    stationCode: String(station.codigoNacional),
    stationName: station.NombreEstacion || null,
    wmoCode: station.CodigoOMM || null,
    icaoCode: station.CodigoOACI || null,
    commune: station.Comuna?.trim() || null,
    province: station.Provincia?.trim() || null,
    region: station.region?.trim() || null,
    regionNumber: station.NumeroRegion ?? null,
    latitude: numericMeasurement(station.LatitudDecimal),
    longitude: numericMeasurement(station.LongitudDecimal),
    elevationM: numericMeasurement(station.AltitudCubetaBarometrica),
    active: station.Vigencia === 1 || station.Vigencia === '1',
    geographicZone: station.ZonaGeografica || null,
    timezone: payload.timezone || null,
    generatedAt: payload.fechaGeneracion || null
  };
}

export function parseDmcStationPayload(body) {
  // DMC antepone temporalmente un volcado getModelo al JSON de la ficha.
  const json = body.replace(/^\s*<p\b[^>]*>getModelo<\/p>\s*<pre\b[^>]*>[\s\S]*?<\/pre>\s*/i, '');
  try { return JSON.parse(json); } catch { throw new Error('DMC devolvió una ficha sin JSON válido'); }
}

export async function fetchDmcStation(stationCode, { user, token } = {}) {
  if (!user || !token) throw new Error('DMC requiere DMC_API_USER y DMC_API_TOKEN');
  if (!/^\d{6}$/.test(String(stationCode))) throw new Error('Código nacional de estación inválido');
  const url = new URL(`${DMC_STATION_URL}/${stationCode}`);
  url.searchParams.set('usuario', user);
  url.searchParams.set('token', token);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`DMC respondió ${response.status}`);
  const payload = parseDmcStationPayload(await response.text());
  const station = normalizeDmcStation(payload);
  if (!station) throw new Error('DMC no autorizó o no devolvió metadatos para la estación solicitada');
  if (station.stationCode !== String(stationCode)) throw new Error('DMC devolvió una ficha de otra estación');
  return station;
}

export function extractDmcObservation(payload, stationCode) {
  const pending = [payload];
  let station = null;
  while (pending.length) {
    const value = pending.pop();
    if (!value || typeof value !== 'object') continue;
    if (String(value.codigoNacional ?? '') === String(stationCode)) station = value;
    if (Array.isArray(value)) pending.push(...value);
    else pending.push(...Object.values(value));
  }
  if (!station) return null;
  const data = payload?.datosEstaciones?.datos;
  if (Array.isArray(data) && data.length) {
    const latest = [...data].sort((a, b) => String(b.momento || '').localeCompare(String(a.momento || '')))[0];
    return { ...payload.datosEstaciones.estacion, ...station, ...latest, stationCode: String(stationCode), sourceReportedAt: payload.fechaCreacion || null, sourceTimezone: payload.timezone || null };
  }
  return station;
}

export function normalizeDmcObservation(payload, stationCode) {
  const row = extractDmcObservation(payload, stationCode);
  if (!row) return null;
  const officialWind = row.fuerzaDelVientoPromedio10Minutos;
  const rawWind = officialWind ?? row.fuerzaDelViento ?? row.intensidadDelViento;
  const windKt = officialWind != null || /\bkt\b|\bnudos?\b/i.test(String(rawWind || ''));
  const parsedWind = numericMeasurement(rawWind);
  const windKmh = parsedWind == null ? null : windKt ? Number((parsedWind * 1.852).toFixed(1)) : parsedWind;
  const values = {
    temperatureC: numericMeasurement(row.temperatura),
    humidityPct: numericMeasurement(row.humedadRelativa ?? row.humedad),
    windKmh,
    windDirectionDeg: numericMeasurement(row.direccionDelVientoPromedio10Minutos ?? row.direccionDelViento),
    precipitationTodayMm: numericMeasurement(row.aguaCaida24Horas ?? row.aguaCaidaHoy)
  };
  const candidateTime = row.momento && row.sourceTimezone === 'UTC'
    ? `${row.momento.replace(' ', 'T')}Z`
    : row.momento && /Z$/.test(row.momento) ? row.momento : null;
  const parsedTime = candidateTime ? Date.parse(candidateTime) : NaN;
  return {
    stationCode: String(stationCode),
    stationName: row.nombreEstacion || null,
    sourceReportedAt: row.sourceReportedAt || row.fechaCreacion || null,
    measurementTime: row.momento || null,
    measurementTimeUtc: Number.isFinite(parsedTime) ? new Date(parsedTime).toISOString() : null,
    measurementTimezone: row.sourceTimezone || payload.timezone || null,
    precipitationPeriod: row.aguaCaida24Horas != null ? '12:01–12:00 UTC' : 'día informado por DMC',
    values
  };
}

export async function fetchDmcObservation(stationCode, { user, token } = {}) {
  if (!user || !token) throw new Error('DMC requiere DMC_API_USER y DMC_API_TOKEN');
  const url = new URL(`${DMC_ROOT}/${stationCode}`);
  url.searchParams.set('usuario', user);
  url.searchParams.set('token', token);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(7000),
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`DMC respondió ${response.status}`);
  const payload = await response.json();
  if (/sin información|sin datos/i.test(payload.status || '')) throw new Error('DMC no informa datos recientes para esta estación');
  const observation = normalizeDmcObservation(payload, stationCode);
  if (!observation) {
    if (/usuario|token|credencial|api.?key|autoriz|acceso|autentic|bloquead/i.test(payload.mensaje || '')) {
      if (/bloquead/i.test(payload.mensaje || '')) throw new Error('DMC bloqueó este servicio para el usuario configurado; solicita habilitación a DMC');
      throw new Error('DMC no aceptó las credenciales configuradas; revisa usuario y token');
    }
    throw new Error('La respuesta DMC no contiene la estación solicitada');
  }
  return observation;
}
