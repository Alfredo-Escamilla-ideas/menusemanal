// ====================================
// CONFIGURACIÓN FIREBASE
// ====================================
let db = null;

try {
    const firebaseConfig = {
        apiKey: "AIzaSyDPxRwlqftP-RoeJILhw_PsM3fsqCFIfqo",
        authDomain: "comidas-33dba.firebaseapp.com",
        projectId: "comidas-33dba",
        storageBucket: "comidas-33dba.firebasestorage.app",
        messagingSenderId: "627965464872",
        appId: "1:627965464872:web:5a921a070a3f4d8afbc01d"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        console.log("✅ Firebase conectado correctamente");
    }
} catch (error) {
    console.log("⚠️ Error al conectar Firebase - Usando localStorage", error);
}

const CUSTOM_FOODS_DOC_ID = 'custom-foods';
let editingPlateContext = null;
let confirmResolver = null;
const THEME_STORAGE_KEY = 'gestion-platos-theme-mode';

function applyThemeMode(mode) {
    const normalizedMode = ['light', 'dark'].includes(mode) ? mode : 'light';

    document.body.classList.remove('theme-light', 'theme-dark');
    if (normalizedMode === 'dark') {
        document.body.classList.add('theme-dark');
    }

    document.querySelectorAll('.theme-toggle-btn').forEach(button => {
        button.classList.remove('active');
    });

    const activeButton = document.querySelector(`.mode-${normalizedMode}`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

function setThemeMode(mode) {
    applyThemeMode(mode);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
}

function initThemeMode() {
    const savedMode = localStorage.getItem(THEME_STORAGE_KEY) || 'light';
    applyThemeMode(savedMode);
}

function parsePlateMeta(description) {
    let comments = '';
    let link = '';

    try {
        if (description) {
            const parsed = JSON.parse(description);
            comments = parsed.comments || '';
            link = parsed.link || '';
        }
    } catch (e) {
        comments = description || '';
    }

    return { comments, link };
}

// ====================================
// SISTEMA DE NOTIFICACIONES
// ====================================
function showNotification(message, type = 'success') {
    // Eliminar notificación anterior si existe
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Crear nueva notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Mostrar notificación
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Ocultar y eliminar después de 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 400);
    }, 3000);
}

// ====================================
// FUNCIONES DE BASE DE DATOS
// ====================================

// Cargar platos desde Firebase o localStorage
async function loadPlates() {
    let customFoods = {
        primeros: [],
        segundos: [],
        postres: [],
        cenas: []
    };

    if (db) {
        try {
            const doc = await db.collection('foods').doc(CUSTOM_FOODS_DOC_ID).get();
            if (doc.exists && doc.data().customFoods) {
                customFoods = doc.data().customFoods;
            }
        } catch (error) {
            console.log("Error cargando desde Firebase, usando localStorage", error);
            const stored = localStorage.getItem('customFoods');
            if (stored) customFoods = JSON.parse(stored);
        }
    } else {
        const stored = localStorage.getItem('customFoods');
        if (stored) customFoods = JSON.parse(stored);
    }

    renderPlates(customFoods);
    return customFoods;
}

// Guardar platos en Firebase y localStorage
async function savePlates(customFoods) {
    // Guardar en localStorage
    localStorage.setItem('customFoods', JSON.stringify(customFoods));

    // Guardar en Firebase con la estructura correcta
    if (db) {
        try {
            await db.collection('foods').doc(CUSTOM_FOODS_DOC_ID).set({ customFoods: customFoods });
            console.log("✅ Platos guardados en Firebase");
        } catch (error) {
            console.log("⚠️ Error guardando en Firebase", error);
        }
    }
}

// ====================================
// FUNCIONES DE UI
// ====================================

