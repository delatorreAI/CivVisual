/**
 * timeline-viz.js (v7)
 * Visualización original de cronologías "Ríos del Tiempo" para index.html.
 * - Limpieza de código, comentarios JSDoc.
 * - Mejoras de robustez y consistencia con utils/config.
 * - Optimizaciones menores.
 */

// Variables globales para esta visualización específica
// let timelineViz = null; // Instancia Chart.js (declarada en config.js)
let timelineVizCanvas = null;
let timelineVizCtx = null;
let timelineVizData = []; // Datos procesados para esta visualización
let timeVizScaleDomain = [-10000, 750]; // Rango inicial
let isTimelineVizPanning = false; // Flag para interacciones

// Configuración específica (podría moverse a config.js)
const TIMELINEVIZ_CONFIG = {
    riverBaseHeight: 15, // Altura base reducida
    riverGap: 6,
    nodeDiameter: 8,
    marginTop: 20,
    marginLeft: 150, // Similar a Estratos para etiquetas Y
    fontContinent: 'bold 12px "Cinzel", serif',
    fontCivilization: '10px "Source Sans Pro", sans-serif',
    fontEvent: '9px "Source Sans Pro", sans-serif',
    eventColors: { // Reutilizar colores de Estratos si es posible
        'writing': ESTRATOS_CONFIG?.eventIconColors?.writing || '#42a5f5',
        'metal': ESTRATOS_CONFIG?.eventIconColors?.metal || '#ffa726',
        'architecture': ESTRATOS_CONFIG?.eventIconColors?.architecture || '#66bb6a',
        'state': ESTRATOS_CONFIG?.eventIconColors?.state || '#ab47bc',
        'default': ESTRATOS_CONFIG?.eventIconColors?.default || '#bdbdbd'
    },
    // ... otras configuraciones específicas si las había ...
};


/**
 * Inicializa la visualización "Ríos del Tiempo".
 */
function initTimelineViz() {
    logWithTimestamp('Inicializando visualización Ríos del Tiempo (v7)...');
    const ids = DOM_IDS || {}; // De config.js

    try {
        timelineVizCanvas = document.getElementById(ids.timelineVizCanvas); // ID de config.js
        if (!timelineVizCanvas) return console.warn(`Canvas #${ids.timelineVizCanvas} no encontrado.`);
        if (!(timelineVizCanvas instanceof HTMLCanvasElement)) return console.error(`Elemento ${ids.timelineVizCanvas} no es canvas.`);

        timelineVizCtx = timelineVizCanvas.getContext('2d');
        if (!timelineVizCtx) throw new Error("No se pudo obtener contexto 2D para Ríos del Tiempo.");

        if (typeof Chart === 'undefined') throw new Error("Chart.js no cargado.");
        if (typeof ChartZoom === 'undefined') console.warn("Plugin Zoom no cargado, zoom/pan no funcionarán en Ríos del Tiempo."); // Advertir si falta
        if (typeof civilizacionesData === 'undefined' || civilizacionesData.length === 0) {
            console.warn("Datos no disponibles para inicializar Ríos del Tiempo.");
            // Podríamos limpiar el canvas o mostrar mensaje
             timelineVizCtx.clearRect(0, 0, timelineVizCanvas.width, timelineVizCanvas.height);
             timelineVizCtx.textAlign = 'center';
             timelineVizCtx.fillStyle = PALETTE?.text_light || 'grey';
             timelineVizCtx.fillText("Esperando datos...", timelineVizCanvas.width/2, 50);
            return;
        }

        // Procesar datos específicos para esta visualización
        timelineVizData = processDataForRivers(civilizacionesData);
        if (!timelineVizData) throw new Error("Fallo al procesar datos para Ríos.");

        // Configurar controles (si existen para esta viz)
        setupTimelineVizControls();

        // Crear/Actualizar Chart.js (Asegurarse que la variable global timelineViz se asigna)
        if (timelineViz instanceof Chart) timelineViz.destroy();
        // Registrar plugin zoom si existe y no está registrado
         try { if (typeof ChartZoom !== 'undefined') Chart.register(ChartZoom); } catch(e) {}
        timelineViz = createRiverTimelineChart(timelineVizData); // Asigna a la variable global
        if (!timelineViz) throw new Error("No se pudo crear Chart para Ríos del Tiempo.");

        // Configurar interacciones específicas
        setupRiverInteractions();

        console.log("Visualización Ríos del Tiempo inicializada (v7).");

    } catch (error) {
        console.error("Error fatal inicializando Ríos del Tiempo:", error);
        // Mostrar error en canvas
        if(timelineVizCtx) {
             timelineVizCtx.clearRect(0, 0, timelineVizCanvas.width, timelineVizCanvas.height);
             timelineVizCtx.textAlign = 'center';
             timelineVizCtx.fillStyle = PALETTE?.error || 'red';
             timelineVizCtx.fillText(`Error: ${error.message}`, timelineVizCanvas.width/2, 50);
         }
    }
}

