/**
 * ui.js (v7)
 * Funciones relacionadas con la interfaz de usuario (UI) y navegación
 * para la aplicación principal (index.html).
 * - Mejorada robustez con chequeos de existencia de elementos.
 * - Añadida documentación JSDoc.
 * - Optimizaciones menores y limpieza.
 */

/**
 * Configura los event listeners principales para index.html.
 * @throws {Error} Si no se encuentran elementos críticos del DOM.
 */
function setupEventListeners() {
    console.log('Configurando event listeners (v7)...');
    const ids = DOM_IDS || {}; // Usar IDs de config.js

    try {
        // Carga Manual (si existe el input)
        const fileInput = document.getElementById(ids.csvFile);
        if (fileInput) {
            fileInput.addEventListener('change', handleFileUpload); // handleFileUpload debe estar definido (en data.js)
        } else {
            console.warn(`Elemento no encontrado para carga manual: #${ids.csvFile}`);
        }

        // Filtros y Acciones
        const applyBtn = document.getElementById(ids.applyFilters);
        const resetBtn = document.getElementById(ids.resetFilters);
        const searchInput = document.getElementById(ids.searchInput);
        const continentFilter = document.getElementById(ids.continenteFilter);
        const toggleFiltersBtn = document.getElementById(ids.toggleFiltersBtn); // ID corregido? antes era 'toggle-filters'

        if (applyBtn) applyBtn.addEventListener('click', applyFilters); // applyFilters debe estar definido (en data.js)
        else console.warn(`Botón aplicar filtros (#${ids.applyFilters}) no encontrado.`);

        if (resetBtn) resetBtn.addEventListener('click', resetFilters); // resetFilters debe estar definido (en data.js)
        else console.warn(`Botón reset filtros (#${ids.resetFilters}) no encontrado.`);

        if (searchInput) {
            // Usar debounce de utils.js para evitar llamadas excesivas
            searchInput.addEventListener('input', debounce(() => {
                 console.log("Input detectado, aplicando filtros...");
                 applyFilters();
                 }, 350)); // 350ms de espera
        } else console.warn(`Input búsqueda (#${ids.searchInput}) no encontrado.`);

        if (continentFilter) {
            continentFilter.addEventListener('change', updateRegionFilter); // updateRegionFilter definido abajo
        } else console.warn(`Filtro continente (#${ids.continenteFilter}) no encontrado.`);

         if (toggleFiltersBtn) {
             toggleFiltersBtn.addEventListener('click', toggleFiltersVisibility); // toggleFiltersVisibility definido abajo
         } else console.warn(`Botón toggle filtros (#${ids.toggleFiltersBtn}) no encontrado.`);

        // Toggle de Columnas (se configura en setupColumnToggle)
        setupColumnToggle(); // Llama a la función que añade listeners a los checkboxes

        // Exportar (asume botón con id 'export-btn')
        const exportBtn = document.getElementById(ids.exportBtn);
        if(exportBtn) {
            exportBtn.addEventListener('click', exportToCSV); // exportToCSV debe estar en table.js
        } else console.warn(`Botón exportar (#${ids.exportBtn}) no encontrado.`);

        // Modales
        const modalCloseBtn = document.getElementById(ids.modalClose);
        const modalOverlayEl = document.getElementById(ids.modalOverlay);

        if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal); // closeModal definido abajo
        else console.warn(`Botón cerrar modal (#${ids.modalClose}) no encontrado.`);

        if (modalOverlayEl) modalOverlayEl.addEventListener('click', closeModal);
        else console.warn(`Overlay modal (#${ids.modalOverlay}) no encontrado.`);

        // Listeners para tooltips (si existen - podría ser CSS puro)
        // initTooltips(); // Descomentar si se usa JS para tooltips

        console.log('Event listeners configurados.');

    } catch (error) {
        console.error('Error fatal configurando event listeners:', error);
        // Podríamos mostrar un mensaje de error más permanente al usuario aquí
    }
}

/**
 * Configura la navegación por pestañas para index.html.
 */
