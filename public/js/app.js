import {
  DATA_SOURCES,
  CHILE_LOCATIONS,
  ALERTS_DATA,
  SCENARIOS_DATA,
  VERIFICATION_HISTORY,
  AI_AGENTS_DATA
} from './data/chile-data.js';
import {
  fetchLiveOpenMeteoForLocation,
  syncLocationViaServerOrDirect,
  fetchRainViewerMetadata,
  buildCartoBuilderGeoJsonClient
} from './modules/live-api.js';
import {
  MAP_LAYERS_META,
  mapControllerSingleton,
  renderNationalMapSVG
} from './modules/map-engine.js';
import {
  SATELLITE_FRAMES,
  satelliteEngineSingleton,
  renderSatelliteComparisonCanvas
} from './modules/satellite-viewer.js';
import {
  renderHourlyRainChartSVG,
  renderModelComparisonChartSVG
} from './modules/charts.js';

const STATE = {
  themePref: 'light', // 'light' | 'dark' | 'system'
  viewMode: 'citizen', // 'citizen' | 'technical'
  activeNavGroup: 'mapa', // 'mapa' | 'pronostico' | 'alertas' | 'mas'
  activeTabId: 'tab-mapa',
  selectedLocationId: 'santiago',
  selectedMacrozone: 'ALL',
  timezoneMode: 'AUTO',
  activeMapLayer: 'precipitacion',
  mapHourOffset: 0,
  mapTimelinePlaying: false,
  mapTimelineTimerId: null,
  staleSimulationActive: false,
  grayscaleModeActive: false,
  satChannel: 'ir_b13',
  satFrameIndex: 6,
  satCompareFrameIndex: 3,
  satCompareEnabled: true,
  satSplitPct: 50,
  satPlaying: false,
  rainViewerMeta: null,
  alertOriginFilter: 'ALL',
  alertSeverityFilter: 'ALL',
  highlightedEvidenceId: null,
  notifications: []
};

const TIME_SLIDER_STEPS = [0, 6, 12, 24, 48];

const TAB_TO_GROUP = {
  'tab-mapa': 'mapa',
  'tab-pronostico': 'pronostico',
  'tab-lluvia': 'pronostico',
  'tab-alertas': 'alertas',
  'tab-satelite': 'mas',
  'tab-escenarios': 'mas',
  'tab-predictivo': 'mas',
  'tab-agentes': 'mas',
  'tab-fuentes': 'mas'
};

const GROUP_DEFAULT_TAB = {
  mapa: 'tab-mapa',
  pronostico: 'tab-pronostico',
  alertas: 'tab-alertas',
  mas: 'tab-satelite'
};

const SEVERITY_META = {
  EXTREMA: { icon: '🛑', label: 'Extrema', css: 'sev-EXTREMA' },
  TEMPRANA: { icon: '▲', label: 'Temprana', css: 'sev-TEMPRANA' },
  PREVENTIVA: { icon: '◆', label: 'Preventiva', css: 'sev-PREVENTIVA' },
  INFORMATIVA: { icon: 'ℹ', label: 'Informativa', css: 'sev-INFORMATIVA' }
};

function applyThemePreference(pref) {
  STATE.themePref = pref;
  try {
    localStorage.setItem('climasflood_theme', pref);
  } catch {
    // ignore storage errors
  }

  let effective = pref;
  if (pref === 'system') {
    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    effective = prefersDark ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', effective);

  document.querySelectorAll('.theme-toggle button').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-theme-opt') === pref);
  });

  mapControllerSingleton.updateLeafletThemeTiles();
}

function applyViewMode(mode) {
  STATE.viewMode = mode === 'technical' ? 'technical' : 'citizen';
  try {
    localStorage.setItem('climasflood_view_mode', STATE.viewMode);
  } catch {
    // ignore storage errors
  }

  document.body.setAttribute('data-view-mode', STATE.viewMode);
  document.querySelectorAll('.view-mode-toggle button').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-view-mode-opt') === STATE.viewMode);
  });
}

function initPreferencesFromStorage() {
  let savedTheme = 'light';
  let savedViewMode = 'citizen';
  try {
    savedTheme = localStorage.getItem('climasflood_theme') || 'light';
    savedViewMode = localStorage.getItem('climasflood_view_mode') || 'citizen';
  } catch {
    savedTheme = 'light';
    savedViewMode = 'citizen';
  }
  applyThemePreference(savedTheme);
  applyViewMode(savedViewMode);

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (STATE.themePref === 'system') {
        applyThemePreference('system');
      }
    });
  }
}

function activateTab(tabId) {
  const group = TAB_TO_GROUP[tabId] || 'mapa';
  STATE.activeTabId = tabId;
  STATE.activeNavGroup = group;

  document.querySelectorAll('.nav-group-btn').forEach((btn) => {
    const isGroup = btn.getAttribute('data-nav-group') === group;
    btn.classList.toggle('active', isGroup);
    btn.setAttribute('aria-expanded', isGroup ? 'true' : 'false');
  });

  const subNavBar = document.getElementById('subNavTabsBar');
  if (subNavBar) {
    // Mostrar barra de sub-pestañas cuando el grupo tiene múltiples vistas ('pronostico' o 'mas')
    subNavBar.classList.toggle('sub-nav-visible', group === 'pronostico' || group === 'mas');
  }

  document.querySelectorAll('.nav-tab').forEach((tab) => {
    const tId = tab.getAttribute('data-tab');
    const tGroup = tab.getAttribute('data-group') || TAB_TO_GROUP[tId];
    const isActive = tId === tabId;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    if (!tab.classList.contains('sidebar-nav-item')) {
      tab.classList.toggle('sub-tab-hidden', tGroup !== group);
    }
  });

  document.querySelectorAll('.view-section').forEach((sec) => {
    sec.classList.toggle('active', sec.id === tabId);
  });

  // Cierre automático del drawer en dispositivos móviles/tablets al seleccionar sección
  const sidebar = document.getElementById('appSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  if (sidebar && sidebarBackdrop && window.innerWidth <= 1024) {
    sidebar.classList.remove('sidebar-open');
    sidebarBackdrop.classList.remove('active');
  }

  if (tabId === 'tab-satelite') {
    renderSatelliteSection();
  } else if (tabId === 'tab-mapa') {
    setTimeout(() => {
      mapControllerSingleton.leafletMap?.invalidateSize();
    }, 50);
  }
  syncUrlState();
}

function getSelectedLocation() {
  return (
    CHILE_LOCATIONS.find((l) => l.id === STATE.selectedLocationId) ||
    CHILE_LOCATIONS[0]
  );
}

function getEffectiveTimezone() {
  if (STATE.timezoneMode !== 'AUTO') return STATE.timezoneMode;
  return getSelectedLocation().timezone || 'America/Santiago';
}

