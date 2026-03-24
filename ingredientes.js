// ============================================
// INGREDIENTES.JS — Gestión de ingredientes
// ============================================

const ING_COLLECTION = 'ingredientes';

const ALLERGEN_LABELS = {
    gluten: 'Gluten', crustaceos: 'Crustáceos', huevos: 'Huevos',
    pescado: 'Pescado', cacahuetes: 'Cacahuetes', soja: 'Soja',
    lacteos: 'Lácteos', frutos_secos: 'Frutos secos', apio: 'Apio',
    mostaza: 'Mostaza', sesamo: 'Sésamo', sulfitos: 'Sulfitos',
    moluscos: 'Moluscos', altramuz: 'Altramuz',
};

const CAT_LABELS = {
    carnes: 'Carnes', pescados: 'Pescados', mariscos: 'Mariscos',
    verduras: 'Verduras', frutas: 'Frutas', lacteos: 'Lácteos',
    huevos: 'Huevos', cereales: 'Cereales y harinas', legumbres: 'Legumbres',
    pasta_arroz: 'Pasta y arroz', aceites_grasas: 'Aceites y grasas',
    condimentos: 'Condimentos y especias', salsas: 'Salsas y aderezos',
    conservas: 'Conservas', frutos_secos: 'Frutos secos y semillas',
    embutidos: 'Embutidos y charcutería', pan_bolleria: 'Pan y bollería',
    bebidas: 'Bebidas', otros: 'Otros',
};

let allIngredients = [];
let editingId = null;
let bsIngModal = null;
let bsConfirmModal = null;
let confirmCallback = null;

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
    initThemeMode();
    populateCatFilter();
    document.getElementById('ingConfirmOk').addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        closeConfirmModal();
    });
});

// ---- Auth callback (llamado desde utils.js) ----
function onAuthReady(user) {
    const gate = document.getElementById('authGate');
    const app  = document.getElementById('appContent');
    if (user) {
        gate.style.display = 'none';
        app.style.display = 'block';
        loadIngredients();
    } else {
        gate.style.display = 'flex';
        app.style.display = 'none';
    }
}

// ---- Cargar ----
async function loadIngredients() {
    try {
        const snap = await db.collection('users').doc(currentUser.uid)
            .collection(ING_COLLECTION).orderBy('name').get();
        allIngredients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderGrid();
        updateCount();
        setupFilters();
    } catch (e) {
        console.error('Error cargando ingredientes:', e);
        showNotification('Error al cargar ingredientes', 'error');
    }
}

// ---- Render ----
function renderGrid() {
    const grid  = document.getElementById('ingGrid');
    const empty = document.getElementById('ingEmpty');
    const query = normalize(document.getElementById('ingSearch').value);
    const cat   = document.getElementById('ingFilterCat').value;
    const alg   = document.getElementById('ingFilterAllergen').value;

    let items = allIngredients;
    if (query) items = items.filter(i =>
        normalize(i.name).includes(query) ||
        normalize(i.category || '').includes(query) ||
        normalize(CAT_LABELS[i.category] || '').includes(query) ||
        (i.allergens || []).some(a => normalize(ALLERGEN_LABELS[a] || a).includes(query))
    );
    if (cat) items = items.filter(i => i.category === cat);
    if (alg) items = items.filter(i => (i.allergens || []).includes(alg));

    if (items.length === 0) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');
    grid.innerHTML = items.map(renderCard).join('');
}

function renderCard(ing) {
    const allergenTags = (ing.allergens || []).map(a =>
        `<span class="inline-block text-[11px] font-semibold px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">${ALLERGEN_LABELS[a] || a}</span>`
    ).join('');

    const catLabel = CAT_LABELS[ing.category] || ing.category || '';
    const unit = ing.unit ? ` · ${ing.unit}` : '';
    const notes = ing.notes ? `<p class="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">${escapeHtml(ing.notes)}</p>` : '';

    return `
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-2.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-[#c2410c] dark:hover:border-[#fb923c] transition-all">
        <div class="flex items-start justify-between gap-2">
            <div class="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-snug">${escapeHtml(ing.name)}</div>
            <div class="flex gap-1 shrink-0">
                <button class="p-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 text-xs transition" onclick="openEditModal('${ing.id}')" title="Editar">✏️</button>
                <button class="p-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500 hover:border-red-300 text-xs transition" onclick="confirmDelete('${ing.id}', '${escapeHtml(ing.name).replace(/'/g, "\\'")}')" title="Eliminar">🗑️</button>
            </div>
        </div>
        <span class="inline-block text-xs font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 w-fit">${catLabel}${unit}</span>
        ${allergenTags ? `<div class="flex flex-wrap gap-1">${allergenTags}</div>` : ''}
        ${notes}
    </div>`;
}