function setupTabNavigation() {
    console.log('Configurando navegación por pestañas (v7)...');
    const tabs = document.querySelectorAll('.nav-tab'); // Selector de clase correcto
    const tabContents = document.querySelectorAll('.tab-content'); // Contenedores de contenido

    if (tabs.length === 0 || tabContents.length === 0) {
        console.warn('No se encontraron pestañas o contenidos para la navegación.');
        return;
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.classList.contains('active') || tab.classList.contains('disabled')) {
                 return; // No hacer nada si ya está activa o deshabilitada
             }

            const targetTabId = tab.dataset.tab; // Obtener ID de data-tab
            console.log(`Navegando a pestaña: ${targetTabId}`);

            // Desactivar todas las pestañas y contenidos
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => {
                 content.classList.remove('active');
                 content.style.display = 'none'; // Asegurar ocultar
             });

            // Activar la pestaña y contenido correctos
            tab.classList.add('active');
            const targetContent = document.getElementById(`${targetTabId}-content`);

            if (targetContent) {
                targetContent.style.display = 'block'; // Mostrar antes de animar
                requestAnimationFrame(() => { // Asegurar que el display:block se aplique
                     targetContent.classList.add('active'); // La clase active maneja la animación fadeIn CSS
                 });


                // Lógica específica al activar una pestaña
                switch (targetTabId) {
                    case 'visualizacion':
                    case 'comparativa':
                        if (typeof updateCharts === 'function') updateCharts();
                        break;
                    case 'cronologia':
                         // Decidir si inicializar/actualizar Estratos o la original
                         if (typeof initEstratosTimeline === 'function' && document.getElementById(DOM_IDS.estratosTimelineCanvas)) {
                              // Si existe el canvas de Estratos, priorizarlo
                              if (!estratosTimelineInstance) initEstratosTimeline(); else updateEstratosVisualization?.(); // Usa ?. por si no existe aún
                         } else if (typeof initTimelineViz === 'function') {
                              // Si no, usar la original (Ríos del Tiempo)
                              if (!timelineViz) initTimelineViz(); else updateTimelineViz?.();
                         }
                        break;
                    case 'tabla':
                        // No acción específica necesaria al volver a la tabla (ya se filtra al cambiar inputs)
                        break;
                }
                 // Mostrar recomendación solo la primera vez (opcional)
                 // showTabRecommendations(targetTabId);
            } else {
                console.error(`Contenido no encontrado para pestaña: #${targetTabId}-content`);
            }
        });
    });
}

/**
 * Muestra/oculta la sección de filtros en index.html.
 */
function toggleFiltersVisibility() {
    // Asumimos que el botón tiene el ID 'toggle-filters' y el contenedor la clase 'filter-container'
    const filterContainer = document.querySelector('.filter-container');
    const toggleBtn = document.getElementById(DOM_IDS?.toggleFiltersBtn || 'toggle-filters'); // Usar ID de config o fallback

    if (!filterContainer || !toggleBtn) return console.warn("Elementos para toggle de filtros no encontrados.");

    const icon = toggleBtn.querySelector('i');
    const isVisible = filterContainer.style.display !== 'none';

    if (isVisible) {
        filterContainer.style.opacity = '0'; // Iniciar fade out
        setTimeout(() => {
            filterContainer.style.display = 'none';
            if (icon) icon.className = 'fas fa-chevron-down'; // Cambiar icono a "mostrar"
             toggleBtn.setAttribute('aria-expanded', 'false');
        }, 250); // Sincronizar con transición CSS si existe
    } else {
        filterContainer.style.display = 'block'; // Mostrar para animar
        requestAnimationFrame(() => { // Forzar reflow antes de cambiar opacidad
             filterContainer.style.opacity = '1'; // Iniciar fade in
             if (icon) icon.className = 'fas fa-chevron-up'; // Cambiar icono a "ocultar"
              toggleBtn.setAttribute('aria-expanded', 'true');
         });
    }
}


/**
 * Inicializa la aplicación principal (index.html) después de cargar los datos.
 * (Llamada desde data.js o main.js)
 */