function formatUtcInChileTz(utcIsoStr, tzOverride) {
  const tz = tzOverride || getEffectiveTimezone();
  try {
    const dt = new Date(utcIsoStr);
    const formatted = new Intl.DateTimeFormat('es-CL', {
      timeZone: tz,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(dt);
    const shortTz =
      tz === 'America/Punta_Arenas'
        ? 'Magallanes (UTC-3)'
        : tz === 'Pacific/Easter'
        ? 'Rapa Nui (UTC-5)'
        : tz === 'UTC'
        ? 'UTC'
        : 'Chile Cont.';
    return `${formatted} (${shortTz})`;
  } catch {
    return utcIsoStr;
  }
}

function computeValidTimeForOffset(baseIsoUtc, offsetHours, tzOverride) {
  try {
    const baseMs = new Date(baseIsoUtc).getTime();
    const targetIso = new Date(baseMs + offsetHours * 3600 * 1000).toISOString();
    return formatUtcInChileTz(targetIso, tzOverride);
  } catch {
    return `t + ${offsetHours} h`;
  }
}

function buildFriendlyCitizenGuidance(loc) {
  const o = loc.observation;
  const p50_48h = (loc.daily7d[0]?.precipP50 || 0) + (loc.daily7d[1]?.precipP50 || 0);
  const p90_48h = (loc.daily7d[0]?.precipP90 || 0) + (loc.daily7d[1]?.precipP90 || 0);
  const sampleNote = o.isLiveSynced
    ? 'Pronóstico sincronizado con Open-Meteo.'
    : 'Escenario de demostración (datos de muestra).';

  if (STATE.viewMode === 'technical') {
    return `<strong>Diagnóstico Técnico (${loc.name}):</strong> ${loc.keyPhenomenon} Acumulado 48h proyectado: <strong>${p50_48h.toFixed(1)} mm (P50)</strong> a <strong>${p90_48h.toFixed(1)} mm (P90)</strong> en cuenca <em>${loc.basin}</em>. <em>(${sampleNote})</em>`;
  }

  if (loc.summaryRisk === 'EXTREMA') {
    return `<strong>¿Qué hacer a continuación?</strong> En este escenario se proyectan lluvias intensas (${p50_48h.toFixed(1)} a ${p90_48h.toFixed(1)} mm en 48 h) con cota de nieve alta (${o.freezingLevelM} m). Evita acercarte a riberas, quebradas y pasos bajo nivel de la cuenca <em>${loc.basin}</em>. <em>(${sampleNote})</em>`;
  }
  if (loc.summaryRisk === 'TEMPRANA') {
    return `<strong>¿Qué hacer a continuación?</strong> ${loc.keyPhenomenon} Revisa canaletas, evita sectores anegables y precaución ante rachas de ${o.windGustKmh} km/h. <em>(${sampleNote})</em>`;
  }
  if (loc.summaryRisk === 'PREVENTIVA') {
    return `<strong>¿Qué hacer a continuación?</strong> Vigilancia preventiva: ${loc.keyPhenomenon} Considera rachas de hasta ${o.windGustKmh} km/h en tus traslados. <em>(${sampleNote})</em>`;
  }
  return `<strong>¿Qué hacer a continuación?</strong> Condición estable (${o.conditionText}). Sin precauciones especiales por lluvia en las próximas 24 horas. <em>(${sampleNote})</em>`;
}

function updateClockAndHeaderStatus() {
  const loc = getSelectedLocation();
  const tz = getEffectiveTimezone();
  const clockEl = document.getElementById('chileClockDisplay');
  const territoryBadge = document.getElementById('activeTerritoryBadge');
  const sysBadge = document.getElementById('systemStatusBadge');
  const dataIntegrityBadge = document.getElementById('dataIntegrityBadge');
  const nowIso = new Date().toISOString();

  if (clockEl) {
    clockEl.textContent = `Hora Local: ${formatUtcInChileTz(nowIso, tz)}`;
  }
  if (territoryBadge) {
    territoryBadge.textContent = `${loc.macrozone} · Región ${loc.regionCode}`;
  }

  const anySynced = CHILE_LOCATIONS.some((l) => l.observation.isLiveSynced);
  if (sysBadge && !STATE.staleSimulationActive) {
    if (loc.observation.isLiveSynced) {
      sysBadge.className = 'epistemic-badge badge-observacion';
      sysBadge.textContent = `● Open-Meteo sincronizado (${loc.name.split('/')[0].trim()}) · Alertas de muestra`;
    } else if (anySynced) {
      sysBadge.className = 'epistemic-badge badge-pronostico';
      sysBadge.textContent = `🧪 Comuna actual con datos de muestra (actualizando o sin conexión)`;
    } else {
      sysBadge.className = 'epistemic-badge badge-estimacion';
      sysBadge.textContent = '🧪 Demostración (Datos de muestra locales)';
    }
  }

  if (dataIntegrityBadge) {
    if (loc.observation.isLiveSynced) {
      dataIntegrityBadge.className = 'epistemic-badge badge-observacion';
      dataIntegrityBadge.textContent = '● Datos Open-Meteo en vivo';
    } else {
      dataIntegrityBadge.className = 'epistemic-badge badge-estimacion';
      dataIntegrityBadge.textContent = '🧪 Datos de muestra (Demostración)';
    }
  }

  // Resumen de Comuna Activa en primera pantalla
  const kpiName = document.getElementById('kpiSelectedName');
  const kpiMeta = document.getElementById('kpiSelectedMeta');
  const kpiBadge = document.getElementById('kpiLocationRiskBadge');
  const condBanner = document.getElementById('detailConditionBanner');
  const heroTemp = document.getElementById('heroCurrentTemp');
  const heroPrecip48h = document.getElementById('heroPrecip48h');
  const heroIsoLevel = document.getElementById('heroIsoLevel');
  const heroGuidance = document.getElementById('heroHumanSummary');

  const p50_48h = (loc.daily7d[0]?.precipP50 || 0) + (loc.daily7d[1]?.precipP50 || 0);
  const p90_48h = (loc.daily7d[0]?.precipP90 || 0) + (loc.daily7d[1]?.precipP90 || 0);

  if (kpiName) kpiName.textContent = `${loc.name} (${loc.regionName})`;
  if (kpiMeta) {
    kpiMeta.textContent = `CUT ${loc.cut} · Cuenca ${loc.basin} · ${loc.elevationM} m s.n.m.`;
  }
  if (kpiBadge) {
    const sev = SEVERITY_META[loc.summaryRisk] || SEVERITY_META.INFORMATIVA;
    kpiBadge.className = `severity-pill ${sev.css}`;
    kpiBadge.textContent = `${sev.icon} Riesgo ${sev.label} (Muestra)`;
  }
  if (condBanner) {
    condBanner.textContent = `${loc.observation.conditionText} · Actualización: ${formatUtcInChileTz(loc.observation.observedAtUtc, loc.timezone)}`;
  }
  if (heroTemp) {
    heroTemp.textContent = `${loc.observation.tempC.toFixed(1)} °C · ${loc.observation.precip1hMm.toFixed(1)} mm/h`;
  }
  if (heroPrecip48h) {
    heroPrecip48h.textContent = `${p50_48h.toFixed(1)} – ${p90_48h.toFixed(1)} mm`;
  }
  if (heroIsoLevel) {
    heroIsoLevel.textContent = `${loc.observation.freezingLevelM} m s.n.m.`;
  }
  if (heroGuidance) {
    heroGuidance.innerHTML = buildFriendlyCitizenGuidance(loc);
  }

  document.querySelectorAll('.quick-commune-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.getAttribute('data-quick-loc') === loc.id);
  });

  const alertCountEl = document.getElementById('kpiActiveAlertsCount');
  if (alertCountEl) {
    const matching = ALERTS_DATA.filter(
      (a) => a.communesIds.includes(loc.id) || a.regions.includes(loc.regionCode)
    );
    const official = matching.filter((a) => a.originCategory === 'OFFICIAL_AUTHORITY').length;
    const app = matching.length - official;
    alertCountEl.textContent = matching.length
      ? `${official} oficiales · ${app} app · muestra`
      : 'ninguna en la muestra';
  }
}

function populateLocationSelectors() {
  const locSelect = document.getElementById('locationSelect');
  const notifSelect = document.getElementById('notifCommuneSelect');
  const filtered = CHILE_LOCATIONS.filter(
    (l) => STATE.selectedMacrozone === 'ALL' || l.macrozone === STATE.selectedMacrozone
  );

  if (locSelect) {
    locSelect.innerHTML = filtered
      .map(
        (l) =>
          `<option value="${l.id}" ${l.id === STATE.selectedLocationId ? 'selected' : ''}>
            [${l.regionCode}] ${l.name} — ${l.regionName}
          </option>`
      )
      .join('');

    if (!filtered.some((l) => l.id === STATE.selectedLocationId) && filtered[0]) {
      STATE.selectedLocationId = filtered[0].id;
      locSelect.value = STATE.selectedLocationId;
    }
  }

  const sidebarLocSelect = document.getElementById('sidebarLocationSelect');
  if (sidebarLocSelect) {
    sidebarLocSelect.innerHTML = CHILE_LOCATIONS.map(
      (l) => `<option value="${l.id}" ${l.id === STATE.selectedLocationId ? 'selected' : ''}>[${l.regionCode}] ${l.name}</option>`
    ).join('');
    sidebarLocSelect.value = STATE.selectedLocationId;
  }

  if (notifSelect && !notifSelect.innerHTML.trim()) {
    notifSelect.innerHTML = CHILE_LOCATIONS.map(
      (l) => `<option value="${l.id}">[${l.regionCode}] ${l.name}</option>`
    ).join('');
    notifSelect.value = STATE.selectedLocationId;
  }

  const searchDatalist = document.getElementById('communeSearchDatalist');
  if (searchDatalist && !searchDatalist.innerHTML.trim()) {
    searchDatalist.innerHTML = CHILE_LOCATIONS.map(
      (l) =>
        `<option value="${l.name} (${l.regionName}) — Cuenca ${l.basin}" data-loc-id="${l.id}"></option>`
    ).join('');
  }
}

function downloadCartoBuilderGeoJson() {
  const geojson = buildCartoBuilderGeoJsonClient(CHILE_LOCATIONS, ALERTS_DATA);
  const blob = new Blob([JSON.stringify(geojson, null, 2)], {
    type: 'application/geo+json;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'climasflood-chile-cartobuilder.geojson';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderMapAndDetailView() {
  const loc = getSelectedLocation();
  const layerMeta = MAP_LAYERS_META[STATE.activeMapLayer] || MAP_LAYERS_META.precipitacion;

  const mapBadge = document.getElementById('mapEpistemicBadge');
  const mapTimeLabel = document.getElementById('mapTimeLabel');
  const mapUnitLabel = document.getElementById('mapLayerUnitLabel');
  const mapOriginNote = document.getElementById('mapDataOriginNote');

  const validTimeStr = computeValidTimeForOffset(
    loc.observation.observedAtUtc,
    STATE.mapHourOffset,
    loc.timezone
  );

  if (mapBadge) {
    if (STATE.mapHourOffset === 0) {
      mapBadge.className = 'epistemic-badge badge-observacion';
      mapBadge.textContent = 'Observación (t = 0 h)';
    } else {
      mapBadge.className = 'epistemic-badge badge-pronostico';
      mapBadge.textContent = `Pronóstico (+${STATE.mapHourOffset} h)`;
    }
  }
  if (mapTimeLabel) {
    mapTimeLabel.innerHTML =
      STATE.mapHourOffset === 0
        ? `<strong>Observación (t = 0 h)</strong> · Hora válida: ${validTimeStr}`
        : `<strong>Pronóstico (+${STATE.mapHourOffset} h)</strong> · Hora válida: ${validTimeStr}`;
  }
  if (mapUnitLabel) {
    mapUnitLabel.textContent = `Capa: ${layerMeta.label} (${layerMeta.unit})`;
  }
  if (mapOriginNote) {
    mapOriginNote.textContent = loc.observation.isLiveSynced
      ? 'Fuente activa: Open-Meteo + GloFAS + Marine APIs (Sincronizado en vivo)'
      : 'Fuente activa: Datos de muestra (Demostración)';
  }

  renderNationalMapSVG({
    container: document.getElementById('nationalMapContainer'),
    locations: CHILE_LOCATIONS,
    selectedLocationId: STATE.selectedLocationId,
    activeLayer: STATE.activeMapLayer,
    hourOffset: STATE.mapHourOffset,
    onSelectLocation: (locId) => {
      STATE.selectedLocationId = locId;
      const sel = document.getElementById('locationSelect');
      if (sel) sel.value = locId;
      refreshAllViews();
    },
    onExportGeoJson: () => {
      downloadCartoBuilderGeoJson();
    }
  });

  const legendBox = document.getElementById('mapLegendBox');
  if (legendBox) {
    legendBox.innerHTML = layerMeta.legend
      .map(
        (item) => `
        <span class="legend-item">
          <span class="legend-swatch" style="background:${item.color}">${item.symbol}</span>
          <span>${item.label}</span>
        </span>
      `
      )
      .join('');
  }

  const srcObj = DATA_SOURCES.find((s) => s.id === layerMeta.sourceId) || DATA_SOURCES[0];
  const mapProv = document.getElementById('mapProvenanceBar');
  if (mapProv) {
    const statusText = STATE.staleSimulationActive
      ? '⚠ Simulación de fuente vencida (TTL > 45 min)'
      : loc.observation.isLiveSynced
      ? '● Sincronizado con Open-Meteo / GloFAS / Marine en esta sesión'
      : '🧪 Datos de muestra (Escenario predefinido)';
    mapProv.innerHTML = `
      <span><strong>Referencia:</strong> ${layerMeta.sourceName}</span>
      <span>•</span>
      <span><strong>Hora de referencia:</strong> ${formatUtcInChileTz(loc.observation.observedAtUtc, loc.timezone)}</span>
      <span>•</span>
      <span><strong>Estado:</strong> ${statusText}</span>
      <span>•</span>
      <a href="${srcObj.url}" target="_blank" rel="noopener noreferrer">Sitio de Referencia ↗</a>
    `;
  }

  const titleEl = document.getElementById('detailLocationTitle');
  const subEl = document.getElementById('detailLocationSubtitle');
  const riskPill = document.getElementById('detailRiskPill');
  const obsGrid = document.getElementById('obsMetricsGrid');
  const obsProv = document.getElementById('obsProvenanceBar');

  if (titleEl) titleEl.textContent = `Variables en ${loc.name.split('/')[0].trim()}`;
  if (subEl) {
    subEl.textContent = `CUT ${loc.cut} · ${loc.macrozone} · Cuenca ${loc.basin} · ${loc.elevationM} m s.n.m. · Ref. ${loc.stationId}`;
  }
  if (riskPill) {
    const sev = SEVERITY_META[loc.summaryRisk] || SEVERITY_META.INFORMATIVA;
    riskPill.className = `severity-pill ${sev.css}`;
    riskPill.textContent = `${sev.icon} ${sev.label}`;
  }

  if (obsGrid) {
    const o = loc.observation;
    const isTech = STATE.viewMode === 'technical';
    const hasGloFas = typeof o.riverDischargeM3s === 'number';
    const hasMarine = typeof o.waveHeightM === 'number';

    obsGrid.innerHTML = `
      <div class="obs-metric-box">
        <div class="obs-metric-label">Temperatura</div>
        <div class="obs-metric-val">${o.tempC.toFixed(1)} °C</div>
        <div class="obs-metric-sub">Humedad: ${o.humidityPct}%</div>
      </div>
      <div class="obs-metric-box">
        <div class="obs-metric-label">Precipitación</div>
        <div class="obs-metric-val">${o.precip1hMm.toFixed(1)} mm/h</div>
        <div class="obs-metric-sub">Acumulado 24h: ${o.precip24hMm.toFixed(1)} mm</div>
      </div>
      <div class="obs-metric-box">
        <div class="obs-metric-label">Viento y Racha</div>
        <div class="obs-metric-val">${o.windKmh} / ${o.windGustKmh} km/h</div>
        <div class="obs-metric-sub">Dirección: ${o.windDir}</div>
      </div>
      <div class="obs-metric-box">
        <div class="obs-metric-label">${isTech ? 'Isoterma 0 °C Est.' : 'Cota de Nieve (Iso 0 °C)'}</div>
        <div class="obs-metric-val">${o.freezingLevelM} m</div>
        <div class="obs-metric-sub">${isTech ? 'Nivel de congelación' : 'Sobre esta altura cae nieve'}</div>
      </div>
      ${
        hasGloFas
          ? `
        <div class="obs-metric-box">
          <div class="obs-metric-label">Caudal Cuenca (GloFAS)</div>
          <div class="obs-metric-val">${o.riverDischargeM3s.toFixed(1)} m³/s</div>
          <div class="obs-metric-sub">Máx: ${(o.riverDischargeMaxM3s || o.riverDischargeM3s).toFixed(1)} m³/s (API Flood)</div>
        </div>
      `
          : ''
      }
      ${
        hasMarine
          ? `
        <div class="obs-metric-box">
          <div class="obs-metric-label">Oleaje Costero (Marine)</div>
          <div class="obs-metric-val">${o.waveHeightM.toFixed(1)} m</div>
          <div class="obs-metric-sub">Periodo: ${(o.wavePeriodS || 0).toFixed(0)} s (API Marine)</div>
        </div>
      `
          : ''
      }
      ${
        isTech
          ? `
        <div class="obs-metric-box">
          <div class="obs-metric-label">Nubosidad</div>
          <div class="obs-metric-val">${o.cloudCoverPct}%</div>
          <div class="obs-metric-sub">Fracción cubierta</div>
        </div>
        <div class="obs-metric-box">
          <div class="obs-metric-label">Presión Superficial</div>
          <div class="obs-metric-val">${o.pressureHpa} hPa</div>
          <div class="obs-metric-sub">Ref: ${loc.stationId}</div>
        </div>
      `
          : ''
      }
    `;
  }

  if (obsProv) {
    obsProv.innerHTML = `
      <span><strong>Origen:</strong> ${
        loc.observation.isLiveSynced
          ? 'Actualizado en vivo desde APIs abiertas (api.open-meteo.com + flood-api + marine-api)'
          : `Datos de muestra (Referencia ${loc.stationId})`
      }</span>
      <span>•</span>
      <span><strong>Estampa:</strong> ${formatUtcInChileTz(loc.observation.observedAtUtc, loc.timezone)}</span>
    `;
  }

  const keyPhenEl = document.getElementById('detailKeyPhenomenon');
  const miniFcst = document.getElementById('miniForecastPreview');
  if (keyPhenEl) {
    keyPhenEl.innerHTML = `<strong>Foco local:</strong> ${loc.keyPhenomenon}`;
  }
  if (miniFcst) {
    miniFcst.innerHTML = `
      <div class="forecast-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Día</th>
              <th>Condición</th>
              <th>Temp. (P10–P90)</th>
              <th>Lluvia P50 (P90)</th>
              <th>Iso 0 °C</th>
            </tr>
          </thead>
          <tbody>
            ${loc.daily7d
              .slice(0, 3)
              .map(
                (d) => `
              <tr>
                <td><strong>${d.day}</strong></td>
                <td>${d.cond}</td>
                <td>${d.tMin}°/${d.tMax}°C <span class="uncertainty-range">${d.tP10}°..${d.tP90}°</span></td>
                <td><strong>${d.precipP50.toFixed(1)} mm</strong> <span class="uncertainty-range">≤${d.precipP90.toFixed(1)}</span></td>
                <td>${d.iso0M} m</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  const locAlertsEl = document.getElementById('locationAlertsPreview');
  if (locAlertsEl) {
    const matching = ALERTS_DATA.filter(
      (a) => a.communesIds.includes(loc.id) || a.regions.includes(loc.regionCode)
    );
    const o = loc.observation;
    const p50_48h = (loc.daily7d[0]?.precipP50 || 0) + (loc.daily7d[1]?.precipP50 || 0);
    const p90_48h = (loc.daily7d[0]?.precipP90 || 0) + (loc.daily7d[1]?.precipP90 || 0);
    const liveSignals = [];
    if (p50_48h >= 15 || p90_48h >= 30) {
      liveSignals.push(`Precipitación 48h proyectada: ${p50_48h.toFixed(1)}–${p90_48h.toFixed(1)} mm`);
    }
    if (o.freezingLevelM >= 2700 && p50_48h >= 5) {
      liveSignals.push(`Isoterma 0 °C elevada (${o.freezingLevelM} m s.n.m.) con lluvia prevista`);
    }
    if (o.windGustKmh >= 45) {
      liveSignals.push(`Rachas de viento previstas/actuales de ${o.windGustKmh} km/h (${o.windDir})`);
    }
    if (typeof o.waveHeightM === 'number' && o.waveHeightM >= 2.2) {
      liveSignals.push(`Oleaje costero significativo de ${o.waveHeightM.toFixed(1)} m`);
    }

    const liveCardHtml = `
      <div class="alert-card" style="margin-bottom:0.65rem; padding:0.75rem; border-left:4px solid var(--accent-primary);">
        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:0.35rem; margin-bottom:0.3rem;">
          <span class="epistemic-badge ${o.isLiveSynced ? 'badge-observacion' : 'badge-estimacion'}">
            ${o.isLiveSynced ? '● Evaluación automática Open-Meteo en vivo' : '🧪 Evaluación sobre datos locales'}
          </span>
          <span style="font-size:0.74rem; color:var(--text-muted); font-family:var(--font-mono);">
            Cuenca ${loc.basin}
          </span>
        </div>
        <div style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:0.4rem;">
          ${
            liveSignals.length
              ? `<strong>Señales detectadas en ${loc.name}:</strong> ${liveSignals.join(' · ')}.`
              : `Sin umbrales hidrometeorológicos críticos superados en las próximas 48 h (${p50_48h.toFixed(1)} mm P50, racha ${o.windGustKmh} km/h).`
          }
        </div>
        <div style="display:flex; gap:0.6rem; flex-wrap:wrap; font-size:0.75rem;">
          <a href="https://senapred.cl/informate/alertas/" target="_blank" rel="noopener noreferrer">🚨 Consultar Alertas Vigentes SENAPRED ↗</a>
          <a href="https://www.meteochile.gob.cl/" target="_blank" rel="noopener noreferrer">📡 Consultar Avisos Oficiales DMC ↗</a>
        </div>
      </div>
    `;

    if (!matching.length) {
      locAlertsEl.innerHTML = liveCardHtml;
    } else {
      const sampleCardsHtml = matching
        .map((a) => {
          const sev = SEVERITY_META[a.severity] || SEVERITY_META.INFORMATIVA;
          const isOfficial = a.originCategory === 'OFFICIAL_AUTHORITY';
          return `
            <div class="alert-card sev-border-${a.severity}" style="margin-bottom:0.65rem; padding:0.75rem;">
              <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:0.35rem; margin-bottom:0.3rem;">
                <span class="severity-pill ${sev.css}">${sev.icon} ${sev.label}</span>
                <span class="epistemic-badge ${isOfficial ? 'badge-alerta-oficial' : 'badge-alerta-app'}">
                  ${a.originLabel} (Muestra)
                </span>
              </div>
              <div style="font-weight:700; font-size:0.88rem; margin-bottom:0.2rem;">${a.title}</div>
              <div style="font-size:0.8rem; color:var(--text-secondary);">${a.whatCouldHappen}</div>
              <div style="margin-top:0.4rem; font-size:0.74rem; display:flex; justify-content:space-between; flex-wrap:wrap;">
                <span>Ref: ${formatUtcInChileTz(a.onsetUtc)}</span>
                <a href="${a.officialUrl}" target="_blank" rel="noopener noreferrer">Portal Oficial ↗</a>
              </div>
            </div>
          `;
        })
        .join('');

      const openAttr = STATE.viewMode === 'technical' ? 'open' : '';
      locAlertsEl.innerHTML = `
        ${liveCardHtml}
        <details ${openAttr} style="margin-top:0.35rem;">
          <summary style="cursor:pointer; font-size:0.78rem; font-weight:700; color:var(--text-secondary); padding:0.3rem 0;">
            🧪 Escenarios de simulacro / demostración en esta zona (${matching.length})
          </summary>
          <div style="margin-top:0.4rem;">
            ${sampleCardsHtml}
          </div>
        </details>
      `;
    }
  }
}

function renderSatelliteSection() {
  const canvas = document.getElementById('satelliteCanvas');
  const frame = SATELLITE_FRAMES[STATE.satFrameIndex] || SATELLITE_FRAMES[6];
  const pastFrame = SATELLITE_FRAMES[STATE.satCompareFrameIndex] || SATELLITE_FRAMES[3];

  const frameLabel = document.getElementById('satFrameLabel');
  if (frameLabel) {
    frameLabel.textContent = `${frame.offsetLabel} — Ref: ${formatUtcInChileTz(frame.captureUtc)}`;
  }

  renderSatelliteComparisonCanvas({
    canvas,
    currentFrameIndex: STATE.satFrameIndex,
    compareFrameIndex: STATE.satCompareFrameIndex,
    compareModeEnabled: STATE.satCompareEnabled,
    splitPercentage: STATE.satSplitPct,
    channel: STATE.satChannel,
    onSplitChange: (newPct) => {
      STATE.satSplitPct = newPct;
    },
    onFrameStepChange: (newIdx) => {
      STATE.satFrameIndex = newIdx;
      renderSatelliteSection();
    }
  });

  const synopsisBox = document.getElementById('satSynopsisBox');
  if (synopsisBox) {
    synopsisBox.innerHTML = `
      <div><strong>Sinopsis del Fotograma de Muestra (${frame.offsetLabel}):</strong> ${frame.synopsis}</div>
      <div style="margin-top:0.35rem; font-size:0.82rem; color:var(--text-secondary);">
        Tope nuboso estimado (muestra): <strong>${frame.coreTempC} °C</strong> · Transporte Integrado de Vapor (IVT): <strong>${frame.ivtKgMS} kg/m/s</strong>
        ${
          STATE.satCompareEnabled
            ? ` · <strong>Comparando contra:</strong> ${pastFrame.offsetLabel} (${pastFrame.captureUtc})`
            : ''
        }
      </div>
    `;
  }

  const satProv = document.getElementById('satProvenanceBar');
  if (satProv) {
    const rvInfo = STATE.rainViewerMeta?.ok
      ? `RainViewer consultado (${STATE.rainViewerMeta.infraredFrames.length} cuadros IR disponibles en modo Mapa)`
      : 'Esquema sinóptico local de demostración (SATELLITE_FRAMES)';
    satProv.innerHTML = `
      <span><strong>Referencia:</strong> Esquema GOES-16 ABI Sector Sudamérica (Datos de muestra)</span>
      <span>•</span>
      <span><strong>Estampa del fotograma:</strong> ${formatUtcInChileTz(frame.captureUtc)}</span>
      <span>•</span>
      <span><strong>Estado:</strong> ${rvInfo}</span>
      <span>•</span>
      <a href="https://www.star.nesdis.noaa.gov/goes/sector.php?sat=G16&sector=ssa" target="_blank" rel="noopener noreferrer">Abrir GOES-16 NOAA Oficial ↗</a>
    `;
  }
}

function renderForecast7dAndNationalSection() {
  const loc = getSelectedLocation();
  const titleEl = document.getElementById('forecast7dTitle');
  const tbody = document.getElementById('forecast7dTableBody');
  const natBody = document.getElementById('nationalOverviewTableBody');
  const fcstProv = document.getElementById('forecast7dProvenanceBar');

  if (titleEl) {
    titleEl.textContent = `Pronóstico de los Próximos 7 Días — ${loc.name} (${
      loc.observation.isLiveSynced ? 'Sincronizado Open-Meteo' : 'Datos de muestra'
    })`;
  }

  if (fcstProv) {
    fcstProv.innerHTML = `
      <span><strong>Origen de la serie:</strong> ${
        loc.observation.isLiveSynced
          ? `Actualizado en vivo desde api.open-meteo.com (${formatUtcInChileTz(loc.observation.observedAtUtc, loc.timezone)})`
          : 'Datos de muestra predefinidos en chile-data.js (sin conexión a Open-Meteo o actualizando)'
      }</span>
      <span>•</span>
      <span><strong>Incertidumbre:</strong> Banda P10–P90 en temperatura y mediana P50 a techo P90 en precipitación.</span>
    `;
  }

  if (tbody) {
    tbody.innerHTML = loc.daily7d
      .map(
        (d) => `
        <tr>
          <td><strong>${d.day}</strong></td>
          <td>${d.cond}</td>
          <td>
            <strong>${d.tMin}°C / ${d.tMax}°C</strong>
            <span class="uncertainty-range">P10–P90: ${d.tP10}° a ${d.tP90}°C</span>
          </td>
          <td>
            <strong>${d.precipP50.toFixed(1)} mm</strong>
            <span class="uncertainty-range">0 a ${d.precipP90.toFixed(1)} mm</span>
          </td>
          <td>${d.probPct}%</td>
          <td><strong>${d.iso0M} m s.n.m.</strong></td>
          <td>${d.snowCm > 0 ? `${d.snowCm} cm` : '0 cm'}</td>
          <td>${d.windMax} km/h</td>
          <td>${d.cloudPct}%</td>
        </tr>
      `
      )
      .join('');
  }

  if (natBody) {
    natBody.innerHTML = CHILE_LOCATIONS.map((item) => {
      const sev = SEVERITY_META[item.summaryRisk] || SEVERITY_META.INFORMATIVA;
      const p50_48h = (item.daily7d[0].precipP50 + item.daily7d[1].precipP50).toFixed(1);
      const p90_48h = (item.daily7d[0].precipP90 + item.daily7d[1].precipP90).toFixed(1);
      return `
        <tr>
          <td>${item.macrozone}</td>
          <td><strong>[${item.regionCode}] ${item.name}</strong> ${
            item.observation.isLiveSynced
              ? '<span class="epistemic-badge badge-observacion">En vivo</span>'
              : '<span class="epistemic-badge badge-estimacion">Muestra</span>'
          }</td>
          <td>${item.observation.tempC.toFixed(1)} °C</td>
          <td>${item.observation.precip24hMm.toFixed(1)} mm</td>
          <td><strong>${p50_48h} mm</strong> <span class="uncertainty-range">P90: ${p90_48h} mm</span></td>
          <td>${item.observation.freezingLevelM} m</td>
          <td>${item.observation.windGustKmh} km/h (${item.observation.windDir})</td>
          <td><span class="severity-pill ${sev.css}">${sev.icon} ${sev.label}</span></td>
          <td>
            <button class="btn btn-sm btn-select-loc" data-loc-id="${item.id}" type="button">
              Seleccionar
            </button>
          </td>
        </tr>
      `;
    }).join('');

    natBody.querySelectorAll('.btn-select-loc').forEach((btn) => {
      btn.addEventListener('click', () => {
        STATE.selectedLocationId = btn.getAttribute('data-loc-id');
        const sel = document.getElementById('locationSelect');
        if (sel) sel.value = STATE.selectedLocationId;
        refreshAllViews();
        activateTab('tab-mapa');
      });
    });
  }
}

function renderRainfallSection() {
  const loc = getSelectedLocation();
  const titleEl = document.getElementById('rainSectionTitle');
  const chartContainer = document.getElementById('hourlyRainChartContainer');
  const episodesContainer = document.getElementById('rainEpisodesSummary');

  if (titleEl) {
    titleEl.textContent = `Pronóstico de Lluvia Horaria e Isoterma 0 °C — ${loc.name} (${
      loc.observation.isLiveSynced ? 'Open-Meteo en vivo' : 'Datos de muestra'
    })`;
  }

  renderHourlyRainChartSVG(chartContainer, loc);

  if (episodesContainer) {
    const sumP50 = loc.daily7d.slice(0, 2).reduce((acc, d) => acc + d.precipP50, 0);
    const sumP90 = loc.daily7d.slice(0, 2).reduce((acc, d) => acc + d.precipP90, 0);
    const maxIso = Math.max(...loc.hourlyRain48h.map((h) => h.iso0));
    const minIso = Math.min(...loc.hourlyRain48h.map((h) => h.iso0));
    const maxSnow = loc.daily7d.slice(0, 2).reduce((acc, d) => acc + d.snowCm, 0);

    episodesContainer.innerHTML = `
      <div class="alert-card sev-border-${loc.summaryRisk}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
          <strong>Acumulado Estimado en 48 Horas (Banda P50–P90)</strong>
          <span class="epistemic-badge badge-pronostico">${
            loc.observation.isLiveSynced ? 'Open-Meteo' : 'Datos de muestra'
          }</span>
        </div>
        <div style="font-size:1.2rem; font-weight:800; color:var(--accent-text); margin:0.25rem 0; font-family:var(--font-mono);">
          Mediana (P50): ${sumP50.toFixed(1)} mm · Techo Húmedo (P90): ${sumP90.toFixed(1)} mm
        </div>
        <p style="margin:0.35rem 0 0; font-size:0.84rem; color:var(--text-secondary);">
          <strong>Cuenca de referencia:</strong> <em>${loc.basin}</em>.
          Los montos expresan un intervalo de probabilidad y no una cifra única determinista.
        </p>
      </div>

      <div class="alert-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
          <strong>Rango de Isoterma 0 °C y Nieve Andina</strong>
          <span class="epistemic-badge badge-estimacion">Cota Lluvia / Nieve</span>
        </div>
        <div style="font-size:1.12rem; font-weight:800; color:var(--sev-prev-text); margin:0.25rem 0; font-family:var(--font-mono);">
          Isoterma 0 °C entre ${minIso} m y ${maxIso} m s.n.m. · Nieve est.: ~${maxSnow} cm
        </div>
        <p style="margin:0.35rem 0 0; font-size:0.84rem; color:var(--text-secondary);">
          ${
            maxIso >= 2750 && sumP50 >= 15
              ? '⚠ Atención en escenario: Cota de isoterma 0 °C sobre 2.750 m s.n.m. con precipitación activa incrementa el área pluvial en precordillera.'
              : 'Cota de congelación dentro de rangos habituales para la cuenca; nieve restringida a sectores cordilleranos altos.'
          }
        </p>
      </div>
    `;
  }
}

function renderAlertsSection() {
  const container = document.getElementById('alertsListContainer');
  if (!container) return;

  const filtered = ALERTS_DATA.filter((a) => {
    const matchOrigin =
      STATE.alertOriginFilter === 'ALL' || a.originCategory === STATE.alertOriginFilter;
    const matchSev =
      STATE.alertSeverityFilter === 'ALL' || a.severity === STATE.alertSeverityFilter;
    return matchOrigin && matchSev;
  });

  if (!filtered.length) {
    container.innerHTML = `<div class="alert-card">No hay alertas de muestra que coincidan con el filtro seleccionado.</div>`;
    return;
  }

  container.innerHTML = filtered
    .map((a) => {
      const sev = SEVERITY_META[a.severity] || SEVERITY_META.INFORMATIVA;
      const isOfficial = a.originCategory === 'OFFICIAL_AUTHORITY';
      return `
        <article class="alert-card sev-border-${a.severity}" aria-label="${a.title}">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.5rem;">
            <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
              <span class="severity-pill ${sev.css}">${sev.icon} Severidad: ${sev.label}</span>
              <span class="epistemic-badge ${isOfficial ? 'badge-alerta-oficial' : 'badge-alerta-app'}">
                ${a.originLabel}
              </span>
              <span class="epistemic-badge badge-estimacion">🧪 Ejemplo de Demostración</span>
              <span class="epistemic-badge badge-pronostico">Confianza: ${a.confidenceLevel}</span>
            </div>
            <span style="font-size:0.76rem; color:var(--text-muted); font-family:var(--font-mono);">
              ID: ${a.id} · Estampa ref.: ${formatUtcInChileTz(a.issuedAtUtc)}
            </span>
          </div>

          <h3 style="margin:0.2rem 0 0.5rem; font-size:1.05rem;">${a.title}</h3>

          <div class="alert-meta-grid">
            <div class="alert-meta-item">
              <strong>¿Qué podría ocurrir?</strong>
              <span>${a.whatCouldHappen}</span>
            </div>
            <div class="alert-meta-item">
              <strong>¿Dónde? (Zonas y Cotas)</strong>
              <span>${a.affectedZonesText}</span>
            </div>
            <div class="alert-meta-item">
              <strong>¿Cuándo? (Ventana de Referencia)</strong>
              <span>Inicio: ${formatUtcInChileTz(a.onsetUtc)}<br/>Término est.: ${formatUtcInChileTz(a.expiresUtc)}</span>
            </div>
            <div class="alert-meta-item">
              <strong>Sustento de Confianza (${a.confidenceLevel})</strong>
              <span>${a.confidenceRationale}</span>
            </div>
          </div>

          <div class="condition-summary-banner" style="margin-bottom:0.5rem;">
            <strong>Medidas Preventivas Recomendadas:</strong>
            <ul style="margin:0.35rem 0 0; padding-left:1.2rem; color:var(--text-secondary);">
              ${a.preventiveActions.map((act) => `<li>${act}</li>`).join('')}
            </ul>
          </div>

          <div class="provenance-bar">
            <span><strong>Emisor de Referencia:</strong> ${a.issuer} (Registro de muestra)</span>
            <span>•</span>
            <a href="${a.officialUrl}" target="_blank" rel="noopener noreferrer">Consultar Portal Oficial (${a.officialUrl}) ↗</a>
            ${
              a.secondaryUrl
                ? `<span>•</span><a href="${a.secondaryUrl}" target="_blank" rel="noopener noreferrer">Visor Secundario ↗</a>`
                : ''
            }
          </div>
        </article>
      `;
    })
    .join('');
}

export function updateWebPushPermissionBadge() {
  const badge = document.getElementById('webPushPermissionBadge');
  const btn = document.getElementById('btnRequestPushPermission');
  if (!badge) return;

  if (typeof window === 'undefined' || !('Notification' in window)) {
    badge.className = 'epistemic-badge badge-estimacion';
    badge.textContent = '⚠️ Web Push: No soportado en este navegador';
    if (btn) btn.disabled = true;
    return;
  }

  const perm = Notification.permission;
  if (perm === 'granted') {
    badge.className = 'epistemic-badge badge-observacion';
    badge.textContent = '✓ Web Push: Activado en este Dispositivo';
    if (btn) {
      btn.textContent = '✓ Permiso Concedido';
      btn.disabled = true;
    }
  } else if (perm === 'denied') {
    badge.className = 'epistemic-badge badge-peligro';
    badge.textContent = '✕ Web Push: Bloqueado por el Usuario';
    if (btn) {
      btn.textContent = '⚠️ Permiso Bloqueado en Ajustes';
      btn.disabled = true;
    }
  } else {
    badge.className = 'epistemic-badge badge-estimacion';
    badge.textContent = '🔔 Web Push: Pendiente de Activación';
    if (btn) {
      btn.textContent = '🔔 Activar Notificaciones Nativas en este Navegador';
      btn.disabled = false;
    }
  }
}

export async function triggerNativeWebPushNotification({ title, body, tag = 'floodchile-alert', url = '/' }) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { ok: false, reason: 'unsupported' };
  }

  let perm = Notification.permission;
  if (perm === 'default') {
    try {
      perm = await Notification.requestPermission();
    } catch {
      // ignore
    }
  }

  updateWebPushPermissionBadge();

  if (perm !== 'granted') {
    return { ok: false, reason: 'permission_denied' };
  }

  // 1. Service Worker registration showNotification
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body,
          tag,
          icon: '/manifest.json',
          vibrate: [200, 100, 200],
          data: { url }
        });
        return { ok: true, channel: 'serviceWorker' };
      }
    }
  } catch (err) {
    console.warn('Fallback a Notification de ventana:', err);
  }

  // 2. Direct Notification fallback
  try {
    const notif = new Notification(title, {
      body,
      tag,
      icon: '/manifest.json'
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    return { ok: true, channel: 'windowNotification' };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

function loadAndRenderNotifications() {
  updateWebPushPermissionBadge();
  try {
    const raw = localStorage.getItem('climasflood_notifications');
    if (raw) {
      STATE.notifications = JSON.parse(raw);
    } else {
      STATE.notifications = [
        {
          id: 'SUB-1',
          communeId: 'santiago',
          communeName: 'Santiago / San José de Maipo',
          eventType: 'LLUVIA_ISOTERMA',
          minSeverity: 'TEMPRANA'
        },
        {
          id: 'SUB-2',
          communeId: 'talca',
          communeName: 'Talca / Curicó',
          eventType: 'CRECIDA_ALUVION',
          minSeverity: 'PREVENTIVA'
        }
      ];
    }
  } catch {
    STATE.notifications = [];
  }

  const box = document.getElementById('savedNotificationsContainer');
  if (!box) return;

  if (!STATE.notifications.length) {
    box.innerHTML = `<div style="font-size:0.84rem; color:var(--text-muted);">No hay suscripciones locales guardadas.</div>`;
    return;
  }

  box.innerHTML = `
    <div style="font-size:0.82rem; font-weight:700; margin-bottom:0.45rem;">Suscripciones Locales Guardadas (${STATE.notifications.length}):</div>
    <div style="display:flex; flex-wrap:wrap; gap:0.6rem;">
      ${STATE.notifications
        .map((n) => {
          const sev = SEVERITY_META[n.minSeverity] || SEVERITY_META.TEMPRANA;
          return `
            <div style="background:var(--bg-card-elevated); border:1px solid var(--border-subtle); border-radius:8px; padding:0.45rem 0.75rem; display:flex; align-items:center; gap:0.6rem; font-size:0.82rem;">
              <span class="severity-pill ${sev.css}">${sev.icon} ≥ ${sev.label}</span>
              <span><strong>${n.communeName}</strong> (${n.eventType})</span>
              <button type="button" class="btn btn-sm btn-remove-notif" data-id="${n.id}" aria-label="Eliminar suscripción de ${n.communeName}" style="padding:0.12rem 0.42rem;">✕</button>
            </div>
          `;
        })
        .join('')}
    </div>
  `;

  box.querySelectorAll('.btn-remove-notif').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      STATE.notifications = STATE.notifications.filter((item) => item.id !== id);
      try {
        localStorage.setItem('climasflood_notifications', JSON.stringify(STATE.notifications));
      } catch {
        // ignore storage errors
      }
      loadAndRenderNotifications();
    });
  });
}

