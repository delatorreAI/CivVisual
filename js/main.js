/**
 * main.js (v7)
 * Punto de entrada principal de la aplicación Atlas (index.html).
 * Coordina la inicialización, carga de datos y configuración de listeners.
 * - Mejora manejo de errores y carga asíncrona de datos.
 * - Añade JSDoc y optimiza la secuencia de inicio.
 * - Revisa atajos de teclado.
 */

// Variable global para registrar el inicio (opcional)
const appStartTime = new Date();



/**
 * Manejador principal de errores globales de la aplicación.
 * @param {string} message - Mensaje de error.
 * @param {string} [source] - Origen del error (archivo/función).
 * @param {number} [lineno] - Número de línea.
 * @param {number} [colno] - Número de columna.
 * @param {Error} [error] - Objeto Error.
 * @returns {boolean} True para indicar que el error fue manejado.
 */
window.onerror = function(message, source, lineno, colno, error) {
     const errorDetail = error ? `\nDetalle: ${error.stack || error}` : '';
     logWithTimestamp(`Error Global No Capturado: "${message}" en ${source}:${lineno}:${colno}${errorDetail}`, 'error');
     // Podríamos intentar mostrar un mensaje genérico al usuario aquí
     const errorDiv = document.getElementById('app-error-message'); // ID Hipotético
     if (errorDiv) {
         errorDiv.textContent = "Ocurrió un error inesperado. Por favor, recarga la página.";
         errorDiv.style.display = 'block';
     }
     return true; // Prevenir que el navegador muestre su propio diálogo de error
 };


/**
 * Maneja atajos de teclado globales.
 * @param {KeyboardEvent} event - Evento de teclado.
 */
function handleKeyboardShortcuts(event) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlCmd = isMac ? event.metaKey : event.ctrlKey; // Cmd en Mac, Ctrl en otros

    // Exportar: Ctrl/Cmd + Shift + E
    if (ctrlCmd && event.shiftKey && (event.key === 'E' || event.key === 'e')) {
        event.preventDefault();
        logWithTimestamp("Atajo detectado: Exportar CSV");
        if (typeof exportToCSV === 'function') {
            exportToCSV(); // Función definida en table.js
        } else {
            console.warn("Función exportToCSV no disponible.");
        }
    }

    // Buscar: Ctrl/Cmd + F (solo en pestaña tabla)
    if (ctrlCmd && (event.key === 'F' || event.key === 'f')) {
        const activeTabLink = document.querySelector('.nav-tab.active');
        const searchInput = document.getElementById(DOM_IDS?.searchInput); // Usar ID de config

        if (activeTabLink?.dataset?.tab === 'tabla' && searchInput) {
            event.preventDefault(); // Prevenir búsqueda nativa del navegador
            logWithTimestamp("Atajo detectado: Enfocar Búsqueda");
            searchInput.focus();
            searchInput.select(); // Seleccionar texto existente
        }
    }

    // Podrían añadirse más atajos aquí (ej: cambiar pestaña, resetear filtros)
}


/**
 * Función principal de inicialización de la aplicación (index.html).
 */
async function initializeMainApp() {
    logWithTimestamp(`Inicializando ${APP_NAME || 'App'} v${APP_VERSION || '?'} (v7)...`);
    const loadingMessageDiv = document.getElementById('main-loading-message'); // ID hipotético para mensaje global

    try {
        // 1. Verificar Dependencias Críticas
        logWithTimestamp("Verificando dependencias...");
        if (!checkExternalDependencies()) { // checkExternalDependencies en utils.js
            throw new Error("Faltan dependencias externas críticas.");
        }

        // 2. Configurar UI Básica (Listeners, Tabs) que no dependen de datos
        logWithTimestamp("Configurando UI básica...");
        if (typeof setupEventListeners === 'function') setupEventListeners(); else console.warn("setupEventListeners no definido.");
        if (typeof setupTabNavigation === 'function') setupTabNavigation(); else console.warn("setupTabNavigation no definido.");
        document.addEventListener('keydown', handleKeyboardShortcuts); // Listener de teclado

        // 3. Mostrar estado de carga inicial en UI
        if (typeof setUILoadingState === 'function') setUILoadingState(true);
        if (loadingMessageDiv) loadingMessageDiv.textContent = "Cargando datos de civilizaciones...";

        // 4. Cargar Datos Asíncronamente
        logWithTimestamp("Iniciando carga de datos...");
        if (typeof loadCSVAutomatically !== 'function') {
            throw new Error("Función loadCSVAutomatically no definida.");
        }
        // Esperar a que la promesa de carga se resuelva
        const loadedData = await loadCSVAutomatically(); // Usa la versión con Promise de data.js

        logWithTimestamp(`Datos cargados: ${loadedData?.length || 0} registros.`);
        if (!loadedData || loadedData.length === 0) {
             throw new Error("No se cargaron datos o el archivo está vacío.");
        }

        // 5. Inicializar Componentes que Dependen de Datos
        logWithTimestamp("Inicializando componentes con datos...");
        // Llamar a la función de ui.js que puebla filtros, renderiza tabla, etc.
        if (typeof initializeAppWithData === 'function') {
            initializeAppWithData();
        } else {
            // Fallback manual si initializeAppWithData no existe (menos ideal)
            console.warn("initializeAppWithData no definido, intentando inicialización manual...");
            if (typeof setUILoadingState === 'function') setUILoadingState(false);
            if (typeof updateStatisticsFromData === 'function') updateStatisticsFromData();
            if (typeof populateFilters === 'function') populateFilters();
            if (typeof renderTable === 'function') renderTable();
            if (typeof initCharts === 'function') initCharts();
        }

        if (loadingMessageDiv) loadingMessageDiv.style.display = 'none'; // Ocultar mensaje de carga
        logWithTimestamp("Aplicación inicializada correctamente.");

    } catch (error) {
        logWithTimestamp(`Error fatal durante la inicialización: ${error.message}`, 'error');
        console.error(error); // Mostrar stack trace
        // Mostrar mensaje de error al usuario
        if (loadingMessageDiv) {
            loadingMessageDiv.textContent = `Error al iniciar: ${error.message}. Intenta recargar.`;
            loadingMessageDiv.style.color = 'red';
        } else {
            alert(`Error al iniciar la aplicación: ${error.message}`);
        }
        // Opcionalmente deshabilitar UI si la carga falló críticamente
        // if (typeof setUILoadingState === 'function') setUILoadingState(true);
    }
}

// --- Ejecución al Cargar el DOM ---
document.addEventListener('DOMContentLoaded', initializeMainApp);

// --- Listener Opcional de Cierre ---
window.addEventListener('beforeunload', () => {
    const endTime = new Date();
    const sessionDuration = (endTime.getTime() - appStartTime.getTime()) / 1000; // Segundos
    logWithTimestamp(`Cerrando sesión. Duración: ${sessionDuration.toFixed(1)}s`);
    // Aquí se podrían guardar estados si fuera necesario
});

console.log("main.js (v7) cargado.");
// --- Fin de main.js ---