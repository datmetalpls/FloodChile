/**
 * Base de datos nacional de meteorología, hidrometeorología, alertas, escenarios y trazabilidad
 * para las 16 regiones de Chile y comunas representativas.
 *
 * Distingue estrictamente:
 * - OBSERVACION (Medición instrumental/satelital)
 * - PRONOSTICO_NUMERICO (ECMWF IFS, NOAA GFS, DWD ICON con percentiles P10/P50/P90)
 * - ESTIMACION_ESCENARIO (Inferencia hidrometeorológica sujeta a condiciones)
 * - ALERTA_OFICIAL vs ESTIMACION_APP (Separación explícita de origen)
 */

export const DATA_SOURCES = [
  {
    id: 'dmc-meteochile',
    name: 'Dirección Meteorológica de Chile (DMC - DGAC)',
    shortName: 'DMC MeteoChile',
    category: 'OFFICIAL_AUTHORITY',
    role: 'Observaciones red EMA, avisos, alertas y alarmas meteorológicas oficiales',
    url: 'https://www.meteochile.gob.cl/',
    apiDocUrl: 'https://climatologia.meteochile.gob.cl/application/index/menuTematicoEmas',
    updateFrequencyMinutes: 15,
    ttlMinutes: 45,
    lastUpdatedUtc: '2026-10-19T15:00:00Z',
    status: 'ONLINE',
    accessNotes: 'Portal Servicios Climáticos requiere credenciales institucionales para API REST completa; boletines y avisos públicos consultables en portal oficial.'
  },
  {
    id: 'senapred-chile',
    name: 'Servicio Nacional de Prevención y Respuesta ante Desastres (SENAPRED)',
    shortName: 'SENAPRED',
    category: 'OFFICIAL_AUTHORITY',
    role: 'Alertas Tempranas Preventivas (ATP), Amarillas, Rojas y Sistema de Alerta de Emergencia (SAE)',
    url: 'https://senapred.cl/alertas/',
    apiDocUrl: 'https://senapred.cl/informate/alertas/',
    updateFrequencyMinutes: 15,
    ttlMinutes: 60,
    lastUpdatedUtc: '2026-10-19T14:50:00Z',
    status: 'ONLINE',
    accessNotes: 'Sin API REST pública abierta con SLA; se integran boletines oficiales con enlace directo verificable.'
  },
  {
    id: 'openmeteo-multi',
    name: 'Open-Meteo Multi-Model NWP (ECMWF IFS 9km + NOAA GFS + DWD ICON)',
    shortName: 'Open-Meteo (ECMWF/GFS/ICON)',
    category: 'NWP_MODEL',
    role: 'Pronósticos numéricos horarios y diarios por coordenada comunal, isoterma 0 °C y dispersión multimodelo',
    url: 'https://open-meteo.com/en/docs',
    apiDocUrl: 'https://api.open-meteo.com/v1/forecast',
    updateFrequencyMinutes: 60,
    ttlMinutes: 180,
    lastUpdatedUtc: '2026-10-19T15:05:00Z',
    status: 'ONLINE',
    accessNotes: 'API pública abierta y verificable en vivo desde el navegador sin API key.'
  },
  {
    id: 'noaa-goes16-gibs',
    name: 'Satélite NOAA GOES-16 (GOES-East ABI) / NASA GIBS / RainViewer',
    shortName: 'GOES-16 ABI / RainViewer',
    category: 'SATELLITE_OBSERVATION',
    role: 'Imágenes satelitales infrarrojas (Banda 13), vapor de agua (Banda 08) y mosaicos animados de precipitación',
    url: 'https://www.star.nesdis.noaa.gov/goes/sector.php?sat=G16&sector=ssa',
    apiDocUrl: 'https://api.rainviewer.com/public/weather-maps.json',
    updateFrequencyMinutes: 10,
    ttlMinutes: 30,
    lastUpdatedUtc: '2026-10-19T15:10:00Z',
    status: 'ONLINE',
    accessNotes: 'Sector Sur de Sudamérica (SSA) cada 10 minutos; teselas abiertas vía RainViewer y NASA GIBS WMTS.'
  },
  {
    id: 'dga-glofas',
    name: 'DGA-MOP / Copernicus GloFAS Hydrological Forecast',
    shortName: 'DGA / GloFAS Hidrología',
    category: 'HYDRO_MODEL',
    role: 'Monitoreo fluviométrico referencial y pronóstico de caudal en cuencas de Chile',
    url: 'https://snia.mop.gob.cl/dga/',
    apiDocUrl: 'https://open-meteo.com/en/docs/flood-api',
    updateFrequencyMinutes: 180,
    ttlMinutes: 720,
    lastUpdatedUtc: '2026-10-19T12:00:00Z',
    status: 'ONLINE',
    accessNotes: 'Combina umbrales históricos de cuencas (CR2 CAMELS-CL / DGA) con pronóstico ensemble GloFAS.'
  },
  {
    id: 'shoa-marine',
    name: 'SHOA / DIRECTEMAR & Open-Meteo Marine Model',
    shortName: 'SHOA / Modelo Oleaje',
    category: 'MARINE_OFFICIAL_AND_MODEL',
    role: 'Avisos de marejadas costeras y pronóstico de altura significativa de ola (Hs) y periodo peak (Tp)',
    url: 'https://www.marejadas.shoa.cl/',
    apiDocUrl: 'https://open-meteo.com/en/docs/marine-weather-api',
    updateFrequencyMinutes: 120,
    ttlMinutes: 360,
    lastUpdatedUtc: '2026-10-19T14:00:00Z',
    status: 'ONLINE',
    accessNotes: 'Boletines oficiales en portal SHOA complementados con modelo numérico de oleaje costero.'
  }
];

