/**
 * table.js (v7)
 * Funciones para renderizar y gestionar la tabla de datos principal (index.html).
 * - Optimiza renderizado de tabla y paginación.
 * - Añade JSDoc y robustez.
 * - Elimina showCivilizationDetails duplicado (usa el de ui.js).
 * - Mejora accesibilidad básica.
 */

/**
 * Renderiza la tabla principal con los datos filtrados y paginados.
 * Utiliza DocumentFragment para optimizar la inserción en el DOM.
 * @throws {Error} Si elementos críticos del DOM no se encuentran.
 */
function renderTable() {
    const ids = DOM_IDS || {}; // Usar IDs de config.js
    const tableElement = document.getElementById(ids.civilizacionesTable);
    if (!tableElement) throw new Error(`Elemento tabla no encontrado: #${ids.civilizacionesTable}`);

    const thead = tableElement.querySelector('thead');
    const tbody = tableElement.querySelector('tbody');
    if (!thead || !tbody) throw new Error('Estructura de tabla inválida (falta thead o tbody).');

    // --- 1. Actualizar Encabezados (thead) ---
    // Determinar columnas visibles (desde config.js o global)
    const visibleColumns = typeof columnsToDisplay !== 'undefined'
        ? Object.keys(columnsToDisplay).filter(col => columnsToDisplay[col])
        : Object.keys(civilizacionesData[0] || {}); // Fallback: todas las columnas si columnsToDisplay no está definido

    const headerRow = thead.rows[0] || thead.insertRow(); // Usar existente o crear una
    headerRow.innerHTML = ''; // Limpiar encabezados previos

    visibleColumns.forEach(columnName => {
        const th = document.createElement('th');
        th.setAttribute('scope', 'col'); // Accesibilidad
        // Usar nombre corto si está disponible
        const shortName = typeof getShortColumnName === 'function' ? getShortColumnName(columnName) : columnName;
        // Icono (opcional, basado en ui.js o config.js)
        // const iconClass = ...;
        // th.innerHTML = `<i class="${iconClass}"></i> ${shortName}`;
        th.textContent = shortName;
        headerRow.appendChild(th);
    });

    // --- 2. Renderizar Cuerpo (tbody) ---
    tbody.innerHTML = ''; // Limpiar cuerpo previo eficientemente

    // Comprobar si hay datos filtrados
    const dataToRender = typeof filteredData !== 'undefined' ? filteredData : [];
    const totalFilteredItems = dataToRender.length;

    if (totalFilteredItems === 0) {
        const numCols = visibleColumns.length || 8; // Fallback a 8 columnas
        const tr = tbody.insertRow();
        const td = tr.insertCell();
        td.colSpan = numCols;
        td.textContent = 'No se encontraron registros que coincidan con los filtros.';
        td.className = 'loading'; // Reutilizar clase para estilo
        td.style.textAlign = 'center';
        renderPagination(0); // Renderizar paginación vacía
        console.log("Tabla renderizada: Sin resultados.");
        return;
    }

    // Calcular paginación
    const itemsPerPageNum = typeof itemsPerPage !== 'undefined' ? itemsPerPage : 25; // Usar global o default
    const currentPageNum = typeof currentPage !== 'undefined' ? currentPage : 1; // Usar global o default
    const totalPages = Math.ceil(totalFilteredItems / itemsPerPageNum);
    const startIndex = (currentPageNum - 1) * itemsPerPageNum;
    const endIndex = Math.min(startIndex + itemsPerPageNum, totalFilteredItems);

    // Crear un DocumentFragment para inserción eficiente
    const fragment = document.createDocumentFragment();

    for (let i = startIndex; i < endIndex; i++) {
        const rowData = dataToRender[i];
        const tr = document.createElement('tr');

        visibleColumns.forEach(columnName => {
            const td = document.createElement('td');
            const cellValue = rowData[columnName] || ''; // Valor por defecto vacío

            // Formato especial para Continente (Badge)
            if (columnName === 'Continente' && typeof getContinentClass === 'function') {
                 const badge = document.createElement('span');
                 badge.className = `continent-badge ${getContinentClass(cellValue)}`; // Usa función de ui.js
                 badge.textContent = cellValue;
                 td.appendChild(badge);
             }
             // Podrían añadirse otros formatos aquí (fechas, números)
             else {
                 td.textContent = cellValue;
             }
             // Opcional: Añadir title para textos largos
             // if (cellValue.length > 50) { td.title = cellValue; }
            tr.appendChild(td);
        });

        // Añadir listener para click en fila (opcional, si queremos detalles al hacer click en fila)
         // tr.addEventListener('click', () => {
         //     if(typeof showCivilizationDetails === 'function') {
         //         showCivilizationDetails(rowData); // Llama a la función de ui.js
         //     }
         // });
         // tr.style.cursor = 'pointer'; // Indicar que es clicable

        fragment.appendChild(tr);
    }

    // Añadir el fragmento al tbody (una sola operación DOM)
    tbody.appendChild(fragment);

    // --- 3. Actualizar Paginación ---
    renderPagination(totalPages);

    console.log(`Tabla renderizada (v7): Mostrando ${startIndex + 1}-${endIndex} de ${totalFilteredItems} registros.`);
}