// Renderizar lista de platos
function renderPlates(customFoods) {
    const container = document.getElementById('platesList');
    container.innerHTML = '';

    const categories = {
        primeros: '🥗 Primeros Platos',
        segundos: '🍗 Segundos Platos',
        postres: '🍮 Postres',
        cenas: '🌙 Cenas Ligeras'
    };

    let hasPlates = false;

    for (const [category, title] of Object.entries(categories)) {
        const indexedPlates = (customFoods[category] || []).map((plate, originalIndex) => ({
            plate,
            originalIndex
        })).sort((a, b) => {
            const nameA = (typeof a.plate === 'string' ? a.plate : a.plate.name).toLowerCase();
            const nameB = (typeof b.plate === 'string' ? b.plate : b.plate.name).toLowerCase();
            return nameA.localeCompare(nameB, 'es');
        });
        if (indexedPlates.length === 0) continue;

        hasPlates = true;

        const section = document.createElement('div');
        section.className = 'category-section';
        section.innerHTML = `<div class="category-title">${title}</div>`;

        indexedPlates.forEach(({ plate, originalIndex }) => {
            const plateDiv = document.createElement('div');
            plateDiv.className = 'plate-item';

            const name = typeof plate === 'string' ? plate : plate.name;
            let description = typeof plate === 'object' ? plate.description : '';
            const { comments, link } = parsePlateMeta(description);

            let descriptionHTML = '';
            if (comments) {
                descriptionHTML += `<div class="plate-description">💬 ${comments}</div>`;
            }
            if (link) {
                descriptionHTML += `<div class="plate-link">🔗 <a href="${link}" target="_blank">${link}</a></div>`;
            }

            plateDiv.innerHTML = `
                <div class="plate-info">
                    <div class="plate-name">${name}</div>
                    ${descriptionHTML}
                </div>
                <div class="plate-actions">
                    <button class="btn-edit" onclick="editPlate('${category}', ${originalIndex})">✏️ Editar</button>
                    <button class="btn-delete" onclick="deletePlate('${category}', ${originalIndex})">🗑️ Eliminar</button>
                </div>
            `;
            section.appendChild(plateDiv);
        });

        container.appendChild(section);
    }

    if (!hasPlates) {
        container.innerHTML = '<div class="empty-message">No hay platos creados. ¡Añade tu primer plato!</div>';
    }
}

// Añadir nuevo plato
async function addPlate() {
    const name = document.getElementById('plateName').value.trim();
    const comments = document.getElementById('plateComments').value.trim();
    const link = document.getElementById('plateLink').value.trim();
    
    // Obtener todas las categorías seleccionadas
    const selectedCategories = Array.from(document.querySelectorAll('input[name="category"]:checked'))
        .map(checkbox => checkbox.value);

    if (!name) {
        showNotification('Por favor, introduce el nombre del plato', 'error');
        return;
    }

    if (selectedCategories.length === 0) {
        showNotification('Por favor, selecciona al menos una categoría', 'error');
        return;
    }

    const customFoods = await loadPlates();

    // Crear objeto de plato con nombre y descripción estructurada
    const plate = {
        name: name,
        description: JSON.stringify({ comments: comments || '', link: link || '' })
    };

    // Añadir el plato a todas las categorías seleccionadas
    selectedCategories.forEach(category => {
        if (!customFoods[category]) {
            customFoods[category] = [];
        }
        customFoods[category].push(plate);
    });

    await savePlates(customFoods);

    // Limpiar formulario
    document.getElementById('plateName').value = '';
    document.getElementById('plateComments').value = '';
    document.getElementById('plateLink').value = '';
    
    // Desmarcar todos los checkboxes
    document.querySelectorAll('input[name="category"]:checked').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Recargar lista
    renderPlates(customFoods);

    const categoriesText = selectedCategories.length > 1 
        ? `${selectedCategories.length} categorías` 
        : '1 categoría';
    showNotification(`Plato "${name}" añadido en ${categoriesText}`, 'success');
}