function initializeAppWithData() {
    console.log('Inicializando UI principal con datos (v7)...');
    if (typeof civilizacionesData === 'undefined' || civilizacionesData.length === 0) {
        console.error("Intento de inicializar UI sin datos.");
        return;
    }

    try {
        setUILoadingState(false); // Activar controles
        updateStatisticsFromData(); // Calcular y mostrar stats
        populateFilters(); // Llenar desplegables de filtros
        renderTable(); // Renderizar tabla inicial (página 1)
        initCharts(); // Inicializar gráficos de index.html

        // Mostrar notificación de bienvenida si es la primera vez
        if (!sessionStorage.getItem('welcomeShown')) {
             showNotification(
                 `Bienvenido a ${APP_NAME}`,
                 `Explora ${civilizacionesData.length} registros. Usa filtros y pestañas.`,
                 'info', 'globe-americas', 7000 // Duración más larga
             );
             sessionStorage.setItem('welcomeShown', 'true');
         }

        console.log('UI principal inicializada con datos.');

    } catch (error) {
        console.error("Error inicializando la UI con datos:", error);
        showNotification("Error de Inicialización", "No se pudo configurar la interfaz correctamente.", "error", "exclamation-triangle");
    }
}

/**
 * Puebla los filtros desplegables (Continente, Subsistencia) con valores únicos.
 */
function populateFilters() {
    console.log('Poblando filtros desplegables...');
    const ids = DOM_IDS || {};
    if (typeof civilizacionesData === 'undefined' || civilizacionesData.length === 0) return;

    try {
        // Poblar Continentes
        const contFilter = document.getElementById(ids.continenteFilter);
        if (contFilter) {
            const continentes = [...new Set(civilizacionesData.map(r => r.Continente).filter(Boolean))].sort();
            contFilter.innerHTML = '<option value="">Todos los Continentes</option>'; // Opción por defecto
            continentes.forEach(c => contFilter.add(new Option(c, c)));
        } else console.warn("Filtro Continente no encontrado.");

        // Poblar Regiones (inicialmente todas)
        updateRegionFilter(); // Llama a la función que las puebla

        // Poblar Subsistencias
        const subFilter = document.getElementById(ids.subsistenciaFilter);
        if (subFilter) {
            const subsistencias = [...new Set(civilizacionesData.map(r => r['Subsistencia Principal']).filter(Boolean))].sort();
            subFilter.innerHTML = '<option value="">Todas las Subsistencias</option>';
            subsistencias.forEach(s => subFilter.add(new Option(s, s)));
        } else console.warn("Filtro Subsistencia no encontrado.");

    } catch (error) {
        console.error("Error poblando filtros:", error);
    }
}

/**
 * Actualiza el filtro de Regiones basado en el Continente seleccionado.
 */
function updateRegionFilter() {
    const ids = DOM_IDS || {};
    const contFilter = document.getElementById(ids.continenteFilter);
    const regFilter = document.getElementById(ids.regionFilter);

    if (!regFilter) return; // Salir si no existe el filtro de región

    const selectedContinent = contFilter?.value || ''; // Obtener valor o '' si no existe contFilter
    const previousValue = regFilter.value; // Guardar valor actual por si se puede mantener

    regFilter.innerHTML = '<option value="">Todas las Regiones</option>'; // Limpiar

    let regions = [];
    if (selectedContinent) {
        regions = [...new Set(
            civilizacionesData
                .filter(row => row.Continente === selectedContinent)
                .map(row => row['Gran Región / Subcontinente'])
                .filter(Boolean)
        )].sort();
         // Añadir separador visual opcional
         // if(regions.length > 0) regFilter.add(new Option(`--- Regiones en ${selectedContinent} ---`, '', false, false));
         // option.disabled = true; // Hacerlo no seleccionable
    } else {
        // Si no hay continente, mostrar todas las regiones
        regions = [...new Set(civilizacionesData.map(row => row['Gran Región / Subcontinente']).filter(Boolean))].sort();
    }

    regions.forEach(region => {
        const option = new Option(region, region);
        // Si el valor previo sigue siendo válido, preseleccionarlo
         if(region === previousValue) option.selected = true;
        regFilter.add(option);
    });

    // Opcional: Destacar visualmente que el filtro cambió
    // highlightElement(regFilter.closest('.filter-group') || regFilter);
}

/**
 * Configura los checkboxes para mostrar/ocultar columnas de la tabla.
 */
