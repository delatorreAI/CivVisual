/**
 * utils.js (v7)
 * Funciones utilitarias generales para la aplicación Atlas de Civilizaciones.
 * - Añadida documentación JSDoc.
 * - Mejorada robustez con comprobaciones de null/undefined.
 * - Optimizaciones menores y limpieza.
 */

/**
 * Devuelve una función que, mientras sea invocada, no se ejecutará hasta que
 * haya pasado un tiempo `wait` sin que sea llamada. Útil para eventos como 'input' o 'resize'.
 * @param {Function} func La función a ejecutar con debounce.
 * @param {number} wait Tiempo de espera en milisegundos.
 * @returns {Function} La nueva función debounced.
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args); // Usar apply para mantener el contexto 'this'
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Actualiza un elemento HTML con un mensaje de estado y clase CSS opcional.
 * No hace nada si el elemento no se encuentra.
 * @param {HTMLElement|string|null} element Elemento DOM, ID del elemento, o null.
 * @param {string} message Mensaje a mostrar (puede incluir HTML).
 * @param {string} [type=''] Tipo de mensaje ('success', 'error', 'info', '') para añadir clase CSS.
 */
function updateStatus(element, message, type = '') {
    const statusElement = typeof element === 'string'
        ? document.getElementById(element)
        : element;

    if (!statusElement) {
        // console.warn(`Elemento de estado no encontrado para mensaje: ${message}`);
        return; // Salir si no existe
    }

    try {
        statusElement.innerHTML = message;
        // Resetear clases específicas de tipo antes de añadir la nueva
        statusElement.classList.remove('success', 'error', 'info');
        statusElement.className = 'upload-status'; // Clase base

        if (type) {
            statusElement.classList.add(type);
        }
    } catch (error) {
        console.error("Error en updateStatus:", error);
    }
}

/**
 * Verifica si las dependencias externas (PapaParse, Chart.js) están cargadas.
 * Muestra un error si faltan.
 * @returns {boolean} True si todas las dependencias están OK.
 */
function checkExternalDependencies() {
    const missing = [];
    if (typeof Papa === 'undefined') missing.push('PapaParse');
    if (typeof Chart === 'undefined') missing.push('Chart.js');
    // Añadir ChartZoom si es requerido globalmente (aunque se registra en estratos-timeline)
    // if (typeof ChartZoom === 'undefined') missing.push('ChartZoom');

    if (missing.length > 0) {
        const errorMsg = `Error Crítico: Faltan bibliotecas esenciales (${missing.join(', ')}). La aplicación no funcionará correctamente.`;
        console.error(errorMsg);
        // Intentar mostrar en UI si existe un elemento genérico de error
        const errorDiv = document.getElementById('app-error-message'); // ID Hipotético
        if (errorDiv) {
            errorDiv.textContent = errorMsg;
            errorDiv.style.display = 'block';
            errorDiv.style.color = 'red';
            errorDiv.style.padding = '1rem';
            errorDiv.style.border = '1px solid red';
            errorDiv.style.backgroundColor = '#ffebee';
        }
        return false;
    }
    // console.log('Dependencias externas OK.'); // Log si todo está bien (opcional)
    return true;
}

/**
 * Habilita o deshabilita elementos de UI que dependen de la carga de datos.
 * @param {boolean} isLoading True para deshabilitar (estado de carga), false para habilitar.
 */
