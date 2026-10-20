export function auditSourceCatalog(sources, { now = Date.now(), openMeteo = null } = {}) {
  const checkedAtUtc = new Date(now).toISOString();
  const findings = [];
  const runtimeChecks = [];

  for (const source of sources) {
    const problems = [];
    const updatedAt = Date.parse(source.lastUpdatedUtc || '');

    if (!source.url) problems.push('Falta enlace a la fuente primaria.');
    if (!source.accessNotes) problems.push('Falta explicar el método o las limitaciones de acceso.');
    if (!Number.isFinite(updatedAt)) {
      problems.push('No hay una fecha de actualización válida en el catálogo.');
    } else {
      const ageMinutes = Math.max(0, (now - updatedAt) / 60000);
      if (Number.isFinite(source.ttlMinutes) && ageMinutes > source.ttlMinutes) {
        problems.push(`La fecha del catálogo supera el TTL (${Math.floor(ageMinutes)} min vs. ${source.ttlMinutes} min).`);
        if (source.status === 'ONLINE') {
          problems.push('El catálogo dice ONLINE, pero su fecha registrada está vencida; requiere comprobación humana.');
        }
      }
    }

    if (problems.length) findings.push({ sourceId: source.id, name: source.shortName || source.name, url: source.url, problems });
  }

  if (openMeteo) {
    const observedAt = Date.parse(openMeteo.lastSuccessAtUtc || '');
    if (!Number.isFinite(observedAt)) {
      runtimeChecks.push({
        name: 'Open-Meteo',
        status: 'SIN_DATOS_VIVOS',
        detail: `Sin respuestas exitosas registradas en esta sesión (${openMeteo.syncedLocationCount}/${openMeteo.totalLocationCount} comunas).`
      });
    } else {
      const ageMinutes = Math.max(0, (now - observedAt) / 60000);
      const ttlMinutes = sources.find((source) => source.id === 'openmeteo-multi')?.ttlMinutes;
      const stale = Number.isFinite(ttlMinutes) && ageMinutes > ttlMinutes;
      const partial = openMeteo.syncedLocationCount < openMeteo.totalLocationCount;
      runtimeChecks.push({
        name: 'Open-Meteo',
        status: stale ? 'TTL_VENCIDO' : partial ? 'COBERTURA_PARCIAL' : 'RESPUESTA_RECIENTE',
        detail: `${openMeteo.syncedLocationCount}/${openMeteo.totalLocationCount} comunas con respuesta; última: ${new Date(observedAt).toISOString()} (${Math.floor(ageMinutes)} min).`
      });
      if (stale) {
        findings.push({
          sourceId: 'openmeteo-multi',
          name: 'Open-Meteo · sesión actual',
          url: sources.find((source) => source.id === 'openmeteo-multi')?.url,
          problems: [`La última respuesta observada supera el TTL de ${ttlMinutes} min.`]
        });
      }
    }
  }

  return {
    checkedAtUtc,
    sourceCount: sources.length,
    findings,
    runtimeChecks,
    reviewRequired: findings.length > 0 || runtimeChecks.some((check) => check.status !== 'RESPUESTA_RECIENTE')
  };
}
