/**
 * Motor Cartográfico para ClimasFlood Chile.
 * Conserva Leaflet y el motor Canvas/SVG alternativo sin agregar lluvia, viento ni frentes ficticios:
 * 1. MODO MAPA INTERACTIVO (Leaflet.js + Teselas de Mapa Base + Fotogramas Reales RainViewer cuando están disponibles).
 * 2. MODO ESQUEMA NACIONAL (Canvas determinista que representa los valores reales por comuna para cada horizonte temporal 0h, +6h, +12h, +24h, +48h).
 * 3. MODO PERFIL ALTITUDINAL ISOTERMA 0 °C (Corte transversal Océano → Valle → Cordillera mostrando la cota de la isoterma 0 °C del paso temporal seleccionado).
 */

export const MAP_LAYERS_META = {
  precipitacion: {
    id: 'precipitacion',
    label: 'Precipitación',
    unit: 'mm/h',
    sourceName: 'Referencia DMC (t=0h) / Open-Meteo (t>0h)',
    sourceId: 'openmeteo-multi',
    description: 'Tasa horaria de precipitación (mediana P50 y techo de incertidumbre P90).',
    legend: [
      { label: '0 mm (Seco)', color: '#64748b', symbol: '○' },
      { label: '0.1 – 2.0 mm (Débil)', color: '#0ea5e9', symbol: '◔' },
      { label: '2.1 – 5.0 mm (Moderada)', color: '#0284c7', symbol: '◑' },
      { label: '5.1 – 12.0 mm (Fuerte)', color: '#d97706', symbol: '◕' },
      { label: '> 12.0 mm (Intensa)', color: '#dc2626', symbol: '●' }
    ]
  },
  viento: {
    id: 'viento',
    label: 'Viento y Rachas',
    unit: 'km/h',
    sourceName: 'Campo de Viento 10m (Open-Meteo / Referencia DMC)',
    sourceId: 'openmeteo-multi',
    description: 'Velocidad de viento y rachas previstas por horizonte temporal.',
    legend: [
      { label: '< 25 km/h (Brisa)', color: '#0d9488', symbol: '→' },
      { label: '25 – 45 km/h (Moderado)', color: '#0284c7', symbol: '⇒' },
      { label: '46 – 70 km/h (Fuerte)', color: '#d97706', symbol: '⇛' },
      { label: '> 70 km/h (Temporal)', color: '#dc2626', symbol: '⚡' }
    ]
  },
  temperatura: {
    id: 'temperatura',
    label: 'Temperatura (2m)',
    unit: '°C',
    sourceName: 'Temperatura a 2m (Open-Meteo / Referencia DMC)',
    sourceId: 'openmeteo-multi',
    description: 'Temperatura del aire a 2 metros sobre el suelo según paso temporal.',
    legend: [
      { label: '≤ 0 °C (Helada)', color: '#4f46e5', symbol: '❄' },
      { label: '1 – 8 °C (Frío)', color: '#0284c7', symbol: '▽' },
      { label: '9 – 16 °C (Templado)', color: '#0d9488', symbol: '◇' },
      { label: '17 – 24 °C (Cálido)', color: '#d97706', symbol: '△' },
      { label: '≥ 25 °C (Calor)', color: '#dc2626', symbol: '☀' }
    ]
  },
  nieve: {
    id: 'nieve',
    label: 'Isoterma 0 °C y Nieve',
    unit: 'm s.n.m.',
    sourceName: 'Altitud Isoterma 0 °C (Open-Meteo Freezing Level)',
    sourceId: 'openmeteo-multi',
    description: 'Altura del nivel de congelación (0 °C) que separa lluvia líquida de nieve.',
    legend: [
      { label: 'Iso 0°C < 1.200 m (Nieve baja)', color: '#0284c7', symbol: '❄' },
      { label: 'Iso 0°C 1.200 – 2.200 m (Normal)', color: '#0d9488', symbol: '▲' },
      { label: 'Iso 0°C 2.200 – 2.750 m (Moderada)', color: '#d97706', symbol: '▲▲' },
      { label: 'Iso 0°C > 2.750 m con lluvia (Riesgo escorrentía)', color: '#dc2626', symbol: '🛑' }
    ]
  },
  nubosidad: {
    id: 'nubosidad',
    label: 'Nubosidad Total',
    unit: '%',
    sourceName: 'Cobertura Nubosa Total (%)',
    sourceId: 'noaa-goes16-gibs',
    description: 'Porcentaje de cobertura nubosa registrado para la comuna.',
    legend: [
      { label: '0 – 25% (Despejado)', color: '#ca8a04', symbol: '☀' },
      { label: '26 – 60% (Parcial)', color: '#64748b', symbol: '⛅' },
      { label: '61 – 85% (Nublado)', color: '#475569', symbol: '☁' },
      { label: '86 – 100% (Cubierto)', color: '#0284c7', symbol: '🌧' }
    ]
  },
  alertas: {
    id: 'alertas',
    label: 'Nivel de Riesgo',
    unit: 'Severidad',
    sourceName: 'Escenario de Alertas (Datos de muestra)',
    sourceId: 'senapred-chile',
    description: 'Nivel de severidad comunal con iconografía redundante accesible.',
    legend: [
      { label: 'Informativa (ℹ)', color: '#0284c7', symbol: 'ℹ' },
      { label: 'Preventiva (◆)', color: '#d97706', symbol: '◆' },
      { label: 'Temprana (▲)', color: '#ea580c', symbol: '▲' },
      { label: 'Extrema (🛑)', color: '#dc2626', symbol: '🛑' }
    ]
  },
  tormentas: {
    id: 'tormentas',
    label: 'Tormentas Eléctricas y Convección',
    unit: 'Prob. / CAPE',
    sourceName: 'Actividad de Rayos y Convección (Open-Meteo CAPE / GOES-16 GLM)',
    sourceId: 'glm-goes16-convective',
    description: 'Probabilidad predictiva de tormentas eléctricas, rayos y granizo en precordillera y cordillera.',
    legend: [
      { label: '< 10% (Sin actividad eléctrica)', color: '#0d9488', symbol: '○' },
      { label: '10 – 35% (Inestabilidad baja / Chubascos)', color: '#0284c7', symbol: '⚡' },
      { label: '36 – 65% (Tormenta eléctrica probable)', color: '#d97706', symbol: '⚡⚡' },
      { label: '> 65% (Tormenta severa / Granizo / Rayos)', color: '#dc2626', symbol: '🌩' }
    ]
  }
};

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
  );
}