function setUILoadingState(isLoading) {
    const ids = DOM_IDS || {}; // Usar IDs de config.js
    const selectors = [
        `#${ids.applyFilters}`, `#${ids.resetFilters}`, `#${ids.searchInput}`,
        `#${ids.continenteFilter}`, `#${ids.regionFilter}`, `#${ids.subsistenciaFilter}`, `#${ids.periodFilter}`,
        `#${ids.exportBtn}`,
        // Selectores para pestañas (asumiendo que existen)
        '.nav-tab[data-tab="visualizacion"]', '.nav-tab[data-tab="comparativa"]', '.nav-tab[data-tab="cronologia"]'
    ];

    selectors.forEach(selector => {
        try {
            const element = document.querySelector(selector);
            if (element) {
                 // Usar atributo 'disabled' para elementos de formulario
                 if (['BUTTON', 'INPUT', 'SELECT'].includes(element.tagName)) {
                     element.disabled = isLoading;
                 }
                 // Usar clase y estilo para otros (como pestañas <a> o <div>)
                 element.classList.toggle('disabled', isLoading);
                 element.style.pointerEvents = isLoading ? 'none' : ''; // Mejor que 'auto'
                 element.style.opacity = isLoading ? '0.5' : ''; // Usar opacidad
            }
        } catch (e) {
            // Ignorar errores si los IDs no existen (ej: al correr layout.html)
            // console.warn(`Error aplicando estado loading a selector '${selector}': ${e.message}`);
        }
    });

    // Gestionar mensaje en tabla (solo si existe la tabla)
    const tableBody = document.querySelector(`#${ids.civilizacionesTable} tbody`);
    if (tableBody) {
        const loadingRowId = 'table-loading-message';
        let loadingRow = tableBody.querySelector(`#${loadingRowId}`);
        if (isLoading) {
            if (!loadingRow && tableBody.rows.length === 0) { // Añadir solo si está vacía y no existe ya
                const tr = tableBody.insertRow();
                tr.id = loadingRowId;
                const td = tr.insertCell();
                td.colSpan = Object.keys(columnsToDisplay || {}).filter(k => (columnsToDisplay || {})[k]).length || 8; // Colspan dinámico
                td.innerHTML = `<div class="loading-container"><i class="fas fa-spinner fa-spin loading-icon"></i><span>Esperando datos...</span></div>`;
                td.style.textAlign = 'center';
            }
        } else if (loadingRow) {
            tableBody.removeChild(loadingRow); // Eliminar mensaje de carga
        }
    }
}

/**
 * Aplica una clase CSS temporalmente a un elemento para destacarlo.
 * @param {HTMLElement|string} element Elemento DOM o ID.
 * @param {string} [highlightClass='highlight-flash'] Clase CSS a aplicar.
 * @param {number} [duration=1500] Duración en ms.
 */
function highlightElement(element, highlightClass = 'highlight-flash', duration = 1500) {
    const targetElement = typeof element === 'string' ? document.getElementById(element) : element;
    if (!targetElement) return console.warn(`Elemento no encontrado para destacar: ${element}`);

    targetElement.classList.add(highlightClass);
    setTimeout(() => {
        targetElement.classList.remove(highlightClass);
    }, duration);
}

/**
 * Verifica si el rango de una cronología se solapa con un período seleccionado.
 * @param {string|null} cronologiaText Texto de cronología (ej: "ca. 1000-500 a.C.").
 * @param {string|null} periodoValue Valor del filtro de periodo (ej: "1000-0").
 * @returns {boolean} True si hay solapamiento.
 */
function matchesPeriod(cronologiaText, periodoValue) {
    if (!cronologiaText || !periodoValue) return false;

    try {
        // Parsear período seleccionado (ej: "4000-2000")
        const [periodStartStr, periodEndStr] = periodoValue.split('-');
        if (periodStartStr === undefined || periodEndStr === undefined) return false;

        let pStart = parseInt(periodStartStr, 10);
        let pEnd = parseInt(periodEndStr, 10);

        // Asumir a.C. para rangos donde start > end, o si son > 750
        // Y manejar el caso 1000-0 y 0-500
        if (pStart >= 0 && pEnd >= 0 && pStart > pEnd) { pStart = -pStart; pEnd = -pEnd; } // Ej: 2000-1000 -> -2000 a -1000
        else if (pStart > 0 && pEnd === 0) { pStart = -pStart; pEnd = 0; } // Ej: 1000-0 -> -1000 a 0
        else if (pStart === 0 && pEnd > 0) { pStart = 0; pEnd = pEnd; } // Ej: 0-500 -> 0 a 500
        else if (pStart > 0 && pEnd > 0) { /* Ej: 500-750 d.C. */ }
        else { pStart = -Math.abs(pStart); pEnd = -Math.abs(pEnd); } // Ej: 10000-8000 a.C.

        if (pStart > pEnd) [pStart, pEnd] = [pEnd, pStart]; // Asegurar orden

        // Parsear cronología de la civilización
        const { startYear: civStart, endYear: civEnd } = parseTimelineDates(cronologiaText);
        if (civStart === null || civEnd === null) return false;

        // Comprobar solapamiento: !(finCiv < inicioPeriodo || inicioCiv > finPeriodo)
        return !(civEnd < pStart || civStart > pEnd);

    } catch (error) {
        console.error(`Error en matchesPeriod ('${cronologiaText}', '${periodoValue}'):`, error);
        return false;
    }
}

