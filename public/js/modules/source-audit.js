export function auditSourceCatalog(sources, { now = Date.now(), openMeteo = null, ingestion = [] } = {}) {
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

  for (const source of ingestion) {
    const lastSuccess = Date.parse(source.lastSuccessAtUtc || '');
    const ageMinutes = Number.isFinite(lastSuccess) ? Math.floor((now - lastSuccess) / 60000) : null;
    const stale = ageMinutes === null || ageMinutes > (source.ttlMinutes ?? 60);
    runtimeChecks.push({
      name: source.name,
      status: source.status === 'NOT_CONFIGURED' ? 'NO_CONFIGURADA'
        : source.status === 'ERROR' ? 'FUENTE_NO_DISPONIBLE'
          : source.status === 'STALE' ? 'DATOS_DESACTUALIZADOS'
        : source.status === 'REVIEW' ? 'DATOS_REQUIEREN_REVISION'
          : source.status === 'PARTIAL' ? 'DATOS_PARCIALES'
          : stale ? 'SIN_RESPUESTA_RECIENTE' : 'RESPUESTA_RECIENTE',
      detail: ageMinutes === null
        ? source.status === 'NOT_CONFIGURED'
          ? `Conector sin credenciales configuradas. ${source.lastError || ''}`.trim()
          : `Sin respuesta exitosa registrada; último intento: ${source.lastAttemptAtUtc || 'sin datos'}. ${source.lastError || ''}`.trim()
        : `Última respuesta hace ${ageMinutes} min; ${source.successCount || 0} éxitos y ${source.failureCount || 0} fallos en esta sesión.${source.lastError ? ` Último error: ${source.lastError}` : ''}`
    });
  }

  return {
    checkedAtUtc,
    sourceCount: sources.length,
    findings,
    runtimeChecks,
    reviewRequired: findings.length > 0 || runtimeChecks.some((check) => check.status !== 'RESPUESTA_RECIENTE')
  };
}
