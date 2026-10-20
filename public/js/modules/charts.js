/**
 * Generadores gráficos SVG accesibles:
 * 1. Hietograma de pronóstico base y escenario superior estimado, más isoterma 0 °C
 * 2. Comparativa sintética de modelos numéricos para contextualizar escenarios de muestra
 */

export function renderHourlyRainChartSVG(container, location) {
  if (!container || !location) return;
  const series = location.hourlyRain48h || [];
  if (!series.length) return;
  const isLive = Boolean(location.observation?.isLiveSynced);
  const baseLabel = isLive ? 'Pronóstico Open-Meteo' : 'Pronóstico base (muestra)';
  const upperLabel = isLive ? 'Escenario superior heurístico' : 'Escenario superior (muestra)';

  const width = 760;
  const height = 270;
  const padLeft = 52;
  const padRight = 58;
  const padTop = 32;
  const padBottom = 46;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxRain = Math.max(12, ...series.map((s) => s.upperScenarioMm * 1.15));
  const minIso = Math.min(500, ...series.map((s) => s.iso0 - 200));
  const maxIso = Math.max(4800, ...series.map((s) => s.iso0 + 200));

  const colWidth = plotW / series.length;

  const barsAndPoints = series.map((pt, i) => {
    const cx = padLeft + i * colWidth + colWidth / 2;
    const barW = Math.min(28, colWidth * 0.45);
    const hBase = (pt.forecastMm / maxRain) * plotH;
    const hUpper = (pt.upperScenarioMm / maxRain) * plotH;
    const yBase = padTop + plotH - hBase;
    const yUpper = padTop + plotH - hUpper;

    const isoY = padTop + plotH - ((pt.iso0 - minIso) / (maxIso - minIso)) * plotH;

    const isIntense = pt.forecastMm >= 7.0 || (pt.forecastMm >= 2.0 && pt.iso0 >= 2800);

    return {
      cx,
      barW,
      yBase,
      hBase,
      yUpper,
      hUpper,
      isoY,
      isIntense,
      pt
    };
  });

  const isoPath = barsAndPoints
    .map((b, i) => `${i === 0 ? 'M' : 'L'} ${b.cx} ${b.isoY}`)
    .join(' ');

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg" role="img"
         aria-label="Gráfico horario de precipitación: ${baseLabel} y ${upperLabel}; altura de isoterma cero grados para ${location.name}">
      ${[0, 0.25, 0.5, 0.75, 1]
        .map((f) => {
          const y = padTop + plotH * (1 - f);
          const rainVal = (maxRain * f).toFixed(1);
          const isoVal = Math.round(minIso + (maxIso - minIso) * f);
          return `
            <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}"
                  stroke="rgba(148, 163, 184, 0.18)" stroke-dasharray="3 3" />
            <text x="${padLeft - 8}" y="${y + 4}" text-anchor="end" fill="#94a3b8" font-size="10">
              ${rainVal} mm
            </text>
            <text x="${width - padRight + 8}" y="${y + 4}" text-anchor="start" fill="#f59e0b" font-size="10">
              ${isoVal} m
            </text>
          `;
        })
        .join('')}

      ${barsAndPoints
        .map(
          (b) => `
          <rect x="${b.cx - b.barW / 2}" y="${b.yUpper}" width="${b.barW}" height="${Math.max(2, b.hUpper)}"
                rx="3" fill="rgba(56, 189, 248, 0.28)" stroke="#38bdf8" stroke-dasharray="2 2" />
          <rect x="${b.cx - b.barW / 2}" y="${b.yBase}" width="${b.barW}" height="${Math.max(2, b.hBase)}"
                rx="3" fill="${b.isIntense ? '#ea580c' : '#0284c7'}" />
          ${
            b.pt.upperScenarioMm > 0
              ? `<text x="${b.cx}" y="${b.yUpper - 5}" text-anchor="middle" fill="#e2e8f0" font-size="9.5" font-weight="600">
                   ${b.pt.forecastMm}–${b.pt.upperScenarioMm}
                 </text>`
              : ''
          }
          <text x="${b.cx}" y="${height - 20}" text-anchor="middle" fill="#cbd5e1" font-size="10" font-weight="600">
            ${b.pt.hourOffset === 0 ? 'Ahora' : `+${b.pt.hourOffset}h`}
          </text>
          <text x="${b.cx}" y="${height - 7}" text-anchor="middle" fill="#94a3b8" font-size="9">
            ${b.pt.temp}°C
          </text>
        `
        )
        .join('')}

      <path d="${isoPath}" fill="none" stroke="#f59e0b" stroke-width="2.5" />
      ${barsAndPoints
        .map(
          (b) => `
          <circle cx="${b.cx}" cy="${b.isoY}" r="4" fill="#f59e0b" stroke="#0f172a" stroke-width="1.5" />
        `
        )
        .join('')}

      <g transform="translate(${padLeft}, 14)">
        <rect x="0" y="-9" width="12" height="10" fill="#0284c7" rx="2" />
        <text x="16" y="0" fill="#e2e8f0" font-size="10.5">${baseLabel} (mm/h)</text>

        <rect x="180" y="-9" width="12" height="10" fill="rgba(56, 189, 248, 0.28)" stroke="#38bdf8" stroke-dasharray="2 2" rx="2" />
        <text x="196" y="0" fill="#e2e8f0" font-size="10.5">${upperLabel} (mm/h)</text>

        <rect x="378" y="-9" width="12" height="10" fill="#ea580c" rx="2" />
        <text x="394" y="0" fill="#fed7aa" font-size="10.5">Pulso intenso / Iso 0°C alta</text>

        <line x1="550" y1="-4" x2="568" y2="-4" stroke="#f59e0b" stroke-width="2.5" />
        <circle cx="559" cy="-4" r="3.5" fill="#f59e0b" />
        <text x="574" y="0" fill="#fcd34d" font-size="10.5">Isoterma 0 °C (m s.n.m.)</text>
      </g>
    </svg>
  `;
}

export function renderModelComparisonChartSVG(container, location) {
  if (!container || !location?.modelsComparison) return;
  const mc = location.modelsComparison;
  const models = [
    { name: 'ECMWF IFS (9 km)', data: mc.ecmwf, color: '#0284c7' },
    { name: 'NOAA GFS (25 km)', data: mc.gfs, color: '#d97706' },
    { name: 'DWD ICON (13 km)', data: mc.icon, color: '#0d9488' }
  ];

  const maxPrecip = Math.max(10, ...models.map((m) => m.data.precip72h * 1.2));

  const precipVals = models.map((m) => m.data.precip72h);
  const isoVals = models.map((m) => m.data.iso0Min);
  const windVals = models.map((m) => m.data.windPeak);

  const spreadMm = Math.max(...precipVals) - Math.min(...precipVals);
  const spreadIso = Math.max(...isoVals) - Math.min(...isoVals);
  const spreadWind = Math.max(...windVals) - Math.min(...windVals);

  container.innerHTML = `
    <div class="model-bars-wrapper">
      ${models
        .map((m) => {
          const pct = Math.min(100, Math.round((m.data.precip72h / maxPrecip) * 100));
          return `
            <div class="model-bar-row">
              <div class="model-bar-header">
                <span class="model-name">
                  <span class="model-dot" style="background:${m.color}"></span>
                  <strong>${m.name}</strong>
                </span>
                <span class="model-metrics" style="font-family:var(--font-mono); font-size:0.78rem;">
                  Lluvia 72h: <strong>${m.data.precip72h.toFixed(1)} mm</strong> ·
                  Iso 0°C mín: <strong>${m.data.iso0Min} m</strong> ·
                  Racha máx: <strong>${m.data.windPeak} km/h</strong>
                </span>
              </div>
              <div class="model-bar-track" role="progressbar" aria-valuenow="${m.data.precip72h}" aria-valuemin="0" aria-valuemax="${Math.round(maxPrecip)}">
                <div class="model-bar-fill" style="width:${pct}%; background:${m.color}"></div>
              </div>
            </div>
          `;
        })
        .join('')}

      <div class="model-delta-grid">
        <div class="model-delta-card">
          <div class="delta-header">
            <span class="delta-label">Diferencia Lluvia 72h</span>
            <span class="delta-pill">Precipitación</span>
          </div>
          <div class="delta-val">Δ ${spreadMm.toFixed(1)} mm</div>
          <div class="delta-sub">Rango: ${Math.min(...precipVals).toFixed(1)} – ${Math.max(...precipVals).toFixed(1)} mm</div>
        </div>
        <div class="model-delta-card">
          <div class="delta-header">
            <span class="delta-label">Diferencia Isoterma 0 °C</span>
            <span class="delta-pill">Congelación</span>
          </div>
          <div class="delta-val">Δ ${spreadIso} m</div>
          <div class="delta-sub">Rango: ${Math.min(...isoVals)} – ${Math.max(...isoVals)} m</div>
        </div>
        <div class="model-delta-card">
          <div class="delta-header">
            <span class="delta-label">Diferencia Racha Viento</span>
            <span class="delta-pill">Viento</span>
          </div>
          <div class="delta-val">Δ ${spreadWind} km/h</div>
          <div class="delta-sub">Dispersión inter-modelo</div>
        </div>
      </div>

      <div class="model-spread-explanation-box">
        <span class="spread-icon" aria-hidden="true">💡</span>
        <div>
          <strong>Lectura ilustrativa:</strong> ${mc.spreadNote}
        </div>
      </div>
    </div>
  `;
}
