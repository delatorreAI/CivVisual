/**
 * estratos-timeline.js (v10)
 * Lógica para "Estratos Temporales Interactivos".
 * - CORREGIDO: No redeclara variables globales de config.js.
 * - CORREGIDO: Typo en llamada a createEstratosChart.
 * - ELIMINADO: Llamadas internas a logWithTimestamp.
 * - Mantiene mejoras funcionales/estéticas de v8/v9.
 * - Añade más robustez y validaciones.
 */

'use strict';

// --- Variables Locales de Módulo ---
// Las variables globales como civilizacionesData, ESTRATOS_CONFIG, DOM_IDS, etc.,
// se ASUME que están disponibles porque config.js se carga antes.
// NO se redeclaran aquí.

let estratosCanvas = null;
let estratosCtx = null;
let estratosDataProcessed = []; // Datos específicos para esta visualización
let estratosTooltipElement = null;
let activeHoverCiv = null; // Civilización bajo el cursor
let isPanningOrZooming = false; // Flag para interacciones durante pan/zoom
let lastMouseMoveTime = 0;
const HOVER_THROTTLE_MS = 16; // ~60fps

// --- Funciones Principales ---

/**
 * Función Principal de Inicialización (v10).
 */
function initEstratosTimeline() {
    console.log("Inicializando Estratos Temporales Interactivos (v10)...");
    // Acceder a la instancia global del chart (declarada en config.js)
    // Si existe, se sobreescribirá. window. permite asignación global.
    window.estratosTimelineInstance = null;

    const loadingMessageDiv = document.getElementById(DOM_IDS?.estratosLoadingMessage);

    try {
        // 1. Validar Entorno y Datos Críticos
        if (!validateEnvironment(loadingMessageDiv)) return;

        // 2. Obtener Elementos DOM Esenciales
        if (!getDOMElements(loadingMessageDiv)) return;

        showLoadingMessage("Procesando datos...", false, loadingMessageDiv);

        // 3. Procesar Datos (Depende de civilizacionesData global)
        estratosDataProcessed = processEstratosData(civilizacionesData);
        if (!estratosDataProcessed) throw new Error("Fallo el procesamiento de datos.");
        adjustCanvasHeight(); // Ajustar altura según datos procesados

        // 4. Configurar Controles UI (listeners en botones/checkboxes)
        setupEstratosControls();

        // 5. Crear Instancia de Chart.js
        // Destruir instancia previa si existiera (poco probable si se reinicia bien)
        if (window.estratosTimelineInstance instanceof Chart) {
            console.warn("Destruyendo instancia previa de Estratos Chart.");
            window.estratosTimelineInstance.destroy();
        }
         // Registrar plugin Zoom (solo una vez)
        try { if (typeof ChartZoom !== 'undefined' && !Chart.registry.plugins.get('zoom')) Chart.register(ChartZoom); } catch (e) {console.warn("Plugin Zoom ya registrado o ChartZoom no definido?", e)}

        window.estratosTimelineInstance = createEstratosChart(); // Llamada corregida, asigna a global
        if (!window.estratosTimelineInstance) throw new Error("No se pudo crear instancia de Chart.");

        // 6. Configurar Interacciones del Canvas
        setupEstratosInteractions();

        // 7. Generar Leyenda
        generateEstratosLegend();

        hideLoadingMessage(loadingMessageDiv);
        console.log("Visualización Estratos Temporales inicializada (v10).");

    } catch (error) {
        console.error("Error fatal durante inicialización de Estratos (v10):", error);
        showLoadingMessage(`Error al inicializar: ${error.message}`, true, loadingMessageDiv);
        // Limpiar estado en caso de error fatal
         window.estratosTimelineInstance = null;
         estratosDataProcessed = [];
    }
}

/**
 * Valida dependencias JS, datos y configuración globales. v10
 * @param {HTMLElement|null} loadingMsgDiv - Elemento para mensajes UI.
 * @returns {boolean} True si el entorno es válido.
 */
function validateEnvironment(loadingMsgDiv) {
    const fail = (msg) => !showLoadingMessage(msg, true, loadingMsgDiv);

    // Librerías externas
    if (typeof Chart === 'undefined') return fail("Error: Chart.js no cargado.");
    if (typeof ChartZoom === 'undefined') return fail("Error: chartjs-plugin-zoom no cargado.");
    if (typeof Papa === 'undefined') console.warn("PapaParse no detectado, la carga de datos puede fallar si no está ya hecha."); // No bloqueante aquí

    // Funciones Utils (claves)
    if (typeof parseTimelineDates !== 'function') return fail("Error: parseTimelineDates (utils.js) no encontrado.");
    if (typeof addLightnessToRgba !== 'function') return fail("Error: addLightnessToRgba (utils.js) no encontrado.");
    if (typeof getColorForContinent !== 'function') return fail("Error: getColorForContinent (utils.js) no encontrado.");
    if (typeof formatYear !== 'function') return fail("Error: formatYear (utils.js) no encontrado.");

    // Variables / Config Globales (de config.js)
    if (typeof civilizacionesData === 'undefined') return fail("Error: 'civilizacionesData' no definido globalmente.");
    if (typeof ESTRATOS_CONFIG === 'undefined') return fail("Error: 'ESTRATOS_CONFIG' no definido globalmente.");
    if (typeof DOM_IDS === 'undefined') return fail("Error: 'DOM_IDS' no definido globalmente.");

    return true;
}

