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
  fetchLiveSenapredAlerts,
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
import {
  playSaeAlarm,
  stopAudioAlarm,
  isAudioAlarmPlaying
} from './modules/audio-alarm.js';
import { auditSourceCatalog } from './modules/source-audit.js';

const STATE = {
  themePref: 'light', // 'retro' | 'light' | 'dark' | 'system'
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
  sourceAuditReport: null,
  notifications: [],
  liveSenapredAlerts: [],
  liveSenapredFetched: false,
  ingestionHealth: [],
  ingestionHealthCheckedAt: 0,
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
    localStorage.setItem('climasflood_theme_v2', pref);
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
    savedTheme = localStorage.getItem('climasflood_theme_v2') || 'light';
    if (savedTheme === 'apple') savedTheme = 'light';
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
  const activeNavItem = document.querySelector(`.sidebar-nav-item[data-tab="${tabId}"]`);
  if (activeNavItem?.closest('#sidebarMoreTools')) {
    document.getElementById('sidebarMoreTools').open = true;
  }

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

  // Renderizado dinámico garantizado al activar cada sección
  try {
    if (tabId === 'tab-mapa') {
      renderMapAndDetailView();
      setTimeout(() => {
        mapControllerSingleton.leafletMap?.invalidateSize();
      }, 50);
    } else if (tabId === 'tab-pronostico') {
      renderForecast7dAndNationalSection();
    } else if (tabId === 'tab-lluvia') {
      renderRainfallSection();
    } else if (tabId === 'tab-alertas') {
      renderAlertsSection();
      loadAndRenderNotifications();
    } else if (tabId === 'tab-satelite') {
      renderSatelliteSection();
    } else if (tabId === 'tab-escenarios') {
      renderScenariosSection();
    } else if (tabId === 'tab-predictivo') {
      renderPredictiveAndVerificationSection();
    } else if (tabId === 'tab-agentes') {
      renderAgentsSection();
    } else if (tabId === 'tab-fuentes') {
      renderSourcesAndCriteriaSection();
    }
  } catch (err) {
    console.error(`Error activando y renderizando pestaña ${tabId}:`, err);
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
  if (!utcIsoStr) return 'N/A';
  const tz = tzOverride || getEffectiveTimezone();
  try {
    const dt = new Date(utcIsoStr);
    if (isNaN(dt.getTime())) return String(utcIsoStr);
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
    return String(utcIsoStr || '');
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
  const forecast48hMm = (loc.daily7d[0]?.precipForecastMm || 0) + (loc.daily7d[1]?.precipForecastMm || 0);
  const upperScenario48hMm = (loc.daily7d[0]?.precipUpperScenarioMm || 0) + (loc.daily7d[1]?.precipUpperScenarioMm || 0);
  const sampleNote = o.isLiveSynced
    ? 'Pronóstico base de Open-Meteo; el escenario alto es una heurística, no un percentil.'
    : 'Escenario de demostración (datos de muestra).';

  if (STATE.viewMode === 'technical') {
    return `<strong>Resumen técnico (${loc.name}):</strong> ${loc.keyPhenomenon} Lluvia 48 h: <strong>${forecast48hMm.toFixed(1)} mm de pronóstico base</strong>; escenario superior de referencia: <strong>${upperScenario48hMm.toFixed(1)} mm</strong> en cuenca <em>${loc.basin}</em>. <em>(${sampleNote})</em>`;
  }

  if (loc.summaryRisk === 'EXTREMA') {
    return `<strong>¿Qué hacer a continuación?</strong> El pronóstico base estima ${forecast48hMm.toFixed(1)} mm en 48 h; el escenario alto de referencia llega a ${upperScenario48hMm.toFixed(1)} mm, con cota de congelación en ${o.freezingLevelM} m. Evita acercarte a riberas, quebradas y pasos bajo nivel de la cuenca <em>${loc.basin}</em>. <em>(${sampleNote})</em>`;
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
  const heroPrecipLabel = document.getElementById('heroPrecipLabel');
  const heroIsoLevel = document.getElementById('heroIsoLevel');
  const heroGuidance = document.getElementById('heroHumanSummary');

  const forecast48hMm = (loc.daily7d[0]?.precipForecastMm || 0) + (loc.daily7d[1]?.precipForecastMm || 0);
  const upperScenario48hMm = (loc.daily7d[0]?.precipUpperScenarioMm || 0) + (loc.daily7d[1]?.precipUpperScenarioMm || 0);

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
    heroPrecip48h.textContent = `${forecast48hMm.toFixed(1)} / ${upperScenario48hMm.toFixed(1)} mm`;
  }
  if (heroPrecipLabel) {
    heroPrecipLabel.textContent = loc.observation.isLiveSynced
      ? 'Pronóstico base / escenario alto aprox. · no percentiles'
      : 'Valores ilustrativos · datos de demostración';
  }
  if (heroIsoLevel) {
    heroIsoLevel.textContent = `${loc.observation.freezingLevelM} m s.n.m.`;
  }
  if (heroGuidance) {
    heroGuidance.innerHTML = buildFriendlyCitizenGuidance(loc);
  }

  // Micro-scrubber horario de Apple Weather
  const heroHourlyScrubber = document.getElementById('heroHourlyScrubber');
  if (heroHourlyScrubber && loc.hourlyRain48h) {
    const nextHours = loc.hourlyRain48h.slice(0, 5);
    heroHourlyScrubber.innerHTML = nextHours
      .map((h, i) => {
        const label = i === 0 ? 'Ahora' : `+${h.hourOffset}h`;
        const rain = (h.forecastMm || 0).toFixed(1);
        const icon = (h.forecastMm || 0) > 1.5 ? '🌧' : (h.forecastMm || 0) > 0 ? '🌦' : '⛅';
        return `
          <div class="hourly-scrub-pill ${i === 0 ? 'active' : ''}">
            <span class="scrub-hour">${label}</span>
            <span class="scrub-icon" aria-hidden="true">${icon}</span>
            <span class="scrub-temp">${h.temp ? h.temp.toFixed(0) : loc.observation.tempC.toFixed(0)}°</span>
            <span class="scrub-rain">${rain} mm</span>
          </div>
        `;
      })
      .join('');
  }

  // Visualización dinámica del arco de elevación de la Isoterma 0°C
  const gaugeArcFill = document.getElementById('gaugeArcFill');
  if (gaugeArcFill) {
    const isoVal = loc.observation.freezingLevelM || 3000;
    const clampedPct = Math.max(0.12, Math.min(0.96, (isoVal - 800) / 3800));
    const radius = 60;
    const cx = 80;
    const cy = 80;
    const angle = Math.PI - (Math.PI * clampedPct);
    const endX = (cx + radius * Math.cos(angle)).toFixed(1);
    const endY = (cy - radius * Math.sin(angle)).toFixed(1);
    gaugeArcFill.setAttribute('d', `M 20 80 A 60 60 0 0 1 ${endX} ${endY}`);
  }

  document.querySelectorAll('.quick-commune-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.getAttribute('data-quick-loc') === loc.id);
  });

  const alertCountEl = document.getElementById('kpiActiveAlertsCount');
  if (alertCountEl) {
    const matching = ALERTS_DATA.filter(
      (a) => a.communesIds.includes(loc.id) || a.regions.includes(loc.regionCode)
    );
    alertCountEl.textContent = matching.length
      ? `${matching.length} registros de muestra`
      : 'ninguna muestra local';
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
    const stationCode = loc.stationId.match(/EMA-(\d{6})/)?.[1];
    if (stationCode) {
      const dmcLine = document.createElement('span');
      dmcLine.textContent = 'DMC EMA: consultando observación oficial…';
      obsProv.append(dmcLine);
      fetch(`/api/dmc/observaciones?estacion=${stationCode}`)
        .then((response) => response.json()
          .then((data) => response.ok ? data : { ...data, ok: false })
          .catch(() => ({ ok: false, error: `HTTP ${response.status}` })))
        .then((data) => {
          if (STATE.selectedLocationId !== loc.id) return;
          if (!data?.ok) {
            dmcLine.textContent = data?.configured === false
              ? 'DMC EMA: credenciales de API requeridas; conector no configurado'
              : /bloqueó este servicio/i.test(data?.error || '')
                ? 'DMC EMA: usuario sin habilitación para este servicio; solicita acceso a DMC'
              : /no aceptó las credenciales/i.test(data?.error || '')
                ? 'DMC EMA: usuario o API key rechazados; observaciones oficiales no disponibles'
              : 'DMC EMA: servicio no disponible o respuesta no reconocida';
            refreshIngestionHealth(true);
            return;
          }
          const values = [
            data.values?.temperatureC != null && `Temp. ${data.values.temperatureC} °C`,
            data.values?.humidityPct != null && `HR ${data.values.humidityPct}%`,
            data.values?.windKmh != null && `Viento ${data.values.windKmh} km/h`,
            data.values?.precipitationTodayMm != null && `Lluvia acumulada (${data.precipitationPeriod || 'período DMC'}): ${data.values.precipitationTodayMm} mm`
          ].filter(Boolean);
          dmcLine.textContent = values.length
            ? `DMC EMA · ${data.stationName || stationCode}: ${values.join(' · ')} · medición ${data.measurementTimeUtc ? formatUtcInChileTz(data.measurementTimeUtc, loc.timezone) : `${data.measurementTime || 'sin hora'} (zona no confirmada)`} · descarga ${formatUtcInChileTz(data.retrievedAtUtc, loc.timezone)}${data.quality.status === 'STALE' ? ' · observación desactualizada' : data.quality.status === 'REVIEW' ? ' · requiere revisión QC' : data.quality.status === 'PARTIAL' ? ' · respuesta parcial' : ''}`
            : 'DMC EMA: estación sin observaciones disponibles';
          refreshIngestionHealth(true);
        })
        .catch(() => {
          dmcLine.textContent = 'DMC EMA: servicio no disponible';
          refreshIngestionHealth(true);
        });
      const stationDetails = document.createElement('details');
      const stationSummary = document.createElement('summary');
      stationSummary.textContent = 'Ficha de la estación DMC';
      const stationInfo = document.createElement('p');
      stationInfo.textContent = 'Consultando ficha…';
      stationDetails.append(stationSummary, stationInfo);
      stationDetails.addEventListener('toggle', async () => {
        if (!stationDetails.open) return;
        try {
          const response = await fetch(`/api/dmc/estaciones/${stationCode}`);
          const data = await response.json();
          if (!response.ok || !data.ok) throw new Error('Ficha no disponible');
          const station = data.station;
          stationInfo.textContent = [
            `${station.stationName || 'Estación'} · código ${station.stationCode}`,
            station.commune && `Comuna: ${station.commune}`,
            station.latitude != null && station.longitude != null && `Coordenadas: ${station.latitude}, ${station.longitude}`,
            station.elevationM != null && `Altitud: ${station.elevationM} m`,
            `Vigencia DMC: ${station.active ? 'activa' : 'inactiva'}`,
            'Los datos corresponden a esta estación; las condiciones pueden variar dentro de la zona seleccionada.'
          ].filter(Boolean).join(' · ');
        } catch {
          stationInfo.textContent = 'La ficha DMC no está disponible. Las observaciones se consultan por separado.';
        }
      });
      obsProv.append(stationDetails);
    }
    const conafLine = document.createElement('span');
    conafLine.textContent = 'CONAF: consultando informe diario regional…';
    obsProv.append(conafLine);
    fetch('/api/conaf/incendios')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (STATE.selectedLocationId !== loc.id) return;
        if (!data?.ok) {
          conafLine.textContent = 'CONAF: informe no disponible o formato no reconocido';
          refreshIngestionHealth(true);
          return;
        }
        const targetRegion = loc.regionCode === 'RM' ? 'metropolitana'
          : loc.regionCode === 'VI' ? "o'higgins"
            : loc.regionName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const regionData = data.regions?.find((item) => {
          const name = item.region.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          return name === targetRegion || (targetRegion === 'metropolitana de santiago' && name === 'metropolitana');
        });
        conafLine.textContent = regionData
          ? `CONAF · ${regionData.region}: ${regionData.firesTotal ?? 's/d'} incendios reportados hoy · ${regionData.affectedAreaHa ?? 's/d'} ha · reporte ${data.sourceReportedAtLocal || 'sin hora' }${data.stale ? ' · copia local atrasada' : ''}${data.quality.status === 'REVIEW' ? ' · revisar consistencia' : ''}`
          : 'CONAF: el informe no incluye la región seleccionada';
        refreshIngestionHealth(true);
      })
      .catch(() => {
        conafLine.textContent = 'CONAF: informe no disponible';
        refreshIngestionHealth(true);
      });
  }

  const keyPhenEl = document.getElementById('detailKeyPhenomenon');
  const miniFcst = document.getElementById('miniForecastPreview');
  if (keyPhenEl) {
    keyPhenEl.innerHTML = `<strong>Foco local:</strong> ${loc.keyPhenomenon}`;
  }
  if (miniFcst) {
    const points = loc.hourlyRain48h || [];
    const maxRain = Math.max(1, ...points.map((point) => point.upperScenarioMm));
    miniFcst.innerHTML = `
      <figure class="mini-rain-figure">
        <div class="mini-rain-bars" role="img" aria-label="Pronóstico de lluvia cada tres a seis horas durante las próximas 48 horas">
          ${points.map((point) => `
            <span class="mini-rain-column" title="${point.hourOffset === 0 ? 'Ahora' : `Más ${point.hourOffset} horas`}: pronóstico ${point.forecastMm} mm; escenario superior ${point.upperScenarioMm} mm">
              <span class="mini-rain-upper" style="height:${Math.max(2, (point.upperScenarioMm / maxRain) * 100)}%"></span>
              <span class="mini-rain-base" style="height:${Math.max(2, (point.forecastMm / maxRain) * 100)}%"></span>
            </span>
          `).join('')}
        </div>
        <div class="mini-rain-axis" aria-hidden="true">
          ${points.map((point) => `<span>${[0, 12, 24, 36, 48].includes(point.hourOffset) ? (point.hourOffset ? `+${point.hourOffset}h` : 'Ahora') : ''}</span>`).join('')}
        </div>
      </figure>
    `;
  }

  const locAlertsEl = document.getElementById('locationAlertsPreview');
  if (locAlertsEl) {
    const matching = ALERTS_DATA.filter(
      (a) => a.communesIds.includes(loc.id) || a.regions.includes(loc.regionCode)
    );
    const o = loc.observation;
    const forecast48hMm = (loc.daily7d[0]?.precipForecastMm || 0) + (loc.daily7d[1]?.precipForecastMm || 0);
    const upperScenario48hMm = (loc.daily7d[0]?.precipUpperScenarioMm || 0) + (loc.daily7d[1]?.precipUpperScenarioMm || 0);
    const liveSignals = [];
    if (forecast48hMm >= 15) {
      liveSignals.push(`Pronóstico de lluvia 48 h: ${forecast48hMm.toFixed(1)} mm; escenario superior de referencia: ${upperScenario48hMm.toFixed(1)} mm`);
    }
    if (o.freezingLevelM >= 2700 && forecast48hMm >= 5) {
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
              : `Sin umbrales hidrometeorológicos críticos superados en las próximas 48 h (${forecast48hMm.toFixed(1)} mm de pronóstico base, racha ${o.windGustKmh} km/h).`
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
          return `
            <div class="alert-card sev-border-INFORMATIVA" style="margin-bottom:0.65rem; padding:0.75rem;">
              <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:0.35rem; margin-bottom:0.3rem;">
                <span class="epistemic-badge badge-estimacion">🧪 Severidad de muestra: ${sev.label}</span>
                <span class="epistemic-badge badge-estimacion">
                  Muestra · ${a.issuer}
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
      <span><strong>Lectura:</strong> temperatura mínima/máxima del proveedor; lluvia base y escenario superior heurístico (no percentiles).</span>
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
          </td>
          <td>
            <strong>${d.precipForecastMm.toFixed(1)} mm</strong>
            <span class="uncertainty-range">Esc. alto aprox.: ${d.precipUpperScenarioMm.toFixed(1)} mm</span>
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
      const forecast48hMm = (item.daily7d[0].precipForecastMm + item.daily7d[1].precipForecastMm).toFixed(1);
      const upperScenario48hMm = (item.daily7d[0].precipUpperScenarioMm + item.daily7d[1].precipUpperScenarioMm).toFixed(1);
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
          <td><strong>${forecast48hMm} mm</strong> <span class="uncertainty-range">Esc. alto: ${upperScenario48hMm} mm</span></td>
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
    const sumForecast = loc.daily7d.slice(0, 2).reduce((acc, d) => acc + d.precipForecastMm, 0);
    const sumUpperScenario = loc.daily7d.slice(0, 2).reduce((acc, d) => acc + d.precipUpperScenarioMm, 0);
    const maxIso = Math.max(...loc.hourlyRain48h.map((h) => h.iso0));
    const minIso = Math.min(...loc.hourlyRain48h.map((h) => h.iso0));
    const maxSnow = loc.daily7d.slice(0, 2).reduce((acc, d) => acc + d.snowCm, 0);

    episodesContainer.innerHTML = `
      <div class="alert-card sev-border-${loc.summaryRisk}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
          <strong>Lluvia en 48 horas</strong>
          <span class="epistemic-badge badge-pronostico">${
            loc.observation.isLiveSynced ? 'Open-Meteo' : 'Datos de muestra'
          }</span>
        </div>
        <div style="font-size:1.2rem; font-weight:800; color:var(--accent-text); margin:0.25rem 0; font-family:var(--font-mono);">
          Pronóstico base: ${sumForecast.toFixed(1)} mm · Escenario superior: ${sumUpperScenario.toFixed(1)} mm
        </div>
        <p style="margin:0.35rem 0 0; font-size:0.84rem; color:var(--text-secondary);">
          <strong>Cuenca de referencia:</strong> <em>${loc.basin}</em>.
          ${loc.observation.isLiveSynced ? 'El escenario superior se obtiene con una regla fija; no es percentil ni intervalo calibrado.' : 'Valores de demostración; no representan un pronóstico operativo.'}
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
            maxIso >= 2750 && sumForecast >= 15
              ? '⚠ Atención en escenario: Cota de isoterma 0 °C sobre 2.750 m s.n.m. con precipitación activa incrementa el área pluvial en precordillera.'
              : 'Cota de congelación dentro de rangos habituales para la cuenca; nieve restringida a sectores cordilleranos altos.'
          }
        </p>
      </div>
    `;
  }
}

export async function loadLiveSenapredAlerts(force = false) {
  if (STATE.liveSenapredFetched && !force) return;
  try {
    const res = await fetchLiveSenapredAlerts();
    if (res.ok && Array.isArray(res.alerts)) {
      STATE.liveSenapredAlerts = res.sourceAvailable ? res.alerts : [];
      STATE.liveSenapredFetched = true;

      const statusText = document.getElementById('senapredLiveStatusText');
      const statusDot = document.getElementById('senapredStatusDot');
      if (statusText) {
        statusText.textContent = res.sourceAvailable
          ? `Portal SENAPRED consultado: ${res.alerts.length} enlaces encontrados. El contenido requiere verificación en la fuente.`
          : 'Portal SENAPRED no disponible; se muestran registros de demostración por separado.';
      }
      statusDot?.classList.toggle('online', res.sourceAvailable);

    }
  } catch (err) {
    console.warn('Error consultando alertas de SENAPRED:', err);
  }
}

function renderAlertsSection() {
  const container = document.getElementById('alertsListContainer');
  if (!container) return;

  // Lista unificada: Alertas oficiales en vivo + datos de muestra/estimaciones
  const combinedAlerts = [
    ...STATE.liveSenapredAlerts.map(({ officialUrl }, index) => ({
      id: `SENAPRED-ENLACE-${index + 1}`,
      title: 'Publicación para revisar en el portal SENAPRED',
      issuer: 'SENAPRED',
      originLabel: 'SENAPRED · enlace encontrado',
      originCategory: 'OFFICIAL_AUTHORITY',
      officialUrl,
      severity: 'INFORMATIVA',
      confidenceLevel: 'No evaluada',
      confidenceRationale: 'La aplicación no valida el contenido ni la vigencia del enlace.',
      whatCouldHappen: 'Contenido no interpretado por la aplicación.',
      affectedZonesText: 'Sin zonas verificadas; consulta el enlace oficial.',
      preventiveActions: ['Confirma la publicación vigente directamente en SENAPRED.'],
      onsetUtc: null,
      issuedAtUtc: null,
      expiresUtc: null,
      isLiveScraped: true
    })),
    ...ALERTS_DATA
      .filter((a) => !STATE.liveSenapredAlerts.some((la) => la.id === a.id))
      .map((a) => ({ ...a, isDemoRecord: true }))
  ];

  const filtered = combinedAlerts.filter((a) => {
    const matchOrigin = STATE.alertOriginFilter === 'ALL'
      || (STATE.alertOriginFilter === 'OFFICIAL_AUTHORITY' && a.isLiveScraped)
      || (STATE.alertOriginFilter === 'APP_THRESHOLD_ESTIMATE' && a.isDemoRecord && a.originCategory === 'APP_THRESHOLD_ESTIMATE')
      || (STATE.alertOriginFilter === 'DEMO' && a.isDemoRecord);
    const matchSev =
      STATE.alertSeverityFilter === 'ALL' || a.severity === STATE.alertSeverityFilter;
    return matchOrigin && matchSev;
  });

  if (!filtered.length) {
    container.innerHTML = `<div class="alert-card">No hay alertas que coincidan con el filtro seleccionado.</div>`;
    return;
  }

  container.innerHTML = filtered
    .map((a) => {
      const sev = SEVERITY_META[a.severity] || SEVERITY_META.INFORMATIVA;
      const isLivePortalLink = a.isLiveScraped;
      const cardSeverity = a.isDemoRecord ? 'INFORMATIVA' : a.severity;
      return `
        <article class="alert-card sev-border-${cardSeverity}" aria-label="${a.title}">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.5rem;">
            <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
              ${a.isDemoRecord
                ? `<span class="epistemic-badge badge-estimacion">🧪 Severidad de muestra: ${sev.label}</span>`
                : `<span class="severity-pill ${sev.css}">${sev.icon} Severidad: ${sev.label}</span>`}
              <span class="epistemic-badge ${isLivePortalLink ? 'badge-observacion' : 'badge-estimacion'}">
                ${isLivePortalLink ? a.originLabel : `Muestra · ${a.issuer}`}
              </span>
              ${
                a.isLiveScraped
                  ? '<span class="epistemic-badge badge-observacion">Enlace del portal · contenido y vigencia sin verificar</span>'
                  : '<span class="epistemic-badge badge-estimacion">🧪 Demostración · no indica vigencia real</span>'
              }
              <span class="epistemic-badge badge-pronostico">${a.isDemoRecord ? 'Confianza ilustrativa' : 'Confianza'}: ${a.confidenceLevel}</span>
            </div>
            <span style="font-size:0.76rem; color:var(--text-muted); font-family:var(--font-mono);">
              ID: ${a.id} · ${a.isLiveScraped ? 'Publicación: ' : 'Ref: '}${formatUtcInChileTz(a.issuedAtUtc)}
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
            <span><strong>Emisor:</strong> ${a.issuer}</span>
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

  let perm = 'default';
  try {
    perm = Notification.permission;
  } catch {
    perm = 'default';
  }

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
  const verCards = document.getElementById('verificationCardsContainer');
  const verTableBody = document.getElementById('verificationTableBody');

  if (titleEl && loc) {
    titleEl.textContent = `Comparación ilustrativa de modelos — ${loc.name}`;
  }

  if (modelContainer && loc) {
    renderModelComparisonChartSVG(modelContainer, loc);
  }

  const verList = Array.isArray(VERIFICATION_HISTORY) ? VERIFICATION_HISTORY : [];
  if (!verList.length) return;

  const avgRainErr =
    verList.reduce((acc, v) => acc + (v.precipAbsErrorMm || 0), 0) /
    verList.length;
  const avgTempErr =
    verList.reduce((acc, v) => acc + (v.tempAbsErrorC || 0), 0) /
    verList.length;
  const bandCoverage =
    (verList.filter((v) => v.withinUncertaintyBand).length /
      verList.length) *
    100;

  if (verMetrics) {
    verMetrics.innerHTML = `
      <div class="obs-metric-box">
        <div class="obs-metric-label">MAE de muestra · lluvia</div>
        <div class="obs-metric-val">±${avgRainErr.toFixed(1)} mm</div>
        <div class="obs-metric-sub">Dato sintético, no validado</div>
      </div>
      <div class="obs-metric-box">
        <div class="obs-metric-label">MAE de muestra · temp. máx.</div>
        <div class="obs-metric-val">±${avgTempErr.toFixed(1)} °C</div>
        <div class="obs-metric-sub">Dato sintético, no validado</div>
      </div>
      <div class="obs-metric-box">
        <div class="obs-metric-label">Dentro del rango de muestra</div>
        <div class="obs-metric-val" style="color:var(--tag-obs-text);">${bandCoverage.toFixed(0)}%</div>
        <div class="obs-metric-sub">Cobertura de datos sintéticos</div>
      </div>
    `;
  }

  if (verCards) {
    verCards.innerHTML = verList.map((v) => `
      <div class="verif-card ${v.withinUncertaintyBand ? 'in-band' : 'out-band'}">
        <div class="verif-card-header">
          <div>
            <strong class="verif-card-loc">${v.locationName}</strong>
            <span class="verif-lead-pill">-${v.leadTimeHours}h (${v.targetDate})</span>
          </div>
          <span class="eval-status-badge ${v.withinUncertaintyBand ? 'in-band' : 'out-band'}">
            ${v.withinUncertaintyBand ? '✓ Muestra dentro del rango' : '✕ Muestra fuera del rango'}
          </span>
        </div>
        <div class="verif-card-grid">
          <div class="verif-stat-box">
            <span class="verif-stat-label">Lluvia de muestra: predicción → referencia</span>
            <div class="verif-stat-val">
              <span>${v.predictedPrecipMm.toFixed(1)}</span>
              <span class="verif-arrow">→</span>
              <strong>${v.observedPrecipMm.toFixed(1)} mm</strong>
            </div>
            <span class="verif-delta-sub">Error: ±${v.precipAbsErrorMm.toFixed(1)} mm</span>
          </div>
          <div class="verif-stat-box">
            <span class="verif-stat-label">Temperatura de muestra: predicción → referencia</span>
            <div class="verif-stat-val">
              <span>${v.predictedTempMaxC}°</span>
              <span class="verif-arrow">→</span>
              <strong>${v.observedTempMaxC}°C</strong>
            </div>
            <span class="verif-delta-sub">Error: ±${v.tempAbsErrorC.toFixed(1)} °C</span>
          </div>
        </div>
        <div class="verif-note-text">${v.evaluationNote || ''}</div>
      </div>
    `).join('');
  }

  if (verTableBody) {
    verTableBody.innerHTML = verList.map(
      (v) => `
        <tr>
          <td><strong>${v.locationName}</strong></td>
          <td style="white-space:nowrap;">${v.targetDate} <span class="lead-time-pill">-${v.leadTimeHours}h</span></td>
          <td>${Number(v.predictedPrecipMm || 0).toFixed(1)} mm <span class="uncertainty-range">[${v.predictedPrecipRangeMm || ''}]</span></td>
          <td><strong>${Number(v.observedPrecipMm || 0).toFixed(1)} mm</strong></td>
          <td><span class="mono-err">±${Number(v.precipAbsErrorMm || 0).toFixed(1)} mm</span></td>
          <td>${v.predictedTempMaxC}° / <strong>${v.observedTempMaxC}°C</strong></td>
          <td>
            <span class="eval-status-badge ${v.withinUncertaintyBand ? 'in-band' : 'out-band'}">
              ${v.withinUncertaintyBand ? '✓ En Rango' : '✕ Fuera'}
            </span>
          </td>
        </tr>
      `
    ).join('');
  }
}

