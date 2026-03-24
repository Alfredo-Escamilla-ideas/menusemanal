// ====================================
// BUSCADOR DIRECTOALPALADAR
// ====================================
function searchInDirectoAlPaladar() {
    const name = document.getElementById('pmName')?.value?.trim();
    if (!name) { showNotification('Escribe el nombre del plato primero', 'warning'); return; }
    const query = encodeURIComponent(name.toLowerCase()).replace(/%20/g, '+');
    window.open(`https://www.directoalpaladar.com/?s=${query}`, '_blank', 'noopener');
}

const CUSTOM_FOODS_DOC_ID = 'custom-foods';

const ALL_CATEGORIES = [
    'primeros_sopa','primeros_ensalada','primeros_pasta','primeros_arroz','primeros_legumbres','primeros_verduras',
    'segundos_carne_roja','segundos_carne_pollo','segundos_carne_cerdo','segundos_pescado_porcion','segundos_pescado_entero','segundos_huevos',
    'unico_guiso_carne','unico_guiso_pescado','unico_guiso_legumbre','unico_asado_carne','unico_asado_pollo','unico_asado_pescado','unico_asado_verduras','unico_fast_food',
    'guarnicion_arroz','guarnicion_patata_frita','guarnicion_patata_cocida','guarnicion_pure_patata','guarnicion_ensalada_verde','guarnicion_ensalada_tomate','guarnicion_pasta_larga','guarnicion_pasta_corta','guarnicion_verduras','guarnicion_mariscos',
    'postres_fruta','postres_lacteo','postres_dulce'
];

const ALERGENOS_EU = [
    { id: 'gluten',       label: 'Gluten' },
    { id: 'crustaceos',   label: 'Crustáceos' },
    { id: 'huevos',       label: 'Huevos' },
    { id: 'pescado',      label: 'Pescado' },
    { id: 'cacahuetes',   label: 'Cacahuetes' },
    { id: 'soja',         label: 'Soja' },
    { id: 'lacteos',      label: 'Lácteos' },
    { id: 'frutos_secos', label: 'Frutos secos' },
    { id: 'apio',         label: 'Apio' },
    { id: 'mostaza',      label: 'Mostaza' },
    { id: 'sesamo',       label: 'Sésamo' },
    { id: 'sulfitos',     label: 'Sulfitos' },
    { id: 'moluscos',     label: 'Moluscos' },
    { id: 'altramuz',     label: 'Altramuz' },
];

// Configuración de tipos (primera ventana del asistente)
const TYPE_CONFIG = {
    primeros: {
        label: 'Primero',
        icon: '🥣',
        subcats: [
            { key: 'primeros_sopa',      label: 'Sopa / Crema' },
            { key: 'primeros_ensalada',  label: 'Ensalada' },
            { key: 'primeros_pasta',     label: 'Pasta' },
            { key: 'primeros_arroz',     label: 'Arroz' },
            { key: 'primeros_legumbres', label: 'Legumbres' },
            { key: 'primeros_verduras',  label: 'Verduras' },
        ]
    },
    segundos: {
        label: 'Segundo',
        icon: '🍗',
        subcats: [
            { key: 'segundos_carne_roja',     label: 'Carne roja' },
            { key: 'segundos_carne_pollo',    label: 'Carne pollo/pavo' },
            { key: 'segundos_carne_cerdo',    label: 'Carne de cerdo' },
            { key: 'segundos_pescado_porcion',label: 'Pescado (porción)' },
            { key: 'segundos_pescado_entero', label: 'Pescado (entero)' },
            { key: 'segundos_huevos',         label: 'Huevos' },
        ]
    },
    postres: {
        label: 'Postre',
        icon: '🍰',
        subcats: [
            { key: 'postres_fruta',   label: 'Fruta' },
            { key: 'postres_lacteo',  label: 'Lácteo' },
            { key: 'postres_dulce',   label: 'Dulce' },
        ]
    },
    unico: {
        label: 'Plato Único',
        icon: '🥘',
        subcats: [
            { key: 'unico_guiso_carne',    label: 'Guiso de carne' },
            { key: 'unico_guiso_pescado',  label: 'Guiso de pescado' },
            { key: 'unico_guiso_legumbre', label: 'Guiso de legumbre' },
            { key: 'unico_asado_carne',    label: 'Asado de carne' },
            { key: 'unico_asado_pollo',    label: 'Asado de pollo' },
            { key: 'unico_asado_pescado',  label: 'Asado de pescado' },
            { key: 'unico_asado_verduras', label: 'Asado de verduras' },
            { key: 'unico_fast_food',      label: 'Fast food' },
        ]
    },
    guarnicion: {
        label: 'Guarnición',
        icon: '🥗',
        subcats: [
            { key: 'guarnicion_arroz',           label: 'Arroz' },
            { key: 'guarnicion_patata_frita',     label: 'Patata frita' },
            { key: 'guarnicion_patata_cocida',    label: 'Patata cocida' },
            { key: 'guarnicion_pure_patata',      label: 'Puré de patata' },
            { key: 'guarnicion_ensalada_verde',   label: 'Ensalada verde' },
            { key: 'guarnicion_ensalada_tomate',  label: 'Ensalada de tomate' },
            { key: 'guarnicion_pasta_larga',      label: 'Pasta larga' },
            { key: 'guarnicion_pasta_corta',      label: 'Pasta corta' },
            { key: 'guarnicion_verduras',         label: 'Verduras' },
            { key: 'guarnicion_mariscos',         label: 'Mariscos' },
        ]
    },
};

