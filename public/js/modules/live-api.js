/**
 * Conectores en vivo a APIs públicas abiertas verificables sin API key:
 * 1. Open-Meteo Forecast API (https://api.open-meteo.com/v1/forecast) -> Modelos NWP (ECMWF/GFS/ICON) + Isoterma 0 °C
 * 2. Open-Meteo Flood API / Copernicus GloFAS (https://flood-api.open-meteo.com/v1/flood) -> Caudal de ríos (m³/s)
 * 3. Open-Meteo Marine API (https://marine-api.open-meteo.com/v1/marine) -> Altura significativa de ola (Hs) y periodo (Tp)
 * 4. RainViewer Public Weather Maps API (https://api.rainviewer.com/public/weather-maps.json) -> Fotogramas satelitales IR y radar
 * 5. Generador / Conector GeoJSON estándar compatible con CARTO Builder (EPSG:4326)
 */

const DAY_NAMES_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatShortDateEs(isoDateStr) {
  const [y, m, d] = isoDateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return `${DAY_NAMES_ES[dt.getUTCDay()]} ${d} ${MONTH_NAMES_ES[m - 1]}`;
}

function degToCompass(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(((deg || 0) % 360) / 22.5) % 16];
}

function weatherCodeToTextEs(code) {
  const map = {
    0: 'Despejado',
    1: 'Mayormente despejado',
    2: 'Nubosidad parcial',
    3: 'Cubierto',
    45: 'Niebla / Camanchaca',
    48: 'Niebla engelante',
    51: 'Llovizna débil',
    53: 'Llovizna moderada',
    55: 'Llovizna densa',
    61: 'Lluvia débil',
    63: 'Lluvia moderada',
    65: 'Lluvia fuerte',
    71: 'Nevada débil',
    73: 'Nevada moderada',
    75: 'Nevada intensa',
    80: 'Chubascos débiles',
    81: 'Chubascos moderados',
    82: 'Chubascos violentos',
    95: 'Tormenta eléctrica'
  };
  return map[code] || 'Condición variable';
}

export async function fetchLiveGloFasDischarge(location) {
  const params = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    daily: 'river_discharge,river_discharge_mean,river_discharge_max',
    forecast_days: '7'
  });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`https://flood-api.open-meteo.com/v1/flood?${params.toString()}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return { ok: false };
    const data = await res.json();
    const qNow = data?.daily?.river_discharge?.[0];
    const qMax = data?.daily?.river_discharge_max?.[0] ?? data?.daily?.river_discharge_mean?.[0];
    if (typeof qNow === 'number') {
      location.observation.riverDischargeM3s = Number(qNow.toFixed(1));
      location.observation.riverDischargeMaxM3s =
        typeof qMax === 'number' ? Number(qMax.toFixed(1)) : Number(qNow.toFixed(1));
      return { ok: true, riverDischargeM3s: location.observation.riverDischargeM3s };
    }
    return { ok: false };
  } catch {
    clearTimeout(timeoutId);
    return { ok: false };
  }
}

export async function fetchLiveMarineWaves(location) {
  const params = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    current: 'wave_height,wave_direction,wave_period',
    timezone: location.timezone || 'America/Santiago'
  });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`https://marine-api.open-meteo.com/v1/marine?${params.toString()}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return { ok: false };
    const data = await res.json();
    const wh = data?.current?.wave_height;
    const wp = data?.current?.wave_period;
    const wd = data?.current?.wave_direction;
    if (typeof wh === 'number') {
      location.observation.waveHeightM = Number(wh.toFixed(1));
      location.observation.wavePeriodS = typeof wp === 'number' ? Number(wp.toFixed(1)) : null;
      location.observation.waveDir = typeof wd === 'number' ? degToCompass(wd) : null;
      return { ok: true, waveHeightM: location.observation.waveHeightM };
    }
    return { ok: false };
  } catch {
    clearTimeout(timeoutId);
    return { ok: false };
  }
}