// ==========================================================================
// Persistencia Local de Decisiones Human-in-the-Loop (HITL)
// ==========================================================================
const HITL_STORAGE_KEY = 'climasflood_hitl_decisions_v2';

function getStoredHitlDecisions() {
  try {
    const raw = localStorage.getItem(HITL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveHitlDecision(hitlId, decision) {
  try {
    const data = getStoredHitlDecisions();
    if (decision === 'PENDIENTE_REVISION_HUMANA') {
      delete data[hitlId];
    } else {
      data[hitlId] = {
        status: decision,
        timestamp: new Date().toISOString()
      };
    }
    localStorage.setItem(HITL_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving HITL decision to storage:', err);
  }
}

function renderSourceAuditReport() {
  const container = document.getElementById('sourceAuditReport');
  if (!container || !STATE.sourceAuditReport) return;

  const report = STATE.sourceAuditReport;
  container.replaceChildren();
  const summary = document.createElement('p');
  summary.textContent = `Revisión local · ${report.sourceCount} fuentes · ${report.findings.length} con observaciones · ${report.reviewRequired ? 'pendiente de revisión humana' : 'sin observaciones de catálogo'} · ${formatUtcInChileTz(report.checkedAtUtc)}`;
  container.append(summary);

  for (const check of report.runtimeChecks) {
    const runtime = document.createElement('p');
    runtime.textContent = `${check.name}: ${check.status} · ${check.detail}`;
    container.append(runtime);
  }

  if (!report.findings.length) return;
  const list = document.createElement('ul');
  for (const finding of report.findings) {
    const item = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = finding.name;
    item.append(title);
    for (const problem of finding.problems) {
      const detail = document.createElement('div');
      detail.textContent = problem;
      item.append(detail);
    }
    if (finding.url) {
      const link = document.createElement('a');
      link.href = finding.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = ' Abrir fuente';
      item.append(link);
    }
    list.append(item);
  }
  container.append(list);
}

function renderLiveSourceMonitorCard() {
  const card = document.createElement('div');
  card.className = 'agent-card';
  card.setAttribute('aria-live', 'polite');
  const heading = document.createElement('strong');
  heading.textContent = 'Monitor de fuentes en esta sesión';
  const scope = document.createElement('p');
  scope.className = 'agent-role-meta';
  scope.textContent = 'Reglas deterministas de disponibilidad, vigencia y QC básico. Solo lectura; no emite alertas. Los otros perfiles de agentes siguen siendo demostrativos.';
  card.append(heading, scope);

  const list = document.createElement('ul');
  list.className = 'agent-findings-list';
  for (const sourceId of ['dmc-meteochile', 'conaf-incendios']) {
    const source = DATA_SOURCES.find((item) => item.id === sourceId);
    const health = STATE.ingestionHealth.find((item) => item.sourceId === sourceId);
    const item = document.createElement('li');
    const age = health?.lastSuccessAtUtc ? Math.floor((Date.now() - Date.parse(health.lastSuccessAtUtc)) / 60000) : null;
    const stale = age === null || age > (source?.ttlMinutes || 60);
    const status = !health ? 'Sin consulta en esta sesión'
      : health.status === 'ERROR' ? `No disponible · ${health.lastError || 'sin detalle'}`
        : health.status === 'REVIEW' ? 'Respuesta recibida · QC requiere revisión'
          : health.status === 'PARTIAL' ? 'Respuesta parcial · campos incompletos'
            : health.status === 'STALE' ? 'Última observación desactualizada'
              : health.status === 'NOT_CONFIGURED' ? `No configurado · ${health.lastError || 'faltan credenciales'}`
                : stale ? `Último éxito vencido · hace ${age} min` : `Respuesta reciente · hace ${age} min`;
    item.textContent = `${source?.shortName || sourceId}: ${status}`;
    if (source?.url) {
      const link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = ' Abrir fuente ↗';
      item.append(link);
    }
    list.append(item);
  }
  card.append(list);
  return card;
}

function renderAgentsSection() {
  const agentsContainer = document.getElementById('agentsCardsContainer');
  const hitlContainer = document.getElementById('hitlQueueContainer');
  const evidenceBody = document.getElementById('evidenceTableBody');
  renderSourceAuditReport();

  // Sincronizar estado HITL con localStorage para persistir entre recargas (F5)
  const storedDecisions = getStoredHitlDecisions();
  const hitlList = Array.isArray(AI_AGENTS_DATA?.hitlQueue) ? AI_AGENTS_DATA.hitlQueue : [];
  hitlList.forEach((item) => {
    if (storedDecisions[item.id]) {
      item.status = storedDecisions[item.id].status;
      item.decidedAt = storedDecisions[item.id].timestamp;
    }
  });

  const agentsList = Array.isArray(AI_AGENTS_DATA?.agents) ? AI_AGENTS_DATA.agents : [];
  if (agentsContainer) {
    agentsContainer.replaceChildren(renderLiveSourceMonitorCard());
    agentsContainer.insertAdjacentHTML('beforeend', agentsList
      .filter((agent) => agent.id !== 'AG-MON-01')
      .map(
        (ag) => `
        <div class="agent-card">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.4rem; margin-bottom:0.35rem;">
            <strong>${ag.name}</strong>
            <span class="agent-status-pill ${ag.status === 'ACTIVO' ? 'pill-active' : 'pill-waiting'}">
              ● ${ag.status}
            </span>
          </div>
          <div class="agent-role-meta">
            ${ag.role} · Permiso: <code>${ag.autonomyLevel}</code>
          </div>
          <ul class="agent-findings-list">
            ${(ag.findings || [])
              .map(
                (f) => `
                <li>
                  <span class="finding-text">${f.text}</span>
                  <span class="finding-chips">
                    ${(f.citations || [])
                      .map(
                        (cid) =>
                          `<button type="button" class="citation-chip" data-ev-id="${cid}" title="Inspeccionar dato fuente ${cid}">[Ref: ${cid}]</button>`
                      )
                      .join('')}
                  </span>
                </li>
              `
              )
              .join('')}
          </ul>
        </div>
      `
      )
      .join(''));
  }

  if (hitlContainer) {
    hitlContainer.innerHTML = hitlList
      .map((item) => {
        const isDemo = Boolean(item.simulationOnly);
        const isSae = Boolean(item.isSaeEmergency && !isDemo);
        const isPending = item.status === 'PENDIENTE_REVISION_HUMANA';
        const isApproved = item.status === 'APROBADO_POR_SUPERVISOR_HUMANO';
        const isRejected = item.status === 'RECHAZADO_POR_SUPERVISOR_HUMANO';

        return `
        <div class="agent-card ${isSae ? 'sae-hitl-card' : ''} ${isApproved ? 'hitl-card-approved' : ''}">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.4rem; margin-bottom:0.4rem;">
            <div style="display:flex; align-items:center; gap:0.45rem; flex-wrap:wrap;">
              <span class="severity-pill ${isSae ? 'sev-EXTREMA' : 'sev-TEMPRANA'}">
                ${isDemo ? '🧪 Simulación #' + item.id : isSae ? '🚨 EMERGENCIA SAE #' + item.id : '👤 Escalamiento HITL #' + item.id}
              </span>
              ${
                isDemo
                  ? '<span class="epistemic-badge badge-estimacion">Solo demostración · sin envío</span>'
                  : isSae
                  ? '<span class="sae-badge" style="font-size:0.7rem; padding:0.12rem 0.4rem;">Cell Broadcast</span>'
                  : ''
              }
            </div>
            <span id="hitlStatusBadge-${item.id}" class="epistemic-badge ${
              isApproved && !isDemo
                ? 'badge-observacion'
                : isRejected
                ? 'badge-peligro'
                : 'badge-estimacion'
            }">
              ${isApproved ? (isDemo ? 'Escenario revisado' : '✓ Firmado') : isRejected ? '✕ Rechazado' : '⏳ Pendiente'}
            </span>
          </div>

          <div class="hitl-target-line">
            Destinatario: <strong>${item.targetAudience}</strong>
          </div>

          <p class="condition-summary-banner" style="margin:0.4rem 0; ${isSae ? 'border-left-color:#ef4444;' : ''}">
            ${item.proposedSummary}
            ${(item.citations || [])
              .map(
                (cid) =>
                  `<button type="button" class="citation-chip" data-ev-id="${cid}">[Ref: ${cid}]</button>`
              )
              .join('')}
          </p>

          <!-- Validaciones técnicas colapsables para no saturar la lectura -->
          <details class="hitl-guardrails-details">
            <summary>${isDemo ? 'ℹ️ Guardrails ilustrativos (no ejecutados)' : `🛡️ Validaciones de Guardrails superadas (${(item.guardrailChecks || []).length})`}</summary>
            <ul>
              ${(item.guardrailChecks || []).map((g) => `<li>${isDemo ? '•' : '✓'} ${g.rule}</li>`).join('')}
            </ul>
          </details>

          <div class="hitl-action-toolbar">
            ${
              isPending
                ? `
              <button type="button" class="btn btn-primary btn-hitl-action" data-hitl-id="${item.id}" data-decision="APROBADO_POR_SUPERVISOR_HUMANO" style="${
                    isSae ? 'background:#dc2626; border-color:#b91c1c; font-weight:700;' : ''
                  }">
                ✓ ${
                  isSae
                    ? 'Aprobar y Emitir Alarma Acústica SAE'
                    : isDemo ? 'Registrar revisión (sin envío)' : 'Aprobar Boletín (Firma Humana)'
                }
              </button>
              <button type="button" class="btn btn-warning btn-hitl-action" data-hitl-id="${item.id}" data-decision="RECHAZADO_POR_SUPERVISOR_HUMANO">
                ✕ Rechazar / Recálculo
              </button>
            `
                : isApproved
                ? `
              <div class="hitl-approved-banner">
                <span class="badge-approved-icon">✓</span>
                <div class="approved-text-wrap">
                  <strong>${isDemo ? 'Escenario de demostración revisado' : 'Boletín Aprobado con Firma Humana'}</strong>
                  <span class="approved-timestamp">${item.decidedAt ? formatUtcInChileTz(item.decidedAt) : 'Registrado en memoria'}</span>
                </div>
                <button type="button" class="btn btn-sm btn-ghost btn-hitl-action" data-hitl-id="${item.id}" data-decision="PENDIENTE_REVISION_HUMANA" title="Reabrir este boletín para volver a evaluarlo">
                  ↩ Reabrir
                </button>
              </div>
            `
                : `
              <div class="hitl-rejected-banner">
                <span class="badge-rejected-icon">✕</span>
                <div class="approved-text-wrap">
                  <strong>${isDemo ? 'Escenario de demostración rechazado' : 'Boletín Rechazado por Supervisor'}</strong>
                  <span class="approved-timestamp">${isDemo ? 'No se ejecutó ningún recálculo.' : 'Se solicitó recálculo a los modelos'}</span>
                </div>
                <button type="button" class="btn btn-sm btn-ghost btn-hitl-action" data-hitl-id="${item.id}" data-decision="PENDIENTE_REVISION_HUMANA">
                  ↩ Reabrir
                </button>
              </div>
            `
            }
            ${
              isSae && isPending && !isDemo
                ? `
              <button type="button" class="btn btn-sm btn-secondary btn-hitl-preview-alarm" data-hitl-id="${item.id}">
                🔊 Probar Sirena SAE
              </button>
            `
                : ''
            }
          </div>
        </div>
      `;
      })
      .join('');
  }

  if (evidenceBody) {
    const evList = AI_AGENTS_DATA?.evidenceRegistry
      ? Object.values(AI_AGENTS_DATA.evidenceRegistry)
      : [];
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

  document.querySelectorAll('.btn-hitl-preview-alarm').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (isAudioAlarmPlaying()) {
        stopAudioAlarm();
        btn.textContent = '🔊 Probar Sirena SAE';
      } else {
        playSaeAlarm({
          title: 'Prueba Acústica SAE',
          speechText: 'Prueba de transmisión del Sistema de Alerta de Emergencia.',
          durationSec: 5
        });
        btn.textContent = '⏹ Silenciar Sirena';
      }
    });
  });

  document.querySelectorAll('.btn-hitl-action').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const hitlId = btn.getAttribute('data-hitl-id');
      const decision = btn.getAttribute('data-decision');
      const item = AI_AGENTS_DATA.hitlQueue.find((q) => q.id === hitlId);
      if (item) {
        item.status = decision;
        saveHitlDecision(hitlId, decision);
        renderAgentsSection();

        if (decision === 'APROBADO_POR_SUPERVISOR_HUMANO' && !item.simulationOnly) {
          if (item.isSaeEmergency) {
            playSaeAlarm({
              title: '🚨 EMERGENCIA SAE VALIDADA',
              speechText:
                'Atención: Emergencia validada por supervisión meteorológica. Evacuación preventiva en curso.',
              durationSec: 8
            });
            triggerNativeWebPushNotification({
              title: '🚨 EMERGENCIA SAE VALIDADA (SUPERVISIÓN HITL)',
              body: item.proposedSummary.replace(/\[Ref:\s*[^\]]+\]/g, '').slice(0, 160) + '...',
              tag: `hitl-sae-${item.id}`
            });
          } else {
            triggerNativeWebPushNotification({
              title: '🛡️ FloodChile · Boletín Supervisado Aprobado (HITL)',
              body: item.proposedSummary.replace(/\[Ref:\s*[^\]]+\]/g, '').slice(0, 150) + '...',
              tag: `hitl-approved-${item.id}`
            });
          }
        }

        if (item.simulationOnly) return;

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