function renderScenariosSection() {
  const container = document.getElementById('scenariosListContainer');
  if (!container) return;

  container.innerHTML = SCENARIOS_DATA.map(
    (sc) => `
      <article class="scenario-card">
        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.45rem;">
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
            <span class="epistemic-badge badge-estimacion">Escenario Plausible (Muestra)</span>
            <span class="epistemic-badge badge-pronostico">Probabilidad: ${sc.probabilityBand}</span>
            <span class="epistemic-badge badge-observacion">Confianza: ${sc.confidenceLevel}</span>
          </div>
          <span style="font-size:0.8rem; color:var(--accent-text); font-weight:700; font-family:var(--font-mono);">Ventana: ${sc.timeWindow}</span>
        </div>

        <h3 style="margin:0.2rem 0 0.45rem; font-size:1.05rem;">${sc.title}</h3>
        <p style="margin:0 0 0.75rem; font-size:0.88rem; color:var(--text-secondary);">${sc.narrative}</p>

        <div class="alert-meta-grid">
          <div class="alert-meta-item">
            <strong>Zonas Potencialmente Afectadas</strong>
            <span>${sc.affectedZonesDetail}</span>
          </div>
          <div class="alert-meta-item">
            <strong>Factores Físicos que Respaldan el Escenario</strong>
            <ul style="margin:0.25rem 0 0; padding-left:1.1rem;">
              ${sc.supportingFactors.map((f) => `<li>${f}</li>`).join('')}
            </ul>
          </div>
          <div class="alert-meta-item">
            <strong>Señales que Cambiarían la Evaluación (Invalidación / Desescalamiento)</strong>
            <ul style="margin:0.25rem 0 0; padding-left:1.1rem;">
              ${sc.invalidationSignals.map((s) => `<li>${s}</li>`).join('')}
            </ul>
          </div>
        </div>
      </article>
    `
  ).join('');
}