/**
 * Estima el punto medio de un rango de fechas parseado.
 * @param {string|null} cronologiaText Texto de la cronología.
 * @returns {number | null} Año estimado del punto medio, o null.
 */
function estimateMidPoint(cronologiaText) {
    if (!cronologiaText) return null;
    const { startYear, endYear } = parseTimelineDates(cronologiaText);
    if (startYear !== null && endYear !== null) {
        return startYear + (endYear - startYear) / 2;
    }
    return null;
}

/**
 * Genera un color HSL distribuido uniformemente usando el Golden Angle.
 * @param {number} index Índice del elemento (0, 1, 2...).
 * @param {number} [saturation=70] Saturación (0-100).
 * @param {number} [lightness=55] Luminosidad (0-100).
 * @returns {string} Color en formato 'hsl(hue, saturation%, lightness%)'.
 */
function getColorFromIndex(index, saturation = 65, lightness = 50) {
    const hue = (index * 137.508) % 360; // Golden angle
    return `hsl(${hue.toFixed(0)}, ${saturation}%, ${lightness}%)`;
}

/**
 * Obtiene el color predefinido para un continente o genera uno pseudo-aleatorio.
 * @param {string|null} continente Nombre del continente.
 * @returns {string} Color CSS (rgb o hsl).
 */
function getColorForContinent(continente) {
    if (!continente) return PALETTE?.text_lighter || '#aaaaaa'; // Usar gris si no hay continente
    // Acceder a CONTINENT_COLORS (de config.js)
    const colors = typeof CONTINENT_COLORS !== 'undefined' ? CONTINENT_COLORS : {};
    if (colors[continente]) {
        return colors[continente];
    }
    // Fallback: generar color basado en hash del nombre
    const hash = continente.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    // Usar una saturación/luminosidad similar a los colores definidos
    return getColorFromIndex(hash, 60, 50);
}

/**
 * Formatea un año numérico a string con "a.C." o "d.C." (o año 0).
 * @param {number|null|undefined} year Año numérico (negativo es a.C.).
 * @returns {string} Año formateado o '?'.
 */
function formatYear(year) {
     if (year === null || typeof year === 'undefined') return '?';
     const absYear = Math.round(Math.abs(year));
    if (year < 0) return `${absYear} a.C.`;
    if (year === 0) return 'Año 0';
    return `${absYear} d.C.`;
}

// --- FUNCIONES MOVIDAS/REFINADAS (v7) ---

/**
 * Parsea un string de cronología en años de inicio/fin y confianza. (v7)
 * @param {string|null} timelineText Texto como "ca. 3500 - 2000 a.C.", "s. V d.C.", etc.
 * @returns {{startYear: number|null, endYear: number|null, confidence: number}}
 */