/**
 * Procesa datos para el formato específico de "Ríos del Tiempo".
 * Similar a processEstratosData pero puede tener ajustes diferentes.
 * @param {Array} dataToProcess - Datos crudos (civilizacionesData o filteredData).
 * @returns {Array|null} Datos procesados y agrupados o null.
 */
function processDataForRivers(dataToProcess) {
    console.log("Procesando datos para Ríos del Tiempo...");
    try {
        let groupedData = {};
        let currentY = TIMELINEVIZ_CONFIG.marginTop + TIMELINEVIZ_CONFIG.continentGap;

        dataToProcess.forEach((civ, index) => {
            const continent = civ.Continente || 'Desconocido';
             // Agrupación simple por continente para esta visualización
            if (!groupedData[continent]) {
                 groupedData[continent] = { civilizations: [], startY: 0, color: getColorForContinent(continent) };
             }

            // Usar funciones de utils.js
            const { startYear, endYear, confidence } = parseTimelineDates(civ['Cronología Aprox. (10k aC - 750 dC)'] || '');
            const events = (typeof extractKeyEvents === 'function') ? extractKeyEvents(civ) : [];
            const significance = (typeof calculateSignificance === 'function') ? calculateSignificance(civ) : 1;

            if (startYear !== null && endYear !== null && startYear <= endYear) {
                // Altura del río basada en significancia
                const riverHeight = Math.round(TIMELINEVIZ_CONFIG.riverBaseHeight * (0.8 + significance * 0.4));
                groupedData[continent].civilizations.push({
                    ...civ, id: `river-${continent}-${index}`, // ID único
                    name: civ['Cultura / Sociedad'] || 'Sin Nombre',
                    startYear: startYear, endYear: endYear, confidence: confidence,
                    significance: significance, events: events,
                    calculatedHeight: riverHeight,
                    yPos: 0 // Se calcula después
                });
            }
        });

        // Ordenar y Calcular Y (simplificado, solo agrupa por continente)
        let finalProcessedData = Object.keys(groupedData).sort().map(continent => {
            const continentData = groupedData[continent];
            continentData.startY = currentY;
            continentData.civilizations.sort((a, b) => a.startYear - b.startYear); // Ordenar por inicio

            let yOffsetInContinent = 0;
            continentData.civilizations.forEach((civ) => {
                civ.yPos = continentData.startY + yOffsetInContinent;
                yOffsetInContinent += (civ.calculatedHeight + TIMELINEVIZ_CONFIG.riverGap);
            });

            const continentContentHeight = yOffsetInContinent > 0 ? yOffsetInContinent - TIMELINEVIZ_CONFIG.riverGap : 0;
            currentY += continentContentHeight + TIMELINEVIZ_CONFIG.continentGap;

            return { name: continent, ...continentData };
        });

        // Ajustar altura canvas
        const totalContentHeight = currentY - TIMELINEVIZ_CONFIG.continentGap + TIMELINEVIZ_CONFIG.marginTop;
        const minHeight = 500; // Altura mínima para esta viz
        const calculatedHeight = Math.max(minHeight, totalContentHeight + 30);
        if (timelineVizCanvas) { /* ... ajustar altura canvas/wrapper ... */
             timelineVizCanvas.height = calculatedHeight;
             const wrapper = timelineVizCanvas.closest('.timeline-viz-container') || timelineVizCanvas.parentNode;
             if(wrapper && wrapper.style) wrapper.style.minHeight = `${calculatedHeight}px`;
             if(timelineViz && timelineViz.options.scales?.y) timelineViz.options.scales.y.max = calculatedHeight;
             console.log("Altura canvas Ríos del Tiempo ajustada a:", calculatedHeight);
        }

        return finalProcessedData;
    } catch (error) { console.error("Error procesando datos Ríos:", error); return null; }
}