/**
 * Obtiene y valida elementos DOM necesarios. v10
 * @param {HTMLElement|null} loadingMsgDiv - Elemento para mensajes UI.
 * @returns {boolean} True si se obtuvieron elementos esenciales.
 */
function getDOMElements(loadingMsgDiv) {
    const ids = DOM_IDS || {}; // Leer IDs de config.js
    estratosCanvas = document.getElementById(ids.estratosTimelineCanvas);
    estratosTooltipElement = document.getElementById(ids.estratosTooltip);

    if (!estratosCanvas) return !showLoadingMessage("Error: Canvas no encontrado (#" + ids.estratosTimelineCanvas + ").", true, loadingMsgDiv);
    if (!estratosTooltipElement) console.warn("Elemento tooltip no encontrado (#" + ids.estratosTooltip + ").");

    try {
        estratosCtx = estratosCanvas.getContext('2d', { alpha: false });
        if (!estratosCtx) throw new Error("No se pudo obtener contexto 2D.");
        return true;
    } catch (error) {
        showLoadingMessage(`Error contexto canvas: ${error.message}`, true, loadingMsgDiv);
        return false;
    }
}

/** Ajusta la altura del canvas y su contenedor. v10 */
function adjustCanvasHeight() { /* ... igual que v9, pero usa window.estratosTimelineInstance ... */
     if (!estratosCanvas || !estratosDataProcessed || estratosDataProcessed.length === 0 || !ESTRATOS_CONFIG) return; try { let maxY = ESTRATOS_CONFIG.marginTop; const lastContinent = estratosDataProcessed[estratosDataProcessed.length - 1]; if (lastContinent?.regions?.length > 0) { const lastRegion = lastContinent.regions[lastContinent.regions.length - 1]; if (lastRegion?.civilizations?.length > 0) { const lastCiv = lastRegion.civilizations[lastRegion.civilizations.length - 1]; maxY = lastCiv.yPos + lastCiv.calculatedHeight; } else { maxY = lastRegion.startY; } } else if (lastContinent) { maxY = lastContinent.startY; } const totalContentHeight = maxY + ESTRATOS_CONFIG.continentGap; const minHeight = 600; const calculatedHeight = Math.max(minHeight, totalContentHeight + 40); if (Math.abs(estratosCanvas.height - calculatedHeight) > 1) { estratosCanvas.height = calculatedHeight; const wrapper = estratosCanvas.closest('.card-body') || estratosCanvas.parentNode; if(wrapper?.style) wrapper.style.minHeight = `${calculatedHeight}px`; if(window.estratosTimelineInstance?.options?.scales?.y) window.estratosTimelineInstance.options.scales.y.max = calculatedHeight; } } catch(error){ console.error("Error ajustando altura canvas:", error); }
}

/** Procesa datos crudos, agrupa y calcula geometría. v10 */
function processEstratosData(dataToProcess) { /* ... igual que v9 ... */
     console.log("Procesando datos para Estratos (v10)..."); try { let grouped = {}; let currentY = ESTRATOS_CONFIG.marginTop + ESTRATOS_CONFIG.continentGap; dataToProcess.forEach((civ, index) => { const continent = civ.Continente || 'Desconocido'; const region = civ['Gran Región / Subcontinente'] || 'Región Desconocida'; if (!grouped[continent]) grouped[continent] = { regions: {}, startY: 0, color: getColorForContinent(continent) }; if (!grouped[continent].regions[region]) grouped[continent].regions[region] = { civilizations: [], startY: 0 }; const { startYear, endYear, confidence } = parseTimelineDates(civ['Cronología Aprox. (10k aC - 750 dC)'] || ''); if (startYear === null || endYear === null || startYear > endYear) return; const events = (typeof extractKeyEvents === 'function') ? extractKeyEvents(civ) : []; const significance = (typeof calculateSignificance === 'function') ? calculateSignificance(civ) : 1; const barHeight = Math.max(10, Math.round(ESTRATOS_CONFIG.barHeight * (0.8 + significance * 0.4))); grouped[continent].regions[region].civilizations.push({ ...civ, id: `${continent}-${region}-${civ['Cultura / Sociedad'] || `civ-${index}`}`, name: civ['Cultura / Sociedad'] || 'Sin Nombre', startYear, endYear, confidence, significance, events, calculatedHeight: barHeight, yPos: 0 }); }); let finalData = Object.keys(grouped).sort().map(continentName => { const continentData = grouped[continentName]; continentData.startY = currentY; continentData.labelY = Math.max(ESTRATOS_CONFIG.marginTop + 15, currentY - 10); let continentContentHeight = 0; const regions = Object.keys(continentData.regions).sort().map(regionName => { const regionData = continentData.regions[regionName]; regionData.startY = currentY; regionData.labelY = Math.max(continentData.labelY + 15, currentY - 3); regionData.civilizations.sort((a, b) => a.startYear - b.startYear); let yOffset = ESTRATOS_CONFIG.regionGap / 1.5; regionData.civilizations.forEach((civ) => { civ.yPos = regionData.startY + yOffset; yOffset += (civ.calculatedHeight + ESTRATOS_CONFIG.barGap); }); const regionH = yOffset > (ESTRATOS_CONFIG.regionGap/1.5) ? yOffset - ESTRATOS_CONFIG.barGap : 0; currentY += regionH + ESTRATOS_CONFIG.regionGap; continentContentHeight += regionH + ESTRATOS_CONFIG.regionGap; return { name: regionName, ...regionData }; }); continentData.regions = regions; continentData.height = continentContentHeight > 0 ? continentContentHeight - ESTRATOS_CONFIG.regionGap : 0; currentY += ESTRATOS_CONFIG.continentGap - ESTRATOS_CONFIG.regionGap; return { name: continentName, ...continentData }; }); console.log(`Datos procesados (${finalData.length} continentes).`); return finalData; } catch (error) { console.error("Error procesando datos Estratos:", error); return null; }
 }