function parseTimelineDates(timelineText) {
    if (!timelineText || typeof timelineText !== 'string') {
        return { startYear: null, endYear: null, confidence: 0 };
    }
    try {
        let text = timelineText.toLowerCase().trim();
        let confidence = 0.9; // Confianza alta por defecto

        // Detectar indicadores de incertidumbre
        if (text.includes('ca.') || text.includes('aprox.') || text.includes('?') || text.includes('~') || text.includes('circa')) {
            confidence = 0.6;
        }
        if (text.includes('principios') || text.includes('mediados') || text.includes('fines')) {
            confidence = Math.max(0.2, confidence - 0.2); // Aún menos preciso
        }

        // Manejar siglos (ej: "s. v a.c.", "s. III d.c.")
        const sigloMatch = text.match(/s\.?\s*([ivx]+)\s*(a\.?c\.?|d\.?c\.?|bce|ce|ad|bc)?/);
        if (sigloMatch) {
            const romanNumeral = sigloMatch[1];
            const eraIndicator = sigloMatch[2];
            const century = romanToInt(romanNumeral);
            if (century) {
                const isBC = eraIndicator?.includes('a.c') || eraIndicator?.includes('bc');
                const start = (century - 1) * 100;
                const end = century * 100 -1; // Siglo termina en el año xx99
                 // Ajustar para caso especial siglo I
                 const finalStart = start === 0 ? 1 : start;


                let sYear = isBC ? -end : finalStart; // Ej: s. V a.C. es -500 a -401 -> más reciente es -401
                let eYear = isBC ? -finalStart : end;   // Ej: s. III d.C. es 200 a 299 -> más reciente es 299

                 // Corrección para siglo I aC
                 if (isBC && century === 1) { sYear = -100; eYear = -1;}


                confidence = Math.max(0.2, confidence - 0.2); // Siglos son menos precisos que años
                 // Asegurar orden
                 if(sYear > eYear) [sYear, eYear] = [eYear, sYear];
                return { startYear: sYear, endYear: eYear, confidence: confidence };
            }
        }

        // Extraer números (ignorar los de 10k, 750 si son parte del título)
        const numbers = text.replace('(10k ac - 750 dc)','').match(/\d+/g);
        if (!numbers || numbers.length === 0) {
            // Podría ser algo como "neolítico medio" sin fechas - devolver null
            return { startYear: null, endYear: null, confidence: 0 };
        }

        let startYear, endYear;
        const year1 = parseInt(numbers[0], 10);
        const year2 = numbers.length > 1 ? parseInt(numbers[1], 10) : null;
        const hasBC = text.includes('a.c') || text.includes('ac') || text.includes('bce') || text.includes('bc');
        const hasAD = text.includes('d.c') || text.includes('dc') || text.includes('ce') || text.includes('ad');

        if (year2 !== null) { // Rango
            // ... (Lógica de parseo de rango como en la versión anterior de utils.js v3) ...
             if (hasBC && !hasAD) { startYear = -Math.max(year1, year2); endYear = -Math.min(year1, year2); }
             else if (hasAD && !hasBC) { startYear = Math.min(year1, year2); endYear = Math.max(year1, year2); }
             else if (hasBC && hasAD) {
                  const bcIdx = text.search(/a\.c|ac|bce|bc/); const adIdx = text.search(/d\.c|dc|ce|ad/);
                  if (bcIdx !== -1 && adIdx !== -1) { if (bcIdx < adIdx) { startYear = -year1; endYear = year2; } else { startYear = -year2; endYear = year1; } }
                  else { startYear = year1 > 750 ? -year1 : year1; endYear = year2 > 750 ? -year2 : year2; confidence -= 0.1; }
             } else {
                  if (year1 > 750 && year2 > 750) { startYear = -Math.max(year1, year2); endYear = -Math.min(year1, year2); confidence -= 0.1;}
                  else { startYear = year1 > 750 ? -year1 : year1; endYear = year2 > 750 ? -year2 : year2; confidence -= 0.1; }
             }
             if (startYear > endYear) [startYear, endYear] = [endYear, startYear];

        } else { // Solo una fecha
            startYear = (hasBC || (!hasAD && year1 > 750 && year1 > 1000)) ? -year1 : year1; // Umbral más alto para asumir a.C.
            // Asignar rango pequeño, más corto si es d.C. reciente
            endYear = startYear + (startYear < 500 ? 50 : 100);
            confidence = Math.max(0.1, confidence - 0.3); // Baja confianza
        }

        if (startYear === null || endYear === null || typeof startYear === 'undefined' || typeof endYear === 'undefined' || startYear > endYear) {
             return { startYear: null, endYear: null, confidence: 0 };
        }

        return { startYear: Math.round(startYear), endYear: Math.round(endYear), confidence: parseFloat(confidence.toFixed(2)) };

    } catch (error) {
        console.error(`Error parseando fecha: "${timelineText}"`, error);
        return { startYear: null, endYear: null, confidence: 0 };
    }
}

/**
 * Helper para convertir números romanos (simplificado, hasta ~50).
 * @param {string} roman Numeral romano (I, V, X, L).
 * @returns {number | null} Número entero o null si inválido.
 */