function renderPredictiveAndVerificationSection() {
  const loc = getSelectedLocation();
  const titleEl = document.getElementById('predictiveModelTitle');
  const modelContainer = document.getElementById('modelComparisonContainer');
  const verMetrics = document.getElementById('verificationSummaryMetrics');
  const verTableBody = document.getElementById('verificationTableBody');

  if (titleEl) {
    titleEl.textContent = `Comparación Multimodelo (ECMWF vs GFS vs ICON) — ${loc.name}`;
  }

  renderModelComparisonChartSVG(modelContainer, loc);

  const avgRainErr =
    VERIFICATION_HISTORY.reduce((acc, v) => acc + v.precipAbsErrorMm, 0) /
    VERIFICATION_HISTORY.length;
  const avgTempErr =
    VERIFICATION_HISTORY.reduce((acc, v) => acc + v.tempAbsErrorC, 0) /
    VERIFICATION_HISTORY.length;
  const bandCoverage =
    (VERIFICATION_HISTORY.filter((v) => v.withinUncertaintyBand).length /
      VERIFICATION_HISTORY.length) *
    100;

  if (verMetrics) {
    verMetrics.innerHTML = `
      <div class="obs-metric-box">
        <div class="obs-metric-label">MAE Precipitación (Muestra)</div>
        <div class="obs-metric-val">±${avgRainErr.toFixed(1)} mm</div>
        <div class="obs-metric-sub">Error medio absoluto</div>
      </div>
      <div class="obs-metric-box">
        <div class="obs-metric-label">MAE Temp. Máx (Muestra)</div>
        <div class="obs-metric-val">±${avgTempErr.toFixed(1)} °C</div>
        <div class="obs-metric-sub">Error medio 24–72h</div>
      </div>
      <div class="obs-metric-box">
        <div class="obs-metric-label">Cobertura Banda P10–P90</div>
        <div class="obs-metric-val" style="color:var(--tag-obs-text);">${bandCoverage.toFixed(0)}%</div>
        <div class="obs-metric-sub">Casos de muestra en rango</div>
      </div>
    `;
  }

  if (verTableBody) {
    verTableBody.innerHTML = VERIFICATION_HISTORY.map(
      (v) => `
        <tr>
          <td><strong>${v.locationName}</strong></td>
          <td>${v.targetDate} (-${v.leadTimeHours}h)</td>
          <td>${v.predictedPrecipP50Mm.toFixed(1)} mm <span class="uncertainty-range">[${v.predictedPrecipRangeMm}]</span></td>
          <td><strong>${v.observedPrecipMm.toFixed(1)} mm</strong></td>
          <td>${v.precipAbsErrorMm.toFixed(1)} mm</td>
          <td>${v.predictedTempMaxC}°C / <strong>${v.observedTempMaxC}°C</strong></td>
          <td>
            <span class="epistemic-badge badge-observacion">
              ✓ Sí (${v.evaluationNote})
            </span>
          </td>
        </tr>
      `
    ).join('');
  }
}