/**
 * Configura los controles específicos para Ríos del Tiempo (si existen).
 */
function setupTimelineVizControls() {
    const ids = DOM_IDS || {};
    const controlsContainer = document.getElementById(ids.timelineVizControls);
    if (!controlsContainer) return; // No hay controles específicos definidos en HTML v7
    console.log("Configurando controles Ríos del Tiempo (si aplica)...");
    // Vaciar por si acaso y añadir listeners si hubiera botones/selects específicos aquí
    // controlsContainer.innerHTML = '';
    // Ejemplo: document.getElementById('rios-zoom-in')?.addEventListener(...);
}

/**
 * Crea la instancia de Chart.js para Ríos del Tiempo.
 * @param {Array} processedData Datos procesados.
 * @returns {Chart|null} Instancia de Chart.js o null.
 */
function createRiverTimelineChart(processedData) {
    console.log("Creando instancia Chart.js para Ríos del Tiempo...");
    if (!timelineVizCtx) return null;

    // Plugin de dibujo para los ríos
    const riverDrawingPlugin = {
        id: 'riverDrawer',
        beforeDatasetsDraw: (chart, args, options) => {
            const { ctx, chartArea, scales } = chart;
            if (!chartArea || !timelineVizData) return;
            const { left, top, right, bottom, width, height } = chartArea;
            const xScale = scales.x;
            ctx.save();
            ctx.clearRect(0, 0, chart.width, chart.height);
            // Dibujar bandas de periodo (opcional, podría saturar)
            // drawPeriodBands(ctx, xScale, top, bottom, width, height); // Usar helper de utils.js

            // Dibujar Ríos
            drawRiversAndLabels(ctx, xScale, left, top, timelineVizData);

            // Dibujar resalte hover si existe
             if(activeHoverCiv && activeHoverCiv.id?.startsWith('river-')){ // Asegurar que el hover es para esta viz
                  drawRiverHighlight(ctx, xScale); // Función específica de resalte para ríos
              }

            ctx.restore();
        }
    };

    const chartConfig = {
        type: 'scatter', // Base para eje X
        data: { datasets: [{ data: [], pointRadius: 0, showLine: false }] },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            layout: { padding: { left: TIMELINEVIZ_CONFIG.marginLeft - 20, right: 20, top: 10, bottom: 30 } },
            scales: {
                x: { /* ... Config escala X igual que Estratos ... */
                    type: 'linear', min: -10000, max: 750, position: 'bottom',
                    title: { display: true, text: 'Año (Negativo = a.C.)', font: { size: 12 } },
                    grid: { color: 'rgba(200, 200, 200, 0.3)', borderColor: 'rgba(150, 150, 150, 0.5)', drawTicks: true },
                    ticks: { callback: value => formatYear(value), color: '#444', font: { size: 10 }, maxRotation: 0, autoSkip: true, autoSkipPadding: 60 }
                },
                y: { display: false, min: 0, max: timelineVizCanvas.height } // Eje Y oculto
            },
            plugins: {
                legend: { display: false }, tooltip: { enabled: false }, // Usar tooltip HTML
                zoom: { // Config plugin zoom (igual que Estratos)
                    pan: { enabled: true, mode: 'x', threshold: 5, modifierKey: 'ctrl', onPanStart: ()=>{ isTimelineVizPanning=true; return true;}, onPanComplete: ()=>{ requestAnimationFrame(() => { isTimelineVizPanning=false; }); } },
                    zoom: { wheel: { enabled: true, speed: 0.1 }, pinch: { enabled: true }, mode: 'x', onZoomStart: ()=>{ isTimelineVizPanning=true; return true;}, onZoomComplete: ()=>{ requestAnimationFrame(() => { isTimelineVizPanning=false; }); } }
                },
                riverDrawer: {} // Nuestro plugin
            },
            interaction: { mode: 'nearest', axis: 'xy', intersect: false },
            events: ['mousemove', 'mouseout', 'click', 'wheel', 'touchstart', 'touchmove', 'touchend'],
        },
        plugins: [riverDrawingPlugin]
    };
    try { return new Chart(timelineVizCtx, chartConfig); }
    catch (error) { console.error("Error creando Chart Ríos:", error); return null; }
}

