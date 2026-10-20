/**
 * Generadores gráficos SVG accesibles:
 * 1. Hietograma horario de lluvia con incertidumbre (P50 vs P90) y curva de Isoterma 0 °C
 * 2. Comparativa de modelos numéricos (ECMWF IFS vs NOAA GFS vs DWD ICON) basada en los datos de la comuna
 */

export function renderHourlyRainChartSVG(container, location) {
  if (!container || !location) return;
  const series = location.hourlyRain48h || [];
  if (!series.length) return;

  const width = 760;
  const height = 270;
  const padLeft = 52;
  const padRight = 58;
  const padTop = 32;
  const padBottom = 46;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxRain = Math.max(12, ...series.map((s) => s.p90 * 1.15));
  const minIso = Math.min(500, ...series.map((s) => s.iso0 - 200));
  const maxIso = Math.max(4800, ...series.map((s) => s.iso0 + 200));

  const colWidth = plotW / series.length;

  const barsAndPoints = series.map((pt, i) => {
    const cx = padLeft + i * colWidth + colWidth / 2;
    const barW = Math.min(28, colWidth * 0.45);
    const hP50 = (pt.p50 / maxRain) * plotH;
    const hP90 = (pt.p90 / maxRain) * plotH;
    const yP50 = padTop + plotH - hP50;
    const yP90 = padTop + plotH - hP90;

    const isoY = padTop + plotH - ((pt.iso0 - minIso) / (maxIso - minIso)) * plotH;

    const isIntense = pt.p90 >= 7.0 || (pt.p50 >= 2.0 && pt.iso0 >= 2800);

    return {
      cx,
      barW,
      yP50,
      hP50,
      yP90,
      hP90,
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
         aria-label="Gráfico horario de precipitación estimada mediana P50, extremo P90 y altura de isoterma cero grados para ${location.name}">
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
          <rect x="${b.cx - b.barW / 2}" y="${b.yP90}" width="${b.barW}" height="${Math.max(2, b.hP90)}"
                rx="3" fill="rgba(56, 189, 248, 0.28)" stroke="#38bdf8" stroke-dasharray="2 2" />
          <rect x="${b.cx - b.barW / 2}" y="${b.yP50}" width="${b.barW}" height="${Math.max(2, b.hP50)}"
                rx="3" fill="${b.isIntense ? '#ea580c' : '#0284c7'}" />
          ${
            b.pt.p90 > 0
              ? `<text x="${b.cx}" y="${b.yP90 - 5}" text-anchor="middle" fill="#e2e8f0" font-size="9.5" font-weight="600">
                   ${b.pt.p50}–${b.pt.p90}
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
        <text x="16" y="0" fill="#e2e8f0" font-size="10.5">Mediana esperada (P50 mm/h)</text>

        <rect x="180" y="-9" width="12" height="10" fill="rgba(56, 189, 248, 0.28)" stroke="#38bdf8" stroke-dasharray="2 2" rx="2" />
        <text x="196" y="0" fill="#e2e8f0" font-size="10.5">Techo incertidumbre (P90 mm/h)</text>

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

      <div class="obs-metrics-grid" style="margin:0.35rem 0;">
        <div class="obs-metric-box">
          <div class="obs-metric-label">Diferencia Lluvia 72h</div>
          <div class="obs-metric-val">Δ ${spreadMm.toFixed(1)} mm</div>
          <div style="font-size:0.72rem; color:var(--text-secondary);">Rango: ${Math.min(...precipVals).toFixed(1)} a ${Math.max(...precipVals).toFixed(1)} mm</div>
        </div>
        <div class="obs-metric-box">
          <div class="obs-metric-label">Diferencia Isoterma 0 °C</div>
          <div class="obs-metric-val">Δ ${spreadIso} m</div>
          <div style="font-size:0.72rem; color:var(--text-secondary);">Rango: ${Math.min(...isoVals)} a ${Math.max(...isoVals)} m</div>
        </div>
        <div class="obs-metric-box">
          <div class="obs-metric-label">Diferencia Racha Viento</div>
          <div class="obs-metric-val">Δ ${spreadWind} km/h</div>
          <div style="font-size:0.72rem; color:var(--text-secondary);">Datos de muestra predefinidos</div>
        </div>
      </div>

      <p class="model-spread-explanation">
        <strong>Nota de divergencia entre modelos (Datos de muestra):</strong> ${mc.spreadNote}
      </p>
    </div>
  `;
}