export async function fetchLiveOpenMeteoForLocation(location) {
  const params = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation',
      'cloud_cover',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'weather_code'
    ].join(','),
    hourly: [
      'temperature_2m',
      'precipitation_probability',
      'precipitation',
      'wind_speed_10m',
      'freezing_level_height'
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_gusts_10m_max',
      'snowfall_sum'
    ].join(','),
    timezone: location.timezone || 'America/Santiago',
    forecast_days: '7'
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6500);

  try {
    // Ejecutamos en paralelo las 3 APIs abiertas de Open-Meteo (Forecast + GloFAS Flood + Marine)
    const [response] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
        signal: controller.signal
      }),
      fetchLiveGloFasDischarge(location),
      fetchLiveMarineWaves(location)
    ]);
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const nowIso = new Date().toISOString();

    if (data.current) {
      location.observation = {
        ...location.observation,
        tempC: Number((data.current.temperature_2m ?? location.observation.tempC).toFixed(1)),
        humidityPct: Math.round(data.current.relative_humidity_2m ?? location.observation.humidityPct),
        precip1hMm: Number((data.current.precipitation ?? location.observation.precip1hMm).toFixed(1)),
        windKmh: Math.round(data.current.wind_speed_10m ?? location.observation.windKmh),
        windGustKmh: Math.round(data.current.wind_gusts_10m ?? location.observation.windGustKmh),
        windDir: degToCompass(data.current.wind_direction_10m),
        cloudCoverPct: Math.round(data.current.cloud_cover ?? location.observation.cloudCoverPct),
        pressureHpa: Number((data.current.surface_pressure ?? location.observation.pressureHpa).toFixed(1)),
        freezingLevelM: Math.round(data.hourly?.freezing_level_height?.[0] ?? location.observation.freezingLevelM),
        conditionText: `${weatherCodeToTextEs(data.current.weather_code)} (Sincronizado en vivo vía Open-Meteo)`,
        observedAtUtc: nowIso,
        sourceId: 'openmeteo-multi',
        isLiveSynced: true
      };
    }

    if (data.hourly && Array.isArray(data.hourly.time)) {
      const steps = [0, 3, 6, 9, 12, 18, 24, 30, 36, 42, 48];
      location.hourlyRain48h = steps
        .filter((idx) => idx < data.hourly.time.length)
        .map((idx) => {
          const forecastMm = Number((data.hourly.precipitation?.[idx] ?? 0).toFixed(1));
          const prob = data.hourly.precipitation_probability?.[idx] ?? 20;
          // Regla de presentación; no es un cuantíl ni está calibrada.
          const upperScenarioMm = Number((forecastMm * 1.65 + (prob > 50 ? 1.2 : 0.2)).toFixed(1));
          return {
            hourOffset: idx,
            forecastMm,
            upperScenarioMm,
            probabilityPct: prob,
            iso0: Math.round(data.hourly.freezing_level_height?.[idx] ?? location.observation.freezingLevelM),
            wind: Math.round(data.hourly.wind_speed_10m?.[idx] ?? location.observation.windKmh),
            temp: Number((data.hourly.temperature_2m?.[idx] ?? location.observation.tempC).toFixed(1))
          };
        });
    }

    if (data.daily && Array.isArray(data.daily.time)) {
      location.daily7d = data.daily.time.slice(0, 7).map((dateStr, idx) => {
        const tMin = Math.round(data.daily.temperature_2m_min?.[idx] ?? 8);
        const tMax = Math.round(data.daily.temperature_2m_max?.[idx] ?? 18);
        const precipForecastMm = Number((data.daily.precipitation_sum?.[idx] ?? 0).toFixed(1));
        const probPct = Math.round(data.daily.precipitation_probability_max?.[idx] ?? 10);
        // Regla de presentación; no es un cuantíl ni está calibrada.
        const precipUpperScenarioMm = Number((precipForecastMm * 1.55 + (probPct >= 40 ? 2.0 : 0.3)).toFixed(1));
        const hourIdx = Math.min(idx * 24 + 12, (data.hourly?.freezing_level_height?.length || 1) - 1);
        const iso0M = Math.round(data.hourly?.freezing_level_height?.[hourIdx] ?? location.observation.freezingLevelM);
        return {
          day: formatShortDateEs(dateStr),
          tMin,
          tMax,
          precipForecastMm,
          precipUpperScenarioMm,
          probPct,
          windMax: Math.round(data.daily.wind_gusts_10m_max?.[idx] ?? 25),
          snowCm: Number((data.daily.snowfall_sum?.[idx] ?? 0).toFixed(1)),
          iso0M,
          cloudPct: probPct > 60 ? 90 : probPct > 30 ? 60 : 25,
          cond: weatherCodeToTextEs(data.daily.weather_code?.[idx])
        };
      });
    }

    return {
      ok: true,
      syncedAtUtc: nowIso,
      provider: 'Open-Meteo Live APIs (Forecast + GloFAS Flood + Marine)'
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      ok: false,
      error: err.message || 'Sin conexión directa a api.open-meteo.com',
      fallbackUsed: true
    };
  }
}

/**
 * Intenta sincronizar primero mediante el proxy con caché TTL (15 min) de server.js
 * (`/api/open-meteo/sync?loc=...`), y si no está disponible o falla, consulta
 * directamente las APIs abiertas desde el navegador.
 */
