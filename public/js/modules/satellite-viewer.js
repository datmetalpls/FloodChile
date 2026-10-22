/**
 * Visor Satelital por Fotogramas (GOES-16 Esquema de Muestra + Mosaico RainViewer en Vivo).
 *
 * Representa exclusivamente los 7 fotogramas temporales definidos en SATELLITE_FRAMES (t - 6h a t = 0h)
 * sin agregar partículas ni frentes en movimiento continuo ficticio, e identifica claramente
 * qué corresponde a Datos de Muestra (Demostración) y qué proviene de consulta en vivo a RainViewer.
 */

export const SATELLITE_FRAMES = [
  {
    index: 0,
    offsetLabel: 'Hace 6 h (t - 6 h)',
    captureUtc: '2026-10-19T09:10:00Z',
    frontLonShift: -5.4,
    frontLatShift: -1.8,
    coreTempC: -48,
    ivtKgMS: 390,
    lowPressureHpa: 992,
    synopsis: 'Frente frío y río atmosférico aproximándose por el Pacífico a 450 km al oeste de Valparaíso y Maule.'
  },
  {
    index: 1,
    offsetLabel: 'Hace 5 h (t - 5 h)',
    captureUtc: '2026-10-19T10:10:00Z',
    frontLonShift: -4.5,
    frontLatShift: -1.5,
    coreTempC: -50,
    ivtKgMS: 415,
    lowPressureHpa: 990,
    synopsis: 'Pluma cálida pre-frontal de vapor de agua tocando costa de Biobío, Ñuble y Maule.'
  },
  {
    index: 2,
    offsetLabel: 'Hace 4 h (t - 4 h)',
    captureUtc: '2026-10-19T11:10:00Z',
    frontLonShift: -3.6,
    frontLatShift: -1.2,
    coreTempC: -52,
    ivtKgMS: 440,
    lowPressureHpa: 989,
    synopsis: 'Ingreso de banda frontal activa a la costa de Valparaíso, O’Higgins y Maule.'
  },
  {
    index: 3,
    offsetLabel: 'Hace 3 h (t - 3 h)',
    captureUtc: '2026-10-19T12:10:00Z',
    frontLonShift: -2.7,
    frontLatShift: -0.9,
    coreTempC: -53,
    ivtKgMS: 465,
    lowPressureHpa: 988,
    synopsis: 'Ascenso orográfico sobre la Cordillera de la Costa e inicio de lluvias intensas en valle central.'
  },
  {
    index: 4,
    offsetLabel: 'Hace 2 h (t - 2 h)',
    captureUtc: '2026-10-19T13:10:00Z',
    frontLonShift: -1.8,
    frontLatShift: -0.6,
    coreTempC: -55,
    ivtKgMS: 480,
    lowPressureHpa: 986,
    synopsis: 'Intensificación de topes nubosos (-55 °C) sobre cuencas del Maipo, Cachapoal y Maule.'
  },
  {
    index: 5,
    offsetLabel: 'Hace 1 h (t - 1 h)',
    captureUtc: '2026-10-19T14:10:00Z',
    frontLonShift: -0.9,
    frontLatShift: -0.3,
    coreTempC: -56,
    ivtKgMS: 490,
    lowPressureHpa: 985,
    synopsis: 'Retención orográfica andina con isoterma 0 °C en torno a 3.050 m s.n.m. en RM y células postfrontales en Biobío.'
  },
  {
    index: 6,
    offsetLabel: 'Actual (t = 0 h)',
    captureUtc: '2026-10-19T15:10:00Z',
    frontLonShift: 0.0,
    frontLatShift: 0.0,
    coreTempC: -57,
    ivtKgMS: 495,
    lowPressureHpa: 984,
    synopsis: 'Captura actual: Banda frontal activa sobre Zona Central (32°S–38°S) y ciclón subpolar sobre Magallanes (53°S).'
  }
];