function setupColumnToggle() {
    const ids = DOM_IDS || {};
    const container = document.getElementById(ids.columnToggle);
    if (!container) return console.warn("Contenedor de toggle de columnas no encontrado.");
    if (typeof columnsToDisplay === 'undefined') return console.warn("Variable 'columnsToDisplay' no definida.");

    container.innerHTML = ''; // Limpiar contenido previo

    // Iconos (opcional, mejora UI)
    const columnIcons = { /* ... Mapeo de iconos como en ui.js v3 ... */
         "Continente": "fas fa-globe", "Gran Región / Subcontinente": "fas fa-map",
         "Región Específica / Área Cultural": "fas fa-map-marker-alt", "Cultura / Sociedad": "fas fa-users",
         "Cronología Aprox. (10k aC - 750 dC)": "fas fa-calendar-alt", "Subsistencia Principal": "fas fa-seedling",
         "Patrón Asentamiento": "fas fa-city", "Arquitectura Notable": "fas fa-landmark",
         "Tecnologías Clave": "fas fa-tools", "Evidencia Jerarquía Social": "fas fa-sitemap",
         "Redes Intercambio (Alcance)": "fas fa-exchange-alt", "Sistemas Registro / Escritura": "fas fa-pen-fancy"
     };

    Object.keys(columnsToDisplay).forEach(column => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        const textSpan = document.createElement('span'); // Para el texto
        const iconTag = document.createElement('i'); // Para el icono

        checkbox.type = 'checkbox';
        checkbox.checked = columnsToDisplay[column];
        checkbox.dataset.column = column; // Guardar nombre columna en data attribute

        checkbox.addEventListener('change', (e) => {
            const colName = e.target.dataset.column;
            if(colName) {
                 columnsToDisplay[colName] = e.target.checked;
                 if (typeof renderTable === 'function') renderTable(); // Re-renderizar tabla
                 else console.warn("renderTable no definida para actualizar columnas.");
                 // Opcional: Notificación
                 // showNotification(...)
            }

        });

        textSpan.textContent = getShortColumnName(column); // Usar nombre corto
        const iconClass = columnIcons[column] || 'fas fa-columns'; // Icono por defecto
         iconTag.className = `${iconClass} fa-fw`; // fa-fw para ancho fijo

        label.appendChild(checkbox);
        label.appendChild(textSpan);
         label.appendChild(iconTag); // Icono al final

        container.appendChild(label);
    });
}

/**
 * Obtiene un nombre corto/abreviado para una columna.
 * @param {string} columnName Nombre completo de la columna.
 * @returns {string} Nombre corto.
 */
function getShortColumnName(columnName) {
    const shortNames = { /* ... Mapeo como en ui.js v3 ... */
         "Continente": "Cont.", "Gran Región / Subcontinente": "Región", "Región Específica / Área Cultural": "Área Cult.",
         "Cultura / Sociedad": "Cultura", "Cronología Aprox. (10k aC - 750 dC)": "Cronología",
         "Subsistencia Principal": "Subsistencia", "Patrón Asentamiento": "Asentamiento",
         "Arquitectura Notable": "Arquitectura", "Tecnologías Clave": "Tecnologías",
         "Evidencia Jerarquía Social": "Jerarquía", "Redes Intercambio (Alcance)": "Intercambio",
         "Sistemas Registro / Escritura": "Escritura"
    };
    return shortNames[columnName] || columnName;
}


/**
 * Actualiza los elementos de estadísticas en la UI (llamado desde data.js).
 * @param {number} totalCivs Total de civilizaciones.
 * @param {number} totalConts Total de continentes únicos.
 * @param {number} totalRegs Total de regiones únicas.
 */
function updateStatistics(totalCivs, totalConts, totalRegs) {
    const ids = DOM_IDS || {};
    try {
        const civEl = document.getElementById(ids.totalCivilizaciones);
        const contEl = document.getElementById(ids.totalContinentes);
        const regEl = document.getElementById(ids.totalRegiones);
        const rangoEl = document.getElementById(ids.rangoTemporal); // Rango es estático

        // Animar contadores si existen
        if (civEl) animateCounter(civEl, totalCivs); else console.warn("Elem stat civilizaciones no encontrado.");
        if (contEl) animateCounter(contEl, totalConts); else console.warn("Elem stat continentes no encontrado.");
        if (regEl) animateCounter(regEl, totalRegs); else console.warn("Elem stat regiones no encontrado.");
        if (rangoEl) rangoEl.textContent = "10,000 a.C. - 750 d.C."; // Rango fijo

    } catch (error) {
        console.error('Error al actualizar estadísticas UI:', error);
    }
}

