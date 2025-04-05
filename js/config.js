/**
 * config.js (v7)
 * Configuración global, variables compartidas y constantes para la aplicación Atlas.
 * - Centraliza ESTRATOS_CONFIG.
 * - Añade IDs de layout.html a DOM_IDS.
 */

// ==================================
// --- Variables Globales de Datos ---
// ==================================
let civilizacionesData = [];  // Datos originales sin filtrar (cargados desde CSV)
let filteredData = [];        // Datos después de aplicar filtros (usados por tabla/gráficos)
let currentPage = 1;          // Página actual de la tabla (para index.html)
const itemsPerPage = 25;      // Elementos por página (para index.html) - Se podría hacer configurable

// ==================================
// --- Constantes de Aplicación ---
// ==================================
const CSV_FILENAME = 'matriz.csv';
const APP_VERSION = '1.0.0-beta.7'; // Actualizar versión
const APP_NAME = 'Atlas de Civilizaciones Antiguas';

// ==================================
// --- Configuración de Colores ---
// ==================================
// Paleta Principal (v5 - tonos terrosos)
const PALETTE = {
    primary: '#a05a2c', primary_dark: '#7a4521', primary_light: '#c88a5a',
    secondary: '#b8860b', secondary_dark: '#8b6508', secondary_light: '#d4a01a',
    accent: '#5f7c8a', accent_dark: '#465b65', accent_light: '#819caa',
    background: '#fdfaf4', background_dark: '#f0e8d9', surface: '#ffffff',
    text: '#3a3024', text_light: '#6f6151', text_lighter: '#9a8d7e',
    border: '#dcd0c0', shadow: 'rgba(80, 60, 40, 0.15)',
    success: '#609966', error: '#c04040', warning: '#d9a05b', info: '#6a98b9', purple: '#8a6a9a',
    white: '#FFFFFF', black: '#000000'
};

// Colores por Continente
const CONTINENT_COLORS = {
    'África': PALETTE.primary, //'#a5a83b', // Verde oliva - Reemplazado por Primario
    'Asia': PALETTE.secondary, //'#c48a46',   // Ocre/Tierra - Reemplazado por Secundario
    'Europa': PALETTE.accent, //'#6a98b9', // Azul pizarra - Reemplazado por Acento
    'América del Norte': PALETTE.error, //'#c06c5c', // Rojo óxido - Reemplazado por Error (Terracota)
    'América del Sur': PALETTE.purple, //'#a06a9a', // Púrpura suave
    'Oceanía': PALETTE.success, //'#5aa89a', // Verde Musgo - Reemplazado por Success
    'Desconocido': '#aaaaaa'
};

// ==================================
// --- Configuración Tabla (index.html) ---
// ==================================
// Columnas visibles por defecto en la tabla principal
let columnsToDisplay = {
    "Continente": true,
    "Gran Región / Subcontinente": true,
    "Región Específica / Área Cultural": false, // Oculta por defecto
    "Cultura / Sociedad": true,
    "Cronología Aprox. (10k aC - 750 dC)": true,
    "Subsistencia Principal": true,
    "Patrón Asentamiento": false, // Oculta por defecto
    "Arquitectura Notable": true,
    "Tecnologías Clave": true,
    "Evidencia Jerarquía Social": false, // Oculta por defecto
    "Redes Intercambio (Alcance)": false, // Oculta por defecto
    "Sistemas Registro / Escritura": true
};

// ==================================
// --- Configuración Gráficos ---
// ==================================
// Referencias a instancias de Chart.js (gestionadas en charts.js y estratos-timeline.js)
let continentChart = null;
let timelineChart = null;
let correlationChart = null;
let writingChart = null;
let estratosTimelineInstance = null; // Instancia para la nueva visualización

// Configuración base para Chart.js (usada en charts.js)
const CHART_CONFIG_BASE = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top',
            labels: { font: { family: "'Source Sans Pro', sans-serif", size: 11 } }
        },
        tooltip: {
            mode: 'index',
            intersect: false,
            titleFont: { family: "'Source Sans Pro', sans-serif", weight: '600' },
            bodyFont: { family: "'Source Sans Pro', sans-serif" }
        },
        title: { // Título por defecto (se puede sobreescribir)
            display: true,
             font: { family: "'Cinzel', serif", size: 14, weight: '700' },
             color: PALETTE.primary_dark,
             padding: { top: 10, bottom: 15 }
        }
    },
    // Configuración de fuentes globales para Chart.js
    // Chart.defaults.font.family = PALETTE.font_body; // Se podría definir aquí o en JS
};


