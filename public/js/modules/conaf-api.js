const CONAF_REPORT_URL = 'https://www.conaf.cl/mapas-incendios-forestales/ocurrencia-nacional.htm';
const REGIONS = new Set([
  'arica y parinacota', 'tarapaca', 'antofagasta', 'atacama', 'coquimbo', 'valparaiso',
  'metropolitana', "o'higgins", 'ohiggins', 'maule', 'nuble', 'biobio', 'bio-bio',
  'la araucania', 'araucania', 'los rios', 'los lagos', 'aysen', 'magallanes'
]);

function cleanText(value) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&oacute;/gi, 'ó').replace(/&iacute;/gi, 'í').replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é').replace(/&uacute;/gi, 'ú').replace(/&ntilde;/gi, 'ñ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ').trim();
}

function numberOrNull(value) {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function parseConafDailyReport(html, retrievedAtUtc = new Date().toISOString()) {
  const text = cleanText(html);
  const timestamp = text.match(/Fecha:\s*(\d{2}-\d{2}-\d{4})\s*Hora\s*(\d{2}:\d{2}:\d{2})/i);
  const tables = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map((match) => match[1]);
  const reportTable = tables.find((table) => {
    const content = cleanText(table).toLowerCase();
    return content.includes('total incendios') && content.includes('bajo observación');
  });
  if (!reportTable) throw new Error('No se encontró la tabla diaria regional de CONAF');

  const rows = [...reportTable.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) =>
    [...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => cleanText(cell[1]))
  );
  const regions = rows.filter((cells) => REGIONS.has((cells[0] || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()));
  const total = rows.find((cells) => /^total$/i.test(cells[0] || ''));
  if (!regions.length || !total) throw new Error('El informe CONAF no contiene filas regionales y total nacional');

  const mapRow = (cells) => ({
    region: cells[0],
    firesTotal: numberOrNull(cells[1] || ''),
    underObservation: numberOrNull(cells[2] || ''),
    fighting: numberOrNull(cells[3] || ''),
    controlled: numberOrNull(cells[4] || ''),
    extinguishedToday: numberOrNull(cells[5] || ''),
    affectedAreaHa: numberOrNull(cells[6] || '')
  });
  const national = mapRow(total);
  const regional = regions.map(mapRow);
  const sum = regional.reduce((acc, row) => acc + (row.firesTotal || 0), 0);
  const issues = [];
  if (national.firesTotal !== null && sum !== national.firesTotal) issues.push('El total nacional no coincide con la suma regional');

  return {
    sourceId: 'conaf-incendios',
    sourceUrl: CONAF_REPORT_URL,
    dataType: 'OBSERVACION_REPORTE_OFICIAL',
    retrievedAtUtc,
    sourceReportedAtLocal: timestamp ? `${timestamp[1]} ${timestamp[2]}` : null,
    national,
    regions: regional,
    quality: { status: issues.length ? 'REVIEW' : 'PASS', issues }
  };
}

export async function fetchConafDailyReport() {
  const response = await fetch(CONAF_REPORT_URL, {
    signal: AbortSignal.timeout(8000),
    headers: { Accept: 'text/html', 'User-Agent': 'ClimasFlood/1.0 (+https://github.com/datmetalpls/FloodChile)' }
  });
  if (!response.ok) throw new Error(`CONAF respondió ${response.status}`);
  return parseConafDailyReport(await response.text());
}