export const CHILE_LOCATIONS = [
  {
    id: 'arica',
    cut: '15101',
    name: 'Arica',
    regionCode: 'XV',
    regionNumber: 15,
    regionName: 'Arica y Parinacota',
    macrozone: 'Norte Grande',
    timezone: 'America/Santiago',
    lat: -18.4783,
    lon: -70.3126,
    elevationM: 29,
    basin: 'Río Lluta y San José',
    stationId: 'EMA-180005 Chakalluta',
    observation: {
      tempC: 20.8,
      humidityPct: 71,
      precip1hMm: 0.0,
      precip24hMm: 0.0,
      windKmh: 16,
      windGustKmh: 24,
      windDir: 'SW',
      cloudCoverPct: 45,
      pressureHpa: 1015.2,
      freezingLevelM: 4650,
      conditionText: 'Nubosidad parcial costera (camanchaca matinal)',
      observedAtUtc: '2026-10-19T15:00:00Z',
      sourceId: 'dmc-meteochile'
    },
    summaryRisk: 'INFORMATIVA',
    keyPhenomenon: 'Estabilidad costera; incremento de viento en precordillera andina (Putre/Visviri) por la tarde.',
    hourlyRain48h: [
      { hourOffset: 0, p50: 0, p90: 0, iso0: 4650, wind: 16, temp: 20.8 },
      { hourOffset: 3, p50: 0, p90: 0, iso0: 4700, wind: 20, temp: 22.1 },
      { hourOffset: 6, p50: 0, p90: 0.2, iso0: 4680, wind: 18, temp: 19.4 },
      { hourOffset: 12, p50: 0, p90: 0, iso0: 4600, wind: 12, temp: 16.5 },
      { hourOffset: 18, p50: 0, p90: 0, iso0: 4620, wind: 15, temp: 18.2 },
      { hourOffset: 24, p50: 0, p90: 0.3, iso0: 4700, wind: 19, temp: 21.0 },
      { hourOffset: 30, p50: 0, p90: 0.4, iso0: 4690, wind: 21, temp: 21.8 },
      { hourOffset: 36, p50: 0, p90: 0, iso0: 4610, wind: 14, temp: 17.0 },
      { hourOffset: 42, p50: 0, p90: 0, iso0: 4600, wind: 13, temp: 16.2 },
      { hourOffset: 48, p50: 0, p90: 0.2, iso0: 4660, wind: 17, temp: 20.6 }
    ],
    daily7d: [
      { day: 'Lun 19 Oct', tMin: 16, tMax: 22, tP10: 15, tP90: 23, precipP50: 0.0, precipP90: 0.2, probPct: 5, windMax: 24, snowCm: 0, iso0M: 4650, cloudPct: 45, cond: 'Parcial' },
      { day: 'Mar 20 Oct', tMin: 16, tMax: 22, tP10: 15, tP90: 23, precipP50: 0.0, precipP90: 0.4, probPct: 10, windMax: 26, snowCm: 0, iso0M: 4700, cloudPct: 40, cond: 'Despejado a parcial' },
      { day: 'Mié 21 Oct', tMin: 17, tMax: 23, tP10: 15, tP90: 24, precipP50: 0.0, precipP90: 0.5, probPct: 10, windMax: 25, snowCm: 0, iso0M: 4680, cloudPct: 35, cond: 'Soleado' },
      { day: 'Jue 22 Oct', tMin: 16, tMax: 22, tP10: 15, tP90: 24, precipP50: 0.0, precipP90: 0.5, probPct: 10, windMax: 28, snowCm: 0, iso0M: 4600, cloudPct: 50, cond: 'Nubosidad matinal' },
      { day: 'Vie 23 Oct', tMin: 16, tMax: 22, tP10: 14, tP90: 23, precipP50: 0.0, precipP90: 0.8, probPct: 15, windMax: 30, snowCm: 0, iso0M: 4550, cloudPct: 55, cond: 'Parcial costero' },
      { day: 'Sáb 24 Oct', tMin: 17, tMax: 23, tP10: 15, tP90: 25, precipP50: 0.0, precipP90: 0.6, probPct: 10, windMax: 26, snowCm: 0, iso0M: 4620, cloudPct: 40, cond: 'Despejado' },
      { day: 'Dom 25 Oct', tMin: 17, tMax: 23, tP10: 15, tP90: 25, precipP50: 0.0, precipP90: 0.5, probPct: 10, windMax: 24, snowCm: 0, iso0M: 4650, cloudPct: 35, cond: 'Soleado' }
    ],
    modelsComparison: {
      ecmwf: { precip72h: 0.0, tempMaxAvg: 22.3, iso0Min: 4600, windPeak: 26 },
      gfs: { precip72h: 0.3, tempMaxAvg: 22.8, iso0Min: 4550, windPeak: 29 },
      icon: { precip72h: 0.1, tempMaxAvg: 22.1, iso0Min: 4620, windPeak: 25 },
      spreadNote: 'Alta convergencia entre modelos en costa árida; ligera dispersión de viento en altiplano (>4.000 m s.n.m.).'
    }
  },
  {
    id: 'iquique',
    cut: '01101',
    name: 'Iquique / Alto Hospicio',
    regionCode: 'I',
    regionNumber: 1,
    regionName: 'Tarapacá',
    macrozone: 'Norte Grande',
    timezone: 'America/Santiago',
    lat: -20.2133,
    lon: -70.1503,
    elevationM: 48,
    basin: 'Quebradas Costeras de Tarapacá',
    stationId: 'EMA-200006 Diego Aracena',
    observation: {
      tempC: 19.6,
      humidityPct: 68,
      precip1hMm: 0.0,
      precip24hMm: 0.0,
      windKmh: 18,
      windGustKmh: 28,
      windDir: 'SSW',
      cloudCoverPct: 35,
      pressureHpa: 1015.8,
      freezingLevelM: 4520,
      conditionText: 'Escasa nubosidad y brisa sur-suroeste',
      observedAtUtc: '2026-10-19T15:00:00Z',
      sourceId: 'dmc-meteochile'
    },
    summaryRisk: 'INFORMATIVA',
    keyPhenomenon: 'Marejadas del suroeste de intensidad moderada en borde costero expuesto.',
    hourlyRain48h: [
      { hourOffset: 0, p50: 0, p90: 0, iso0: 4520, wind: 18, temp: 19.6 },
      { hourOffset: 6, p50: 0, p90: 0, iso0: 4550, wind: 22, temp: 20.8 },
      { hourOffset: 12, p50: 0, p90: 0, iso0: 4480, wind: 14, temp: 16.0 },
      { hourOffset: 18, p50: 0, p90: 0, iso0: 4500, wind: 16, temp: 17.4 },
      { hourOffset: 24, p50: 0, p90: 0, iso0: 4540, wind: 20, temp: 20.2 },
      { hourOffset: 30, p50: 0, p90: 0, iso0: 4530, wind: 23, temp: 21.0 },
      { hourOffset: 36, p50: 0, p90: 0, iso0: 4490, wind: 15, temp: 16.4 },
      { hourOffset: 42, p50: 0, p90: 0, iso0: 4470, wind: 14, temp: 15.8 },
      { hourOffset: 48, p50: 0, p90: 0, iso0: 4510, wind: 19, temp: 19.9 }
    ],
    daily7d: [
      { day: 'Lun 19 Oct', tMin: 15, tMax: 21, tP10: 14, tP90: 22, precipP50: 0.0, precipP90: 0.0, probPct: 0, windMax: 28, snowCm: 0, iso0M: 4520, cloudPct: 35, cond: 'Despejado' },
      { day: 'Mar 20 Oct', tMin: 15, tMax: 21, tP10: 14, tP90: 22, precipP50: 0.0, precipP90: 0.0, probPct: 5, windMax: 30, snowCm: 0, iso0M: 4540, cloudPct: 30, cond: 'Despejado' },
      { day: 'Mié 21 Oct', tMin: 16, tMax: 22, tP10: 15, tP90: 23, precipP50: 0.0, precipP90: 0.0, probPct: 5, windMax: 27, snowCm: 0, iso0M: 4500, cloudPct: 40, cond: 'Parcial matinal' },
      { day: 'Jue 22 Oct', tMin: 15, tMax: 21, tP10: 14, tP90: 22, precipP50: 0.0, precipP90: 0.1, probPct: 5, windMax: 29, snowCm: 0, iso0M: 4480, cloudPct: 45, cond: 'Parcial' },
      { day: 'Vie 23 Oct', tMin: 15, tMax: 21, tP10: 14, tP90: 22, precipP50: 0.0, precipP90: 0.1, probPct: 5, windMax: 31, snowCm: 0, iso0M: 4460, cloudPct: 40, cond: 'Soleado' },
      { day: 'Sáb 24 Oct', tMin: 16, tMax: 22, tP10: 15, tP90: 23, precipP50: 0.0, precipP90: 0.0, probPct: 5, windMax: 26, snowCm: 0, iso0M: 4500, cloudPct: 25, cond: 'Soleado' },
      { day: 'Dom 25 Oct', tMin: 16, tMax: 22, tP10: 15, tP90: 23, precipP50: 0.0, precipP90: 0.0, probPct: 5, windMax: 25, snowCm: 0, iso0M: 4550, cloudPct: 20, cond: 'Soleado' }
    ],
    modelsComparison: {
      ecmwf: { precip72h: 0.0, tempMaxAvg: 21.3, iso0Min: 4480, windPeak: 30 },
      gfs: { precip72h: 0.0, tempMaxAvg: 21.7, iso0Min: 4450, windPeak: 32 },
      icon: { precip72h: 0.0, tempMaxAvg: 21.1, iso0Min: 4500, windPeak: 28 },
      spreadNote: 'Acuerdo total en ausencia de lluvias costeras; leve variación en grosor de estratocúmulos.'
    }
  },
  {
    id: 'antofagasta',
    cut: '02101',
    name: 'Antofagasta / Calama',
    regionCode: 'II',
    regionNumber: 2,
    regionName: 'Antofagasta',
    macrozone: 'Norte Grande',
    timezone: 'America/Santiago',
    lat: -23.6509,
    lon: -70.3975,
    elevationM: 40,
    basin: 'Río Loa y Quebradas Costeras de Antofagasta',
    stationId: 'EMA-230001 Cerro Moreno',
    observation: {
      tempC: 18.4,
      humidityPct: 69,
      precip1hMm: 0.0,
      precip24hMm: 0.0,
      windKmh: 24,
      windGustKmh: 41,
      windDir: 'SW',
      cloudCoverPct: 30,
      pressureHpa: 1016.4,
      freezingLevelM: 4320,
      conditionText: 'Despejado con viento costero moderado y rachas en sector alto',
      observedAtUtc: '2026-10-19T15:00:00Z',
      sourceId: 'dmc-meteochile'
    },
    summaryRisk: 'PREVENTIVA',
    keyPhenomenon: 'Rachas de viento de 60-80 km/h en cordillera y precordillera (Calama / Ollagüe) por corriente en chorro subtropical.',
    hourlyRain48h: [
      { hourOffset: 0, p50: 0, p90: 0, iso0: 4320, wind: 24, temp: 18.4 },
      { hourOffset: 6, p50: 0, p90: 0, iso0: 4300, wind: 34, temp: 19.8 },
      { hourOffset: 12, p50: 0, p90: 0, iso0: 4210, wind: 22, temp: 14.9 },
      { hourOffset: 18, p50: 0, p90: 0, iso0: 4180, wind: 26, temp: 16.1 },
      { hourOffset: 24, p50: 0, p90: 0, iso0: 4250, wind: 38, temp: 19.2 },
      { hourOffset: 30, p50: 0, p90: 0, iso0: 4220, wind: 42, temp: 19.6 },
      { hourOffset: 36, p50: 0, p90: 0, iso0: 4150, wind: 25, temp: 15.0 },
      { hourOffset: 42, p50: 0, p90: 0, iso0: 4140, wind: 21, temp: 14.4 },
      { hourOffset: 48, p50: 0, p90: 0, iso0: 4260, wind: 32, temp: 18.9 }
    ],
    daily7d: [
      { day: 'Lun 19 Oct', tMin: 14, tMax: 20, tP10: 13, tP90: 21, precipP50: 0.0, precipP90: 0.0, probPct: 0, windMax: 41, snowCm: 0, iso0M: 4320, cloudPct: 30, cond: 'Viento moderado' },
      { day: 'Mar 20 Oct', tMin: 14, tMax: 20, tP10: 13, tP90: 21, precipP50: 0.0, precipP90: 0.0, probPct: 5, windMax: 48, snowCm: 0, iso0M: 4220, cloudPct: 25, cond: 'Ventoso en interior' },
      { day: 'Mié 21 Oct', tMin: 14, tMax: 19, tP10: 13, tP90: 21, precipP50: 0.0, precipP90: 0.2, probPct: 5, windMax: 52, snowCm: 0, iso0M: 4150, cloudPct: 35, cond: 'Viento y polvo interior' },
      { day: 'Jue 22 Oct', tMin: 14, tMax: 20, tP10: 13, tP90: 21, precipP50: 0.0, precipP90: 0.0, probPct: 5, windMax: 38, snowCm: 0, iso0M: 4280, cloudPct: 30, cond: 'Despejado' },
      { day: 'Vie 23 Oct', tMin: 15, tMax: 20, tP10: 13, tP90: 22, precipP50: 0.0, precipP90: 0.0, probPct: 0, windMax: 34, snowCm: 0, iso0M: 4350, cloudPct: 25, cond: 'Soleado' },
      { day: 'Sáb 24 Oct', tMin: 15, tMax: 21, tP10: 14, tP90: 22, precipP50: 0.0, precipP90: 0.0, probPct: 0, windMax: 30, snowCm: 0, iso0M: 4400, cloudPct: 20, cond: 'Soleado' },
      { day: 'Dom 25 Oct', tMin: 15, tMax: 21, tP10: 14, tP90: 22, precipP50: 0.0, precipP90: 0.0, probPct: 0, windMax: 28, snowCm: 0, iso0M: 4420, cloudPct: 20, cond: 'Soleado' }
    ],
    modelsComparison: {
      ecmwf: { precip72h: 0.0, tempMaxAvg: 19.8, iso0Min: 4150, windPeak: 52 },
      gfs: { precip72h: 0.0, tempMaxAvg: 20.2, iso0Min: 4100, windPeak: 58 },
      icon: { precip72h: 0.0, tempMaxAvg: 19.6, iso0Min: 4180, windPeak: 49 },
      spreadNote: 'GFS proyecta rachas hasta 12% más intensas en la cuenca alta del Loa respecto a ECMWF e ICON.'
    }
  },
  {
    id: 'copiapo',
    cut: '03101',
    name: 'Copiapó',
    regionCode: 'III',
    regionNumber: 3,
    regionName: 'Atacama',
    macrozone: 'Norte Chico',
    timezone: 'America/Santiago',
    lat: -27.3668,
    lon: -70.3322,
    elevationM: 391,
    basin: 'Río Copiapó',
    stationId: 'EMA-270001 Chamonate',
    observation: {
      tempC: 23.4,
      humidityPct: 44,
      precip1hMm: 0.0,
      precip24hMm: 0.0,
      windKmh: 15,
      windGustKmh: 25,
      windDir: 'W',
      cloudCoverPct: 20,
      pressureHpa: 1014.9,
      freezingLevelM: 4050,
      conditionText: 'Despejado con ingreso de nubosidad alta por vaguada en altura',
      observedAtUtc: '2026-10-19T15:00:00Z',
      sourceId: 'dmc-meteochile'
    },
    summaryRisk: 'INFORMATIVA',
    keyPhenomenon: 'Aumento de nubosidad alta y viento cordillerano sobre 3.500 m s.n.m.',
    hourlyRain48h: [
      { hourOffset: 0, p50: 0, p90: 0, iso0: 4050, wind: 15, temp: 23.4 },
      { hourOffset: 6, p50: 0, p90: 0, iso0: 4010, wind: 22, temp: 25.8 },
      { hourOffset: 12, p50: 0, p90: 0, iso0: 3920, wind: 10, temp: 12.6 },
      { hourOffset: 18, p50: 0, p90: 0.2, iso0: 3880, wind: 12, temp: 15.1 },
      { hourOffset: 24, p50: 0, p90: 0.5, iso0: 3850, wind: 20, temp: 24.1 },
      { hourOffset: 30, p50: 0, p90: 0.8, iso0: 3800, wind: 24, temp: 24.9 },
      { hourOffset: 36, p50: 0, p90: 0.3, iso0: 3780, wind: 11, temp: 12.2 },
      { hourOffset: 42, p50: 0, p90: 0, iso0: 3820, wind: 10, temp: 11.8 },
      { hourOffset: 48, p50: 0, p90: 0, iso0: 3910, wind: 18, temp: 23.7 }
    ],
    daily7d: [
      { day: 'Lun 19 Oct', tMin: 11, tMax: 26, tP10: 10, tP90: 28, precipP50: 0.0, precipP90: 0.0, probPct: 5, windMax: 25, snowCm: 0, iso0M: 4050, cloudPct: 20, cond: 'Soleado' },
      { day: 'Mar 20 Oct', tMin: 11, tMax: 25, tP10: 10, tP90: 27, precipP50: 0.0, precipP90: 0.8, probPct: 10, windMax: 28, snowCm: 0, iso0M: 3850, cloudPct: 40, cond: 'Nubosidad alta' },
      { day: 'Mié 21 Oct', tMin: 10, tMax: 24, tP10: 9, tP90: 26, precipP50: 0.0, precipP90: 1.2, probPct: 15, windMax: 30, snowCm: 0, iso0M: 3780, cloudPct: 45, cond: 'Parcial' },
      { day: 'Jue 22 Oct', tMin: 11, tMax: 26, tP10: 10, tP90: 28, precipP50: 0.0, precipP90: 0.2, probPct: 5, windMax: 24, snowCm: 0, iso0M: 3950, cloudPct: 25, cond: 'Despejado' },
      { day: 'Vie 23 Oct', tMin: 12, tMax: 27, tP10: 11, tP90: 29, precipP50: 0.0, precipP90: 0.0, probPct: 0, windMax: 22, snowCm: 0, iso0M: 4100, cloudPct: 15, cond: 'Soleado' },
      { day: 'Sáb 24 Oct', tMin: 12, tMax: 28, tP10: 11, tP90: 30, precipP50: 0.0, precipP90: 0.0, probPct: 0, windMax: 22, snowCm: 0, iso0M: 4150, cloudPct: 10, cond: 'Soleado' },
      { day: 'Dom 25 Oct', tMin: 12, tMax: 27, tP10: 11, tP90: 29, precipP50: 0.0, precipP90: 0.0, probPct: 0, windMax: 23, snowCm: 0, iso0M: 4120, cloudPct: 15, cond: 'Soleado' }
    ],
    modelsComparison: {
      ecmwf: { precip72h: 0.0, tempMaxAvg: 25.0, iso0Min: 3780, windPeak: 30 },
      gfs: { precip72h: 0.9, tempMaxAvg: 25.4, iso0Min: 3720, windPeak: 34 },
      icon: { precip72h: 0.2, tempMaxAvg: 24.8, iso0Min: 3810, windPeak: 28 },
      spreadNote: 'GFS simula débil inestabilidad en alta cordillera de Atacama el miércoles; valle permanece seco en los 3 modelos.'
    }
  },
  {
    id: 'laserena',
    cut: '04101',
    name: 'La Serena / Coquimbo',
    regionCode: 'IV',
    regionNumber: 4,
    regionName: 'Coquimbo',
    macrozone: 'Norte Chico',
    timezone: 'America/Santiago',
    lat: -29.9027,
    lon: -71.2519,
    elevationM: 142,
    basin: 'Río Elqui',
    stationId: 'EMA-290004 La Florida',
    observation: {
      tempC: 16.2,
      humidityPct: 79,
      precip1hMm: 0.0,
      precip24hMm: 0.4,
      windKmh: 19,
      windGustKmh: 31,
      windDir: 'NW',
      cloudCoverPct: 80,
      pressureHpa: 1015.0,
      freezingLevelM: 3580,
      conditionText: 'Cubierto con llovizna costera ocasional y aproximación de banda prefrontal',
      observedAtUtc: '2026-10-19T15:00:00Z',
      sourceId: 'dmc-meteochile'
    },
    summaryRisk: 'PREVENTIVA',
    keyPhenomenon: 'Probabilidad de chubascos débiles en precordillera de Elqui y Limarí más marejadas del WNW.',
    hourlyRain48h: [
      { hourOffset: 0, p50: 0.0, p90: 0.3, iso0: 3580, wind: 19, temp: 16.2 },
      { hourOffset: 6, p50: 0.2, p90: 1.1, iso0: 3450, wind: 24, temp: 17.1 },
      { hourOffset: 12, p50: 0.8, p90: 2.8, iso0: 3300, wind: 22, temp: 13.0 },
      { hourOffset: 18, p50: 1.4, p90: 4.5, iso0: 3180, wind: 26, temp: 13.8 },
      { hourOffset: 24, p50: 0.6, p90: 2.2, iso0: 3220, wind: 21, temp: 16.4 },
      { hourOffset: 30, p50: 0.1, p90: 0.8, iso0: 3350, wind: 18, temp: 17.0 },
      { hourOffset: 36, p50: 0.0, p90: 0.3, iso0: 3400, wind: 14, temp: 12.1 },
      { hourOffset: 42, p50: 0.0, p90: 0.0, iso0: 3480, wind: 13, temp: 11.6 },
      { hourOffset: 48, p50: 0.0, p90: 0.0, iso0: 3550, wind: 17, temp: 17.5 }
    ],
    daily7d: [
      { day: 'Lun 19 Oct', tMin: 12, tMax: 17, tP10: 11, tP90: 19, precipP50: 0.5, precipP90: 2.1, probPct: 35, windMax: 31, snowCm: 0, iso0M: 3580, cloudPct: 80, cond: 'Nublado y llovizna' },
      { day: 'Mar 20 Oct', tMin: 11, tMax: 16, tP10: 10, tP90: 18, precipP50: 2.8, precipP90: 8.5, probPct: 55, windMax: 36, snowCm: 4, iso0M: 3180, cloudPct: 85, cond: 'Chubascos débiles' },
      { day: 'Mié 21 Oct', tMin: 10, tMax: 18, tP10: 9, tP90: 20, precipP50: 0.2, precipP90: 1.4, probPct: 20, windMax: 28, snowCm: 1, iso0M: 3400, cloudPct: 55, cond: 'Nubosidad parcial' },
      { day: 'Jue 22 Oct', tMin: 10, tMax: 19, tP10: 9, tP90: 21, precipP50: 0.0, precipP90: 0.0, probPct: 5, windMax: 24, snowCm: 0, iso0M: 3650, cloudPct: 35, cond: 'Despejado tarde' },
      { day: 'Vie 23 Oct', tMin: 11, tMax: 20, tP10: 10, tP90: 22, precipP50: 0.0, precipP90: 0.0, probPct: 5, windMax: 22, snowCm: 0, iso0M: 3800, cloudPct: 30, cond: 'Soleado' },
      { day: 'Sáb 24 Oct', tMin: 11, tMax: 20, tP10: 10, tP90: 22, precipP50: 0.0, precipP90: 0.0, probPct: 5, windMax: 23, snowCm: 0, iso0M: 3850, cloudPct: 35, cond: 'Parcial matinal' },
      { day: 'Dom 25 Oct', tMin: 12, tMax: 19, tP10: 10, tP90: 21, precipP50: 0.0, precipP90: 0.3, probPct: 10, windMax: 25, snowCm: 0, iso0M: 3780, cloudPct: 45, cond: 'Parcial' }
    ],
    modelsComparison: {
      ecmwf: { precip72h: 3.5, tempMaxAvg: 17.0, iso0Min: 3180, windPeak: 36 },
      gfs: { precip72h: 6.8, tempMaxAvg: 16.5, iso0Min: 3050, windPeak: 40 },
      icon: { precip72h: 2.1, tempMaxAvg: 17.3, iso0Min: 3250, windPeak: 33 },
      spreadNote: 'Incertidumbre moderada en el borde norte del sistema frontal: GFS extiende precipitaciones hasta Elqui mientras ICON las restringe a Choapa.'
    }
  },
  {
    id: 'valparaiso',
    cut: '05101',
    name: 'Valparaíso / Viña del Mar',
    regionCode: 'V',
    regionNumber: 5,
    regionName: 'Valparaíso',
    macrozone: 'Zona Central',
    timezone: 'America/Santiago',
    lat: -33.0472,
    lon: -71.6127,
    elevationM: 41,
    basin: 'Río Aconcagua y Cuencas Costeras Quinta Región',
    stationId: 'EMA-330007 Rodelillo / Faro Punta Ángeles',
    observation: {
      tempC: 14.8,
      humidityPct: 86,
      precip1hMm: 1.6,
      precip24hMm: 8.4,
      windKmh: 38,
      windGustKmh: 62,
      windDir: 'NNW',
      cloudCoverPct: 95,
      pressureHpa: 1009.4,
      freezingLevelM: 2950,
      conditionText: 'Cubierto, lluvia débil a moderada y rachas de viento norte-noroeste en borde costero',
      observedAtUtc: '2026-10-19T15:00:00Z',
      sourceId: 'dmc-meteochile'
    },
    summaryRisk: 'TEMPRANA',
    keyPhenomenon: 'Sistema frontal activo con transporte de vapor (río atmosférico débil a moderado), rachas costeras de hasta 65 km/h y marejadas.',
    hourlyRain48h: [
      { hourOffset: 0, p50: 1.6, p90: 3.2, iso0: 2950, wind: 38, temp: 14.8 },
      { hourOffset: 3, p50: 3.8, p90: 7.4, iso0: 2880, wind: 46, temp: 14.2 },
      { hourOffset: 6, p50: 6.2, p90: 11.5, iso0: 2790, wind: 52, temp: 13.6 },
      { hourOffset: 9, p50: 5.1, p90: 9.8, iso0: 2650, wind: 44, temp: 12.9 },
      { hourOffset: 12, p50: 2.9, p90: 6.0, iso0: 2480, wind: 35, temp: 11.8 },
      { hourOffset: 18, p50: 1.2, p90: 3.1, iso0: 2350, wind: 28, temp: 11.4 },
      { hourOffset: 24, p50: 0.4, p90: 1.5, iso0: 2300, wind: 22, temp: 14.5 },
      { hourOffset: 30, p50: 0.0, p90: 0.6, iso0: 2420, wind: 19, temp: 15.1 },
      { hourOffset: 36, p50: 0.0, p90: 0.2, iso0: 2550, wind: 15, temp: 10.6 },
      { hourOffset: 48, p50: 0.0, p90: 0.0, iso0: 2850, wind: 18, temp: 16.8 }
    ],
    daily7d: [
      { day: 'Lun 19 Oct', tMin: 11, tMax: 15, tP10: 10, tP90: 16, precipP50: 24.5, precipP90: 42.0, probPct: 90, windMax: 62, snowCm: 12, iso0M: 2880, cloudPct: 95, cond: 'Lluvia y viento costero' },
      { day: 'Mar 20 Oct', tMin: 10, tMax: 15, tP10: 9, tP90: 17, precipP50: 11.2, precipP90: 21.5, probPct: 75, windMax: 45, snowCm: 18, iso0M: 2350, cloudPct: 80, cond: 'Chubascos postfrontales' },
      { day: 'Mié 21 Oct', tMin: 8, tMax: 16, tP10: 7, tP90: 18, precipP50: 0.5, precipP90: 2.4, probPct: 20, windMax: 26, snowCm: 2, iso0M: 2550, cloudPct: 45, cond: 'Parcial y frío matinal' },
      { day: 'Jue 22 Oct', tMin: 9, tMax: 18, tP10: 8, tP90: 20, precipP50: 0.0, precipP90: 0.0, probPct: 5, windMax: 24, snowCm: 0, iso0M: 3100, cloudPct: 25, cond: 'Despejado' },
      { day: 'Vie 23 Oct', tMin: 10, tMax: 19, tP10: 9, tP90: 21, precipP50: 0.0, precipP90: 0.0, probPct: 5, windMax: 25, snowCm: 0, iso0M: 3350, cloudPct: 20, cond: 'Soleado' },
      { day: 'Sáb 24 Oct', tMin: 11, tMax: 18, tP10: 9, tP90: 20, precipP50: 0.0, precipP90: 0.4, probPct: 10, windMax: 28, snowCm: 0, iso0M: 3250, cloudPct: 40, cond: 'Nubosidad parcial' },
      { day: 'Dom 25 Oct', tMin: 11, tMax: 17, tP10: 10, tP90: 19, precipP50: 0.0, precipP90: 0.8, probPct: 15, windMax: 26, snowCm: 0, iso0M: 3150, cloudPct: 50, cond: 'Parcial' }
    ],
    modelsComparison: {
      ecmwf: { precip72h: 36.2, tempMaxAvg: 15.3, iso0Min: 2350, windPeak: 62 },
      gfs: { precip72h: 44.8, tempMaxAvg: 15.0, iso0Min: 2480, windPeak: 68 },
      icon: { precip72h: 31.5, tempMaxAvg: 15.6, iso0Min: 2300, windPeak: 58 },
      spreadNote: 'Los 3 modelos confirman pulso principal en las próximas 12 h; GFS proyecta mayor acumulado por retención orográfica en cordillera de la Costa.'
    }
  },
  {
    id: 'santiago',
    cut: '13101',
    name: 'Santiago / San José de Maipo',
    regionCode: 'RM',
    regionNumber: 13,
    regionName: 'Metropolitana de Santiago',
    macrozone: 'Zona Central',
    timezone: 'America/Santiago',
    lat: -33.4489,
    lon: -70.6693,
    elevationM: 527,
    basin: 'Río Maipo y Río Mapocho',
    stationId: 'EMA-330020 Quinta Normal / San José de Maipo',
    observation: {
      tempC: 13.4,
      humidityPct: 84,
      precip1hMm: 2.4,
      precip24hMm: 11.8,
      windKmh: 22,
      windGustKmh: 41,
      windDir: 'NNW',
      cloudCoverPct: 98,
      pressureHpa: 1010.1,
      freezingLevelM: 3050,
      conditionText: 'Cubierto con lluvia moderada e isoterma 0 °C elevada en sector cordillerano (3.050 m s.n.m.)',
      observedAtUtc: '2026-10-19T15:00:00Z',
      sourceId: 'dmc-meteochile'
    },
    summaryRisk: 'EXTREMA',
    keyPhenomenon: 'Precipitación moderada a fuerte acoplada con isoterma 0 °C entre 2.900 y 3.150 m s.n.m. en primeras horas del pulso, generando escorrentía pluvial en subcuencas precordilleranas del Maipo y Mapocho.',
    hourlyRain48h: [
      { hourOffset: 0, p50: 2.4, p90: 4.5, iso0: 3050, wind: 22, temp: 13.4 },
      { hourOffset: 3, p50: 4.9, p90: 8.8, iso0: 3120, wind: 31, temp: 13.1 },
      { hourOffset: 6, p50: 7.4, p90: 13.2, iso0: 2980, wind: 36, temp: 12.6 },
      { hourOffset: 9, p50: 6.1, p90: 11.0, iso0: 2740, wind: 29, temp: 11.5 },
      { hourOffset: 12, p50: 3.8, p90: 7.2, iso0: 2450, wind: 24, temp: 10.2 },
      { hourOffset: 18, p50: 2.1, p90: 4.4, iso0: 2180, wind: 19, temp: 9.4 },
      { hourOffset: 24, p50: 0.9, p90: 2.5, iso0: 2050, wind: 16, temp: 13.8 },
      { hourOffset: 30, p50: 0.3, p90: 1.1, iso0: 2150, wind: 14, temp: 14.6 },
      { hourOffset: 36, p50: 0.0, p90: 0.3, iso0: 2300, wind: 10, temp: 7.2 },
      { hourOffset: 42, p50: 0.0, p90: 0.0, iso0: 2480, wind: 9, temp: 5.8 },
      { hourOffset: 48, p50: 0.0, p90: 0.0, iso0: 2750, wind: 14, temp: 17.4 }
    ],
    daily7d: [
      { day: 'Lun 19 Oct', tMin: 10, tMax: 14, tP10: 9, tP90: 15, precipP50: 32.0, precipP90: 54.5, probPct: 95, windMax: 44, snowCm: 22, iso0M: 3050, cloudPct: 98, cond: 'Lluvia intensa e Iso 0°C alta' },
      { day: 'Mar 20 Oct', tMin: 7, tMax: 15, tP10: 6, tP90: 17, precipP50: 14.5, precipP90: 26.0, probPct: 80, windMax: 32, snowCm: 35, iso0M: 2150, cloudPct: 85, cond: 'Chubascos y descenso térmico' },
      { day: 'Mié 21 Oct', tMin: 4, tMax: 17, tP10: 2, tP90: 19, precipP50: 0.8, precipP90: 3.0, probPct: 25, windMax: 20, snowCm: 4, iso0M: 2300, cloudPct: 40, cond: 'Parcial y frío matinal' },
      { day: 'Jue 22 Oct', tMin: 5, tMax: 21, tP10: 4, tP90: 23, precipP50: 0.0, precipP90: 0.0, probPct: 5, windMax: 18, snowCm: 0, iso0M: 3100, cloudPct: 15, cond: 'Despejado' },
      { day: 'Vie 23 Oct', tMin: 7, tMax: 24, tP10: 6, tP90: 26, precipP50: 0.0, precipP90: 0.0, probPct: 5, windMax: 19, snowCm: 0, iso0M: 3450, cloudPct: 10, cond: 'Soleado y templado' },
      { day: 'Sáb 24 Oct', tMin: 8, tMax: 23, tP10: 7, tP90: 25, precipP50: 0.0, precipP90: 0.2, probPct: 10, windMax: 21, snowCm: 0, iso0M: 3380, cloudPct: 25, cond: 'Nubosidad parcial' },
      { day: 'Dom 25 Oct', tMin: 8, tMax: 21, tP10: 7, tP90: 23, precipP50: 0.0, precipP90: 0.8, probPct: 15, windMax: 20, snowCm: 0, iso0M: 3200, cloudPct: 40, cond: 'Parcial' }
    ],
    modelsComparison: {
      ecmwf: { precip72h: 47.3, tempMaxAvg: 15.3, iso0Min: 2150, windPeak: 44 },
      gfs: { precip72h: 58.1, tempMaxAvg: 14.9, iso0Min: 2320, windPeak: 49 },
      icon: { precip72h: 41.0, tempMaxAvg: 15.6, iso0Min: 2080, windPeak: 40 },
      spreadNote: 'Diferencia clave en altura de isoterma 0 °C durante las primeras 9 horas: GFS la mantiene sobre 2.950 m por 3 horas adicionales respecto a ECMWF, incrementando el volumen de escorrentía líquida estimada en San José de Maipo.'
    }
  },
  {
    id: 'rancagua',
    cut: '06101',
    name: 'Rancagua / Machalí',
    regionCode: 'VI',
    regionNumber: 6,
    regionName: "Libertador General Bernardo O'Higgins",
    macrozone: 'Zona Central',
    timezone: 'America/Santiago',
    lat: -34.1708,
    lon: -70.7444,
    elevationM: 572,
    basin: 'Río Cachapoal y Río Tinguiririca',
    stationId: 'EMA-340045 Rancagua',
    observation: {
      tempC: 12.9,
      humidityPct: 88,
      precip1hMm: 3.1,
      precip24hMm: 16.4,
      windKmh: 28,
      windGustKmh: 48,
      windDir: 'N',
      cloudCoverPct: 100,
      pressureHpa: 1008.7,
      freezingLevelM: 2890,
      conditionText: 'Lluvia moderada continua con viento norte',
      observedAtUtc: '2026-10-19T15:00:00Z',
      sourceId: 'dmc-meteochile'
    },
    summaryRisk: 'TEMPRANA',
    keyPhenomenon: 'Precipitaciones intensas en precordillera de Cachapoal y Tinguiririca con aumento de caudal esperado.',
    hourlyRain48h: [
      { hourOffset: 0, p50: 3.1, p90: 5.8, iso0: 2890, wind: 28, temp: 12.9 },
      { hourOffset: 6, p50: 6.8, p90: 12.0, iso0: 2750, wind: 38, temp: 12.2 },
      { hourOffset: 12, p50: 4.5, p90: 8.4, iso0: 2350, wind: 27, temp: 10.1 },
      { hourOffset: 18, p50: 2.2, p90: 4.8, iso0: 2050, wind: 20, temp: 8.9 },
      { hourOffset: 24, p50: 1.0, p90: 2.6, iso0: 1980, wind: 17, temp: 13.0 },
      { hourOffset: 30, p50: 0.4, p90: 1.2, iso0: 2080, wind: 15, temp: 13.8 },
      { hourOffset: 36, p50: 0.0, p90: 0.2, iso0: 2200, wind: 10, temp: 6.4 },
      { hourOffset: 42, p50: 0.0, p90: 0.0, iso0: 2350, wind: 8, temp: 4.9 },
      { hourOffset: 48, p50: 0.0, p90: 0.0, iso0: 2650, wind: 12, temp: 16.5 }
    ],
    daily7d: [
      { day: 'Lun 19 Oct', tMin: 9, tMax: 14, tP10: 8, tP90: 15, precipP50: 38.0, precipP90: 62.0, probPct: 95, windMax: 48, snowCm: 28, iso0M: 2890, cloudPct: 100, cond: 'Lluvia moderada a fuerte' },
      { day: 'Mar 20 Oct', tMin: 6, tMax: 14, tP10: 5, tP90: 16, precipP50: 16.0, precipP90: 29.0, probPct: 85, windMax: 34, snowCm: 40, iso0M: 1980, cloudPct: 85, cond: 'Chubascos y nieve andina' },
      { day: 'Mié 21 Oct', tMin: 3, tMax: 16, tP10: 1, tP90: 18, precipP50: 1.0, precipP90: 3.5, probPct: 25, windMax: 20, snowCm: 5, iso0M: 2200, cloudPct: 40, cond: 'Helada local en valles' },
      { day: 'Jue 22 Oct', tMin: 4, tMax: 20, tP10: 3, tP90: 22, precipP50: 0.0, precipP90: 0.0, probPct: 5, windMax: 17, snowCm: 0, iso0M: 2950, cloudPct: 15, cond: 'Despejado' },
      { day: 'Vie 23 Oct', tMin: 6, tMax: 23, tP10: 5, tP90: 25, precipP50: 0.0, precipP90: 0.0, probPct: 5, windMax: 18, snowCm: 0, iso0M: 3300, cloudPct: 10, cond: 'Soleado' },
      { day: 'Sáb 24 Oct', tMin: 7, tMax: 22, tP10: 6, tP90: 24, precipP50: 0.0, precipP90: 0.5, probPct: 10, windMax: 20, snowCm: 0, iso0M: 3200, cloudPct: 30, cond: 'Parcial' },
      { day: 'Dom 25 Oct', tMin: 7, tMax: 20, tP10: 6, tP90: 22, precipP50: 0.0, precipP90: 1.2, probPct: 15, windMax: 21, snowCm: 0, iso0M: 3050, cloudPct: 45, cond: 'Parcial' }
    ],
    modelsComparison: {
      ecmwf: { precip72h: 55.0, tempMaxAvg: 14.7, iso0Min: 1980, windPeak: 48 },
      gfs: { precip72h: 64.2, tempMaxAvg: 14.3, iso0Min: 2100, windPeak: 54 },
      icon: { precip72h: 49.5, tempMaxAvg: 15.0, iso0Min: 1950, windPeak: 45 },
      spreadNote: 'Alta confianza en superación de 45 mm en valle y >70 mm en precordillera.'
    }
  },
  {
    id: 'talca',
    cut: '07101',
    name: 'Talca / Curicó',
    regionCode: 'VII',
    regionNumber: 7,
    regionName: 'Maule',
    macrozone: 'Zona Central',
    timezone: 'America/Santiago',
    lat: -35.4264,
    lon: -71.6554,
    elevationM: 102,
    basin: 'Río Maule y Río Mataquito',
    stationId: 'EMA-350028 Universidad de Talca',
    observation: {
      tempC: 12.1,
      humidityPct: 92,
      precip1hMm: 4.8,
      precip24hMm: 29.6,
      windKmh: 34,
      windGustKmh: 58,
      windDir: 'NNW',
      cloudCoverPct: 100,
      pressureHpa: 1006.3,
      freezingLevelM: 2680,
      conditionText: 'Lluvia fuerte y rachas de viento norte en el valle longitudinal',
      observedAtUtc: '2026-10-19T15:00:00Z',
      sourceId: 'dmc-meteochile'
    },
    summaryRisk: 'EXTREMA',
    keyPhenomenon: 'Pulso intenso de precipitación sobre cuencas del Mataquito y Maule con acumulados de 50-85 mm en 48 h y riesgo de crecidas rápidas.',
    hourlyRain48h: [
      { hourOffset: 0, p50: 4.8, p90: 8.2, iso0: 2680, wind: 34, temp: 12.1 },
      { hourOffset: 3, p50: 6.5, p90: 11.4, iso0: 2620, wind: 42, temp: 11.8 },
      { hourOffset: 6, p50: 5.9, p90: 10.5, iso0: 2450, wind: 39, temp: 11.2 },
      { hourOffset: 12, p50: 3.4, p90: 6.8, iso0: 2050, wind: 28, temp: 9.5 },
      { hourOffset: 18, p50: 2.0, p90: 4.2, iso0: 1820, wind: 22, temp: 8.4 },
      { hourOffset: 24, p50: 1.1, p90: 2.8, iso0: 1750, wind: 18, temp: 12.6 },
      { hourOffset: 30, p50: 0.4, p90: 1.3, iso0: 1850, wind: 15, temp: 13.2 },
      { hourOffset: 36, p50: 0.0, p90: 0.4, iso0: 1950, wind: 9, temp: 5.5 },
      { hourOffset: 42, p50: 0.0, p90: 0.0, iso0: 2100, wind: 7, temp: 3.2 },
      { hourOffset: 48, p50: 0.0, p90: 0.0, iso0: 2450, wind: 11, temp: 15.8 }
    ],
    daily7d: [
      { day: 'Lun 19 Oct', tMin: 9, tMax: 13, tP10: 8, tP90: 14, precipP50: 45.0, precipP90: 74.0, probPct: 98, windMax: 58, snowCm: 35, iso0M: 2680, cloudPct: 100, cond: 'Temporal de lluvia y viento' },
      { day: 'Mar 20 Oct', tMin: 5, tMax: 14, tP10: 4, tP90: 15, precipP50: 18.0, precipP90: 31.0, probPct: 85, windMax: 36, snowCm: 45, iso0M: 1750, cloudPct: 80, cond: 'Chubascos y descenso de isoterma' },
      { day: 'Mié 21 Oct', tMin: 2, tMax: 15, tP10: 0, tP90: 17, precipP50: 0.8, precipP90: 2.8, probPct: 20, windMax: 18, snowCm: 3, iso0M: 1950, cloudPct: 35, cond: 'Riesgo de helada matinal' },
      { day: 'Jue 22 Oct', tMin: 3, tMax: 19, tP10: 2, tP90: 21, precipP50: 0.0, precipP90: 0.0, probPct: 5, windMax: 16, snowCm: 0, iso0M: 2800, cloudPct: 20, cond: 'Despejado' },
      { day: 'Vie 23 Oct', tMin: 5, tMax: 22, tP10: 4, tP90: 24, precipP50: 0.0, precipP90: 0.0, probPct: 5, windMax: 18, snowCm: 0, iso0M: 3100, cloudPct: 15, cond: 'Soleado' },
      { day: 'Sáb 24 Oct', tMin: 6, tMax: 20, tP10: 5, tP90: 22, precipP50: 0.5, precipP90: 2.0, probPct: 20, windMax: 22, snowCm: 0, iso0M: 2950, cloudPct: 50, cond: 'Nubosidad en aumento' },
      { day: 'Dom 25 Oct', tMin: 7, tMax: 18, tP10: 6, tP90: 20, precipP50: 2.5, precipP90: 7.0, probPct: 40, windMax: 25, snowCm: 2, iso0M: 2650, cloudPct: 70, cond: 'Chubascos débiles' }
    ],
    modelsComparison: {
      ecmwf: { precip72h: 63.8, tempMaxAvg: 14.0, iso0Min: 1750, windPeak: 58 },
      gfs: { precip72h: 71.5, tempMaxAvg: 13.8, iso0Min: 1850, windPeak: 63 },
      icon: { precip72h: 59.2, tempMaxAvg: 14.2, iso0Min: 1700, windPeak: 55 },
      spreadNote: 'Fuerte consenso multimodelo en lluvias >55 mm; posterior despeje del miércoles madrugada eleva probabilidad de helada radiativa agrícola.'
    }
  },
  {
    id: 'chillan',
    cut: '16101',
    name: 'Chillán / Coihueco',
    regionCode: 'XVI',
    regionNumber: 16,
    regionName: 'Ñuble',
    macrozone: 'Zona Centro-Sur',
    timezone: 'America/Santiago',
    lat: -36.6063,
    lon: -72.1034,
    elevationM: 124,
    basin: 'Río Itata y Río Ñuble',
    stationId: 'EMA-360011 Bernardo O’Higgins Chillán',
    observation: {
      tempC: 11.4,
      humidityPct: 93,
      precip1hMm: 5.2,
      precip24hMm: 34.2,
      windKmh: 36,
      windGustKmh: 61,
      windDir: 'NW',
      cloudCoverPct: 100,
      pressureHpa: 1005.1,
      freezingLevelM: 2420,
      conditionText: 'Lluvia intensa y rachas de viento noroeste',
      observedAtUtc: '2026-10-19T15:00:00Z',
      sourceId: 'dmc-meteochile'
    },
    summaryRisk: 'TEMPRANA',
    keyPhenomenon: 'Lluvias intensas en precordillera de Ñuble seguido de ingreso de masa de aire polar con nevadas en Nevados de Chillán.',
    hourlyRain48h: [
      { hourOffset: 0, p50: 5.2, p90: 9.0, iso0: 2420, wind: 36, temp: 11.4 },
      { hourOffset: 6, p50: 4.8, p90: 8.6, iso0: 2150, wind: 34, temp: 10.6 },
      { hourOffset: 12, p50: 2.9, p90: 5.5, iso0: 1780, wind: 25, temp: 8.4 },
      { hourOffset: 18, p50: 1.6, p90: 3.4, iso0: 1580, wind: 19, temp: 7.5 },
      { hourOffset: 24, p50: 0.8, p90: 2.0, iso0: 1520, wind: 16, temp: 11.9 },
      { hourOffset: 30, p50: 0.2, p90: 0.8, iso0: 1650, wind: 13, temp: 12.4 },
      { hourOffset: 36, p50: 0.0, p90: 0.2, iso0: 1750, wind: 8, temp: 4.1 },
      { hourOffset: 42, p50: 0.0, p90: 0.0, iso0: 1900, wind: 6, temp: 1.8 },
      { hourOffset: 48, p50: 0.0, p90: 0.0, iso0: 2250, wind: 11, temp: 14.9 }
    ],
    daily7d: [
      { day: 'Lun 19 Oct', tMin: 8, tMax: 13, tP10: 7, tP90: 14, precipP50: 41.0, precipP90: 66.0, probPct: 95, windMax: 61, snowCm: 45, iso0M: 2420, cloudPct: 100, cond: 'Lluvia fuerte y viento' },
      { day: 'Mar 20 Oct', tMin: 4, tMax: 13, tP10: 3, tP90: 14, precipP50: 12.5, precipP90: 22.0, probPct: 80, windMax: 32, snowCm: 50, iso0M: 1520, cloudPct: 75, cond: 'Chubascos y nieve desde 1.500m' },
      { day: 'Mié 21 Oct', tMin: 1, tMax: 15, tP10: -1, tP90: 16, precipP50: 0.4, precipP90: 1.8, probPct: 15, windMax: 16, snowCm: 2, iso0M: 1750, cloudPct: 30, cond: 'Helada matinal agrícola' },
      { day: 'Jue 22 Oct', tMin: 2, tMax: 18, tP10: 1, tP90: 20, precipP50: 0.0, precipP90: 0.0, probPct: 5, windMax: 15, snowCm: 0, iso0M: 2600, cloudPct: 20, cond: 'Soleado' },
      { day: 'Vie 23 Oct', tMin: 4, tMax: 20, tP10: 3, tP90: 22, precipP50: 0.0, precipP90: 0.4, probPct: 10, windMax: 17, snowCm: 0, iso0M: 2900, cloudPct: 25, cond: 'Parcial' },
      { day: 'Sáb 24 Oct', tMin: 6, tMax: 18, tP10: 5, tP90: 20, precipP50: 2.0, precipP90: 6.5, probPct: 35, windMax: 24, snowCm: 0, iso0M: 2700, cloudPct: 65, cond: 'Nublado con chubascos fines día' },
      { day: 'Dom 25 Oct', tMin: 7, tMax: 16, tP10: 6, tP90: 18, precipP50: 6.0, precipP90: 14.0, probPct: 55, windMax: 28, snowCm: 5, iso0M: 2400, cloudPct: 80, cond: 'Chubascos débiles' }
    ],
    modelsComparison: {
      ecmwf: { precip72h: 53.9, tempMaxAvg: 13.7, iso0Min: 1520, windPeak: 61 },
      gfs: { precip72h: 59.0, tempMaxAvg: 13.4, iso0Min: 1600, windPeak: 64 },
      icon: { precip72h: 50.2, tempMaxAvg: 13.9, iso0Min: 1480, windPeak: 57 },
      spreadNote: 'Alta coincidencia en descenso abrupto de isoterma a 1.500 m y helada matinal el miércoles 21.'
    }
  },
  {
    id: 'concepcion',
    cut: '08101',
    name: 'Concepción / Talcahuano',
    regionCode: 'VIII',
    regionNumber: 8,
    regionName: 'Biobío',
    macrozone: 'Zona Centro-Sur',
    timezone: 'America/Santiago',
    lat: -36.8201,
    lon: -73.0444,
    elevationM: 12,
    basin: 'Río Biobío y Río Andalién',
    stationId: 'EMA-360019 Carriel Sur',
    observation: {
      tempC: 11.8,
      humidityPct: 91,
      precip1hMm: 3.9,
      precip24hMm: 38.5,
      windKmh: 42,
      windGustKmh: 68,
      windDir: 'WNW',
      cloudCoverPct: 92,
      pressureHpa: 1004.8,
      freezingLevelM: 2150,
      conditionText: 'Chubascos intensos postfrontales, inestabilidad convectiva y viento costero fuerte',
      observedAtUtc: '2026-10-19T15:00:00Z',
      sourceId: 'dmc-meteochile'
    },
    summaryRisk: 'TEMPRANA',
    keyPhenomenon: 'Inestabilidad postfrontal con probables tormentas eléctricas costeras, saturación de suelos en cuenca del Andalién y marejadas.',
    hourlyRain48h: [
      { hourOffset: 0, p50: 3.9, p90: 7.5, iso0: 2150, wind: 42, temp: 11.8 },
      { hourOffset: 6, p50: 3.2, p90: 6.4, iso0: 1850, wind: 38, temp: 11.0 },
      { hourOffset: 12, p50: 2.1, p90: 4.5, iso0: 1580, wind: 30, temp: 9.2 },
      { hourOffset: 18, p50: 1.4, p90: 3.0, iso0: 1450, wind: 24, temp: 8.6 },
      { hourOffset: 24, p50: 0.6, p90: 1.8, iso0: 1480, wind: 20, temp: 12.4 },
      { hourOffset: 30, p50: 0.2, p90: 0.7, iso0: 1600, wind: 17, temp: 12.9 },
      { hourOffset: 36, p50: 0.0, p90: 0.2, iso0: 1720, wind: 12, temp: 6.8 },
      { hourOffset: 42, p50: 0.0, p90: 0.0, iso0: 1850, wind: 10, temp: 5.2 },
      { hourOffset: 48, p50: 0.0, p90: 0.0, iso0: 2150, wind: 15, temp: 14.5 }
    ],
    daily7d: [
      { day: 'Lun 19 Oct', tMin: 9, tMax: 13, tP10: 8, tP90: 14, precipP50: 29.0, precipP90: 48.0, probPct: 95, windMax: 68, snowCm: 30, iso0M: 2150, cloudPct: 92, cond: 'Chubascos y tormenta aislada' },
      { day: 'Mar 20 Oct', tMin: 6, tMax: 13, tP10: 5, tP90: 14, precipP50: 10.5, precipP90: 19.0, probPct: 75, windMax: 38, snowCm: 25, iso0M: 1450, cloudPct: 75, cond: 'Chubascos en declinación' },
      { day: 'Mié 21 Oct', tMin: 4, tMax: 14, tP10: 3, tP90: 16, precipP50: 0.3, precipP90: 1.5, probPct: 15, windMax: 20, snowCm: 0, iso0M: 1720, cloudPct: 35, cond: 'Parcial' },
      { day: 'Jue 22 Oct', tMin: 5, tMax: 16, tP10: 4, tP90: 18, precipP50: 0.0, precipP90: 0.2, probPct: 10, windMax: 18, snowCm: 0, iso0M: 2450, cloudPct: 25, cond: 'Despejado' },
      { day: 'Vie 23 Oct', tMin: 7, tMax: 17, tP10: 6, tP90: 19, precipP50: 0.5, precipP90: 2.0, probPct: 20, windMax: 22, snowCm: 0, iso0M: 2700, cloudPct: 45, cond: 'Parcial a nublado' },
      { day: 'Sáb 24 Oct', tMin: 8, tMax: 15, tP10: 7, tP90: 17, precipP50: 5.5, precipP90: 13.0, probPct: 55, windMax: 32, snowCm: 2, iso0M: 2500, cloudPct: 80, cond: 'Lluvia débil' },
      { day: 'Dom 25 Oct', tMin: 8, tMax: 15, tP10: 7, tP90: 17, precipP50: 9.0, precipP90: 19.0, probPct: 65, windMax: 35, snowCm: 6, iso0M: 2250, cloudPct: 85, cond: 'Chubascos' }
    ],
    modelsComparison: {
      ecmwf: { precip72h: 39.8, tempMaxAvg: 13.3, iso0Min: 1450, windPeak: 68 },
      gfs: { precip72h: 44.1, tempMaxAvg: 13.1, iso0Min: 1520, windPeak: 72 },
      icon: { precip72h: 36.5, tempMaxAvg: 13.5, iso0Min: 1420, windPeak: 65 },
      spreadNote: 'Convergencia en actividad convectiva costera; dispersión moderada en el segundo frente del fin de semana (Sáb 24 - Dom 25).'
    }
  },
  {
    id: 'temuco',
    cut: '09101',
    name: 'Temuco / Pucón',
    regionCode: 'IX',
    regionNumber: 9,
    regionName: 'La Araucanía',
    macrozone: 'Zona Sur',
    timezone: 'America/Santiago',
    lat: -38.7359,
    lon: -72.5904,
    elevationM: 114,
    basin: 'Río Imperial y Río Toltén',
    stationId: 'EMA-380013 Maquehue',
    observation: {
      tempC: 9.8,
      humidityPct: 90,
      precip1hMm: 2.8,
      precip24hMm: 31.0,
      windKmh: 29,
      windGustKmh: 49,
      windDir: 'W',
      cloudCoverPct: 88,
      pressureHpa: 1004.2,
      freezingLevelM: 1680,
      conditionText: 'Chubascos frecuentes de lluvia y granizo pequeño; nevadas en cordillera andina desde 1.600 m',
      observedAtUtc: '2026-10-19T15:00:00Z',
      sourceId: 'dmc-meteochile'
    },
    summaryRisk: 'PREVENTIVA',
    keyPhenomenon: 'Nevadas acumuladas de 35-60 cm en pasos fronterizos (Pino Hachado / Mamuil Malal) y helada matinal el miércoles.',
    hourlyRain48h: [
      { hourOffset: 0, p50: 2.8, p90: 5.4, iso0: 1680, wind: 29, temp: 9.8 },
      { hourOffset: 6, p50: 2.4, p90: 4.8, iso0: 1450, wind: 26, temp: 8.9 },
      { hourOffset: 12, p50: 1.6, p90: 3.5, iso0: 1280, wind: 20, temp: 6.5 },
      { hourOffset: 18, p50: 0.9, p90: 2.1, iso0: 1200, wind: 15, temp: 5.8 },
      { hourOffset: 24, p50: 0.4, p90: 1.2, iso0: 1250, wind: 14, temp: 10.6 },
      { hourOffset: 30, p50: 0.1, p90: 0.5, iso0: 1350, wind: 11, temp: 11.1 },
      { hourOffset: 36, p50: 0.0, p90: 0.1, iso0: 1450, wind: 6, temp: 2.4 },
      { hourOffset: 42, p50: 0.0, p90: 0.0, iso0: 1580, wind: 5, temp: 0.2 },
      { hourOffset: 48, p50: 0.0, p90: 0.0, iso0: 1950, wind: 9, temp: 13.4 }
    ],
    daily7d: [
      { day: 'Lun 19 Oct', tMin: 6, tMax: 11, tP10: 5, tP90: 12, precipP50: 22.0, precipP90: 36.0, probPct: 90, windMax: 49, snowCm: 40, iso0M: 1680, cloudPct: 88, cond: 'Chubascos y nieve andina' },
      { day: 'Mar 20 Oct', tMin: 3, tMax: 11, tP10: 2, tP90: 12, precipP50: 7.5, precipP90: 14.0, probPct: 70, windMax: 28, snowCm: 25, iso0M: 1200, cloudPct: 70, cond: 'Chubascos fríos' },
      { day: 'Mié 21 Oct', tMin: 0, tMax: 13, tP10: -2, tP90: 15, precipP50: 0.2, precipP90: 1.0, probPct: 15, windMax: 14, snowCm: 0, iso0M: 1450, cloudPct: 30, cond: 'Helada matinal (0 °C a -2 °C)' },
      { day: 'Jue 22 Oct', tMin: 2, tMax: 16, tP10: 0, tP90: 18, precipP50: 0.0, precipP90: 0.5, probPct: 10, windMax: 15, snowCm: 0, iso0M: 2200, cloudPct: 30, cond: 'Parcial' },
      { day: 'Vie 23 Oct', tMin: 5, tMax: 16, tP10: 4, tP90: 18, precipP50: 3.0, precipP90: 8.0, probPct: 40, windMax: 24, snowCm: 2, iso0M: 2350, cloudPct: 70, cond: 'Lluvia débil nocturna' },
      { day: 'Sáb 24 Oct', tMin: 7, tMax: 14, tP10: 6, tP90: 16, precipP50: 14.0, precipP90: 26.0, probPct: 75, windMax: 38, snowCm: 12, iso0M: 2100, cloudPct: 90, cond: 'Lluvia moderada' },
      { day: 'Dom 25 Oct', tMin: 6, tMax: 13, tP10: 5, tP90: 15, precipP50: 11.0, precipP90: 21.0, probPct: 70, windMax: 34, snowCm: 15, iso0M: 1850, cloudPct: 85, cond: 'Chubascos' }
    ],
    modelsComparison: {
      ecmwf: { precip72h: 29.7, tempMaxAvg: 11.7, iso0Min: 1200, windPeak: 49 },
      gfs: { precip72h: 33.4, tempMaxAvg: 11.4, iso0Min: 1250, windPeak: 52 },
      icon: { precip72h: 27.1, tempMaxAvg: 11.9, iso0Min: 1180, windPeak: 46 },
      spreadNote: 'Consenso en ingreso de alta fría migratoria el miércoles con heladas en valle central de La Araucanía.'
    }
  },
  {
    id: 'valdivia',
    cut: '14101',
    name: 'Valdivia',
    regionCode: 'XIV',
    regionNumber: 14,
    regionName: 'Los Ríos',
    macrozone: 'Zona Sur',
    timezone: 'America/Santiago',
    lat: -39.8142,
    lon: -73.2459,
    elevationM: 19,
    basin: 'Río Valdivia - Calle-Calle',
    stationId: 'EMA-390006 Pichoy',
    observation: {
      tempC: 9.4,
      humidityPct: 91,
      precip1hMm: 2.2,
      precip24hMm: 28.4,
      windKmh: 26,
      windGustKmh: 45,
      windDir: 'W',
      cloudCoverPct: 85,
      pressureHpa: 1005.0,
      freezingLevelM: 1480,
      conditionText: 'Nublado con chubascos postfrontales y quiebres parciales',
      observedAtUtc: '2026-10-19T15:00:00Z',
      sourceId: 'dmc-meteochile'
    },
    summaryRisk: 'PREVENTIVA',
    keyPhenomenon: 'Suelos con alta humedad antecedente y nuevo pulso frontal proyectado para el viernes-sábado.',
    hourlyRain48h: [
      { hourOffset: 0, p50: 2.2, p90: 4.5, iso0: 1480, wind: 26, temp: 9.4 },
      { hourOffset: 6, p50: 1.8, p90: 3.8, iso0: 1320, wind: 24, temp: 8.6 },
      { hourOffset: 12, p50: 1.2, p90: 2.6, iso0: 1150, wind: 18, temp: 6.2 },
      { hourOffset: 18, p50: 0.7, p90: 1.6, iso0: 1100, wind: 14, temp: 5.5 },
      { hourOffset: 24, p50: 0.3, p90: 0.9, iso0: 1180, wind: 12, temp: 10.2 },
      { hourOffset: 30, p50: 0.0, p90: 0.3, iso0: 1280, wind: 10, temp: 10.8 },
      { hourOffset: 36, p50: 0.0, p90: 0.0, iso0: 1380, wind: 6, temp: 3.0 },
      { hourOffset: 42, p50: 0.0, p90: 0.0, iso0: 1500, wind: 5, temp: 1.4 },
      { hourOffset: 48, p50: 0.0, p90: 0.0, iso0: 1820, wind: 9, temp: 12.8 }
    ],
    daily7d: [
      { day: 'Lun 19 Oct', tMin: 6, tMax: 11, tP10: 5, tP90: 12, precipP50: 18.0, precipP90: 30.0, probPct: 90, windMax: 45, snowCm: 25, iso0M: 1480, cloudPct: 85, cond: 'Chubascos' },
      { day: 'Mar 20 Oct', tMin: 3, tMax: 11, tP10: 2, tP90: 12, precipP50: 5.5, precipP90: 11.0, probPct: 65, windMax: 25, snowCm: 15, iso0M: 1100, cloudPct: 65, cond: 'Chubascos aislados' },
      { day: 'Mié 21 Oct', tMin: 1, tMax: 13, tP10: -1, tP90: 15, precipP50: 0.2, precipP90: 0.8, probPct: 10, windMax: 14, snowCm: 0, iso0M: 1380, cloudPct: 30, cond: 'Frío matinal y bancos de niebla' },
      { day: 'Jue 22 Oct', tMin: 3, tMax: 15, tP10: 2, tP90: 17, precipP50: 0.5, precipP90: 2.0, probPct: 20, windMax: 18, snowCm: 0, iso0M: 2050, cloudPct: 45, cond: 'Parcial' },
      { day: 'Vie 23 Oct', tMin: 6, tMax: 14, tP10: 5, tP90: 16, precipP50: 8.0, precipP90: 16.0, probPct: 60, windMax: 32, snowCm: 5, iso0M: 2150, cloudPct: 85, cond: 'Lluvia desde la tarde' },
      { day: 'Sáb 24 Oct', tMin: 7, tMax: 13, tP10: 6, tP90: 15, precipP50: 22.0, precipP90: 38.0, probPct: 80, windMax: 44, snowCm: 18, iso0M: 1950, cloudPct: 95, cond: 'Lluvia y viento' },
      { day: 'Dom 25 Oct', tMin: 6, tMax: 12, tP10: 5, tP90: 14, precipP50: 14.0, precipP90: 25.0, probPct: 75, windMax: 36, snowCm: 15, iso0M: 1650, cloudPct: 85, cond: 'Chubascos' }
    ],
    modelsComparison: {
      ecmwf: { precip72h: 23.7, tempMaxAvg: 11.7, iso0Min: 1100, windPeak: 45 },
      gfs: { precip72h: 26.5, tempMaxAvg: 11.5, iso0Min: 1150, windPeak: 48 },
      icon: { precip72h: 21.8, tempMaxAvg: 11.9, iso0Min: 1080, windPeak: 43 },
      spreadNote: 'Baja dispersión en las próximas 48 h; mayor incertidumbre en el frente cálido del sábado 24.'
    }
  },
  {
    id: 'puertomontt',
    cut: '10101',
    name: 'Puerto Montt / Chaitén',
    regionCode: 'X',
    regionNumber: 10,
    regionName: 'Los Lagos',
    macrozone: 'Zona Sur',
    timezone: 'America/Santiago',
    lat: -41.4689,
    lon: -72.9411,
    elevationM: 85,
    basin: 'Seno de Reloncaví, Río Petrohué y Cuencas de Palena',
    stationId: 'EMA-410005 El Tepual',
    observation: {
      tempC: 8.6,
      humidityPct: 89,
      precip1hMm: 1.9,
      precip24hMm: 24.0,
      windKmh: 31,
      windGustKmh: 52,
      windDir: 'WSW',
      cloudCoverPct: 85,
      pressureHpa: 1004.5,
      freezingLevelM: 1250,
      conditionText: 'Chubascos de agua-nieve en sectores altos y viento del oeste-suroeste',
      observedAtUtc: '2026-10-19T15:00:00Z',
      sourceId: 'dmc-meteochile'
    },
    summaryRisk: 'PREVENTIVA',
    keyPhenomenon: 'Descenso de isoterma 0 °C a 950 m s.n.m. en Palena y Osorno; nuevo sistema frontal ingresando el viernes 23.',
    hourlyRain48h: [
      { hourOffset: 0, p50: 1.9, p90: 3.8, iso0: 1250, wind: 31, temp: 8.6 },
      { hourOffset: 6, p50: 1.5, p90: 3.2, iso0: 1080, wind: 28, temp: 7.5 },
      { hourOffset: 12, p50: 1.0, p90: 2.2, iso0: 950, wind: 22, temp: 5.1 },
      { hourOffset: 18, p50: 0.5, p90: 1.3, iso0: 920, wind: 16, temp: 4.6 },
      { hourOffset: 24, p50: 0.2, p90: 0.7, iso0: 1020, wind: 14, temp: 9.2 },
      { hourOffset: 30, p50: 0.0, p90: 0.3, iso0: 1120, wind: 11, temp: 9.8 },
      { hourOffset: 36, p50: 0.0, p90: 0.0, iso0: 1220, wind: 7, temp: 2.2 },
      { hourOffset: 42, p50: 0.0, p90: 0.0, iso0: 1350, wind: 6, temp: 0.8 },
      { hourOffset: 48, p50: 0.0, p90: 0.2, iso0: 1650, wind: 12, temp: 11.6 }
    ],
    daily7d: [
      { day: 'Lun 19 Oct', tMin: 5, tMax: 10, tP10: 4, tP90: 11, precipP50: 15.0, precipP90: 26.0, probPct: 85, windMax: 52, snowCm: 20, iso0M: 1250, cloudPct: 85, cond: 'Chubascos y viento' },
      { day: 'Mar 20 Oct', tMin: 2, tMax: 10, tP10: 1, tP90: 11, precipP50: 4.5, precipP90: 9.5, probPct: 60, windMax: 28, snowCm: 12, iso0M: 920, cloudPct: 65, cond: 'Chubascos fríos' },
      { day: 'Mié 21 Oct', tMin: 1, tMax: 12, tP10: -1, tP90: 13, precipP50: 0.2, precipP90: 0.8, probPct: 15, windMax: 16, snowCm: 0, iso0M: 1220, cloudPct: 35, cond: 'Escarchas matinales' },
      { day: 'Jue 22 Oct', tMin: 4, tMax: 13, tP10: 3, tP90: 15, precipP50: 2.5, precipP90: 6.5, probPct: 35, windMax: 25, snowCm: 2, iso0M: 1850, cloudPct: 65, cond: 'Nublado' },
      { day: 'Vie 23 Oct', tMin: 6, tMax: 12, tP10: 5, tP90: 14, precipP50: 16.0, precipP90: 29.0, probPct: 75, windMax: 42, snowCm: 10, iso0M: 1950, cloudPct: 90, cond: 'Lluvia moderada' },
      { day: 'Sáb 24 Oct', tMin: 7, tMax: 12, tP10: 6, tP90: 14, precipP50: 25.0, precipP90: 44.0, probPct: 85, windMax: 50, snowCm: 22, iso0M: 1750, cloudPct: 95, cond: 'Temporal de lluvia' },
      { day: 'Dom 25 Oct', tMin: 5, tMax: 11, tP10: 4, tP90: 13, precipP50: 14.0, precipP90: 25.0, probPct: 75, windMax: 38, snowCm: 15, iso0M: 1450, cloudPct: 85, cond: 'Chubascos' }
    ],
    modelsComparison: {
      ecmwf: { precip72h: 19.7, tempMaxAvg: 10.7, iso0Min: 920, windPeak: 52 },
      gfs: { precip72h: 22.8, tempMaxAvg: 10.5, iso0Min: 960, windPeak: 55 },
      icon: { precip72h: 18.2, tempMaxAvg: 10.9, iso0Min: 900, windPeak: 49 },
      spreadNote: 'Modelos alineados en ventana de estabilidad entre miércoles y jueves antes del nuevo frente austral.'
    }
  },
  {
    id: 'coyhaique',
    cut: '11101',
    name: 'Coyhaique / Puerto Aysén',
    regionCode: 'XI',
    regionNumber: 11,
    regionName: 'Aysén del General Carlos Ibáñez del Campo',
    macrozone: 'Zona Austral',
    timezone: 'America/Punta_Arenas',
    lat: -45.5712,
    lon: -72.0685,
    elevationM: 310,
    basin: 'Río Simpson y Río Aysén',
    stationId: 'EMA-450004 Teniente Vidal',
    observation: {
      tempC: 4.8,
      humidityPct: 82,
      precip1hMm: 0.8,
      precip24hMm: 12.6,
      windKmh: 28,
      windGustKmh: 46,
      windDir: 'W',
      cloudCoverPct: 75,
      pressureHpa: 1003.4,
      freezingLevelM: 780,
      conditionText: 'Chubascos de aguanieve en cotas medias y masa de aire polar fría',
      observedAtUtc: '2026-10-19T15:00:00Z',
      sourceId: 'dmc-meteochile'
    },
    summaryRisk: 'PREVENTIVA',
    keyPhenomenon: 'Heladas severas (-3 °C a -5 °C) tras el paso frontal y escarcha en Ruta 7 (Carretera Austral).',
    hourlyRain48h: [
      { hourOffset: 0, p50: 0.8, p90: 1.9, iso0: 780, wind: 28, temp: 4.8 },
      { hourOffset: 6, p50: 0.5, p90: 1.2, iso0: 680, wind: 22, temp: 3.4 },
      { hourOffset: 12, p50: 0.2, p90: 0.6, iso0: 620, wind: 14, temp: 0.2 },
      { hourOffset: 18, p50: 0.0, p90: 0.2, iso0: 600, wind: 10, temp: -1.8 },
      { hourOffset: 24, p50: 0.0, p90: 0.1, iso0: 720, wind: 12, temp: 6.4 },
      { hourOffset: 30, p50: 0.0, p90: 0.0, iso0: 850, wind: 10, temp: 7.2 },
      { hourOffset: 36, p50: 0.0, p90: 0.0, iso0: 920, wind: 6, temp: -2.4 },
      { hourOffset: 42, p50: 0.0, p90: 0.0, iso0: 1050, wind: 5, temp: -3.9 },
      { hourOffset: 48, p50: 0.4, p90: 1.2, iso0: 1380, wind: 18, temp: 8.8 }
    ],
    daily7d: [
      { day: 'Lun 19 Oct', tMin: 0, tMax: 7, tP10: -2, tP90: 8, precipP50: 6.5, precipP90: 13.0, probPct: 75, windMax: 46, snowCm: 8, iso0M: 780, cloudPct: 75, cond: 'Aguanieve en sectores altos' },
      { day: 'Mar 20 Oct', tMin: -3, tMax: 7, tP10: -5, tP90: 9, precipP50: 1.0, precipP90: 3.0, probPct: 30, windMax: 24, snowCm: 2, iso0M: 600, cloudPct: 45, cond: 'Helada y escarcha en rutas' },
      { day: 'Mié 21 Oct', tMin: -4, tMax: 10, tP10: -6, tP90: 12, precipP50: 0.5, precipP90: 2.0, probPct: 20, windMax: 22, snowCm: 0, iso0M: 920, cloudPct: 40, cond: 'Helada matinal severa' },
      { day: 'Jue 22 Oct', tMin: 2, tMax: 11, tP10: 0, tP90: 13, precipP50: 12.0, precipP90: 24.0, probPct: 75, windMax: 48, snowCm: 6, iso0M: 1450, cloudPct: 90, cond: 'Ingreso de nuevo frente' },
      { day: 'Vie 23 Oct', tMin: 4, tMax: 10, tP10: 2, tP90: 12, precipP50: 26.0, precipP90: 45.0, probPct: 85, windMax: 62, snowCm: 15, iso0M: 1550, cloudPct: 95, cond: 'Lluvia intensa y viento' },
      { day: 'Sáb 24 Oct', tMin: 3, tMax: 9, tP10: 1, tP90: 11, precipP50: 18.0, precipP90: 32.0, probPct: 80, windMax: 54, snowCm: 14, iso0M: 1250, cloudPct: 85, cond: 'Chubascos y viento' },
      { day: 'Dom 25 Oct', tMin: 1, tMax: 8, tP10: -1, tP90: 10, precipP50: 8.0, precipP90: 16.0, probPct: 65, windMax: 38, snowCm: 10, iso0M: 980, cloudPct: 75, cond: 'Chubascos de agua-nieve' }
    ],
    modelsComparison: {
      ecmwf: { precip72h: 8.0, tempMaxAvg: 8.0, iso0Min: 600, windPeak: 46 },
      gfs: { precip72h: 9.5, tempMaxAvg: 7.6, iso0Min: 580, windPeak: 50 },
      icon: { precip72h: 7.2, tempMaxAvg: 8.2, iso0Min: 620, windPeak: 44 },
      spreadNote: 'Alta confianza en mínimas bajo cero entre martes y miércoles; divergencia moderada en intensidad del río atmosférico del viernes 23.'
    }
  },
  {
    id: 'puntaarenas',
    cut: '12101',
    name: 'Punta Arenas / Puerto Natales',
    regionCode: 'XII',
    regionNumber: 12,
    regionName: 'Magallanes y de la Antártica Chilena',
    macrozone: 'Zona Austral',
    timezone: 'America/Punta_Arenas',
    lat: -53.1638,
    lon: -70.9171,
    elevationM: 37,
    basin: 'Estrecho de Magallanes y Río Las Minas',
    stationId: 'EMA-520006 Carlos Ibáñez del Campo',
    observation: {
      tempC: 5.2,
      humidityPct: 74,
      precip1hMm: 0.4,
      precip24hMm: 4.8,
      windKmh: 58,
      windGustKmh: 92,
      windDir: 'W',
      cloudCoverPct: 70,
      pressureHpa: 994.6,
      freezingLevelM: 580,
      conditionText: 'Viento muy fuerte del oeste con rachas de 92 km/h y chubascos débiles',
      observedAtUtc: '2026-10-19T15:00:00Z',
      sourceId: 'dmc-meteochile'
    },
    summaryRisk: 'TEMPRANA',
    keyPhenomenon: 'Rachas de viento pampa/costero entre 85 y 105 km/h por fuerte gradiente bárico austral.',
    hourlyRain48h: [
      { hourOffset: 0, p50: 0.4, p90: 1.1, iso0: 580, wind: 58, temp: 5.2 },
      { hourOffset: 6, p50: 0.6, p90: 1.5, iso0: 550, wind: 68, temp: 5.8 },
      { hourOffset: 12, p50: 0.3, p90: 0.9, iso0: 520, wind: 52, temp: 2.4 },
      { hourOffset: 18, p50: 0.2, p90: 0.6, iso0: 540, wind: 48, temp: 3.1 },
      { hourOffset: 24, p50: 0.8, p90: 2.0, iso0: 680, wind: 74, temp: 6.8 },
      { hourOffset: 30, p50: 1.1, p90: 2.6, iso0: 720, wind: 78, temp: 7.1 },
      { hourOffset: 36, p50: 0.5, p90: 1.4, iso0: 640, wind: 56, temp: 3.5 },
      { hourOffset: 42, p50: 0.2, p90: 0.7, iso0: 610, wind: 44, temp: 2.8 },
      { hourOffset: 48, p50: 0.3, p90: 0.9, iso0: 690, wind: 52, temp: 6.5 }
    ],
    daily7d: [
      { day: 'Lun 19 Oct', tMin: 2, tMax: 7, tP10: 0, tP90: 8, precipP50: 3.5, precipP90: 7.0, probPct: 60, windMax: 92, snowCm: 2, iso0M: 580, cloudPct: 70, cond: 'Temporal de viento (rachas 92 km/h)' },
      { day: 'Mar 20 Oct', tMin: 2, tMax: 8, tP10: 1, tP90: 9, precipP50: 4.5, precipP90: 9.5, probPct: 65, windMax: 102, snowCm: 1, iso0M: 680, cloudPct: 75, cond: 'Rachas hasta 102 km/h y chubascos' },
      { day: 'Mié 21 Oct', tMin: 2, tMax: 8, tP10: 0, tP90: 10, precipP50: 2.0, precipP90: 5.0, probPct: 45, windMax: 76, snowCm: 1, iso0M: 650, cloudPct: 65, cond: 'Ventoso y parcial' },
      { day: 'Jue 22 Oct', tMin: 3, tMax: 9, tP10: 1, tP90: 11, precipP50: 3.0, precipP90: 7.5, probPct: 50, windMax: 68, snowCm: 0, iso0M: 750, cloudPct: 70, cond: 'Chubascos débiles' },
      { day: 'Vie 23 Oct', tMin: 2, tMax: 8, tP10: 0, tP90: 10, precipP50: 4.0, precipP90: 8.5, probPct: 55, windMax: 72, snowCm: 2, iso0M: 620, cloudPct: 75, cond: 'Viento y chubascos' },
      { day: 'Sáb 24 Oct', tMin: 1, tMax: 7, tP10: -1, tP90: 9, precipP50: 2.5, precipP90: 6.0, probPct: 50, windMax: 64, snowCm: 3, iso0M: 540, cloudPct: 70, cond: 'Chubascos fríos' },
      { day: 'Dom 25 Oct', tMin: 1, tMax: 8, tP10: 0, tP90: 10, precipP50: 1.5, precipP90: 4.0, probPct: 40, windMax: 58, snowCm: 1, iso0M: 600, cloudPct: 60, cond: 'Parcial y ventoso' }
    ],
    modelsComparison: {
      ecmwf: { precip72h: 10.0, tempMaxAvg: 7.7, iso0Min: 520, windPeak: 102 },
      gfs: { precip72h: 11.8, tempMaxAvg: 7.5, iso0Min: 500, windPeak: 108 },
      icon: { precip72h: 9.1, tempMaxAvg: 7.9, iso0Min: 550, windPeak: 96 },
      spreadNote: 'Los 3 modelos coinciden en rachas severas superiores a 95 km/h durante el paso de onda baroclínica el martes 20.'
    }
  },
  {
    id: 'rapanui',
    cut: '05201',
    name: 'Rapa Nui (Isla de Pascua)',
    regionCode: 'V-INS',
    regionNumber: 5,
    regionName: 'Valparaíso (Territorio Insular)',
    macrozone: 'Territorio Insular',
    timezone: 'Pacific/Easter',
    lat: -27.1127,
    lon: -109.3497,
    elevationM: 51,
    basin: 'Cuenca Insular Volcánica Rapa Nui',
    stationId: 'EMA-270008 Mataveri',
    observation: {
      tempC: 21.5,
      humidityPct: 78,
      precip1hMm: 0.2,
      precip24hMm: 3.4,
      windKmh: 24,
      windGustKmh: 38,
      windDir: 'E',
      cloudCoverPct: 60,
      pressureHpa: 1020.4,
      freezingLevelM: 4250,
      conditionText: 'Nubosidad parcial subtropical con chubascos cálidos ocasionales',
      observedAtUtc: '2026-10-19T15:00:00Z',
      sourceId: 'dmc-meteochile'
    },
    summaryRisk: 'INFORMATIVA',
    keyPhenomenon: 'Régimen de alisios del este-sureste con chubascos breves matinales.',
    hourlyRain48h: [
      { hourOffset: 0, p50: 0.2, p90: 0.8, iso0: 4250, wind: 24, temp: 21.5 },
      { hourOffset: 6, p50: 0.4, p90: 1.5, iso0: 4260, wind: 26, temp: 22.8 },
      { hourOffset: 12, p50: 0.3, p90: 1.2, iso0: 4220, wind: 20, temp: 18.9 },
      { hourOffset: 18, p50: 0.5, p90: 1.8, iso0: 4210, wind: 22, temp: 19.6 },
      { hourOffset: 24, p50: 0.2, p90: 0.9, iso0: 4240, wind: 25, temp: 22.4 },
      { hourOffset: 30, p50: 0.1, p90: 0.6, iso0: 4260, wind: 24, temp: 22.9 },
      { hourOffset: 36, p50: 0.2, p90: 0.8, iso0: 4230, wind: 19, temp: 18.6 },
      { hourOffset: 42, p50: 0.3, p90: 1.0, iso0: 4220, wind: 18, temp: 18.4 },
      { hourOffset: 48, p50: 0.2, p90: 0.7, iso0: 4250, wind: 22, temp: 22.1 }
    ],
    daily7d: [
      { day: 'Lun 19 Oct', tMin: 18, tMax: 23, tP10: 17, tP90: 24, precipP50: 2.5, precipP90: 7.0, probPct: 45, windMax: 38, snowCm: 0, iso0M: 4250, cloudPct: 60, cond: 'Chubascos aislados' },
      { day: 'Mar 20 Oct', tMin: 18, tMax: 23, tP10: 17, tP90: 24, precipP50: 1.8, precipP90: 5.5, probPct: 40, windMax: 35, snowCm: 0, iso0M: 4260, cloudPct: 55, cond: 'Parcial' },
      { day: 'Mié 21 Oct', tMin: 18, tMax: 24, tP10: 17, tP90: 25, precipP50: 1.0, precipP90: 3.5, probPct: 30, windMax: 32, snowCm: 0, iso0M: 4280, cloudPct: 50, cond: 'Parcial' },
      { day: 'Jue 22 Oct', tMin: 19, tMax: 24, tP10: 18, tP90: 25, precipP50: 0.8, precipP90: 3.0, probPct: 25, windMax: 30, snowCm: 0, iso0M: 4300, cloudPct: 45, cond: 'Nubosidad parcial' },
      { day: 'Vie 23 Oct', tMin: 19, tMax: 24, tP10: 18, tP90: 25, precipP50: 1.5, precipP90: 4.5, probPct: 35, windMax: 34, snowCm: 0, iso0M: 4270, cloudPct: 55, cond: 'Chubascos breves' },
      { day: 'Sáb 24 Oct', tMin: 18, tMax: 23, tP10: 17, tP90: 25, precipP50: 3.2, precipP90: 8.5, probPct: 50, windMax: 38, snowCm: 0, iso0M: 4230, cloudPct: 65, cond: 'Chubascos subtropicales' },
      { day: 'Dom 25 Oct', tMin: 18, tMax: 23, tP10: 17, tP90: 24, precipP50: 2.0, precipP90: 6.0, probPct: 40, windMax: 35, snowCm: 0, iso0M: 4250, cloudPct: 55, cond: 'Parcial' }
    ],
    modelsComparison: {
      ecmwf: { precip72h: 5.3, tempMaxAvg: 23.3, iso0Min: 4210, windPeak: 38 },
      gfs: { precip72h: 7.2, tempMaxAvg: 23.5, iso0Min: 4180, windPeak: 41 },
      icon: { precip72h: 4.8, tempMaxAvg: 23.1, iso0Min: 4240, windPeak: 36 },
      spreadNote: 'Variabilidad típica de convección subtropical insular; sin sistemas severos previstos.'
    }
  }
];

