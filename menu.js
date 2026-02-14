// ====================================
// CONFIGURACIÓN DE FIREBASE
// ====================================
const firebaseConfig = {
    apiKey: "AIzaSyDPxRwlqftP-RoeJILhw_PsM3fsqCFIfqo",
    authDomain: "comidas-33dba.firebaseapp.com",
    projectId: "comidas-33dba",
    storageBucket: "comidas-33dba.firebasestorage.app",
    messagingSenderId: "627965464872",
    appId: "1:627965464872:web:5a921a070a3f4d8afbc01d"
};

// Inicializar Firebase
let db;
let isFirebaseConfigured = false;

try {
    if (firebaseConfig.apiKey !== "TU_API_KEY") {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        isFirebaseConfigured = true;
        console.log("✅ Firebase conectado - Sincronización multi-dispositivo activada");
    } else {
        console.log("⚠️ Firebase no configurado - Usando localStorage (solo este dispositivo)");
    }
} catch (error) {
    console.log("⚠️ Error al conectar Firebase - Usando localStorage", error);
}

// Variables globales
let draggedFood = null;
let currentCalendar = 1; // Calendario actual (1-4)
let currentView = 'week'; // 'day', 'three-days', 'week' (móvil) o 'single-week', 'four-weeks' (desktop)
let currentDayIndex = new Date().getDay(); // 0=Domingo, 1=Lunes, ...
let customFoodsGlobal = { primeros: [], segundos: [], postres: [], cenas: [] }; // Base de datos de platos
const MENU_DOC_ID = 'weekly-menu';
const CUSTOM_FOODS_DOC_ID = 'custom-foods';
const CATEGORY_MAP = {
    'primeros': 0,
    'segundos': 1,
    'postres': 2,
    'cenas': 3
};
let isResetting = false; // Flag para evitar conflictos durante el reset
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

// ====================================
// SISTEMA DE FECHAS
// ====================================

// Obtener el lunes de una semana específica
function getMondayOfWeek(weekOffset = 0) {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Domingo, 1 = Lunes, ...
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Ajustar al lunes
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff + (weekOffset * 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

// Obtener array de fechas para una semana (desktop)
function getWeekDates(weekOffset = 0) {
    const monday = getMondayOfWeek(weekOffset);
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        dates.push(date);
    }
    return dates;
}

// Obtener array de 7 días consecutivos para móvil
function getMobileDates() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dayOffset = 0;
    if (currentView === 'day') {
        // Para vista de 1 día: Cal 1 = día 0, Cal 2 = día 1, etc.
        dayOffset = (currentCalendar - 1);
    } else if (currentView === 'three-days') {
        // Para vista de 3 días: Cal 1 = días 0-2, Cal 2 = días 3-5, etc.
        dayOffset = (currentCalendar - 1) * 3;
    }

    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + dayOffset + i);
        dates.push(date);
    }
    return dates;
}

// Formatear fecha para encabezado
function formatDateHeader(date) {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const day = days[date.getDay()];
    const dateNum = date.getDate();
    const month = date.getMonth() + 1;
    return `${day} ${dateNum}/${month}`;
}

// Actualizar encabezados de la tabla con fechas reales
function updateTableHeaders() {
    let dates;

    if (isMobileDevice && (currentView === 'day' || currentView === 'three-days')) {
        // En móvil: días consecutivos desde hoy
        dates = getMobileDates();
    } else {
        // En desktop o vista completa: semanas
        const weekOffset = currentCalendar - 1;
        dates = getWeekDates(weekOffset);
    }

    const headers = document.querySelectorAll('#weekTable thead th');

    // Actualizar cada día (empezando desde el índice 1, ya que el 0 es la columna vacía)
    for (let i = 1; i < headers.length; i++) {
        headers[i].textContent = formatDateHeader(dates[i - 1]);
        // Resaltar el día actual
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dates[i - 1].getTime() === today.getTime()) {
            headers[i].style.background = '#4CAF50';
            headers[i].style.color = 'white';
        } else {
            headers[i].style.background = '#333';
            headers[i].style.color = 'white';
        }
    }
}

// Verificar si el calendario actual está obsoleto y auto-desplazar
function checkAndAutoShift() {
    if (isMobileDevice) {
        // En móvil: verificar si pasó un día
        const lastDate = localStorage.getItem('lastAccessDate');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        if (lastDate && lastDate !== todayStr) {
            console.log('Nuevo día detectado en móvil, desplazando calendarios...');
            addNewCalendar(true); // true = auto-shift silencioso
        }

        // Guardar la fecha actual
        localStorage.setItem('lastAccessDate', todayStr);
    } else {
        // En desktop: verificar si pasó la semana
        const weekOffset = currentCalendar - 1;
        const monday = getMondayOfWeek(weekOffset);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const now = new Date();

        // Si ya pasó el domingo de esta semana, auto-desplazar
        if (now > sunday && currentCalendar === 1) {
            console.log('Semana obsoleta detectada, desplazando calendarios...');
            addNewCalendar(true); // true = auto-shift silencioso
        }
    }
}

// ====================================
// CONTROLES DE VISTA
// ====================================