async function refreshIngestionHealth(force = false) {
  if (!force && Date.now() - STATE.ingestionHealthCheckedAt < 30000) return;
  STATE.ingestionHealthCheckedAt = Date.now();
  try {
    const response = await fetch('/api/ingestion/status');
    if (!response.ok) return;
    const result = await response.json();
    STATE.ingestionHealth = result.sources || [];
    renderSourcesAndCriteriaSection(false);
    renderAgentsSection();
  } catch {
    STATE.ingestionHealth = [];
  }
}

function renderSourcesAndCriteriaSection(checkHealth = true) {
  const tbody = document.getElementById('sourcesTableBody');
  const criteriaBox = document.getElementById('acceptanceCriteriaContainer');
  const anyOpenMeteoSynced = CHILE_LOCATIONS.some((l) => l.observation.isLiveSynced);

  if (tbody) {
    tbody.innerHTML = DATA_SOURCES.map((s) => {
      const isStaleSimulated =
        STATE.staleSimulationActive && (s.id === 'dmc-meteochile' || s.id === 'senapred-chile');

      let modeBadgeHtml = '';
      const health = STATE.ingestionHealth.find((item) => item.sourceId === s.id);
      if (s.id === 'dmc-meteochile' || s.id === 'conaf-incendios') {
        modeBadgeHtml = health?.status === 'NOT_CONFIGURED'
          ? `<span class="epistemic-badge badge-pronostico">Credenciales DMC requeridas</span>`
          : health?.status === 'ONLINE'
          ? `<span class="epistemic-badge badge-observacion">● Fuente consultada</span>`
          : health?.status === 'REVIEW'
            ? `<span class="epistemic-badge badge-estimacion">⚠ Respuesta requiere QC</span>`
            : health?.status === 'PARTIAL'
              ? `<span class="epistemic-badge badge-pronostico">◐ Respuesta parcial</span>`
              : health?.status === 'STALE'
                ? `<span class="epistemic-badge badge-estimacion">⚠ Observación desactualizada</span>`
              : health?.status === 'ERROR'
              ? `<span class="epistemic-badge badge-estimacion">⚠ Fuente no disponible</span>`
              : `<span class="epistemic-badge badge-pronostico">Conector · esperando consulta</span>`;
      } else if (isStaleSimulated) {
        modeBadgeHtml = `<span class="epistemic-badge badge-alerta-oficial">⚠ Simulación Vencida</span>`;
      } else if (
        s.id === 'openmeteo-multi' ||
        s.id === 'dga-glofas' ||
        s.id === 'shoa-marine'
      ) {
        modeBadgeHtml = anyOpenMeteoSynced
          ? `<span class="epistemic-badge badge-observacion">● En Vivo (API)</span>`
          : `<span class="epistemic-badge badge-pronostico">↻ En Vivo</span>`;
      } else if (s.id === 'noaa-goes16-gibs') {
        modeBadgeHtml = STATE.rainViewerMeta?.ok
          ? `<span class="epistemic-badge badge-observacion">● RainViewer + GOES</span>`
          : `<span class="epistemic-badge badge-estimacion">🧪 Muestra + RainViewer</span>`;
      } else {
        modeBadgeHtml = `<span class="epistemic-badge badge-estimacion">🧪 Muestra</span>`;
      }

      return `
        <tr>
          <td>
            <strong>${s.shortName || s.name}</strong>
            <div style="font-size:0.72rem; color:var(--text-muted);">${s.name}</div>
          </td>
          <td>
            <div style="font-size:0.8rem; line-height:1.35; margin-bottom:0.25rem;">${s.role}</div>
            ${modeBadgeHtml}
          </td>
          <td style="white-space:nowrap;">
            <div style="font-weight:700; font-size:0.8rem;">Cada ${s.updateFrequencyMinutes} min</div>
            <div style="font-size:0.72rem; color:var(--text-muted);">TTL: ${s.ttlMinutes} min</div>
          </td>
          <td style="font-size:0.76rem; color:var(--text-secondary); max-width:240px; line-height:1.3;">
            ${s.accessNotes}
          </td>
          <td>
            <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="quick-link-pill">
              Portal ↗
            </a>
          </td>
        </tr>
      `;
    }).join('');
  }

  if (criteriaBox) {
    const criteria = [
      { code: 'CA-01', title: 'Separación estricta', desc: 'Etiquetas para Observación, Pronóstico, Estimación y Alerta Oficial.' },
      { code: 'CA-02', title: 'Consistencia de escenarios', desc: 'Pronóstico base y escenario superior de muestra se mantienen ordenados; no se presentan como percentiles.' },
      { code: 'CA-03', title: 'Verificación histórica', desc: 'Predicho vs Observado con MAE y cobertura de banda.' },
      { code: 'CA-04', title: 'Metadatos y hora local', desc: 'Procedencia, enlaces directos y hora de Chile (UTC-3/UTC-5).' },
      { code: 'CA-05', title: 'Detección de fuente vencida', desc: 'Aviso visual explícito al superar TTL (>45 min).' },
      { code: 'CA-06', title: 'Accesibilidad universal', desc: 'Iconos geométricos, alto contraste y escala de grises.' },
      { code: 'CA-07', title: 'Multi-dispositivo', desc: 'Vistas adaptadas a Ciudadanía y Monitoreo Técnico.' },
      { code: 'CA-08', title: 'Citas de agentes IA', desc: 'Trazabilidad 100% mediante chips clicables [Ref: EV-*].' },
      { code: 'CA-09', title: 'Guardrails y HITL', desc: 'Bloqueo estricto de emisión hasta firma humana.' }
    ];

    criteriaBox.innerHTML = `
      <div class="criteria-cards-grid">
        ${criteria
          .map(
            (c) => `
          <div class="criterion-mini-card">
            <span class="criterion-tag">✓ ${c.code}</span>
            <div class="criterion-title">${c.title}</div>
            <div class="criterion-desc">${c.desc}</div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }
  if (checkHealth) refreshIngestionHealth();
}

