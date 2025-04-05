/**
 * data.js (v7)
 * Funciones para carga, procesamiento, filtrado y manipulación de datos del Atlas.
 * - Centraliza lógica de parseo CSV.
 * - Mejora robustez en acceso a datos y manejo de errores.
 * - Añade JSDoc y limpieza general.
 * - Usa modo estricto.
 */

'use strict';

// Variables globales (declaradas en config.js, usadas aquí)
// let civilizacionesData = [];
// let filteredData = [];
// let currentPage = 1; // Usado por table.js, data.js lo resetea
// const CSV_FILENAME = 'matriz.csv'; // Usado aquí

// --- Funciones Internas (Helpers) ---

/**
 * Parsea un string CSV usando PapaParse y devuelve datos válidos.
 * @param {string} csvText - El contenido del archivo CSV como string.
 * @returns {Promise<Array>} Promesa que resuelve con un array de objetos (filas válidas) o rechaza con error.
 * @private Internal helper function.
 */
function _parseCsvData(csvText) {
    return new Promise((resolve, reject) => {
        if (typeof Papa === 'undefined') {
            return reject(new Error("PapaParse no está cargado."));
        }
        if (!csvText || typeof csvText !== 'string') {
             return reject(new Error("Contenido CSV inválido o vacío."));
         }

        console.log("Parseando datos CSV...");
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: 'greedy', // Saltar líneas completamente vacías y con valores vacíos
            dynamicTyping: false, // Evitar conversión automática de tipos por ahora
            complete: (results) => {
                if (results.errors && results.errors.length > 0) {
                    console.warn('Advertencias durante parseo CSV:', results.errors);
                    // Considerar rechazar si hay errores críticos?
                    // const criticalErrors = results.errors.filter(e => e.code !== 'TooFewFields' && e.code !== 'TooManyFields');
                    // if (criticalErrors.length > 0) return reject(new Error(`Error crítico de parseo: ${criticalErrors[0].message}`));
                }

                // Filtrar filas consideradas inválidas (ej: sin Continente o Cultura)
                const validData = results.data.filter(row =>
                    row && // Asegurar que la fila no sea null/undefined
                    typeof row === 'object' && // Que sea un objeto
                    row.Continente && typeof row.Continente === 'string' && row.Continente.trim() !== '' &&
                    row['Cultura / Sociedad'] && typeof row['Cultura / Sociedad'] === 'string' && row['Cultura / Sociedad'].trim() !== ''
                );

                if (validData.length === 0 && results.data.length > 0) {
                    console.warn("CSV parseado, pero ninguna fila pasó el criterio de validación (Continente y Cultura/Sociedad requeridos).");
                     // Podríamos rechazar o resolver con array vacío
                     // reject(new Error("No se encontraron datos válidos en el CSV."));
                     resolve([]); // Devolver vacío si no hay nada válido
                } else {
                    console.log(`CSV parseado: ${validData.length} filas válidas encontradas.`);
                    resolve(validData);
                }
            },
            error: (error) => {
                console.error('Error crítico de PapaParse:', error);
                reject(new Error(`Error al parsear CSV con PapaParse: ${error.message}`));
            }
        });
    });
}

// --- Funciones Públicas ---

/**
 * Carga y parsea automáticamente el CSV definido en `CSV_FILENAME`.
 * Actualiza las variables globales `civilizacionesData` y `filteredData`.
 * @returns {Promise<Array>} Promesa que resuelve con los datos cargados o rechaza con error.
 */