// --- Funciones de Dibujo Específicas para Ríos ---

/**
 * Dibuja los ríos, etiquetas de continente y civilización.
 */
function drawRiversAndLabels(ctx, xScale, chartLeft, chartTop, processedData) {
     try { ctx.save();
     processedData.forEach(continent => {
         // Título Continente
          ctx.fillStyle = continent.color || '#000'; ctx.font = TIMELINEVIZ_CONFIG.fontContinent;
          ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
          const continentLabelY = Math.max(chartTop + 12, continent.startY - 8); // Ajustar Y
          ctx.fillText(continent.name, TIMELINEVIZ_CONFIG.marginLeft / 6, continentLabelY);

         continent.civilizations.forEach(civ => {
             const startX = xScale.getPixelForValue(civ.startYear);
             const endX = xScale.getPixelForValue(civ.endYear);
             const y = civ.yPos + civ.calculatedHeight / 2; // Centro Y del río
             const riverHeight = civ.calculatedHeight;

             if (endX > xScale.left && startX < xScale.right) {
                 const drawStartX = Math.max(startX, xScale.left);
                 const drawEndX = Math.min(endX, xScale.right);
                 const drawWidth = drawEndX - drawStartX;

                 if(drawWidth > 0) {
                     // Dibujar el "río" (curva simple o forma más compleja)
                      ctx.beginPath();
                      ctx.moveTo(drawStartX, y - riverHeight / 2); // Borde superior izquierdo
                      ctx.lineTo(drawEndX, y - riverHeight / 2); // Borde superior derecho
                      ctx.lineTo(drawEndX, y + riverHeight / 2); // Borde inferior derecho
                      ctx.lineTo(drawStartX, y + riverHeight / 2); // Borde inferior izquierdo
                      ctx.closePath();

                      // Relleno con opacidad basada en confianza
                      const alpha = 0.5 + (civ.confidence * 0.4);
                      ctx.fillStyle = hexToRgba(continent.color || '#cccccc', alpha);
                      ctx.fill();

                      // Borde
                      ctx.strokeStyle = hexToRgba(continent.color || '#aaaaaa', alpha + 0.1);
                      ctx.lineWidth = 0.5;
                      ctx.stroke();

                      // Etiqueta de civilización (si cabe)
                      const label = civ.name;
                      ctx.font = TIMELINEVIZ_CONFIG.fontCivilization;
                      const textWidth = ctx.measureText(label).width;
                      if (drawWidth > textWidth + 8) {
                          // Texto con contraste (blanco/borde negro)
                           ctx.save(); ctx.rect(drawX, y - riverHeight / 2, drawWidth, riverHeight); ctx.clip();
                           ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                           ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
                           ctx.strokeText(label, drawX + drawWidth / 2, y + 1);
                           ctx.fillStyle = '#FFFFFF';
                           ctx.fillText(label, drawX + drawWidth / 2, y + 1);
                           ctx.restore();
                      }
                 }
             }
         }); // Fin forEach civ
     }); // Fin forEach continent
     ctx.restore(); } catch(e){ console.error("Error drawRivers", e); if(ctx) ctx.restore(); }
}


/**
 * Dibuja el resalte sobre un río en hover.
 */
function drawRiverHighlight(ctx, xScale) {
    if (!activeHoverCiv || !activeHoverCiv.id?.startsWith('river-')) return; // Solo para esta viz
    try {
        const civ = activeHoverCiv;
        const startX = xScale.getPixelForValue(civ.startYear);
        const endX = xScale.getPixelForValue(civ.endYear);
        const y = civ.yPos + civ.calculatedHeight / 2;
        const riverHeight = civ.calculatedHeight;

        if (endX > xScale.left && startX < xScale.right) {
            const drawX = Math.max(startX, xScale.left);
            const drawWidth = Math.min(endX, xScale.right) - drawX;
            if (drawWidth > 0) {
                ctx.save();
                // Borde oscuro y grueso para resaltar
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.lineWidth = 2;
                ctx.strokeRect(drawX, y - riverHeight / 2, drawWidth, riverHeight);
                // Dibujar iconos de eventos
                 drawRiverEventIcons(ctx, xScale, civ);
                ctx.restore();
            }
        }
    } catch (e) { console.error("Error drawRiverHighlight", e); if(ctx) ctx.restore(); }
}

