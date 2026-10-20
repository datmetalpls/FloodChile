# DESIGN.md — Sistema de Diseño Cartográfico y Editorial de ClimasFlood

> Especificación visual y técnica alineada con **Impeccable (`pbakaus/impeccable`)**, **ArchitectUX (`agency-ux-architect`)** y **UI Finish-Gate Reviewer (`agency-ui-finish-gate-reviewer`)**.

## 1. Design Contract (Contrato de Interfaz)

- **User + Job:** Ciudadanos y operadores de emergencia en Chile que necesitan comprender condiciones meteorológicas actuales, evolución de sistemas frontales en movimiento e incertidumbre hidrometeorológica (lluvia e isoterma 0 °C) sin ruido visual.
- **First-Read Object:** El **Mapa Dinámico Animado de Chile (Leaflet + Canvas de Partículas Meteorológicas a 60 FPS)** integrado junto al **Resumen de Situación Comunal en Lenguaje Claro**.
- **Primary Action:** Reproducir la animación temporal del mapa (`▶ Animar Evolución Frontal` / deslizador horario $t_0 \to +48\text{h}$), conmutar capas físicas y seleccionar comuna.
- **Density Decision:** **Equilibrada y jerárquica (Balanced Operational)**. Las vistas ciudadanas priorizan lectura inmediata y recomendaciones claras; las tablas técnicas se agrupan limpiamente con tipografía monoespaciada tabular (`tabular-nums`).
- **Interaction Model:** Lienzo geoespacial vivo con partículas fluidas de viento/lluvia + paneles limpios de un solo nivel de profundidad (sin anidación excesiva de tarjetas).
- **Theme System (`ArchitectUX` Default Requirement):** Soporte nativo **Claro (Cartografía Día — Papel Cálido)**, **Oscuro (Radar Nocturno — Pizarra Profunda)** y **Sistema (`prefers-color-scheme`)**, más modo de verificación **Escala de Grises (WCAG AA CA-06)**.

## 2. Reglas Anti-Slop de Impeccable Aplicadas (`pbakaus/impeccable`)

1. **`no-overused-font`:** Se prohíbe `Inter` o `Arial` como fuente única. Se utiliza **`Plus Jakarta Sans`** para cuerpo e interfaz humana, **`Space Grotesk`** para titulares y cifras principales, y **`JetBrains Mono`** para telemetría, coordenadas, cotas de isoterma $0\,^\circ\text{C}$ y códigos de evidencia.
2. **`no-nested-cards` (Anti-Cardocalypse):** Prohibido anidar tarjetas dentro de tarjetas con múltiples bordes y sombras. Se emplean superficies limpias con divisores sutiles (`1px solid var(--border-subtle)`) y agrupación por espaciado.
3. **`no-identical-card-grids`:** Se eliminan las filas de 4 tarjetas KPI idénticas que compiten por la misma atención. La jerarquía distingue un bloque protagonista de situación comunal frente a indicadores secundarios compactos.
4. **`no-side-tab-on-non-alerts`:** Los bordes laterales gruesos (`border-left`) se reservan **exclusivamente** para alertas meteorológicas reales donde comunican severidad (`Informativa`, `Preventiva`, `Temprana`, `Extrema`); nunca como decoración en bloques de texto comunes.
5. **`no-pure-black-or-neon-glow`:** Todos los tonos oscuros y claros están entintados con matices oceánicos/andinos (`#0b1320`, `#f6f7f9`), sin resplandores neón ni gradientes púrpura-cian artificiales.
6. **`purposeful-motion`:** Nada rebota con `elastic` easing ni parpadea sin motivo. El movimiento pertenece a los datos reales: partículas de flujo de viento, desplazamiento de bandas de lluvia sobre el mapa y barrido satelital GOES-16.

## 3. Tokens del Sistema de Diseño

### Tipografía
- `--font-sans`: `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif`
- `--font-display`: `'Space Grotesk', 'Plus Jakarta Sans', sans-serif`
- `--font-mono`: `'JetBrains Mono', ui-monospace, SFMono-Regular, monospace`

### Escala Tipográfica
- `--text-xs`: `0.75rem` (12px — metadatos y etiquetas técnicas)
- `--text-sm`: `0.875rem` (14px — tablas, controles y notas de procedencia)
- `--text-base`: `1rem` (16px — lectura fluida de escenarios y medidas preventivas)
- `--text-lg`: `1.125rem` (18px — subtítulos de módulos)
- `--text-xl`: `1.35rem` (21.6px — encabezados de sección)
- `--text-2xl`: `1.75rem` (28px — temperatura y acumulado principal comunal)

### Paleta Semántica (Light & Dark Themes)
- **Light Theme (Día / Terreno):**
  - `--bg-canvas`: `#f4f6f8` (Gris mineral andino muy claro)
  - `--bg-surface`: `#ffffff`
  - `--bg-subtle`: `#eef2f6`
  - `--text-primary`: `#0f172a`
  - `--text-secondary`: `#334155`
  - `--text-muted`: `#64748b`
  - `--action-primary`: `#0369a1`
- **Dark Theme (Monitoreo / Radar):**
  - `--bg-canvas`: `#0b121e`
  - `--bg-surface`: `#111c2d`
  - `--bg-subtle`: `#17253b`
  - `--text-primary`: `#f1f5f9`
  - `--text-secondary`: `#cbd5e1`
  - `--text-muted`: `#94a3b8`
  - `--action-primary`: `#0284c7`

### Radios y BordesPermitidos
- `--radius-sm`: `6px` (botones, píldoras, inputs)
- `--radius-md`: `10px` (paneles y contenedores de mapa)
- `--radius-lg`: `14px` (contenedor principal de situación)