export const ALERTS_DATA = [
  {
    id: 'ALT-OF-001',
    originCategory: 'OFFICIAL_AUTHORITY',
    originLabel: 'ALERTA OFICIAL (DMC / SENAPRED)',
    issuer: 'Dirección Meteorológica de Chile (DMC) & SENAPRED',
    severity: 'EXTREMA',
    eventType: 'LLUVIA_ISOTERMA_ALTA',
    title: 'Alerta Meteorológica por Precipitaciones Moderadas a Fuertes con Isoterma 0 °C Alta',
    regions: ['RM', 'VI', 'VII'],
    communesIds: ['santiago', 'rancagua', 'talca'],
    affectedZonesText: 'Precordillera y Cordillera de las regiones Metropolitana (San José de Maipo, Lo Barnechea), O’Higgins (Machalí) y Maule (Romeral, San Clemente) entre 2.200 y 3.120 m s.n.m.',
    whatCouldHappen: 'Precipitación líquida sobre sectores que habitualmente reciben nieve (entre 2.400 y 3.100 m s.n.m.) durante las primeras 9 a 12 horas del evento, con acumulados estimados de 35 a 65 mm, aumentando la escorrentía rápida, turbidez de cauces y potencial activación de quebradas.',
    onsetUtc: '2026-10-19T14:00:00Z',
    expiresUtc: '2026-10-20T12:00:00Z',
    issuedAtUtc: '2026-10-19T13:30:00Z',
    confidenceLevel: 'ALTA',
    confidenceRationale: 'Acuerdo superior al 85% entre ECMWF IFS, NOAA GFS y radiosondeo de Santo Domingo en transporte integrado de vapor (IVT > 450 kg/m/s).',
    preventiveActions: [
      'Alejarse de riberas de ríos, esteros y quebradas precordilleranas (Cajón del Maipo, Alto Cachapoal, Río Claro).',
      'No cruzar pasos badenes ni caminos inundados a pie o en vehículo.',
      'Mantener monitoreo de avisos SAE de SENAPRED y estado de suministro de agua potable.',
      'Equipos municipales: verificar despeje de colectores y monitoreo preventivo de bocatomas.'
    ],
    officialUrl: 'https://www.meteochile.gob.cl/PortalDMC-web/index.xhtml',
    secondaryUrl: 'https://senapred.cl/alertas/'
  },
  {
    id: 'ALT-OF-002',
    originCategory: 'OFFICIAL_AUTHORITY',
    originLabel: 'ALERTA OFICIAL (DMC)',
    issuer: 'Dirección Meteorológica de Chile (DMC)',
    severity: 'TEMPRANA',
    eventType: 'VIENTO_INTENSO',
    title: 'Alerta Temprana por Viento Moderado a Fuerte en Magallanes y Tierra del Fuego',
    regions: ['XII'],
    communesIds: ['puntaarenas'],
    affectedZonesText: 'Pampa Patagónica, Punta Arenas, Puerto Natales y Porvenir (Región de Magallanes).',
    whatCouldHappen: 'Viento sostenido del oeste de 60 a 75 km/h con rachas que pueden alcanzar entre 90 y 105 km/h, provocando desprendimiento de techumbres ligeras, caída de ramas y restricción de navegación menor en el Estrecho de Magallanes.',
    onsetUtc: '2026-10-19T15:00:00Z',
    expiresUtc: '2026-10-20T23:00:00Z',
    issuedAtUtc: '2026-10-19T12:45:00Z',
    confidenceLevel: 'ALTA',
    confidenceRationale: 'Fuerte gradiente bárico meridional observado en boyas y estaciones australes.',
    preventiveActions: [
      'Asegurar planchas de zinc, techumbres, andamios y objetos sueltos en patios.',
      'Conducir con precaución en Ruta 9 Norte por ráfagas laterales severas.',
      'Verificar estado de zarpe y puertos en portal SITPORT de DIRECTEMAR.'
    ],
    officialUrl: 'https://www.meteochile.gob.cl/PortalDMC-web/index.xhtml',
    secondaryUrl: 'https://sitport.directemar.cl/'
  },
  {
    id: 'ALT-OF-003',
    originCategory: 'OFFICIAL_AUTHORITY',
    originLabel: 'ALERTA OFICIAL (SHOA / DIRECTEMAR)',
    issuer: 'Servicio Hidrográfico y Oceanográfico de la Armada (SHOA)',
    severity: 'PREVENTIVA',
    eventType: 'MAREJADAS',
    title: 'Aviso Oficial de Marejadas desde Golfo de Penas hasta Coquimbo',
    regions: ['IV', 'V', 'VIII', 'XIV', 'X'],
    communesIds: ['laserena', 'valparaiso', 'concepcion', 'valdivia', 'puertomontt'],
    affectedZonesText: 'Borde costero continental desde Región de Los Lagos hasta Región de Coquimbo, especialmente bahías abiertas al suroeste y oeste-noroeste.',
    whatCouldHappen: 'Oleaje de fondo (swell) con altura significativa de 2.8 a 4.2 metros y periodo de 14-16 segundos, generando rompiente fuerte en costaneras, sobrepasos en horas de pleamar y cierre preventivo de caletas.',
    onsetUtc: '2026-10-19T12:00:00Z',
    expiresUtc: '2026-10-21T18:00:00Z',
    issuedAtUtc: '2026-10-19T11:00:00Z',
    confidenceLevel: 'ALTA',
    confidenceRationale: 'Tren de olas generado por sistema frontal en el Pacífico Sur ya detectado por altimetría satelital.',
    preventiveActions: [
      'No transitar por roqueríos, espigones ni paseos costeros expuestos al rompimiento de olas.',
      'Respetar cierres de playas y restricciones de la Autoridad Marítima (137).',
      'Reforzar amarras de embarcaciones menores en caletas pesqueras.'
    ],
    officialUrl: 'https://www.marejadas.shoa.cl/',
    secondaryUrl: 'https://sitport.directemar.cl/'
  },
  {
    id: 'ALT-APP-004',
    originCategory: 'APP_THRESHOLD_ESTIMATE',
    originLabel: 'ESTIMACIÓN PREVENTIVA DE LA APP (No Oficial)',
    issuer: 'Motor Hidrometeorológico ClimasFlood (Basado en ECMWF + GloFAS)',
    severity: 'TEMPRANA',
    eventType: 'ANEGAMIENTO_CRECIDA',
    title: 'Aviso Estimado por Saturación de Suelos y Respuesta Rápida en Cuencas del Maule y Biobío',
    regions: ['VII', 'XVI', 'VIII'],
    communesIds: ['talca', 'chillan', 'concepcion'],
    affectedZonesText: 'Subcuencas bajas del río Mataquito, río Claro en Talca, río Ñuble y cuenca urbana del río Andalién (Concepción).',
    whatCouldHappen: 'Debido a la precipitación antecedente (>30 mm en 24 h) más los 25-45 mm adicionales estimados en las próximas 18 h, el modelo hidrológico estima un incremento rápido de niveles fluviométricos y posibles anegamientos en pasos bajo nivel y sectores urbanos de drenaje lento.',
    onsetUtc: '2026-10-19T16:00:00Z',
    expiresUtc: '2026-10-20T18:00:00Z',
    issuedAtUtc: '2026-10-19T15:05:00Z',
    confidenceLevel: 'MEDIA',
    confidenceRationale: 'Estimación numérica sujeta a la localización exacta de las bandas convectivas postfrontales (rango P50–P90 entre 39 y 74 mm).',
    preventiveActions: [
      'Revisar canaletas y sumideros domiciliarios antes del pulso nocturno.',
      'Evitar transitar por pasos bajo nivel con acumulación de agua.',
      'Contrastar siempre con los boletines hidrometeorológicos oficiales de DGA y SENAPRED.'
    ],
    officialUrl: 'https://snia.mop.gob.cl/dga/',
    secondaryUrl: 'https://senapred.cl/alertas/'
  },
  {
    id: 'ALT-APP-005',
    originCategory: 'APP_THRESHOLD_ESTIMATE',
    originLabel: 'ESTIMACIÓN PREVENTIVA DE LA APP (No Oficial)',
    issuer: 'Motor Agrometeorológico ClimasFlood (Basado en Ensambles NWP)',
    severity: 'INFORMATIVA',
    eventType: 'HELADA_POSTFRONTAL',
    title: 'Vigilancia por Helada Matinal Postfrontal (Miércoles 21 de Octubre)',
    regions: ['VII', 'XVI', 'IX', 'XIV', 'XI'],
    communesIds: ['talca', 'chillan', 'temuco', 'valdivia', 'coyhaique'],
    affectedZonesText: 'Valles interiores de Maule, Ñuble y La Araucanía (0 °C a 2 °C) y valles de Aysén (-3 °C a -5 °C).',
    whatCouldHappen: 'El ingreso de una alta presión fría migratoria tras las lluvias, combinado con cielos despejados y viento calmo durante la madrugada del miércoles 21, favorecerá pérdidas radiativas nocturnas con probables heladas superficiales en zonas agrícolas y escarcha en rutas australes.',
    onsetUtc: '2026-10-21T06:00:00Z',
    expiresUtc: '2026-10-21T13:00:00Z',
    issuedAtUtc: '2026-10-19T15:05:00Z',
    confidenceLevel: 'MEDIA',
    confidenceRationale: 'Depende del despeje total de la nubosidad residual la noche del martes 20.',
    preventiveActions: [
      'Agricultores: planificar medidas de control pasivo/activo de heladas para cultivos sensibles en floración/cuaja.',
      'Conductores en Aysén y La Araucanía: precaución por formación de hielo negro en puentes y zonas sombrías.'
    ],
    officialUrl: 'https://agrometeorologia.cl/',
    secondaryUrl: 'https://www.meteochile.gob.cl/'
  },
  {
    id: 'ALT-OF-006',
    originCategory: 'OFFICIAL_AUTHORITY',
    originLabel: 'ALERTA OFICIAL (DMC)',
    issuer: 'Dirección Meteorológica de Chile (DMC)',
    severity: 'TEMPRANA',
    eventType: 'TORMENTA_ELECTRICA',
    title: 'Aviso Meteorológico por Probables Tormentas Eléctricas en Precordillera y Cordillera',
    regions: ['V', 'RM', 'VI', 'VII'],
    communesIds: ['santiago', 'rancagua', 'talca', 'valparaiso'],
    affectedZonesText: 'Sectores de precordillera y valles precordilleranos de Valparaíso, Metropolitana, O’Higgins y Maule.',
    whatCouldHappen: 'Desarrollo de nubes convectivas profundas (Cumulonimbus) con descargas eléctricas nube-tierra, chubascos intensos focalizados de corta duración, rachas de viento convectivas de 40 a 60 km/h y probabilidad de granizo menudo.',
    onsetUtc: '2026-10-19T17:00:00Z',
    expiresUtc: '2026-10-20T04:00:00Z',
    issuedAtUtc: '2026-10-19T14:30:00Z',
    confidenceLevel: 'ALTA',
    confidenceRationale: 'Índices de inestabilidad termodinámica favorables: CAPE superior a 800 J/kg y Lifted Index inferior a -3 °C.',
    preventiveActions: [
      'Permanecer en un lugar seguro (construcción sólida) durante el desarrollo de la tormenta eléctrica.',
      'No refugiarse bajo árboles aislados ni estructuras metálicas en campo abierto.',
      'Desconectar artefactos electrónicos sensibles y evitar el contacto con agua de tuberías durante la actividad eléctrica.'
    ],
    officialUrl: 'https://www.meteochile.gob.cl/PortalDMC-web/index.xhtml',
    secondaryUrl: 'https://senapred.cl/alertas/'
  },
  {
    id: 'ALT-APP-007',
    originCategory: 'APP_THRESHOLD_ESTIMATE',
    originLabel: 'ESTIMACIÓN PREVENTIVA DE LA APP (Alerta Agéntica)',
    issuer: 'Agente Detector de Crecidas Repentinas (ClimasFlood FlashFloodWatchAgent)',
    severity: 'EXTREMA',
    eventType: 'FLASH_FLOOD_AGENTE',
    title: 'Alerta Agéntica Temprana por Riesgo de Crecida Repentina (Flash Flood) en Quebradas Andinas',
    regions: ['RM', 'VI'],
    communesIds: ['santiago', 'rancagua'],
    affectedZonesText: 'Subcuencas de alta pendiente en Cajón del Maipo (San Alfonso, San Gabriel, El Manzano) y cuenca alta del río Cachapoal (Machalí, Coya).',
    whatCouldHappen: 'El acoplamiento de un pulso convectivo con tasas puntuales >12 mm/h sobre terreno saturado e isoterma 0 °C en 3.050 m s.n.m. genera tiempo de concentración corto (~45 min) con alto riesgo de flujos de detritos y turbidez severa que obligue a corte preventivo en plantas de agua potable.',
    onsetUtc: '2026-10-19T15:30:00Z',
    expiresUtc: '2026-10-20T03:00:00Z',
    issuedAtUtc: '2026-10-19T15:12:00Z',
    confidenceLevel: 'ALTA',
    confidenceRationale: 'Detección automática multivariable cruzada entre pluviometría horaria en cabecera, dispersión de modelos y tope nuboso infrarrojo (-55 °C).',
    preventiveActions: [
      'Alerta inmediata a operadores sanitarios para llenado de estanques de reserva de agua potable.',
      'Evacuación preventiva de campamentos de faenas y turistas en bordes de ríos precordilleranos.',
      'Monitoreo continuo en tiempo real de niveles fluviométricos telemétricos DGA y avisos SAE.'
    ],
    officialUrl: 'https://snia.mop.gob.cl/dga/',
    secondaryUrl: 'https://senapred.cl/alertas/'
  }
];