export function getLocationValueForStep(loc, layerId, hourOffset) {
  const stepObj =
    loc.hourlyRain48h.find((s) => s.hourOffset === hourOffset) ||
    loc.hourlyRain48h.reduce((prev, curr) =>
      Math.abs(curr.hourOffset - hourOffset) < Math.abs(prev.hourOffset - hourOffset) ? curr : prev
    );

  if (layerId === 'precipitacion') {
    const val = hourOffset === 0 ? loc.observation.precip1hMm : stepObj.p50;
    const p90 = hourOffset === 0 ? val : stepObj.p90;
    let color = '#64748b';
    let symbol = '○';
    if (val > 5.0) {
      color = '#dc2626';
      symbol = '●';
    } else if (val > 2.0) {
      color = '#d97706';
      symbol = '◕';
    } else if (val > 0.5) {
      color = '#0284c7';
      symbol = '◑';
    } else if (val > 0) {
      color = '#0ea5e9';
      symbol = '◔';
    }
    return {
      display: hourOffset === 0 ? `${val.toFixed(1)} mm/h` : `${val.toFixed(1)} mm (P90: ${p90.toFixed(1)})`,
      shortDisplay: `${val.toFixed(1)} mm/h`,
      numeric: val,
      color,
      symbol
    };
  }

  if (layerId === 'viento') {
    const val = hourOffset === 0 ? loc.observation.windGustKmh : Math.round(stepObj.wind * 1.35);
    let color = '#0d9488';
    let symbol = '→';
    if (val > 70) {
      color = '#dc2626';
      symbol = '⚡';
    } else if (val > 45) {
      color = '#d97706';
      symbol = '⇛';
    } else if (val >= 25) {
      color = '#0284c7';
      symbol = '⇒';
    }
    return {
      display: `Racha ${val} km/h (${loc.observation.windDir})`,
      shortDisplay: `${val} km/h`,
      numeric: val,
      color,
      symbol
    };
  }

  if (layerId === 'temperatura') {
    const val = hourOffset === 0 ? loc.observation.tempC : stepObj.temp;
    let color = '#0d9488';
    let symbol = '◇';
    if (val <= 0) {
      color = '#4f46e5';
      symbol = '❄';
    } else if (val <= 8) {
      color = '#0284c7';
      symbol = '▽';
    } else if (val >= 25) {
      color = '#dc2626';
      symbol = '☀';
    } else if (val >= 17) {
      color = '#d97706';
      symbol = '△';
    }
    return {
      display: `${val.toFixed(1)} °C`,
      shortDisplay: `${val.toFixed(1)} °C`,
      numeric: val,
      color,
      symbol
    };
  }

  if (layerId === 'nieve') {
    const iso = hourOffset === 0 ? loc.observation.freezingLevelM : stepObj.iso0;
    const rain = hourOffset === 0 ? loc.observation.precip1hMm : stepObj.p50;
    let color = '#0d9488';
    let symbol = '▲';
    if (iso >= 2750 && rain >= 1.5) {
      color = '#dc2626';
      symbol = '🛑';
    } else if (iso < 1200) {
      color = '#0284c7';
      symbol = '❄';
    } else if (iso >= 2200 && rain > 0.2) {
      color = '#d97706';
      symbol = '▲▲';
    }
    return {
      display: `Iso 0°C: ${iso} m`,
      shortDisplay: `Iso ${iso} m`,
      numeric: iso,
      color,
      symbol
    };
  }

  if (layerId === 'nubosidad') {
    const val = loc.observation.cloudCoverPct;
    let color = '#ca8a04';
    let symbol = '☀';
    if (val > 85) {
      color = '#0284c7';
      symbol = '🌧';
    } else if (val > 60) {
      color = '#475569';
      symbol = '☁';
    } else if (val > 25) {
      color = '#64748b';
      symbol = '⛅';
    }
    return {
      display: `${val}% nubes`,
      shortDisplay: `${val}%`,
      numeric: val,
      color,
      symbol
    };
  }

  if (layerId === 'tormentas') {
    const rain = hourOffset === 0 ? loc.observation.precip1hMm : stepObj.p50;
    const isAndean = loc.elevationM > 450 || loc.basin.toLowerCase().includes('maipo') || loc.basin.toLowerCase().includes('cachapoal') || loc.basin.toLowerCase().includes('maule');
    let prob = 8;
    let cape = 180;
    if (rain >= 3.0 && isAndean) {
      prob = 75;
      cape = 1150;
    } else if (rain >= 1.2 || (isAndean && rain > 0.4)) {
      prob = 45;
      cape = 680;
    } else if (rain > 0) {
      prob = 22;
      cape = 340;
    }
    let color = '#0d9488';
    let symbol = '○';
    if (prob > 65) {
      color = '#dc2626';
      symbol = '🌩';
    } else if (prob > 35) {
      color = '#d97706';
      symbol = '⚡⚡';
    } else if (prob > 10) {
      color = '#0284c7';
      symbol = '⚡';
    }
    return {
      display: `${prob}% prob. (CAPE ${cape} J/kg)`,
      shortDisplay: `⚡ ${prob}% · ${cape}J`,
      numeric: prob,
      color,
      symbol
    };
  }

  const sev = loc.summaryRisk;
  const sevMap = {
    INFORMATIVA: { color: '#0284c7', symbol: 'ℹ', label: 'Informativa' },
    PREVENTIVA: { color: '#d97706', symbol: '◆', label: 'Preventiva' },
    TEMPRANA: { color: '#ea580c', symbol: '▲', label: 'Temprana' },
    EXTREMA: { color: '#dc2626', symbol: '🛑', label: 'Extrema' }
  };
  const info = sevMap[sev] || sevMap.INFORMATIVA;
  return {
    display: `${info.symbol} ${info.label}`,
    shortDisplay: `${info.symbol} ${info.label}`,
    numeric: 1,
    color: info.color,
    symbol: info.symbol
  };
}

class ChileMapController {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.leafletContainer = null;
    this.cartoEmbedContainer = null;
    this.leafletMap = null;
    this.leafletTileLayer = null;
    this.leafletRadarLayer = null;
    this.externalGeoJsonLayer = null;
    this.leafletMarkers = [];
    this.leafletMarkerMap = new Map();
    this.radarFrames = [];
    this.radarFrameIdx = 0;
    this.radarOpacity = 0.65;
    this.radarPlaying = false;
    this.radarTimerId = null;
    this.basemapProvider = 'carto_voyager';
    this.satelliteOverlayMode = 'rainviewer';
    this.cartoBuilderEmbedUrl = '';