const CATEGORY_GROUPS = [
    { group: '🥣 Primeros', cats: [
        { key: 'primeros_sopa',      label: 'Sopa / Crema' },
        { key: 'primeros_ensalada',  label: 'Ensalada' },
        { key: 'primeros_pasta',     label: 'Pasta' },
        { key: 'primeros_arroz',     label: 'Arroz' },
        { key: 'primeros_legumbres', label: 'Legumbres' },
        { key: 'primeros_verduras',  label: 'Verduras' },
    ]},
    { group: '🍗 Segundos', cats: [
        { key: 'segundos_carne_roja',      label: 'Carne roja' },
        { key: 'segundos_carne_pollo',     label: 'Carne pollo/pavo' },
        { key: 'segundos_carne_cerdo',     label: 'Carne de cerdo' },
        { key: 'segundos_pescado_porcion', label: 'Pescado (porción)' },
        { key: 'segundos_pescado_entero',  label: 'Pescado (entero)' },
        { key: 'segundos_huevos',          label: 'Huevos' },
    ]},
    { group: '🥘 Plato Único', cats: [
        { key: 'unico_guiso_carne',    label: 'Guiso de carne' },
        { key: 'unico_guiso_pescado',  label: 'Guiso de pescado' },
        { key: 'unico_guiso_legumbre', label: 'Guiso de legumbre' },
        { key: 'unico_asado_carne',    label: 'Asado de carne' },
        { key: 'unico_asado_pollo',    label: 'Asado de pollo' },
        { key: 'unico_asado_pescado',  label: 'Asado de pescado' },
        { key: 'unico_asado_verduras', label: 'Asado de verduras' },
        { key: 'unico_fast_food',      label: 'Fast food' },
    ]},
    { group: '🥗 Guarniciones', cats: [
        { key: 'guarnicion_arroz',           label: 'Arroz' },
        { key: 'guarnicion_patata_frita',     label: 'Patata frita' },
        { key: 'guarnicion_patata_cocida',    label: 'Patata cocida' },
        { key: 'guarnicion_pure_patata',      label: 'Puré de patata' },
        { key: 'guarnicion_ensalada_verde',   label: 'Ensalada verde' },
        { key: 'guarnicion_ensalada_tomate',  label: 'Ensalada de tomate' },
        { key: 'guarnicion_pasta_larga',      label: 'Pasta larga' },
        { key: 'guarnicion_pasta_corta',      label: 'Pasta corta' },
        { key: 'guarnicion_verduras',         label: 'Verduras' },
        { key: 'guarnicion_mariscos',         label: 'Mariscos' },
    ]},
    { group: '🍰 Postres', cats: [
        { key: 'postres_fruta',   label: 'Fruta' },
        { key: 'postres_lacteo',  label: 'Lácteo' },
        { key: 'postres_dulce',   label: 'Dulce' },
    ]},
];

let editingPlateContext = null;
let confirmResolver = null;
let cachedCustomFoods = null;
let selectedType = null;

// ====================================
// DATA HELPERS
// ====================================