function updateCount() {
    document.getElementById('ingCount').textContent =
        `${allIngredients.length} ingrediente${allIngredients.length !== 1 ? 's' : ''}`;
}

// ---- Filtros ----
function setupFilters() {
    document.getElementById('ingSearch').addEventListener('input', renderGrid);
    document.getElementById('ingFilterCat').addEventListener('change', renderGrid);
    document.getElementById('ingFilterAllergen').addEventListener('change', renderGrid);
}

function populateCatFilter() {
    const sel = document.getElementById('ingFilterCat');
    Object.entries(CAT_LABELS).forEach(([val, label]) => {
        const opt = document.createElement('option');
        opt.value = val; opt.textContent = label;
        sel.appendChild(opt);
    });
}

// ---- Modal Añadir ----
function openAddModal() {
    editingId = null;
    document.getElementById('ingModalTitle').textContent = 'Nuevo ingrediente';
    clearForm();
    document.getElementById('ingModal').classList.add('open');
    setTimeout(() => document.getElementById('ingName').focus(), 50);
}

function closeIngModal() {
    document.getElementById('ingModal').classList.remove('open');
}

// ---- Modal Editar ----
function openEditModal(id) {
    const ing = allIngredients.find(i => i.id === id);
    if (!ing) return;
    editingId = id;
    document.getElementById('ingModalTitle').textContent = 'Editar ingrediente';
    document.getElementById('ingName').value   = ing.name     || '';
    document.getElementById('ingUnit').value   = ing.unit     || '';
    document.getElementById('ingCat').value    = ing.category || '';
    document.getElementById('ingSeason').value = ing.season   || 'todo';
    document.getElementById('ingNotes').value  = ing.notes    || '';
    document.querySelectorAll('input[name="ingAllergen"]').forEach(cb => {
        cb.checked = (ing.allergens || []).includes(cb.value);
    });
    document.getElementById('ingModal').classList.add('open');
}

function clearForm() {
    document.getElementById('ingName').value   = '';
    document.getElementById('ingUnit').value   = '';
    document.getElementById('ingCat').value    = '';
    document.getElementById('ingSeason').value = 'todo';
    document.getElementById('ingNotes').value  = '';
    document.querySelectorAll('input[name="ingAllergen"]').forEach(cb => cb.checked = false);
}

// ---- Guardar ----
async function saveIngredient() {
    const name = document.getElementById('ingName').value.trim();
    const cat  = document.getElementById('ingCat').value;
    if (!name) { showNotification('El nombre es obligatorio', 'warning'); return; }
    if (!cat)  { showNotification('Selecciona una categoría', 'warning'); return; }

    const allergens = [...document.querySelectorAll('input[name="ingAllergen"]:checked')]
        .map(cb => cb.value);

    const data = {
        name,
        category: cat,
        unit:     document.getElementById('ingUnit').value,
        season:   document.getElementById('ingSeason').value,
        allergens,
        notes:    document.getElementById('ingNotes').value.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    try {
        const coll = db.collection('users').doc(currentUser.uid).collection(ING_COLLECTION);
        if (editingId) {
            await coll.doc(editingId).update(data);
            const idx = allIngredients.findIndex(i => i.id === editingId);
            if (idx !== -1) allIngredients[idx] = { id: editingId, ...data };
            showNotification('Ingrediente actualizado', 'success');
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const ref = await coll.add(data);
            allIngredients.push({ id: ref.id, ...data });
            allIngredients.sort((a, b) => a.name.localeCompare(b.name, 'es'));
            showNotification('Ingrediente añadido', 'success');
        }
        closeIngModal();
        renderGrid();
        updateCount();
    } catch (e) {
        console.error('Error guardando ingrediente:', e);
        showNotification('Error al guardar', 'error');
    }
}

// ---- Confirmar borrado ----
function confirmDelete(id, name) {
    document.getElementById('ingConfirmMsg').textContent =
        `¿Eliminar "${name}"? Esta acción no se puede deshacer.`;
    confirmCallback = () => deleteIngredient(id);
    document.getElementById('ingConfirmModal').classList.add('open');
}

function closeConfirmModal() {
    document.getElementById('ingConfirmModal').classList.remove('open');
}

async function deleteIngredient(id) {
    try {
        await db.collection('users').doc(currentUser.uid).collection(ING_COLLECTION).doc(id).delete();
        allIngredients = allIngredients.filter(i => i.id !== id);
        renderGrid();
        updateCount();
        showNotification('Ingrediente eliminado', 'success');
    } catch (e) {
        console.error('Error eliminando:', e);
        showNotification('Error al eliminar', 'error');
    }
}

// ---- Utils ----
function normalize(str) {
    return (str || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function escapeHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