// ==================================
// --- Configuración Estratos Temporales (layout.html) ---
// ==================================
const ESTRATOS_CONFIG = {
    // Dimensiones y Espaciado
    barHeight: 16, barGap: 3, regionGap: 20, continentGap: 30,
    marginTop: 30, marginLeft: 170,
    // Colores Periodos (usando variables CSS si es posible, o valores directos)
    // Se usa rgba para transparencia inherente
    periodColors: {
        'Default': 'rgba(220, 220, 220, 0.1)', 'Neolítico': 'rgba(188, 212, 188, 0.15)',
        'Calcolítico': 'rgba(218, 188, 150, 0.15)', 'Edad del Bronce': 'rgba(205, 150, 80, 0.15)',
        'Edad del Hierro': 'rgba(180, 180, 190, 0.15)', 'Antigüedad Clásica': 'rgba(173, 216, 230, 0.18)',
        'Periodo Tardío': 'rgba(210, 180, 222, 0.15)',
    },
    // Rangos de Periodos Globales (aproximados)
    globalPeriods: [
        { name: 'Neolítico', start: -10000, end: -4500 }, { name: 'Calcolítico', start: -4500, end: -3300 },
        { name: 'Edad del Bronce', start: -3300, end: -1200 }, { name: 'Edad del Hierro', start: -1200, end: -500 },
        { name: 'Antigüedad Clásica', start: -500, end: 500 }, { name: 'Periodo Tardío', start: 500, end: 750 }
    ],
    // Iconos para Hitos (Unicodes FontAwesome 6 Free)
    iconMap: {
        'writing': '\uf5ae', 'metal': '\uf7d9', 'architecture': '\uf66f', 'state': '\uf521',
    },
    // Colores para iconos fallback (círculos)
    eventIconColors: {
        'writing': PALETTE.info, 'metal': PALETTE.warning, 'architecture': PALETTE.success, 'state': PALETTE.purple, 'default': PALETTE.text_lighter
    },
    // Fuentes (referencias a variables CSS o strings directos)
    // Nota: Asegurarse que las fuentes estén cargadas en el HTML/CSS
    fontLabel: '10.5px "Source Sans Pro", sans-serif',
    fontTitle: 'bold 14px "Cinzel", serif', // Más grande
    fontRegion: 'italic 11px "Source Sans Pro", sans-serif',
    fontAxis: '10px "Source Sans Pro", sans-serif',
    fontTooltip: '12px "Source Sans Pro", sans-serif',
    fontIcon: '10px "Font Awesome 6 Free"', // Necesita que FA6 esté cargado y accesible
    // Estilos Dibujo Canvas
    barBorderColor: 'rgba(0, 0, 0, 0.15)',
    barBorderWidth: 0.5,
    labelOnBarColor: PALETTE.surface, // Texto blanco
    labelOnBarStrokeColor: PALETTE.black, // Borde negro
    labelOnBarStrokeWidth: 1.5, // Ajustar para legibilidad
    groupSeparatorColor: 'rgba(180, 180, 180, 0.5)',
    // Interacción
    hoverHighlightColor: 'rgba(0, 0, 0, 0.06)',
    hoverBorderColor: 'rgba(0, 0, 0, 0.6)',
    hoverIconSize: 4, // Radio del círculo fallback
};

// ==================================
// --- IDs de Elementos DOM ---
// ==================================
// Agrupados por vista para mayor claridad
const DOM_IDS = {
    // --- Comunes / App General ---
    uploadStatus: 'upload-status',
    csvFile: 'csv-file',
    notificationContainer: 'notification-container',
    modalOverlay: 'modal-overlay',
    detailModal: 'detail-modal',
    modalTitle: 'modal-title',
    modalContent: 'modal-content',
    modalClose: 'modal-close',

    // --- index.html (Vista Principal) ---
    // Pestañas Contenido
    tableContent: 'tabla-content',
    visualContent: 'visualizacion-content',
    comparativaContent: 'comparativa-content',
    cronologiaContent: 'cronologia-content', // ID del contenedor de la pestaña original
    // Filtros Tabla
    continenteFilter: 'continente-filter',
    regionFilter: 'region-filter',
    subsistenciaFilter: 'subsistencia-filter',
    periodFilter: 'period-filter',
    searchInput: 'search-input',
    resetFilters: 'reset-filters',
    applyFilters: 'apply-filters',
    columnToggle: 'column-toggle',
    toggleFiltersBtn: 'toggle-filters', // Botón expandir/colapsar
    // Tabla
    civilizacionesTable: 'civilizaciones-table',
    pagination: 'pagination',
    exportBtn: 'export-btn',
    // Estadísticas
    totalCivilizaciones: 'total-civilizaciones',
    totalContinentes: 'total-continentes',
    totalRegiones: 'total-regiones',
    rangoTemporal: 'rango-temporal',
    // Gráficos (index.html)
    continentChart: 'continent-chart',
    timelineChart: 'timeline-chart', // El scatter plot simple
    correlationChart: 'correlation-chart',
    writingChart: 'writing-chart',
    // Timeline Viz Original (index.html - Ríos del Tiempo)
    timelineVizCanvas: 'timeline-viz-canvas', // El canvas de la v1 de timeline
    timelineVizControls: 'timeline-viz-controls',

    // --- layout.html (Estratos Temporales) ---
    estratosContainer: 'estratos-container', // ID añadido para el contenedor principal
    estratosControls: 'estratos-controls',
    zoomInBtn: 'zoom-in-btn', // Añadidos IDs específicos para botones de zoom
    zoomOutBtn: 'zoom-out-btn',
    resetZoomBtn: 'reset-zoom-btn',
    togglePeriodsBtn: 'toggle-periods-btn', // Añadidos IDs específicos para toggles
    toggleHoverIconsBtn: 'toggle-hover-icons-btn',
    estratosChartWrapper: 'estratos-chart-wrapper',
    estratosTimelineCanvas: 'estratos-timeline-canvas',
    estratosTooltip: 'estratos-tooltip',
    estratosLegend: 'estratos-legend',
    legendContentPlaceholder: 'legend-content-placeholder', // Div dentro de la leyenda
    estratosLoadingMessage: 'estratos-loading-message' // Mensaje carga/error
};

// ==================================
// --- Fin de Configuración ---
// ==================================
console.log("config.js (v7) cargado.");