function parsePlateMeta(description) {
    let comments = '', link = '', allergens = [];
    let unit = '', season = 'todo';
    let useComida = false, useCena = false;
    let vegetariano = false, vegano = false, sinGluten = false, sinLactosa = false;

    try {
        if (description) {
            const p = JSON.parse(description);
            comments    = p.comments  || '';
            link        = p.link      || '';
            unit        = p.unit      || '';
            season      = p.season    || 'todo';
            useComida   = !!p.useComida;
            useCena     = !!p.useCena;
            vegetariano = !!p.vegetariano;
            vegano      = !!p.vegano;
            sinGluten   = !!p.sinGluten;
            sinLactosa  = !!p.sinLactosa;
            // Map old allergen IDs to 14-UE
            const raw = Array.isArray(p.allergens) ? p.allergens : [];
            allergens = raw.map(id => {
                if (id === 'lactosa') return 'lacteos';
                if (id === 'mariscos') return 'crustaceos';
                return id;
            }).filter(id => ALERGENOS_EU.some(a => a.id === id));
        }
    } catch (e) {
        comments = description || '';
    }

    return { comments, link, allergens, unit, season, useComida, useCena, vegetariano, vegano, sinGluten, sinLactosa };
}

function buildDescription(meta) {
    return JSON.stringify({
        comments: meta.comments || '', link: meta.link || '',
        allergens: meta.allergens || [],
        unit: meta.unit || '', season: meta.season || 'todo',
        useComida: !!meta.useComida, useCena: !!meta.useCena,
        vegetariano: !!meta.vegetariano, vegano: !!meta.vegano,
        sinGluten: !!meta.sinGluten, sinLactosa: !!meta.sinLactosa,
    });
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
    return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getInvalidFoodChars(name) {
    const matches = String(name || '').match(/[^\p{L}\s-]/gu) || [];
    return [...new Set(matches)];
}

function sanitizeCustomFoodsMap(customFoods = {}) {
    const sanitizedFoods = {};
    let changed = false;

    ALL_CATEGORIES.forEach(category => {
        const sourceFoods = Array.isArray(customFoods[category]) ? customFoods[category] : [];
        const dedupe = new Map();

        sourceFoods.forEach(plate => {
            const originalName = getPlateName(plate);
            const cleanedName = normalizeFoodName(originalName);
            if (!cleanedName || !isValidFoodName(cleanedName)) { if (originalName) changed = true; return; }

            const normalizedPlate = typeof plate === 'object' && plate !== null
                ? { ...plate, name: cleanedName } : cleanedName;
            if (cleanedName !== originalName) changed = true;

            const dedupeKey = cleanedName.toLocaleLowerCase('es');
            if (!dedupe.has(dedupeKey)) {
                dedupe.set(dedupeKey, normalizedPlate);
            } else {
                changed = true;
                if (typeof dedupe.get(dedupeKey) === 'string' && typeof normalizedPlate === 'object') {
                    dedupe.set(dedupeKey, normalizedPlate);
                }
            }
        });

        sanitizedFoods[category] = Array.from(dedupe.values());
        if (sourceFoods.length !== sanitizedFoods[category].length) changed = true;
    });

    return { sanitizedFoods, changed };
}

// ====================================
// BASE DE DATOS
// ====================================

async function loadPlates() {
    let customFoods = Object.fromEntries(ALL_CATEGORIES.map(c => [c, []]));
    const ref = userFoodsRef();
    if (db && ref) {
        try {
            await bootstrapUserFoods();
            const doc = await ref.get();
            if (doc.exists && doc.data().customFoods) customFoods = doc.data().customFoods;
        } catch (error) {
            const stored = localStorage.getItem('customFoods');
            if (stored) customFoods = JSON.parse(stored);
        }
    } else {
        const stored = localStorage.getItem('customFoods');
        if (stored) customFoods = JSON.parse(stored);
    }

    const { sanitizedFoods, changed } = sanitizeCustomFoodsMap(customFoods);
    if (changed) await savePlates(sanitizedFoods);
    cachedCustomFoods = sanitizedFoods;
    renderPlates(sanitizedFoods);
    return sanitizedFoods;
}

async function savePlates(customFoods) {
    localStorage.setItem('customFoods', JSON.stringify(customFoods));
    const ref = userFoodsRef();
    if (db && ref) {
        try { await ref.set({ customFoods }); } catch (e) { console.log('⚠️ Error Firebase', e); }
    }
}

// ====================================
// LISTA DE ALIMENTOS
// ====================================

function _searchText(plate) {
    const name = getPlateName(plate);
    const description = typeof plate === 'object' ? plate.description : '';
    const meta = parsePlateMeta(description);
    const allergenText = meta.allergens.map(id => ALERGENOS_EU.find(a => a.id === id)?.label || '').join(' ');
    const dietaryText = [
        meta.vegetariano ? 'vegetariano' : '',
        meta.vegano ? 'vegano' : '',
        meta.sinGluten ? 'sin gluten' : '',
        meta.sinLactosa ? 'sin lactosa' : '',
    ].join(' ');
    return `${name} ${meta.comments} ${allergenText} ${dietaryText}`;
}

function renderPlates(customFoods) {
    cachedCustomFoods = customFoods;
    const container = document.getElementById('platesList');
    const query = normalizeSearchText(document.getElementById('platesSearchInput')?.value?.trim() || '');
    container.innerHTML = '';

    let hasPlates = false;
    let hasVisiblePlates = false;

    for (const { group, cats } of CATEGORY_GROUPS) {
        // Collect all matching plates in this group (flat list with subcategory label)
        const groupCards = [];
        for (const { key: category, label: subcatLabel } of cats) {
            const indexed = (customFoods[category] || [])
                .map((plate, originalIndex) => ({ plate, originalIndex, category, subcatLabel }))
                .sort((a, b) => getPlateName(a.plate).toLowerCase().localeCompare(getPlateName(b.plate).toLowerCase(), 'es'));

            if (indexed.length > 0) hasPlates = true;

            indexed.forEach(item => {
                if (!query || normalizeSearchText(_searchText(item.plate)).includes(query)) {
                    groupCards.push(item);
                }
            });
        }

        if (groupCards.length === 0) continue;
        hasVisiblePlates = true;

        // Section header
        const header = document.createElement('div');
        header.className = 'plates-group-title';
        header.textContent = group;
        container.appendChild(header);

        // Grid of cards
        const grid = document.createElement('div');
        grid.className = 'plates-grid';

        groupCards.forEach(({ plate, originalIndex, category, subcatLabel }) => {
            const name = getPlateName(plate);
            const meta = parsePlateMeta(typeof plate === 'object' ? plate.description : '');

            const allergenHtml = meta.allergens.length
                ? `<div class="plate-allergens">${meta.allergens.map(id => {
                    const a = ALERGENOS_EU.find(x => x.id === id);
                    return a ? `<span class="allergen-badge">${a.label}</span>` : '';
                }).join('')}</div>` : '';

            const dietary = [
                meta.vegetariano ? '🥗 Vegetariano' : null,
                meta.vegano      ? '🌱 Vegano' : null,
                meta.sinGluten   ? 'Sin gluten' : null,
                meta.sinLactosa  ? 'Sin lactosa' : null,
            ].filter(Boolean);
            const dietaryHtml = dietary.length
                ? `<div class="plate-dietary">${dietary.map(l => `<span class="dietary-badge">${l}</span>`).join('')}</div>` : '';

            const seasonLabel = { primavera:'Primavera', verano:'Verano', otono:'Otoño', invierno:'Invierno' }[meta.season] || '';
            const parts = [meta.unit, seasonLabel].filter(Boolean);
            const metaHtml = parts.length ? `<div class="plate-meta2">${parts.join(' · ')}</div>` : '';

            const card = document.createElement('div');
            card.className = 'plate-card';
            card.innerHTML = `
                <div class="plate-card-top">
                    <span class="plate-card-name">${name}</span>
                    <div class="plate-card-actions">
                        <button class="btn-edit" onclick="openEditModal('${category}', ${originalIndex})" title="Editar">✏️</button>
                        <button class="btn-delete" onclick="deletePlate('${category}', ${originalIndex})" title="Eliminar">🗑️</button>
                    </div>
                </div>
                <span class="plate-card-subcat">${subcatLabel}</span>
                ${allergenHtml}${dietaryHtml}${metaHtml}`;
            grid.appendChild(card);
        });

        container.appendChild(grid);
    }

    if (!hasPlates) { container.innerHTML = '<div class="empty-message">No hay platos creados. Pulsa "+ Nuevo plato" para empezar.</div>'; return; }
    if (!hasVisiblePlates) { container.innerHTML = '<div class="empty-message">No hay resultados para esa búsqueda.</div>'; }
}

function initPlatesSearch() {
    const input = document.getElementById('platesSearchInput');
    if (input) input.addEventListener('input', () => { if (cachedCustomFoods) renderPlates(cachedCustomFoods); });
}

// ====================================
// ASISTENTE — PRIMERA VENTANA (tipo)
// ====================================

function selectType(type) {
    selectedType = type;
    const config = TYPE_CONFIG[type];
    document.getElementById('plateModalTitle').textContent = editingPlateContext ? `Editar ${config.label}` : `Nuevo ${config.label}`;
    _buildSubcatChips(config.subcats, null);
    document.getElementById('typeSelectPanel').classList.add('hidden');
    document.getElementById('detailPanel').classList.remove('hidden');
    setTimeout(() => document.getElementById('pmName')?.focus(), 80);
}

function _buildSubcatChips(subcats, activeKey) {
    const container = document.getElementById('subcatChips');
    container.innerHTML = subcats.map(s =>
        `<button type="button" class="subcat-chip${s.key === activeKey ? ' active' : ''}" data-key="${s.key}" onclick="selectSubcat(this)">${s.label}</button>`
    ).join('');
    if (subcats.length === 1) container.querySelector('.subcat-chip')?.classList.add('active');
}

function selectSubcat(chipEl) {
    document.querySelectorAll('.subcat-chip').forEach(c => c.classList.remove('active'));
    chipEl.classList.add('active');
}

function goBackToTypeSelect() {
    document.getElementById('typeSelectPanel').classList.remove('hidden');
    document.getElementById('detailPanel').classList.add('hidden');
    selectedType = null;
}

// ====================================
// MODAL: ABRIR / CERRAR
// ====================================

function _resetForm() {
    document.getElementById('pmName').value = '';
    document.getElementById('pmUnit').value = '';
    document.getElementById('pmSeason').value = 'todo';
    document.querySelectorAll('input[name="pmAllergen"]').forEach(cb => { cb.checked = false; });
    ['pmUseComida','pmUseCena','pmVegetariano','pmVegano','pmSinGluten','pmSinLactosa']
        .forEach(id => { document.getElementById(id).checked = false; });
}

function openAddModal() {
    editingPlateContext = null;
    selectedType = null;
    _resetForm();
    document.getElementById('backBtn').style.display = '';
    document.getElementById('typeSelectPanel').classList.remove('hidden');
    document.getElementById('detailPanel').classList.add('hidden');
    document.getElementById('plateModal').classList.add('show');
}

function openEditModal(category, index) {
    const plate = cachedCustomFoods?.[category]?.[index];
    if (!plate) return;

    const typeKey = category.split('_')[0]; // primeros | segundos | postres | unico
    selectedType = typeKey;
    const config = TYPE_CONFIG[typeKey];
    if (!config) return;

    const name = getPlateName(plate);
    const description = typeof plate === 'object' ? plate.description : '';
    const meta = parsePlateMeta(description);

    editingPlateContext = { originalName: name, originalDescription: description, originalCategory: category };

    _resetForm();
    document.getElementById('plateModalTitle').textContent = `Editar ${config.label}`;
    _buildSubcatChips(config.subcats, category);

    document.getElementById('pmName').value = name;
    document.getElementById('pmUnit').value = meta.unit || '';
    document.getElementById('pmSeason').value = meta.season || 'todo';
    meta.allergens.forEach(id => {
        const cb = document.querySelector(`input[name="pmAllergen"][value="${id}"]`);
        if (cb) cb.checked = true;
    });
    document.getElementById('pmUseComida').checked  = meta.useComida;
    document.getElementById('pmUseCena').checked    = meta.useCena;
    document.getElementById('pmVegetariano').checked = meta.vegetariano;
    document.getElementById('pmVegano').checked      = meta.vegano;
    document.getElementById('pmSinGluten').checked   = meta.sinGluten;
    document.getElementById('pmSinLactosa').checked  = meta.sinLactosa;

    document.getElementById('backBtn').style.display = '';
    document.getElementById('typeSelectPanel').classList.add('hidden');
    document.getElementById('detailPanel').classList.remove('hidden');
    document.getElementById('plateModal').classList.add('show');
    setTimeout(() => document.getElementById('pmName')?.focus(), 80);
}

function closePlateModal() {
    document.getElementById('plateModal').classList.remove('show');
    editingPlateContext = null;
    selectedType = null;
}

// ====================================
// GUARDAR / ELIMINAR
// ====================================

async function savePlate() {
    const rawName = document.getElementById('pmName').value.trim();
    const name = normalizeFoodName(rawName);
    const subcatEl = document.querySelector('.subcat-chip.active');
    const category = subcatEl ? subcatEl.dataset.key : '';

    if (!rawName) { showNotification('El nombre es obligatorio', 'error'); return; }
    const inv = getInvalidFoodChars(rawName);
    if (inv.length) { showNotification(`Símbolos no permitidos: ${inv.join(' ')}`, 'error'); return; }
    if (!name || !isValidFoodName(name)) { showNotification('Nombre inválido: solo letras, espacios y guion (-)', 'error'); return; }
    if (!category) { showNotification('Selecciona el tipo específico', 'error'); return; }

    const description = buildDescription({
        allergens:   Array.from(document.querySelectorAll('input[name="pmAllergen"]:checked')).map(cb => cb.value),
        unit:        document.getElementById('pmUnit').value,
        season:      document.getElementById('pmSeason').value,
        useComida:   document.getElementById('pmUseComida').checked,
        useCena:     document.getElementById('pmUseCena').checked,
        vegetariano: document.getElementById('pmVegetariano').checked,
        vegano:      document.getElementById('pmVegano').checked,
        sinGluten:   document.getElementById('pmSinGluten').checked,
        sinLactosa:  document.getElementById('pmSinLactosa').checked,
    });

    const customFoods = await loadPlates();

    if (editingPlateContext) {
        const { originalName, originalDescription } = editingPlateContext;
        ALL_CATEGORIES.forEach(cat => {
            const list = customFoods[cat] || [];
            const idx = list.findIndex(item => getPlateName(item) === originalName && (typeof item === 'object' ? item.description : '') === originalDescription);
            if (idx !== -1) list.splice(idx, 1);
            customFoods[cat] = list;
        });
    } else {
        const exists = (customFoods[category] || []).some(item =>
            normalizeFoodName(getPlateName(item)).toLocaleLowerCase('es') === name.toLocaleLowerCase('es')
        );
        if (exists) { showNotification('Ese plato ya existe en esa categoría', 'error'); return; }
    }

    if (!customFoods[category]) customFoods[category] = [];
    customFoods[category].push({ name, description });

    await savePlates(customFoods);
    renderPlates(customFoods);
    closePlateModal();
    showNotification(editingPlateContext ? 'Plato actualizado' : `"${name}" añadido`, 'success');
}

async function deletePlate(category, index) {
    const customFoods = await loadPlates();
    const name = getPlateName(customFoods[category][index]);
    if (!await showConfirmModal(`¿Eliminar "${name}"?`, 'Eliminar plato')) return;
    customFoods[category].splice(index, 1);
    await savePlates(customFoods);
    renderPlates(customFoods);
    showNotification(`"${name}" eliminado`, 'success');
}

// ====================================
// CONFIRM MODAL
// ====================================

function showConfirmModal(message, title = 'Confirmar acción') {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').classList.add('show');
    return new Promise(resolve => { confirmResolver = resolve; });
}

function resolveConfirm(value) {
    document.getElementById('confirmModal').classList.remove('show');
    if (confirmResolver) { confirmResolver(value); confirmResolver = null; }
}

// ====================================
// EVENTS
// ====================================

window.addEventListener('click', e => {
    if (e.target === document.getElementById('plateModal')) closePlateModal();
    if (e.target === document.getElementById('confirmModal')) resolveConfirm(false);
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closePlateModal(); resolveConfirm(false); return; }
    if (e.key !== 'Enter' && e.key !== 'NumpadEnter') return;
    if (e.target.tagName === 'TEXTAREA') return;
    const modal = document.getElementById('plateModal');
    if (modal?.classList.contains('show') && document.getElementById('detailPanel')?.classList.contains('hidden') === false) {
        const active = document.activeElement;
        if (active && active.tagName === 'INPUT' && active.type !== 'checkbox') {
            e.preventDefault();
            savePlate();
        }
    }
});

// ====================================
// INICIALIZACIÓN
// ====================================

function onAuthReady(user, isEditor) { loadPlates(); }

initThemeMode();
initPlatesSearch();
