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
        try {
            // Enable IndexedDB persistence so data is kept offline and synced
            firebase.firestore().enablePersistence({ synchronizeTabs: true });
            console.log('✅ Firestore persistence enabled');
        } catch (err) {
            console.warn('⚠️ Firestore persistence not enabled:', err && err.code ? err.code : err);
        }
        console.log("✅ Firebase conectado correctamente");
    }
} catch (error) {
    console.log("⚠️ Error al conectar Firebase - Usando localStorage", error);
}

// ====================================
// AUTENTICACIÓN
// ====================================
let auth = null;
let currentUser = null;
let isEditorUser = false;
let authDropdownOpen = false;
const ADMIN_EMAIL = 'daniel.escamilla.bq@gmail.com';

try {
    auth = firebase.auth();
} catch (e) {
    console.warn('⚠️ Auth no disponible', e);
}

// Mostrar botón de entrada inmediatamente (antes de que Firebase responda)
document.addEventListener('DOMContentLoaded', () => renderAuthWidget(null, false));

function handleAuthClick() {
    if (!auth) return;
    if (!currentUser) {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(err => {
            console.warn('Login cancelado o error', err);
        });
    } else {
        toggleAuthDropdown();
    }
}

function logoutAuth() {
    if (auth) auth.signOut();
    closeAuthDropdown();
}

function toggleAuthDropdown() {
    authDropdownOpen = !authDropdownOpen;
    const dropdown = document.getElementById('authDropdown');
    if (dropdown) dropdown.classList.toggle('hidden', !authDropdownOpen);
}

function closeAuthDropdown() {
    authDropdownOpen = false;
    const dropdown = document.getElementById('authDropdown');
    if (dropdown) dropdown.classList.add('hidden');
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('#authWidget')) closeAuthDropdown();
});

async function checkIfEditor(user) {
    if (!user || !db) return false;
    try {
        const doc = await db.collection('editors').doc('allowed').get();
        if (!doc.exists) return false;
        const emails = doc.data().emails || [];
        return emails.map(e => e.toLowerCase()).includes(user.email.toLowerCase());
    } catch (e) {
        return false;
    }
}

function renderAuthWidget(user, isEditor) {
    const widget = document.getElementById('authWidget');
    if (!widget) return;

    if (!user) {
        widget.innerHTML = `<div class="auth-login-btn" onclick="handleAuthClick()" title="Iniciar sesión para editar">🔑 Entrar</div>`;
        return;
    }

    const isAdmin = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const name = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0];
    const avatar = user.photoURL
        ? `<img class="auth-avatar" src="${user.photoURL}" alt="">`
        : `<span class="auth-avatar-ph">👤</span>`;
    const statusClass = isEditor ? 'active' : 'no-access';
    const adminLink = isAdmin
        ? `<a class="auth-dropdown-item auth-dropdown-admin" href="admin.html">⚙️ Gestionar editores</a>`
        : '';

    widget.innerHTML = `
        <div class="auth-trigger ${statusClass}" onclick="handleAuthClick()"
             title="${isEditor ? 'Editor activo: ' + user.email : user.email + ' — sin permiso de edición'}">
            ${avatar}
            <span class="auth-name">${name}</span>
            <span class="auth-chevron">▾</span>
        </div>
        <div id="authDropdown" class="auth-dropdown hidden">
            ${adminLink}
            <button class="auth-dropdown-item auth-dropdown-logout" onclick="logoutAuth()">🚪 Cerrar sesión</button>
        </div>`;
}

function isPermissionDeniedError(error) {
    return error && (
        error.code === 'permission-denied' ||
        (error.message && error.message.toLowerCase().includes('permission'))
    );
}

function handleFirebaseError(error) {
    if (isPermissionDeniedError(error)) {
        if (!currentUser) {
            showNotification('🔒 Inicia sesión para poder editar los platos', 'warning');
        } else {
            showNotification('⛔ Tu cuenta no tiene permiso de edición', 'error');
        }
        return true;
    }
    return false;
}