function changeView(view) {
    currentView = view;

    // Actualizar botones activos
    document.querySelectorAll('.view-btn').forEach(btn => {
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (isMobileDevice) {
        applyMobileView(view);
        updateCalendarNavigation(); // Actualizar el label con el rango correcto
    } else {
        applyDesktopView(view);
    }

    // Recargar menú para actualizar visualización de descripciones
    loadMenu();
}

function applyMobileView(view) {
    const table = document.getElementById('weekTable');
    const cols = table.querySelectorAll('th, td');

    // Primero actualizar las fechas según el calendario actual
    updateTableHeaders();

    // Resetear todas las columnas
    cols.forEach(col => col.classList.remove('hide-column'));

    if (view === 'day') {
        // Mostrar solo el primer día (columna 1)
        cols.forEach((col, index) => {
            const colIndex = index % 8; // 8 columnas por fila (1 header + 7 días)
            if (colIndex !== 0 && colIndex !== 1) {
                col.classList.add('hide-column');
            }
        });
    } else if (view === 'three-days') {
        // Mostrar los primeros 3 días (columnas 1, 2, 3)
        cols.forEach((col, index) => {
            const colIndex = index % 8;
            if (colIndex !== 0 && colIndex > 3) {
                col.classList.add('hide-column');
            }
        });
    }
    // 'week' muestra todo
}

function applyDesktopView(view) {
    const singleWeek = document.querySelector('.single-week-view');
    const fourWeeks = document.querySelector('.four-week-view');
    const table = document.getElementById('weekTable');
    const cols = table.querySelectorAll('th, td');

    // Ocultar vista de 4 semanas
    singleWeek.classList.remove('hide');
    fourWeeks.classList.remove('active');

    // Resetear columnas
    cols.forEach(col => col.classList.remove('hide-column'));

    if (view === 'daily') {
        // Vista diaria en desktop: mostrar solo el día actual
        const todayIndex = getTodayColumnIndex();
        cols.forEach((col, index) => {
            const colIndex = index % 8; // 8 columnas por fila
            if (colIndex !== 0 && colIndex !== todayIndex) {
                col.classList.add('hide-column');
            }
        });
    }
    // 'single-week' muestra toda la semana (sin ocultar columnas)
}

function getTodayColumnIndex() {
    const weekOffset = currentCalendar - 1;
    const dates = getWeekDates(weekOffset);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < dates.length; i++) {
        if (dates[i].getTime() === today.getTime()) {
            return i + 1; // +1 porque la columna 0 es el header
        }
    }
    return 1; // Por defecto lunes
}

function renderFourWeeksView() {
    const container = document.querySelector('.four-week-view');
    container.innerHTML = '';

    for (let i = 1; i <= 4; i++) {
        const weekDiv = document.createElement('div');
        weekDiv.className = 'week-calendar';

        const dates = getWeekDates(i - 1);
        const startDate = formatDateHeader(dates[0]);
        const endDate = formatDateHeader(dates[6]);

        weekDiv.innerHTML = `
            <div class="week-calendar-header">Semana ${i}: ${startDate} - ${endDate}</div>
            <table>
                <thead>
                    <tr>
                        <th></th>
                        ${dates.map(d => `<th>${formatDateHeader(d).split(' ')[0]}<br>${d.getDate()}/${d.getMonth()+1}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="day-header">🍽️ 1º</td>
                        ${dates.map((d, idx) => `<td><div class="meal-slot" data-calendar="${i}" data-day="${['lunes','martes','miercoles','jueves','viernes','sabado','domingo'][idx]}" data-meal="comida1"></div></td>`).join('')}
                    </tr>
                    <tr>
                        <td class="day-header">🍽️ 2º</td>
                        ${dates.map((d, idx) => `<td><div class="meal-slot" data-calendar="${i}" data-day="${['lunes','martes','miercoles','jueves','viernes','sabado','domingo'][idx]}" data-meal="comida2"></div></td>`).join('')}
                    </tr>
                    <tr>
                        <td class="day-header">🍮 Postre</td>
                        ${dates.map((d, idx) => `<td><div class="meal-slot" data-calendar="${i}" data-day="${['lunes','martes','miercoles','jueves','viernes','sabado','domingo'][idx]}" data-meal="postre"></div></td>`).join('')}
                    </tr>
                    <tr>
                        <td class="day-header">🌙 1º</td>
                        ${dates.map((d, idx) => `<td><div class="meal-slot" data-calendar="${i}" data-day="${['lunes','martes','miercoles','jueves','viernes','sabado','domingo'][idx]}" data-meal="cena1"></div></td>`).join('')}
                    </tr>
                    <tr>
                        <td class="day-header">🌙 2º</td>
                        ${dates.map((d, idx) => `<td><div class="meal-slot" data-calendar="${i}" data-day="${['lunes','martes','miercoles','jueves','viernes','sabado','domingo'][idx]}" data-meal="cena2"></div></td>`).join('')}
                    </tr>
                </tbody>
            </table>
        `;

        container.appendChild(weekDiv);
    }

    // Cargar datos para todas las semanas
    loadAllWeeksData();
    setupDragAndDropForFourWeeks();
}

async function loadAllWeeksData() {
    if (isFirebaseConfigured) {
        try {
            const doc = await db.collection('menus').doc(MENU_DOC_ID).get();
            if (doc.exists) {
                const data = doc.data();
                document.querySelectorAll('.four-week-view .meal-slot').forEach(slot => {
                    const cal = slot.dataset.calendar;
                    const key = `cal${cal}-${slot.dataset.day}-${slot.dataset.meal}`;
                    if (data[key]) {
                        updateSlotWithArray(slot, data[key]);
                    }
                });
            }
        } catch (error) {
            console.error("Error cargando datos:", error);
        }
    } else {
        document.querySelectorAll('.four-week-view .meal-slot').forEach(slot => {
            const cal = slot.dataset.calendar;
            const key = `cal${cal}-${slot.dataset.day}-${slot.dataset.meal}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                try {
                    updateSlotWithArray(slot, JSON.parse(saved));
                } catch (e) {}
            }
        });
    }
}