function renderAgentsSection() {
  const agentsContainer = document.getElementById('agentsCardsContainer');
  const hitlContainer = document.getElementById('hitlQueueContainer');
  const evidenceBody = document.getElementById('evidenceTableBody');

  if (agentsContainer) {
    agentsContainer.innerHTML = AI_AGENTS_DATA.agents
      .map(
        (ag) => `
        <div class="agent-card">
          <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:0.4rem; margin-bottom:0.35rem;">
            <strong>${ag.name}</strong>
            <span class="epistemic-badge ${ag.status === 'ESPERANDO_REVISION_HUMANA' ? 'badge-estimacion' : 'badge-pronostico'}">
              ${ag.status}
            </span>
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.5rem;">
            Rol: ${ag.role} · Permiso: <code>${ag.autonomyLevel}</code>
          </div>
          <ul style="margin:0; padding-left:1.1rem; font-size:0.84rem;">
            ${ag.findings
              .map(
                (f) => `
                <li style="margin-bottom:0.4rem;">
                  ${f.text}
                  ${f.citations
                    .map(
                      (cid) =>
                        `<button type="button" class="citation-chip" data-ev-id="${cid}" title="Inspeccionar dato fuente ${cid}">[Ref: ${cid}]</button>`
                    )
                    .join('')}
                </li>
              `
              )
              .join('')}
          </ul>
        </div>
      `
      )
      .join('');
  }

  if (hitlContainer) {
    hitlContainer.innerHTML = AI_AGENTS_DATA.hitlQueue
      .map(
        (item) => `
        <div class="agent-card" style="border: 2px dashed var(--sev-prev-border);">
          <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:0.4rem; margin-bottom:0.4rem;">
            <span class="severity-pill sev-TEMPRANA">👤 Escalamiento HITL #${item.id}</span>
            <span id="hitlStatusBadge-${item.id}" class="epistemic-badge badge-estimacion">${item.status}</span>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.45rem;">
            Destinatario propuesto: <strong>${item.targetAudience}</strong>
          </div>
          <p class="condition-summary-banner" style="margin:0.4rem 0;">
            ${item.proposedSummary}
            ${item.citations
              .map(
                (cid) =>
                  `<button type="button" class="citation-chip" data-ev-id="${cid}">[Ref: ${cid}]</button>`
              )
              .join('')}
          </p>
          <div style="font-size:0.78rem; margin:0.5rem 0;">
            <strong>Verificaciones automáticas de Guardrails antes de revisión humana:</strong>
            <ul style="margin:0.25rem 0; padding-left:1.1rem; color:var(--tag-obs-text);">
              ${item.guardrailChecks.map((g) => `<li>✓ ${g.rule}</li>`).join('')}
            </ul>
          </div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.65rem;">
            <button type="button" class="btn btn-primary btn-hitl-action" data-hitl-id="${item.id}" data-decision="APROBADO_POR_SUPERVISOR_HUMANO">
              ✓ Aprobar Boletín Preventivo (Firma Humana)
            </button>
            <button type="button" class="btn btn-warning btn-hitl-action" data-hitl-id="${item.id}" data-decision="RECHAZADO_POR_SUPERVISOR_HUMANO">
              ✕ Rechazar / Solicitar Recálculo
            </button>
          </div>
        </div>
      `
      )
      .join('');
  }

  if (evidenceBody) {
    const evList = Object.values(AI_AGENTS_DATA.evidenceRegistry);
    evidenceBody.innerHTML = evList
      .map(
        (ev) => `
        <tr id="evidence-row-${ev.id}" class="evidence-row ${STATE.highlightedEvidenceId === ev.id ? 'highlighted' : ''}">
          <td><code><strong>${ev.id}</strong></code></td>
          <td><span class="epistemic-badge badge-observacion">${ev.dataType}</span></td>
          <td>${ev.source}<br/><span style="font-size:0.74rem; color:var(--text-muted); font-family:var(--font-mono);">${formatUtcInChileTz(ev.timestampUtc)}</span></td>
          <td><strong>${ev.parameter}:</strong> ${ev.rawValue}</td>
        </tr>
      `
      )
      .join('');
  }

  document.querySelectorAll('.citation-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const evId = chip.getAttribute('data-ev-id');
      STATE.highlightedEvidenceId = evId;
      renderAgentsSection();
      const row = document.getElementById(`evidence-row-${evId}`);
      if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  document.querySelectorAll('.btn-hitl-action').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const hitlId = btn.getAttribute('data-hitl-id');
      const decision = btn.getAttribute('data-decision');
      const item = AI_AGENTS_DATA.hitlQueue.find((q) => q.id === hitlId);
      if (item) {
        item.status = decision;
        renderAgentsSection();

        if (decision === 'APROBADO_POR_SUPERVISOR_HUMANO') {
          triggerNativeWebPushNotification({
            title: '🛡️ FloodChile · Boletín Supervisado Aprobado (HITL)',
            body: item.proposedSummary.replace(/\[Ref:\s*[^\]]+\]/g, '').slice(0, 150) + '...',
            tag: `hitl-approved-${item.id}`
          });
        }

        try {
          await fetch('/api/audit-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              actor: 'Supervisor Meteorológico Turno Nacional',
              action: decision,
              detail: `Revisión humana ejecutada sobre ${hitlId} con citas verificadas ${item.citations.join(', ')}`,
              status: decision
            })
          });
        } catch {
          // ignore offline post
        }
      }
    });
  });
}