/**
 * Renderiza los controles de paginación.
 * @param {number} totalPages - Número total de páginas.
 */
function renderPagination(totalPages) {
    const ids = DOM_IDS || {};
    const paginationContainer = document.getElementById(ids.pagination);
    if (!paginationContainer) return console.warn("Contenedor de paginación no encontrado.");

    paginationContainer.innerHTML = ''; // Limpiar

    if (totalPages <= 1) return; // No mostrar si solo hay 1 página o menos

    const currentPageNum = typeof currentPage !== 'undefined' ? currentPage : 1;

    // Botón Primera Página (Opcional)
    // paginationContainer.appendChild(createPageButton(1, '« Primera', currentPageNum === 1));

    // Botón Anterior
    paginationContainer.appendChild(createPageButton(currentPageNum - 1, '←', currentPageNum === 1, 'Anterior'));

    // Números de Página (con lógica de elipsis)
    const maxButtons = 5; // Máximo de botones numéricos a mostrar
    let startPage, endPage;

    if (totalPages <= maxButtons) {
        startPage = 1;
        endPage = totalPages;
    } else {
        // Lógica para mostrar elipsis (...)
        const maxPagesBeforeCurrent = Math.floor(maxButtons / 2);
        const maxPagesAfterCurrent = Math.ceil(maxButtons / 2) - 1;
        if (currentPageNum <= maxPagesBeforeCurrent) {
            startPage = 1;
            endPage = maxButtons;
        } else if (currentPageNum + maxPagesAfterCurrent >= totalPages) {
            startPage = totalPages - maxButtons + 1;
            endPage = totalPages;
        } else {
            startPage = currentPageNum - maxPagesBeforeCurrent;
            endPage = currentPageNum + maxPagesAfterCurrent;
        }
    }

    // Añadir '...' al inicio si es necesario
    if (startPage > 1) {
        paginationContainer.appendChild(createPageButton(1, '1'));
        if (startPage > 2) {
             paginationContainer.appendChild(createEllipsis());
         }
    }

    // Añadir botones numéricos
    for (let i = startPage; i <= endPage; i++) {
        paginationContainer.appendChild(createPageButton(i, i.toString(), i === currentPageNum));
    }

    // Añadir '...' al final si es necesario
    if (endPage < totalPages) {
         if (endPage < totalPages - 1) {
             paginationContainer.appendChild(createEllipsis());
         }
        paginationContainer.appendChild(createPageButton(totalPages, totalPages.toString()));
    }


    // Botón Siguiente
    paginationContainer.appendChild(createPageButton(currentPageNum + 1, '→', currentPageNum === totalPages, 'Siguiente'));

    // Botón Última Página (Opcional)
    // paginationContainer.appendChild(createPageButton(totalPages, 'Última »', currentPageNum === totalPages));
}

/**
 * Helper para crear un botón de paginación.
 * @param {number} pageNum - Número de página al que navegar.
 * @param {string} text - Texto del botón.
 * @param {boolean} [isDisabled=false] - Si el botón debe estar deshabilitado.
 * @param {boolean} [isCurrent=false] - Si es el botón de la página actual.
 * @param {string} [label] - Etiqueta ARIA opcional.
 * @returns {HTMLButtonElement}
 */
function createPageButton(pageNum, text, isDisabled = false, label = '') {
     const button = document.createElement('button');
     button.innerHTML = text; // Usar innerHTML por si text tiene iconos
     button.disabled = isDisabled;
     // Añadir clases base y la específica de primario si es la actual
     button.className = `btn ${isDisabled ? '' : (pageNum === currentPage ? 'btn-primary' : 'btn-secondary')}`;
     button.setAttribute('aria-label', label || `Ir a página ${pageNum}`);
     if(pageNum === currentPage) button.setAttribute('aria-current', 'page');

     if (!isDisabled) {
         button.addEventListener('click', () => {
             goToPage(pageNum);
         });
     }
     return button;
}