export const SCENARIOS_DATA = [
  {
    id: 'ESC-01',
    hazardType: 'ALUVION_ISOTERMA_ALTA',
    title: 'Escenario 1: Escorrentía Pluvial en Precordillera por Isoterma 0 °C Elevada',
    affectedMacrozones: ['Zona Central'],
    communesIds: ['santiago', 'rancagua', 'talca'],
    affectedZonesDetail: 'Quebradas precordilleranas de San José de Maipo, Pirque, Machalí, San Fernando y San Clemente (cotas entre 2.100 y 3.050 m s.n.m.).',
    timeWindow: 'Lunes 19 Oct 15:00 HL a Martes 20 Oct 06:00 HL (ventana crítica de 15 horas)',
    probabilityBand: 'MODERADA A ALTA (55% – 75%)',
    confidenceLevel: 'ALTA',
    narrative: 'El acoplamiento de un flujo prefrontal templado con tasas de precipitación de 4 a 9 mm/h mantiene la isoterma 0 °C cerca de los 3.000 m s.n.m. en el inicio del evento. Esto implica captación pluvial en cuencas que normalmente retienen nieve, aumentando el caudal líquido y el arrastre de sedimentos finos antes de que ingrese la masa fría postfrontal.',
    supportingFactors: [
      'Observación actual en Quinta Normal / Cajón del Maipo: lluvia activa con isoterma estimada en 3.050 m s.n.m.',
      'Consenso de ECMWF IFS y NOAA GFS en acumulado de 35–58 mm en precordillera central en 24 horas.',
      'Saturación superficial previa del suelo (humedad antecedente >78%).'
    ],
    invalidationSignals: [
      'Si el frente frío en altura adelanta su ingreso en 3–4 horas, la isoterma 0 °C descenderá rápidamente a 2.200 m s.n.m., transformando la lluvia en nieve y reduciendo drásticamente la escorrentía líquida.',
      'Si la tasa horaria de precipitación se mantiene bajo 3 mm/h en estaciones precordilleranas.'
    ]
  },
  {
    id: 'ESC-02',
    hazardType: 'INUNDACION_URBANA_CRECIDA',
    title: 'Escenario 2: Anegamientos Urbanos y Crecida de Cauces en Maule, Ñuble y Biobío',
    affectedMacrozones: ['Zona Central', 'Zona Centro-Sur'],
    communesIds: ['talca', 'chillan', 'concepcion'],
    affectedZonesDetail: 'Zonas bajas urbanas de Talca, Chillán y Gran Concepción; riberas secundarias de los ríos Claro, Ñuble y Andalién.',
    timeWindow: 'Lunes 19 Oct 16:00 HL a Martes 20 Oct 14:00 HL',
    probabilityBand: 'MODERADA (45% – 65%)',
    confidenceLevel: 'MEDIA',
    narrative: 'La persistencia de bandas de precipitación frontal seguidas de núcleos convectivos postfrontales puede generar pulsos cortos de alta intensidad (8–12 mm en 1–2 horas) sobre suelos ya saturados, superando temporalmente la capacidad de drenaje pluvial urbano.',
    supportingFactors: [
      'Acumulados registrados en las últimas 24 h entre 29 y 38 mm en Talca, Chillán y Concepción.',
      'Pronóstico P90 indica hasta 30–45 mm adicionales en las próximas 24 horas.',
      'Pronóstico hidrológico GloFAS muestra ascenso de caudal hacia percentil 85–90.'
    ],
    invalidationSignals: [
      'Desplazamiento más rápido del eje de la vaguada hacia territorio argentino, cortando las precipitaciones antes de la medianoche.',
      'Ausencia de células convectivas costeras en la secuencia satelital GOES-16.'
    ]
  },
  {
    id: 'ESC-03',
    hazardType: 'HELADA_RADIATIVA_AGRICOLA',
    title: 'Escenario 3: Heladas Matinales Postfrontales en Valles del Centro-Sur y Sur',
    affectedMacrozones: ['Zona Central', 'Zona Centro-Sur', 'Zona Sur', 'Zona Austral'],
    communesIds: ['rancagua', 'talca', 'chillan', 'temuco', 'valdivia', 'coyhaique'],
    affectedZonesDetail: 'Valles interiores agrícolas desde O’Higgins hasta Los Ríos (0 °C a 2 °C) y valles interiores de Aysén (-3 °C a -5 °C).',
    timeWindow: 'Madrugada del Miércoles 21 de Octubre (03:00 a 08:30 HL)',
    probabilityBand: 'MODERADA A ALTA (60% – 75%)',
    confidenceLevel: 'MEDIA',
    narrative: 'Una vez que se retire el sistema frontal el martes por la tarde, se establecerá una alta presión fría con aire polar seco. La disminución del viento y la pérdida de radiación infrarroja nocturna provocarán un fuerte enfriamiento superficial al amanecer del miércoles.',
    supportingFactors: [
      'Isoterma 0 °C descendiendo hasta 1.200 m en La Araucanía y 600 m en Aysén el martes 20.',
      'Proyección de nubosidad <30% y viento <10 km/h durante la madrugada del miércoles 21.'
    ],
    invalidationSignals: [
      'Formación de estratos bajos o niebla densa nocturna que actúe como capa aislante e impida que la temperatura baje de 3 °C.',
      'Persistencia de viento superior a 15 km/h que mezcle la capa límite superficial.'
    ]
  },
  {
    id: 'ESC-04',
    hazardType: 'VIENTO_EXTREMO_Y_MAREJADAS',
    title: 'Escenario 4: Temporal de Viento en Patagonia y Marejadas en Litoral Central y Sur',
    affectedMacrozones: ['Zona Austral', 'Zona Central', 'Zona Sur'],
    communesIds: ['puntaarenas', 'valparaiso', 'laserena', 'concepcion', 'puertomontt'],
    affectedZonesDetail: 'Estrecho de Magallanes y Tierra del Fuego (viento >95 km/h); borde costero desde Los Lagos a Coquimbo (oleaje 3–4 m).',
    timeWindow: 'Lunes 19 Oct al Miércoles 21 Oct',
    probabilityBand: 'ALTA (75% – 90%)',
    confidenceLevel: 'ALTA',
    narrative: 'El paso sucesivo de bajas presiones subantárticas profundas (985–994 hPa) mantiene un chorro de bajo nivel intenso sobre Magallanes y proyecta trenes de olas de largo periodo hacia la costa central y sur de Chile.',
    supportingFactors: [
      'Rachas ya observadas de 92 km/h en estación Carlos Ibáñez del Campo (Punta Arenas).',
      'Modelo marino proyecta ola significativa Hs = 3.6 m con periodo Tp = 15 s en Valparaíso y Biobío.'
    ],
    invalidationSignals: [
      'Debilitamiento del gradiente de presión al sur del Paso Drake antes del martes 20 por la tarde.'
    ]
  }
];