function romanToInt(roman) {
    if (!roman) return null;
    const romanMap = { I: 1, V: 5, X: 10, L: 50 }; // Añadir C=100, D=500, M=1000 si es necesario
    let result = 0;
    let prevValue = 0;
    for (let i = roman.length - 1; i >= 0; i--) {
        const char = roman[i].toUpperCase();
        const value = romanMap[char];
        if (!value) return null; // Caracter inválido
        if (value < prevValue) {
            result -= value; // Caso sustractivo (IV, IX, XL)
        } else {
            result += value;
        }
        prevValue = value;
    }
    return result > 0 ? result : null;
}


/**
 * Calcula la importancia relativa de una civilización. (v7 - Sin cambios)
 */
function calculateSignificance(civilization) {
    // ... (Misma lógica que v3/v6) ...
    let score = 1.0; if (!civilization) return score;
    const arch = civilization['Arquitectura Notable'] || ''; const tech = civilization['Tecnologías Clave'] || ''; const writing = civilization['Sistemas Registro / Escritura'] || ''; const hierarchy = civilization['Evidencia Jerarquía Social'] || '';
    if (arch.length > 15 && !arch.toLowerCase().includes('no evid') && !arch.toLowerCase().includes('simple')) score += 0.1;
    if (tech.length > 20 && !tech.toLowerCase().includes('no evid')) score += 0.1;
    if (writing && !writing.toLowerCase().includes('ausente') && !writing.toLowerCase().includes('no evid') && writing.length > 5) score += 0.2;
    if (hierarchy && (hierarchy.includes('Estado') || hierarchy.includes('Imperio') || hierarchy.includes('Monarquía') || hierarchy.includes('Centralizada') || hierarchy.includes('compleja'))) score += 0.15;
    const { startYear, endYear } = parseTimelineDates(civilization['Cronología Aprox. (10k aC - 750 dC)'] || '');
    if (startYear === null || endYear === null) score -= 0.2; else if (endYear - startYear < 200) score -= 0.05;
    return Math.max(0.6, Math.min(1.6, score));
}

/**
 * Extrae eventos clave de una civilización. (v7 - Sin cambios)
 */
function extractKeyEvents(civilization) {
    // ... (Misma lógica que v3/v6) ...
     const events = []; if (!civilization) return events;
     const { startYear, endYear } = parseTimelineDates(civilization['Cronología Aprox. (10k aC - 750 dC)'] || ''); if (startYear === null || endYear === null) return events;
     const duration = endYear - startYear; if (duration <= 0) return events;
     const early = startYear + duration * 0.2; const middle = startYear + duration * 0.5; const late = startYear + duration * 0.8;
     const tech = (civilization['Tecnologías Clave'] || '').toLowerCase(); const writing = (civilization['Sistemas Registro / Escritura'] || '').toLowerCase(); const arch = (civilization['Arquitectura Notable'] || '').toLowerCase(); const hierarchy = (civilization['Evidencia Jerarquía Social'] || '').toLowerCase();
     if (tech.includes('bronce') || tech.includes('hierro') || tech.includes('metalurgia')) events.push({ name: 'Metalurgia', year: middle, type: 'metal' });
     if (writing && !writing.includes('ausente') && !writing.includes('no evid') && writing.length > 5) events.push({ name: 'Escritura', year: early + duration * 0.1, type: 'writing' });
     if (arch && !arch.includes('no evid') && !arch.includes('simple') && arch.length > 15) { if (arch.includes('monumental') || arch.includes('pirámide') || arch.includes('templo') || arch.includes('palacio') || arch.includes('zigurat') || arch.includes('muralla') || arch.includes('megalito')) events.push({ name: 'Arq. Monumental', year: middle, type: 'architecture' }); }
     if (hierarchy && (hierarchy.includes('estado') || hierarchy.includes('imperio') || hierarchy.includes('monarquía') || hierarchy.includes('centralizada') || hierarchy.includes('compleja'))) events.push({ name: 'Org. Estatal', year: late, type: 'state' });
     return events.filter(e => e.year >= startYear && e.year <= endYear);
}


/**
 * Convierte hex a rgba. (v7 - Sin cambios)
 */