if (auth) {
    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        if (user) {
            isEditorUser = await checkIfEditor(user);
        } else {
            isEditorUser = false;
        }
        renderAuthWidget(user, isEditorUser);
    });
}

// ====================================
// BUSCADOR DIRECTOALPALADAR
// ====================================
function searchInDirectoAlPaladar(context = 'add') {
    const inputId = context === 'edit' ? 'editPlateName' : 'plateName';
    const name = document.getElementById(inputId)?.value?.trim();
    if (!name) {
        showNotification('Escribe el nombre del plato primero', 'warning');
        return;
    }
    const query = encodeURIComponent(name.toLowerCase()).replace(/%20/g, '+');
    window.open(`https://www.directoalpaladar.com/?s=${query}`, '_blank', 'noopener');
}

const CUSTOM_FOODS_DOC_ID = 'custom-foods';
let editingPlateContext = null;
let confirmResolver = null;
const THEME_STORAGE_KEY = 'app-theme-mode';
let cachedCustomFoods = null;

function applyThemeMode(mode) {
    const normalizedMode = ['light', 'dark'].includes(mode) ? mode : 'light';

    document.body.classList.remove('theme-light', 'theme-dark');
    if (normalizedMode !== 'light') {
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

function getPlateName(plate) {
    return typeof plate === 'string' ? plate : (plate?.name || '');
}

function normalizeFoodName(name) {
    return String(name || '')
        .normalize('NFC')
        .replace(/[^\p{L}\s-]/gu, '')
        .replace(/\s*-\s*/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/\s{2,}/g, ' ')
        .replace(/^-+|-+$/g, '')
        .trim();
}

function isValidFoodName(name) {
    return /^[\p{L}]+(?:[ -][\p{L}]+)*$/u.test(name);
}

function normalizeSearchText(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function getInvalidFoodChars(name) {
    const matches = String(name || '').match(/[^\p{L}\s-]/gu) || [];
    return [...new Set(matches)];
}

function sanitizeCustomFoodsMap(customFoods = {}) {
    const categories = ['primeros', 'segundos', 'postres', 'cenas'];
    const sanitizedFoods = {};
    let changed = false;

    categories.forEach(category => {
        const sourceFoods = Array.isArray(customFoods[category]) ? customFoods[category] : [];
        const dedupe = new Map();

        sourceFoods.forEach(plate => {
            const originalName = getPlateName(plate);
            const cleanedName = normalizeFoodName(originalName);

            if (!cleanedName || !isValidFoodName(cleanedName)) {
                if (originalName) {
                    changed = true;
                }
                return;
            }

            const normalizedPlate = typeof plate === 'object' && plate !== null
                ? { ...plate, name: cleanedName }
                : cleanedName;

            if (cleanedName !== originalName) {
                changed = true;
            }

            const dedupeKey = cleanedName.toLocaleLowerCase('es');
            if (!dedupe.has(dedupeKey)) {
                dedupe.set(dedupeKey, normalizedPlate);
            } else {
                changed = true;
                const existing = dedupe.get(dedupeKey);
                if (typeof existing === 'string' && typeof normalizedPlate === 'object') {
                    dedupe.set(dedupeKey, normalizedPlate);
                }
            }
        });

        sanitizedFoods[category] = Array.from(dedupe.values());

        if (sourceFoods.length !== sanitizedFoods[category].length) {
            changed = true;
        }
    });

    return { sanitizedFoods, changed };
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

    const { sanitizedFoods, changed } = sanitizeCustomFoodsMap(customFoods);

    if (changed) {
        await savePlates(sanitizedFoods);
    }

    cachedCustomFoods = sanitizedFoods;
    renderPlates(sanitizedFoods);
    return sanitizedFoods;
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
    cachedCustomFoods = customFoods;
    const container = document.getElementById('platesList');
    const searchInput = document.getElementById('platesSearchInput');
    const query = normalizeSearchText(searchInput ? searchInput.value.trim() : '');
    container.innerHTML = '';

    const categories = {
        primeros: '🥗 Primeros Platos',
        segundos: '🍗 Segundos Platos',
        postres: '🍮 Postres',
        cenas: '🌙 Cenas Ligeras'
    };

    let hasPlates = false;
    let hasVisiblePlates = false;

    for (const [category, title] of Object.entries(categories)) {
        const indexedPlates = (customFoods[category] || []).map((plate, originalIndex) => ({
            plate,
            originalIndex
        })).sort((a, b) => {
            const nameA = (typeof a.plate === 'string' ? a.plate : a.plate.name).toLowerCase();
            const nameB = (typeof b.plate === 'string' ? b.plate : b.plate.name).toLowerCase();
            return nameA.localeCompare(nameB, 'es');
        });

        if (indexedPlates.length > 0) {
            hasPlates = true;
        }

        const filteredIndexedPlates = indexedPlates.filter(({ plate }) => {
            if (!query) return true;

            const name = typeof plate === 'string' ? plate : plate.name;
            const description = typeof plate === 'object' ? plate.description : '';
            const { comments, link } = parsePlateMeta(description);
            const searchableText = `${name} ${comments} ${link}`;
            return normalizeSearchText(searchableText).includes(query);
        });

        if (filteredIndexedPlates.length === 0) continue;

        hasVisiblePlates = true;

        const section = document.createElement('div');
        section.className = 'category-section';

        const categoryHeader = document.createElement('button');
        categoryHeader.type = 'button';
        categoryHeader.className = 'category-toggle';
        categoryHeader.setAttribute('aria-expanded', 'false');
        categoryHeader.innerHTML = `
            <span class="category-title">${title} <span class="category-count">(${filteredIndexedPlates.length})</span></span>
            <span class="category-arrow">▼</span>
        `;

        const categoryContent = document.createElement('div');
        categoryContent.className = 'category-content collapsed';

        categoryHeader.addEventListener('click', () => {
            const isCollapsed = categoryContent.classList.toggle('collapsed');
            categoryHeader.setAttribute('aria-expanded', String(!isCollapsed));
            const arrow = categoryHeader.querySelector('.category-arrow');
            if (arrow) {
                arrow.textContent = isCollapsed ? '▼' : '▲';
            }
        });

        section.appendChild(categoryHeader);

        filteredIndexedPlates.forEach(({ plate, originalIndex }) => {
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
            categoryContent.appendChild(plateDiv);
        });

        section.appendChild(categoryContent);

        container.appendChild(section);
    }

    if (!hasPlates) {
        container.innerHTML = '<div class="empty-message">No hay platos creados. ¡Añade tu primer plato!</div>';
        return;
    }

    if (!hasVisiblePlates) {
        container.innerHTML = '<div class="empty-message">No hay resultados para esa búsqueda.</div>';
    }
}

function initPlatesSearch() {
    const searchInput = document.getElementById('platesSearchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        if (cachedCustomFoods) {
            renderPlates(cachedCustomFoods);
        }
    });
}

// Añadir nuevo plato
async function addPlate() {
    const rawName = document.getElementById('plateName').value.trim();
    const name = normalizeFoodName(rawName);
    const comments = document.getElementById('plateComments').value.trim();
    const link = document.getElementById('plateLink').value.trim();
    
    // Obtener todas las categorías seleccionadas
    const selectedCategories = Array.from(document.querySelectorAll('input[name="category"]:checked'))
        .map(checkbox => checkbox.value);

    if (!rawName) {
        showNotification('Por favor, introduce el nombre del plato', 'error');
        return;
    }

    const invalidChars = getInvalidFoodChars(rawName);
    if (invalidChars.length > 0) {
        showNotification(`Símbolos no permitidos: ${invalidChars.join(' ')}. Solo se permiten letras, espacios y guion (-)`, 'error');
        return;
    }

    if (!name || !isValidFoodName(name)) {
        showNotification('Nombre inválido: solo letras, espacios y guion (-)', 'error');
        return;
    }

    if (selectedCategories.length === 0) {
        showNotification('Por favor, selecciona al menos una categoría', 'error');
        return;
    }

    const customFoods = await loadPlates();

    const alreadyExists = selectedCategories.some(category => {
        const categoryPlates = customFoods[category] || [];
        return categoryPlates.some(item => {
            const existingName = normalizeFoodName(getPlateName(item));
            return existingName.toLocaleLowerCase('es') === name.toLocaleLowerCase('es');
        });
    });

    if (alreadyExists) {
        showNotification('Ese plato ya existe en una categoría seleccionada', 'error');
        return;
    }

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

    // Soft-delete: mark the item as deleted instead of removing it
    try {
        if (!customFoods[category][index]) {
            // fallback: remove if not found
            customFoods[category].splice(index, 1);
        } else {
            const item = customFoods[category][index];
            if (typeof item === 'object' && item !== null) {
                item.deleted = true;
            } else {
                // convert simple string into an object with deleted flag
                customFoods[category][index] = { name: item, deleted: true };
            }
        }
    } catch (e) {
        // fallback to removal
        customFoods[category].splice(index, 1);
    }

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

    const rawNewName = document.getElementById('editPlateName').value.trim();
    const newName = normalizeFoodName(rawNewName);
    const newComments = document.getElementById('editPlateComments').value.trim();
    const newLink = document.getElementById('editPlateLink').value.trim();
    const selectedCategories = Array.from(document.querySelectorAll('input[name="editCategory"]:checked'))
        .map(checkbox => checkbox.value);

    if (!rawNewName) {
        showNotification('El nombre del plato es obligatorio', 'error');
        return;
    }

    const invalidChars = getInvalidFoodChars(rawNewName);
    if (invalidChars.length > 0) {
        showNotification(`Símbolos no permitidos: ${invalidChars.join(' ')}. Solo se permiten letras, espacios y guion (-)`, 'error');
        return;
    }

    if (!newName || !isValidFoodName(newName)) {
        showNotification('Nombre inválido: solo letras, espacios y guion (-)', 'error');
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

    const duplicateInSelection = selectedCategories.some(category => {
        const list = customFoods[category] || [];
        return list.some(item => {
            const existingName = normalizeFoodName(getPlateName(item));
            return existingName.toLocaleLowerCase('es') === newName.toLocaleLowerCase('es');
        });
    });

    if (duplicateInSelection) {
        showNotification('Ya existe un plato con ese nombre en una categoría seleccionada', 'error');
        return;
    }

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

document.addEventListener('keydown', function(event) {
    if (event.key !== 'Enter' && event.key !== 'NumpadEnter') {
        return;
    }

    const target = event.target;
    const isInsideAddForm = target.closest('.add-form');
    const editModal = document.getElementById('editPlateModal');
    const isEditModalOpen = editModal && editModal.classList.contains('show');
    const activeElement = document.activeElement;
    const isInsideEditModal = target.closest('#editPlateModal') || (activeElement && activeElement.closest('#editPlateModal'));
    const isEditableControl = activeElement && ['INPUT', 'SELECT'].includes(activeElement.tagName);
    const isTextarea = target.tagName === 'TEXTAREA';

    if (isTextarea) {
        return;
    }

    if (isEditModalOpen && isInsideEditModal && isEditableControl) {
        event.preventDefault();
        savePlateEdit();
        return;
    }

    if (!isInsideAddForm) {
        return;
    }

    event.preventDefault();
    addPlate();
});

// ====================================
// INICIALIZACIÓN
// ====================================

initThemeMode();
initPlatesSearch();
loadPlates();