function setupDragAndDropForFourWeeks() {
    document.querySelectorAll('.four-week-view .meal-slot').forEach(slot => {
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            slot.classList.add('drag-over');
        });

        slot.addEventListener('dragleave', () => {
            slot.classList.remove('drag-over');
        });

        slot.addEventListener('drop', async (e) => {
            e.preventDefault();
            slot.classList.remove('drag-over');

            if (draggedFood) {
                // Leer datos actuales del slot
                const cal = slot.dataset.calendar;
                const key = `cal${cal}-${slot.dataset.day}-${slot.dataset.meal}`;
                let foodsArray = [];

                // Cargar array actual
                if (isFirebaseConfigured) {
                    try {
                        const doc = await db.collection('menus').doc(MENU_DOC_ID).get();
                        if (doc.exists && doc.data()[key]) {
                            foodsArray = doc.data()[key];
                        }
                    } catch (error) {
                        const saved = localStorage.getItem(key);
                        if (saved) foodsArray = JSON.parse(saved);
                    }
                } else {
                    const saved = localStorage.getItem(key);
                    if (saved) foodsArray = JSON.parse(saved);
                }

                // Buscar el plato completo con descripción
                const fullPlate = findPlateByName(draggedFood);
                foodsArray.push(fullPlate);

                // Actualizar UI
                updateSlotWithArray(slot, foodsArray);

                // Guardar
                if (isFirebaseConfigured) {
                    await db.collection('menus').doc(MENU_DOC_ID).set({
                        [key]: foodsArray
                    }, { merge: true });
                } else {
                    localStorage.setItem(key, JSON.stringify(foodsArray));
                }
                draggedFood = null;
            }
        });
    });
}

// Toggle categoría colapsable
function toggleCategory(header) {
    header.classList.toggle('collapsed');
    const items = header.nextElementSibling;
    items.classList.toggle('collapsed');
}

// ====================================
// FUNCIONES DE BASE DE DATOS
// ====================================

// Guardar menú en Firebase o localStorage
async function saveMenu(day, meal, foodsArray) {
    const key = `cal${currentCalendar}-${day}-${meal}`;
    if (isFirebaseConfigured) {
        try {
            await db.collection('menus').doc(MENU_DOC_ID).set({
                [key]: foodsArray
            }, { merge: true });
        } catch (error) {
            console.error("Error guardando en Firebase:", error);
            localStorage.setItem(key, JSON.stringify(foodsArray));
        }
    } else {
        localStorage.setItem(key, JSON.stringify(foodsArray));
    }
}

// Cargar menú desde Firebase o localStorage
async function loadMenu() {
    if (isFirebaseConfigured) {
        try {
            const doc = await db.collection('menus').doc(MENU_DOC_ID).get();
            if (doc.exists) {
                const data = doc.data();
                const slots = document.querySelectorAll('.meal-slot');
                slots.forEach(slot => {
                    const key = `cal${currentCalendar}-${slot.dataset.day}-${slot.dataset.meal}`;
                    if (data[key]) {
                        updateSlotWithArray(slot, data[key]);
                    } else {
                        slot.innerHTML = '';
                    }
                });
            }
        } catch (error) {
            console.error("Error cargando de Firebase:", error);
            loadFromLocalStorage();
        }
    } else {
        loadFromLocalStorage();
    }
}