/**
 * Anima un número en un elemento HTML desde su valor actual hasta un valor final.
 * @param {HTMLElement} element Elemento HTML.
 * @param {number} endValue Valor final.
 * @param {number} [duration=800] Duración en ms.
 */
function animateCounter(element, endValue, duration = 800) {
    if (!element) return;
    const startValue = parseInt(element.textContent || '0', 10);
     if (isNaN(startValue) || startValue === endValue) {
         element.textContent = endValue; // Establecer valor final si no hay animación o no es número
         return;
     }

    const range = endValue - startValue;
    let startTime = null;

    const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1); // Progreso 0 a 1
        // Aplicar easing (ej: easeOutQuad)
         const easedProgress = progress * (2 - progress);
        const currentValue = Math.floor(startValue + range * easedProgress);
        element.textContent = currentValue;
        if (progress < 1) {
            requestAnimationFrame(step); // Continuar animación
        } else {
             element.textContent = endValue; // Asegurar valor final exacto
        }
    };
    requestAnimationFrame(step); // Iniciar animación
}


/**
 * Muestra el modal con detalles de una civilización (para index.html).
 * @param {Object} civilization Datos de la fila de la civilización.
 */
function showCivilizationDetails(civilization) {
    if (!civilization) return console.warn("showCivilizationDetails: No se proporcionaron datos.");
    const ids = DOM_IDS || {};
    const modalTitle = document.getElementById(ids.modalTitle);
    const modalContent = document.getElementById(ids.modalContent);
    const modalOverlay = document.getElementById(ids.modalOverlay);
    const detailModal = document.getElementById(ids.detailModal);

    if (!modalTitle || !modalContent || !modalOverlay || !detailModal) {
        return console.error('Elementos del modal no encontrados.');
    }

    // Llenar modal
    modalTitle.textContent = civilization['Cultura / Sociedad'] || 'Detalles';
    let contentHTML = `<div class="civilization-details">`;

     // Bloque Header
     contentHTML += `
         <div class="detail-header">
             <span class="continent-badge ${getContinentClass(civilization.Continente)}">
                 <i class="fas fa-globe-americas"></i> ${civilization.Continente || 'N/A'}
             </span>
             <div class="detail-period">
                 <i class="fas fa-calendar-alt"></i>
                 ${civilization['Cronología Aprox. (10k aC - 750 dC)'] || 'N/A'}
             </div>
         </div>`;

     // Función helper para crear secciones
     const createSection = (title, icon, dataObject) => {
         let sectionHTML = `<div class="detail-section"><h4><i class="${icon}"></i> ${title}</h4>`;
         let hasContent = false;
         Object.entries(dataObject).forEach(([key, value]) => {
             if (value && typeof value === 'string' && value.trim() !== '' && !value.toLowerCase().includes('no evid') && !value.toLowerCase().includes('ausente')) {
                  sectionHTML += `<p><strong>${key}:</strong> ${value}</p>`;
                  hasContent = true;
              }
         });
          sectionHTML += `</div>`;
          return hasContent ? sectionHTML : ''; // Devolver vacío si no hay datos útiles
     };

     // Añadir Secciones
      contentHTML += createSection('Ubicación', 'fas fa-map-marked-alt', {
          'Región Principal': civilization['Gran Región / Subcontinente'],
          'Área Específica': civilization['Región Específica / Área Cultural']
      });
       contentHTML += createSection('Modo de Vida', 'fas fa-seedling', {
           'Subsistencia': civilization['Subsistencia Principal'],
           'Asentamiento': civilization['Patrón Asentamiento']
       });
       contentHTML += createSection('Cultura Material', 'fas fa-landmark', {
            'Arquitectura': civilization['Arquitectura Notable'],
            'Tecnologías': civilization['Tecnologías Clave']
       });
       contentHTML += createSection('Sociedad y Registro', 'fas fa-sitemap', {
            'Jerarquía Social': civilization['Evidencia Jerarquía Social'],
            'Escritura/Registro': civilization['Sistemas Registro / Escritura'],
            'Intercambio': civilization['Redes Intercambio (Alcance)']
       });

    contentHTML += '</div>'; // Fin de .civilization-details
    modalContent.innerHTML = contentHTML;

    // Mostrar modal
    modalOverlay.style.display = 'block';
    detailModal.style.display = 'block';
    requestAnimationFrame(() => { // Forzar reflow para animación
         modalOverlay.style.opacity = '1'; // Asumiendo que la clase tiene transition
         detailModal.classList.remove('zoom-out'); // Quitar clase de salida si existe
         detailModal.classList.add('zoom-in'); // Añadir clase de entrada
     });
}

