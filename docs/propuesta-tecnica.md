# Propuesta Técnica: Sistema Nacional de Meteorología y Anticipación de Riesgos para Chile (`ClimasFlood`)

Esta propuesta responde íntegramente a los requerimientos definidos en [prompt-app-meteorologia-chile.md](file:///Users/dmp/Desktop/proyectos/ClimasFlood/prompt-app-meteorologia-chile.md), estableciendo una base rigurosa, auditable y sin invención de APIs inexistentes para construir la plataforma nacional de monitoreo meteorológico, pronóstico y anticipación de riesgos hidrometeorológicos en Chile.

> **Estado:** documento de arquitectura objetivo. Describe capacidades planeadas; no implica que el cliente actual consulte ensambles multimodelo, calcule percentiles o ejecute los servicios descritos.

> [!IMPORTANT]
> **Principio Rector de Epistemología de Datos:** La plataforma distingue de forma estricta e inequívoca a nivel de base de datos, API y visualización entre cuatro categorías de información:
> 1. **Observación (`OBSERVATION`):** Medición instrumental real (estación meteorológica/fluviométrica o sensor satelital) con estampa de tiempo pasada.
> 2. **Pronóstico Numérico (`FORECAST`):** Salida determinista o por ensambles (EPS) de modelos numéricos de predicción (NWP como ECMWF, GFS, ICON, WRF), expresada siempre con ventana temporal e incertidumbre/rango.
> 3. **Estimación / Escenario (`SCENARIO_ESTIMATE`):** Inferencia hidrometeorológica derivada (ej. altura de isoterma 0 °C combinada con precipitación líquida en cuenca andina) presentada como escenario plausible sujeto a condiciones de cambio.
> 4. **Alerta (`OFFICIAL_ALERT` vs `INTERNAL_ADVISORY`):** Separación taxativa entre alertas legales emitidas por autoridades del Estado de Chile (DMC, SENAPRED, DGA, SHOA) y avisos preventivos calculados por umbrales en la aplicación.

---

## 1. Propuesta de Arquitectura y Componentes Principales

La arquitectura sigue un diseño **modular, orientado a eventos y preparado para agentes (Agent-Ready)**, desacoplando la adquisición de datos heterogéneos del motor de servicio geoespacial y de la interfaz de usuario.

```mermaid
flowchart TD
    subgraph Fuentes["Fuentes de Datos Reales y Verificables"]
        DMC["DMC (MeteoChile API / RSS / CAP)"]
        SENAPRED["SENAPRED / DGA / SHOA ( Feeds Públicos / Visores )"]
        NWP["Modelos Globales Open-Meteo (ECMWF IFS, GFS, ICON)"]
        SAT["Satélite GOES-East (NOAA AWS S3 / NASA GIBS WMTS / RainViewer)"]
        CR2["Datos Históricos (CR2 / CAMELS-CL)"]
    end

    subgraph Ingesta["Capa de Ingestión, Validación y Normalización"]
        Connectors["Conectores Adaptadores con Circuit Breaker"]
        Validator["Validador de Esquema, Frescura (TTL) y Control de Calidad (QC)"]
        Normalizer["Normalizador Geoespacial (CUT Comunal / Regiones / Cuencas BNA)"]
    end

    subgraph Storage["Capa de Persistencia Políglota"]
        PostGIS["PostgreSQL + PostGIS + TimescaleDB (Series, Geometrías, Alertas, Auditoría)"]
        TileCache["Caché de Teselas / COG (Cloud Optimized GeoTIFF / Vector Tiles)"]
        AuditLog["Registro Inmutable de Predicciones vs. Observaciones + Trazas IA"]
    end

    subgraph Core["Servicios de Dominio y Motor Analítico"]
        ForecastSvc["Servicio de Pronóstico Multi-Modelo e Incertidumbre"]
        AlertSvc["Motor de Alertas Oficiales y Umbrales Preventivos"]
        ScenarioEngine["Motor de Escenarios Hidrometeorológicos (Isoterma 0°C, Crecidas, Viento)"]
        VerifySvc["Motor de Verificación Histórica (Brier / MAE / RMSE)"]
    end

    subgraph AgentLayer["Capa de Agentes de IA (Aislada con Guardrails + HITL)"]
        MonitorAgent["Agente Monitor de Fuentes y Anomalías"]
        ModelDiffAgent["Agente Analista de Divergencia de Modelos"]
        BriefingAgent["Agente Generador de Boletines Trazables"]
        HITL["Cola de Supervisión Humana (Human-in-the-Loop)"]
    end

    subgraph Frontend["Cliente Web Responsivo y Accesible (PWA)"]
        UI_Map["Mapa Nacional Interactivo (Capas + Línea de Tiempo)"]
        UI_Sat["Visor Satelital Animado y Comparador"]
        UI_Dash["Resumen Nacional, Pronóstico por Comuna y Escenarios"]
        UI_Alerts["Centro de Alertas y Suscripción de Notificaciones"]
    end

    Fuentes --> Connectors
    Connectors --> Validator
    Validator --> Normalizer
    Normalizer --> PostGIS
    Normalizer --> TileCache
    PostGIS --> ForecastSvc
    PostGIS --> AlertSvc
    PostGIS --> ScenarioEngine
    PostGIS --> VerifySvc
    VerifySvc --> AuditLog
    ForecastSvc --> AgentLayer
    AlertSvc --> AgentLayer
    ScenarioEngine --> AgentLayer
    AgentLayer --> HITL
    ForecastSvc --> Frontend
    AlertSvc --> Frontend
    ScenarioEngine --> Frontend
    TileCache --> UI_Map
    TileCache --> UI_Sat
    HITL --> Frontend
```

### Componentes Principales
1. **Gateway de Ingestión Resiliente:** Conectores independientes por proveedor con control de tasa (*rate-limiting*), caché local, detección de caída o atraso de fuente (*staleness detection*) y registro de linaje (`source_id`, `fetched_at`, `valid_time`, `license`).
2. **Motor Geoespacial Chileno:** Indexación territorial basada en el **Código Único Territorial (CUT)** oficial de Chile (16 regiones, 56 provincias, 346 comunas) y zonificación bioclimática/topográfica (Costa, Valle Longitudinal, Precordillera, Cordillera, Territorio Insular y Antártico).
3. **Motor de Pronóstico Multi-Modelo e Incertidumbre:** Combina salidas deterministas y de ensambles para calcular medianas y bandas intercuartiles ($P_{10}, P_{50}, P_{90}$), evitando mostrar un único número engañoso cuando los modelos divergen.
4. **Motor de Escenarios y Riesgos Hidrometeorológicos:** Evalúa combinaciones críticas específicas de la geografía chilena (ej. **río atmosférico + isoterma 0 °C alta** sobre cuencas pluvio-nivales entre Coquimbo y Biobío; marejadas por oleaje de fondo S/SW; heladas radiativas en valles centrales; viento Puelche/Raco).
5. **Subsistema de Verificación Continua:** Almacena los pronósticos emitidos a $t - 24\text{h}, t - 48\text{h}, t - 72\text{h}, t - 120\text{h}$ y los contrasta automáticamente con las observaciones reales registradas, exponiendo métricas de desempeño por zona.
6. **Orquestador de Agentes con Guardrails:** Capa opcional y desacoplada donde agentes especializados procesan datos estructurados y generan boletines con citas obligatorias (`[ref: source_id]`), bloqueados por diseño para no alterar alertas oficiales.

---

## 2. Auditoría de Fuentes de Datos, Ingestión, Validación y Alternativas Verificables

Siguiendo la instrucción estricta de **no inventar APIs ni capacidades inexistentes**, a continuación se documenta el estado real de las fuentes en Chile, sus limitaciones técnicas y las alternativas verificables que utiliza la arquitectura:

| Dominio | Fuente Oficial en Chile | Estado Real de Acceso / Limitación Técnica | Alternativa / Integración Verificable Propuesta |
| :--- | :--- | :--- | :--- |
| **Observaciones y Avisos Meteorológicos** | **DMC (Dirección Meteorológica de Chile)** – `climatologia.meteochile.gob.cl` | La documentación vigente describe el servicio `getDatosRecientesEma/{código}` y requiere usuario/token. Las rutas antiguas de productos EMA comprobadas durante esta revisión devolvieron 404. No se validó aquí un feed CAP o de activación SAE. | El servidor consulta el endpoint documentado mediante `DMC_API_USER` y `DMC_API_TOKEN` configurados como secretos de entorno. Si faltan, reporta `NOT_CONFIGURED`; no hace llamadas a DMC ni expone credenciales al navegador. La normalización conserva tiempo de medición y hora de generación por separado. |
| **Pronóstico Numérico por Comuna y Grilla** | **DMC (Modelo WRF)** | Las salidas numéricas horarias en grilla de la DMC solo se publican como imágenes estáticas en su web; no existe API pública de consulta por coordenada con cuantiles de incertidumbre. | Uso de **Open-Meteo API** (`api.open-meteo.com/v1/forecast` y `/v1/ensemble`), 100% abierta y verificable sin API key para uso no comercial, consultando simultáneamente **ECMWF IFS (9 km)**, **NOAA GFS (25 km)** y **DWD ICON** sobre las coordenadas de las 346 comunas de Chile. Permite calcular dispersión inter-modelo real. |
| **Alertas de Emergencia y Protección Civil** | **SENAPRED** (`senapred.cl`) | La página `/alertas/` consultada entrega una aplicación JavaScript y no una lista HTML legible por el raspador. Sus páginas de comunicados pueden enlazarse; la agenda de pruebas SAE es de simulacros, no una fuente de activaciones. No se encontró feed público que permita leer Cell Broadcast desde esta app. | El scraper conserva enlaces solo cuando logra extraer publicaciones; no interpreta contenido, vigencia o zonas y no se presenta como detector SAE. Las alertas oficiales vigentes se consultan en el portal de SENAPRED. |
| **Hidrología, Caudales y Embalses** | **DGA – MOP** (Dirección General de Aguas) | La DGA informa que sus datos de estaciones en línea son provisionales y sujetos a cambios. El visor HIDROlínea está disponible al público, pero no se validó un endpoint estructurado y abierto utilizable por este servidor. | Los caudales que muestra actualmente la app provienen de Open-Meteo Flood/GloFAS y son pronóstico de modelo, no observaciones de estaciones DGA. Integrar mediciones DGA después de verificar endpoint, códigos, unidades y vigencia. |
| **Incendios forestales** | **CONAF** – informe estadístico nacional | Publica un informe HTML nacional con tablas regionales; el portal declara actualización cada 5 minutos. Es un conteo agregado reportado, no un feed geolocalizado de focos ni una alerta oficial para la app. | Conector de lectura de tabla HTML con caché local de 4 minutos, control de consistencia entre totales y regiones, sello del informe y estado de fuente. |
| **Imágenes Satelitales y Radar de Lluvia** | **DMC / GOES-16 (GOES-East)** | Chile no cuenta con una red nacional pública abierta de radares Doppler meteorológicos de cobertura continua; la observación espacial depende del satélite **NOAA GOES-16 (GOES-East)** Sector Sudamérica. | 1. **Imágenes Satelitales Reales:** Consumo directo de teselas WMTS abiertas de **NASA GIBS** (`gibs.earthdata.nasa.gov`, capas `GOES-East_ABI_Band2_Red_Visible_1km`, `Band13_Clean_Infrared`, `GeoColor`) y buckets públicos de **NOAA GOES-16 en AWS S3** (`noaa-goes16`).<br>2. **Secuencia Animada de Precipitación/Infrarrojo:** API pública de **RainViewer** (`api.rainviewer.com/public/weather-maps.json`) que provee mosaicos temporales animados de cobertura infrarroja satelital y precipitación estimada global con marcas de tiempo exactas. |
| **Marejadas y Alertas Costeras** | **SHOA / DIRECTEMAR** (`marejadas.shoa.cl`, `sitport.directemar.cl`) | El modelo marino de Open-Meteo está conectado; no se confirmó durante esta revisión una API pública GET de SHOA/CENDHOC consumible desde el backend. | Mantener el modelo identificado como pronóstico y los avisos como enlaces oficiales. No fusionar ambas fuentes como una observación oficial. |

### Estrategia de Validación y Actualización (Pipeline QA/QC)
1. **Frecuencia de actualización (Polling & TTL):**
   - Capas satelitales e infrarrojas: cada **10–15 minutos** (TTL máximo: 30 min).
   - Observaciones de superficie y alertas: cada **15 minutos** (TTL máximo: 45 min).
   - Pronósticos numéricos horarios/diarios (ECMWF/GFS/ICON): cada **1 a 3 horas** según ciclo sinóptico (00Z, 06Z, 12Z, 18Z; TTL máximo: 6 horas).
   - Pronósticos hidrológicos (GloFAS): cada **12–24 horas**.
2. **Reglas de Control de Calidad (QC Automático):**
   - *Rango físico plausible para Chile:* Temperatura $\in [-40\,^\circ\text{C}, +48\,^\circ\text{C}]$, Precipitación horaria $\in [0, 150\,\text{mm/h}]$, Viento $\in [0, 280\,\text{km/h}]$, Altitud de isoterma $0\,^\circ\text{C} \in [0, 6500\,\text{m s.n.m.}]$.
   - *Coherencia temporal y espacial:* Detección de saltos espurios ($>15\,^\circ\text{C}$ en 10 min en una misma estación) marcados con bandera `QC_SUSPECT`.
   - *Degradación elegante (Graceful Degradation):* Si una fuente supera su TTL sin actualizarse, el registro pasa a estado `STALE` (Desactualizado), manteniendo visible el último dato válido con un sello visual de advertencia indicando exactamente hace cuántos minutos/horas se obtuvo.

---

## 3. Modelo de Datos (Pronósticos, Observaciones, Escenarios y Alertas)

El modelo de datos garantiza trazabilidad completa (`DataProvenance`), cuantificación de incertidumbre y separación estricta entre datos oficiales e inferencias.

```mermaid
erDiagram
    TERRITORIAL_UNIT ||--o{ OBSERVATION : "registra"
    TERRITORIAL_UNIT ||--o{ FORECAST_SERIES : "proyecta"
    TERRITORIAL_UNIT ||--o{ ALERT_ITEM : "afecta"
    TERRITORIAL_UNIT ||--o{ RISK_SCENARIO : "evalua"
    DATA_SOURCE ||--o{ OBSERVATION : "provee"
    DATA_SOURCE ||--o{ FORECAST_SERIES : "genera"
    DATA_SOURCE ||--o{ ALERT_ITEM : "emite"
    FORECAST_SERIES ||--o{ FORECAST_VERIFICATION : "audita"

    TERRITORIAL_UNIT {
        string cut_code PK "Código Único Territorial (ej. 13101 Santiago)"
        string name "Nombre Comuna o Zona"
        string region_code "Código Región (01 a 16)"
        string macrozone "Norte Grande, Norte Chico, Centro, Sur, Austral, Insular"
        string timezone "America/Santiago | America/Punta_Arenas | Pacific/Easter"
        float lat
        float lon
        int elevation_m "Altitud media m s.n.m."
    }

    DATA_SOURCE {
        string source_id PK "ej. dmc-ema, openmeteo-ecmwf, noaa-goes16, senapred"
        string organization "Organismo responsable"
        string source_type "OFFICIAL_GOV | NWP_GLOBAL | SATELLITE | INTERNAL_ENGINE"
        string url_reference "URL pública verificable"
        timestamp last_fetched_at
        string health_status "ONLINE | DEGRADED | STALE | OFFLINE"
        int expected_update_minutes
    }

    OBSERVATION {
        string obs_id PK
        string cut_code FK
        string station_id
        string source_id FK
        timestamp observed_at_utc
        float temp_c
        float precip_1h_mm
        float wind_speed_kmh
        float wind_dir_deg
        float pressure_hpa
        string qc_flag "VALID | SUSPECT | ESTIMATED"
    }

    FORECAST_SERIES {
        string forecast_id PK
        string cut_code FK
        string source_id FK
        timestamp model_run_utc "Ciclo del modelo (ej. 2026-10-19T12:00Z)"
        timestamp valid_time_utc "Hora proyectada"
        float temp_p10_c "Percentil 10 (incertidumbre baja)"
        float temp_p50_c "Mediana esperada"
        float temp_p90_c "Percentil 90 (incertidumbre alta)"
        float precip_prob_pct "Probabilidad de precipitación (0-100%)"
        float precip_p50_mm "Acumulado mediano esperado"
        float precip_p90_mm "Escenario húmedo / extremo (P90)"
        float snow_cm "Nieve esperada (cm)"
        int freezing_level_m "Altura Isoterma 0°C (m s.n.m.)"
        float wind_speed_kmh
        float wind_gust_kmh
        int cloud_cover_pct
        float model_spread_index "Índice de divergencia entre ECMWF/GFS/ICON"
    }

    ALERT_ITEM {
        string alert_id PK
        string source_id FK
        string origin_category "OFFICIAL_AUTHORITY | APP_THRESHOLD_ESTIMATE"
        string severity_level "INFORMATIVA | PREVENTIVA | TEMPRANA | EXTREMA"
        string event_type "LLUVIA_INTENSA | ISOTERMA_ALTA | VIENTO | NIEVE | HELADA | CALOR | MAREJADA | CRECIDA"
        string title
        string description_what "Qué podría ocurrir"
        string affected_zones_text "Dónde (Regiones/Comunas/Cotas)"
        timestamp onset_utc "Cuándo inicia"
        timestamp expires_utc "Cuándo finaliza"
        string confidence_level "ALTA | MEDIA | BAJA"
        jsonb preventive_actions "Lista de medidas preventivas recomendadas"
        string official_url "Enlace directo al boletín oficial"
        timestamp issued_at_utc
    }

    RISK_SCENARIO {
        string scenario_id PK
        string cut_code FK
        string hazard_type "ALUVION_ISOTERMA | INUNDACION_URBANA | CRECIDA_RIO | NEVADA | OLA_CALOR | HELADA_AGRICOLA | MAREJADA"
        string title
        string narrative "Descripción no alarmista basada en evidencia"
        jsonb supporting_factors "Factores físicos que lo respaldan (ej. Precip > 40mm + Iso0 > 2800m)"
        string time_window "Ventana temporal estimada"
        string probability_band "BAJA (10-30%) | MODERADA (30-60%) | ALTA (>60%)"
        string confidence_level "ALTA | MEDIA | BAJA"
        jsonb invalidation_signals "Señales que cambiarían la evaluación"
    }

    FORECAST_VERIFICATION {
        string verification_id PK
        string cut_code FK
        date target_date
        int lead_time_hours "24h | 48h | 72h"
        float predicted_precip_mm
        float observed_precip_mm
        float predicted_temp_max_c
        float observed_temp_max_c
        float abs_error_temp
        float abs_error_precip
    }
```

---

## 4. Descripción de Pantallas y Flujos Principales

La interfaz está diseñada en **español de Chile**, adaptable a dispositivos móviles (equipos en terreno) y escritorio (salas de monitoreo), cumpliendo con **WCAG 2.1 AA**:

### Principios Visuales y de Accesibilidad
- **Codificación redundante (No dependencia exclusiva del color):** Cada nivel de severidad utiliza simultáneamente **Color + Icono geométrico distintivo + Etiqueta textual + Patrón de borde**:
  - `INFORMATIVA`: Azul (`#0284c7`) + Icono círculo `ℹ` + Borde continuo fino.
  - `PREVENTIVA`: Amarillo/Ámbar (`#d97706`) + Icono rombo `◆` + Borde punteado.
  - `TEMPRANA`: Naranja (`#ea580c`) + Icono triángulo `▲` + Borde discontinuo grueso.
  - `EXTREMA`: Rojo/Violeta (`#dc2626`) + Icono octágono `🛑` + Doble borde de alto contraste.
- **Sello de Procedencia Universal (Data Badge):** Todo gráfico, tarjeta o capa incluye una píldora visible con `[TIPO: OBSERVACIÓN | PRONÓSTICO | ESTIMACIÓN | ALerta OFICIAL]`, `[Fuente]`, `[Hora de emisión en huso horario local]` y `[Estado: Vigente / Desactualizado]`.
- **Manejo Multizona Horaria de Chile:** Conversión automática y explícita entre `UTC`, `America/Santiago` (Chile Continental), `America/Punta_Arenas` (Región de Magallanes y Aysén) y `Pacific/Easter` (Rapa Nui / Isla de Pascua).

### Pantallas Principales
1. **Inicio / Resumen Nacional y Selector Territorial:**
   - Cabecera con estado de conexión a fuentes, selector rápido por **Macrozona, Región y Comuna** (o geolocalización) y selector de huso horario local.
   - Tarjetas de **Condiciones Destacadas a Nivel Nacional**: sistemas frontales activos, comunas con mayor precipitación esperada en 72 h, cota de isoterma $0\,^\circ\text{C}$ máxima, y resumen de alertas vigentes separando *Oficiales* vs *Estimaciones Preventivas de la App*.
2. **Mapa Nacional Interactivo (`Vista Geoespacial`):**
   - Mapa de Chile completo con capas conmutables: **Precipitación (mm/h y acumulado)**, **Temperatura (°C)**, **Viento (rachas km/h)**, **Nubosidad (%)**, **Nieve / Isoterma 0 °C (m s.n.m.)** y **Alertas Territoriales**.
   - Control deslizador temporal (*Time Slider*) para recorrer horas futuras y tarjeta flotante con metadatos de la capa activa (fuente, corrida del modelo, última actualización y leyenda accesible).
3. **Visor de Imágenes Satelitales y Radar Infrarrojo (`Evolución de Sistemas Frontales`):**
   - Reproductor animado de secuencia satelital/infrarroja sobre el Pacífico Sur y territorio chileno (vía NASA GIBS GOES-East / RainViewer) con controles de reproducción (`Play/Pause`, velocidad, paso a paso).
   - **Modo Comparación Antes / Ahora:** Permite contrastar un cuadro anterior ($t - 1\text{h}, t - 3\text{h}$) con la captura más reciente para visualizar la velocidad de avance de un frente o núcleo convectivo.
4. **Pronóstico de los Próximos Días y Pronóstico Detallado de Lluvia:**
   - Vista de **7 días** para la comuna o región seleccionada con rangos de temperatura ($T_{\min}..T_{\max}$ y banda de incertidumbre $P_{10}..P_{90}$), viento, nieve e isoterma $0\,^\circ\text{C}$.
   - **Módulo Especial de Lluvia:** Hietograma horario y acumulado diario que grafica tanto la mediana esperada ($P_{50}$) como el rango superior ($P_{90}$), destacando ventanas de **lluvia intensa**, **nieve** o **precipitación líquida sobre nieve (riesgo de crecida)** sin presentar las estimaciones como certezas.
5. **Centro de Alertas Tempranas, Extremas y Notificaciones:**
   - Filtro por ubicación, tipo de evento y nivel (`Informativa`, `Preventiva`, `Temprana`, `Extrema`).
   - Ficha explicativa estructurada: **¿Qué podría ocurrir?**, **¿Dónde?**, **¿Cuándo?**, **Nivel de confianza**, **Medidas preventivas recomendadas** y **Enlace directo a la fuente oficial**.
   - **Configurador de Notificaciones:** Panel para suscribir alertas por comuna, tipo de fenómeno y umbral mínimo de severidad (persistido en preferencias del usuario y listo para Web Push).
6. **Posibles Escenarios Hidrometeorológicos:**
   - Tarjetas analíticas de escenarios plausibles para los próximos días (ej. *Activación de quebradas por isoterma 0 °C alta*, *Anegamiento urbano por pulso intenso de lluvia*, *Helada matinal en valles agrícolas*, *Viento fuerte costero/cordillerano*).
   - Cada escenario detalla: **Factores de respaldo con datos actuales**, **Zonas potencialmente afectadas**, **Ventana temporal**, **Probabilidad/Confianza** y **Señales que cambiarían la evaluación** (ej. *"Si el núcleo frío ingresa 4 horas más tarde o la isoterma baja de 2.200 m, el riesgo pluvial en precordillera disminuye a nivel bajo"*).
7. **Análisis Predictivo, Divergencia de Modelos e Historial de Verificación:**
   - Comparativa explícita entre modelos numéricos (**ECMWF IFS vs. NOAA GFS vs. DWD ICON**), explicando en lenguaje sencillo qué datos sustentan la predicción y por qué existe convergencia o incertidumbre.
   - **Bitácora de Verificación Histórica:** Tabla y gráfico que comparan lo que los modelos predijeron hace 24 h / 48 h / 72 h frente a lo que realmente ocurrió en la estación/comuna, calculando el error medio absoluto (MAE) para total transparencia.
8. **Consola de Agentes IA (Modo Supervisión) + Fuentes, Metodología, Privacidad y Limitaciones:**
   - Vista del pipeline de agentes con trazabilidad por cita a los datos crudos y estado de revisión humana.
   - Documentación transparente de fuentes, licencias, metodología de cálculo, política de privacidad (geolocalización procesada sin rastreo invasivo) y limitaciones conocidas.

---

## 5. Propuesta de Agentes de IA con Límites, Trazabilidad y Supervisión

La arquitectura incorpora cuatro agentes especializados que operan bajo un esquema **Determinista Primero + IA Explicativa con Citas Obligatorias (RAG Estructurado)**:

```mermaid
sequenceDiagram
    participant Data as Base de Datos / Motores NWP
    participant A1 as Agente Monitor de Fuentes
    participant A2 as Agente Divergencia Modelos
    participant A3 as Agente Detección de Cambios
    participant A4 as Agente Redactor de Resúmenes
    participant Guard as Validador de Trazabilidad y Reglas
    participant Human as Revisor Humano (HITL)
    participant Public as Interfaz Ciudadana

    Data->>A1: Telemetría de fuentes y umbrales físicos
    A1->>A2: Eventos meteorológicos relevantes detectados
    Data->>A2: Series ECMWF, GFS, ICON + Observaciones
    A2->>A3: Matriz de dispersión y cambio entre corridas (00Z vs 12Z)
    A3->>A4: Hechos verificados con IDs de evidencia [ev_id]
    A4->>Guard: Borrador de resumen con citas obligatorias [ref: ev_id]
    Guard->>Guard: Verifica que cada afirmación numérica coincida con ev_id y no use lenguaje de certeza absoluta
    alt Impacto Bajo/Informativo y 100% Verificado
        Guard->>Public: Publica resumen con etiqueta "Síntesis asistida por IA verificada"
    else Impacto Preventivo / Temprano / Extremo
        Guard->>Human: Escala a cola de Revisión Humana obligatoria
        Human->>Public: Aprueba / Edita y publica boletín
    end
```

### Catálogo de Agentes Especializados
1. **Agente Monitor de Fuentes (`SourceHealthMonitorAgent`):** Vigila latencia, caídas de endpoints (DMC, Open-Meteo, NOAA GOES, GloFAS) y anomalías de sensores (QC). Nunca inventa ni rellena datos faltantes; activa banderas de degradación y sugiere fuentes de respaldo verificables.
2. **Agente Analista de Pronósticos y Divergencia (`ForecastConvergenceAgent`):** Analiza las corridas de ECMWF, GFS e ICON. Calcula el acuerdo inter-modelo y traduce métricas estadísticas ($P_{10}, P_{50}, P_{90}$) en explicaciones comprensibles sobre la incertidumbre.
3. **Agente Detector de Cambios Relevantes (`RegimeShiftDetectorAgent`):** Compara la corrida actual del modelo con la corrida anterior ($\Delta t = -6\text{h} / -12\text{h}$) para detectar cambios bruscos (ej. aumento repentino de $+35\text{ mm}$ en precipitación proyectada o subida de $+400\text{ m}$ en la isoterma $0\,^\circ\text{C}$).
4. **Agente Generador de Resúmenes Trazables (`TraceableBriefingAgent`):** Redacta boletines ejecutivos diferenciados para ciudadanía y equipos de emergencia enlazando cada oración a un identificador de dato (`[Fuente: ECMWF 12Z | Valor: 42.5 mm]`).

### Reglas Estrictas, Límites Inquebrantables y Escalamiento (HITL)
- **Prohibición de emitir o alterar alertas oficiales:** Ningún agente tiene permisos de escritura sobre la tabla de alertas oficiales (`OFFICIAL_AUTHORITY`).
- **Prohibición de notificaciones críticas autónomas:** Los agentes no pueden disparar notificaciones de nivel `TEMPRANA` o `EXTREMA` hacia los usuarios sin la aprobación firmada de un operador humano o una regla determinista auditada.
- **Trazabilidad por afirmación (Zero-Hallucination Policy):** Todo bloque generado por un agente incluye un arreglo JSON `citations[]` que vincula cada cifra al registro exacto del modelo/observación (`source_id`, `timestamp`, `parameter`, `raw_value`). Si un validador determinista detecta una cifra sin respaldo en el payload de entrada, la salida del agente es rechazada automáticamente.
- **Lenguaje probabilístico obligatorio:** El validador bloquea frases taxativas (*"habrá inundación segura"*, *"se confirma aluvión"*) y exige formulaciones condicionales basadas en evidencia (*"los modelos estiman una probabilidad del 65% de superar los 40 mm..."*).

---

## 6. Plan de Implementación por Etapas (Roadmap)

| Etapa | Alcance Funcional | Entregables Técnicos |
| :--- | :--- | :--- |
| **Fase 1: MVP Nacional y Pronóstico Transparente** | - Mapa nacional interactivo de Chile por macrozonas/regiones/comunas con capas meteorológicas.<br>- Visor satelital animado (GOES-East / RainViewer) con comparador Antes/Ahora.<br>- Pronóstico a 7 días y pronóstico horario de lluvia con rangos de incertidumbre.<br>- Distinción visual estricta entre observación, pronóstico, estimación y alerta. | Aplicación Web responsiva (ES), integración en vivo con API abierta multi-modelo (Open-Meteo ECMWF/GFS/ICON) y mosaicos satelitales reales, con respaldo determinista verificado. |
| **Fase 2: Alertas Multi-nivel y Motor de Escenarios Hidrometeorológicos** | - Sistema de alertas en 4 niveles (`Informativa`, `Preventiva`, `Temprana`, `Extrema`) accesible sin depender solo del color.<br>- Configurador de notificaciones por comuna, evento y severidad.<br>- Generador de escenarios plausibles (isoterma $0\,^\circ\text{C}$, crecidas, heladas, viento, marejadas) con factores de respaldo y señales de invalidación. | Motor de reglas hidrometeorológicas adaptado a la geografía chilena, diferenciación entre alertas oficiales y avisos preventivos de la app, y persistencia local de suscripciones. |
| **Fase 3: Análisis Predictivo Multi-modelo y Verificación Histórica** | - Comparador explícito entre modelos numéricos (ECMWF vs. GFS vs. ICON).<br>- Registro de predicciones pasadas contrastadas con observaciones reales (MAE, sesgo, acierto de lluvia). | Subsistema de auditoría de pronósticos e interfaz de explicabilidad de incertidumbre y limitaciones de los modelos. |
| **Fase 4: Ecosistema de Agentes de IA con Trazabilidad y HITL** | - Agentes de monitoreo de fuentes, detección de cambios entre corridas y síntesis de boletines.<br>- Vinculación clicable de cada frase a su dato fuente.<br>- Flujo de revisión humana (Human-in-the-Loop) y escalamiento para eventos de alto impacto. | Consola de agentes auditable, validador de citas determinista y flujo interactivo de aprobación humana. |

---

## 7. Criterios de Aceptación Verificables

### A. Precisión y Epistemología de Datos
- [ ] **CA-01 (Separación de tipos de datos):** El 100% de las vistas (mapa, pronóstico, lluvia, alertas, escenarios) muestra una etiqueta explícita que distingue si el dato es `Observación`, `Pronóstico Numérico`, `Estimación/Escenario` o `Alerta Oficial`.
- [ ] **CA-02 (Incertidumbre obligatoria):** Todo pronóstico de lluvia y temperatura más allá de 24 horas presenta rangos ($P_{10}-P_{90}$ o banda mín/máx entre modelos) y un indicador de nivel de confianza; ninguna estimación futura se presenta como certeza absoluta.
- [ ] **CA-03 (Verificación histórica):** El módulo de Análisis Predictivo permite consultar predicciones emitidas en días previos y compararlas numérica y gráficamente contra las observaciones registradas.

### B. Actualización, Fuentes y Resiliencia
- [ ] **CA-04 (Metadatos de procedencia):** Cada capa del mapa, imagen satelital, pronóstico y alerta incluye fecha/hora de captura o corrida, huso horario local de Chile correspondiente a la ubicación, nombre de la fuente y enlace verificable.
- [ ] **CA-05 (Detección de desactualización):** Si una fuente supera su umbral de frescura (TTL) o no está disponible en línea, la interfaz señala claramente el estado `Desactualizado / Sin conexión directa` y expone la alternativa verificable sin ocultar la limitación.

### C. Accesibilidad y Experiencia de Usuario (UX)
- [ ] **CA-06 (Independencia del color):** Todos los niveles de alerta (`Informativa`, `Preventiva`, `Temprana`, `Extrema`) e intensidades de lluvia pueden identificarse en escala de grises o por lectores de pantalla mediante iconos distintos, etiquetas de texto explícitas y patrones de borde, con contraste mínimo $\ge 4.5:1$ (WCAG 2.1 AA).
- [ ] **CA-07 (Diseño responsivo en español):** La aplicación es 100% funcional en pantallas móviles (`360px` de ancho) y escritorio (`1440px+`), completamente en español y operable mediante teclado.

### D. Seguridad y Gobernanza de Agentes IA
- [ ] **CA-08 (Trazabilidad de IA):** Cada afirmación generada en el módulo de agentes exhibe una referencia verificable (`[Ref]`) que al inspeccionarse muestra el dato crudo, el modelo y la hora de emisión que la respalda.
- [ ] **CA-09 (Guardrails y supervisión humana):** Los agentes tienen bloqueada por código cualquier modificación de alertas oficiales, y toda recomendación asociada a severidad `Temprana` o `Extrema` permanece en estado `Pendiente de Revisión Humana` hasta ser aprobada explícitamente.
