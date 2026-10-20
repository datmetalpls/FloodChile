# FloodChile (ClimasFlood) 🇨🇱🌧️

Plataforma abierta de meteorología operacional, pronóstico hidrometeorológico (P10–P50–P90), monitoreo de isoterma 0 °C y anticipación de riesgos para las 16 regiones de Chile (continental, austral e insular).

Distribuido bajo licencia **MIT** de libre uso.

## Características principales

- **Datos en vivo por defecto (15 comunas representativas)**: Sincronización automática con **Open-Meteo Forecast API**, **GloFAS River Discharge API** y **Open-Meteo Marine API** al abrir la aplicación y cada 30 minutos, respaldada por caché TTL de 15 minutos en el servidor (`GET /api/open-meteo/sync`).
- **Mapa Nacional Multicapa (Leaflet + Canvas)**: 6 capas interactivas (Precipitación, Temperatura, Viento, Nubosidad, Nieve e Isoterma 0 °C, y Alertas) con reproducción por pasos horarios (`+0h` a `+72h`).
- **Imágenes Satelitales Reales (NASA GIBS WMTS + RainViewer)**: Superposición en vivo de **NOAA GOES-East Banda 13 Infrarrojo Limpio** (`GOES-East_ABI_Band13_Clean_Infrared`), **VIIRS Color Verdadero** y **RainViewer Radar/IR**, además de visor comparativo Antes/Ahora.
- **Integración GeoJSON / CARTO Builder**: Endpoint `GET /api/carto/chile-meteo.geojson` listo para conectar en vivo con CARTO Builder, QGIS o clientes GIS externos.
- **Honestidad Epistémica y Seguridad Ciudadana**: Separación estricta entre **Alertas Oficiales (SENAPRED / DMC / SHOA)** y **Estimaciones Preventivas por Umbral**, rangos probabilísticos `P10–P50–P90`, trazabilidad 100% de agentes IA con bloqueo *Human-in-the-Loop (HITL)* y soporte **PWA Offline**.

## Requisitos e Instalación

Solo requiere **Node.js >= 18** (cero dependencias externas de npm).

```bash
# Iniciar el servidor local (por defecto en http://localhost:4173)
npm start

# Ejecutar la suite de verificación de criterios de aceptación (CA-01 a CA-09)
npm test
```

## Estructura del Proyecto

- `server.js`: Servidor HTTP nativo con proxy caché TTL para Open-Meteo (`/api/open-meteo/sync`) y generador GeoJSON en vivo (`/api/carto/chile-meteo.geojson`).
- `public/`: Aplicación web progresiva (PWA) con soporte offline (`manifest.json`, `sw.js`), estilos (`css/styles.css`) y módulos ES (`js/app.js`, `js/modules/map-engine.js`, `js/modules/satellite-viewer.js`, `js/modules/live-api.js`, `js/data/chile-data.js`).
- `docs/propuesta-tecnica.md`: Especificación de arquitectura, modelo de datos e invariantes de honestidad epistémica.
- `tests/verify-criteria.js`: Suite automatizada de validación de criterios de aceptación (`CA-01` a `CA-09`).

## Licencia

Este proyecto está licenciado bajo la [Licencia MIT](./LICENSE) — libre para usar, modificar y distribuir.