/**
 * Dibuja iconos de eventos sobre un río.
 */
function drawRiverEventIcons(ctx, xScale, civ) {
     if (!civ.events || civ.events.length === 0) return;
     // Misma lógica que drawEventIcons de Estratos, pero ajustando Y
     try { ctx.save();
         const iconY = civ.yPos + civ.calculatedHeight / 2; // Centro del río
         const iconRadius = TIMELINEVIZ_CONFIG.nodeDiameter / 2;

         civ.events.forEach(event => {
             const eventX = xScale.getPixelForValue(event.year);
             if (eventX >= xScale.left + iconRadius && eventX <= xScale.right - iconRadius) {
                 ctx.fillStyle = TIMELINEVIZ_CONFIG.eventColors[event.type] || TIMELINEVIZ_CONFIG.eventColors['default'];
                 ctx.beginPath();
                 ctx.arc(eventX, iconY, iconRadius, 0, Math.PI * 2);
                 ctx.fill();
                 ctx.strokeStyle = 'white'; ctx.lineWidth = 0.5; ctx.stroke();
                  // Opcional: tooltip para icono? se podría mostrar en el tooltip principal
             }
         });
      ctx.restore(); } catch (e) { console.error("Error drawRiverEventIcons", e); if(ctx) ctx.restore(); }
}

// --- Funciones de Interacción Específicas para Ríos ---

/**
 * Configura interacciones para el canvas de Ríos del Tiempo.
 */
function setupRiverInteractions() {
    if (!timelineVizCanvas || !timelineViz) return;
    // Limpiar y añadir listeners (similares a Estratos)
    timelineVizCanvas.removeEventListener('mousemove', handleRiverHover);
    timelineVizCanvas.addEventListener('mousemove', handleRiverHover);
    timelineVizCanvas.removeEventListener('mouseout', handleRiverMouseOut);
    timelineVizCanvas.addEventListener('mouseout', handleRiverMouseOut);
    timelineVizCanvas.removeEventListener('click', handleRiverClick);
    timelineVizCanvas.addEventListener('click', handleRiverClick);
    console.log("Interacciones Ríos del Tiempo configuradas.");
}

/**
 * Encuentra la civilización (río) bajo el cursor.
 */
function findRiverUnderCursor(mouseX, mouseY) {
    if (!timelineViz || !timelineVizData || !timelineViz.scales?.x) return null;
    const chart = timelineViz; if (!chart.chartArea) return null; const xScale = chart.scales.x;

     for (const continent of timelineVizData) {
        // Optimización Y similar a Estratos
         if (mouseY >= continent.startY - TIMELINEVIZ_CONFIG.riverGap && mouseY <= continent.startY + (continent.civilizations.length * (TIMELINEVIZ_CONFIG.riverBaseHeight*1.5 + TIMELINEVIZ_CONFIG.riverGap))) {
             for (const civ of continent.civilizations) {
                 const y = civ.yPos; const barHeight = civ.calculatedHeight;
                 // Comprobar Y del río (centro +/- altura/2)
                 if (mouseY >= y && mouseY <= y + barHeight) {
                      const startX = xScale.getPixelForValue(civ.startYear); const endX = xScale.getPixelForValue(civ.endYear);
                      if (mouseX >= startX && mouseX <= endX) return civ;
                 }
             }
         }
    }
    return null;
}