/** Configura los event listeners para los controles. (v10) */
function setupEstratosControls() { /* ... igual que v8/v9 ... */
     console.log("Configurando controles de Estratos (v10)..."); try { document.getElementById(DOM_IDS?.zoomInBtn)?.addEventListener('click', () => zoomEstratosTimeline('in')); document.getElementById(DOM_IDS?.zoomOutBtn)?.addEventListener('click', () => zoomEstratosTimeline('out')); document.getElementById(DOM_IDS?.resetZoomBtn)?.addEventListener('click', resetEstratosZoom); const redrawOnChange = () => { if (window.estratosTimelineInstance) window.estratosTimelineInstance.update('none'); }; document.getElementById(DOM_IDS?.togglePeriodsBtn)?.addEventListener('change', redrawOnChange); document.getElementById(DOM_IDS?.toggleHoverIconsBtn)?.addEventListener('change', redrawOnChange); } catch (error) { console.error("Error configurando controles:", error); }
}

/** Crea la instancia de Chart.js. (v10) */
function createEstratosChart() { /* ... igual que v9 ... */
     console.log("Creando instancia de Chart.js para Estratos (v10)..."); if (!estratosCtx || !estratosDataProcessed) return null;
     const estratosDrawingPlugin = { id: 'estratosDrawer', beforeDatasetsDraw: (chart, args, options) => { const { ctx, chartArea, scales } = chart; if (!chartArea || !estratosDataProcessed) return; const { left, top, right, bottom, width, height } = chartArea; const xScale = scales.x; ctx.save(); ctx.clearRect(0, 0, chart.width, chart.height); const showPeriods = document.getElementById(DOM_IDS?.togglePeriodsBtn)?.checked ?? true; if (showPeriods) drawPeriodBands(ctx, xScale, top, bottom, width, height); drawCivilizationLayers(ctx, xScale, left, top, estratosDataProcessed); drawHoverHighlight(ctx, xScale); ctx.restore(); } };
     const chartConfig = { type: 'scatter', data: { datasets: [{ data: [], pointRadius: 0, showLine: false }] }, options: { responsive: true, maintainAspectRatio: false, animation: false, layout: { padding: { left: (ESTRATOS_CONFIG?.marginLeft || 150) - 20, right: 20, top: 10, bottom: 30 } }, scales: { x: { type: 'linear', min: -10000, max: 750, position: 'bottom', title: { display: true, text: 'Año (Negativo = a.C.)', font: { size: 12 } }, grid: { color: 'rgba(200, 200, 200, 0.3)', borderColor: 'rgba(150, 150, 150, 0.5)', drawTicks: true }, ticks: { callback: value => formatYear(value), color: '#444', font: { size: 10 }, maxRotation: 0, autoSkip: true, autoSkipPadding: 60 } }, y: { display: false, min: 0, max: estratosCanvas.height } }, plugins: { legend: { display: false }, tooltip: { enabled: false }, zoom: { pan: { enabled: true, mode: 'x', threshold: 5, modifierKey: 'ctrl', onPanStart: ()=>{ isPanningOrZooming=true; return true;}, onPanComplete: ()=>{ requestAnimationFrame(() => { isPanningOrZooming=false; }); } }, zoom: { wheel: { enabled: true, speed: 0.1 }, pinch: { enabled: true }, mode: 'x', drag: { enabled: false }, onZoomStart: ()=>{ isPanningOrZooming=true; return true;}, onZoomComplete: ()=>{ requestAnimationFrame(() => { isPanningOrZooming=false; }); } } }, estratosDrawer: {} }, interaction: { mode: 'nearest', axis: 'xy', intersect: false }, events: ['mousemove', 'mouseout', 'click', 'wheel', 'touchstart', 'touchmove', 'touchend'], }, plugins: [estratosDrawingPlugin] };
     try { return new Chart(estratosCtx, chartConfig); } catch (error) { console.error("Error al crear Chart:", error); return null; }
}