function renderSourcesAndCriteriaSection() {
  const tbody = document.getElementById('sourcesTableBody');
  const criteriaBox = document.getElementById('acceptanceCriteriaContainer');
  const anyOpenMeteoSynced = CHILE_LOCATIONS.some((l) => l.observation.isLiveSynced);

  if (tbody) {
    tbody.innerHTML = DATA_SOURCES.map((s) => {
      const isStaleSimulated =
        STATE.staleSimulationActive && (s.id === 'dmc-meteochile' || s.id === 'senapred-chile');

      let modeBadgeHtml = '';
      if (isStaleSimulated) {
        modeBadgeHtml = `<span class="epistemic-badge badge-alerta-oficial">⚠ Simulación Fuente Vencida</span>`;
      } else if (
        s.id === 'openmeteo-multi' ||
        s.id === 'dga-glofas' ||
        s.id === 'shoa-marine'
      ) {
        modeBadgeHtml = anyOpenMeteoSynced
          ? `<span class="epistemic-badge badge-observacion">● Sincronizado en Vivo (API Abierta)</span>`
          : `<span class="epistemic-badge badge-pronostico">↻ Consultable en Vivo (API Abierta)</span>`;
      } else if (s.id === 'noaa-goes16-gibs') {
        modeBadgeHtml = STATE.rainViewerMeta?.ok
          ? `<span class="epistemic-badge badge-observacion">● RainViewer en Vivo + Muestra GOES</span>`
          : `<span class="epistemic-badge badge-estimacion">🧪 Muestra Local + API RainViewer</span>`;
      } else {
        modeBadgeHtml = `<span class="epistemic-badge badge-estimacion">🧪 Datos de Muestra (Enlace Oficial)</span>`;
      }

      return `
        <tr>
          <td><strong>${s.name}</strong></td>
          <td>${s.role}</td>
          <td>Cada ${s.updateFrequencyMinutes} min (TTL: ${s.ttlMinutes} min)</td>
          <td>${formatUtcInChileTz(s.lastUpdatedUtc)} (Muestra)</td>
          <td>${modeBadgeHtml}</td>
          <td>${s.accessNotes}</td>
          <td><a href="${s.url}" target="_blank" rel="noopener noreferrer">Sitio Oficial ↗</a></td>
        </tr>
      `;
    }).join('');
  }

  if (criteriaBox) {
    const criteria = [
      { code: 'CA-01', title: 'Separación estricta de datos', desc: 'Etiquetas explícitas para Observación, Pronóstico Numérico, Escenario Estimado, Alerta Oficial vs App y Datos de Muestra.' },
      { code: 'CA-02', title: 'Incertidumbre y rangos obligatorios', desc: 'Bandas P10–P50–P90 en lluvia y temperatura; ninguna estimación futura se presenta como certeza.' },
      { code: 'CA-03', title: 'Registro de verificación histórica', desc: 'Comparación auditable de predicciones pasadas (-24h/-48h/-72h) contra observaciones con cálculo de MAE (conjunto de muestra).' },
      { code: 'CA-04', title: 'Metadatos de procedencia y hora local', desc: 'Cada capa, imagen satelital y alerta indica fuente, enlace, hora de referencia y huso horario local de Chile.' },
      { code: 'CA-05', title: 'Detección de fuentes desactualizadas', desc: 'Degradación controlada y banner explícito cuando una fuente supera su TTL (verificable en menú ⚙ Verificación).' },
      { code: 'CA-06', title: 'Accesibilidad sin depender solo del color', desc: 'Iconos geométricos (ℹ, ◆, ▲, 🛑), patrones de borde y modo de Escala de Grises integrado.' },
      { code: 'CA-07', title: 'Interfaz adaptable (Móvil / Escritorio)', desc: 'Diseño responsivo con vista Ciudadanía / Monitoreo, Modo Claro / Oscuro / Auto y navegación por teclado.' },
      { code: 'CA-08', title: 'Trazabilidad total de Agentes IA', desc: 'Cada afirmación de agente incluye chips clicables [Ref: EV-*] vinculados al registro de evidencia.' },
      { code: 'CA-09', title: 'Guardrails y Revisión Humana (HITL)', desc: 'Agentes sin permiso para alterar alertas oficiales y cola de aprobación humana para recomendaciones críticas.' }
    ];

    criteriaBox.innerHTML = criteria
      .map(
        (c) => `
        <div style="padding:0.5rem 0; border-bottom:1px solid var(--border-subtle); display:flex; gap:0.6rem; align-items:flex-start;">
          <span class="epistemic-badge badge-observacion">✓ ${c.code}</span>
          <div>
            <strong>${c.title}:</strong> <span style="color:var(--text-secondary);">${c.desc}</span>
          </div>
        </div>
      `
      )
      .join('');
  }
}