export const VERIFICATION_HISTORY = [
  {
    id: 'VER-01',
    locationId: 'santiago',
    locationName: 'Santiago (Quinta Normal)',
    targetDate: '2026-10-18',
    leadTimeHours: 24,
    modelName: 'Consenso Multimodelo (ECMWF/GFS/ICON)',
    predictedPrecipP50Mm: 10.5,
    predictedPrecipRangeMm: '7.5 – 14.0',
    observedPrecipMm: 11.8,
    predictedTempMaxC: 15.0,
    observedTempMaxC: 14.6,
    precipAbsErrorMm: 1.3,
    tempAbsErrorC: 0.4,
    withinUncertaintyBand: true,
    evaluationNote: 'Observación dentro de la banda intercuartil P10–P90 prevista a 24 h.'
  },
  {
    id: 'VER-02',
    locationId: 'valparaiso',
    locationName: 'Valparaíso (Rodelillo)',
    targetDate: '2026-10-18',
    leadTimeHours: 24,
    modelName: 'Consenso Multimodelo (ECMWF/GFS/ICON)',
    predictedPrecipP50Mm: 9.2,
    predictedPrecipRangeMm: '6.0 – 13.5',
    observedPrecipMm: 8.4,
    predictedTempMaxC: 15.5,
    observedTempMaxC: 15.1,
    precipAbsErrorMm: 0.8,
    tempAbsErrorC: 0.4,
    withinUncertaintyBand: true,
    evaluationNote: 'Excelente ajuste en inicio del pulso frontal costero.'
  },
  {
    id: 'VER-03',
    locationId: 'talca',
    locationName: 'Talca',
    targetDate: '2026-10-18',
    leadTimeHours: 48,
    modelName: 'Consenso Multimodelo (ECMWF/GFS/ICON)',
    predictedPrecipP50Mm: 25.0,
    predictedPrecipRangeMm: '18.0 – 33.0',
    observedPrecipMm: 29.6,
    predictedTempMaxC: 13.8,
    observedTempMaxC: 13.2,
    precipAbsErrorMm: 4.6,
    tempAbsErrorC: 0.6,
    withinUncertaintyBand: true,
    evaluationNote: 'El acumulado real se ubicó cerca del percentil 75 debido a intensificación orográfica.'
  },
  {
    id: 'VER-04',
    locationId: 'concepcion',
    locationName: 'Concepción (Carriel Sur)',
    targetDate: '2026-10-17',
    leadTimeHours: 72,
    modelName: 'Consenso Multimodelo (ECMWF/GFS/ICON)',
    predictedPrecipP50Mm: 31.0,
    predictedPrecipRangeMm: '21.0 – 42.0',
    observedPrecipMm: 38.5,
    predictedTempMaxC: 13.5,
    observedTempMaxC: 12.9,
    precipAbsErrorMm: 7.5,
    tempAbsErrorC: 0.6,
    withinUncertaintyBand: true,
    evaluationNote: 'Banda convectiva costera aportó +7.5 mm sobre la mediana P50, pero dentro del umbral P90 (42 mm).'
  },
  {
    id: 'VER-05',
    locationId: 'temuco',
    locationName: 'Temuco (Maquehue)',
    targetDate: '2026-10-17',
    leadTimeHours: 48,
    modelName: 'Consenso Multimodelo (ECMWF/GFS/ICON)',
    predictedPrecipP50Mm: 28.5,
    predictedPrecipRangeMm: '22.0 – 36.0',
    observedPrecipMm: 31.0,
    predictedTempMaxC: 11.5,
    observedTempMaxC: 11.2,
    precipAbsErrorMm: 2.5,
    tempAbsErrorC: 0.3,
    withinUncertaintyBand: true,
    evaluationNote: 'Alta precisión tanto en monto acumulado como en cota de nieve andina.'
  },
  {
    id: 'VER-06',
    locationId: 'puntaarenas',
    locationName: 'Punta Arenas',
    targetDate: '2026-10-18',
    leadTimeHours: 24,
    modelName: 'Consenso Multimodelo (ECMWF/GFS/ICON)',
    predictedPrecipP50Mm: 5.5,
    predictedPrecipRangeMm: '3.0 – 8.0',
    observedPrecipMm: 4.8,
    predictedTempMaxC: 7.0,
    observedTempMaxC: 6.8,
    precipAbsErrorMm: 0.7,
    tempAbsErrorC: 0.2,
    withinUncertaintyBand: true,
    evaluationNote: 'Error menor a 1 mm; racha máxima prevista 88 km/h vs 92 km/h observada.'
  }
];