// --- Funciones de Dibujo (v10) ---
// (Incluir aquí las versiones v9 de drawPeriodBands, drawCivilizationLayers,
// drawGroupSeparator, drawGroupLabel, drawCivilizationBar, drawBarLabel,
// drawHoverHighlight, drawEventIcons, con robustez añadida)

/** Dibuja bandas de periodo (v10 - +robustez) */
function drawPeriodBands(ctx, xScale, top, bottom, width, height) { if (!ctx || !xScale || !ESTRATOS_CONFIG?.globalPeriods) return; try { ctx.save(); const showPeriods = document.getElementById(DOM_IDS?.togglePeriodsBtn)?.checked ?? true; if(!showPeriods) return; ESTRATOS_CONFIG.globalPeriods.forEach(period => { const startX = Math.round(xScale.getPixelForValue(period.start)); const endX = Math.round(xScale.getPixelForValue(period.end)); if (startX < xScale.right && endX > xScale.left) { const drawX = Math.max(startX, xScale.left); const drawWidth = Math.min(endX, xScale.right) - drawX; if (drawWidth > 0) { ctx.globalAlpha = 0.8; ctx.fillStyle = ESTRATOS_CONFIG.periodColors[period.name] || ESTRATOS_CONFIG.periodColors['Default']; ctx.fillRect(drawX, top, drawWidth, height); ctx.globalAlpha = 1.0; ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(drawX, top + 0.5); ctx.lineTo(drawX + drawWidth, top + 0.5); ctx.stroke(); if (drawWidth > 55) { ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'; ctx.font = `italic ${ESTRATOS_CONFIG.fontAxis}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; const textY = Math.max(top + 6, 16); ctx.shadowColor = 'rgba(255,255,255,0.6)'; ctx.shadowBlur = 2; ctx.fillText(period.name, drawX + drawWidth / 2, textY); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; } } } }); } catch(e){ console.error("Error drawPeriodBands", e); } finally { ctx.restore(); } }
/** Dibuja capas de civilizaciones (v10 - +robustez) */
function drawCivilizationLayers(ctx, xScale, chartLeft, chartTop, processedData) { if (!ctx || !xScale || !processedData) return; try { ctx.save(); processedData.forEach(continent => { if(!continent?.regions) return; drawGroupSeparator(ctx, continent.startY, ESTRATOS_CONFIG.continentGap, ESTRATOS_CONFIG.marginLeft / 8, xScale.right, 0.75); drawGroupLabel(ctx, continent.name, ESTRATOS_CONFIG.marginLeft / 8, continent.labelY, continent.color, ESTRATOS_CONFIG.fontTitle); continent.regions.forEach(region => { if(!region?.civilizations) return; drawGroupSeparator(ctx, region.startY, ESTRATOS_CONFIG.regionGap, ESTRATOS_CONFIG.marginLeft / 4, xScale.right, 0.5); drawGroupLabel(ctx, region.name, ESTRATOS_CONFIG.marginLeft / 4, region.labelY, PALETTE?.text_light || '#6f6151', ESTRATOS_CONFIG.fontRegion); region.civilizations.forEach(civ => { drawCivilizationBar(ctx, xScale, civ, continent.color); }); }); }); } catch (e) { console.error("Error drawCivilizationLayers", e); } finally { ctx.restore(); } }
/** Helper: Dibuja separadores (v10 - +robustez) */
function drawGroupSeparator(ctx, yPos, gap, xStart, xEnd, lineWidth) { if (!ctx || !ESTRATOS_CONFIG || yPos <= ESTRATOS_CONFIG.marginTop + gap) return; try{ ctx.strokeStyle = ESTRATOS_CONFIG.groupSeparatorColor; ctx.lineWidth = lineWidth; ctx.beginPath(); ctx.moveTo(xStart, Math.round(yPos - gap / 2) + 0.5); ctx.lineTo(xEnd, Math.round(yPos - gap / 2) + 0.5); ctx.stroke(); } catch(e){ console.error("Error drawGroupSeparator", e); }}
/** Helper: Dibuja etiquetas de grupo (v10 - +robustez) */
function drawGroupLabel(ctx, text, xPos, yPos, color, font) { if(!ctx || !text) return; try{ ctx.fillStyle = color || '#000'; ctx.font = font || '12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(text, xPos, yPos); } catch(e){ console.error("Error drawGroupLabel", e); }}
/** Helper: Dibuja una barra de civilización (v10 - +robustez) */
function drawCivilizationBar(ctx, xScale, civ, continentColor) { if (!ctx || !xScale || !civ) return; try { const startX = Math.round(xScale.getPixelForValue(civ.startYear)); const endX = Math.round(xScale.getPixelForValue(civ.endYear)); const y = Math.round(civ.yPos); const barHeight = civ.calculatedHeight; if (endX > xScale.left && startX < xScale.right) { const drawX = Math.max(startX, xScale.left); const drawWidth = Math.min(endX, xScale.right) - drawX; if (drawWidth >= 0.5) { const alpha = 0.6 + (civ.confidence * 0.35); const baseColor = hexToRgba(continentColor || '#cccccc', alpha); const gradStartColor = addLightnessToRgba(baseColor, 6); const gradEndColor = addLightnessToRgba(baseColor, -6); if(!gradStartColor || !gradEndColor) throw new Error("Error generando gradiente"); const gradient = ctx.createLinearGradient(drawX, y, drawX, y + barHeight); gradient.addColorStop(0, gradStartColor); gradient.addColorStop(1, gradEndColor); ctx.fillStyle = gradient; ctx.fillRect(drawX, y, drawWidth, barHeight); drawBarLabel(ctx, civ.name, drawX, y, drawWidth, barHeight); } } } catch(e) { console.error(`Error dibujando barra ${civ?.name}:`, e); } }
/** Helper: Dibuja etiqueta en barra (v10 - +robustez) */
function drawBarLabel(ctx, text, barX, barY, barWidth, barHeight) { if (!ctx || !text || barHeight < 8) return; try { ctx.font = ESTRATOS_CONFIG.fontLabel; const padding = 6; const availableWidth = barWidth - padding * 2; if (availableWidth <= 5) return; let displayLabel = text; let textWidth = ctx.measureText(displayLabel).width; if (textWidth > availableWidth) { while (ctx.measureText(displayLabel + '...').width > availableWidth && displayLabel.length > 1) { displayLabel = displayLabel.slice(0, -1); } displayLabel = displayLabel.length > 0 ? displayLabel + '...' : ''; } if (displayLabel) { ctx.save(); ctx.beginPath(); ctx.rect(barX + padding/2, barY, availableWidth, barHeight); ctx.clip(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const textX = barX + barWidth / 2; const textY = barY + barHeight / 2 + 1; ctx.strokeStyle = ESTRATOS_CONFIG.labelOnBarStrokeColor; ctx.lineWidth = ESTRATOS_CONFIG.labelOnBarStrokeWidth; ctx.lineJoin = 'round'; ctx.strokeText(displayLabel, textX, textY); ctx.fillStyle = ESTRATOS_CONFIG.labelOnBarColor; ctx.fillText(displayLabel, textX, textY); ctx.restore(); } } catch (e) { console.error(`Error dibujando etiqueta "${text}":`, e); if(ctx) ctx.restore(); } finally { if(ctx) ctx.restore(); } }
/** Dibuja resalte hover e iconos (v10 - +robustez) */
function drawHoverHighlight(ctx, xScale) { if (!activeHoverCiv || isPanningOrZooming || !ctx || !xScale) return; try { const civ = activeHoverCiv; const startX = Math.round(xScale.getPixelForValue(civ.startYear)); const endX = Math.round(xScale.getPixelForValue(civ.endYear)); const y = Math.round(civ.yPos); const barHeight = civ.calculatedHeight; if (endX > xScale.left && startX < xScale.right) { const drawX = Math.max(startX, xScale.left); const drawWidth = Math.min(endX, xScale.right) - drawX; if(drawWidth >= 1) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 6; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 1; ctx.fillStyle = ESTRATOS_CONFIG.hoverHighlightColor; ctx.fillRect(drawX, y, drawWidth, barHeight); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.strokeStyle = ESTRATOS_CONFIG.hoverBorderColor; ctx.lineWidth = 1.5; ctx.strokeRect(drawX, y, drawWidth, barHeight); const showIcons = document.getElementById(DOM_IDS?.toggleHoverIconsBtn)?.checked ?? true; if (showIcons) drawEventIcons(ctx, xScale, civ); ctx.restore(); } } } catch (error) { console.error("Error dibujando resalte:", error); } finally { if(ctx) ctx.restore(); } }
/** Dibuja iconos de evento (v10 - +robustez) */
function drawEventIcons(ctx, xScale, civ) { if (!civ?.events || civ.events.length === 0 || !ctx || !xScale || !ESTRATOS_CONFIG) return; try { ctx.save(); const iconY = Math.round(civ.yPos + civ.calculatedHeight / 2); const iconRadius = ESTRATOS_CONFIG.hoverIconSize; const startXDraw = Math.max(Math.round(xScale.getPixelForValue(civ.startYear)), xScale.left) + iconRadius; const endXDraw = Math.min(Math.round(xScale.getPixelForValue(civ.endYear)), xScale.right) - iconRadius; civ.events.forEach(event => { if (event && typeof event.year === 'number') { const eventX = Math.round(xScale.getPixelForValue(event.year)); if (eventX >= startXDraw && eventX <= endXDraw) { ctx.fillStyle = ESTRATOS_CONFIG.eventIconColors[event.type] || ESTRATOS_CONFIG.eventIconColors['default']; ctx.beginPath(); ctx.arc(eventX, iconY, iconRadius, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; ctx.lineWidth = 1; ctx.stroke(); } } }); ctx.restore(); } catch (error) { console.error("Error dibujando iconos:", error); } finally { if(ctx) ctx.restore(); } }

// --- Funciones de Interacción (v10) ---
/** Configura interacciones (v10) */
function setupEstratosInteractions() { /* ... igual que v9 ... */ if (!estratosCanvas || !window.estratosTimelineInstance) return console.error("Canvas/Chart no listo para interacciones."); estratosCanvas.removeEventListener('mousemove', handleEstratosHover); estratosCanvas.addEventListener('mousemove', handleEstratosHover); estratosCanvas.removeEventListener('mouseout', handleEstratosMouseOut); estratosCanvas.addEventListener('mouseout', handleEstratosMouseOut); estratosCanvas.removeEventListener('click', handleEstratosClick); estratosCanvas.addEventListener('click', handleEstratosClick); console.log("Interacciones de Estratos configuradas (v10)."); try { const zoomPluginOptions = window.estratosTimelineInstance.options.plugins.zoom; if(zoomPluginOptions?.pan) { zoomPluginOptions.pan.onPanStart = ()=>{isPanningOrZooming=true; return true;}; zoomPluginOptions.pan.onPanComplete = ()=>{ requestAnimationFrame(() => { isPanningOrZooming=false; }); }; } if(zoomPluginOptions?.zoom) { zoomPluginOptions.zoom.onZoomStart = ()=>{isPanningOrZooming=true; return true;}; zoomPluginOptions.zoom.onZoomComplete = ()=>{ requestAnimationFrame(() => { isPanningOrZooming=false; }); }; } } catch (e) { console.warn("No se pudo configurar flags pan/zoom:", e); } }
/** Encuentra civilización bajo cursor (v10) */
function findCivUnderCursor(mouseX, mouseY) { /* ... igual que v9 ... */ if (!window.estratosTimelineInstance || !estratosDataProcessed || !window.estratosTimelineInstance.scales?.x?.left) return null; const chart = window.estratosTimelineInstance; if (!chart.chartArea) return null; const xScale = chart.scales.x; for (const continent of estratosDataProcessed) { if (mouseY >= continent.startY - ESTRATOS_CONFIG.regionGap && mouseY <= continent.startY + continent.height + ESTRATOS_CONFIG.continentGap) { for (const region of continent.regions) { const regionContentHeight = region.civilizations.reduce((sum, c) => sum + c.calculatedHeight + ESTRATOS_CONFIG.barGap, 0); const regionEndY = region.startY + regionContentHeight; if (mouseY >= region.startY - ESTRATOS_CONFIG.barGap && mouseY <= regionEndY) { for (let i = region.civilizations.length - 1; i >= 0; i--) { const civ = region.civilizations[i]; const y = civ.yPos; const barHeight = civ.calculatedHeight; if (mouseY >= y && mouseY <= y + barHeight) { const startX = xScale.getPixelForValue(civ.startYear); const endX = xScale.getPixelForValue(civ.endYear); if (mouseX >= startX && mouseX <= endX) return civ; } } } } } } return null; }
/** Manejador hover (v10 - con RAF y tooltip rico) */
function handleEstratosHover(event) { /* ... igual que v9 ... */ if (!estratosCanvas || !window.estratosTimelineInstance || isPanningOrZooming) return; const now = Date.now(); if (now - lastMouseMoveTime < HOVER_THROTTLE_MS) return; lastMouseMoveTime = now; requestAnimationFrame(() => { try { const rect = estratosCanvas.getBoundingClientRect(); const mouseX = event.clientX - rect.left; const mouseY = event.clientY - rect.top; const civ = findCivUnderCursor(mouseX, mouseY); const chartInstance = window.estratosTimelineInstance; const needsRedraw = (civ && activeHoverCiv?.id !== civ.id) || (!civ && activeHoverCiv); if (civ) { if (activeHoverCiv?.id !== civ.id) { activeHoverCiv = civ; estratosCanvas.style.cursor = 'pointer'; const tooltipContent = `<div style="font-family: ${ESTRATOS_CONFIG.fontTooltip}; line-height: 1.45; font-size: 0.9rem;"> <strong style="font-family: ${ESTRATOS_CONFIG.fontHeading}; font-size: 1.1em; color: ${getColorForContinent(civ.Continente) || '#fff'}; display: block; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 3px;">${civ.name}</strong> <span style="color: #ddd; font-size: 0.9em; display: block;">${civ['Gran Región / Subcontinente'] || ''} (${civ.Continente})</span> <span style="font-size: 0.9em; color: #eee;">${civ['Cronología Aprox. (10k aC - 750 dC)']}</span><br> <i style="opacity: 0.9;">${civ['Subsistencia Principal'] || 'N/A'}</i><br> ${(civ['Tecnologías Clave'] && civ['Tecnologías Clave'].length > 3 && !civ['Tecnologías Clave'].toLowerCase().includes('no evid')) ? `<span style='font-size: 0.85em; opacity: 0.8;'>Tec: ${civ['Tecnologías Clave'].substring(0,45)}...</span><br>` : ''} ${(civ['Arquitectura Notable'] && civ['Arquitectura Notable'].length > 3 && !civ['Arquitectura Notable'].toLowerCase().includes('no evid')) ? `<span style='font-size: 0.85em; opacity: 0.8;'>Arq: ${civ['Arquitectura Notable'].substring(0,45)}...</span><br>` : ''} ${(civ['Evidencia Jerarquía Social'] && civ['Evidencia Jerarquía Social'].length > 3 && !civ['Evidencia Jerarquía Social'].toLowerCase().includes('no evid')) ? `<span style='font-size: 0.85em; opacity: 0.8;'>Soc: ${civ['Evidencia Jerarquía Social']}</span><br>` : ''} ${(civ['Sistemas Registro / Escritura'] && civ['Sistemas Registro / Escritura'].length > 3 && !civ['Sistemas Registro / Escritura'].toLowerCase().includes('no evid')) ? `<span style='font-size: 0.85em; opacity: 0.8;'>Escr: ${civ['Sistemas Registro / Escritura']}</span><br>` : ''} ${civ.events && civ.events.length > 0 ? `<span style='font-size:0.8em; opacity: 0.7;'>Hitos: ${civ.events.map(e=>e.type).join(', ')}</span>` : ''} </div>`; updateEstratosTooltip(tooltipContent, event.clientX, event.clientY, true); if (needsRedraw && chartInstance) chartInstance.update('none'); } } else { if (activeHoverCiv) { activeHoverCiv = null; estratosCanvas.style.cursor = 'default'; updateEstratosTooltip('', 0, 0, false); if (needsRedraw && chartInstance) chartInstance.update('none'); } } } catch(e){console.error("Error hover:", e)} }); }
/** Manejador mouseout (v10) */
function handleEstratosMouseOut(event) { /* ... igual que v9 ... */ if(!estratosCanvas) return; const rect = estratosCanvas.getBoundingClientRect(); if (event.clientX <= rect.left || event.clientX >= rect.right || event.clientY <= rect.top || event.clientY >= rect.bottom){ if (activeHoverCiv) { activeHoverCiv = null; estratosCanvas.style.cursor = 'default'; updateEstratosTooltip('', 0, 0, false); if(window.estratosTimelineInstance) requestAnimationFrame(()=>window.estratosTimelineInstance.update('none')); } } }
/** Manejador click (v10) */
function handleEstratosClick(event) { /* ... igual que v9 ... */ if (!estratosCanvas || isPanningOrZooming) return; const rect = estratosCanvas.getBoundingClientRect(); const mouseX = event.clientX - rect.left; const mouseY = event.clientY - rect.top; const clickedCiv = findCivUnderCursor(mouseX, mouseY); if (clickedCiv) { console.log("Click en:", clickedCiv.name); if (typeof showCivilizationDetails === 'function') { showCivilizationDetails(clickedCiv); } else { const details = `CIVILIZACIÓN:\n- Nombre: ${clickedCiv.name}\n- Cronología: ${clickedCiv['Cronología Aprox. (10k aC - 750 dC)'] || 'N/A'}\n- Región: ${clickedCiv['Gran Región / Subcontinente'] || 'N/A'} (${clickedCiv.Continente})\n- Subsistencia: ${clickedCiv['Subsistencia Principal'] || 'N/A'}\n\n(Detalles completos en App principal)`; alert(details); } } }
/** Actualiza tooltip HTML (v10) */
function updateEstratosTooltip(contentHTML, pageX, pageY, show) { /* ... igual que v9 ... */ if (!estratosTooltipElement) return; estratosTooltipElement.innerHTML = ''; if (show && contentHTML) { estratosTooltipElement.innerHTML = contentHTML; estratosTooltipElement.style.display = 'block'; requestAnimationFrame(() => { const tooltipRect = estratosTooltipElement.getBoundingClientRect(); const margin = 15; let left = pageX + margin; let top = pageY + margin; if (left + tooltipRect.width > window.innerWidth - margin) left = pageX - tooltipRect.width - margin; if (top + tooltipRect.height > window.innerHeight - margin) top = pageY - tooltipRect.height - margin; if (left < margin) left = margin; if (top < margin) top = margin; estratosTooltipElement.style.left = `${left}px`; estratosTooltipElement.style.top = `${top}px`; estratosTooltipElement.style.opacity = '1'; }); } else { estratosTooltipElement.style.opacity = '0'; setTimeout(() => { if (estratosTooltipElement.style.opacity === '0') estratosTooltipElement.style.display = 'none'; }, 200); } }

// --- Funciones de Control (v10 - sin cambios) ---
function zoomEstratosTimeline(direction) { /* ... igual que v9 ... */ if (!window.estratosTimelineInstance) return console.error("Zoom: Instancia chart no disponible."); try { window.estratosTimelineInstance.zoom(direction === 'in' ? 1.15 : 0.85); } catch (error) { console.error("Error zoom:", error); } }
function resetEstratosZoom() { /* ... igual que v9 ... */ if (!window.estratosTimelineInstance) return console.error("Reset Zoom: Instancia chart no disponible."); try { window.estratosTimelineInstance.resetZoom(); } catch (error) { console.error("Error reset zoom:", error); } }

// --- Otras Funciones ---
/** Genera leyenda (v10 - sin cambios) */
function generateEstratosLegend() { /* ... igual que v9 ... */ const container = document.getElementById(DOM_IDS?.legendContentPlaceholder); if (!container) return console.warn("Contenedor leyenda no encontrado."); try { let html = '<h4>Continentes:</h4><div style="display: flex; flex-wrap: wrap; gap: 10px 20px; margin-bottom: 1rem;">'; const colors = typeof CONTINENT_COLORS !== 'undefined' ? CONTINENT_COLORS : {}; Object.keys(colors).sort().forEach(c => { html += `<div style="display: flex; align-items: center; font-size: 0.9em;"><span style="display:inline-block; width:14px; height:14px; background-color: ${colors[c]}; margin-right: 6px; border: 1px solid #ccc; border-radius: 3px;"></span>${c}</div>`; }); html += '</div>'; html += '<h4>Hitos Clave (visibles en hover):</h4><div style="display: flex; flex-wrap: wrap; gap: 10px 20px;">'; (Object.keys(ESTRATOS_CONFIG.eventIconColors || {})).filter(k => k !== 'default').forEach(type => { html += `<div style="display: flex; align-items: center; font-size: 0.9em;"><span style="display:inline-block; width:10px; height:10px; border-radius:50%; background-color:${ESTRATOS_CONFIG.eventIconColors[type]}; margin-right: 6px; border: 1px solid rgba(0,0,0,0.3);"></span> ${type.charAt(0).toUpperCase() + type.slice(1)}</div>`; }); html += '</div>'; html += `<p style="margin-top: 1rem; font-size: 0.85em; color: var(--color-text-light);">Opacidad de barra indica confianza en fechas. Texto blanco con borde para legibilidad. CTRL+Arrastrar para mover tiempo.</p>`; container.innerHTML = html; } catch (error) { console.error("Error generando leyenda:", error); if(container) container.innerHTML = "<p>Error.</p>"; } }
/** Actualiza visualización si cambian filtros globales (Placeholder v10) */
function updateEstratosVisualization() { if (!window.estratosTimelineInstance) return; console.warn("Actualización Estratos por filtros globales AÚN NO IMPLEMENTADA."); }

// --- Helpers Internos ---
const showLoadingMessage = (message, isError = false, element = document.getElementById(DOM_IDS?.estratosLoadingMessage)) => { /* ... igual que v9 ... */ if (element) { element.innerHTML = message; element.style.color = isError ? 'red' : 'var(--color-text-light)'; element.style.display = 'block'; } if (isError) console.error("Mensaje UI:", message); else console.log("Mensaje UI:", message); };
const hideLoadingMessage = (element = document.getElementById(DOM_IDS?.estratosLoadingMessage)) => { if (element) element.style.display = 'none'; };
// function addLightnessToRgba(rgbaColor, amountPercent) { ... } // Necesita estar en utils.js

// --- Inicialización Automática (v10) ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('estratos-timeline.js (v10): DOM listo.');
    const loadingMessageDiv = document.getElementById(DOM_IDS?.estratosLoadingMessage);
    showLoadingMessage('Verificando datos...', false, loadingMessageDiv);

    const attemptInit = () => {
        if (typeof initEstratosTimeline === 'function') initEstratosTimeline();
        else showLoadingMessage("Error crítico: initEstratosTimeline no definido.", true, loadingMessageDiv);
    };

    // Asegurarse de que los datos estén listos (puede ser asíncrono)
    const checkDataAndInit = () => {
        if (typeof civilizacionesData !== 'undefined' && civilizacionesData.length > 0) {
            console.log('estratos-timeline.js (v10): Datos disponibles.');
            hideLoadingMessage(loadingMessageDiv);
            setTimeout(attemptInit, 50); // Pequeño delay para renderizado inicial
        } else if (typeof loadCSVAutomatically === 'function') {
            console.log('estratos-timeline.js (v10): Datos no encontrados, iniciando carga...');
            showLoadingMessage('Cargando datos de civilizaciones...', false, loadingMessageDiv);
            loadCSVAutomatically()
                .then(loadedData => {
                    console.log(`estratos-timeline.js (v10): Datos cargados (${loadedData.length}).`);
                    attemptInit();
                })
                .catch(error => {
                    console.error("estratos-timeline.js (v10): Falló carga automática.", error);
                    showLoadingMessage(`Error al cargar datos: ${error.message}`, true, loadingMessageDiv);
                });
        } else {
            console.error("estratos-timeline.js (v10): Ni datos ni función de carga.");
            showLoadingMessage("Error config: No se pueden obtener los datos.", true, loadingMessageDiv);
        }
    };

    // Esperar un breve instante por si config/utils/data tardan un ciclo extra en definir globales
    setTimeout(checkDataAndInit, 0);
});

console.log("estratos-timeline.js (v10) cargado.");
// --- Fin de estratos-timeline.js ---