function refreshAllViews() {
  try { populateLocationSelectors(); } catch (e) { console.error('Error populateLocationSelectors:', e); }
  try { updateClockAndHeaderStatus(); } catch (e) { console.error('Error updateClockAndHeaderStatus:', e); }
  try { renderMapAndDetailView(); } catch (e) { console.error('Error renderMapAndDetailView:', e); }
  try { renderSatelliteSection(); } catch (e) { console.error('Error renderSatelliteSection:', e); }
  try { renderForecast7dAndNationalSection(); } catch (e) { console.error('Error renderForecast7dAndNationalSection:', e); }
  try { renderRainfallSection(); } catch (e) { console.error('Error renderRainfallSection:', e); }
  try { renderAlertsSection(); } catch (e) { console.error('Error renderAlertsSection:', e); }
  try { loadAndRenderNotifications(); } catch (e) { console.error('Error loadAndRenderNotifications:', e); }
  try { renderScenariosSection(); } catch (e) { console.error('Error renderScenariosSection:', e); }
  try { renderPredictiveAndVerificationSection(); } catch (e) { console.error('Error renderPredictiveAndVerificationSection:', e); }
  try { renderAgentsSection(); } catch (e) { console.error('Error renderAgentsSection:', e); }
  try { renderSourcesAndCriteriaSection(); } catch (e) { console.error('Error renderSourcesAndCriteriaSection:', e); }
  try { syncUrlState(); } catch (e) { console.error('Error syncUrlState:', e); }
}