function refreshAllViews() {
  populateLocationSelectors();
  updateClockAndHeaderStatus();
  renderMapAndDetailView();
  renderSatelliteSection();
  renderForecast7dAndNationalSection();
  renderRainfallSection();
  renderAlertsSection();
  loadAndRenderNotifications();
  renderScenariosSection();
  renderPredictiveAndVerificationSection();
  renderAgentsSection();
  renderSourcesAndCriteriaSection();
  syncUrlState();
}

function setupEventListeners() {
  // Conmutador de Tema (Claro / Oscuro / Automático)
  document.querySelectorAll('.theme-toggle button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const opt = btn.getAttribute('data-theme-opt') || 'light';
      applyThemePreference(opt);
    });
  });

  // Conmutador Vista Ciudadanía vs Monitoreo Técnico
  document.querySelectorAll('.view-mode-toggle button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-view-mode-opt') || 'citizen';
      applyViewMode(mode);
      refreshAllViews();
    });
  });

  // Chips de acceso rápido a comunas
  document.querySelectorAll('.quick-commune-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const locId = chip.getAttribute('data-quick-loc');
      if (locId) {
        STATE.selectedLocationId = locId;
        STATE.selectedMacrozone = 'ALL';
        const macroSel = document.getElementById('macrozoneSelect');
        if (macroSel) macroSel.value = 'ALL';
        refreshAllViews();
      }
    });
  });

  // Botones de las 4 Áreas Primarias de Navegación (Mapa, Pronóstico, Alertas, Más)
  document.querySelectorAll('.nav-group-btn').forEach((groupBtn) => {
    groupBtn.addEventListener('click', () => {
      const group = groupBtn.getAttribute('data-nav-group') || 'mapa';
      // Si ya estamos en una pestaña de ese grupo, conservarla; si no, abrir la predeterminada del grupo
      const currentGroup = TAB_TO_GROUP[STATE.activeTabId];
      const nextTab =
        currentGroup === group ? STATE.activeTabId : GROUP_DEFAULT_TAB[group] || 'tab-mapa';
      activateTab(nextTab);
    });
  });

  // Pestañas individuales (.nav-tab)
  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-tab');
      if (targetId) {
        activateTab(targetId);
      }
    });
  });

  // Control de apertura/cierre del Menú Lateral (Drawer) y Backdrop
  const sidebar = document.getElementById('appSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const btnSidebarToggle = document.getElementById('btnSidebarToggle');

  if (btnSidebarToggle && sidebar) {
    btnSidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('sidebar-open');
      if (sidebarBackdrop) {
        sidebarBackdrop.classList.toggle('active', sidebar.classList.contains('sidebar-open'));
      }
    });
  }

  if (sidebarBackdrop && sidebar) {
    sidebarBackdrop.addEventListener('click', () => {
      sidebar.classList.remove('sidebar-open');
      sidebarBackdrop.classList.remove('active');
    });
  }

  const sidebarLocSelect = document.getElementById('sidebarLocationSelect');
  if (sidebarLocSelect) {
    sidebarLocSelect.addEventListener('change', (e) => {
      STATE.selectedLocationId = e.target.value;
      const locSelect = document.getElementById('locationSelect');
      if (locSelect) locSelect.value = e.target.value;
      refreshAllViews();
    });
  }

  // Botones de acción rápida en la primera pantalla
  document.getElementById('btnJumpToRain')?.addEventListener('click', () => {
    activateTab('tab-lluvia');
  });
  document.getElementById('btnJumpToAlerts')?.addEventListener('click', () => {
    activateTab('tab-alertas');
  });
  document.getElementById('btnJumpTo7dForecast')?.addEventListener('click', () => {
    activateTab('tab-pronostico');
  });

  const macroSelect = document.getElementById('macrozoneSelect');
  if (macroSelect) {
    macroSelect.addEventListener('change', (e) => {
      STATE.selectedMacrozone = e.target.value;
      populateLocationSelectors();
      refreshAllViews();
    });
  }

  const locSelect = document.getElementById('locationSelect');
  if (locSelect) {
    locSelect.addEventListener('change', (e) => {
      STATE.selectedLocationId = e.target.value;
      refreshAllViews();
    });
  }

  const communeSearchInput = document.getElementById('communeSearchInput');
  if (communeSearchInput) {
    const normalizeStr = (s) =>
      String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    communeSearchInput.addEventListener('input', (e) => {
      const q = normalizeStr(e.target.value.trim());
      if (q.length < 2) return;
      const found = CHILE_LOCATIONS.find((l) => {
        const haystack = normalizeStr(
          `${l.name} ${l.regionName} ${l.regionCode} ${l.basin} ${l.macrozone}`
        );
        return haystack.includes(q);
      });
      if (found && found.id !== STATE.selectedLocationId) {
        STATE.selectedLocationId = found.id;
        STATE.selectedMacrozone = 'ALL';
        const macroSel = document.getElementById('macrozoneSelect');
        if (macroSel) macroSel.value = 'ALL';
        refreshAllViews();
        mapControllerSingleton.focusOnSelectedLocation();
      }
    });
  }

  const tzSelect = document.getElementById('timezoneSelect');
  if (tzSelect) {
    tzSelect.addEventListener('change', (e) => {
      STATE.timezoneMode = e.target.value;
      refreshAllViews();
    });
  }

  // Botones de capas del mapa nacional
  document.querySelectorAll('.layer-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      STATE.activeMapLayer = btn.getAttribute('data-layer');
      document.querySelectorAll('.layer-btn').forEach((b) => {
        b.classList.toggle('active', b === btn);
      });
      renderMapAndDetailView();
    });
  });

  // Slider temporal del mapa nacional + Botón Play/Pause (+48h)
  const mapTimeSlider = document.getElementById('mapTimeSlider');
  const btnMapPlay = document.getElementById('btnMapPlayTimeline');

  if (mapTimeSlider) {
    mapTimeSlider.addEventListener('input', (e) => {
      const idx = Number(e.target.value) || 0;
      STATE.mapHourOffset = TIME_SLIDER_STEPS[idx] ?? 0;
      renderMapAndDetailView();
    });
  }

  if (btnMapPlay) {
    btnMapPlay.addEventListener('click', () => {
      STATE.mapTimelinePlaying = !STATE.mapTimelinePlaying;
      btnMapPlay.setAttribute('aria-pressed', String(STATE.mapTimelinePlaying));
      btnMapPlay.textContent = STATE.mapTimelinePlaying ? '⏸ Pausar +48h' : '▶ Reproducir +48h';

      if (STATE.mapTimelinePlaying) {
        STATE.mapTimelineTimerId = setInterval(() => {
          const currentIdx = Math.max(0, TIME_SLIDER_STEPS.indexOf(STATE.mapHourOffset));
          const nextIdx = (currentIdx + 1) % TIME_SLIDER_STEPS.length;
          STATE.mapHourOffset = TIME_SLIDER_STEPS[nextIdx];
          if (mapTimeSlider) mapTimeSlider.value = String(nextIdx);
          renderMapAndDetailView();
        }, 1250);
      } else if (STATE.mapTimelineTimerId) {
        clearInterval(STATE.mapTimelineTimerId);
        STATE.mapTimelineTimerId = null;
      }
    });
  }

  // Controles del Visor Satelital
  const btnSatPlay = document.getElementById('btnSatPlayPause');
  const satFrameRange = document.getElementById('satFrameRange');
  const satChannelSelect = document.getElementById('satChannelSelect');
  const satCompareToggle = document.getElementById('satCompareToggle');
  const satPastSelect = document.getElementById('satPastFrameSelect');
  const satSplitRange = document.getElementById('satSplitRange');

  if (btnSatPlay) {
    btnSatPlay.addEventListener('click', () => {
      STATE.satPlaying = !STATE.satPlaying;
      btnSatPlay.textContent = STATE.satPlaying ? '⏸ Pausar Secuencia' : '▶ Reproducir Secuencia';
      satelliteEngineSingleton.setPlayingState(STATE.satPlaying);
    });
  }

  if (satFrameRange) {
    satFrameRange.addEventListener('input', (e) => {
      STATE.satFrameIndex = Number(e.target.value);
      renderSatelliteSection();
    });
  }

  if (satChannelSelect) {
    satChannelSelect.addEventListener('change', (e) => {
      STATE.satChannel = e.target.value;
      renderSatelliteSection();
    });
  }

  if (satCompareToggle) {
    satCompareToggle.addEventListener('click', () => {
      STATE.satCompareEnabled = !STATE.satCompareEnabled;
      satCompareToggle.setAttribute('aria-pressed', String(STATE.satCompareEnabled));
      satCompareToggle.textContent = STATE.satCompareEnabled
        ? '⇄ Cortina Comparadora: ACTIVA'
        : '⇄ Cortina Comparadora: INACTIVA';
      renderSatelliteSection();
    });
  }

  if (satPastSelect) {
    satPastSelect.addEventListener('change', (e) => {
      STATE.satCompareFrameIndex = Number(e.target.value);
      renderSatelliteSection();
    });
  }

  if (satSplitRange) {
    satSplitRange.addEventListener('input', (e) => {
      STATE.satSplitPct = Number(e.target.value);
      const valSpan = document.getElementById('satSplitVal');
      if (valSpan) valSpan.textContent = `${STATE.satSplitPct}%`;
      renderSatelliteSection();
    });
  }

  const originFilter = document.getElementById('alertOriginFilter');
  const sevFilter = document.getElementById('alertSeverityFilter');
  if (originFilter) {
    originFilter.addEventListener('change', (e) => {
      STATE.alertOriginFilter = e.target.value;
      renderAlertsSection();
    });
  }
  if (sevFilter) {
    sevFilter.addEventListener('change', (e) => {
      STATE.alertSeverityFilter = e.target.value;
      renderAlertsSection();
    });
  }

  const notifForm = document.getElementById('notificationForm');
  if (notifForm) {
    notifForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const cId = document.getElementById('notifCommuneSelect').value;
      const evType = document.getElementById('notifEventType').value;
      const minSev = document.getElementById('notifMinSeverity').value;
      const locObj = CHILE_LOCATIONS.find((l) => l.id === cId) || getSelectedLocation();

      STATE.notifications.push({
        id: `SUB-${Date.now()}`,
        communeId: locObj.id,
        communeName: locObj.name,
        eventType: evType,
        minSeverity: minSev
      });
      try {
        localStorage.setItem('climasflood_notifications', JSON.stringify(STATE.notifications));
      } catch {
        // ignore storage errors
      }
      loadAndRenderNotifications();
    });
  }

  const btnReqPush = document.getElementById('btnRequestPushPermission');
  if (btnReqPush) {
    btnReqPush.addEventListener('click', async () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const perm = await Notification.requestPermission();
        updateWebPushPermissionBadge();
        if (perm === 'granted') {
          await triggerNativeWebPushNotification({
            title: 'FloodChile · Notificaciones Nativas Activadas',
            body: '¡Permiso concedido! Recibirás avisos meteorológicos nativos cuando se superen umbrales o se aprueben boletines.',
            tag: 'floodchile-welcome'
          });
        }
      }
    });
  }

  const btnTestNotif = document.getElementById('btnTestNotification');
  if (btnTestNotif) {
    btnTestNotif.addEventListener('click', async () => {
      const loc = getSelectedLocation();
      const banner = document.getElementById('staleWarningBanner');
      const text = document.getElementById('staleWarningText');
      if (banner && text) {
        banner.classList.remove('hidden');
        text.innerHTML = `🔔 <strong>Notificación Web Push Nativa para ${loc.name}:</strong> Nivel ${loc.summaryRisk} — ${loc.keyPhenomenon} (Lluvia 48h: ${loc.precipP50Mm} mm).`;
      }

      await triggerNativeWebPushNotification({
        title: `FloodChile · Alerta: ${loc.name}`,
        body: `Riesgo ${loc.summaryRisk} (${loc.keyPhenomenon}). Lluvia P50: ${loc.precipP50Mm} mm · Isoterma 0 °C: ${loc.freezingLevelM} m.`,
        tag: `push-commune-${loc.id}`
      });
    });
  }

  const btnLiveSync = document.getElementById('btnLiveSync');
  if (btnLiveSync) {
    btnLiveSync.addEventListener('click', () => syncAllLocationsLive());
  }

  document.getElementById('btnGeolocate')?.addEventListener('click', selectNearestLocation);
  document.getElementById('btnShareView')?.addEventListener('click', shareCurrentView);

  const btnStale = document.getElementById('btnSimulateStale');
  if (btnStale) {
    btnStale.addEventListener('click', () => {
      STATE.staleSimulationActive = !STATE.staleSimulationActive;
      btnStale.setAttribute('aria-pressed', String(STATE.staleSimulationActive));
      const banner = document.getElementById('staleWarningBanner');
      const sysBadge = document.getElementById('systemStatusBadge');

      if (STATE.staleSimulationActive) {
        banner?.classList.remove('hidden');
        btnStale.textContent = '✓ Restaurar Estado';
        if (sysBadge) {
          sysBadge.className = 'epistemic-badge badge-alerta-oficial';
          sysBadge.textContent = '⚠ Simulación activa: Fuente con TTL vencido (CA-05)';
        }
      } else {
        banner?.classList.add('hidden');
        btnStale.textContent = '⚠ Simular Fuente Desactualizada';
      }
      refreshAllViews();
    });
  }

  const btnGray = document.getElementById('btnToggleGrayscale');
  if (btnGray) {
    btnGray.addEventListener('click', () => {
      STATE.grayscaleModeActive = !STATE.grayscaleModeActive;
      document.body.classList.toggle('a11y-grayscale-mode', STATE.grayscaleModeActive);
      btnGray.setAttribute('aria-pressed', String(STATE.grayscaleModeActive));
      btnGray.textContent = STATE.grayscaleModeActive
        ? '◐ Desactivar Escala de Grises'
        : '◐ Escala de Grises (A11y)';
    });
  }
}