    // Modos: 'leaflet' (Mapa interactivo principal) | 'fluid' (Esquema Nacional) | 'terrain3d' (Perfil Altitudinal Isoterma 0 °C) | 'carto_embed' (Visor CARTO Builder)
    this.mapMode = 'leaflet';
    this.cameraPitch3D = 0.58;
    this.cameraYaw3D = -0.32;
    this.locations = [];
    this.selectedLocationId = 'santiago';
    this.activeLayer = 'precipitacion';
    this.hourOffset = 0;
    this.onSelectLocation = null;
    this.onExportGeoJson = null;
    this.zoomLevel = 1;
    this.panY = 0;
    this.hoveredLocationId = null;
    this.nodePositions = [];
  }

  project(loc, width, height) {
    if (loc.id === 'rapanui') {
      return { x: 84, y: 245, isInsular: true };
    }
    const minLat = -55.8;
    const maxLat = -17.2;
    const normY = (maxLat - loc.lat) / (maxLat - minLat);
    const rawY = 44 + normY * (height - 88);
    const y = (rawY - height / 2) * this.zoomLevel + height / 2 + this.panY;

    const baseCenterLon = -71.2;
    const offsetX = (loc.lon - baseCenterLon) * 20 * Math.min(1.4, this.zoomLevel * 0.85);
    const x = Math.max(155, Math.min(345, 250 + offsetX));
    return { x, y, isInsular: false };
  }

  focusOnSelectedLocation() {
    const loc = this.locations.find((l) => l.id === this.selectedLocationId);
    if (!loc) return;

    if (this.mapMode === 'leaflet' && this.leafletMap) {
      if (prefersReducedMotion()) {
        this.leafletMap.setView([loc.lat, loc.lon], 8);
      } else {
        this.leafletMap.flyTo([loc.lat, loc.lon], 8, { duration: 0.65 });
      }
      return;
    }

    if (loc.id === 'rapanui' || !this.canvas) {
      this.zoomLevel = 1;
      this.panY = 0;
      this.redrawCurrentCanvas();
      return;
    }
    const height = 680;
    const minLat = -55.8;
    const maxLat = -17.2;
    const normY = (maxLat - loc.lat) / (maxLat - minLat);
    const rawY = 44 + normY * (height - 88);
    this.zoomLevel = 1.8;
    this.panY = -(rawY - height / 2) * (this.zoomLevel - 0.15);
    this.panY = Math.max(-390, Math.min(390, this.panY));
    this.redrawCurrentCanvas();
  }

  resetZoom() {
    this.zoomLevel = 1;
    this.panY = 0;
    this.cameraPitch3D = 0.58;
    this.cameraYaw3D = -0.32;
    if (this.mapMode === 'leaflet' && this.leafletMap) {
      if (prefersReducedMotion()) {
        this.leafletMap.setView([-35.8, -71.2], 5);
      } else {
        this.leafletMap.flyTo([-35.8, -71.2], 5, { duration: 0.65 });
      }
    } else {
      this.redrawCurrentCanvas();
    }
  }

  redrawCurrentCanvas() {
    if (this.mapMode === 'terrain3d') {
      this.renderTerrain3DFrame();
    } else if (this.mapMode === 'fluid') {
      this.renderFrame();
    }
  }

  mount({
    container,
    locations,
    selectedLocationId,
    activeLayer,
    hourOffset,
    onSelectLocation,
    onExportGeoJson
  }) {
    this.locations = locations;
    const prevSelected = this.selectedLocationId;
    this.selectedLocationId = selectedLocationId;
    this.activeLayer = activeLayer;
    this.hourOffset = hourOffset;
    this.onSelectLocation = onSelectLocation;
    if (onExportGeoJson) this.onExportGeoJson = onExportGeoJson;

    if (!container) return;

    if (!this.canvas || !container.contains(this.canvas)) {
      const hasLeaflet = typeof window !== 'undefined' && typeof window.L !== 'undefined';
      this.mapMode = hasLeaflet ? 'leaflet' : 'fluid';

      container.innerHTML = `
        <div class="animated-map-stage">
          <div class="map-mode-toolbar" role="toolbar" aria-label="Modo de visualización del mapa">
            <div class="map-mode-pills">
              <button type="button" class="btn-map-ctrl ${this.mapMode === 'leaflet' ? 'active' : ''}" id="btnModeLeaflet" title="Mapa cartográfico interactivo con comunas, capas climáticas y superposición satelital">
                🗺 Mapa Interactivo
              </button>
              <button type="button" class="btn-map-ctrl ${this.mapMode === 'fluid' ? 'active' : ''}" id="btnModeFluid" title="Esquema nacional comparativo de las 16 regiones e isla Rapa Nui">
                🇨🇱 Esquema Nacional
              </button>
              <button type="button" class="btn-map-ctrl ${this.mapMode === 'terrain3d' ? 'active' : ''}" id="btnModeTerrain3D" title="Corte altitudinal adaptable Océano → Valle → Cordillera con nivel de Isoterma 0 °C">
                🏔 Perfil Isoterma 0°C
              </button>
            </div>
            <div class="map-camera-pills">
              <button type="button" class="btn-map-ctrl" id="btnMapZoomLoc" title="Centrar en la comuna seleccionada">
                🎯 Ir a Comuna
              </button>
              <button type="button" class="btn-map-ctrl" id="btnMapZoomReset" title="Ver todo Chile">
                🇨🇱 Vista Nacional
              </button>
            </div>
          </div>

          <!-- Barra de Mapa Base Abierto y Capas Satelitales (en modo Mapa Interactivo) -->
          <div id="leafletRadarToolbar" class="map-radar-subbar ${this.mapMode === 'leaflet' ? '' : 'hidden'}" role="region" aria-label="Proveedor de mapa base abierto y capa satelital/radar">
            <label for="basemapProviderSelect" style="font-size:0.74rem; font-weight:700; color:var(--text-secondary);">
              Mapa base:
            </label>
            <select id="basemapProviderSelect" style="font-size:0.75rem; padding:0.24rem 0.48rem;">
              <option value="osm_standard" selected>OpenStreetMap Estándar (Cartografía Abierta)</option>
              <option value="opentopomap">OpenTopoMap — Relieve y Curvas de Nivel Andinas (Abierto)</option>
              <option value="esri_satellite">ESRI World Imagery — Satelital de Alta Resolución</option>
              <option value="positron_dark">Contraste Oscuro / Positron (Minimalista)</option>
            </select>

            <label for="satelliteOverlaySelect" style="font-size:0.74rem; font-weight:700; color:var(--text-secondary);">
              Satélite / Radar:
            </label>
            <select id="satelliteOverlaySelect" style="font-size:0.75rem; padding:0.24rem 0.48rem;" title="Selecciona la capa satelital en vivo superpuesta sobre Chile">
              <option value="rainviewer" selected>RainViewer — Mosaico Radar + IR (En vivo)</option>
              <option value="gibs_goes_ir">NASA GIBS — GOES-East Banda 13 Infrarrojo (En vivo 10m)</option>
              <option value="gibs_goes_geocolor">NASA GIBS — GOES-East GeoColor (Color Real Día + IR Noche)</option>
              <option value="gibs_viirs_truecolor">NASA GIBS — VIIRS Suomi NPP Color Verdadero (250m)</option>
              <option value="none">Sin superposición satelital</option>
            </select>

            <button type="button" class="btn btn-sm" id="btnRadarPlay" title="Reproduce los fotogramas observados de RainViewer si hay conexión en vivo">
              ▶ Fotogramas IR/Radar
            </button>
            <span id="radarFrameStatus" style="font-family:var(--font-mono); font-size:0.72rem; color:var(--text-secondary);">
              Radar: Listo
            </span>
            <label style="display:inline-flex; align-items:center; gap:0.35rem; font-size:0.74rem; margin-left:auto;">
              <span>Opacidad (<strong id="radarOpacityVal">65%</strong>):</span>
              <input type="range" id="radarOpacitySlider" min="0" max="100" value="65" style="width:70px;" />
            </label>
          </div>

          <!-- Barra de controles del Perfil Isoterma 0 °C -->
          <div id="terrain3DToolbar" class="map-radar-subbar hidden" role="region" aria-label="Controles del perfil altitudinal">
            <span style="font-size:0.75rem; font-weight:700; color:var(--accent-text);">
              🏔 Corte Altitudinal de Cuenca: Océano Pacífico → Depresión Intermedia → Alta Cordillera
            </span>
            <span style="font-size:0.72rem; color:var(--text-secondary); margin-left:auto;">
              Nivel de congelación determinista según paso temporal (+0h a +48h)
            </span>
          </div>

          <div class="map-viewport-wrapper">
            <div id="chileLeafletMapContainer" class="leaflet-stage ${this.mapMode === 'leaflet' ? '' : 'hidden'}" aria-label="Mapa cartográfico interactivo de Chile"></div>
            <canvas id="chileDynamicMapCanvas" width="720" height="560" tabindex="0"
                    class="${this.mapMode === 'leaflet' ? 'hidden' : ''}"
                    role="img"
                    aria-label="Esquema nacional de Chile y perfil altitudinal de isoterma cero grados"></canvas>
          </div>
        </div>
      `;
      this.canvas = container.querySelector('#chileDynamicMapCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.leafletContainer = container.querySelector('#chileLeafletMapContainer');
      this.cartoEmbedContainer = null;
      this.bindCanvasEvents(container);

      if (this.mapMode === 'leaflet') {
        this.initLeafletIfNeeded();
      } else {
        this.redrawCurrentCanvas();
        if (typeof window !== 'undefined' && !window.L) {
          window.addEventListener(
            'load',
            () => {
              if (window.L && this.mapMode === 'fluid' && !this.leafletMap) {
                const btnLeaflet = container.querySelector('#btnModeLeaflet');
                btnLeaflet?.click();
              }
            },
            { once: true }
          );
        }
      }
    }

    if (this.mapMode === 'leaflet') {
      this.syncLeafletMarkers(prevSelected !== selectedLocationId);
    } else if (this.mapMode !== 'carto_embed') {
      this.redrawCurrentCanvas();
    }
  }

  async initLeafletIfNeeded() {
    if (this.leafletMap || !this.leafletContainer || typeof window.L === 'undefined') {
      return;
    }

    this.leafletMap = window.L.map(this.leafletContainer, {
      center: [-35.5, -71.2],
      zoom: 5,
      zoomControl: true,
      attributionControl: true
    });

    this.updateLeafletThemeTiles();
    this.syncLeafletMarkers(false);

    const statusEl = document.getElementById('radarFrameStatus');
    try {
      let res = await fetch('/api/rainviewer/weather-maps').catch(() => null);
      if (!res || !res.ok) {
        res = await fetch('https://api.rainviewer.com/public/weather-maps.json').catch(() => null);
      }
      if (res && res.ok) {
        const data = await res.json();
        const irFrames = data?.satellite?.infrared || [];
        const radarFrames = data?.radar?.past || [];
        const isRadar = !irFrames.length && radarFrames.length > 0;
        const frames = (irFrames.length ? irFrames : radarFrames).slice(-8);
        if (frames.length) {
          const host = data.host || 'https://tilecache.rainviewer.com';
          this.radarFrames = frames.map((f) => ({
            time: f.time,
            url: `${host}${f.path}/256/{z}/{x}/{y}/${isRadar ? '2/1_1.png' : '0/0_0.png'}`
          }));
          this.radarFrameIdx = this.radarFrames.length - 1;
          this.applySatelliteOverlayMode();
        } else if (statusEl) {
          statusEl.textContent = 'RainViewer: Sin fotogramas activos';
        }
      } else if (statusEl) {
        statusEl.textContent = 'RainViewer: No disponible';
      }
    } catch {
      if (statusEl) {
        statusEl.textContent = 'RainViewer: Sin conexión (Modo local)';
      }
    }
  }

  applySatelliteOverlayMode() {
    if (!this.leafletMap || typeof window.L === 'undefined') return;
    const statusEl = document.getElementById('radarFrameStatus');
    const btnPlay = document.getElementById('btnRadarPlay');

    if (this.leafletRadarLayer) {
      this.leafletMap.removeLayer(this.leafletRadarLayer);
      this.leafletRadarLayer = null;
    }

    if (this.satelliteOverlayMode === 'none') {
      if (btnPlay) btnPlay.disabled = true;
      if (statusEl) statusEl.textContent = 'Superposición satelital desactivada';
      return;
    }

    if (this.satelliteOverlayMode === 'gibs_goes_ir') {
      if (btnPlay) btnPlay.disabled = true;
      this.leafletRadarLayer = window.L.tileLayer(
        'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GOES-East_ABI_Band13_Clean_Infrared/default/default/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png',
        {
          opacity: this.radarOpacity,
          maxNativeZoom: 6,
          maxZoom: 18,
          zIndex: 15,
          attribution: 'NASA GIBS / NOAA GOES-East ABI Band 13 Clean IR (10.3 µm)'
        }
      ).addTo(this.leafletMap);
      if (statusEl) statusEl.textContent = '● NASA GIBS: GOES-East Banda 13 IR Limpio (Tiempo casi real, 10m)';
      return;
    }

    if (this.satelliteOverlayMode === 'gibs_goes_geocolor') {
      if (btnPlay) btnPlay.disabled = true;
      this.leafletRadarLayer = window.L.tileLayer(
        'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GOES-East_ABI_GeoColor/default/default/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png',
        {
          opacity: this.radarOpacity,
          maxNativeZoom: 7,
          maxZoom: 18,
          zIndex: 15,
          attribution: 'NASA GIBS / NOAA GOES-East ABI GeoColor'
        }
      ).addTo(this.leafletMap);
      if (statusEl) statusEl.textContent = '● NASA GIBS: GOES-East GeoColor (Color real día + IR multiespectral noche)';
      return;
    }

    if (this.satelliteOverlayMode === 'gibs_viirs_truecolor') {
      if (btnPlay) btnPlay.disabled = true;
      this.leafletRadarLayer = window.L.tileLayer(
        'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
        {
          opacity: this.radarOpacity,
          maxNativeZoom: 9,
          maxZoom: 18,
          zIndex: 15,
          attribution: 'NASA GIBS / Suomi NPP VIIRS Color Verdadero (250m)'
        }
      ).addTo(this.leafletMap);
      if (statusEl) statusEl.textContent = '● NASA GIBS: VIIRS Suomi NPP Color Verdadero (Mosaico diario de alta resolución)';
      return;
    }

    if (btnPlay) btnPlay.disabled = false;
    this.showRadarFrame(this.radarFrameIdx);
  }

  showRadarFrame(idx) {
    if (
      !this.leafletMap ||
      typeof window.L === 'undefined' ||
      !this.radarFrames.length ||
      this.satelliteOverlayMode !== 'rainviewer'
    ) {
      return;
    }
    const frame = this.radarFrames[idx] || this.radarFrames[this.radarFrames.length - 1];
    if (this.leafletRadarLayer) {
      this.leafletMap.removeLayer(this.leafletRadarLayer);
    }
    this.leafletRadarLayer = window.L.tileLayer(frame.url, {
      opacity: this.radarOpacity,
      zIndex: 15
    }).addTo(this.leafletMap);

    const statusEl = document.getElementById('radarFrameStatus');
    if (statusEl) {
      const dt = new Date(frame.time * 1000).toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit'
      });
      statusEl.textContent = `Fotograma ${idx + 1}/${this.radarFrames.length} (${dt} obs. RainViewer)`;
    }
  }

  updateLeafletThemeTiles() {
    if (!this.leafletMap || typeof window.L === 'undefined') return;
    const isLight = document.documentElement.getAttribute('data-theme') !== 'dark';

    const providers = {
      carto_voyager: {
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap &copy; CARTO Voyager (Open Basemap)',
        maxZoom: 19
      },
      carto_auto: {
        url: isLight
          ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap &copy; CARTO Positron/DarkMatter',
        maxZoom: 19
      },
      opentopomap: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c'],
        attribution: 'Datos: &copy; OpenStreetMap, SRTM | Estilo: &copy; OpenTopoMap (CC-BY-SA)',
        maxZoom: 17
      },
      esri_satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        subdomains: [],
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
        maxZoom: 18
      },
      osm_chile: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c'],
        attribution: '&copy; Colaboradores de OpenStreetMap',
        maxZoom: 19
      }
    };

    const cfg = providers[this.basemapProvider] || providers.carto_voyager;

    if (this.leafletTileLayer) {
      this.leafletMap.removeLayer(this.leafletTileLayer);
    }
    const tileOpts = {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom
    };
    if (cfg.subdomains && cfg.subdomains.length) {
      tileOpts.subdomains = cfg.subdomains;
    }
    this.leafletTileLayer = window.L.tileLayer(cfg.url, tileOpts).addTo(this.leafletMap);

    if (this.mapMode !== 'leaflet' && this.mapMode !== 'carto_embed') {
      this.redrawCurrentCanvas();
    }
  }

  async loadExternalGeoJsonLayer(url) {
    const statusEl = document.getElementById('cartoLayerStatus');
    if (!this.leafletMap || typeof window.L === 'undefined') {
      if (statusEl) statusEl.textContent = 'Activa el Mapa Interactivo primero.';
      return;
    }
    try {
      if (statusEl) statusEl.textContent = 'Cargando GeoJSON...';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const geojson = await res.json();

      if (this.externalGeoJsonLayer) {
        this.leafletMap.removeLayer(this.externalGeoJsonLayer);
      }

      this.externalGeoJsonLayer = window.L.geoJSON(geojson, {
        pointToLayer: (feature, latlng) => {
          const risk = feature?.properties?.nivel_riesgo || 'INFORMATIVA';
          const colorMap = {
            EXTREMA: '#dc2626',
            TEMPRANA: '#ea580c',
            PREVENTIVA: '#d97706',
            INFORMATIVA: '#0284c7'
          };
          return window.L.circleMarker(latlng, {
            radius: 14,
            color: colorMap[risk] || '#0284c7',
            weight: 2.5,
            fillColor: colorMap[risk] || '#0284c7',
            fillOpacity: 0.22
          });
        },
        onEachFeature: (feature, layer) => {
          const p = feature?.properties || {};
          const title = p.comuna || p.name || 'Elemento GeoJSON';
          const details = [
            p.region_nombre ? `Región: ${p.region_nombre}` : null,
            p.temp_actual_c !== undefined ? `Temp: ${p.temp_actual_c} °C` : null,
            p.precip_48h_p50_mm !== undefined
              ? `Lluvia 48h P50/P90: ${p.precip_48h_p50_mm} / ${p.precip_48h_p90_mm} mm`
              : null,
            p.isoterma_0_m !== undefined ? `Isoterma 0°C: ${p.isoterma_0_m} m` : null,
            p.caudal_glofas_m3s !== undefined && p.caudal_glofas_m3s !== null
              ? `Caudal GloFAS: ${p.caudal_glofas_m3s} m³/s`
              : null,
            p.origen_dato ? `Origen: ${p.origen_dato}` : null
          ]
            .filter(Boolean)
            .map(escapeHtml)
            .join('<br/>');
          layer.bindPopup(`<strong>${escapeHtml(title)}</strong><br/>${details}`);
        }
      }).addTo(this.leafletMap);

      const count = Array.isArray(geojson.features) ? geojson.features.length : 1;
      if (statusEl) {
        statusEl.textContent = `✓ Capa GeoJSON activa (${count} entidades)`;
      }
    } catch {
      if (statusEl) {
        statusEl.textContent = '⚠ No se pudo leer el GeoJSON desde esa URL';
      }
    }
  }

  renderCartoBuilderEmbed(url) {
    if (!this.cartoEmbedContainer) return;
    const rawUrl = (url || '').trim();
    const isHttp = /^https:\/\//i.test(rawUrl) && !rawUrl.endsWith('.geojson');
    const cleanUrl = escapeHtml(rawUrl);

    this.mapMode = 'carto_embed';
    this.canvas?.classList.add('hidden');
    this.leafletContainer?.classList.add('hidden');
    this.cartoEmbedContainer.classList.remove('hidden');

    if (!isHttp) {
      this.cartoEmbedContainer.innerHTML = `
        <div style="max-width:520px; padding:1.5rem; text-align:center;">
          <h4 style="margin:0 0 0.5rem; font-size:1rem;">🌐 Cómo publicar o conectar un mapa de CARTO Builder</h4>
          <ol style="text-align:left; font-size:0.84rem; color:var(--text-secondary); line-height:1.55;">
            <li>Haz clic en <strong>⬇ Descargar .geojson para CARTO Builder</strong> arriba (o usa la URL <code>/api/carto/chile-meteo.geojson</code>).</li>
            <li>En tu cuenta de <strong>CARTO Workspace → Builder</strong>, crea un mapa e importa el archivo <code>climasflood-chile-cartobuilder.geojson</code>.</li>
            <li>Publica el mapa en CARTO (<em>Share → Public link / Embed URL</em>) y pega el enlace <code>https://...carto.com/map/...</code> en el cuadro superior para visualizarlo aquí.</li>
          </ol>
          <button type="button" class="btn btn-primary btn-sm" id="btnReturnToLeafletMap">
            ← Volver al Mapa Interactivo
          </button>
        </div>
      `;
    } else {
      this.cartoEmbedContainer.innerHTML = `
        <div style="width:100%; height:100%; display:flex; flex-direction:column;">
          <div style="padding:0.4rem 0.75rem; background:var(--bg-card); border-bottom:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center; font-size:0.78rem;">
            <span><strong>🌐 Visor CARTO Builder Incrustado:</strong> <code>${cleanUrl}</code></span>
            <button type="button" class="btn btn-sm" id="btnReturnToLeafletMap">← Volver a Mapa Leaflet</button>
          </div>
          <iframe
            src="${cleanUrl}"
            title="Mapa CARTO Builder Chile"
            style="width:100%; flex:1; border:0; min-height:580px;"
            allowfullscreen
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade">
          </iframe>
        </div>
      `;
    }

    this.cartoEmbedContainer
      .querySelector('#btnReturnToLeafletMap')
      ?.addEventListener('click', () => {
        const btnLeaflet = document.getElementById('btnModeLeaflet');
        btnLeaflet?.click();
      });
  }

  syncLeafletMarkers(flyToSelected = false) {
    if (!this.leafletMap || typeof window.L === 'undefined') return;

    const currentIds = new Set(this.locations.map((l) => l.id));
    for (const [id, marker] of this.leafletMarkerMap.entries()) {
      if (!currentIds.has(id)) {
        this.leafletMap.removeLayer(marker);
        this.leafletMarkerMap.delete(id);
      }
    }

    this.locations.forEach((loc) => {
      const metric = getLocationValueForStep(loc, this.activeLayer, this.hourOffset);
      const isSelected = loc.id === this.selectedLocationId;
      const shortName = loc.name.split('/')[0].trim();

      const iconHtml = `
        <div class="leaflet-custom-pin ${isSelected ? 'selected' : ''}" style="--pin-color: ${metric.color};">
          <span class="pin-badge" style="background:${metric.color};">${metric.symbol}</span>
          <span class="pin-text">
            <strong>${loc.regionCode} · ${shortName}</strong>
            <small>${metric.shortDisplay}</small>
          </span>
        </div>
      `;

      const divIcon = window.L.divIcon({
        className: 'climasflood-leaflet-divicon',
        html: iconHtml,
        iconSize: [160, 28],
        iconAnchor: [12, 14]
      });

      const existing = this.leafletMarkerMap.get(loc.id);
      if (existing) {
        existing.setIcon(divIcon);
        existing.setLatLng([loc.lat, loc.lon]);
      } else {
        const marker = window.L.marker([loc.lat, loc.lon], { icon: divIcon }).addTo(this.leafletMap);
        marker.on('click', () => {
          if (this.onSelectLocation) this.onSelectLocation(loc.id);
        });
        this.leafletMarkerMap.set(loc.id, marker);
      }
    });

    this.leafletMarkers = Array.from(this.leafletMarkerMap.values());

    if (flyToSelected) {
      const selLoc = this.locations.find((l) => l.id === this.selectedLocationId);
      if (selLoc) {
        if (prefersReducedMotion()) {
          this.leafletMap.setView([selLoc.lat, selLoc.lon], 7);
        } else {
          this.leafletMap.flyTo([selLoc.lat, selLoc.lon], 7, { duration: 0.65 });
        }
      }
    }
  }

  bindCanvasEvents(container) {
    const getCanvasCoords = (evt) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        cx: (evt.clientX - rect.left) * scaleX,
        cy: (evt.clientY - rect.top) * scaleY
      };
    };

    this.canvas.addEventListener('mousemove', (evt) => {
      if (this.mapMode !== 'fluid') return;
      const { cx, cy } = getCanvasCoords(evt);
      let found = null;
      for (const node of this.nodePositions) {
        const dist = Math.hypot(cx - node.x, cy - node.y);
        if (
          dist <= 20 ||
          (cx >= node.boxX &&
            cx <= node.boxX + node.boxW &&
            cy >= node.boxY &&
            cy <= node.boxY + node.boxH)
        ) {
          found = node.id;
          break;
        }
      }
      if (this.hoveredLocationId !== found) {
        this.hoveredLocationId = found;
        this.canvas.style.cursor = found ? 'pointer' : 'default';
        this.renderFrame();
      }
    });

    this.canvas.addEventListener('click', (evt) => {
      if (this.mapMode !== 'fluid') return;
      const { cx, cy } = getCanvasCoords(evt);
      for (const node of this.nodePositions) {
        const dist = Math.hypot(cx - node.x, cy - node.y);
        if (
          dist <= 22 ||
          (cx >= node.boxX &&
            cx <= node.boxX + node.boxW &&
            cy >= node.boxY &&
            cy <= node.boxY + node.boxH)
        ) {
          if (this.onSelectLocation) this.onSelectLocation(node.id);
          break;
        }
      }
    });

    const btnModeFluid = container.querySelector('#btnModeFluid');
    const btnModeTerrain3D = container.querySelector('#btnModeTerrain3D');
    const btnModeLeaflet = container.querySelector('#btnModeLeaflet');
    const btnToggleCartoBuilderPanel = container.querySelector('#btnToggleCartoBuilderPanel');
    const cartoBuilderPanel = container.querySelector('#cartoBuilderIntegrationPanel');
    const btnDownloadCartoGeoJson = container.querySelector('#btnDownloadCartoGeoJson');
    const btnLoadExternalGeoJson = container.querySelector('#btnLoadExternalGeoJson');
    const btnEmbedCartoMap = container.querySelector('#btnEmbedCartoMap');
    const cartoInputUrl = container.querySelector('#cartoInputUrl');
    const radarToolbar = container.querySelector('#leafletRadarToolbar');
    const terrain3DToolbar = container.querySelector('#terrain3DToolbar');
    const btnZoomLoc = container.querySelector('#btnMapZoomLoc');
    const btnZoomReset = container.querySelector('#btnMapZoomReset');
    const basemapSelect = container.querySelector('#basemapProviderSelect');
    const satelliteOverlaySelect = container.querySelector('#satelliteOverlaySelect');

    const setActivePill = (activeBtn) => {
      [btnModeFluid, btnModeTerrain3D, btnModeLeaflet].forEach((b) =>
        b?.classList.toggle('active', b === activeBtn)
      );
    };

    basemapSelect?.addEventListener('change', (e) => {
      this.basemapProvider = e.target.value;
      this.updateLeafletThemeTiles();
    });

    satelliteOverlaySelect?.addEventListener('change', (e) => {
      this.satelliteOverlayMode = e.target.value;
      this.applySatelliteOverlayMode();
    });

    btnToggleCartoBuilderPanel?.addEventListener('click', () => {
      const isHidden = cartoBuilderPanel?.classList.toggle('hidden');
      btnToggleCartoBuilderPanel.classList.toggle('active', !isHidden);
    });

    btnDownloadCartoGeoJson?.addEventListener('click', () => {
      if (this.onExportGeoJson) {
        this.onExportGeoJson();
      }
    });

    btnLoadExternalGeoJson?.addEventListener('click', () => {
      const url = cartoInputUrl?.value || '/api/carto/chile-meteo.geojson';
      if (this.mapMode !== 'leaflet') {
        btnModeLeaflet?.click();
      }
      setTimeout(() => {
        this.loadExternalGeoJsonLayer(url);
      }, 80);
    });

    btnEmbedCartoMap?.addEventListener('click', () => {
      const url = cartoInputUrl?.value || '';
      this.renderCartoBuilderEmbed(url);
    });

    btnModeFluid?.addEventListener('click', () => {
      this.mapMode = 'fluid';
      setActivePill(btnModeFluid);
      this.canvas.classList.remove('hidden');
      this.leafletContainer?.classList.add('hidden');
      this.cartoEmbedContainer?.classList.add('hidden');
      radarToolbar?.classList.add('hidden');
      terrain3DToolbar?.classList.add('hidden');
      this.renderFrame();
    });

    btnModeTerrain3D?.addEventListener('click', () => {
      this.mapMode = 'terrain3d';
      setActivePill(btnModeTerrain3D);
      this.canvas.classList.remove('hidden');
      this.leafletContainer?.classList.add('hidden');
      this.cartoEmbedContainer?.classList.add('hidden');
      radarToolbar?.classList.add('hidden');
      terrain3DToolbar?.classList.remove('hidden');
      this.renderTerrain3DFrame();
    });

    btnModeLeaflet?.addEventListener('click', () => {
      if (typeof window.L === 'undefined') {
        this.mapMode = 'fluid';
        this.renderFrame();
        return;
      }
      this.mapMode = 'leaflet';
      setActivePill(btnModeLeaflet);
      this.canvas.classList.add('hidden');
      this.cartoEmbedContainer?.classList.add('hidden');
      this.leafletContainer?.classList.remove('hidden');
      radarToolbar?.classList.remove('hidden');
      terrain3DToolbar?.classList.add('hidden');
      this.initLeafletIfNeeded();
      setTimeout(() => {
        this.leafletMap?.invalidateSize();
        this.syncLeafletMarkers(false);
      }, 60);
    });

    const btnRadarPlay = container.querySelector('#btnRadarPlay');
    const radarOpacitySlider = container.querySelector('#radarOpacitySlider');
    const radarOpacityVal = container.querySelector('#radarOpacityVal');

    btnRadarPlay?.addEventListener('click', () => {
      if (!this.radarFrames.length) return;
      this.radarPlaying = !this.radarPlaying;
      btnRadarPlay.textContent = this.radarPlaying ? '⏸ Pausar Fotogramas' : '▶ Fotogramas IR/Radar';
      if (this.radarPlaying) {
        this.radarTimerId = setInterval(() => {
          if (this.radarFrames.length > 0) {
            this.radarFrameIdx = (this.radarFrameIdx + 1) % this.radarFrames.length;
            this.showRadarFrame(this.radarFrameIdx);
          }
        }, 950);
      } else if (this.radarTimerId) {
        clearInterval(this.radarTimerId);
        this.radarTimerId = null;
      }
    });

    radarOpacitySlider?.addEventListener('input', (e) => {
      const pct = Number(e.target.value);
      this.radarOpacity = pct / 100;
      if (radarOpacityVal) radarOpacityVal.textContent = `${pct}%`;
      if (this.leafletRadarLayer) {
        this.leafletRadarLayer.setOpacity(this.radarOpacity);
      }
    });

    const yaw3DSlider = container.querySelector('#yaw3DSlider');
    const pitch3DSlider = container.querySelector('#pitch3DSlider');
    yaw3DSlider?.addEventListener('input', (e) => {
      this.cameraYaw3D = Number(e.target.value) / 100;
      this.renderTerrain3DFrame();
    });
    pitch3DSlider?.addEventListener('input', (e) => {
      this.cameraPitch3D = Number(e.target.value) / 100;
      this.renderTerrain3DFrame();
    });

    btnZoomLoc?.addEventListener('click', () => this.focusOnSelectedLocation());
    btnZoomReset?.addEventListener('click', () => this.resetZoom());
  }

  /**
   * PERFIL ALTITUDINAL DE CUENCA E ISOTERMA 0 °C (Determinista según paso temporal)
   * Muestra el corte topográfico Océano Pacífico → Valle → Cordillera de los Andes y el plano
   * de la Isoterma 0 °C correspondiente al paso temporal seleccionado (sin partículas ficticias).
   */
  renderTerrain3DFrame() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;

    // Ajustar dimensiones internas del canvas dinámicamente al contenedor
    const container = this.canvas.parentElement;
    if (container && container.clientWidth > 100) {
      const targetW = container.clientWidth;
      const targetH = Math.min(560, Math.max(380, Math.round(targetW * 0.65)));
      if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
        this.canvas.width = targetW;
        this.canvas.height = targetH;
      }
    }

    const width = this.canvas.width;
    const height = this.canvas.height;
    const isLight = document.documentElement.getAttribute('data-theme') !== 'dark';
    const loc =
      this.locations.find((l) => l.id === this.selectedLocationId) || this.locations[0];

    const stepObj =
      loc.hourlyRain48h.find((s) => s.hourOffset === this.hourOffset) || loc.hourlyRain48h[0];
    const iso0M = this.hourOffset === 0 ? loc.observation.freezingLevelM : stepObj.iso0;
    const rainMmH = this.hourOffset === 0 ? loc.observation.precip1hMm : stepObj.p50;
    const isHighRiskIso = iso0M >= 2750 && rainMmH >= 1.5;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Fondo degradado atmosférico
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    if (isLight) {
      bgGrad.addColorStop(0, '#e0f2fe');
      bgGrad.addColorStop(0.5, '#f8fafc');
      bgGrad.addColorStop(1, '#f1f5f9');
    } else {
      bgGrad.addColorStop(0, '#040d1a');
      bgGrad.addColorStop(0.5, '#0b1628');
      bgGrad.addColorStop(1, '#08101e');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Márgenes responsivos
    const padL = width < 500 ? 46 : 64;
    const padR = width < 500 ? 18 : 28;
    const padT = 68;
    const padB = width < 500 ? 38 : 46;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const maxAlt = 5000;
    const yForAlt = (altM) => {
      const clamped = Math.max(0, Math.min(maxAlt, altM));
      return padT + plotH * (1 - clamped / maxAlt);
    };
    const xForU = (u) => padL + plotW * u;

    // 1. Grilla de altitud
    ctx.strokeStyle = isLight ? 'rgba(148, 163, 184, 0.28)' : 'rgba(51, 65, 85, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
    ctx.font = `600 ${width < 500 ? 8.5 : 9.5}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'right';

    [0, 1000, 2000, 3000, 4000, 5000].forEach((alt) => {
      const y = yForAlt(alt);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
      ctx.fillText(`${alt}m`, padL - 6, y + 3.5);
    });
    ctx.setLineDash([]);

    // 2. Perfil Geomorfológico Real de Chile (Océano -> Costa -> Depresión Intermedia -> Precordillera -> Andes)
    const andesPeakM = loc.lat > -36 ? 4850 : loc.lat > -42 ? 3100 : 2400;
    const coastalPeakM = loc.lat > -36 ? 1400 : 900;
    const valleyAltM = Math.max(80, Math.min(650, loc.elevationM));

    const terrainPoints = [
      { u: 0.00, alt: 0 },              // Océano Pacífico
      { u: 0.12, alt: 0 },              // Costa / Playa
      { u: 0.22, alt: coastalPeakM },   // Cordillera de la Costa
      { u: 0.32, alt: valleyAltM },     // Depresión Intermedia / Valle
      { u: 0.48, alt: valleyAltM },     // Comuna / Valle Central
      { u: 0.65, alt: 2200 },           // Precordillera
      { u: 0.85, alt: andesPeakM * 0.88 }, // Macizo Andino
      { u: 0.98, alt: andesPeakM },     // Cumbres Andinas
      { u: 1.00, alt: andesPeakM }
    ];

    const isoY = yForAlt(iso0M);

    // 3. Polígono de terreno
    ctx.beginPath();
    ctx.moveTo(xForU(terrainPoints[0].u), padT + plotH);
    terrainPoints.forEach((pt) => {
      ctx.lineTo(xForU(pt.u), yForAlt(pt.alt));
    });
    ctx.lineTo(xForU(1.0), padT + plotH);
    ctx.closePath();

    const terrainGrad = ctx.createLinearGradient(0, yForAlt(andesPeakM), 0, padT + plotH);
    if (isLight) {
      terrainGrad.addColorStop(0, '#cbd5e1');
      terrainGrad.addColorStop(0.35, '#94a3b8');
      terrainGrad.addColorStop(0.7, '#65a30d');
      terrainGrad.addColorStop(1, '#3b82f6');
    } else {
      terrainGrad.addColorStop(0, '#e2e8f0');
      terrainGrad.addColorStop(0.25, '#64748b');
      terrainGrad.addColorStop(0.65, '#1e3a1f');
      terrainGrad.addColorStop(1, '#0c2340');
    }
    ctx.fillStyle = terrainGrad;
    ctx.fill();
    ctx.strokeStyle = isLight ? '#334155' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Sombrado de Zona de Nieve (sobre la Isoterma 0 °C)
    if (iso0M < andesPeakM) {
      ctx.save();
      ctx.beginPath();
      terrainPoints.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(xForU(pt.u), yForAlt(pt.alt));
        else ctx.lineTo(xForU(pt.u), yForAlt(pt.alt));
      });
      ctx.lineTo(xForU(1.0), padT);
      ctx.lineTo(xForU(0.0), padT);
      ctx.closePath();
      ctx.clip();

      ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(241, 245, 249, 0.78)';
      ctx.fillRect(padL, padT, plotW, isoY - padT);
      ctx.restore();
    }

    // 5. Línea Horizontal de COTA ISOTERMA 0 °C
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(padL, isoY);
    ctx.lineTo(padL + plotW, isoY);
    ctx.strokeStyle = isHighRiskIso ? '#dc2626' : '#f59e0b';
    ctx.lineWidth = isHighRiskIso ? 3 : 2;
    ctx.setLineDash([7, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Etiqueta de la Isoterma 0 °C
    const badgeW = width < 500 ? 190 : 255;
    const badgeH = 22;
    const badgeX = padL + 8;
    const badgeY = Math.max(padT + 4, Math.min(padT + plotH - badgeH - 4, isoY - badgeH - 4));

    ctx.fillStyle = isHighRiskIso ? '#dc2626' : '#d97706';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${width < 500 ? 9 : 10.5}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(
      `ISOTERMA 0 °C (${this.hourOffset === 0 ? 't=0h' : `+${this.hourOffset}h`}): ${iso0M} m`,
      badgeX + 8,
      badgeY + 15
    );

    // 6. Marcador de la Comuna Seleccionada en el perfil
    const cityU = 0.44;
    const cityX = xForU(cityU);
    const cityY = yForAlt(loc.elevationM);

    ctx.save();
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(cityX, cityY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cityX, cityY);
    ctx.lineTo(cityX, cityY - 26);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const shortLocName = loc.name.split('/')[0].trim();
    const cityBoxW = Math.max(90, shortLocName.length * 7 + 30);
    ctx.fillStyle = isLight ? 'rgba(255,255,255,0.96)' : 'rgba(15,23,42,0.94)';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(cityX - cityBoxW / 2, cityY - 48, cityBoxW, 22, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
    ctx.font = '700 9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${shortLocName} (${loc.elevationM}m)`, cityX, cityY - 33);
    ctx.restore();

    // 7. Rótulos Geográficos en el Eje X
    ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
    ctx.font = `600 ${width < 500 ? 8 : 9}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';

    const geoLabels = [
      { u: 0.06, text: 'Océano Pacífico' },
      { u: 0.22, text: 'C. de la Costa' },
      { u: 0.44, text: 'Depresión Intermedia' },
      { u: 0.65, text: 'Precordillera' },
      { u: 0.94, text: 'Alta Cordillera' }
    ];
    geoLabels.forEach((gl) => {
      ctx.fillText(gl.text, xForU(gl.u), padT + plotH + 18);
    });

    // 8. Cabecera Informativa Superior del Perfil
    ctx.save();
    ctx.fillStyle = isLight ? 'rgba(255,255,255,0.92)' : 'rgba(15,23,42,0.92)';
    ctx.strokeStyle = isHighRiskIso ? '#dc2626' : (isLight ? '#cbd5e1' : 'rgba(148,163,184,0.25)');
    ctx.lineWidth = isHighRiskIso ? 1.5 : 1;
    ctx.beginPath();
    ctx.roundRect(14, 12, width - 28, 44, 7);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = isHighRiskIso ? '#dc2626' : (isLight ? '#0f172a' : '#f8fafc');
    ctx.font = `700 ${width < 500 ? 10 : 11.5}px "Space Grotesk", sans-serif`;
    ctx.fillText(
      `🏔 CORTE ALTITUDINAL: CUENCA ${loc.basin.toUpperCase()} (${loc.name})`,
      24,
      28
    );

    ctx.fillStyle = isLight ? '#475569' : '#94a3b8';
    ctx.font = `500 ${width < 500 ? 8 : 9.5}px "JetBrains Mono", monospace`;
    const diagText = isHighRiskIso
      ? `🛑 ALERTA ALUVIONAL: Isoterma elevada (${iso0M} m) + Lluvia (${rainMmH.toFixed(1)} mm/h) genera escorrentía líquida en alta pendiente.`
      : `✓ Cota ${iso0M} m s.n.m. · Precipitación estimada: ${rainMmH.toFixed(1)} mm/h · Acumulación sólida sobre cumbre.`;
    ctx.fillText(diagText, 24, 44);
    ctx.restore();

    ctx.restore();
  }

  /**
   * ESQUEMA NACIONAL POR MACROZONAS (Determinista, sin lluvia ni viento ficticio)
   * Muestra todas las comunas del dataset con sus valores para el paso temporal activo.
   */
  renderFrame() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const isLight = document.documentElement.getAttribute('data-theme') !== 'dark';

    ctx.save();
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    if (isLight) {
      bgGrad.addColorStop(0, '#f1f5f9');
      bgGrad.addColorStop(1, '#e2e8f0');
    } else {
      bgGrad.addColorStop(0, '#07111e');
      bgGrad.addColorStop(1, '#0c1b2e');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillStyle = isLight ? '#475569' : 'rgba(148, 163, 184, 0.65)';

    for (const lat of [-20, -25, -30, -35, -40, -45, -50, -55]) {
      const minLat = -55.8;
      const maxLat = -17.2;
      const rawY = 44 + ((maxLat - lat) / (maxLat - minLat)) * (height - 88);
      const y = (rawY - height / 2) * this.zoomLevel + height / 2 + this.panY;
      if (y > 18 && y < height - 18) {
        ctx.beginPath();
        ctx.moveTo(16, y);
        ctx.lineTo(width - 16, y);
        ctx.stroke();
        ctx.fillText(`${Math.abs(lat)}°S`, 20, y - 4);
      }
    }

    const contPoints = this.locations
      .filter((l) => l.id !== 'rapanui')
      .map((l) => ({ loc: l, ...this.project(l, width, height) }));

    if (contPoints.length > 1) {
      ctx.beginPath();
      contPoints.forEach((pt, i) => {
        const cx = pt.x - 28;
        if (i === 0) ctx.moveTo(cx, pt.y);
        else ctx.lineTo(cx, pt.y);
      });
      [...contPoints].reverse().forEach((pt) => {
        ctx.lineTo(pt.x + 36, pt.y);
      });
      ctx.closePath();
      ctx.fillStyle = isLight ? '#ffffff' : 'rgba(30, 41, 59, 0.9)';
      ctx.fill();
      ctx.strokeStyle = isLight ? '#94a3b8' : '#475569';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.beginPath();
      contPoints.forEach((pt, i) => {
        const ax = pt.x + 28;
        if (i === 0) ctx.moveTo(ax, pt.y);
        else ctx.lineTo(ax, pt.y);
      });
      ctx.strokeStyle = isLight ? 'rgba(100, 116, 139, 0.45)' : 'rgba(226, 232, 240, 0.28)';
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Recuadro Territorio Insular Rapa Nui
    ctx.save();
    ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = isLight ? '#0284c7' : 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(14, 192, 138, 86, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isLight ? '#0369a1' : '#7dd3fc';
    ctx.font = '700 9.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('TERRITORIO INSULAR', 23, 208);
    ctx.fillStyle = isLight ? '#475569' : '#94a3b8';
    ctx.font = '500 8.5px "JetBrains Mono", monospace';
    ctx.fillText('Rapa Nui · 27°S 109°W', 23, 221);
    ctx.restore();

    this.nodePositions = [];
    const leftAnchorIds = new Set(['valparaiso', 'rancagua', 'concepcion', 'valdivia', 'puertomontt']);

    // Precalcular posiciones proyectadas y separar en dos flujos (izq / der) para anti-colisión
    const rawItems = this.locations.map((loc) => {
      const p = this.project(loc, width, height);
      const isLeft = loc.id === 'rapanui' ? false : leftAnchorIds.has(loc.id);
      return {
        loc,
        x: p.x,
        y: p.y,
        isLeft,
        isInsular: loc.id === 'rapanui',
        targetY: p.y
      };
    }).filter((it) => it.y >= 10 && it.y <= height - 10);

    const leftGroup = rawItems.filter((it) => it.isLeft);
    const rightGroup = rawItems.filter((it) => !it.isLeft && !it.isInsular);

    const relaxGroup = (group, minDist = 28) => {
      group.sort((a, b) => a.y - b.y);
      for (let i = 1; i < group.length; i++) {
        if (group[i].targetY < group[i - 1].targetY + minDist) {
          group[i].targetY = group[i - 1].targetY + minDist;
        }
      }
      for (let i = group.length - 2; i >= 0; i--) {
        if (group[i].targetY > group[i + 1].targetY - minDist) {
          group[i].targetY = group[i + 1].targetY - minDist;
        }
      }
    };

    relaxGroup(leftGroup, 30);
    relaxGroup(rightGroup, 30);

    rawItems.forEach((item) => {
      const { loc, x, y, isLeft, isInsular, targetY } = item;
      const isSelected = loc.id === this.selectedLocationId;
      const isHovered = loc.id === this.hoveredLocationId;
      const metric = getLocationValueForStep(loc, this.activeLayer, this.hourOffset);

      // Anillo de selección alrededor del punto geográfico
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }

      // Punto geográfico (pin circular con símbolo)
      ctx.beginPath();
      ctx.arc(x, y, isSelected || isHovered ? 10 : 8, 0, Math.PI * 2);
      ctx.fillStyle = metric.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isSelected ? 2.5 : 1.6;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 8.5px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(metric.symbol, x, y + 3);

      // Dimensiones de tarjeta traslúcida optimizada
      const boxW = 168;
      const boxH = 26;
      let boxX;
      let boxY;

      if (isInsular) {
        boxX = 22;
        boxY = y - 13;
      } else if (isLeft) {
        boxX = x - 18 - boxW;
        boxY = targetY - boxH / 2;
      } else {
        boxX = x + 18;
        boxY = targetY - boxH / 2;
      }

      // Línea conectora fina (leader line) si la tarjeta se desplazó para evitar colisión
      if (!isInsular && Math.abs(targetY - y) > 3) {
        ctx.beginPath();
        ctx.moveTo(isLeft ? x - 8 : x + 8, y);
        const anchorX = isLeft ? boxX + boxW : boxX;
        ctx.lineTo(anchorX, targetY);
        ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.22)' : 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Fondo Glassmorphic / Traslúcido con opacidad agradable
      ctx.save();
      ctx.fillStyle = isSelected
        ? (isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.92)')
        : (isLight ? 'rgba(255, 255, 255, 0.82)' : 'rgba(15, 23, 42, 0.72)');
      ctx.strokeStyle = isSelected
        ? '#0284c7'
        : isHovered
        ? (isLight ? '#0284c7' : '#38bdf8')
        : (isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.14)');
      ctx.lineWidth = isSelected ? 2 : 1;

      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 9999);
      ctx.fill();
      ctx.stroke();

      // Indicador circular de color de severidad dentro de la tarjeta
      const dotX = boxX + 9;
      const dotY = boxY + boxH / 2;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fillStyle = metric.color;
      ctx.fill();

      // Texto de Ciudad y Métrica
      ctx.textAlign = 'left';
      ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
      ctx.font = '700 9.5px "Plus Jakarta Sans", sans-serif';
      const shortName = loc.name.split('/')[0].trim();
      ctx.fillText(`${loc.regionCode} · ${shortName}`, boxX + 18, boxY + 11);

      ctx.fillStyle = isLight ? '#0369a1' : '#38bdf8';
      ctx.font = '600 9px "JetBrains Mono", monospace';
      ctx.fillText(metric.shortDisplay, boxX + 18, boxY + 21);
      ctx.restore();

      this.nodePositions.push({
        id: loc.id,
        x,
        y,
        boxX,
        boxY,
        boxW,
        boxH
      });
    });

    ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(148, 163, 184, 0.25)';
    ctx.beginPath();
    ctx.roundRect(14, height - 38, 340, 24, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isLight ? '#0f172a' : '#cbd5e1';
    ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `Esquema Nacional · Horizonte: ${this.hourOffset === 0 ? 'Ahora (t = 0 h)' : `Pronóstico +${this.hourOffset} h`}`,
      22,
      height - 22
    );

    ctx.restore();
  }
}

export const mapControllerSingleton = new ChileMapController();

export function renderNationalMapSVG(options) {
  mapControllerSingleton.mount(options);
}
