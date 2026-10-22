# Ingesta de fuentes oficiales

## Conectores disponibles

| Fuente | Endpoint local | Tipo | Caché | Límite conocido |
|---|---|---|---:|---|
| Catálogo EMA DMC | `/api/dmc/estaciones` | Catálogo de estaciones y coordenadas | 15 min | No contiene observaciones; requiere `DMC_API_USER` y `DMC_API_TOKEN`. |
| Ficha de estación DMC | `/api/dmc/estaciones/330020` | Metadatos, coordenadas y vigencia | 6 h | Requiere credenciales DMC. Tolera el bloque de depuración `getModelo` que DMC antepone al JSON; rechaza otros cuerpos no JSON. |
| DMC EMA | `/api/dmc/observaciones?estacion=330020` | Observación de estación | 15 min | Requiere configurar `DMC_API_USER` y `DMC_API_TOKEN` en el entorno del servidor. |
| CONAF | `/api/conaf/incendios` | Reporte estadístico agregado | 4 min | Tabla HTML, conteos reportados por región; no es feed de alertas ni de focos geolocalizados. |
| Estado de ingesta | `/api/ingestion/status` | Salud de conectores desde el arranque | Sin caché | Contadores de sesión, no monitor externo continuo. |
| Historial | `/api/ingestion/history?source=dmc-meteochile&dias=7` | Registros normalizados | Máx. 30 días | Máx. 5.000 registros devueltos por consulta. |

Para desarrollo local, copia `.env.example` a `.env`, completa `DMC_API_USER` con el correo asociado a la cuenta DMC y `DMC_API_TOKEN` con la API key, y reinicia el servidor. `.env` está ignorado por Git. En producción, configura ambas como secretos de entorno.

Los registros tienen `schemaVersion`, fuente, entidad, tipo, hora UTC de descarga, tiempo reportado por la fuente (si lo entrega), valores, unidades, URL y resultado QC. `validAt` queda vacío cuando la fuente no identifica una hora de medición inequívoca. No se rellena con la hora de consulta. El servicio DMC vigente usa `getDatosRecientesEma/{código}`; el usuario y token se mantienen solo en el entorno del servidor, nunca en el navegador ni en Git.

## Calidad y degradación

- DMC valida rangos físicos de temperatura, humedad, viento, dirección y precipitación. Una respuesta vacía o valores fuera de rango quedan en revisión; campos faltantes se marcan como parciales. Si no se configuran las credenciales, `/api/ingestion/status` devuelve `NOT_CONFIGURED` y la interfaz informa ese estado.
- CONAF compara el total diario nacional con la suma regional. Un descuadre se guarda como `REVIEW`; el reporte se mantiene claramente como cifra publicada, no como evaluación de peligro.
- Errores de red se reflejan en `/api/ingestion/status`. CONAF puede servir una copia local de hasta una hora, siempre con `stale: true`.
- Ninguno de estos datos activa sirena, Web Push o alertas oficiales. La interfaz conserva las citas a los portales originales.

## Persistencia y operación

El backend agrega NDJSON diario en `data/ingestion/` y elimina archivos con más de 30 días. La ruta puede apuntar a un volumen persistente con `CLIMASFLOOD_DATA_DIR`; debe ser un directorio exclusivo para esta aplicación. La carpeta de datos local está ignorada por Git.

Este almacén funciona para una instancia Node con volumen persistente y volumen moderado. Para varias réplicas, concurrencia alta o requisitos de recuperación, migrar el mismo contrato a Postgres/almacenamiento gestionado antes de escalar horizontalmente; el sistema actual no implementa coordinación entre instancias.

## Fuentes revisadas y pendientes

- La documentación vigente del [servicio DMC getDatosRecientesEma](https://climatologia.meteochile.gob.cl/application/documentacion/getDocumento/2) define la consulta por estación y requiere usuario/token. El endpoint antiguo `application/productos/emaResumenDiario` devolvió 404 al validar rutas anteriores.
- La [DGA](https://dga.mop.gob.cl/sistema-hidrometrico-en-linea/) publica datos de 1.330 estaciones, en su mayoría cada hora, con carácter provisional. Su visor HIDROlínea bloqueó el acceso automatizado de esta revisión; no se inventa ni se llama un endpoint no documentado.
- [CONAF](https://www.conaf.cl/mapas-incendios-forestales/ocurrencia-nacional.htm) expone un reporte nacional HTML con frecuencia declarada de cinco minutos.
- El portal [SENAPRED Alertas](https://senapred.cl/alertas/) no proporcionó una lista scrapeable al revisar; el calendario [Pruebas SAE](https://www.senapred.gov.cl/pruebas-sae/) es de simulacros y no un feed Cell Broadcast.
- El conector de fuentes operativo que se añadió en Agentes es determinista, de solo lectura y bajo demanda; no es un LLM ni envía recomendaciones de emergencia. Los demás perfiles continúan siendo demostraciones.