let liveSyncInFlight = false;

/**
 * Consulta Open-Meteo (Forecast + GloFAS + Marine) para TODAS las comunas, con concurrencia limitada
 * para respetar los límites de uso de la API abierta. Si falla, las comunas conservan los datos de muestra
 * y siguen etiquetadas como tales (isLiveSynced = false).
 */
async function syncAllLocationsLive() {
  if (liveSyncInFlight) return;
  liveSyncInFlight = true;
  const btn = document.getElementById('btnLiveSync');
  const sysBadge = document.getElementById('systemStatusBadge');
  if (btn) btn.disabled = true;

  // Primero la comuna activa, para que lo que el usuario ve se actualice antes.
  const selected = getSelectedLocation();
  const queue = [selected, ...CHILE_LOCATIONS.filter((l) => l.id !== selected.id)];
  let done = 0;
  let okCount = 0;
  const CONCURRENCY = 4;
  const total = queue.length;

  const updateProgress = () => {
    if (btn) btn.textContent = `⏳ Actualizando ${done}/${total}…`;
  };
  updateProgress();

  const rvPromise = fetchRainViewerMetadata().catch(() => ({ ok: false }));

  const worker = async () => {
    while (queue.length) {
      const loc = queue.shift();
      const res = await syncLocationViaServerOrDirect(loc).catch(() => ({ ok: false }));
      done += 1;
      if (res?.ok) okCount += 1;
      updateProgress();
      if (loc.id === STATE.selectedLocationId) refreshAllViews();
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const rvRes = await rvPromise;
  if (rvRes?.ok) STATE.rainViewerMeta = rvRes;

  if (btn) {
    btn.disabled = false;
    btn.textContent = okCount ? '↻ Actualizar datos en vivo' : '↻ Reintentar (sin conexión)';
  }
  liveSyncInFlight = false;
  refreshAllViews();

  if (sysBadge && !STATE.staleSimulationActive) {
    if (okCount === total) {
      sysBadge.className = 'epistemic-badge badge-observacion';
      sysBadge.textContent = `● Open-Meteo en vivo (${total} comunas · ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}) · Alertas de muestra`;
    } else if (okCount > 0) {
      sysBadge.className = 'epistemic-badge badge-pronostico';
      sysBadge.textContent = `◐ En vivo ${okCount}/${total} comunas · resto con datos de muestra`;
    } else {
      sysBadge.className = 'epistemic-badge badge-estimacion';
      sysBadge.textContent = '🧪 Sin conexión a Open-Meteo (mostrando datos de muestra)';
    }
  }
}

function setQuickBarStatus(msg) {
  const el = document.getElementById('quickBarStatus');
  if (!el) return;
  el.textContent = msg;
  clearTimeout(setQuickBarStatus._t);
  setQuickBarStatus._t = setTimeout(() => {
    el.textContent = '';
  }, 4000);
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function selectNearestLocation() {
  if (!navigator.geolocation) {
    setQuickBarStatus('Tu navegador no permite geolocalización.');
    return;
  }
  setQuickBarStatus('Buscando tu ubicación…');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      let best = CHILE_LOCATIONS[0];
      let bestKm = Infinity;
      CHILE_LOCATIONS.forEach((l) => {
        const km = haversineKm(latitude, longitude, l.lat, l.lon);
        if (km < bestKm) {
          bestKm = km;
          best = l;
        }
      });
      STATE.selectedLocationId = best.id;
      STATE.selectedMacrozone = 'ALL';
      const macroSel = document.getElementById('macrozoneSelect');
      if (macroSel) macroSel.value = 'ALL';
      refreshAllViews();
      mapControllerSingleton.focusOnSelectedLocation();
      setQuickBarStatus(
        bestKm > 150
          ? `Referencia más cercana: ${best.name.split('/')[0].trim()} (a ${Math.round(bestKm)} km; puede no representar tu zona)`
          : `Referencia más cercana: ${best.name.split('/')[0].trim()} (${Math.round(bestKm)} km)`
      );
    },
    () => setQuickBarStatus('No se pudo obtener tu ubicación (permiso denegado o sin señal).'),
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
  );
}

function buildShareUrl() {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('loc', STATE.selectedLocationId);
  url.searchParams.set('capa', STATE.activeMapLayer);
  if (STATE.mapHourOffset) url.searchParams.set('h', String(STATE.mapHourOffset));
  if (STATE.activeTabId !== 'tab-mapa') url.searchParams.set('vista', STATE.activeTabId.replace('tab-', ''));
  return url;
}

function syncUrlState() {
  try {
    window.history.replaceState(null, '', buildShareUrl());
  } catch {
    // ignore (file:// u otros contextos)
  }
}

async function shareCurrentView() {
  const url = buildShareUrl().toString();
  const loc = getSelectedLocation();
  try {
    if (navigator.share) {
      await navigator.share({ title: `ClimasFlood · ${loc.name}`, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    setQuickBarStatus('✓ Enlace copiado');
  } catch {
    setQuickBarStatus(url);
  }
}

function applyUrlStateOnLoad() {
  const params = new URLSearchParams(window.location.search);
  const loc = params.get('loc');
  const capa = params.get('capa');
  const h = Number(params.get('h'));
  const vista = params.get('vista');
  if (loc && CHILE_LOCATIONS.some((l) => l.id === loc)) STATE.selectedLocationId = loc;
  if (capa && MAP_LAYERS_META[capa]) {
    STATE.activeMapLayer = capa;
    document.querySelectorAll('.layer-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-layer') === capa);
    });
  }
  if (TIME_SLIDER_STEPS.includes(h)) {
    STATE.mapHourOffset = h;
    const slider = document.getElementById('mapTimeSlider');
    if (slider) slider.value = String(TIME_SLIDER_STEPS.indexOf(h));
  }
  return vista && TAB_TO_GROUP[`tab-${vista}`] ? `tab-${vista}` : 'tab-mapa';
}

document.addEventListener('DOMContentLoaded', () => {
  initPreferencesFromStorage();
  setupEventListeners();
  const initialTab = applyUrlStateOnLoad();
  activateTab(initialTab);
  refreshAllViews();
  setInterval(updateClockAndHeaderStatus, 30000);
  // Datos reales por defecto: sincroniza automáticamente al abrir y cada 30 min.
  syncAllLocationsLive();
  setInterval(syncAllLocationsLive, 30 * 60 * 1000);

  // Registro de Service Worker PWA para resiliencia offline durante temporales
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
});