export async function syncLocationViaServerOrDirect(location) {
  if (typeof window !== 'undefined' && window.location?.protocol?.startsWith('http')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`/api/open-meteo/sync?loc=${encodeURIComponent(location.id)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json?.ok && json.location) {
          location.observation = { ...location.observation, ...json.location.observation };
          if (Array.isArray(json.location.daily7d) && json.location.daily7d.length) {
            location.daily7d = json.location.daily7d;
          }
          if (Array.isArray(json.location.hourlyRain48h) && json.location.hourlyRain48h.length) {
            location.hourlyRain48h = json.location.hourlyRain48h;
          }
          return { ok: true, source: json.cached ? 'server-cache' : 'server-live' };
        }
      }
    } catch {
      // Continuar con fallback directo a Open-Meteo desde el navegador
    }
  }
  return fetchLiveOpenMeteoForLocation(location);
}

export async function fetchRainViewerMetadata() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    let res = null;
    try {
      res = await fetch('/api/rainviewer/weather-maps', { signal: controller.signal });
    } catch {
      res = null;
    }
    if (!res || !res.ok) {
      res = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
        signal: controller.signal
      });
    }
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const infraredFrames = json?.satellite?.infrared || [];
    const radarFrames = json?.radar?.past || [];
    return {
      ok: true,
      host: json.host || 'https://tilecache.rainviewer.com',
      infraredFrames,
      radarFrames,
      fetchedAtUtc: new Date().toISOString()
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      ok: false,
      error: err.message
    };
  }
}

/**
 * Construye una FeatureCollection GeoJSON (EPSG:4326) lista para importar en CARTO Builder,
 * Kepler.gl o QGIS con todas las comunas y sus métricas actuales.
 */
export function buildCartoBuilderGeoJsonClient(locations, alerts = []) {
  return {
    type: 'FeatureCollection',
    name: 'climasflood_chile_cartobuilder',
    features: locations.map((loc) => {
      const forecast48hMm = Number(
        ((loc.daily7d[0]?.precipForecastMm || 0) + (loc.daily7d[1]?.precipForecastMm || 0)).toFixed(1)
      );
      const upperScenario48hMm = Number(
        ((loc.daily7d[0]?.precipUpperScenarioMm || 0) + (loc.daily7d[1]?.precipUpperScenarioMm || 0)).toFixed(1)
      );
      const matchingAlerts = alerts.filter(
        (a) => a.communesIds.includes(loc.id) || a.regions.includes(loc.regionCode)
      );
      return {
        type: 'Feature',
        id: loc.id,
        geometry: {
          type: 'Point',
          coordinates: [loc.lon, loc.lat]
        },
        properties: {
          id: loc.id,
          cut: loc.cut,
          comuna: loc.name,
          region_codigo: loc.regionCode,
          region_nombre: loc.regionName,
          macrozona: loc.macrozone,
          elevacion_m: loc.elevationM,
          cuenca: loc.basin,
          temp_actual_c: loc.observation.tempC,
          humedad_pct: loc.observation.humidityPct,
          precip_1h_mm: loc.observation.precip1hMm,
          precip_24h_mm: loc.observation.precip24hMm,
          precip_48h_forecast_mm: forecast48hMm,
          precip_48h_upper_scenario_mm: upperScenario48hMm,
          isoterma_0_m: loc.observation.freezingLevelM,
          viento_kmh: loc.observation.windKmh,
          racha_kmh: loc.observation.windGustKmh,
          viento_dir: loc.observation.windDir,
          caudal_glofas_m3s: loc.observation.riverDischargeM3s ?? null,
          ola_costera_m: loc.observation.waveHeightM ?? null,
          nivel_riesgo: loc.summaryRisk,
          alertas_count: matchingAlerts.length,
          origen_dato: loc.observation.isLiveSynced ? 'OPEN_METEO_LIVE' : 'SAMPLE_DEMO',
          estampa_utc: loc.observation.observedAtUtc
        }
      };
    })
  };
}

/**
 * Conecta con el endpoint /api/senapred/alertas-live del backend
 * que consulta enlaces publicados en el portal de SENAPRED. No valida vigencia,
 * contenido ni activaciones SAE.
 */
export async function fetchLiveSenapredAlerts() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch('/api/senapred/alertas-live', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return { ok: false, alerts: [] };
    const data = await res.json();
    return {
      ok: true,
      count: data.count || 0,
      saeActiveCount: data.saeActiveCount || 0,
      cached: data.cached || false,
      sourceAvailable: data.sourceAvailable === true,
      alerts: data.alerts || []
    };
  } catch {
    clearTimeout(timeoutId);
    return { ok: false, alerts: [] };
  }
}