/**
 * Helper para crear un elemento de elipsis (...).
 * @returns {HTMLSpanElement}
 */
 function createEllipsis() {
     const ellipsis = document.createElement('span');
     ellipsis.textContent = '...';
     ellipsis.style.padding = '0 var(--spacing-sm)';
     ellipsis.style.alignSelf = 'center';
     ellipsis.setAttribute('aria-hidden', 'true');
     return ellipsis;
 }


/**
 * Cambia la página actual y renderiza la tabla.
 * @param {number} pageNumber - Número de página destino.
 */
function goToPage(pageNumber) {
    const itemsPerPageNum = typeof itemsPerPage !== 'undefined' ? itemsPerPage : 25;
    const totalPages = Math.ceil((filteredData?.length || 0) / itemsPerPageNum);

    // Validar número de página
    const newPage = Math.max(1, Math.min(pageNumber, totalPages));

    if (newPage !== currentPage) {
        currentPage = newPage; // Actualizar variable global (debe estar en scope o config.js)
        console.log(`Navegando a página ${currentPage}`);
        renderTable(); // Re-renderizar la tabla
        // Opcional: Hacer scroll al inicio de la tabla
        document.getElementById(DOM_IDS?.civilizacionesTable)?.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Exporta los datos actualmente filtrados (`filteredData`) a un archivo CSV.
 * @throws {Error} Si PapaParse no está disponible.
 */
function exportToCSV() {
    console.log("Iniciando exportación a CSV...");
    if (typeof Papa === 'undefined') {
        alert("Error: La biblioteca PapaParse no está cargada, no se puede exportar.");
        throw new Error("PapaParse no está disponible para exportar.");
    }
    if (typeof filteredData === 'undefined' || filteredData.length === 0) {
        alert("No hay datos filtrados para exportar.");
        console.warn("Intento de exportar CSV sin datos filtrados.");
        return;
    }

    try {
        // Determinar columnas a exportar (las visibles actualmente)
        const columnsToExport = typeof columnsToDisplay !== 'undefined'
            ? Object.keys(columnsToDisplay).filter(col => columnsToDisplay[col])
            : Object.keys(filteredData[0] || {}); // Fallback: todas si no está definido

        // Usar PapaParse para generar CSV (maneja correctamente quoting y escaping)
        const csvString = Papa.unparse(
            filteredData.map(row => {
                // Crear un objeto solo con las columnas a exportar
                let filteredRow = {};
                columnsToExport.forEach(col => {
                    filteredRow[col] = row[col];
                });
                return filteredRow;
            }),
            {
                header: true, // Incluir encabezados
                columns: columnsToExport, // Especificar orden y columnas
                quotes: true, // Poner comillas a todos los campos
                quoteChar: '"',
                escapeChar: '"',
                delimiter: ",",
                newline: "\r\n"
            }
        );

        // Crear Blob y enlace de descarga
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const date = new Date();
        const dateStr = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
        const fileName = `atlas_civilizaciones_${dateStr}.csv`;

        // Descargar archivo
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Liberar memoria

        console.log(`Exportados ${filteredData.length} registros a ${fileName}`);
        // Opcional: Notificación de éxito
        if(typeof showNotification === 'function') {
            showNotification("Exportación Completa", `${filteredData.length} registros exportados a ${fileName}`, 'success', 'file-csv');
        }

    } catch (error) {
        console.error('Error al exportar a CSV:', error);
        alert(`Error al exportar a CSV: ${error.message}`);
    }
}


/**
 * Obtiene los datos de una fila específica por su índice en `filteredData`.
 * @param {number} index - Índice de la fila (basado en 0).
 * @returns {Object | null} Objeto con los datos de la fila o null si el índice es inválido.
 */
function getRowData(index) {
    if (typeof filteredData !== 'undefined' && index >= 0 && index < filteredData.length) {
        return filteredData[index];
    }
    console.warn(`Índice de fila inválido: ${index}`);
    return null;
}

// Nota: La función showCivilizationDetails(index) se elimina de aquí.
// La lógica de mostrar detalles debe residir en ui.js (que maneja el modal)
// o en estratos-timeline.js (que podría mostrar un alert o llamar a la de ui.js).

console.log("table.js (v7) cargado.");
// --- Fin de table.js ---