function loadCSVAutomatically() {
    logWithTimestamp('Intentando cargar CSV automáticamente (v7)...'); // Asume logWithTimestamp existe
    const statusElement = document.getElementById(DOM_IDS?.uploadStatus);
    updateStatus(statusElement, "⏳ Cargando archivo CSV...", 'info'); // Usar 'info' para estado neutral

    // Retornar la promesa para encadenamiento
    return new Promise((resolve, reject) => {
        // Evitar recargar si ya existen datos
        if (typeof civilizacionesData !== 'undefined' && civilizacionesData.length > 0) {
            logWithTimestamp('Datos ya estaban cargados, usando caché.');
            updateStatus(statusElement, `✅ Datos disponibles (${civilizacionesData.length} registros).`, 'success');
             // Asegurar que filteredData esté sincronizado
             if (typeof filteredData === 'undefined' || filteredData.length === 0 || filteredData.length !== civilizacionesData.length) {
                 filteredData = [...civilizacionesData];
             }
            resetFiltersWithoutRendering(); // Resetear UI de filtros
            resolve(civilizacionesData);
            return;
        }

        // Proceder con fetch
        fetch(CSV_FILENAME)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error HTTP ${response.status} al obtener ${CSV_FILENAME}`);
                }
                return response.text();
            })
            .then(csvText => _parseCsvData(csvText)) // Usar helper interno
            .then(validData => {
                civilizacionesData = validData;
                filteredData = [...civilizacionesData]; // Inicializar datos filtrados
                updateStatus(statusElement, `✅ CSV cargado: ${validData.length} registros.`, 'success');
                resetFiltersWithoutRendering();
                resolve(civilizacionesData); // Resolver con los datos
            })
            .catch(error => {
                console.error('Error en loadCSVAutomatically (v7):', error);
                updateStatus(statusElement, `⚠️ Error carga CSV: ${error.message}`, 'error');
                // Asegurarse que las variables de datos estén vacías en caso de error
                civilizacionesData = [];
                filteredData = [];
                if(typeof renderTable === 'function') renderTable(); // Mostrar tabla vacía
                reject(error); // Rechazar la promesa
            });
    });
}


/**
 * Maneja la carga de un archivo CSV seleccionado manualmente por el usuario.
 * Actualiza `civilizacionesData` y `filteredData`.
 * @param {Event} event - Evento 'change' del input[type=file].
 * @returns {Promise<Array>} Promesa que resuelve con los datos cargados o rechaza.
 */
function handleFileUpload(event) {
    logWithTimestamp('Iniciando carga manual de archivo (v7)...');
    const file = event.target.files?.[0]; // Usar optional chaining
    const statusElement = document.getElementById(DOM_IDS?.uploadStatus);

    return new Promise((resolve, reject) => {
        if (!file) {
            updateStatus(statusElement, 'No se seleccionó archivo.', 'warning');
            return reject(new Error('No se seleccionó archivo.')); // Rechazar promesa
        }
        // Validación de tipo más robusta
        if (!file.type.startsWith('text/csv') && !file.name.toLowerCase().endsWith('.csv')) {
            updateStatus(statusElement, 'Archivo no válido (no es .csv).', 'error');
            return reject(new Error('Archivo no válido (no es CSV).'));
        }

        updateStatus(statusElement, `⏳ Cargando ${file.name}...`, 'info');

        const reader = new FileReader();

        reader.onload = (e) => {
            const csvText = e.target?.result;
            if (typeof csvText !== 'string') {
                 return reject(new Error("Error al leer el contenido del archivo."));
            }
            _parseCsvData(csvText) // Usar helper interno
                .then(data => {
                    civilizacionesData = data;
                    filteredData = [...civilizacionesData];
                    updateStatus(statusElement, `✅ Archivo cargado: ${data.length} registros.`, 'success');
                    resetFiltersWithoutRendering();

                    // Asumimos que si hay carga manual, estamos en index.html y necesita reinicialización completa
                    if (typeof initializeAppWithData === 'function') {
                        initializeAppWithData(); // Llamar a la función de ui.js
                    } else {
                        console.warn("initializeAppWithData no definida, la UI puede no actualizarse tras carga manual.");
                        // Podríamos intentar actualizar manualmente lo esencial si es necesario
                         if(typeof populateFilters === 'function') populateFilters();
                         if(typeof renderTable === 'function') renderTable();
                         if(typeof updateCharts === 'function') updateCharts();
                         // No actualizar stats aquí, initializeAppWithData lo hace
                    }
                    resolve(data); // Resolver promesa
                })
                .catch(error => { // Capturar error de _parseCsvData
                    console.error('Error al procesar CSV manual:', error);
                    updateStatus(statusElement, `❌ Error al procesar: ${error.message}`, 'error');
                    reject(error);
                });
        };

        reader.onerror = (e) => {
            console.error("Error de FileReader:", e);
            updateStatus(statusElement, '❌ Error al leer el archivo.', 'error');
            reject(new Error('Error al leer el archivo con FileReader.'));
        };

        reader.readAsText(file); // Leer como texto
    });
}


/**
 * Resetea los valores de los filtros en la UI (si existen) y los datos filtrados. (v7)
 * No redibuja la tabla/gráficos directamente.
 */
function resetFiltersWithoutRendering() {
    logWithTimestamp("Reseteando filtros internamente (v7)...");
    try {
        const ids = DOM_IDS || {};
        // Resetear valores de inputs/selects solo si existen
        const contFilter = document.getElementById(ids.continenteFilter); if(contFilter) contFilter.value = '';
        const regFilter = document.getElementById(ids.regionFilter); if(regFilter) regFilter.value = '';
        const subFilter = document.getElementById(ids.subsistenciaFilter); if(subFilter) subFilter.value = '';
        const perFilter = document.getElementById(ids.periodFilter); if(perFilter) perFilter.value = '';
        const searchInput = document.getElementById(ids.searchInput); if(searchInput) searchInput.value = '';

        // Restaurar datos filtrados si civilizacionesData existe
        if (typeof civilizacionesData !== 'undefined') {
            // Solo resetear si es necesario o la primera vez
             if (typeof filteredData === 'undefined' || filteredData?.length !== civilizacionesData.length) {
                 filteredData = [...civilizacionesData]; // Siempre crear nueva copia
                 if (typeof currentPage !== 'undefined') currentPage = 1; // Resetear paginación
                 console.log('Datos filtrados reseteados a datos completos.');
             } else {
                  console.log('Filtros UI reseteados (filteredData ya contenía todos los datos).');
             }
        } else {
             filteredData = []; // Asegurar array vacío si no hay datos base
             console.warn("resetFiltersWithoutRendering: civilizacionesData no definido, filteredData reseteado a vacío.");
        }
    } catch (error) {
        console.error('Error al resetear filtros internamente:', error);
    }
}


/**
 * Aplica los filtros seleccionados en la UI a `civilizacionesData`. (v7)
 * Actualiza `filteredData` y llama a funciones de renderizado.
 */
function applyFilters() {
    logWithTimestamp('Aplicando filtros (v7)...');
    if (typeof civilizacionesData === 'undefined' || civilizacionesData.length === 0) {
        console.warn("No hay datos para filtrar.");
        filteredData = [];
        if (typeof renderTable === 'function') renderTable();
        if (typeof updateCharts === 'function') updateCharts();
        // Llamar update de Estratos si existe
         if (typeof updateEstratosVisualization === 'function' && document.getElementById(DOM_IDS?.estratosTimelineCanvas)) {
              updateEstratosVisualization();
          }
        return;
    }

    try {
        // Obtener valores de filtros (con fallbacks y optional chaining)
        const ids = DOM_IDS || {};
        const continente = document.getElementById(ids.continenteFilter)?.value ?? '';
        const region = document.getElementById(ids.regionFilter)?.value ?? '';
        const subsistencia = document.getElementById(ids.subsistenciaFilter)?.value ?? '';
        const periodo = document.getElementById(ids.periodFilter)?.value ?? '';
        const searchText = document.getElementById(ids.searchInput)?.value.toLowerCase().trim() ?? '';

        // Filtrar
        filteredData = civilizacionesData.filter(row => {
            if (!row) return false; // Saltar filas nulas/inválidas

            // Comprobaciones robustas con ?? '' para evitar errores en null/undefined
            if (continente && (row.Continente ?? '') !== continente) return false;
            if (region && (row['Gran Región / Subcontinente'] ?? '') !== region) return false;
            if (subsistencia && !(row['Subsistencia Principal'] ?? '').toLowerCase().includes(subsistencia.toLowerCase())) return false;
            if (periodo && !matchesPeriod(row['Cronología Aprox. (10k aC - 750 dC)'], periodo)) return false; // matchesPeriod debe manejar null
            if (searchText) {
                // Buscar en campos clave predefinidos para optimizar un poco
                 const searchTarget = [
                     row['Cultura / Sociedad'], row['Tecnologías Clave'], row['Arquitectura Notable'],
                     row['Región Específica / Área Cultural'], // Añadir más campos si es necesario
                 ].join(' ').toLowerCase();
                // Alternativa: buscar en *todos* los valores (más lento pero más completo)
                // const searchTarget = Object.values(row).join(' ').toLowerCase();
                if (!searchTarget.includes(searchText)) return false;
            }
            return true;
        });

        logWithTimestamp(`Filtros aplicados. ${filteredData.length} registros resultantes.`);
        if (typeof currentPage !== 'undefined') currentPage = 1; // Resetear paginación

        // Actualizar UI (Tabla y Gráficos)
        if (typeof renderTable === 'function') renderTable(); else console.warn("renderTable no definido.");
        if (typeof updateCharts === 'function') updateCharts(); else console.warn("updateCharts no definido.");
        // Actualizar Estratos si existe
         if (typeof updateEstratosVisualization === 'function' && document.getElementById(DOM_IDS?.estratosTimelineCanvas)) {
             updateEstratosVisualization(); // Esta función debe usar filteredData
         }

    } catch (error) {
        console.error('Error al aplicar filtros:', error);
        // Restaurar filteredData a todos los datos en caso de error? Podría ser confuso.
        // filteredData = [...civilizacionesData]; renderTable(); updateCharts();
        // O simplemente mostrar un error
        if (typeof showNotification === 'function') {
             showNotification("Error de Filtrado", `No se pudieron aplicar los filtros: ${error.message}`, "error");
         }
    }
}

/**
 * Resetea filtros y actualiza UI (index.html). (v7)
 */
function resetFilters() {
    logWithTimestamp('Reiniciando filtros y UI (v7)...');
    try {
        resetFiltersWithoutRendering(); // Resetea valores y filteredData

        if (typeof updateRegionFilter === 'function') updateRegionFilter(); // Actualizar regiones porque continente cambió a ''
        if (typeof renderTable === 'function') renderTable();
        if (typeof updateCharts === 'function') updateCharts();
         if (typeof updateEstratosVisualization === 'function' && document.getElementById(DOM_IDS?.estratosTimelineCanvas)) {
              updateEstratosVisualization();
          }

        logWithTimestamp('Filtros reiniciados y UI actualizada.');
         // Opcional: Notificación al usuario
         // if(typeof showNotification === 'function') showNotification("Filtros Reiniciados", "Mostrando todos los registros.", "info", "undo");
    } catch (error) {
        console.error('Error al reiniciar filtros (UI):', error);
    }
}


/**
 * Calcula estadísticas globales (llamado desde ui.js o main.js). (v7)
 */
function updateStatisticsFromData() {
    if (typeof civilizacionesData === 'undefined' || civilizacionesData.length === 0) return;
    logWithTimestamp("Calculando estadísticas globales...");
    try {
        const totalCivs = civilizacionesData.length;
        // Usar Set para obtener únicos eficientemente
        const continentes = new Set(civilizacionesData.map(row => row.Continente).filter(Boolean));
        const regiones = new Set(civilizacionesData.map(row => row['Gran Región / Subcontinente']).filter(Boolean));

        // Llamar a la función de UI para mostrar los números
        if (typeof updateStatistics === 'function') { // updateStatistics está en ui.js
            updateStatistics(totalCivs, continentes.size, regiones.size);
        } else {
            console.warn("updateStatistics no definida para mostrar totales.");
        }
    } catch (error) {
        console.error('Error al calcular/actualizar estadísticas:', error);
    }
}

/**
 * Genera datos agrupados para gráficos. (v7 - Más robusto)
 * @param {string} groupBy - Columna por la que agrupar.
 * @param {string} [valueField=null] - Columna para sub-agrupar/contar.
 * @returns {Object} Datos agrupados. Devuelve {} si no hay datos.
 */
function generateAggregatedData(groupBy, valueField = null) {
    // Usar filteredData siempre para los gráficos que dependen de filtros
    const dataToUse = typeof filteredData !== 'undefined' ? filteredData : [];
    if (dataToUse.length === 0) {
         // console.warn("generateAggregatedData: No hay datos filtrados para agregar.");
         return {}; // Devolver objeto vacío
     }

    const result = {};

    dataToUse.forEach(row => {
        if (!row || typeof row !== 'object') return; // Saltar filas inválidas

        const groupKey = row[groupBy];
        // Ignorar si la clave principal no existe o está vacía
        if (groupKey === null || typeof groupKey === 'undefined' || groupKey === '') return;

        if (!result[groupKey]) {
            result[groupKey] = valueField ? {} : 0;
        }

        if (valueField) {
            // Usar 'Desconocido' si el campo de valor está vacío/null/undefined
            const value = (row[valueField] !== null && typeof row[valueField] !== 'undefined' && row[valueField] !== '')
                          ? row[valueField]
                          : 'Desconocido';
            result[groupKey][value] = (result[groupKey][value] || 0) + 1;
        } else {
            result[groupKey]++;
        }
    });

    return result;
}

console.log("data.js (v7) cargado.");
// --- Fin de data.js ---