function hexToRgba(hex, alpha = 1) {
    // ... (Misma lógica que v3/v6) ...
    if (!hex) return `rgba(128, 128, 128, ${alpha})`;
     if (hex.startsWith('rgba')) { return hex.replace(/[\d\.]+\)$/g, `${alpha})`); }
     if (hex.startsWith('rgb')) { return hex.replace('rgb', 'rgba').replace(')', `, ${alpha})`); }
     let c; if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) { c = hex.substring(1).split(''); if (c.length == 3) { c = [c[0], c[0], c[1], c[1], c[2], c[2]]; } c = '0x' + c.join(''); const r = (c >> 16) & 255; const g = (c >> 8) & 255; const b = c & 255; return `rgba(${r}, ${g}, ${b}, ${alpha})`; }
    return `rgba(128, 128, 128, ${alpha})`;
}

/**
 * Convierte color CSS a objeto HSLA. (v7 - Añadida)
 */
function cssColorToHsla(colorString) {
    // ... (Lógica proporcionada en la instrucción anterior) ...
     try {
         const dummy = document.createElement('div'); dummy.style.color = colorString; document.body.appendChild(dummy);
         const computedColor = window.getComputedStyle(dummy).color; document.body.removeChild(dummy);
         const match = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d\.]+))?\)/); if (!match) return null;
         let r = parseInt(match[1])/255, g = parseInt(match[2])/255, b = parseInt(match[3])/255, a = match[4]?parseFloat(match[4]):1;
         const max = Math.max(r, g, b), min = Math.min(r, g, b); let h, s, l = (max + min) / 2;
         if (max === min) { h = s = 0; } else { const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min); switch (max) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; case b: h = (r - g) / d + 4; break; } h /= 6; }
         return { h: h * 360, s: s * 100, l: l * 100, a: a };
     } catch (e) { console.error("Error cssColorToHsla:", colorString, e); return null; }
}

/**
 * Convierte objeto HSLA a string CSS rgba(). (v7 - Añadida)
 */
function hslaToCss(hsl, alpha = null) {
     // ... (Lógica proporcionada en la instrucción anterior) ...
     if(!hsl) return 'rgba(0,0,0,0)'; // Fallback si hsl es null
     const h = hsl.h / 360; const s = hsl.s / 100; const l = hsl.l / 100; const a = alpha !== null ? alpha : hsl.a; let r, g, b;
     if (s === 0) { r = g = b = l; } else { const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }; const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q; r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3); }
     return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
}

/**
 * Helper para ajustar luminosidad de un color RGBA (usa helpers HSL). (v7 - Añadida)
 * @param {string} rgbaColor String color 'rgba(...)' o 'rgb(...)'.
 * @param {number} amountPercent Cantidad a sumar/restar a la luminosidad (-100 a 100).
 * @returns {string} Nuevo color rgba().
 */
function addLightnessToRgba(rgbaColor, amountPercent) {
    if (!rgbaColor) return 'rgba(0,0,0,0)';
    const hsla = cssColorToHsla(rgbaColor);
    if (!hsla) return rgbaColor; // Devolver original si falla la conversión
    hsla.l = Math.max(0, Math.min(100, hsla.l + amountPercent)); // Ajustar y limitar L
    return hslaToCss(hsla, hsla.a); // Mantener alpha original
}

// AÑADIR ESTO A utils.js:

/**
 * Registra un mensaje en la consola con marca de tiempo. (Movido a utils.js v7)
 * @param {string} message - Mensaje a registrar.
 * @param {'log'|'warn'|'error'} [type='log'] - Tipo de mensaje.
 */
function logWithTimestamp(message, type = 'log') {
    // Asumir que DEBUG_MODE podría definirse en config.js para logs condicionales
    // if (typeof config !== 'undefined' && !config.DEBUG_MODE && type === 'log') return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); // Formato HH:MM:SS
    const formattedMessage = `[${timestamp}] ${message}`;

    switch (type) {
        case 'warn':
            console.warn(formattedMessage);
            break;
        case 'error':
            console.error(formattedMessage);
            break;
        default:
            console.log(formattedMessage);
    }
}

console.log("utils.js (v7) cargado.");


// --- Fin de utils.js ---