/** Manejador hover para Ríos */
function handleRiverHover(event) {
    if (!timelineVizCanvas || !timelineViz || isTimelineVizPanning) return;
    const now = Date.now(); if (now - lastMouseMoveTime < HOVER_THROTTLE_MS) return; lastMouseMoveTime = now;

    requestAnimationFrame(() => {
        const rect = timelineVizCanvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left; const mouseY = event.clientY - rect.top;
        const civ = findRiverUnderCursor(mouseX, mouseY);

        if (civ) {
            if (activeHoverCiv?.id !== civ.id) {
                activeHoverCiv = civ; // Usamos la misma variable global, podría dar problemas si ambas viz están activas
                timelineVizCanvas.style.cursor = 'pointer';
                 const tooltipContent = `...`; // Generar tooltip similar a Estratos
                 updateRiverTooltip(tooltipContent, event.clientX, event.clientY, true); // Usar función específica tooltip si es necesario
                timelineViz.update('none'); // Redibujar para highlight/iconos
            }
        } else {
            if (activeHoverCiv?.id?.startsWith('river-')) { // Limpiar solo si era de esta viz
                 activeHoverCiv = null; timelineVizCanvas.style.cursor = 'default';
                 updateRiverTooltip('', 0, 0, false); timelineViz.update('none');
            }
        }
    });
}

/** Manejador mouseout para Ríos */
function handleRiverMouseOut(event) {
     // Misma lógica que Estratos, pero verificando el ID
      if(!timelineVizCanvas) return;
      const rect = timelineVizCanvas.getBoundingClientRect();
      if (event.clientX <= rect.left || event.clientX >= rect.right || event.clientY <= rect.top || event.clientY >= rect.bottom){
         if (activeHoverCiv?.id?.startsWith('river-')) {
             activeHoverCiv = null; timelineVizCanvas.style.cursor = 'default';
             updateRiverTooltip('', 0, 0, false); if(timelineViz) timelineViz.update('none');
         }
      }
}

/** Manejador click para Ríos */
function handleRiverClick(event) {
    if (!timelineVizCanvas || isTimelineVizPanning) return;
    const rect = timelineVizCanvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left; const mouseY = event.clientY - rect.top;
    const clickedCiv = findRiverUnderCursor(mouseX, mouseY);

    if (clickedCiv) {
        console.log("Click en Río:", clickedCiv.name);
        if (typeof showCivilizationDetails === 'function') {
             showCivilizationDetails(clickedCiv); // Llamar a la función de ui.js
         } else { alert(`Click en (Río): ${clickedCiv.name}`); }
    }
}

/** Actualiza tooltip HTML (podría ser la misma que Estratos o una específica) */
function updateRiverTooltip(contentHTML, pageX, pageY, show) {
     // Usar updateEstratosTooltip si el elemento tooltip es compartido y el estilo es el mismo
     if(typeof updateEstratosTooltip === 'function'){
          updateEstratosTooltip(contentHTML, pageX, pageY, show);
      } else {
           // Implementación básica si es diferente
           const tooltipEl = document.getElementById('river-tooltip-id'); // Necesitaría su propio ID
           if(tooltipEl) { /* ... lógica similar ... */ }
      }
}

/**
 * Actualiza la visualización Ríos del Tiempo (ej: si cambian filtros globales).
 */
function updateTimelineViz() {
    if (!timelineViz) return console.warn("Intento de actualizar Ríos del Tiempo, pero no está inicializado.");
    console.log("Actualizando visualización Ríos del Tiempo (v7)...");
    try {
        // 1. Reprocesar datos con filteredData
         const newData = processDataForRivers(filteredData); // Usar datos filtrados globalmente
         if (!newData) throw new Error("Fallo al reprocesar datos.");
         timelineVizData = newData; // Actualizar datos usados por el plugin

         // 2. Ajustar altura y escala Y
         const totalContentHeight = timelineVizData.reduce((h, cont) => h + cont.height + TIMELINEVIZ_CONFIG.continentGap, TIMELINEVIZ_CONFIG.marginTop) + 30;
         const newHeight = Math.max(500, totalContentHeight);
         if (timelineVizCanvas) timelineVizCanvas.height = newHeight;
          const wrapper = timelineVizCanvas?.closest('.timeline-viz-container');
          if(wrapper && wrapper.style) wrapper.style.minHeight = `${newHeight}px`;
         if(timelineViz.options.scales?.y) timelineViz.options.scales.y.max = newHeight;


        // 3. Actualizar el gráfico Chart.js (esto llama al plugin de dibujo)
        timelineViz.update();
        console.log("Visualización Ríos del Tiempo actualizada.");
    } catch (error) {
        console.error("Error actualizando Ríos del Tiempo:", error);
    }
}

console.log("timeline-viz.js (v7) cargado.");
// --- Fin de timeline-viz.js ---