function setupEventListeners() {
  document.getElementById('btnRunSourceAudit')?.addEventListener('click', async () => {
    await refreshIngestionHealth(true);
    const liveLocations = CHILE_LOCATIONS.filter(
      (location) => location.observation.isLiveSynced && location.observation.sourceId === 'openmeteo-multi'
    );
    const lastSuccessAt = liveLocations
      .map((location) => location.observation.observedAtUtc)
      .filter(Boolean)
      .sort()
      .at(-1) || null;
    STATE.sourceAuditReport = auditSourceCatalog(DATA_SOURCES, {
      openMeteo: {
        syncedLocationCount: liveLocations.length,
        totalLocationCount: CHILE_LOCATIONS.length,
        lastSuccessAtUtc: lastSuccessAt
      },
      ingestion: STATE.ingestionHealth.map((source) => ({
        ...source,
        name: DATA_SOURCES.find((item) => item.id === source.sourceId)?.shortName || source.sourceId,
        ttlMinutes: DATA_SOURCES.find((item) => item.id === source.sourceId)?.ttlMinutes || 60
      }))
    });
    renderSourceAuditReport();
  });

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

  // Control de apertura/cierre del Menú Lateral (Desktop Collapse + Mobile Drawer)
  const appShell = document.querySelector('.app-shell');
  const sidebar = document.getElementById('appSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const btnSidebarToggle = document.getElementById('btnSidebarToggle');

  const updateSidebarAriaAndState = () => {
    const isMobile = window.innerWidth <= 1024;
    if (isMobile) {
      const isOpen = sidebar?.classList.contains('sidebar-open');
      btnSidebarToggle?.setAttribute('aria-expanded', String(isOpen));
      btnSidebarToggle?.setAttribute('title', isOpen ? 'Cerrar menú lateral' : 'Abrir menú lateral');
      if (sidebarBackdrop) {
        sidebarBackdrop.classList.toggle('active', Boolean(isOpen));
      }
    } else {
      const isCollapsed = appShell?.classList.contains('sidebar-collapsed');
      btnSidebarToggle?.setAttribute('aria-expanded', String(!isCollapsed));
      btnSidebarToggle?.setAttribute(
        'title',
        isCollapsed ? 'Expandir menú lateral (Atajo: [ )' : 'Colapsar menú lateral (Atajo: [ )'
      );
      if (sidebarBackdrop) {
        sidebarBackdrop.classList.remove('active');
      }
    }
  };

  if (btnSidebarToggle && sidebar) {
    btnSidebarToggle.addEventListener('click', () => {
      const isMobile = window.innerWidth <= 1024;
      if (isMobile) {
        sidebar.classList.toggle('sidebar-open');
      } else {
        appShell?.classList.toggle('sidebar-collapsed');
        try {
          const isCollapsed = appShell?.classList.contains('sidebar-collapsed');
          localStorage.setItem('climasflood_sidebar_collapsed', isCollapsed ? 'true' : 'false');
        } catch {
          // ignore storage error
        }
      }
      updateSidebarAriaAndState();
    });
  }

  // Atajo de teclado: tecla '[' para colapsar/expandir el sidebar
  window.addEventListener('keydown', (e) => {
    if (
      e.key === '[' &&
      !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)
    ) {
      e.preventDefault();
      btnSidebarToggle?.click();
    }
  });

  if (sidebarBackdrop && sidebar) {
    sidebarBackdrop.addEventListener('click', () => {
      sidebar.classList.remove('sidebar-open');
      updateSidebarAriaAndState();
    });
  }

  // En móvil/tablet, al hacer clic en cualquier opción del sidebar, cerrar el drawer automáticamente
  document.querySelectorAll('.sidebar-nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 1024 && sidebar?.classList.contains('sidebar-open')) {
        sidebar.classList.remove('sidebar-open');
        updateSidebarAriaAndState();
      }
    });
  });

  // Restaurar estado colapsado guardado en desktop
  try {
    if (window.innerWidth > 1024 && localStorage.getItem('climasflood_sidebar_collapsed') === 'true') {
      appShell?.classList.add('sidebar-collapsed');
    }
  } catch {
    // ignore
  }
  updateSidebarAriaAndState();
  window.addEventListener('resize', updateSidebarAriaAndState);

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
      const forecast48hMm = loc.daily7d.slice(0, 2).reduce((sum, day) => sum + day.precipForecastMm, 0);
      const banner = document.getElementById('staleWarningBanner');
      const text = document.getElementById('staleWarningText');
      if (banner && text) {
        banner.classList.remove('hidden');
        text.innerHTML = `🔔 <strong>Notificación Web Push de prueba para ${loc.name}:</strong> Nivel ${loc.summaryRisk} — ${loc.keyPhenomenon} (pronóstico base 48 h: ${forecast48hMm.toFixed(1)} mm).`;
      }

      await triggerNativeWebPushNotification({
        title: `FloodChile · Alerta: ${loc.name}`,
        body: `Escenario de demostración: nivel ${loc.summaryRisk} (${loc.keyPhenomenon}). Pronóstico base de lluvia 48 h: ${forecast48hMm.toFixed(1)} mm · Isoterma 0 °C: ${loc.freezingLevelM} m.`,
        tag: `push-commune-${loc.id}`
      });

      // Disparar audio audible de notificación
      playSaeAlarm({
        title: `Alerta: ${loc.name}`,
        speechText: `Aviso meteorológico para ${loc.name}.`,
        durationSec: 2.5
      });
    });
  }

  const btnLiveSync = document.getElementById('btnLiveSync');
  if (btnLiveSync) {
    btnLiveSync.addEventListener('click', () => syncAllLocationsLive());
  }

  const btnRefreshSenapred = document.getElementById('btnRefreshSenapredAlerts');
  if (btnRefreshSenapred) {
    btnRefreshSenapred.addEventListener('click', async () => {
      btnRefreshSenapred.disabled = true;
      btnRefreshSenapred.textContent = '⏳ Sincronizando...';
      await loadLiveSenapredAlerts(true);
      renderAlertsSection();
      btnRefreshSenapred.disabled = false;
      btnRefreshSenapred.textContent = '🔄 Sincronizar Alertas Ahora';
    });
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
  window.addEventListener('load', () => {
    if (STATE.activeTabId === 'tab-mapa') {
      renderMapAndDetailView();
      mapControllerSingleton.leafletMap?.invalidateSize();
    }
  }, { once: true });
  setInterval(updateClockAndHeaderStatus, 30000);
  // Datos reales por defecto: sincroniza automáticamente al abrir y cada 30 min.
  syncAllLocationsLive();
  setInterval(syncAllLocationsLive, 30 * 60 * 1000);

  // Ingesta oficial en vivo SENAPRED / DMC / SAE
  loadLiveSenapredAlerts().then(() => {
    renderAlertsSection();
    renderAgentsSection();
  });
  setInterval(() => {
    loadLiveSenapredAlerts(true).then(() => {
      renderAlertsSection();
      renderAgentsSection();
    });
  }, 10 * 60 * 1000);

  // Registro de Service Worker PWA para resiliencia offline durante temporales
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
});