const SOUTH_AMERICA_PROFILE = [
  { lat: 15.0, coastLon: 75.4, andesLon: 70.0, eastLon: 62.0 },
  { lat: 18.5, coastLon: 70.3, andesLon: 69.1, eastLon: 62.0 },
  { lat: 20.2, coastLon: 70.1, andesLon: 68.6, eastLon: 62.0 },
  { lat: 23.6, coastLon: 70.4, andesLon: 67.8, eastLon: 62.0 },
  { lat: 27.0, coastLon: 70.8, andesLon: 68.5, eastLon: 62.0 },
  { lat: 29.9, coastLon: 71.3, andesLon: 69.8, eastLon: 62.0 },
  { lat: 33.0, coastLon: 71.6, andesLon: 70.0, eastLon: 62.0 },
  { lat: 35.4, coastLon: 72.4, andesLon: 70.4, eastLon: 62.0 },
  { lat: 36.8, coastLon: 73.1, andesLon: 71.1, eastLon: 62.0 },
  { lat: 39.8, coastLon: 73.4, andesLon: 71.8, eastLon: 62.5 },
  { lat: 41.5, coastLon: 73.8, andesLon: 71.9, eastLon: 63.5 },
  { lat: 45.5, coastLon: 74.6, andesLon: 72.6, eastLon: 65.5 },
  { lat: 49.0, coastLon: 75.2, andesLon: 73.1, eastLon: 67.2 },
  { lat: 53.1, coastLon: 74.0, andesLon: 71.8, eastLon: 68.2 },
  { lat: 55.8, coastLon: 68.5, andesLon: 67.2, eastLon: 66.5 }
];

const REFERENCE_CITIES = [
  { name: 'Arica', lat: 18.47, lon: 70.31 },
  { name: 'Antofagasta', lat: 23.65, lon: 70.40 },
  { name: 'La Serena', lat: 29.90, lon: 71.25 },
  { name: 'Rapa Nui', lat: 27.11, lon: 109.35 },
  { name: 'Valparaíso', lat: 33.04, lon: 71.61 },
  { name: 'Santiago (RM)', lat: 33.45, lon: 70.66 },
  { name: 'Talca', lat: 35.42, lon: 71.65 },
  { name: 'Concepción', lat: 36.82, lon: 73.05 },
  { name: 'Valdivia', lat: 39.81, lon: 73.24 },
  { name: 'Puerto Montt', lat: 41.47, lon: 72.94 },
  { name: 'Punta Arenas', lat: 53.16, lon: 70.91 }
];

class FrameBasedSatelliteEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.stepTimerId = null;

    this.targetFrameIndex = 6;
    this.compareFrameIndex = 3;
    this.compareModeEnabled = true;
    this.splitPercentage = 50;
    this.channel = 'ir_b13';
    this.isPlayingSequence = false;
    this.onSplitDragCallback = null;
    this.onFrameTickCallback = null;
    this.isDraggingCurtain = false;

    this.viewMode = 'canvasFrames'; // 'canvasFrames' | 'liveMap'
    this.liveMapContainer = null;
    this.liveLeafletMap = null;
    this.liveIrLayer = null;
    this.liveIrFrames = [];
    this.liveIrOpacity = 0.72;
  }

  projectGeo(latS, lonW, width, height) {
    const minLonW = 62.0;
    const maxLonW = 112.0;
    const minLatS = 15.0;
    const maxLatS = 58.0;

    const x = ((maxLonW - lonW) / (maxLonW - minLonW)) * width;
    const y = ((latS - minLatS) / (maxLatS - minLatS)) * height;
    return { x, y };
  }

  mountAndUpdate({
    canvas,
    currentFrameIndex,
    compareFrameIndex,
    compareModeEnabled,
    splitPercentage,
    channel,
    onSplitChange,
    onFrameStepChange
  }) {
    if (!canvas) return;

    this.targetFrameIndex = Math.max(0, Math.min(SATELLITE_FRAMES.length - 1, currentFrameIndex));
    this.compareFrameIndex = Math.max(0, Math.min(SATELLITE_FRAMES.length - 1, compareFrameIndex));
    this.compareModeEnabled = compareModeEnabled;
    this.splitPercentage = splitPercentage;
    this.channel = channel;
    if (typeof onSplitChange === 'function') this.onSplitDragCallback = onSplitChange;
    if (typeof onFrameStepChange === 'function') this.onFrameTickCallback = onFrameStepChange;

    if (this.canvas !== canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.enhanceWrapperWithModeSwitcher(canvas);
      this.bindInteractiveCurtainEvents(canvas);
    }

    if (this.viewMode === 'canvasFrames') {
      this.renderCompositeFrame();
    } else if (this.liveIrFrames.length) {
      this.showLiveIrFrame(this.targetFrameIndex);
    }
  }

  setPlayingState(playing) {
    this.isPlayingSequence = playing;
    if (this.stepTimerId) {
      clearInterval(this.stepTimerId);
      this.stepTimerId = null;
    }

    if (this.isPlayingSequence) {
      this.stepTimerId = setInterval(() => {
        const nextIdx = (this.targetFrameIndex + 1) % SATELLITE_FRAMES.length;
        this.targetFrameIndex = nextIdx;
        const slider = document.getElementById('satFrameRange');
        if (slider) slider.value = String(nextIdx);
        if (this.onFrameTickCallback) {
          this.onFrameTickCallback(nextIdx);
        } else {
          this.renderCompositeFrame();
        }
        if (this.viewMode === 'liveMap' && this.liveIrFrames.length) {
          this.showLiveIrFrame(nextIdx);
        }
      }, 900);
    }
  }

  enhanceWrapperWithModeSwitcher(canvas) {
    const wrap = canvas.parentElement;
    if (!wrap || wrap.querySelector('.sat-engine-mode-bar')) return;

    const bar = document.createElement('div');
    bar.className = 'sat-engine-mode-bar';
    bar.innerHTML = `
      <div class="sat-mode-pills">
        <button type="button" class="btn-map-ctrl active" id="btnSatModeCanvas">
          🛰 Secuencia Sinóptica de Muestra (7 Fotogramas + Cortina Antes/Ahora)
        </button>
        <button type="button" class="btn-map-ctrl" id="btnSatModeLiveMap">
          🌎 Satélite en Vivo (NASA GIBS GOES-East + RainViewer)
        </button>
        <select id="satLiveSourceSelect" class="select-compact hidden" aria-label="Fuente satelital en vivo">
          <option value="rainviewer_radar">📡 RainViewer · Radar Meteorológico Doppler (Lluvia en vivo · dBZ)</option>
          <option value="rainviewer_sat">🛰 RainViewer · Satélite Infrarrojo (IR)</option>
          <option value="gibs_goes_ir" selected>NASA GIBS · GOES-East Banda 13 IR (En vivo 10m)</option>
          <option value="gibs_goes_geocolor">NASA GIBS · GOES-East GeoColor (Color real día + IR noche)</option>
          <option value="gibs_viirs_truecolor">NASA GIBS · VIIRS Color Verdadero (250m)</option>
        </select>
      </div>
      <div class="sat-hint-text" id="satInteractiveHint">
        Arrastra la línea <strong>⇄</strong> para comparar el fotograma anterior con el seleccionado
      </div>
    `;
    wrap.insertBefore(bar, canvas);

    const liveDiv = document.createElement('div');
    liveDiv.id = 'satLiveLeafletContainer';
    liveDiv.className = 'leaflet-stage hidden';
    liveDiv.style.height = '460px';
    wrap.appendChild(liveDiv);
    this.liveMapContainer = liveDiv;

    const btnCanvas = bar.querySelector('#btnSatModeCanvas');
    const btnLive = bar.querySelector('#btnSatModeLiveMap');
    const sourceSelect = bar.querySelector('#satLiveSourceSelect');
    const hintEl = bar.querySelector('#satInteractiveHint');

    btnCanvas?.addEventListener('click', () => {
      this.viewMode = 'canvasFrames';
      btnCanvas.classList.add('active');
      btnLive?.classList.remove('active');
      sourceSelect?.classList.add('hidden');
      this.canvas.classList.remove('hidden');
      this.liveMapContainer?.classList.add('hidden');
      document.querySelectorAll('#satCompareToggleGroup, #satCompareSelectGroup, #satSplitSliderGroup, #satChannelSelectGroup').forEach((el) => {
        el.classList.remove('hidden');
      });
      if (hintEl) {
        hintEl.innerHTML =
          'Arrastra la línea <strong>⇄</strong> para comparar el fotograma anterior con el seleccionado';
      }
      this.renderCompositeFrame();
    });

    btnLive?.addEventListener('click', () => {
      if (typeof window.L === 'undefined') return;
      this.viewMode = 'liveMap';
      btnLive.classList.add('active');
      btnCanvas?.classList.remove('active');
      sourceSelect?.classList.remove('hidden');
      this.canvas.classList.add('hidden');
      this.liveMapContainer?.classList.remove('hidden');
      document.querySelectorAll('#satCompareToggleGroup, #satCompareSelectGroup, #satSplitSliderGroup, #satChannelSelectGroup').forEach((el) => {
        el.classList.add('hidden');
      });
      if (hintEl) {
        hintEl.innerHTML =
          'Mosaico satelital real en vivo (NASA Earthdata GIBS WMTS / RainViewer API)';
      }
      this.initLiveSatelliteLeaflet(sourceSelect?.value || 'gibs_goes_ir');
      setTimeout(() => this.liveLeafletMap?.invalidateSize(), 60);
    });

    sourceSelect?.addEventListener('change', (e) => {
      this.applyLiveSatelliteSource(e.target.value);
    });
  }

  async initLiveSatelliteLeaflet(initialSource = 'gibs_goes_ir') {
    if (!this.liveMapContainer || typeof window.L === 'undefined') return;

    if (!this.liveLeafletMap) {
      this.liveLeafletMap = window.L.map(this.liveMapContainer, {
        center: [-34.5, -74.0],
        zoom: 4,
        zoomControl: true
      });

      window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors · NASA GIBS · RainViewer',
        maxZoom: 18
      }).addTo(this.liveLeafletMap);
    }

    await this.applyLiveSatelliteSource(initialSource);
  }

  async applyLiveSatelliteSource(sourceKey) {
    if (!this.liveLeafletMap || typeof window.L === 'undefined') return;

    if (this.liveIrLayer) {
      this.liveLeafletMap.removeLayer(this.liveIrLayer);
      this.liveIrLayer = null;
    }

    if (sourceKey === 'gibs_goes_ir') {
      this.liveIrLayer = window.L.tileLayer(
        'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GOES-East_ABI_Band13_Clean_Infrared/default/default/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png',
        {
          opacity: 0.72,
          maxNativeZoom: 6,
          maxZoom: 18,
          zIndex: 12,
          attribution: 'NASA EOSDIS GIBS · NOAA GOES-East ABI Band 13 Clean IR (10.3 µm)'
        }
      ).addTo(this.liveLeafletMap);
      return;
    }

    if (sourceKey === 'gibs_goes_geocolor') {
      this.liveIrLayer = window.L.tileLayer(
        'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GOES-East_ABI_GeoColor/default/default/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png',
        {
          opacity: 0.78,
          maxNativeZoom: 7,
          maxZoom: 18,
          zIndex: 12,
          attribution: 'NASA EOSDIS GIBS · NOAA GOES-East ABI GeoColor'
        }
      ).addTo(this.liveLeafletMap);
      return;
    }

    if (sourceKey === 'gibs_viirs_truecolor') {
      this.liveIrLayer = window.L.tileLayer(
        'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
        {
          opacity: 0.78,
          maxNativeZoom: 9,
          maxZoom: 18,
          zIndex: 12,
          attribution: 'NASA EOSDIS GIBS · Suomi NPP VIIRS TrueColor (250m)'
        }
      ).addTo(this.liveLeafletMap);
      return;
    }

    try {
      const isRadar = sourceKey === 'rainviewer_radar';
      let res = await fetch('/api/rainviewer/weather-maps').catch(() => null);
      if (!res || !res.ok) {
        res = await fetch('https://api.rainviewer.com/public/weather-maps.json').catch(() => null);
      }
      if (res && res.ok) {
        const data = await res.json();
        const irFrames = data?.satellite?.infrared || [];
        const radarFrames = data?.radar?.past || [];
        const chosen = isRadar
          ? (radarFrames.length ? radarFrames : irFrames)
          : (irFrames.length ? irFrames : radarFrames);
        const useRadarColors = isRadar && radarFrames.length > 0;
        if (chosen.length) {
          const host = data.host || 'https://tilecache.rainviewer.com';
          this.liveIrFrames = chosen.slice(-10).map((f) => ({
            time: f.time,
            url: `${host}${f.path}/256/{z}/{x}/{y}/${useRadarColors ? '2/1_1.png' : '0/0_0.png'}`
          }));
        }
      }
      if (this.liveIrFrames.length) {
        this.showLiveIrFrame(this.liveIrFrames.length - 1);
      }
    } catch {
      // Sin conexión externa
    }
  }

  showLiveIrFrame(idx) {
    if (!this.liveLeafletMap || !this.liveIrFrames.length || typeof window.L === 'undefined') return;
    const frame = this.liveIrFrames[idx % this.liveIrFrames.length];
    if (this.liveIrLayer) {
      this.liveLeafletMap.removeLayer(this.liveIrLayer);
    }
    this.liveIrLayer = window.L.tileLayer(frame.url, {
      opacity: this.liveIrOpacity,
      zIndex: 12
    }).addTo(this.liveLeafletMap);
  }

  bindInteractiveCurtainEvents(canvas) {
    const updateSplitFromEvent = (clientX) => {
      if (!this.compareModeEnabled) return;
      const rect = canvas.getBoundingClientRect();
      const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const pct = Math.round(Math.max(10, Math.min(90, (relX / rect.width) * 100)));
      this.splitPercentage = pct;
      const splitInput = document.getElementById('satSplitRange');
      const splitVal = document.getElementById('satSplitVal');
      if (splitInput) splitInput.value = String(pct);
      if (splitVal) splitVal.textContent = `${pct}%`;
      if (this.onSplitDragCallback) this.onSplitDragCallback(pct);
      this.renderCompositeFrame();
    };

    canvas.addEventListener('mousedown', (e) => {
      if (!this.compareModeEnabled) return;
      this.isDraggingCurtain = true;
      updateSplitFromEvent(e.clientX);
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDraggingCurtain) return;
      updateSplitFromEvent(e.clientX);
    });

    window.addEventListener('mouseup', () => {
      this.isDraggingCurtain = false;
    });

    canvas.addEventListener(
      'touchstart',
      (e) => {
        if (!this.compareModeEnabled || !e.touches[0]) return;
        this.isDraggingCurtain = true;
        updateSplitFromEvent(e.touches[0].clientX);
      },
      { passive: true }
    );

    canvas.addEventListener(
      'touchmove',
      (e) => {
        if (!this.isDraggingCurtain || !e.touches[0]) return;
        updateSplitFromEvent(e.touches[0].clientX);
      },
      { passive: true }
    );

    canvas.addEventListener('touchend', () => {
      this.isDraggingCurtain = false;
    });
  }

  drawSingleChannelScene(ctx, width, height, frameData, channel, badgeTitle, badgeSide) {
    ctx.save();

    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    if (channel === 'vapor_agua') {
      bgGrad.addColorStop(0, '#040b16');
      bgGrad.addColorStop(0.5, '#0a192f');
      bgGrad.addColorStop(1, '#071324');
    } else if (channel === 'geocolor') {
      bgGrad.addColorStop(0, '#04182b');
      bgGrad.addColorStop(0.5, '#082642');
      bgGrad.addColorStop(1, '#041221');
    } else {
      bgGrad.addColorStop(0, '#050a14');
      bgGrad.addColorStop(0.6, '#0b1528');
      bgGrad.addColorStop(1, '#070e1c');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';

    for (let lat = 20; lat <= 55; lat += 5) {
      const { y } = this.projectGeo(lat, 80, width, height);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.fillText(`${lat}°S`, 8, y - 4);
    }

    for (let lon = 105; lon >= 65; lon -= 10) {
      const { x } = this.projectGeo(30, lon, width, height);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.fillText(`${lon}°W`, x + 4, height - 28);
    }

    // Continente Sudamericano y Cordillera de los Andes
    ctx.beginPath();
    SOUTH_AMERICA_PROFILE.forEach((pt, idx) => {
      const { x, y } = this.projectGeo(pt.lat, pt.coastLon, width, height);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    for (let i = SOUTH_AMERICA_PROFILE.length - 1; i >= 0; i--) {
      const pt = SOUTH_AMERICA_PROFILE[i];
      const { x, y } = this.projectGeo(pt.lat, pt.eastLon, width, height);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = channel === 'geocolor' ? '#173026' : '#131f33';
    ctx.fill();

    ctx.beginPath();
    SOUTH_AMERICA_PROFILE.forEach((pt, idx) => {
      const { x, y } = this.projectGeo(pt.lat, pt.andesLon, width, height);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle =
      channel === 'geocolor' ? 'rgba(241, 245, 249, 0.55)' : 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    SOUTH_AMERICA_PROFILE.forEach((pt, idx) => {
      const { x, y } = this.projectGeo(pt.lat, pt.coastLon, width, height);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Centro de Baja Presión del fotograma seleccionado
    const vortexLon = 81.5 - frameData.frontLonShift * 1.15;
    const vortexLat = 42.5 + frameData.frontLatShift * 0.45;
    const vortexCenter = this.projectGeo(vortexLat, vortexLon, width, height);
    const highCenter = this.projectGeo(24.5, 92.0, width, height);

    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    [42, 78, 118].forEach((r) => {
      ctx.beginPath();
      ctx.ellipse(vortexCenter.x, vortexCenter.y, r * 1.15, r * 0.9, 0.3, 0, Math.PI * 2);
      ctx.stroke();
    });
    [55, 95].forEach((r) => {
      ctx.beginPath();
      ctx.ellipse(highCenter.x, highCenter.y, r * 1.3, r * 0.85, -0.15, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.font = '700 12px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#f87171';
    ctx.fillText(`B ${frameData.lowPressureHpa} hPa`, vortexCenter.x - 28, vortexCenter.y + 4);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('A 1023 hPa', highCenter.x - 28, highCenter.y + 4);
    ctx.restore();

    // Banda Frontal correspondiente al fotograma seleccionado (posiciones fijas por fotograma)
    const frontLon = 73.2 - frameData.frontLonShift;
    const frontLat = 35.2 + frameData.frontLatShift;
    const frontCenter = this.projectGeo(frontLat, frontLon, width, height);

    ctx.save();
    ctx.translate(frontCenter.x, frontCenter.y);
    ctx.rotate(0.54);

    const plumeGrad = ctx.createRadialGradient(0, 0, 14, -30, -10, 240);
    if (channel === 'ir_b13') {
      plumeGrad.addColorStop(0, 'rgba(220, 38, 38, 0.92)');
      plumeGrad.addColorStop(0.22, 'rgba(249, 115, 22, 0.86)');
      plumeGrad.addColorStop(0.45, 'rgba(250, 204, 21, 0.75)');
      plumeGrad.addColorStop(0.68, 'rgba(56, 189, 248, 0.58)');
      plumeGrad.addColorStop(0.88, 'rgba(148, 163, 184, 0.25)');
      plumeGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    } else if (channel === 'vapor_agua') {
      plumeGrad.addColorStop(0, 'rgba(240, 253, 244, 0.94)');
      plumeGrad.addColorStop(0.24, 'rgba(16, 185, 129, 0.88)');
      plumeGrad.addColorStop(0.52, 'rgba(6, 182, 212, 0.72)');
      plumeGrad.addColorStop(0.78, 'rgba(37, 99, 235, 0.42)');
      plumeGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    } else if (channel === 'rain_rate') {
      plumeGrad.addColorStop(0, 'rgba(239, 68, 68, 0.92)');
      plumeGrad.addColorStop(0.28, 'rgba(234, 179, 8, 0.84)');
      plumeGrad.addColorStop(0.58, 'rgba(34, 197, 94, 0.62)');
      plumeGrad.addColorStop(0.82, 'rgba(14, 165, 233, 0.35)');
      plumeGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    } else {
      plumeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.97)');
      plumeGrad.addColorStop(0.38, 'rgba(226, 232, 240, 0.84)');
      plumeGrad.addColorStop(0.72, 'rgba(148, 163, 184, 0.45)');
      plumeGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    }

    ctx.fillStyle = plumeGrad;
    ctx.beginPath();
    ctx.ellipse(-22, 0, 235, 68, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ciudades de referencia
    REFERENCE_CITIES.forEach((city) => {
      const { x, y } = this.projectGeo(city.lat, city.lon, width, height);
      ctx.fillStyle = city.name.includes('Rapa Nui') ? '#38bdf8' : '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = city.name.includes('Rapa Nui') ? 'center' : 'left';
      ctx.fillText(
        city.name,
        city.name.includes('Rapa Nui') ? x : x + 7,
        city.name.includes('Rapa Nui') ? y - 7 : y + 3
      );
    });

    this.drawSpectralColorbar(ctx, width, height, channel);

    // Etiqueta del fotograma con aviso explícito de Datos de muestra
    const boxW = 310;
    const boxH = 52;
    const boxX = badgeSide === 'right' ? width - boxW - 14 : 14;
    const boxY = 14;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = badgeSide === 'right' ? '#38bdf8' : '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = badgeSide === 'right' ? '#38bdf8' : '#fbbf24';
    ctx.font = '700 11px "Space Grotesk", sans-serif';
    ctx.fillText(badgeTitle, boxX + 12, boxY + 19);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillText(
      `Muestra · Tope IR: ${frameData.coreTempC}°C · IVT: ${frameData.ivtKgMS} kg/m/s`,
      boxX + 12,
      boxY + 37
    );

    ctx.restore();
  }

  drawSpectralColorbar(ctx, width, height, channel) {
    const barW = 340;
    const barH = 12;
    const barX = 14;
    const barY = height - 24;

    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    let labelText = 'Temp. Brillo Banda 13 IR: >0°C (Suelo)   -20°C   -40°C   -55°C   <-75°C (Convección)';
    if (channel === 'ir_b13') {
      grad.addColorStop(0.0, '#1e293b'); // > 0°C Superficie cálida / océano
      grad.addColorStop(0.2, '#3b82f6'); // -10° a 0°C Nubes bajas / camanchaca
      grad.addColorStop(0.4, '#06b6d4'); // -35° a -20°C Nubes medias / estratos
      grad.addColorStop(0.65, '#facc15'); // -50° a -40°C Frente activo / río atmosférico
      grad.addColorStop(0.85, '#ef4444'); // -65° a -55°C Cumulonimbus maduro
      grad.addColorStop(1.0, '#a855f7'); // < -75°C Convección severa / overshooting tops
    } else if (channel === 'vapor_agua') {
      grad.addColorStop(0, '#1e3a8a');
      grad.addColorStop(0.45, '#06b6d4');
      grad.addColorStop(0.75, '#10b981');
      grad.addColorStop(1, '#f0fdf4');
      labelText = 'Vapor de Agua Media/Alta Tropósfera: Seco                  Húmedo                  Río Atmosférico';
    } else if (channel === 'rain_rate') {
      grad.addColorStop(0, '#0ea5e9');
      grad.addColorStop(0.4, '#22c55e');
      grad.addColorStop(0.72, '#eab308');
      grad.addColorStop(1, '#ef4444');
      labelText = 'Tasa Precipitación Estimada (mm/h):  0.5 mm/h          3 mm/h          8 mm/h          >15 mm/h';
    } else {
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#94a3b8');
      grad.addColorStop(1, '#ffffff');
      labelText = 'Reflectancia Visible + Infrarrojo GeoColor:  Océano          Nubes Bajas          Topes Densos';
    }

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(barX - 6, barY - 18, barW + 16, 28);
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 8.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(labelText, barX, barY - 5);
    ctx.restore();
  }

  renderCompositeFrame() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    const currentFrame = SATELLITE_FRAMES[this.targetFrameIndex] || SATELLITE_FRAMES[6];
    const pastFrame = SATELLITE_FRAMES[this.compareFrameIndex] || SATELLITE_FRAMES[3];

    ctx.clearRect(0, 0, width, height);

    if (!this.compareModeEnabled) {
      this.drawSingleChannelScene(
        ctx,
        width,
        height,
        currentFrame,
        this.channel,
        `CUADRO: ${currentFrame.offsetLabel.toUpperCase()}`,
        'left'
      );
      return;
    }

    const splitX = Math.round((this.splitPercentage / 100) * width);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitX, height);
    ctx.clip();
    this.drawSingleChannelScene(
      ctx,
      width,
      height,
      pastFrame,
      this.channel,
      `ANTES: ${pastFrame.offsetLabel.toUpperCase()}`,
      'left'
    );
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, 0, width - splitX, height);
    ctx.clip();
    this.drawSingleChannelScene(
      ctx,
      width,
      height,
      currentFrame,
      this.channel,
      `AHORA: ${currentFrame.offsetLabel.toUpperCase()}`,
      'right'
    );
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, height);
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(splitX, height / 2, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '800 13px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⇄', splitX, height / 2 + 4.5);
    ctx.restore();
  }
}

export const satelliteEngineSingleton = new FrameBasedSatelliteEngine();

export function renderSatelliteComparisonCanvas(options) {
  satelliteEngineSingleton.mountAndUpdate(options);
}
