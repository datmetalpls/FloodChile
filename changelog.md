# Changelog — FloodChile (ClimasFlood) 🇨🇱

Todos los cambios notables en este proyecto están documentados en este archivo.
El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.0] - 2026-10-20

### Agregado
- **Menú Lateral de Navegación Arquitectónica (Sidebar)**: Refactorización integral del layout según el framework de `agency-ux-architect`. La interfaz se organiza en un shell de dos columnas (`.app-shell`) con menú lateral colapsable (`#appSidebar`), categorizando las 9 secciones en 4 áreas temáticas: *Monitoreo en Vivo*, *Pronóstico e Hidrología*, *Riesgo y Alertas* y *Modelos y Gobernanza*.
- **Sistema de Capas en Eje Z**: Formalización de escala de elevación en variables CSS (`--z-base`, `--z-canvas`, `--z-surface`, `--z-overlay`, `--z-sidebar`, `--z-header`, `--z-modal`) con sombras multicapa y microbordes translúcidos *glassmorphic*.
- **Descongestión Visual y Progresión de Contenido**: Reducción de la carga cognitiva eliminando bloques redundantes de texto denso, encapsulando metodologías secundarias en elementos colapsables `<details class="methodology-details">` y priorizando métricas hidrometeorológicas legibles en chips.
- **Acceso rápido y anclajes en sidebar**: Integración directa del selector comunal, switch de Modo Ciudadano $\leftrightarrow$ Técnico y badges de estado (`EN VIVO 15/15`, conteo de alertas activas y cola HITL) en el menú lateral.

---

## [1.3.0] - 2026-10-20

### Agregado
- **Soporte de Web Push Nativo en Navegador y PWA**: Integración de la Web Notification API con listeners de `push` y `notificationclick` en `public/sw.js`.
- **Disparo de Notificaciones tras Firma HITL**: Cuando un supervisor meteorológico aprueba una alerta crítica en la cola `HITL-201`, se despacha automáticamente una notificación nativa del sistema operativo con vibración y sonido al dispositivo.
- **Botón de Activación y Prueba Web Push**: En la sección de alertas, indicador de estado de permisos (`webPushPermissionBadge`) y botón para disparar pruebas reales en escritorio o móvil.
- **Perfil Satelital NASA GIBS GOES-East GeoColor**: Incorporación de la capa `GOES-East_ABI_GeoColor` (PNG, Level 7) en tiempo casi real (cada 10 min) con luz visible diurna y combinación infrarroja multiespectral nocturna, sumándose a la Banda 13 IR Limpio (10.3 µm) y VIIRS Color Verdadero (250m).

---

## [1.2.0] - 2026-10-20

### Agregado
- **Diagramas de Arquitectura y Producto en Alta Definición (`docs/images/`)**: 4 esquemas SVG diseñados con estética dark UI, *glassmorphism* y tuberías de datos luminosas:
  - `architecture.svg`: Flujo de APIs externas $\rightarrow$ proxy caché $\rightarrow$ cliente PWA.
  - `dashboard-map.svg`: Interfaz de mapa con plataforma oceánica, plumas convectivas y línea de tiempo.
  - `satellite-viewer.svg`: Consola satelital con cortina divisoria interactiva `⇄` y escala de temperatura IR (-75 °C a +25 °C).
  - `hydro-risk.svg`: Bandas probabilísticas P10–P50–P90 y perfil orográfico de los Andes con isoterma 0 °C elevada.
- **Banner Oficial de Repositorio**: `floodchile-banner.png` con render 3D topográfico de Chile y pluma de río atmosférico.
- **Documentación Completa en [README.md](./README.md)**: Guía paso a paso de instalación, ejecución, Docker, variables de entorno y endpoints de la API.
- **Licencia MIT**: Archivo `LICENSE` oficial y declaración en `package.json` para libre uso comunitario, académico y comercial.

### Cambiado
- **Purga de Prompts en Git**: Eliminación definitiva de archivos de prompts del historial de commits (`git filter-branch`) y configuración de exclusión en `.gitignore`.

---

## [1.1.0] - 2026-10-19

### Agregado
- **Sincronización Automática Nacional (15/15 Comunas)**: Ingesta en tiempo real con Open-Meteo, GloFAS River Discharge y Marine API al abrir la aplicación y cada 30 minutos.
- **Proxy con Caché TTL en Servidor (`GET /api/open-meteo/sync`)**: Almacenamiento en memoria de 15 minutos (`LOC_CACHE_TTL_MS`) en `server.js` que reduce la latencia, elimina bloqueos por cuotas de IP y mantiene el feed GeoJSON actualizado.
- **Endpoint GeoJSON Abierto (`GET /api/carto/chile-meteo.geojson`)**: Generador dinámico para CARTO Builder, QGIS y clientes GIS externos.
- **Buscador Instantáneo de Comunas y Cuencas**: Campo `#communeSearchInput` con datalist en la cabecera.
- **Herramientas Ciudadanas de Terreno**: Botones **📍 Cerca de mí** (geolocalización local por radio de distancia) y **🔗 Compartir vista** con *deep linking* (`?loc=&capa=&h=&vista=`).
- **PWA Offline**: `manifest.json` y `sw.js` con estrategia *Network-First + Cache Fallback* para operar durante catástrofes con caída de señal móvil.
- **Superposición Satelital Real en Mapa**: NASA GIBS WMTS (`GOES-East_ABI_Band13_Clean_Infrared` y `VIIRS_SNPP_CorrectedReflectance_TrueColor`) junto a RainViewer.

### Optimizado
- **Rendimiento de Marcadores Leaflet**: Reutilización de nodos DOM mediante `this.leafletMarkerMap` y `setIcon()`, eliminando el parpadeo en la reproducción horaria (`+0h` a `+72h`).
- **Seguridad**: Sanitización XSS obligatoria con `escapeHtml()` en popups GeoJSON y validación estricta de protocolos HTTPS en iframes de CARTO.

---

## [1.0.0] - 2026-10-19

### Agregado
- **Lanzamiento Inicial de ClimasFlood Chile**:
  - Cobertura de las 16 regiones de Chile (continental, austral e insular) y sus 3 husos horarios (`America/Santiago`, `America/Punta_Arenas`, `Pacific/Easter`).
  - Mapa nacional interactivo con 6 capas (Precipitación, Temperatura, Viento, Nubosidad, Nieve/Isoterma y Alertas).
  - Visor satelital GOES-16 por fotogramas con cortina comparativa Antes/Ahora.
  - Pronósticos probabilísticos con bandas de incertidumbre P10–P50–P90.
  - Separación estricta entre Alertas Oficiales (SENAPRED / DMC / SHOA) y Estimaciones Preventivas de la App (CA-01).
  - Escenarios hidrometeorológicos plausibles con factores de respaldo y señales de cambio.
  - Registro de verificación histórica (Predicho vs. Observado).
  - Pipeline de Agentes IA con trazabilidad 100% de evidencia y bloqueo obligatorio *Human-in-the-Loop (HITL)*.
  - Suite de pruebas de aceptación automatizada (`tests/verify-criteria.js` para CA-01 a CA-09).