// Editar plato
async function editPlate(category, index) {
    const customFoods = await loadPlates();
    const plate = customFoods[category][index];

    const name = typeof plate === 'string' ? plate : plate.name;
    let description = typeof plate === 'object' ? plate.description : '';
    const { comments, link } = parsePlateMeta(description);

    const categories = ['primeros', 'segundos', 'postres', 'cenas'];
    const existingCategories = categories.filter(cat => {
        return (customFoods[cat] || []).some(item => {
            const itemName = typeof item === 'string' ? item : item.name;
            const itemDescription = typeof item === 'object' ? item.description : '';
            return itemName === name && itemDescription === description;
        });
    });

    editingPlateContext = {
        originalName: name,
        originalDescription: description,
        originalCategory: category,
        originalIndex: index
    };

    document.getElementById('editPlateName').value = name;
    document.getElementById('editPlateComments').value = comments;
    document.getElementById('editPlateLink').value = link;

    document.querySelectorAll('input[name="editCategory"]').forEach(checkbox => {
        checkbox.checked = existingCategories.includes(checkbox.value);
    });

    document.getElementById('editPlateModal').classList.add('show');
}

// Eliminar plato
async function deletePlate(category, index) {
    const customFoods = await loadPlates();
    const plate = customFoods[category][index];
    const name = typeof plate === 'string' ? plate : plate.name;

    const confirmed = await showConfirmModal(`¿Estás seguro de eliminar "${name}"?`, 'Eliminar plato');
    if (!confirmed) return;

    customFoods[category].splice(index, 1);
    await savePlates(customFoods);
    renderPlates(customFoods);
}

function closeEditModal() {
    const modal = document.getElementById('editPlateModal');
    modal.classList.remove('show');
    editingPlateContext = null;
}

async function savePlateEdit() {
    if (!editingPlateContext) {
        return;
    }

    const newName = document.getElementById('editPlateName').value.trim();
    const newComments = document.getElementById('editPlateComments').value.trim();
    const newLink = document.getElementById('editPlateLink').value.trim();
    const selectedCategories = Array.from(document.querySelectorAll('input[name="editCategory"]:checked'))
        .map(checkbox => checkbox.value);

    if (!newName) {
        showNotification('El nombre del plato es obligatorio', 'error');
        return;
    }

    if (selectedCategories.length === 0) {
        showNotification('Selecciona al menos una categoría', 'error');
        return;
    }

    const customFoods = await loadPlates();
    const { originalName, originalDescription } = editingPlateContext;

    ['primeros', 'segundos', 'postres', 'cenas'].forEach(category => {
        const list = customFoods[category] || [];
        const removeIndex = list.findIndex(item => {
            const itemName = typeof item === 'string' ? item : item.name;
            const itemDescription = typeof item === 'object' ? item.description : '';
            return itemName === originalName && itemDescription === originalDescription;
        });

        if (removeIndex !== -1) {
            list.splice(removeIndex, 1);
        }

        customFoods[category] = list;
    });

    const updatedPlate = {
        name: newName,
        description: JSON.stringify({
            comments: newComments,
            link: newLink
        })
    };

    selectedCategories.forEach(category => {
        if (!customFoods[category]) {
            customFoods[category] = [];
        }
        customFoods[category].push(updatedPlate);
    });

    await savePlates(customFoods);
    renderPlates(customFoods);
    closeEditModal();
    showNotification('Plato editado correctamente', 'success');
}

function showConfirmModal(message, title = 'Confirmar acción') {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    modal.classList.add('show');

    return new Promise(resolve => {
        confirmResolver = resolve;
    });
}

function resolveConfirm(value) {
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('show');

    if (confirmResolver) {
        confirmResolver(value);
        confirmResolver = null;
    }
}

window.addEventListener('click', function(event) {
    const editModal = document.getElementById('editPlateModal');
    const confirmModal = document.getElementById('confirmModal');

    if (event.target === editModal) {
        closeEditModal();
    }

    if (event.target === confirmModal) {
        resolveConfirm(false);
    }
});

// ====================================
// INICIALIZACIÓN
// ====================================

initThemeMode();
loadPlates();