// Cargar desde localStorage (fallback)
function loadFromLocalStorage() {
    const slots = document.querySelectorAll('.meal-slot');
    slots.forEach(slot => {
        const key = `cal${currentCalendar}-${slot.dataset.day}-${slot.dataset.meal}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const foodsArray = JSON.parse(saved);
                updateSlotWithArray(slot, foodsArray);
            } catch (e) {
                // Compatibilidad con formato antiguo (string simple)
                updateSlotWithArray(slot, [saved]);
            }
        } else {
            slot.innerHTML = '';
        }
    });
}

// Sincronización en tiempo real del menú (solo con Firebase)
if (isFirebaseConfigured) {
    db.collection('menus').doc(MENU_DOC_ID).onSnapshot((doc) => {
        // Ignorar cambios durante el reset para evitar race conditions
        if (isResetting) {
            console.log('Ignorando cambios de Firebase durante el reset');
            return;
        }

        const slots = document.querySelectorAll('.meal-slot');
        if (doc.exists) {
            const data = doc.data();
            slots.forEach(slot => {
                const key = `cal${currentCalendar}-${slot.dataset.day}-${slot.dataset.meal}`;
                if (data[key]) {
                    updateSlotWithArray(slot, data[key]);
                } else {
                    // Limpiar slot si no hay datos en Firebase para este calendario
                    slot.innerHTML = '';
                }
            });
        } else {
            // Si el documento no existe, limpiar todas las casillas
            console.log('Documento no existe, limpiando casillas');
            slots.forEach(slot => {
                slot.innerHTML = '';
            });
        }
    });

    // Sincronización en tiempo real de platos personalizados
    db.collection('foods').doc(CUSTOM_FOODS_DOC_ID).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            if (data.customFoods) {
                loadCustomFoods(data.customFoods);
            }
        }
    });
}

// Actualizar slot con array de comidas
function updateSlotWithArray(slot, foodsArray) {
    if (!Array.isArray(foodsArray)) {
        foodsArray = [foodsArray];
    }

    slot.innerHTML = '';
    foodsArray.forEach(food => {
        const tag = document.createElement('div');
        tag.className = 'meal-content';

        // Soportar tanto strings como objetos {name, description}
        const foodName = typeof food === 'string' ? food : food.name;
        const foodDescription = typeof food === 'object' ? food.description : '';

        // Mostrar descripción solo en vista diaria
        const showDescription = (currentView === 'day' || currentView === 'daily') && foodDescription;

        // Para vista diaria con descripción: layout horizontal (descripción izquierda, nombre derecha)
        if (showDescription) {
            tag.style.flexDirection = 'row';
            tag.style.justifyContent = 'space-between';
            tag.style.alignItems = 'flex-start';
            tag.style.textAlign = 'left';
            tag.innerHTML = `
                <div class="meal-info" style="flex: 4/5; text-align: left;">
                    <span class="meal-description" style="display: block;">${foodDescription}</span>
                </div>
                <div style="flex: 1/5; text-align: right; display: flex; flex-direction: column; gap: 4px; align-items: flex-end;">
                    <span class="meal-text" style="text-align: right;">${foodName}</span>
                    <button class="remove-btn" onclick="removeFoodTag(this)">×</button>
                </div>
            `;
        } else {
            // Para otras vistas: layout vertical centrado con solo nombre
            tag.innerHTML = `
                <div class="meal-info">
                    <span class="meal-text">${foodName}</span>
                </div>
                <button class="remove-btn" onclick="removeFoodTag(this)">×</button>
            `;
        }
        
        // Permitir hacer click para editar
        tag.addEventListener('click', (e) => {
            if (!e.target.classList.contains('remove-btn') && 
                !e.target.closest('.remove-btn')) {
                openFoodModal(slot);
            }
        });
        
        slot.appendChild(tag);
    });
}

// Actualizar contenido de slot (compatibilidad)
function updateSlot(slot, text) {
    updateSlotWithArray(slot, [text]);
}

// Obtener array de comidas de un slot
function getSlotFoods(slot) {
    const tags = slot.querySelectorAll('.meal-text');
    return Array.from(tags).map(tag => tag.textContent);
}

// Eliminar etiqueta individual de comida
async function removeFoodTag(btn) {
    const slot = btn.closest('.meal-slot');
    const tag = btn.closest('.meal-content');
    const foodName = tag.querySelector('.meal-text').textContent;

    // Leer datos actuales
    const cal = slot.dataset.calendar || currentCalendar;
    const key = `cal${cal}-${slot.dataset.day}-${slot.dataset.meal}`;
    let foodsArray = [];

    // Cargar array actual
    if (isFirebaseConfigured) {
        try {
            const doc = await db.collection('menus').doc(MENU_DOC_ID).get();
            if (doc.exists && doc.data()[key]) {
                foodsArray = doc.data()[key];
            }
        } catch (error) {
            const saved = localStorage.getItem(key);
            if (saved) foodsArray = JSON.parse(saved);
        }
    } else {
        const saved = localStorage.getItem(key);
        if (saved) foodsArray = JSON.parse(saved);
    }

    // Eliminar el plato del array
    foodsArray = foodsArray.filter(food => {
        const name = typeof food === 'string' ? food : food.name;
        return name !== foodName;
    });

    // Actualizar UI
    tag.remove();

    // Guardar
    await saveMenu(slot.dataset.day, slot.dataset.meal, foodsArray);

    if (isFirebaseConfigured) {
        try {
            if (foodsArray.length === 0) {
                await db.collection('menus').doc(MENU_DOC_ID).update({
                    [key]: firebase.firestore.FieldValue.delete()
                });
            }
        } catch (error) {
            console.error("Error eliminando de Firebase:", error);
        }
    }

    if (foodsArray.length === 0) {
        localStorage.removeItem(key);
    }
}

// Eventos de arrastre para items de comida
document.querySelectorAll('.food-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
        draggedFood = item.querySelector('.food-item-text').textContent;
        e.target.style.opacity = '0.5';
    });

    item.addEventListener('dragend', (e) => {
        e.target.style.opacity = '1';
    });
});

// Eliminar plato del sidebar
async function deleteFoodItem(event, btn) {
    event.stopPropagation();
    const foodItem = btn.closest('.food-item');
    const foodName = foodItem.querySelector('.food-item-text').textContent;
    const categoryContainer = foodItem.closest('.category-items');
    const category = categoryContainer.dataset.category;

    // Eliminar del DOM
    foodItem.remove();

    // Eliminar de la base de datos
    await removeCustomFood(foodName, category);
}

// Eventos de arrastre para slots
document.querySelectorAll('.meal-slot').forEach(slot => {
    slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        slot.classList.add('drag-over');
    });

    slot.addEventListener('dragleave', () => {
        slot.classList.remove('drag-over');
    });

    slot.addEventListener('drop', async (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');

        if (draggedFood) {
            // Añadir nueva comida al slot
            const foodsArray = getSlotFoods(slot);
            foodsArray.push(draggedFood);

            updateSlotWithArray(slot, foodsArray);
            await saveMenu(slot.dataset.day, slot.dataset.meal, foodsArray);
            draggedFood = null;
        }
    });
});

// Eliminar comida del menú (función legacy, redirige a removeFoodTag)
async function removeFood(btn) {
    await removeFoodTag(btn);
}

// Guardar plato personalizado en la base de datos
async function saveCustomFood(foodName, category) {
    if (isFirebaseConfigured) {
        try {
            const doc = await db.collection('foods').doc(CUSTOM_FOODS_DOC_ID).get();
            const data = doc.exists ? doc.data() : {};
            const customFoods = data.customFoods || {};

            if (!customFoods[category]) {
                customFoods[category] = [];
            }

            if (!customFoods[category].includes(foodName)) {
                customFoods[category].push(foodName);
                await db.collection('foods').doc(CUSTOM_FOODS_DOC_ID).set({ customFoods });
            }
        } catch (error) {
            console.error("Error guardando plato en Firebase:", error);
            saveCustomFoodLocal(foodName, category);
        }
    } else {
        saveCustomFoodLocal(foodName, category);
    }
}

// Guardar plato personalizado en localStorage
function saveCustomFoodLocal(foodName, category) {
    const customFoods = JSON.parse(localStorage.getItem('customFoods') || '{}');
    if (!customFoods[category]) {
        customFoods[category] = [];
    }
    if (!customFoods[category].includes(foodName)) {
        customFoods[category].push(foodName);
        localStorage.setItem('customFoods', JSON.stringify(customFoods));
    }
}

// Eliminar plato personalizado de la base de datos
async function removeCustomFood(foodName, category) {
    if (isFirebaseConfigured) {
        try {
            const doc = await db.collection('foods').doc(CUSTOM_FOODS_DOC_ID).get();
            if (doc.exists && doc.data().customFoods) {
                const customFoods = doc.data().customFoods;
                if (customFoods[category]) {
                    customFoods[category] = customFoods[category].filter(f => f !== foodName);
                    await db.collection('foods').doc(CUSTOM_FOODS_DOC_ID).set({ customFoods });
                }
            }
        } catch (error) {
            console.error("Error eliminando plato de Firebase:", error);
            removeCustomFoodLocal(foodName, category);
        }
    } else {
        removeCustomFoodLocal(foodName, category);
    }
}

// Eliminar plato personalizado de localStorage
function removeCustomFoodLocal(foodName, category) {
    const customFoods = JSON.parse(localStorage.getItem('customFoods') || '{}');
    if (customFoods[category]) {
        customFoods[category] = customFoods[category].filter(f => f !== foodName);
        localStorage.setItem('customFoods', JSON.stringify(customFoods));
    }
}

// Crear elemento de plato en el DOM
function createFoodItemElement(food) {
    const foodName = typeof food === 'string' ? food : food.name;

    const newItem = document.createElement('div');
    newItem.className = 'food-item';
    newItem.draggable = true;
    newItem.innerHTML = `<span class="food-item-text">${foodName}</span><button class="delete-food-btn" onclick="deleteFoodItem(event, this)">×</button>`;

    // Añadir eventos de arrastre
    newItem.addEventListener('dragstart', (e) => {
        draggedFood = newItem.querySelector('.food-item-text').textContent;
        e.target.style.opacity = '0.5';
    });

    newItem.addEventListener('dragend', (e) => {
        e.target.style.opacity = '1';
    });

    return newItem;
}

// Cargar platos personalizados en el DOM
function loadCustomFoods(customFoods) {
    // Guardar en variable global
    customFoodsGlobal = customFoods;

    // Limpiar todas las categorías primero
    document.querySelectorAll('.category-items').forEach(cat => {
        cat.innerHTML = '';
    });

    // Cargar platos en sus respectivas categorías
    Object.keys(customFoods).forEach(category => {
        const categoryIndex = CATEGORY_MAP[category];
        if (categoryIndex !== undefined) {
            const categoryContainer = document.querySelectorAll('.category-items')[categoryIndex];
            customFoods[category].forEach(food => {
                const foodName = typeof food === 'string' ? food : food.name;
                categoryContainer.appendChild(createFoodItemElement(food));
            });
        }
    });
}

// Buscar plato completo por nombre
function findPlateByName(name) {
    for (const category in customFoodsGlobal) {
        const plate = customFoodsGlobal[category].find(p => {
            const plateName = typeof p === 'string' ? p : p.name;
            return plateName === name;
        });
        if (plate) {
            // Si es string, convertir a objeto
            return typeof plate === 'string' ? { name: plate, description: '' } : plate;
        }
    }
    // Si no se encuentra, devolver objeto con solo el nombre
    return { name: name, description: '' };
}

// Cargar platos personalizados desde Firebase o localStorage
async function loadCustomFoodsFromDB() {
    if (isFirebaseConfigured) {
        try {
            const doc = await db.collection('foods').doc(CUSTOM_FOODS_DOC_ID).get();
            if (doc.exists && doc.data().customFoods) {
                loadCustomFoods(doc.data().customFoods);
            }
        } catch (error) {
            console.error("Error cargando platos de Firebase:", error);
            loadCustomFoodsFromLocal();
        }
    } else {
        loadCustomFoodsFromLocal();
    }
}

// Cargar platos personalizados desde localStorage
function loadCustomFoodsFromLocal() {
    const customFoods = JSON.parse(localStorage.getItem('customFoods') || '{}');
    loadCustomFoods(customFoods);
}

// Añadir comida personalizada
async function addCustomFood() {
    const input = document.getElementById('customFood');
    const categorySelect = document.getElementById('categorySelect');
    const foodName = input.value.trim();
    const category = categorySelect.value;

    if (foodName) {
        // Verificar si ya existe en esta categoría
        const categoryIndex = CATEGORY_MAP[category];
        const categoryContainer = document.querySelectorAll('.category-items')[categoryIndex];
        const existingItem = Array.from(categoryContainer.querySelectorAll('.food-item-text'))
            .find(item => item.textContent === foodName);

        if (existingItem) {
            alert('Este plato ya existe en esta categoría');
            input.value = '';
            return;
        }

        // Añadir al DOM
        const newItem = createFoodItemElement(foodName);
        categoryContainer.appendChild(newItem);

        // Guardar en la base de datos
        await saveCustomFood(foodName, category);

        input.value = '';
    }
}

// Permitir añadir con Enter
document.getElementById('customFood').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addCustomFood();
    }
});

// ====================================
// NAVEGACIÓN DE CALENDARIOS
// ====================================

// Actualizar la interfaz de navegación
function updateCalendarNavigation() {
    // Obtener rango de fechas del calendario actual
    let dates, startDate, endDate;

    if (isMobileDevice && (currentView === 'day' || currentView === 'three-days')) {
        // En móvil: mostrar rango de días consecutivos
        dates = getMobileDates();
        startDate = formatDateHeader(dates[0]);
        if (currentView === 'day') {
            endDate = startDate; // Solo un día
        } else {
            endDate = formatDateHeader(dates[2]); // 3 días
        }
    } else {
        // En desktop: mostrar semana completa
        const weekOffset = currentCalendar - 1;
        dates = getWeekDates(weekOffset);
        startDate = formatDateHeader(dates[0]);
        endDate = formatDateHeader(dates[6]);
    }

    // Actualizar label con las fechas
    document.getElementById('calendarLabel').textContent = `(${startDate} - ${endDate})`;

    // Actualizar botones de flecha
    document.getElementById('prevBtn').disabled = (currentCalendar === 1);
    document.getElementById('nextBtn').disabled = (currentCalendar === 4);

    // Actualizar indicadores
    document.querySelectorAll('.calendar-indicator').forEach((indicator, index) => {
        if (index + 1 === currentCalendar) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
}

// Navegar al calendario anterior
function prevCalendar() {
    if (currentCalendar > 1) {
        currentCalendar--;
        loadMenu();
        updateCalendarNavigation();
        if (isMobileDevice && currentView) {
            changeView(currentView);
        } else {
            updateTableHeaders();
        }
    }
}

// Navegar al siguiente calendario
function nextCalendar() {
    if (currentCalendar < 4) {
        currentCalendar++;
        loadMenu();
        updateCalendarNavigation();
        if (isMobileDevice && currentView) {
            changeView(currentView);
        } else {
            updateTableHeaders();
        }
    }
}

// Ir a un calendario específico
function goToCalendar(calNumber) {
    if (calNumber >= 1 && calNumber <= 4) {
        currentCalendar = calNumber;
        loadMenu();
        updateCalendarNavigation();
        if (isMobileDevice && currentView) {
            changeView(currentView);
        } else {
            updateTableHeaders();
        }
    }
}

// Añadir nuevo calendario (desplaza los anteriores)
// Añadir nuevo calendario (desplaza los anteriores)
async function addNewCalendar(autoShift = false) {
    if (!autoShift) {
        const confirmMsg = '¿Quieres crear un nuevo calendario?\n\n' +
            '⚠️ ATENCIÓN:\n' +
            '• El Calendario 1 será ELIMINADO permanentemente\n' +
            '• El Calendario 2 pasará a ser el 1\n' +
            '• El Calendario 3 pasará a ser el 2\n' +
            '• El Calendario 4 pasará a ser el 3\n' +
            '• Se creará un nuevo Calendario 4 (vacío)\n\n' +
            '¿Deseas continuar?';

        if (!confirm(confirmMsg)) {
            return;
        }
    }

    isResetting = true;

    try {
        // Obtener todos los datos actuales
        let allData = {};

        if (isFirebaseConfigured) {
            const doc = await db.collection('menus').doc(MENU_DOC_ID).get();
            if (doc.exists) {
                allData = doc.data();
            }
        } else {
            // Cargar desde localStorage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('cal')) {
                    const value = localStorage.getItem(key);
                    allData[key] = JSON.parse(value);
                }
            }
        }

        // Crear objeto con datos desplazados
        const newData = {};

        // Mover calendarios: 2→1, 3→2, 4→3
        Object.keys(allData).forEach(key => {
            if (key.startsWith('cal2-')) {
                const newKey = key.replace('cal2-', 'cal1-');
                newData[newKey] = allData[key];
            } else if (key.startsWith('cal3-')) {
                const newKey = key.replace('cal3-', 'cal2-');
                newData[newKey] = allData[key];
            } else if (key.startsWith('cal4-')) {
                const newKey = key.replace('cal4-', 'cal3-');
                newData[newKey] = allData[key];
            }
            // cal1- se descarta (no se añade a newData)
        });

        // Guardar los nuevos datos
        if (isFirebaseConfigured) {
            await db.collection('menus').doc(MENU_DOC_ID).set(newData);
        } else {
            // Limpiar localStorage de calendarios
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('cal')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));

            // Guardar nuevos datos
            Object.keys(newData).forEach(key => {
                localStorage.setItem(key, JSON.stringify(newData[key]));
            });
        }

        // Ir al calendario 4 (el nuevo vacío) o al 1 si es auto-shift
        currentCalendar = autoShift ? 1 : 4;
        updateCalendarNavigation();
        updateTableHeaders();
        loadMenu();

        if (!autoShift) {
            alert('✅ Nuevo calendario creado correctamente\n\n' +
                  'Los calendarios se han desplazado:\n' +
                  '• Calendario 1: Eliminado\n' +
                  '• Calendario 2 → Calendario 1\n' +
                  '• Calendario 3 → Calendario 2\n' +
                  '• Calendario 4 → Calendario 3\n' +
                  '• Nuevo Calendario 4: Vacío (actual)');
        } else {
            console.log('✅ Calendarios desplazados automáticamente por semana obsoleta');
        }

    } catch (error) {
        console.error("Error creando nuevo calendario:", error);
        if (!autoShift) {
            alert('❌ Error al crear nuevo calendario');
        }
    } finally {
        setTimeout(() => {
            isResetting = false;
        }, 500);
    }
}

// Reiniciar calendario actual
async function resetAllMeals() {
    console.log('Función resetAllMeals llamada');
    if (confirm(`¿Estás seguro de que quieres vaciar el Calendario ${currentCalendar}?\n\n✅ SOLO se limpiará el Calendario ${currentCalendar}\n❌ Los otros calendarios NO se modificarán\n❌ Los platos del banco NO se borrarán`)) {
        console.log('Usuario confirmó el reset');

        // Activar flag para evitar que la sincronización interfiera
        isResetting = true;

        try {
            // Limpiar todas las casillas del menú actual
            const slots = document.querySelectorAll('.meal-slot');
            console.log('Slots encontrados:', slots.length);

            slots.forEach(slot => {
                slot.innerHTML = '';
                // Limpiar localStorage de cada casilla del calendario actual
                const key = `cal${currentCalendar}-${slot.dataset.day}-${slot.dataset.meal}`;
                localStorage.removeItem(key);
            });

            // Limpiar Firebase (solo el calendario actual)
            if (isFirebaseConfigured) {
                console.log('Limpiando Firebase...');
                const doc = await db.collection('menus').doc(MENU_DOC_ID).get();
                if (doc.exists) {
                    const data = doc.data();
                    const updates = {};

                    // Marcar para eliminar todas las entradas del calendario actual
                    Object.keys(data).forEach(key => {
                        if (key.startsWith(`cal${currentCalendar}-`)) {
                            updates[key] = firebase.firestore.FieldValue.delete();
                        }
                    });

                    if (Object.keys(updates).length > 0) {
                        await db.collection('menus').doc(MENU_DOC_ID).update(updates);
                    }
                }
                console.log('Firebase limpiado correctamente');
            } else {
                console.log('Firebase no configurado, solo localStorage limpiado');
            }

            // Mensaje de confirmación
            alert(`✅ Calendario ${currentCalendar} limpiado correctamente\n\nLos otros 3 calendarios permanecen intactos.\nTus platos del banco de comidas se mantienen disponibles.`);
            console.log('Reset completado exitosamente');
        } catch (error) {
            console.error("Error durante el reset:", error);
            alert('❌ Error al reiniciar el menú');
        } finally {
            // Desactivar flag después de un breve delay
            setTimeout(() => {
                isResetting = false;
                console.log('Flag de reset desactivado');
            }, 500);
        }
    }
}

// ====================================
// FUNCIONALIDAD DE MODAL PARA MÓVILES
// ====================================

let currentSlot = null;
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

// Las instrucciones ya están configuradas para click (funciona en todos los dispositivos)

// Abrir modal de selección de comidas
function openFoodModal(slot) {
    currentSlot = slot;
    const modal = document.getElementById('foodModal');
    const modalFoods = document.getElementById('modalFoods');

    // Obtener día y tipo de comida para el título
    const day = slot.dataset.day;
    const meal = slot.dataset.meal;
    const dayNames = {
        'lunes': 'Lunes',
        'martes': 'Martes',
        'miercoles': 'Miércoles',
        'jueves': 'Jueves',
        'viernes': 'Viernes',
        'sabado': 'Sábado',
        'domingo': 'Domingo'
    };
    const mealNames = {
        'comida1': 'Primero',
        'comida2': 'Segundo',
        'postre': 'Postre',
        'cena1': 'Primero',
        'cena2': 'Segundo'
    };

    document.getElementById('modalTitle').textContent = `${dayNames[day]} - ${mealNames[meal]}`;

    // Limpiar contenido anterior
    modalFoods.innerHTML = '';

    // Verificar si hay platos disponibles
    if (!customFoodsGlobal || Object.keys(customFoodsGlobal).length === 0) {
        modalFoods.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No hay platos disponibles. <a href="gestion-platos.html" style="color: #4CAF50;">Crea algunos platos primero</a>.</div>';
        modal.style.display = 'block';
        return;
    }

    // Obtener platos ya añadidos en este slot
    const existingPlates = [];
    const key = `cal${currentCalendar}-${day}-${meal}`;
    const menuData = menuDb[key] || localStorage.getItem(key);
    if (menuData) {
        try {
            const foodsArray = JSON.parse(menuData);
            if (Array.isArray(foodsArray)) {
                foodsArray.forEach(food => {
                    const plateName = typeof food === 'string' ? food : food.name;
                    if (plateName) existingPlates.push(plateName);
                });
            }
        } catch (e) {
            console.error('Error parsing existing plates:', e);
        }
    }

    // Determinar qué categorías mostrar según el tipo de comida
    let categoriesToShow = [];

    if (meal === 'postre') {
        // Solo postres para el postre
        categoriesToShow = ['postres'];
    } else if (meal === 'cena1' || meal === 'cena2') {
        // Para cenas: primeros, segundos y cenas ligeras
        categoriesToShow = ['primeros', 'segundos', 'cenas'];
    } else {
        // Para comida1 y comida2: primeros y segundos
        categoriesToShow = ['primeros', 'segundos'];
    }

    const categoryTitles = {
        'primeros': '🥗 Primeros Platos',
        'segundos': '🍗 Segundos Platos',
        'postres': '🍮 Postres',
        'cenas': '🌙 Cenas Ligeras'
    };

    let hasPlates = false;

    categoriesToShow.forEach(category => {
        const plates = customFoodsGlobal[category] || [];

        // Filtrar platos ya añadidos
        const availablePlates = plates.filter(plate => {
            const plateName = typeof plate === 'string' ? plate : plate.name;
            return !existingPlates.includes(plateName);
        });

        if (availablePlates.length > 0) {
            hasPlates = true;
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'modal-category';
            categoryDiv.dataset.category = category;

            const categoryTitle = document.createElement('div');
            categoryTitle.className = 'modal-category-title';
            categoryTitle.textContent = categoryTitles[category];
            categoryDiv.appendChild(categoryTitle);

            availablePlates.forEach(plate => {
                const foodName = typeof plate === 'string' ? plate : plate.name;
                const foodDiv = document.createElement('div');
                foodDiv.className = 'modal-food-item';
                foodDiv.textContent = foodName;
                foodDiv.onclick = () => selectFood(foodName);
                categoryDiv.appendChild(foodDiv);
            });

            modalFoods.appendChild(categoryDiv);
        }
    });

    if (!hasPlates) {
        modalFoods.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No hay más platos disponibles. <a href="gestion-platos.html" style="color: #4CAF50;">Crea más platos</a> o elimina algunos platos ya añadidos.</div>';
    }

    // Mostrar modal
    modal.style.display = 'block';
}

// Cerrar modal
function closeFoodModal() {
    const modal = document.getElementById('foodModal');
    modal.style.display = 'none';
    currentSlot = null;
}

// Seleccionar comida y añadirla al slot
async function selectFood(foodName) {
    if (currentSlot) {
        // Leer datos actuales
        const cal = currentSlot.dataset.calendar;
        const key = `cal${cal}-${currentSlot.dataset.day}-${currentSlot.dataset.meal}`;
        let foodsArray = [];

        // Cargar array actual
        if (isFirebaseConfigured) {
            try {
                const doc = await db.collection('menus').doc(MENU_DOC_ID).get();
                if (doc.exists && doc.data()[key]) {
                    foodsArray = doc.data()[key];
                }
            } catch (error) {
                const saved = localStorage.getItem(key);
                if (saved) foodsArray = JSON.parse(saved);
            }
        } else {
            const saved = localStorage.getItem(key);
            if (saved) foodsArray = JSON.parse(saved);
        }

        // Verificar si el plato ya está en el slot
        const alreadyExists = foodsArray.some(food => {
            const name = typeof food === 'string' ? food : food.name;
            return name === foodName;
        });

        if (alreadyExists) {
            alert('Este plato ya está añadido en esta casilla');
            return;
        }

        // Buscar el plato completo con descripción
        const fullPlate = findPlateByName(foodName);
        foodsArray.push(fullPlate);

        updateSlotWithArray(currentSlot, foodsArray);
        await saveMenu(currentSlot.dataset.day, currentSlot.dataset.meal, foodsArray);

        // Eliminar el plato del modal (para evitar añadirlo nuevamente)
        const modalFoods = document.getElementById('modalFoods');
        const foodItems = modalFoods.querySelectorAll('.modal-food-item');
        foodItems.forEach(item => {
            if (item.textContent === foodName) {
                item.remove();

                // Si era el último de su categoría, eliminar también el título
                const category = item.closest('.modal-category');
                if (category && category.querySelectorAll('.modal-food-item').length === 0) {
                    category.remove();
                }
            }
        });

        // Si no quedan más platos en el modal, cerrarlo
        const remainingItems = modalFoods.querySelectorAll('.modal-food-item');
        if (remainingItems.length === 0) {
            modalFoods.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">✅ Todos los platos disponibles han sido añadidos</div>';
            setTimeout(() => closeFoodModal(), 1500);
        }
    }
}

// Cerrar modal al hacer click fuera
window.onclick = function(event) {
    const modal = document.getElementById('foodModal');
    if (event.target == modal) {
        closeFoodModal();
    }
};

// Agregar evento de click a las casillas
document.querySelectorAll('.meal-slot').forEach(slot => {
    slot.addEventListener('click', (e) => {
        // Abrir modal si no se está haciendo click en el botón de eliminar
        if (!e.target.classList.contains('remove-btn') &&
            !e.target.closest('.remove-btn')) {
            openFoodModal(slot);
        }
    });
});

// ====================================
// INICIALIZACIÓN
// ====================================

// Inicializar controles de vista según el dispositivo
function initViewControls() {
    const viewControls = document.getElementById('viewControls');
    const controlsHTML = isMobileDevice
        ? `
            <button class="view-btn" data-view="day" onclick="changeView('day')">Hoy</button>
            <button class="view-btn" data-view="three-days" onclick="changeView('three-days')">3 Días</button>
          `
        : `
            <button class="view-btn active" data-view="single-week" onclick="changeView('single-week')">1 Semana</button>
            <button class="view-btn" data-view="daily" onclick="changeView('daily')">Diario</button>
          `;

    viewControls.innerHTML = '<span class="view-controls-label">Vista:</span>' + controlsHTML;

    // En móvil, activar por defecto la vista "Hoy"
    if (isMobileDevice) {
        setTimeout(() => changeView('day'), 100);
    }
}

// Cargar datos al iniciar
initViewControls();
updateTableHeaders();
checkAndAutoShift();
loadMenu();
loadCustomFoodsFromDB();
updateCalendarNavigation();

// Verificar cada hora si hay que auto-desplazar
setInterval(checkAndAutoShift, 3600000); // 1 hora
