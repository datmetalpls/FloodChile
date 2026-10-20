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
              <button type="button" class="btn-map-ctrl ${this.mapMode === 'leaflet' ? 'active' : ''}" id="btnModeLeaflet" title="Mapa cartográfico interactivo con comunas, teselas abiertas y superposición RainViewer">
                🗺 Mapa Interactivo
              </button>
              <button type="button" class="btn-map-ctrl ${this.mapMode === 'fluid' ? 'active' : ''}" id="btnModeFluid" title="Esquema nacional comparativo de las 16 regiones e isla Rapa Nui">
                🇨🇱 Esquema Nacional
              </button>
              <button type="button" class="btn-map-ctrl ${this.mapMode === 'terrain3d' ? 'active' : ''}" id="btnModeTerrain3D" title="Corte topográfico Océano → Cordillera con altitud de Isoterma 0 °C">
                🏔 Perfil Isoterma 0°C
              </button>
              <button type="button" class="btn-map-ctrl" id="btnToggleCartoBuilderPanel" title="Exportar GeoJSON o conectar con CARTO Builder">
                🌐 CARTO Builder / GeoJSON
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

          <!-- Barra de Mapa Base Abierto y Fotogramas RainViewer / NASA GIBS (en modo Mapa Interactivo) -->
          <div id="leafletRadarToolbar" class="map-radar-subbar ${this.mapMode === 'leaflet' ? '' : 'hidden'}" role="region" aria-label="Proveedor de mapa base abierto y capa satelital/radar">
            <label for="basemapProviderSelect" style="font-size:0.74rem; font-weight:700; color:var(--text-secondary);">
              Mapa base:
            </label>
            <select id="basemapProviderSelect" style="font-size:0.75rem; padding:0.24rem 0.48rem;">
              <option value="carto_voyager" selected>CARTO Voyager — Vector/Raster Abierto (Recomendado)</option>
              <option value="carto_auto">CARTO Positron / Dark Matter (Automático Claro / Oscuro)</option>
              <option value="opentopomap">OpenTopoMap — Curvas de Nivel y Topografía Andina (Abierto)</option>
              <option value="esri_satellite">ESRI World Imagery — Satélite Abierto Alta Resolución</option>
              <option value="osm_chile">OpenStreetMap Chile — Vial y Urbano (Abierto)</option>
            </select>

            <label for="satelliteOverlaySelect" style="font-size:0.74rem; font-weight:700; color:var(--text-secondary);">
              Satélite real:
            </label>
            <select id="satelliteOverlaySelect" style="font-size:0.75rem; padding:0.24rem 0.48rem;" title="Selecciona la capa satelital en vivo superpuesta sobre Chile">
              <option value="rainviewer" selected>RainViewer — Secuencia IR + Radar (En vivo)</option>
              <option value="gibs_goes_ir">NASA GIBS — GOES-East Banda 13 Infrarrojo (En vivo)</option>
              <option value="gibs_viirs_truecolor">NASA GIBS — VIIRS Color Verdadero (En vivo)</option>
              <option value="none">Sin superposición satelital</option>
            </select>

            <button type="button" class="btn btn-sm" id="btnRadarPlay" title="Reproduce los fotogramas observados de RainViewer si hay conexión en vivo">
              ▶ Fotogramas IR/Radar
            </button>
            <span id="radarFrameStatus" style="font-family:var(--font-mono); font-size:0.72rem; color:var(--text-secondary);">
              RainViewer: Consultando...
            </span>
            <label style="display:inline-flex; align-items:center; gap:0.35rem; font-size:0.74rem; margin-left:auto;">
              <span>Opacidad (<strong id="radarOpacityVal">65%</strong>):</span>
              <input type="range" id="radarOpacitySlider" min="0" max="100" value="65" style="width:70px;" />
            </label>
          </div>

          <!-- Panel de Integración CARTO Builder y Capas GeoJSON Abiertas -->
          <div id="cartoBuilderIntegrationPanel" class="map-radar-subbar hidden" role="region" aria-label="Flujo de trabajo CARTO Builder y GeoJSON abierto" style="flex-direction:column; align-items:stretch; gap:0.55rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
              <div>
                <strong style="font-size:0.8rem; color:var(--text-primary);">🌐 Flujo de Trabajo CARTO Builder &amp; API GeoJSON Abierta (EPSG:4326)</strong>
                <div style="font-size:0.74rem; color:var(--text-secondary);">
                  Exporta las 15 comunas con variables en vivo (Open-Meteo + Caudal GloFAS + Oleaje Marine) hacia <strong>CARTO Builder</strong> o carga una capa GeoJSON externa.
                </div>
              </div>
              <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
                <button type="button" class="btn btn-sm btn-primary" id="btnDownloadCartoGeoJson" title="Descarga archivo .geojson listo para importar en CARTO Builder">
                  ⬇ Descargar .geojson para CARTO Builder
                </button>
                <a href="/api/carto/chile-meteo.geojson" target="_blank" rel="noopener noreferrer" class="btn btn-sm" title="Endpoint GeoJSON abierto servido por ClimasFlood con CORS habilitado">
                  🔗 Endpoint /api/carto/chile-meteo.geojson ↗
                </a>
              </div>
            </div>

            <div style="display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center; padding-top:0.35rem; border-top:1px solid var(--border-subtle);">
              <label for="cartoInputUrl" style="font-size:0.74rem; font-weight:700; color:var(--text-secondary);">
                Conectar URL (GeoJSON o Mapa Público CARTO Builder):
              </label>
              <input
                type="url"
                id="cartoInputUrl"
                placeholder="Ej: /api/carto/chile-meteo.geojson o https://climas.app.carto.com/map/..."
                value="/api/carto/chile-meteo.geojson"
                style="flex:1; min-width:220px; font-size:0.75rem; padding:0.28rem 0.5rem; border-radius:6px; border:1px solid var(--border-strong); background:var(--bg-card); color:var(--text-primary);"
              />
              <button type="button" class="btn btn-sm" id="btnLoadExternalGeoJson" title="Superpone un archivo o endpoint GeoJSON sobre el mapa Leaflet">
                ➕ Superponer Capa GeoJSON
              </button>
              <button type="button" class="btn btn-sm" id="btnEmbedCartoMap" title="Incrusta un mapa público publicado en CARTO Builder (iframe)">
                🖼 Incrustar Mapa CARTO Builder
              </button>
              <span id="cartoLayerStatus" style="font-size:0.72rem; font-family:var(--font-mono); color:var(--accent-text);"></span>
            </div>
          </div>

          <!-- Barra de ángulo de cámara (en modo Perfil Isoterma 0 °C) -->
          <div id="terrain3DToolbar" class="map-radar-subbar hidden" role="region" aria-label="Controles de ángulo del perfil topográfico">
            <span style="font-size:0.75rem; font-weight:700; color:var(--accent-text);">
              🏔 Corte Transversal de Cuenca: Océano Pacífico → Cordillera de los Andes
            </span>
            <label style="display:inline-flex; align-items:center; gap:0.35rem; font-size:0.74rem; margin-left:auto;">
              <span>Rotación:</span>
              <input type="range" id="yaw3DSlider" min="-80" max="80" value="-32" style="width:85px;" />
            </label>
            <label style="display:inline-flex; align-items:center; gap:0.35rem; font-size:0.74rem;">
              <span>Inclinación:</span>
              <input type="range" id="pitch3DSlider" min="25" max="85" value="58" style="width:80px;" />
            </label>
          </div>

          <div class="map-viewport-wrapper">
            <div id="chileLeafletMapContainer" class="leaflet-stage ${this.mapMode === 'leaflet' ? '' : 'hidden'}" aria-label="Mapa cartográfico interactivo de Chile"></div>
            <div id="cartoBuilderEmbedStage" class="leaflet-stage hidden" aria-label="Visor incrustado de CARTO Builder" style="display:flex; flex-direction:column; align-items:center; justify-content:center; background:var(--bg-card-elevated);"></div>
            <canvas id="chileDynamicMapCanvas" width="560" height="680" tabindex="0"
                    class="${this.mapMode === 'leaflet' ? 'hidden' : ''}"
                    role="img"
                    aria-label="Esquema nacional de Chile y perfil altitudinal de isoterma cero grados"></canvas>
          </div>
        </div>
      `;
      this.canvas = container.querySelector('#chileDynamicMapCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.leafletContainer = container.querySelector('#chileLeafletMapContainer');
      this.cartoEmbedContainer = container.querySelector('#cartoBuilderEmbedStage');
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
      const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
      if (res.ok) {
        const data = await res.json();
        const frames = [
          ...(data?.satellite?.infrared || []),
          ...(data?.radar?.past || [])
        ].slice(-6);
        if (frames.length) {
          this.radarFrames = frames.map((f) => ({
            time: f.time,
            url: `${data.host || 'https://tilecache.rainviewer.com'}${f.path}/256/{z}/{x}/{y}/2/1_1.png`
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
          attribution: 'NASA GIBS / NOAA GOES-East ABI Band 13 Clean IR'
        }
      ).addTo(this.leafletMap);
      if (statusEl) statusEl.textContent = '● NASA GIBS: GOES-East Banda 13 IR (Tiempo casi real)';
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
          attribution: 'NASA GIBS / Suomi NPP VIIRS True Color'
        }
      ).addTo(this.leafletMap);
      if (statusEl) statusEl.textContent = '● NASA GIBS: VIIRS Color Verdadero (Mosaico diario)';
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
        iconSize: [148, 36],
        iconAnchor: [16, 18]
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
    const width = this.canvas.width;
    const height = this.canvas.height;
    const isLight = document.documentElement.getAttribute('data-theme') !== 'dark';
    const loc =
      this.locations.find((l) => l.id === this.selectedLocationId) || this.locations[0];

    const stepObj =
      loc.hourlyRain48h.find((s) => s.hourOffset === this.hourOffset) || loc.hourlyRain48h[0];
    const iso0M = this.hourOffset === 0 ? loc.observation.freezingLevelM : stepObj.iso0;
    const rainMmH = this.hourOffset === 0 ? loc.observation.precip1hMm : stepObj.p50;

    ctx.save();
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    if (isLight) {
      bgGrad.addColorStop(0, '#e0f2fe');
      bgGrad.addColorStop(0.6, '#f1f5f9');
      bgGrad.addColorStop(1, '#e2e8f0');
    } else {
      bgGrad.addColorStop(0, '#07101e');
      bgGrad.addColorStop(0.6, '#0d1b2e');
      bgGrad.addColorStop(1, '#091322');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const yaw = this.cameraYaw3D;
    const pitch = this.cameraPitch3D;
    const project3D = (u, v, altM) => {
      const nx = (u - 0.5) * 340;
      const ny = (v - 0.5) * 210;
      const nz = (altM / 5000) * 230;

      const rx = nx * Math.cos(yaw) - ny * Math.sin(yaw);
      const ry = nx * Math.sin(yaw) + ny * Math.cos(yaw);

      const sx = width * 0.5 + rx;
      const sy = height * 0.68 + ry * pitch - nz;
      return { x: sx, y: sy };
    };

    const maxAndesPeak = loc.lat > -38 ? 4650 : 2850;
    const getElevationM = (u, v) => {
      if (u < 0.16) return 0;
      const coastalRange = Math.exp(-Math.pow((u - 0.27) / 0.08, 2)) * 880;
      const centralValley = u > 0.32 && u < 0.55 ? 520 : 0;
      const andesRise =
        u > 0.48
          ? Math.pow((u - 0.48) / 0.52, 1.55) *
            maxAndesPeak *
            (0.88 + 0.16 * Math.sin(v * Math.PI * 3))
          : 0;
      const canyonCut = 1 - 0.22 * Math.exp(-Math.pow((v - 0.5) / 0.18, 2));
      return Math.max(0, (coastalRange + centralValley + andesRise) * canyonCut);
    };

    const cols = 22;
    const rows = 12;
    for (let r = rows - 1; r >= 0; r--) {
      for (let c = 0; c < cols; c++) {
        const u0 = c / cols;
        const u1 = (c + 1) / cols;
        const v0 = r / rows;
        const v1 = (r + 1) / rows;

        const a00 = getElevationM(u0, v0);
        const a10 = getElevationM(u1, v0);
        const a11 = getElevationM(u1, v1);
        const a01 = getElevationM(u0, v1);
        const avgAlt = (a00 + a10 + a11 + a01) * 0.25;

        const p00 = project3D(u0, v0, a00);
        const p10 = project3D(u1, v0, a10);
        const p11 = project3D(u1, v1, a11);
        const p01 = project3D(u0, v1, a01);

        ctx.beginPath();
        ctx.moveTo(p00.x, p00.y);
        ctx.lineTo(p10.x, p10.y);
        ctx.lineTo(p11.x, p11.y);
        ctx.lineTo(p01.x, p01.y);
        ctx.closePath();

        if (u0 < 0.16) {
          ctx.fillStyle = isLight ? 'rgba(2, 132, 199, 0.45)' : 'rgba(3, 105, 161, 0.55)';
        } else if (avgAlt >= iso0M) {
          ctx.fillStyle = isLight ? 'rgba(241, 245, 249, 0.95)' : 'rgba(226, 232, 240, 0.85)';
        } else if (avgAlt >= 1800) {
          ctx.fillStyle =
            iso0M >= 2750 && rainMmH >= 1.5
              ? 'rgba(234, 88, 12, 0.62)'
              : isLight
              ? 'rgba(148, 163, 184, 0.75)'
              : 'rgba(71, 85, 105, 0.75)';
        } else {
          ctx.fillStyle = isLight ? 'rgba(16, 185, 129, 0.35)' : 'rgba(15, 118, 110, 0.48)';
        }
        ctx.fill();
        ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(148, 163, 184, 0.18)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    // Plano de la Isoterma 0 °C según el paso temporal seleccionado
    const isoC0 = project3D(0.05, 0, iso0M);
    const isoC1 = project3D(1.0, 0, iso0M);
    const isoC2 = project3D(1.0, 1, iso0M);
    const isoC3 = project3D(0.05, 1, iso0M);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(isoC0.x, isoC0.y);
    ctx.lineTo(isoC1.x, isoC1.y);
    ctx.lineTo(isoC2.x, isoC2.y);
    ctx.lineTo(isoC3.x, isoC3.y);
    ctx.closePath();
    const isHighRiskIso = iso0M >= 2750 && rainMmH >= 1.5;
    ctx.fillStyle = isHighRiskIso
      ? 'rgba(220, 38, 38, 0.18)'
      : 'rgba(245, 158, 11, 0.18)';
    ctx.fill();
    ctx.strokeStyle = isHighRiskIso ? '#dc2626' : '#d97706';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.fillStyle = isHighRiskIso ? '#dc2626' : '#d97706';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillText(
      `── COTA ISOTERMA 0 °C (${this.hourOffset === 0 ? 't=0h' : `+${this.hourOffset}h`}): ${iso0M} m s.n.m.`,
      22,
      Math.max(82, isoC0.y - 8)
    );

    const oceanLabelPt = project3D(0.08, 0.5, 0);
    const cityLabelPt = project3D(0.44, 0.5, loc.elevationM);
    const andesLabelPt = project3D(0.92, 0.5, maxAndesPeak);

    const draw3DPin = (pt, title, sub, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = isLight ? 'rgba(255,255,255,0.94)' : 'rgba(15,23,42,0.92)';
      ctx.beginPath();
      ctx.roundRect(pt.x - 62, pt.y - 36, 124, 26, 5);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
      ctx.font = '700 9.5px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, pt.x, pt.y - 24);
      ctx.fillStyle = isLight ? '#334155' : '#93c5fd';
      ctx.font = '500 8.5px "JetBrains Mono", monospace';
      ctx.fillText(sub, pt.x, pt.y - 14);
    };

    draw3DPin(oceanLabelPt, 'Océano Pacífico', '0 m s.n.m.', '#0284c7');
    draw3DPin(
      cityLabelPt,
      loc.name.split('/')[0].trim(),
      `Alt: ${loc.elevationM}m · ${rainMmH.toFixed(1)} mm/h`,
      '#0d9488'
    );
    draw3DPin(andesLabelPt, 'Cumbre Andina', `~${maxAndesPeak} m s.n.m.`, '#6366f1');

    ctx.fillStyle = isLight ? 'rgba(255,255,255,0.94)' : 'rgba(15,23,42,0.92)';
    ctx.strokeStyle = isLight ? '#cbd5e1' : 'rgba(148,163,184,0.28)';
    ctx.beginPath();
    ctx.roundRect(14, 14, width - 28, 54, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
    ctx.font = '700 11.5px "Space Grotesk", sans-serif';
    ctx.fillText(
      `🏔 PERFIL ALTITUDINAL ESQUEMÁTICO: ${loc.basin.toUpperCase()} (${loc.name})`,
      26,
      34
    );
    ctx.fillStyle = isLight ? '#475569' : '#cbd5e1';
    ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `Sobre ${iso0M} m s.n.m. se espera nieve; bajo ${iso0M} m s.n.m. precipitación líquida (${loc.observation.isLiveSynced ? 'Open-Meteo' : 'Datos de muestra'}).`,
      26,
      52
    );

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
    this.locations.forEach((loc) => {
      const { x, y } = this.project(loc, width, height);
      if (y < 20 || y > height - 20) return;

      const isSelected = loc.id === this.selectedLocationId;
      const isHovered = loc.id === this.hoveredLocationId;
      const metric = getLocationValueForStep(loc, this.activeLayer, this.hourOffset);

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(x, y, isSelected || isHovered ? 11 : 9, 0, Math.PI * 2);
      ctx.fillStyle = metric.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isSelected ? 2.8 : 1.8;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 9.5px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(metric.symbol, x, y + 3.5);

      const labelOnLeft = ['valparaiso', 'concepcion', 'valdivia'].includes(loc.id);
      const boxW = 172;
      const boxH = 28;
      const boxX = labelOnLeft ? x - 16 - boxW : x + 16;
      const boxY = y - 14;

      ctx.fillStyle = isSelected
        ? '#0f172a'
        : isLight
        ? 'rgba(255, 255, 255, 0.96)'
        : 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = isSelected
        ? '#0284c7'
        : isHovered
        ? '#64748b'
        : isLight
        ? 'rgba(15, 23, 42, 0.18)'
        : 'rgba(148, 163, 184, 0.28)';
      ctx.lineWidth = isSelected ? 2 : 1;

      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = isLight && !isSelected ? '#0f172a' : '#f8fafc';
      ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
      const shortName = loc.name.split('/')[0].trim();
      ctx.fillText(`${loc.regionCode} · ${shortName}`, boxX + 7, boxY + 11);

      ctx.fillStyle = isLight && !isSelected ? '#0369a1' : '#7dd3fc';
      ctx.font = '500 9.5px "JetBrains Mono", monospace';
      ctx.fillText(metric.display, boxX + 7, boxY + 22);

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
