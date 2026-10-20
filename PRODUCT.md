# PRODUCT.md — ClimasFlood Chile

> Durable product truth generated following the **Impeccable (`/impeccable init`)** and **UI Finish-Gate** specifications.

## 1. Product Purpose & Operating Context
**ClimasFlood Chile** es una aplicación nacional de meteorología y anticipación de riesgos hidrometeorológicos para Chile. Su propósito es transformar datos complejos (modelos numéricos globales, imágenes satelitales GOES-16, observaciones de estaciones e hidrología) en decisiones claras y oportunas tanto para la **ciudadanía** como para **equipos comunales de emergencia (COGRID / SENAPRED)**.

## 2. Primary Personas & Jobs-to-be-Done (UX Research)
1. **Ciudadanía y Sector Productivo Local (Camila, San José de Maipo / Talca — Uso móvil y escritorio):**
   - **Job principal:** Entender en menos de 10 segundos qué está ocurriendo hoy en su comuna, a qué hora ingresa el pulso de lluvia o viento más intenso, cuál es el rango probable (sin falsas certezas) y qué medidas preventivas concretas tomar.
2. **Operador de Emergencia y Monitoreo Territorial (Rodrigo, Turno Regional / Municipal — Uso escritorio y terreno):**
   - **Job principal:** Visualizar en un mapa dinámico la evolución espacial del sistema frontal, vigilar el acoplamiento entre **tasa de precipitación** y **altura de la isoterma 0 °C** en cuencas andinas, distinguir de inmediato una **Alerta Oficial (DMC/SENAPRED/SHOA)** de una **Estimación Preventiva de la App**, y auditar recomendaciones asistidas por IA antes de su difusión.

## 3. First-Read Object & Primary Action (UI Finish-Gate Contract)
- **First-read object (Primera lectura):** El **Lienzo Cartográfico Animado de Chile + Tarjeta de Situación Local de la Comuna Activa** (condición observada ahora, pulso esperado en las próximas 48 h con rango $P_{50}-P_{90}$, cota de isoterma $0\,^\circ\text{C}$ y alerta vigente).
- **Primary action (Acción primaria):** Explorar y reproducir (`Play/Pause`) la evolución temporal del frente meteorológico directamente sobre el mapa interactivo de Chile o cambiar de comuna con un clic.

## 4. Non-Negotiable Epistemic & Safety Constraints
- **Separación taxativa de datos:** Toda cifra o capa indica explícitamente si es `Observación`, `Pronóstico Numérico`, `Escenario Estimado` o `Alerta Oficial vs. Estimación App`.
- **Cero invención de fuentes:** Se utilizan fuentes oficiales chilenas documentadas y APIs abiertas verificables en vivo (`Open-Meteo` ECMWF/GFS/ICON y `RainViewer` / `GOES-16`).
- **Accesibilidad sin depender solo del color (WCAG 2.1 AA):** Cada nivel de severidad combina color, geometría distintiva (`ℹ`, `◆`, `▲`, `🛑`), etiqueta textual y patrón de borde.
- **Gobernanza de Agentes IA:** Trazabilidad obligatoria por cita (`[Ref: EV-*]`) y bloqueo de supervisión humana (*Human-in-the-Loop*) para eventos de alto impacto.