export const AI_AGENTS_DATA = {
  evidenceRegistry: {
    'EV-101': {
      id: 'EV-101',
      source: 'DMC EMA Quinta Normal / San José de Maipo',
      timestampUtc: '2026-10-19T15:00:00Z',
      parameter: 'Precipitación 24h e Isoterma 0 °C',
      rawValue: '11.8 mm acumulados | Isoterma 0 °C en 3.050 m s.n.m.',
      dataType: 'OBSERVACION'
    },
    'EV-102': {
      id: 'EV-102',
      source: 'Open-Meteo Multi-Model (ECMWF IFS 12Z vs NOAA GFS 12Z)',
      timestampUtc: '2026-10-19T15:05:00Z',
      parameter: 'Acumulado 72h y dispersión de Isoterma 0 °C en RM',
      rawValue: 'ECMWF: 47.3 mm (Iso mín 2.150m) | GFS: 58.1 mm (Iso mín 2.320m) | ICON: 41.0 mm',
      dataType: 'PRONOSTICO_NUMERICO'
    },
    'EV-103': {
      id: 'EV-103',
      source: 'GOES-16 ABI Banda 13 (10.3 µm) + Banda 08 Vapor de Agua',
      timestampUtc: '2026-10-19T15:10:00Z',
      parameter: 'Pluma de humedad prefrontal (Río Atmosférico)',
      rawValue: 'Tope nuboso -54 °C ingresando entre latitud 32°S y 37°S con desplazamiento E-SE a 42 km/h',
      dataType: 'OBSERVACION_SATELITAL'
    },
    'EV-104': {
      id: 'EV-104',
      source: 'Comparador de Corridas NWP (00Z vs 12Z en Maule/Ñuble)',
      timestampUtc: '2026-10-19T15:05:00Z',
      parameter: 'Cambio entre corridas (Shift Detection)',
      rawValue: 'Incremento de +9.4 mm en percentil 90 para Talca y Chillán respecto a corrida 00Z',
      dataType: 'ANALISIS_PREDICTIVO'
    },
    'EV-105': {
      id: 'EV-105',
      source: 'Estación DMC Carlos Ibáñez del Campo (Punta Arenas)',
      timestampUtc: '2026-10-19T15:00:00Z',
      parameter: 'Racha máxima de viento',
      rawValue: '92 km/h dirección Oeste (270°), presión 994.6 hPa',
      dataType: 'OBSERVACION'
    },
    'EV-106': {
      id: 'EV-106',
      source: 'GOES-16 GLM (Lightning Mapper) + Open-Meteo Inestabilidad CAPE',
      timestampUtc: '2026-10-19T15:11:00Z',
      parameter: 'Inestabilidad convectiva y actividad de rayos',
      rawValue: 'CAPE: 890 J/kg | Lifted Index: -3.8 | Pulsos de rayos detectados en precordillera de Machalí y Cajón del Maipo',
      dataType: 'OBSERVACION_SATELITAL'
    },
    'EV-107': {
      id: 'EV-107',
      source: 'Radar Hidrológico y Estación Telemétrica DGA Cabecera Río Colorado',
      timestampUtc: '2026-10-19T15:12:00Z',
      parameter: 'Tasa pluvial y tiempo de concentración de cuenca',
      rawValue: 'Tasa puntual 14.2 mm/h sobre cota 2.850 m s.n.m. con tiempo de concentración estimado en 45 minutos',
      dataType: 'OBSERVACION'
    }
  },
  agents: [
    {
      id: 'AG-MON-01',
      name: 'Agente Monitor de Fuentes y Calidad (SourceMonitor)',
      role: 'Monitoreo continuo de disponibilidad, latencia, TTL y anomalías físicas (QC)',
      status: 'ACTIVO',
      autonomyLevel: 'SOLO_LECTURA_Y_DIAGNOSTICO',
      lastRunUtc: '2026-10-19T15:10:00Z',
      findings: [
        {
          text: 'Las 6 fuentes primarias reportan estado ONLINE dentro de su ventana TTL; el canal infrarrojo GOES-16 actualizó hace 4 minutos.',
          citations: ['EV-103']
        },
        {
          text: 'Control de calidad (QC) validó registros de superficie desde Arica a Magallanes sin saltos térmicos espurios.',
          citations: ['EV-101', 'EV-105']
        }
      ]
    },
    {
      id: 'AG-ANA-02',
      name: 'Agente Analista de Divergencia de Modelos (ForecastAnalyst)',
      role: 'Cuantificación de incertidumbre entre ECMWF IFS, NOAA GFS y DWD ICON',
      status: 'ACTIVO',
      autonomyLevel: 'EXPLICATIVO_CON_CITAS',
      lastRunUtc: '2026-10-19T15:08:00Z',
      findings: [
        {
          text: 'En la Región Metropolitana, existe alta convergencia en la ocurrencia de lluvias significativas (>40 mm en 72 h), pero GFS mantiene la isoterma 0 °C unos 170 m más alta que ECMWF durante el pulso inicial.',
          citations: ['EV-102']
        },
        {
          text: 'La banda de incertidumbre P50–P90 recomienda planificar con escenario de 32 a 54.5 mm para hoy en Santiago.',
          citations: ['EV-102']
        }
      ]
    },
    {
      id: 'AG-DET-03',
      name: 'Agente Detector de Cambios Relevantes (ShiftDetector)',
      role: 'Detección de variaciones bruscas entre corridas sucesivas de modelos (00Z vs 12Z)',
      status: 'ACTIVO',
      autonomyLevel: 'ALERTA_INTERNA_SUPERVISADA',
      lastRunUtc: '2026-10-19T15:09:00Z',
      findings: [
        {
          text: 'La corrida 12Z incrementó en +9.4 mm el extremo superior (P90) de precipitación para las cuencas del Maule y Ñuble debido a mayor retención orográfica detectada en el flujo del noroeste.',
          citations: ['EV-104', 'EV-103']
        }
      ]
    },
    {
      id: 'AG-BRI-04',
      name: 'Agente Redactor de Boletines Trazables (BriefingSynthesizer)',
      role: 'Generación de resúmenes para ciudadanía y equipos de emergencia con revisión humana obligatoria en eventos severos',
      status: 'ESPERANDO_REVISION_HUMANA',
      autonomyLevel: 'BLOQUEADO_SIN_APROBACION_HITL',
      lastRunUtc: '2026-10-19T15:11:00Z',
      findings: [
        {
          text: 'Síntesis nacional generada con 100% de afirmaciones vinculadas a fuentes verificables. Recomendación operativa para precordillera central retenida en cola HITL por involucrar nivel de riesgo EXTREMO.',
          citations: ['EV-101', 'EV-102', 'EV-103', 'EV-104']
        }
      ]
    },
    {
      id: 'AG-FLA-05',
      name: 'Agente Guardián de Crecidas Repentinas (FlashFloodWatchAgent)',
      role: 'Detección temprana y acoplamiento orográfico de pulsos convectivos torrenciales con isoterma 0 °C alta',
      status: 'ACTIVO',
      autonomyLevel: 'ALERTA_INTERNA_SUPERVISADA',
      lastRunUtc: '2026-10-19T15:12:00Z',
      findings: [
        {
          text: 'Alerta agéntica preventiva: Acoplamiento de pulso convectivo (>14 mm/h) con isoterma 0 °C en 3.050 m s.n.m. activa umbral crítico de Flash Flood en subcuencas precordilleranas del Maipo y Mapocho.',
          citations: ['EV-101', 'EV-107']
        },
        {
          text: 'Inestabilidad convectiva severa (CAPE 890 J/kg, LI -3.8) detectada en sector cordillerano con alta probabilidad de tormentas eléctricas, ráfagas descendentes y granizo focalizado.',
          citations: ['EV-103', 'EV-106']
        }
      ]
    }
  ],
  hitlQueue: [
    {
      id: 'HITL-201',
      agentId: 'AG-BRI-04',
      createdAtUtc: '2026-10-19T15:11:00Z',
      targetAudience: 'Equipos de Emergencia Comunales (RM, O’Higgins y Maule)',
      impactLevel: 'ALTO_IMPACTO',
      status: 'PENDIENTE_REVISION_HUMANA',
      proposedSummary: 'INFERENCIA ASISTIDA POR IA (Sujeta a Aprobación Humana): Se recomienda reforzar el monitoreo preventivo de quebradas en San José de Maipo, Machalí y San Clemente entre las 15:00 y 03:00 HL. La combinación de lluvia activa observada [EV-101], tope nuboso frío en avance satelital [EV-103] y la dispersión de isoterma 0 °C entre 2.950 y 3.120 m s.n.m. en los modelos ECMWF/GFS [EV-102] respalda una probabilidad moderada-alta de escorrentía pluvial rápida antes del descenso térmico de mañana.',
      citations: ['EV-101', 'EV-102', 'EV-103'],
      guardrailChecks: [
        { rule: 'No modifica ni reemplaza alertas oficiales de DMC/SENAPRED', passed: true },
        { rule: 'Cada cifra posee vínculo directo a registro de evidencia [EV-*]', passed: true },
        { rule: 'Expresa probabilidad y evita presentar inferencias como hechos consumados', passed: true },
        { rule: 'Retenido antes de envío de notificación crítica (Requiere firma humana)', passed: true }
      ]
    },
    {
      id: 'HITL-202',
      agentId: 'AG-FLA-05',
      createdAtUtc: '2026-10-19T15:12:30Z',
      targetAudience: 'COGRID Regional RM, Municipios de San José de Maipo y Machalí',
      impactLevel: 'ALTO_IMPACTO',
      status: 'PENDIENTE_REVISION_HUMANA',
      proposedSummary: 'ALERTA AGÉNTICA TEMPRANA DE FLASH FLOOD (Requiere Validación Humana): Se detecta pulso de lluvia convectiva intensa en cabecera cordillerana con isoterma 0 °C en 3.050 m s.n.m. [EV-101, EV-107] y actividad eléctrica asociada [EV-106]. Se recomienda activar monitoreo presencial de turbidez en bocatomas de agua potable y advertir a comunidades de San Alfonso, San Gabriel y Baños Morales ante riesgo inminente de flujos de detritos.',
      citations: ['EV-101', 'EV-106', 'EV-107'],
      guardrailChecks: [
        { rule: 'No reemplaza canales vinculantes SAE de SENAPRED', passed: true },
        { rule: 'Vínculo estricto a evidencia hidrológica [EV-101], [EV-106] y [EV-107]', passed: true },
        { rule: 'Tiempo de respuesta estimado en 45 minutos hacia el valle', passed: true },
        { rule: 'Bloqueo preventivo de despacho masivo sin confirmación técnica HITL', passed: true }
      ]
    }
  ]
};