/**
 * Cierra el modal de detalles.
 */
function closeModal() {
    const ids = DOM_IDS || {};
    const modalOverlay = document.getElementById(ids.modalOverlay);
    const detailModal = document.getElementById(ids.detailModal);

    if (!modalOverlay || !detailModal) return;

     detailModal.classList.remove('zoom-in');
     detailModal.classList.add('zoom-out'); // Añadir clase de salida CSS
     modalOverlay.style.opacity = '0';

    // Ocultar después de la animación CSS (ajustar tiempo a la animación)
    setTimeout(() => {
        modalOverlay.style.display = 'none';
        detailModal.style.display = 'none';
         detailModal.classList.remove('zoom-out'); // Limpiar clase
    }, 250); // Duración de la animación zoomOut (ejemplo)
}

/**
 * Obtiene la clase CSS para el badge de un continente.
 * @param {string|null} continent Nombre del continente.
 * @returns {string} Clase CSS (ej: 'badge-asia').
 */
function getContinentClass(continent) {
    if (!continent) return 'badge-desconocido';
    // Normalizar nombre para usar como clase CSS
    const normalized = continent.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
        .replace(/[^a-z0-9]+/g, '-') // Reemplazar no alfanuméricos por guion
        .replace(/^-+|-+$/g, ''); // Quitar guiones al inicio/final
    return `badge-${normalized || 'desconocido'}`;
}


/**
 * Muestra una notificación flotante en la interfaz.
 * @param {string} title Título.
 * @param {string} message Mensaje.
 * @param {string} [type='info'] Tipo (success, error, warning, info).
 * @param {string} [icon='info-circle'] Icono FontAwesome (sin 'fa-').
 * @param {number} [duration=5000] Duración en ms (0 para no auto-cerrar).
 */
function showNotification(title, message, type = 'info', icon = 'info-circle', duration = 5000) {
     const ids = DOM_IDS || {};
    const container = document.getElementById(ids.notificationContainer);
    if (!container) return console.error('Contenedor de notificaciones no encontrado.');

    try {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`; // Clase base y de tipo

        // Icono (asegurarse de usar clase correcta de FA)
        const iconElement = `<div class="notification-icon"><i class="fas fa-${icon}"></i></div>`;

        // Contenido
        const contentElement = `
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>`;

        // Botón Cerrar
        const closeElement = `<button class="notification-close" aria-label="Cerrar notificación"><i class="fas fa-times"></i></button>`;

        notification.innerHTML = iconElement + contentElement + closeElement;

        // Añadir al DOM
        container.prepend(notification); // Añadir al principio

        // Funcionalidad de cierre
        const closeBtn = notification.querySelector('.notification-close');
        const removeNotification = () => {
            notification.classList.add('fade-out');
            // Esperar a que termine la animación CSS antes de remover
            notification.addEventListener('animationend', () => {
                if (notification.parentNode) {
                     container.removeChild(notification);
                }
             }, { once: true }); // Listener de un solo uso
        };

        if (closeBtn) closeBtn.addEventListener('click', removeNotification);

        // Auto-cierre si hay duración
        if (duration > 0) {
            setTimeout(removeNotification, duration);
        }
    } catch (error) {
        console.error("Error mostrando notificación:", error);
    }
}

console.log("ui.js (v7) cargado.");
// --- Fin de ui.js ---