// ── Auth: gestionado por utils.js ────────────────────────────
function onAuthReady(user, isEditor) {
    applyEditorState();
    _setupFirebaseListeners();
    if (user) {
        bootstrapUserFoods().then(() => loadCustomFoodsFromDB());
    } else {
        loadCustomFoodsFromLocal();
    }
}

function applyEditorState() {
    // Login gate: visible hasta que el usuario inicia sesión
    const gate = document.getElementById('authGate');
    if (gate) gate.classList.toggle('hidden', !!currentUser);

    // Clase en body para estilizar botones bloqueados via CSS
    document.body.classList.toggle('view-only', !currentUser);

    // Slots: marcar como bloqueados para no-editores
    document.querySelectorAll('.meal-slot').forEach(slot => {
        slot.classList.toggle('auth-locked', !currentUser);
    });

    // Botón aleatorio respeta además la lógica de semana vacía
    updateRandomBtnState();
}

// Variables globales
let draggedFood = null;
let currentCalendar = 1; // Calendario actual (1-4)
let currentView = 'week'; // 'day', 'three-days', 'week' (móvil) o 'single-week', 'four-weeks' (desktop)
let currentDayIndex = new Date().getDay(); // 0=Domingo, 1=Lunes, ...
const ALL_CATEGORIES = [
    'primeros_sopa','primeros_ensalada','primeros_pasta','primeros_arroz','primeros_legumbres','primeros_verduras',
    'segundos_carne_roja','segundos_carne_pollo','segundos_carne_cerdo','segundos_pescado_porcion','segundos_pescado_entero','segundos_huevos',
    'unico_guiso_carne','unico_guiso_pescado','unico_guiso_legumbre','unico_asado_carne','unico_asado_pollo','unico_asado_pescado','unico_asado_verduras','unico_fast_food',
    'postres_fruta','postres_lacteo','postres_dulce'
];
const SUBCATEGORY_LABELS = {
    'primeros_sopa':'Sopa / Crema','primeros_ensalada':'Ensalada','primeros_pasta':'Pasta',
    'primeros_arroz':'Arroz','primeros_legumbres':'Legumbres','primeros_verduras':'Verduras',
    'segundos_carne_roja':'Carne roja','segundos_carne_pollo':'Pollo / Pavo','segundos_carne_cerdo':'Cerdo',
    'segundos_pescado_porcion':'Pescado (porción)','segundos_pescado_entero':'Pescado (entero)','segundos_huevos':'Huevos',
    'unico_guiso_carne':'Guiso de carne','unico_guiso_pescado':'Guiso de pescado','unico_guiso_legumbre':'Guiso de legumbre',
    'unico_asado_carne':'Asado de carne','unico_asado_pollo':'Asado de pollo','unico_asado_pescado':'Asado de pescado',
    'unico_asado_verduras':'Asado de verduras','unico_fast_food':'Fast food',
    'postres_fruta':'Fruta','postres_lacteo':'Lácteo','postres_dulce':'Dulce',
};
// Índice de contenedor en sidebar: Primeros=0, Segundos=1, Plato Único=2, Postres=3
const CATEGORY_MAP = {
    'primeros_sopa':0,'primeros_ensalada':0,'primeros_pasta':0,'primeros_arroz':0,'primeros_legumbres':0,'primeros_verduras':0,
    'segundos_carne_roja':1,'segundos_carne_pollo':1,'segundos_carne_cerdo':1,'segundos_pescado_porcion':1,'segundos_pescado_entero':1,'segundos_huevos':1,
    'unico_guiso_carne':2,'unico_guiso_pescado':2,'unico_guiso_legumbre':2,'unico_asado_carne':2,'unico_asado_pollo':2,'unico_asado_pescado':2,'unico_asado_verduras':2,'unico_fast_food':2,
    'postres_fruta':3,'postres_lacteo':3,'postres_dulce':3,
};
const PARENT_GROUP_SUBCATS = [
    ['primeros_sopa','primeros_ensalada','primeros_pasta','primeros_arroz','primeros_legumbres','primeros_verduras'],
    ['segundos_carne_roja','segundos_carne_pollo','segundos_carne_cerdo','segundos_pescado_porcion','segundos_pescado_entero','segundos_huevos'],
    ['unico_guiso_carne','unico_guiso_pescado','unico_guiso_legumbre','unico_asado_carne','unico_asado_pollo','unico_asado_pescado','unico_asado_verduras','unico_fast_food'],
    ['postres_fruta','postres_lacteo','postres_dulce'],
];
const MODAL_GROUPS_BY_MEAL = {
    comida1:    [{ key:'primeros', title:'🥗 Primeros',     cats:['primeros_sopa','primeros_ensalada','primeros_pasta','primeros_arroz','primeros_legumbres','primeros_verduras'] },
                 { key:'unico',    title:'🍲 Plato Único',  cats:['unico_guiso_carne','unico_guiso_pescado','unico_guiso_legumbre','unico_asado_carne','unico_asado_pollo','unico_asado_pescado','unico_asado_verduras','unico_fast_food'] }],
    comida2:    [{ key:'segundos', title:'🍗 Segundos',     cats:['segundos_carne_roja','segundos_carne_pollo','segundos_carne_cerdo','segundos_pescado_porcion','segundos_pescado_entero','segundos_huevos'] }],
    postre:     [{ key:'postres',  title:'🍮 Postres',      cats:['postres_fruta','postres_lacteo','postres_dulce'] }],
    cena1:      [{ key:'primeros', title:'🥗 Primeros',     cats:['primeros_sopa','primeros_ensalada','primeros_pasta','primeros_arroz','primeros_legumbres','primeros_verduras'] },
                 { key:'unico',    title:'🍲 Plato Único',  cats:['unico_guiso_carne','unico_guiso_pescado','unico_guiso_legumbre','unico_asado_carne','unico_asado_pollo','unico_asado_pescado','unico_asado_verduras','unico_fast_food'] }],
    cena2:      [{ key:'segundos', title:'🍗 Segundos',     cats:['segundos_carne_roja','segundos_carne_pollo','segundos_carne_cerdo','segundos_pescado_porcion','segundos_pescado_entero','segundos_huevos'] }],
    cenaPostre: [{ key:'postres',  title:'🍮 Postres',      cats:['postres_fruta','postres_lacteo','postres_dulce'] }],
};
let customFoodsGlobal = Object.fromEntries(ALL_CATEGORIES.map(c => [c, []]));
const MENU_DOC_ID = 'weekly-menu';
const CUSTOM_FOODS_DOC_ID = 'custom-foods';
let isResetting = false; // Flag para evitar conflictos durante el reset
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
// Move modal state (removed)

// ====================================
// COPY MODE (RUTA /copia)
// ====================================
const COPY_ROUTE_NAME = 'copia';
const COPY_FOLDER_NAME = 'Copia';
const COPY_ENTRY_FILE = 'menu.html';
const COPY_SESSION_KEY = 'menu-copy-allowed';
const COPY_DATA_KEY = 'menu-copy-data';
const COPY_ACCESS_KEY = 'menu-copy-allowed-at';
const COPY_ACCESS_TTL_MS = 10 * 60 * 1000;
let isCopyMode = false;

function isCopyRouteRequested() {
    const pathname = window.location.pathname.toLowerCase();
    const copyFolderPath = `/${COPY_FOLDER_NAME.toLowerCase()}/${COPY_ENTRY_FILE}`;
    const hasPath = pathname.endsWith(copyFolderPath) || pathname.endsWith(`/${COPY_ROUTE_NAME}`) || pathname.endsWith(`/${COPY_ROUTE_NAME}/`);
    const params = new URLSearchParams(window.location.search);
    const hasQuery = params.get('copia') === '1' || params.get('copia') === 'true';
    const hash = window.location.hash.replace('#', '').toLowerCase();
    const hasHash = hash === COPY_ROUTE_NAME;
    return hasPath || hasQuery || hasHash;
}

function buildCopyPath() {
    const current = window.location.pathname;
    const copyFolderPath = `/${COPY_FOLDER_NAME}/${COPY_ENTRY_FILE}`;
    if (current.endsWith(copyFolderPath) || current.endsWith(copyFolderPath + '/')) {
        return current.replace(/\/$/, '');
    }
    if (current.endsWith(`/${COPY_ROUTE_NAME}`) || current.endsWith(`/${COPY_ROUTE_NAME}/`)) {
        return current.replace(/\/$/, '');
    }
    if (current.endsWith('/menu.html')) {
        return current.replace(/\/menu\.html$/, copyFolderPath);
    }
    if (current.endsWith('/')) {
        return `${current}${COPY_FOLDER_NAME}/${COPY_ENTRY_FILE}`;
    }
    return `${current}/${COPY_FOLDER_NAME}/${COPY_ENTRY_FILE}`;
}

function buildMenuPath() {
    const current = window.location.pathname;
    const copyFolderPath = `/${COPY_FOLDER_NAME}/${COPY_ENTRY_FILE}`;
    if (current.endsWith(copyFolderPath) || current.endsWith(copyFolderPath + '/')) {
        return current.replace(new RegExp(`${copyFolderPath}/?$`), '/menu.html');
    }
    if (current.endsWith(`/${COPY_ROUTE_NAME}`) || current.endsWith(`/${COPY_ROUTE_NAME}/`)) {
        return current.replace(new RegExp(`/${COPY_ROUTE_NAME}/?$`), '/menu.html');
    }
    return current;
}

function updateCopyRouteInUrl(enable) {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.pathname = enable ? buildCopyPath() : buildMenuPath();
    window.history.replaceState({}, '', url);
}

function initCopyModeFromRoute() {
    const requested = isCopyRouteRequested();
    const allowed = hasCopyAccess();
    const canEnter = requested && allowed && !isMobileDevice;

    if (requested && !canEnter) {
        const pathname = window.location.pathname.toLowerCase();
        const copyFolderPath = `/${COPY_FOLDER_NAME.toLowerCase()}/${COPY_ENTRY_FILE}`;
        if (pathname.endsWith(copyFolderPath) || pathname.endsWith(`/${COPY_ROUTE_NAME}`) || pathname.endsWith(`/${COPY_ROUTE_NAME}/`)) {
            window.location.href = buildMenuPath();
        } else {
            updateCopyRouteInUrl(false);
        }
        clearCopyAccess();
        isCopyMode = false;
        return;
    }

    isCopyMode = canEnter;
    if (isCopyMode) {
        updateCopyRouteInUrl(true);
    }
}

function isSingleWeekView() {
    return !isMobileDevice && (currentView === 'single-week' || currentView === 'week');
}

function getCopyPayload() {
    const raw = sessionStorage.getItem(COPY_DATA_KEY) || localStorage.getItem(COPY_DATA_KEY);
    if (!raw) {
        return { data: {}, calendar: currentCalendar, createdAt: Date.now() };
    }
    try {
        return JSON.parse(raw);
    } catch (error) {
        return { data: {}, calendar: currentCalendar, createdAt: Date.now() };
    }
}

function setCopyPayload(payload) {
    sessionStorage.setItem(COPY_DATA_KEY, JSON.stringify(payload));
    localStorage.setItem(COPY_DATA_KEY, JSON.stringify(payload));
}

function setCopyAccessAllowed() {
    sessionStorage.setItem(COPY_SESSION_KEY, '1');
    localStorage.setItem(COPY_ACCESS_KEY, String(Date.now()));
}

function hasCopyAccess() {
    if (sessionStorage.getItem(COPY_SESSION_KEY) === '1') {
        return true;
    }
    const raw = localStorage.getItem(COPY_ACCESS_KEY);
    const timestamp = raw ? Number(raw) : 0;
    if (!timestamp || Number.isNaN(timestamp)) {
        return false;
    }
    if (Date.now() - timestamp > COPY_ACCESS_TTL_MS) {
        localStorage.removeItem(COPY_ACCESS_KEY);
        return false;
    }
    return true;
}

function clearCopyAccess() {
    sessionStorage.removeItem(COPY_SESSION_KEY);
    sessionStorage.removeItem(COPY_DATA_KEY);
    localStorage.removeItem(COPY_ACCESS_KEY);
    localStorage.removeItem(COPY_DATA_KEY);
}

function getFoodsArrayFromSlot(slot) {
    const raw = slot?.dataset?.foods;
    const hasContent = !!slot?.querySelector?.('.meal-content');
    if (raw) {
        if (!hasContent) {
            return [];
        }
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch (error) {
            // Fallback to DOM extraction below
        }
    }
    return getSlotFoods(slot);
}

function updateCopyButtonsVisibility() {
    const createBtn = document.getElementById('createCopyBtn');
    const applyBtn = document.getElementById('applyCopyBtn');
    if (!createBtn || !applyBtn) {
        return;
    }

    const shouldShow = isSingleWeekView();
    if (!shouldShow) {
        createBtn.style.display = 'none';
        applyBtn.style.display = 'none';
        return;
    }

    if (isCopyMode) {
        createBtn.style.display = 'none';
        applyBtn.style.display = 'inline-flex';
    } else {
        createBtn.style.display = 'inline-flex';
        applyBtn.style.display = 'none';
    }
}

function captureCopySnapshot() {
    const slots = document.querySelectorAll('#weekTable .meal-slot');
    const data = {};

    console.log('🧩 Copy snapshot: capturing current calendar data...');
    slots.forEach(slot => {
        const day = slot.dataset.day;
        const meal = slot.dataset.meal;
        if (!day || !meal) {
            return;
        }
        const key = `cal${currentCalendar}-${day}-${meal}`;
        data[key] = getFoodsArrayFromSlot(slot);
    });

    setCopyPayload({
        data,
        calendar: currentCalendar,
        createdAt: Date.now()
    });
    console.log(`🧩 Copy snapshot saved for calendar ${currentCalendar} (${Object.keys(data).length} slots)`);
}

function loadFromCopyStore() {
    const payload = getCopyPayload();
    const data = payload?.data || {};
    const slots = document.querySelectorAll('.meal-slot');

    slots.forEach(slot => {
        const candidates = getMenuKeyCandidatesFromSlot(slot);
        const foundKey = candidates.find(candidateKey => Object.prototype.hasOwnProperty.call(data, candidateKey));
        if (foundKey) {
            updateSlotWithArray(slot, data[foundKey]);
        } else {
            slot.innerHTML = '';
            if (slot.dataset) {
                slot.dataset.foods = '[]';
            }
        }
    });

    console.log('🧩 Copy mode loaded from snapshot');
}

function saveCopyMenuData(calendar, day, meal, foodsArray) {
    const payload = getCopyPayload();
    const key = `cal${calendar}-${day}-${meal}`;
    const updated = {
        ...payload,
        data: {
            ...(payload.data || {}),
            [key]: foodsArray
        }
    };
    setCopyPayload(updated);
    console.log(`🧩 Copy slot updated: ${key} (${Array.isArray(foodsArray) ? foodsArray.length : 0} items)`);
}

function getCopyFoodsArrayForSlot(slot, mealOverride = null) {
    const payload = getCopyPayload();
    const data = payload?.data || {};
    const candidates = getMenuKeyCandidatesFromSlot(slot, mealOverride);
    const foundKey = candidates.find(candidateKey => Object.prototype.hasOwnProperty.call(data, candidateKey));
    if (!foundKey) {
        return [];
    }
    const stored = data[foundKey];
    return Array.isArray(stored) ? stored : [];
}

function parseMenuKey(key) {
    const match = /^cal(\d+)-([a-zñ]+)-([a-z0-9]+)$/i.exec(key);
    if (!match) {
        return null;
    }
    return {
        calendar: Number(match[1]),
        day: match[2],
        meal: match[3]
    };
}

async function createCopyCalendar() {
    if (!currentUser) { showNotification('Sin permiso de edición', 'error'); return; }
    if (isMobileDevice || !isSingleWeekView()) {
        return;
    }

    captureCopySnapshot();
    setCopyAccessAllowed();
    showNotification('✅ Copia creada. Ya puedes revisar y aplicar.', 'success');
}

async function applyCopyToOfficial() {
    if (!currentUser) { showNotification('Sin permiso de edición', 'error'); return; }
    if (!isCopyMode || isMobileDevice || !isSingleWeekView()) {
        return;
    }

    const payload = getCopyPayload();
    const data = payload?.data || {};
    const keys = Object.keys(data);
    console.log(`🧩 Applying copy snapshot to official (${keys.length} slots)`);

    for (const key of keys) {
        const parsed = parseMenuKey(key);
        if (!parsed) {
            continue;
        }
        const foodsArray = Array.isArray(data[key]) ? data[key] : [];
        await saveMenu(parsed.day, parsed.meal, foodsArray, parsed.calendar, null, { forceOfficial: true, silent: true });
    }

    console.log('✅ Copy snapshot applied to official calendar');
    showNotification('✅ Copia aplicada al calendario oficial', 'success');
}

// ====================================
// SYNC STATUS & TIMESTAMP TRACKING
// ====================================
let syncStatus = 'unknown'; // 'firebase', 'cache', 'offline', 'syncing'
let lastSyncTimestamp = 0;
const LOCK_EXPIRY_MS = 30000; // 30 seconds
const APP_STATE_DOC_ID = 'app-state';
const LOCKS_DOC_ID = 'locks';
const BACKUPS_COLLECTION = 'menu-backups';
const ROTATION_HISTORY_COLLECTION = 'rotation-history';
const MAX_BACKUP_COUNT = 7;
let connectionRetryCount = 0;
let maxConnectionRetries = 5;


function getPlateName(item) {
    return typeof item === 'string' ? item : (item?.name || '');
}

function normalizeFoodName(name) {
    let normalized = String(name || '')
        .normalize('NFC')
        .replace(/[^\p{L}\s-]/gu, '')
        .replace(/\s*-\s*/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/\s{2,}/g, ' ')
        .replace(/^-+|-+$/g, '')
        .trim();

    return normalized;
}

function isValidFoodName(name) {
    return /^[\p{L}]+(?:[ -][\p{L}]+)*$/u.test(name);
}

function getInvalidFoodChars(name) {
    const matches = String(name || '').match(/[^\p{L}\s-]/gu) || [];
    return [...new Set(matches)];
}

function sanitizeCustomFoodsMap(customFoods = {}) {
    const categories = ALL_CATEGORIES;
    const sanitizedFoods = {};
    let changed = false;

    categories.forEach(category => {
        const sourceFoods = Array.isArray(customFoods[category]) ? customFoods[category] : [];
        const dedupe = new Map();

        sourceFoods.forEach(food => {
            const originalName = getPlateName(food);
            const cleanedName = normalizeFoodName(originalName);

            if (!cleanedName || !isValidFoodName(cleanedName)) {
                if (originalName) {
                    changed = true;
                }
                return;
            }

            const normalizedItem = typeof food === 'object' && food !== null
                ? { ...food, name: cleanedName }
                : cleanedName;

            if (cleanedName !== originalName) {
                changed = true;
            }

            const dedupeKey = cleanedName.toLocaleLowerCase('es');
            if (!dedupe.has(dedupeKey)) {
                dedupe.set(dedupeKey, normalizedItem);
            } else {
                changed = true;
                const existing = dedupe.get(dedupeKey);
                if (typeof existing === 'string' && typeof normalizedItem === 'object') {
                    dedupe.set(dedupeKey, normalizedItem);
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


let customConfirmResolver = null;

function showCustomConfirm(message, title = 'Confirmar acción') {
    const modal = document.getElementById('customConfirmModal');
    document.getElementById('customConfirmTitle').textContent = title;
    document.getElementById('customConfirmMessage').textContent = message;
    modal.style.display = 'block';

    return new Promise(resolve => {
        customConfirmResolver = resolve;
    });
}

function resolveCustomConfirm(confirmed) {
    const modal = document.getElementById('customConfirmModal');
    modal.style.display = 'none';

    if (customConfirmResolver) {
        customConfirmResolver(confirmed);
        customConfirmResolver = null;
    }
}

// ====================================
// SISTEMA DE FECHAS
// ====================================

// Retry helper for Firebase operations
async function retryOperation(operation, maxRetries = 3, delayMs = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, error.message);
            
            if (attempt === maxRetries) {
                throw error; // Final attempt failed
            }
            
            // Exponential backoff
            const delay = delayMs * Math.pow(2, attempt - 1);
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Timeout wrapper for Firebase operations
async function withTimeout(promise, timeoutMs = 10000, fallbackValue = null) {
    let timeoutHandle;
    
    const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });
    
    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutHandle);
        return result;
    } catch (error) {
        clearTimeout(timeoutHandle);
        if (error.message.includes('timed out')) {
            console.warn(`⏱️ Firebase operation timed out after ${timeoutMs}ms, using fallback`);
            return fallbackValue;
        }
        throw error;
    }
}

// Fecha actual de la app
function getAppNow() {
    return new Date();
}

// ====================================
// SYNC STATUS & DISTRIBUTED LOCKS
// ====================================

let syncingStartTime = 0;
let forceReloadCheckInterval = null;

// Update sync status indicator in UI
function updateSyncStatusUI() {
    const statusIcons = {
        'firebase': '🟢',
        'cache': '🟡',
        'offline': '🔴',
        'syncing': '🔄'
    };
    
    const statusMessages = {
        'firebase': 'Sincronizado',
        'cache': 'Caché local',
        'offline': 'Sin conexión',
        'syncing': 'Sincronizando...'
    };

    const icon = statusIcons[syncStatus] || '⚪';
    const message = statusMessages[syncStatus] || '';

    // Update UI element if it exists
    const statusElement = document.getElementById('sync-status');
    if (statusElement) {
        statusElement.className = `sync-status status-${syncStatus}`;
        statusElement.textContent = '';
        const lastSync = lastSyncTimestamp ? new Date(lastSyncTimestamp).toLocaleTimeString('es-ES') : '';
        statusElement.title = lastSync ? `${message} · ${lastSync}` : message;
        
        // Si está syncing, iniciar temporizador
        if (syncStatus === 'syncing') {
            if (syncingStartTime === 0) {
                syncingStartTime = Date.now();
            }
            
            // Verificar cada segundo si lleva más de 10 segundos
            if (!forceReloadCheckInterval) {
                forceReloadCheckInterval = setInterval(() => {
                    const elapsed = Date.now() - syncingStartTime;
                    if (elapsed > 10000 && syncStatus === 'syncing') {
                        // Mostrar botón de forzar recarga
                        showForceReloadButton();
                    }
                }, 1000);
            }
        } else {
            // Resetear temporizador
            syncingStartTime = 0;
            if (forceReloadCheckInterval) {
                clearInterval(forceReloadCheckInterval);
                forceReloadCheckInterval = null;
            }
            hideForceReloadButton();
        }
    }
    
    console.log(`${icon} Sync status: ${message}`);
}

function showForceReloadButton() {
    let btn = document.getElementById('force-reload-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'force-reload-btn';
        btn.className = 'force-reload-btn';
        btn.innerHTML = '🔄 Reintentar Conexión';
        btn.onclick = forceReloadFromCache;
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.95em;
            font-family: inherit;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: pulse 2s infinite;
            transition: all 0.3s ease;
        `;
        document.body.appendChild(btn);
        console.log('⚠️ Retry connection button shown (syncing > 10s)');
    }
}

function hideForceReloadButton() {
    const btn = document.getElementById('force-reload-btn');
    if (btn) {
        btn.remove();
    }
}

async function forceReloadFromCache() {
    console.log('🔄 Manual retry requested by user...');
    hideForceReloadButton();
    
    // Reset retry counter to start fresh
    connectionRetryCount = 0;
    syncingStartTime = 0;
    
    syncStatus = 'syncing';
    updateSyncStatusUI();
    
    showNotification('🔄 Reintentando conexión a Firebase...', 'info');
    
    // Retry loading from Firebase
    await loadMenu();
}

// Check and acquire distributed lock for calendar rotation
async function acquireRotationLock() {
    if (!isFirebaseConfigured) {
        return true; // No lock needed for localStorage-only mode
    }
    
    try {
        const lockDoc = await db.collection(LOCKS_DOC_ID).doc('calendar-rotation-lock').get();
        
        if (lockDoc.exists) {
            const lockData = lockDoc.data();
            const lockAge = Date.now() - lockData.timestamp;
            
            // If lock exists and is not expired, rotation is already in progress
            if (lockAge < LOCK_EXPIRY_MS) {
                console.log(`🔒 Rotation lock held by another user (age: ${Math.round(lockAge/1000)}s)`);
                return false;
            }
            
            // Lock expired, we can take it
            console.log(`🔓 Expired lock found, acquiring new lock`);
        }
        
        // Acquire the lock
        await db.collection(LOCKS_DOC_ID).doc('calendar-rotation-lock').set({
            timestamp: Date.now(),
            lockedBy: navigator.userAgent.substring(0, 50)
        });
        
        console.log('🔒 Rotation lock acquired');
        return true;
        
    } catch (error) {
        console.error('❌ Error acquiring lock:', error);
        return false;
    }
}

// Release distributed lock
async function releaseRotationLock() {
    if (!isFirebaseConfigured) {
        return;
    }
    
    try {
        await db.collection(LOCKS_DOC_ID).doc('calendar-rotation-lock').delete();
        console.log('🔓 Rotation lock released');
    } catch (error) {
        console.error('❌ Error releasing lock:', error);
    }
}

// Get lastAccessDate from Firebase instead of localStorage
async function getLastAccessDate() {
    if (!isFirebaseConfigured) {
        return localStorage.getItem('lastAccessDate');
    }
    
    try {
        const doc = await db.collection(APP_STATE_DOC_ID).doc('last-access-date').get();
        if (doc.exists) {
            return doc.data().date;
        }
        return null;
    } catch (error) {
        console.error('❌ Error reading lastAccessDate from Firebase:', error);
        return localStorage.getItem('lastAccessDate'); // Fallback
    }
}

// Set lastAccessDate to Firebase instead of localStorage
async function setLastAccessDate(dateStr) {
    if (!isFirebaseConfigured) {
        localStorage.setItem('lastAccessDate', dateStr);
        return;
    }
    
    try {
        await db.collection(APP_STATE_DOC_ID).doc('last-access-date').set({
            date: dateStr,
            timestamp: Date.now()
        });
        console.log(`📅 lastAccessDate updated in Firebase: ${dateStr}`);
    } catch (error) {
        console.error('❌ Error writing lastAccessDate to Firebase:', error);
        localStorage.setItem('lastAccessDate', dateStr); // Fallback
    }
}

// Create backup before rotation
async function createRotationBackup(allData) {
    if (!isFirebaseConfigured) {
        return;
    }
    
    try {
        const backup = {
            data: allData,
            timestamp: Date.now(),
            date: new Date().toISOString()
        };
        
        await db.collection(BACKUPS_COLLECTION).add(backup);
        console.log('💾 Rotation backup created');
        
        // Clean old backups (keep only last 7)
        const backups = await db.collection(BACKUPS_COLLECTION)
            .orderBy('timestamp', 'desc')
            .get();
        
        if (backups.size > MAX_BACKUP_COUNT) {
            const toDelete = [];
            backups.forEach((doc, index) => {
                if (index >= MAX_BACKUP_COUNT) {
                    toDelete.push(doc.ref.delete());
                }
            });
            await Promise.all(toDelete);
            console.log(`🗑️ Cleaned ${toDelete.length} old backups`);
        }
    } catch (error) {
        console.error('❌ Error creating backup:', error);
    }
}

// Log rotation to history
async function logRotation(success, error = null) {
    if (!isFirebaseConfigured) {
        return;
    }
    
    try {
        await db.collection(ROTATION_HISTORY_COLLECTION).add({
            timestamp: Date.now(),
            date: new Date().toISOString(),
            success: success,
            error: error ? error.message : null,
            userAgent: navigator.userAgent.substring(0, 100)
        });
    } catch (err) {
        console.error('❌ Error logging rotation:', err);
    }
}

// Obtener el lunes de una semana específica
function getMondayOfWeek(weekOffset = 0) {
    const now = getCurrentTestDate();
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
    const today = getCurrentTestDate();

    let dayOffset = 0;
    let numDays = 7; // Por defecto, vista semana completa
    
    if (currentView === 'day') {
        // Para vista de 1 día: Cal 1 = HOY, Cal 2 = MAÑANA, Cal 3 = PASADO, Cal 4 = +3
        dayOffset = (currentCalendar - 1);
        numDays = 1; // Solo mostrar 1 día
    } else if (currentView === 'three-days') {
        // Para vista de 3 días: Cal 1 = días 0-2, Cal 2 = días 3-5, etc.
        dayOffset = (currentCalendar - 1) * 3;
        numDays = 3; // Solo mostrar 3 días
    }

    const dates = [];
    for (let i = 0; i < numDays; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + dayOffset + i);
        dates.push(date);
    }
    return dates;
}

// Convertir día de la semana JS (0=Domingo) a calendario europeo (0=Lunes)
function getEuropeanDayIndex(date) {
    const jsDayOfWeek = date.getDay(); // 0=Domingo, 1=Lunes, 2=Martes, ..., 6=Sábado
    return jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1; // 0=Lunes, 1=Martes, ..., 6=Domingo
}

// Formatear fecha para encabezado
function formatDateHeader(date) {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const day = days[date.getDay()];
    const dateNum = date.getDate();
    const month = date.getMonth() + 1;
    return `${day} ${dateNum}/${month}`;
}

function formatISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Obtener la fecha actual normalizada
function getCurrentTestDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

function parseISODateLocal(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;

    const [year, month, day] = parts;
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
}

function updateSlotsAvailability(dates) {
    const today = getCurrentTestDate();

    const rows = document.querySelectorAll('#weekTable tbody tr');
    rows.forEach(row => {
        const slots = row.querySelectorAll('.meal-slot');
        slots.forEach((slot, index) => {
            if (index >= dates.length) return;

            const slotDate = new Date(dates[index]);
            slotDate.setHours(0, 0, 0, 0);
            slot.dataset.date = formatISODate(slotDate);

            const isPast = slotDate < today;
            slot.classList.toggle('slot-disabled', isPast);
        });
    });
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
    const testToday = getCurrentTestDate();

    if (currentView === 'day') {
        const date = dates[0];
        const targetHeaderIndex = getEuropeanDayIndex(date) + 1; // +1 por columna vacía

        for (let i = 1; i < headers.length; i++) {
            if (i === targetHeaderIndex) {
                headers[i].style.display = '';
                headers[i].textContent = formatDateHeader(date);
                headers[i].dataset.date = formatISODate(date);

                const headerDate = new Date(date);
                headerDate.setHours(0, 0, 0, 0);

                headers[i].style.background = '';
                headers[i].style.color = '';

                const isPast = headerDate < testToday;
                const isCurrent = headerDate.getTime() === testToday.getTime();

                headers[i].classList.toggle('day-disabled', isPast);
                headers[i].classList.toggle('current-day', isCurrent);
            } else {
                headers[i].style.display = 'none';
            }
        }
    } else {

        // Actualizar cada día (empezando desde el índice 1, ya que el 0 es la columna vacía)
        for (let i = 1; i < headers.length; i++) {
            const dateIndex = i - 1;
            
            if (dateIndex < dates.length) {
                // Mostrar y actualizar header
                headers[i].style.display = '';
                headers[i].textContent = formatDateHeader(dates[dateIndex]);
                headers[i].dataset.date = formatISODate(dates[dateIndex]);

                const headerDate = new Date(dates[dateIndex]);
                headerDate.setHours(0, 0, 0, 0);

                // Limpiar estilos inline antiguos y aplicar clases de estado
                headers[i].style.background = '';
                headers[i].style.color = '';

                const isPast = headerDate < testToday;
                const isCurrent = headerDate.getTime() === testToday.getTime();

                headers[i].classList.toggle('day-disabled', isPast);
                headers[i].classList.toggle('current-day', isCurrent);
            } else {
                // Ocultar headers extra en móvil
                headers[i].style.display = 'none';
            }
        }
    }

    // Sincronizar los data-day de los slots con las fechas visibles
    // para que en móvil (Hoy / 3 Días) se carguen los platos correctos.
    const dayKeys = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const rows = document.querySelectorAll('#weekTable tbody tr');
    
    // En vista "day": mostrar solo 1 día pero en su columna correcta según día de la semana
    // En vista "three-days": usar slots secuenciales (0, 1, 2)
    // En vista "week": mapear por día de la semana
    
    if (currentView === 'day') {
        // Vista 1 día: mapear por día de la semana pero mostrar solo el día actual
        const date = dates[0]; // Solo hay 1 fecha
        const targetSlotIndex = getEuropeanDayIndex(date); // 0=Lunes, 6=Domingo
        
        rows.forEach(row => {
            const slots = row.querySelectorAll('.meal-slot');
            
            slots.forEach((slot, slotIndex) => {
                if (slotIndex === targetSlotIndex) {
                    // Este es el slot correcto para mostrar
                    slot.dataset.day = dayKeys[targetSlotIndex];
                    slot.dataset.date = formatISODate(date);
                    slot.parentElement.style.display = '';
                } else {
                    // Ocultar los demás slots
                    slot.parentElement.style.display = 'none';
                }
            });
        });
    } else if (currentView === 'three-days') {
        // Vista 3 días: mapear secuencialmente (col 1-3) empezando desde HOY
        rows.forEach(row => {
            const slots = row.querySelectorAll('.meal-slot');
            
            slots.forEach((slot, slotIndex) => {
                if (slotIndex < dates.length) {
                    const date = dates[slotIndex];
                    const europeanDayIndex = getEuropeanDayIndex(date);
                    slot.dataset.day = dayKeys[europeanDayIndex];
                    slot.dataset.date = formatISODate(date);
                    slot.parentElement.style.display = '';
                } else {
                    slot.parentElement.style.display = 'none';
                }
            });
        });
    } else {
        // Vista semanal: mapear por día de la semana real
        const dateDayOfWeekMap = dates.map(date => getEuropeanDayIndex(date));
        
        rows.forEach(row => {
            const slots = row.querySelectorAll('.meal-slot');
            
            slots.forEach((slot, slotIndex) => {
                // slotIndex represents day of week: 0=Lunes, 1=Martes, ..., 6=Domingo
                const dateIndex = dateDayOfWeekMap.indexOf(slotIndex);
                
                if (dateIndex !== -1) {
                    // This slot matches one of our visible dates
                    const date = dates[dateIndex];
                    const europeanDayIndex = getEuropeanDayIndex(date);
                    slot.dataset.day = dayKeys[europeanDayIndex];
                    slot.dataset.date = formatISODate(date);
                    slot.parentElement.style.display = '';
                } else {
                    // Hide slots that don't match any visible date
                    slot.parentElement.style.display = 'none';
                }
            });
        });
    }

    updateSlotsAvailability(dates);
}

// Verificar si el calendario actual está obsoleto y auto-desplazar
async function checkAndAutoShift() {
    if (isCopyMode) {
        return;
    }
    const lastDateStr = await getLastAccessDate();
    const today = getCurrentTestDate();
    const todayStr = formatISODate(today);

    // Si es el primer acceso o no ha cambiado la fecha, no hacer nada
    if (!lastDateStr || lastDateStr === todayStr) {
        await setLastAccessDate(todayStr);
        return;
    }

    // Obtener las fechas de ayer y hoy
    const lastDate = parseISODateLocal(lastDateStr);
    if (!lastDate) {
        await setLastAccessDate(todayStr);
        return;
    }

    // Verificar si hubo transición domingo → lunes
    const lastDayOfWeek = lastDate.getDay(); // 0=domingo, 1=lunes, ...
    const todayDayOfWeek = today.getDay();

    const crossedToMonday = (lastDayOfWeek === 0 && todayDayOfWeek === 1) || // Domingo → Lunes directo
                           (lastDayOfWeek === 0 && todayDayOfWeek !== 0) || // Domingo → cualquier día después
                           (lastDate < today && todayDayOfWeek === 1 && lastDayOfWeek !== 1); // Cruzamos al lunes

    if (crossedToMonday) {
        console.log('🔄 Detectada transición domingo → lunes. Rotando calendarios...');
        await addNewCalendar(true); // true = auto-shift silencioso
    }

    // Actualizar la última fecha de acceso
    await setLastAccessDate(todayStr);
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

    // Agregar/quitar clase al body para estilos específicos de vista diaria
    if (view === 'daily' || (isMobileDevice && view === 'day')) {
        document.body.classList.add('daily-view');
    } else {
        document.body.classList.remove('daily-view');
    }

    if (isMobileDevice) {
        applyMobileView(view);
        updateCalendarNavigation(); // Actualizar el label con el rango correcto
    } else {
        applyDesktopView(view);
    }

    // Recargar menú para actualizar visualización de descripciones
    loadMenu();
    updateCopyButtonsVisibility();
}

function applyMobileView(view) {
    const table = document.getElementById('weekTable');
    const cols = table.querySelectorAll('th, td');

    // Primero actualizar las fechas según el calendario actual
    updateTableHeaders();

    // Resetear todas las columnas
    cols.forEach(col => col.classList.remove('hide-column'));

    if (view === 'day') {
        // Mostrar solo la columna correspondiente al día actual
        const dates = getMobileDates();
        const targetDate = dates[0];
        const targetColumn = getEuropeanDayIndex(targetDate) + 1; // +1 por header vacío
        cols.forEach((col, index) => {
            const colIndex = index % 8; // 8 columnas por fila (1 header + 7 días)
            if (colIndex !== 0 && colIndex !== targetColumn) {
                col.classList.add('hide-column');
            }
        });
    } else if (view === 'three-days') {
        // Mostrar solo las primeras 3 columnas (HOY, +1, +2)
        const visibleColumns = [1, 2, 3];
        cols.forEach((col, index) => {
            const colIndex = index % 8;
            if (colIndex !== 0 && !visibleColumns.includes(colIndex)) {
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
        updateTableForDailyView();
        // Vista diaria: mostrar solo el día correspondiente al calendario actual
        // Calendario 1 = hoy, 2 = mañana, 3 = pasado mañana, 4 = 3 días después
        const dayIndex = getDailyColumnIndex();
        cols.forEach((col, index) => {
            const colIndex = index % 8; // 8 columnas por fila
            if (colIndex !== 0 && colIndex !== dayIndex) {
                col.classList.add('hide-column');
            }
        });
    }
    // 'single-week' muestra toda la semana (sin ocultar columnas)
}

function getDailyColumnIndex() {
    // Calcular qué columna mostrar según el calendario actual
    // Calendario 1 = hoy, 2 = mañana, 3 = pasado mañana, 4 = 3 días después
    const today = getCurrentTestDate();
    
    // Calcular la fecha objetivo según el calendario
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + (currentCalendar - 1));
    
    // Obtener las fechas de la tabla actual
    const headers = document.querySelectorAll('#weekTable thead th');
    
    // Recorrer los headers (empezando desde el índice 1, porque 0 es el header vacío)
    for (let i = 1; i < headers.length; i++) {
        const headerText = headers[i].textContent;
        // Extraer día y mes del header (formato: "Lunes\n10/2")
        const match = headerText.match(/(\d+)\/(\d+)/);
        if (match) {
            const day = parseInt(match[1]);
            const month = parseInt(match[2]) - 1; // mes en JS es 0-indexed
            const year = targetDate.getFullYear();
            
            const headerDate = new Date(year, month, day);
            headerDate.setHours(0, 0, 0, 0);
            
            if (headerDate.getTime() === targetDate.getTime()) {
                return i; // Retornar el índice de la columna
            }
        }
    }
    
    // Si no se encuentra, actualizar la tabla
    updateTableForDailyView();
    return 1;
}

function updateTableForDailyView() {
    // Actualizar los headers de la tabla para mostrar la semana que contiene el día objetivo
    const today = getCurrentTestDate();
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + (currentCalendar - 1));
    
    // Encontrar el lunes de la semana que contiene targetDate
    const targetMonday = new Date(targetDate);
    const dayOfWeek = targetDate.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Lunes = 0
    targetMonday.setDate(targetDate.getDate() - diff);
    
    // Generar las fechas de esa semana
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(targetMonday);
        date.setDate(targetMonday.getDate() + i);
        dates.push(date);
    }
    
    // Actualizar los headers
    updateTableHeadersWithDates(dates);
}

function updateTableHeadersWithDates(dates) {
    const headers = document.querySelectorAll('#weekTable thead th');
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const dayKeys = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const testToday = getCurrentTestDate();
    
    for (let i = 0; i < 7 && i + 1 < headers.length; i++) {
        const date = dates[i];
        headers[i + 1].innerHTML = `${dayNames[i]}<br>${date.getDate()}/${date.getMonth() + 1}`;
        headers[i + 1].dataset.date = formatISODate(date);

        const headerDate = new Date(date);
        headerDate.setHours(0, 0, 0, 0);
        headers[i + 1].style.background = '';
        headers[i + 1].style.color = '';

        const isPast = headerDate < testToday;
        const isCurrent = headerDate.getTime() === testToday.getTime();

        headers[i + 1].classList.toggle('day-disabled', isPast);
        headers[i + 1].classList.toggle('current-day', isCurrent);
    }
    
    // También actualizar los data-day de los slots para que coincidan con las fechas
    const rows = document.querySelectorAll('#weekTable tbody tr');
    rows.forEach(row => {
        const slots = row.querySelectorAll('.meal-slot');
        slots.forEach((slot, index) => {
            if (index < dates.length) {
                const date = dates[index];
                const europeanDayIndex = getEuropeanDayIndex(date);
                slot.dataset.day = dayKeys[europeanDayIndex];
            }
        });
    });

    updateSlotsAvailability(dates);
}

function getTodayColumnIndex() {
    const weekOffset = currentCalendar - 1;
    const dates = getWeekDates(weekOffset);
    const today = getCurrentTestDate();

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
                    <tr>
                        <td class="day-header">🌙🍮 Postre</td>
                        ${dates.map((d, idx) => `<td><div class="meal-slot" data-calendar="${i}" data-day="${['lunes','martes','miercoles','jueves','viernes','sabado','domingo'][idx]}" data-meal="cenaPostre"></div></td>`).join('')}
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
    const menuRef = userMenuRef();
    if (isFirebaseConfigured && menuRef) {
        try {
            const doc = await menuRef.get();
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
            if (slot.classList.contains('slot-disabled')) {
                return;
            }

            e.preventDefault();
            slot.classList.add('drag-over');
        });

        slot.addEventListener('dragleave', () => {
            slot.classList.remove('drag-over');
        });

        slot.addEventListener('drop', async (e) => {
            if (slot.classList.contains('slot-disabled')) {
                return;
            }

            e.preventDefault();
            slot.classList.remove('drag-over');

            if (draggedFood) {
                // Leer datos actuales del slot
                const cal = slot.dataset.calendar;
                const key = `cal${cal}-${slot.dataset.day}-${slot.dataset.meal}`;
                let foodsArray = [];

                // Cargar array actual
                const _dragMenuRef = userMenuRef();
                if (isFirebaseConfigured && _dragMenuRef) {
                    try {
                        const doc = await _dragMenuRef.get();
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
                const incomingKey = foodNameKey(fullPlate.name);
                const exists = (Array.isArray(foodsArray) ? foodsArray : [])
                    .some(f => foodNameKey(typeof f === 'string' ? f : f.name) === incomingKey);

                if (exists) {
                    showNotification('Ya existe este plato en ese día', 'info');
                } else {
                    foodsArray.push(fullPlate);

                    // Actualizar UI
                    updateSlotWithArray(slot, foodsArray);

                    // Guardar usando saveMenu para mantener formato y timestamps
                    await saveMenu(slot.dataset.day, slot.dataset.meal, foodsArray, Number(cal), null);
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

function resolveSaveTarget(day, calendarOverride = null, dateOverride = null) {
    let calToUse = calendarOverride !== null ? calendarOverride : currentCalendar;
    let dayToUse = day;

    if (dateOverride instanceof Date && !Number.isNaN(dateOverride.getTime())) {
        const { calendar, dayKey } = getCalendarAndDayFromDate(dateOverride);
        calToUse = calendar;
        dayToUse = dayKey;
    } else if (!isMobileDevice && currentView === 'daily' && calendarOverride === null) {
        const today = getCurrentTestDate();

        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + (currentCalendar - 1));

        const { calendar, dayKey } = getCalendarAndDayFromDate(targetDate);
        calToUse = calendar;
        dayToUse = dayKey;
    }

    return { calToUse, dayToUse };
}

// Guardar menú en Firebase o localStorage
async function saveMenu(day, meal, foodsArray, calendarOverride = null, dateOverride = null, options = {}) {
    const { calToUse, dayToUse } = resolveSaveTarget(day, calendarOverride, dateOverride);
    const silent = options?.silent === true;

    // Normalizar y eliminar duplicados por nombre dentro del mismo día
    if (!Array.isArray(foodsArray)) {
        foodsArray = [foodsArray];
    }
    const seen = new Map();
    const deduped = [];
    foodsArray.forEach(item => {
        const name = typeof item === 'string' ? item : (item?.name || '');
        const key = foodNameKey(name);
        if (!seen.has(key)) {
            seen.set(key, true);
            deduped.push(item);
        }
    });
    if (deduped.length !== foodsArray.length) {
        foodsArray = deduped;
        if (!silent) showNotification('Se eliminaron duplicados en el mismo día', 'info');
    }

    if (isCopyMode && !options?.forceOfficial) {
        saveCopyMenuData(calToUse, dayToUse, meal, foodsArray);
        return;
    }

    const key = `cal${calToUse}-${dayToUse}-${meal}`;
    const timestamp = Date.now();
    const dataWithTimestamp = {
        data: foodsArray,
        lastModified: timestamp
    };

    const _saveMenuRef = userMenuRef();
    if (isFirebaseConfigured && _saveMenuRef) {
        try {
            syncStatus = 'syncing';
            updateSyncStatusUI();

            // Save with timestamp using retry logic
            await retryOperation(async () => {
                await _saveMenuRef.set({
                    [key]: dataWithTimestamp
                }, { merge: true });
            });

            // Verify the save was successful
            const verifyDoc = await _saveMenuRef.get();
            if (verifyDoc.exists && verifyDoc.data()[key]) {
                const saved = verifyDoc.data()[key];
                const savedData = saved.data || saved; // Handle both formats
                if (JSON.stringify(savedData) === JSON.stringify(foodsArray)) {
                    syncStatus = 'firebase';
                    lastSyncTimestamp = timestamp;
                    updateSyncStatusUI();
                    console.log(`✅ Menu saved to Firebase: ${key} at ${new Date(timestamp).toISOString()}`);
                } else {
                    throw new Error('Data verification failed');
                }
            }
        } catch (error) {
            console.error(`❌ Error saving to Firebase (${key}):`, error);
            syncStatus = 'cache';
            updateSyncStatusUI();
            localStorage.setItem(key, JSON.stringify(dataWithTimestamp));
            if (!silent) {
                showNotification('⚠️ Saved locally - Firebase sync failed', 'warning');
            }
        }
    } else {
        syncStatus = 'cache';
        localStorage.setItem(key, JSON.stringify(dataWithTimestamp));
    }
}

// Cargar menú desde Firebase o localStorage
async function loadMenu() {
    if (isCopyMode) {
        loadFromCopyStore();
        updateCopyButtonsVisibility();
        return;
    }
    const _loadMenuRef = userMenuRef();
    if (isFirebaseConfigured && _loadMenuRef) {
        try {
            syncStatus = 'syncing';
            updateSyncStatusUI();

            // Add 10 second timeout
            const doc = await withTimeout(
                _loadMenuRef.get(),
                10000, // 10 seconds
                null
            );
            
            if (doc === null) {
                // Timeout occurred
                connectionRetryCount++;
                console.warn(`⏱️ Firebase load timed out (attempt ${connectionRetryCount}/${maxConnectionRetries})`);
                
                // Show cached data immediately for UX
                loadFromLocalStorage();
                
                if (connectionRetryCount >= maxConnectionRetries) {
                    // Después de 5 intentos, cambiar a modo offline
                    console.error('❌ Max retry attempts reached, switching to offline mode');
                    syncStatus = 'offline';
                    updateSyncStatusUI();
                    showNotification('❌ No se puede conectar a Firebase - Modo offline', 'error');
                    connectionRetryCount = 0; // Reset for next time
                    return;
                }
                
                // Keep status as syncing
                syncStatus = 'syncing';
                updateSyncStatusUI();
                
                // Calculate exponential backoff delay: 3s, 6s, 12s, 24s
                const retryDelay = 3000 * Math.pow(2, connectionRetryCount - 1);
                showNotification(`⚠️ Reintentando en ${retryDelay/1000}s (${connectionRetryCount}/${maxConnectionRetries})...`, 'warning');
                
                // Automatically retry with exponential backoff
                setTimeout(async () => {
                    if (syncStatus === 'syncing') {
                        console.log(`🔄 Auto-retry #${connectionRetryCount}...`);
                        await loadMenu();
                    }
                }, retryDelay);
                
                return;
            }
            
            // Success - reset retry counter
            connectionRetryCount = 0;
            if (doc.exists) {
                const data = doc.data();
                const slots = document.querySelectorAll('.meal-slot');
                const isDailyLog = (!isMobileDevice && currentView === 'daily') || (isMobileDevice && currentView === 'day');
                const dailyTargetDate = isDailyLog
                    ? formatISODate(isMobileDevice ? getMobileDates()[0] : (() => {
                        const base = getCurrentTestDate();
                        const target = new Date(base);
                        target.setDate(base.getDate() + (currentCalendar - 1));
                        return target;
                    })())
                    : null;

                slots.forEach(slot => {
                    const candidates = getMenuKeyCandidatesFromSlot(slot);
                    const foundKey = candidates.find(candidateKey => data[candidateKey]);
                    let foodsArray = null;

                    if (foundKey) {
                        const menuData = data[foundKey];

                        // Handle both old format (array) and new format (object with timestamp)
                        if (Array.isArray(menuData)) {
                            foodsArray = menuData;
                            updateSlotWithArray(slot, menuData);
                        } else if (menuData && menuData.data) {
                            foodsArray = menuData.data;
                            updateSlotWithArray(slot, menuData.data);

                            // Clear localStorage for this key since Firebase is authoritative
                            const localData = localStorage.getItem(foundKey);
                            if (localData) {
                                try {
                                    const parsed = JSON.parse(localData);
                                    const localTimestamp = parsed.lastModified || 0;
                                    const firebaseTimestamp = menuData.lastModified || 0;

                                    // Only clear if Firebase data is newer or equal
                                    if (firebaseTimestamp >= localTimestamp) {
                                        localStorage.removeItem(foundKey);
                                    }
                                } catch (e) {
                                    localStorage.removeItem(foundKey);
                                }
                            }
                        } else {
                            slot.innerHTML = '';
                        }
                    } else {
                        slot.innerHTML = '';
                    }

                });
                
                syncStatus = 'firebase';
                lastSyncTimestamp = Date.now();
                console.log('✅ Menu loaded from Firebase');
            } else {
                // No Firebase data, try localStorage as fallback
                console.log('⚠️ No Firebase data found, checking localStorage...');
                loadFromLocalStorage();
                syncStatus = 'cache';
            }
        } catch (error) {
            console.error("❌ Error loading from Firebase:", error);
            syncStatus = 'offline';
            loadFromLocalStorage();
            showNotification('⚠️ Offline mode - using cached data', 'warning');
        }
    } else {
        syncStatus = 'cache';
        loadFromLocalStorage();
    }
    
    updateSyncStatusUI();
}

// Función auxiliar para determinar calendario y día desde una fecha
function getCalendarAndDayFromDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Encontrar el lunes de la semana del calendario 1
    const cal1Monday = getMondayOfWeek(0);
    
    // Calcular cuántas semanas de diferencia hay desde el lunes del calendario 1
    const diffTime = date - cal1Monday;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekOffset = Math.floor(diffDays / 7);
    
    // Determinar el calendario (1-4)
    const calendar = weekOffset + 1;
    
    // Determinar el día de la semana (formato europeo: 0=Lunes, 6=Domingo)
    const europeanDayIndex = getEuropeanDayIndex(date);
    
    // Mapear a las keys que usamos (lunes, martes, ..., domingo)
    const dayKeys = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const dayKey = dayKeys[europeanDayIndex];
    
    return {calendar, dayKey};
}

function shouldUseDateBasedSlotKey(slot) {
    if (!slot || !slot.dataset || !slot.dataset.date) {
        return false;
    }

    return (isMobileDevice && (currentView === 'day' || currentView === 'three-days')) ||
        (!isMobileDevice && currentView === 'daily');
}

function getStorageContextFromSlot(slot) {
    if (shouldUseDateBasedSlotKey(slot)) {
        const slotDate = parseISODateLocal(slot.dataset.date);
        if (slotDate) {
            const { calendar, dayKey } = getCalendarAndDayFromDate(slotDate);
            return { calendar, day: dayKey, date: slotDate };
        }
    }

    return {
        calendar: Number(slot?.dataset?.calendar) || currentCalendar,
        day: slot?.dataset?.day,
        date: null
    };
}

function getMenuKeyFromSlot(slot, mealOverride = null) {
    const { calendar, day } = getStorageContextFromSlot(slot);
    const meal = mealOverride || slot?.dataset?.meal;
    return {
        calendar,
        day,
        meal,
        key: `cal${calendar}-${day}-${meal}`
    };
}

function getLegacyMenuKeyFromSlot(slot, mealOverride = null) {
    const calendar = Number(slot?.dataset?.calendar) || currentCalendar;
    const day = slot?.dataset?.day;
    const meal = mealOverride || slot?.dataset?.meal;
    return {
        calendar,
        day,
        meal,
        key: `cal${calendar}-${day}-${meal}`
    };
}

function getMenuKeyCandidatesFromSlot(slot, mealOverride = null) {
    const primary = getMenuKeyFromSlot(slot, mealOverride).key;
    if (shouldUseDateBasedSlotKey(slot)) {
        return [primary];
    }
    const legacy = getLegacyMenuKeyFromSlot(slot, mealOverride).key;
    return primary === legacy ? [primary] : [primary, legacy];
}

// Cargar desde localStorage (fallback)
function loadFromLocalStorage() {
    const slots = document.querySelectorAll('.meal-slot');
    slots.forEach(slot => {
        const candidates = getMenuKeyCandidatesFromSlot(slot);
        const saved = candidates
            .map(candidateKey => localStorage.getItem(candidateKey))
            .find(value => value);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                
                // Handle both old format (array) and new format (object with timestamp)
                if (Array.isArray(parsed)) {
                    updateSlotWithArray(slot, parsed);
                } else if (parsed && parsed.data) {
                    updateSlotWithArray(slot, parsed.data);
                } else {
                    slot.innerHTML = '';
                }
            } catch (e) {
                console.error('Error parsing localStorage data:', e);
                // Compatibilidad con formato antiguo (string simple)
                updateSlotWithArray(slot, [saved]);
            }
        } else {
            slot.innerHTML = '';
        }
    });
    console.log('📦 Loaded menu from localStorage cache');
}

// Sincronización en tiempo real del menú — gestionada por _setupFirebaseListeners()
let _menuUnsub = null;
let _foodsUnsub = null;

function _setupFirebaseListeners() {
    if (_menuUnsub) { _menuUnsub(); _menuUnsub = null; }
    if (_foodsUnsub) { _foodsUnsub(); _foodsUnsub = null; }

    if (!isFirebaseConfigured) return;
    const menuRef = userMenuRef();
    const foodsRef = userFoodsRef();
    if (!menuRef || !foodsRef) return; // usuario no identificado

    _menuUnsub = menuRef.onSnapshot((doc) => {
        if (isResetting) {
            console.log('⏸️ Snapshot update during reset, will process after completion');
            return;
        }
        if (isCopyMode) return;

        const slots = document.querySelectorAll('.meal-slot');
        if (doc.exists) {
            const data = doc.data();
            let updatesApplied = 0;
            slots.forEach(slot => {
                const candidates = getMenuKeyCandidatesFromSlot(slot);
                const foundKey = candidates.find(candidateKey => data[candidateKey]);
                if (foundKey) {
                    const menuData = data[foundKey];
                    if (Array.isArray(menuData)) {
                        updateSlotWithArray(slot, menuData);
                        updatesApplied++;
                    } else if (menuData && menuData.data) {
                        const firebaseTimestamp = menuData.lastModified || 0;
                        const localData = localStorage.getItem(foundKey);
                        let shouldUpdate = true;
                        if (localData) {
                            try {
                                const parsed = JSON.parse(localData);
                                if (firebaseTimestamp < (parsed.lastModified || 0)) {
                                    shouldUpdate = false;
                                }
                            } catch(e) {}
                        }
                        if (shouldUpdate) {
                            updateSlotWithArray(slot, menuData.data);
                            updatesApplied++;
                            localStorage.removeItem(foundKey);
                        }
                    } else {
                        slot.innerHTML = '';
                    }
                } else {
                    const localData = localStorage.getItem(candidates[0]);
                    if (!localData || localData === '[]') slot.innerHTML = '';
                }
            });
            if (updatesApplied > 0) {
                console.log(`🔄 Applied ${updatesApplied} remote updates from Firebase`);
                syncStatus = 'firebase';
                lastSyncTimestamp = Date.now();
                updateSyncStatusUI();
            }
        } else {
            document.querySelectorAll('.meal-slot').forEach(slot => { slot.innerHTML = ''; });
            console.log('⚠️ Firebase document deleted or does not exist');
        }
    });

    _foodsUnsub = foodsRef.onSnapshot((doc) => {
        if (doc.exists && doc.data().customFoods) {
            loadCustomFoods(doc.data().customFoods);
            console.log('🔄 Custom foods updated from Firebase');
        }
    });
}

// Actualizar slot con array de comidas
function updateSlotWithArray(slot, foodsArray) {
    if (!Array.isArray(foodsArray)) {
        foodsArray = [foodsArray];
    }

    if (slot?.dataset) {
        slot.dataset.foods = JSON.stringify(foodsArray);
    }

    // Aplicar/quitar clase de bloqueo para slots comida2/cena2 con plato único
    const meal = slot?.dataset?.meal;
    if (meal === 'comida2' || meal === 'cena2') {
        const isUnico = foodsArray.length > 0 && foodsArray.some(f => {
            const name = typeof f === 'string' ? f : f?.name;
            return findPlateCategory(name)?.startsWith('unico_');
        });
        slot.classList.toggle('slot-unico-blocked', isUnico);
    }

    slot.innerHTML = '';
    foodsArray.forEach(food => {
        const tag = document.createElement('div');
        tag.className = 'meal-content';

        // Soportar tanto strings como objetos {name, description}
        const foodName = typeof food === 'string' ? food : food.name;
        const foodDescription = typeof food === 'object' ? food.description : '';

        // Intentar parsear la descripción como JSON
        let comments = '';
        let link = '';
        try {
            if (foodDescription) {
                const parsed = JSON.parse(foodDescription);
                comments = parsed.comments || '';
                link = parsed.link || '';
            }
        } catch (e) {
            // Si no es JSON, es una descripción antigua (tratarla como link)
            link = foodDescription;
        }

        const isDailyView = (currentView === 'day' || currentView === 'daily');

        if (isDailyView) {
            const commentsText = comments || 'Sin comentarios';
            const recipeContent = link
                ? `<a href="${link}" target="_blank" class="meal-description-link daily-recipe-link" title="Abrir receta" onclick="event.stopPropagation();">🔗</a>`
                : `<span class="daily-recipe-placeholder">—</span>`;
                tag.innerHTML = `
                <div class="daily-name-block">
                    <span class="meal-text daily-name-text">${foodName}</span>
                </div>
                <div class="daily-comments-block">
                    <span class="meal-comments daily-comments-text">${commentsText}</span>
                </div>
                <div class="daily-recipe-block">
                    ${recipeContent}
                </div>
                <button class="remove-btn tab-close" onclick="removeFoodTag(this); event.stopPropagation();">×</button>
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
        
        // NO añadir listener aquí - ya hay listeners globales en setupSlotClickHandlers
        // que manejan los clicks en .meal-slot

        slot.appendChild(tag);
    });

    // Actualizar valoración del combo si el slot modificado es relevante
    const day = slot.dataset?.day;
    if (day && (meal === 'comida1' || meal === 'comida2')) {
        refreshComboRating(day, 'comida');
    } else if (day && (meal === 'cena1' || meal === 'cena2')) {
        refreshComboRating(day, 'cena');
    }
}

// Obtener array de comidas de un slot
function getSlotFoods(slot) {
    const tags = slot.querySelectorAll('.meal-text');
    return Array.from(tags).map(tag => tag.textContent);
}

// Eliminar etiqueta individual de comida
async function removeFoodTag(btn) {
    const slot = btn.closest('.meal-slot');
    if (slot.classList.contains('slot-disabled') || !currentUser) {
        return;
    }

    const tag = btn.closest('.meal-content');
    const foodName = tag.querySelector('.meal-text').textContent;

    if (isCopyMode) {
        const { date } = getMenuKeyFromSlot(slot);
        let foodsArray = getFoodsArrayFromSlot(slot);

        foodsArray = foodsArray.filter(food => {
            const name = typeof food === 'string' ? food : food.name;
            return name !== foodName;
        });

        updateSlotWithArray(slot, foodsArray);
        await saveMenu(slot.dataset.day, slot.dataset.meal, foodsArray, null, date);
        console.log('🧩 Copy slot item removed');
        return;
    }

    // Leer datos actuales
    const { key, date } = getMenuKeyFromSlot(slot);
    const candidates = getMenuKeyCandidatesFromSlot(slot);
    let foodsArray = [];

    // Cargar array actual
    if (isFirebaseConfigured) {
        try {
            const doc = await db.collection('menus').doc(MENU_DOC_ID).get();
            if (doc.exists) {
                const data = doc.data();
                const foundKey = candidates.find(candidateKey => data[candidateKey]);
                if (foundKey) {
                    foodsArray = data[foundKey];
                }
            }
        } catch (error) {
            const saved = candidates
                .map(candidateKey => localStorage.getItem(candidateKey))
                .find(value => value);
            if (saved) foodsArray = JSON.parse(saved);
        }
    } else {
        const saved = candidates
            .map(candidateKey => localStorage.getItem(candidateKey))
            .find(value => value);
        if (saved) foodsArray = JSON.parse(saved);
    }

    // Eliminar el plato del array
    foodsArray = foodsArray.filter(food => {
        const name = typeof food === 'string' ? food : food.name;
        return name !== foodName;
    });

    // Actualizar UI
    updateSlotWithArray(slot, foodsArray);

    // Si era plato único en comida1/cena1 → también limpiar el segundo slot
    const slotMeal = slot.dataset.meal;
    if (findPlateCategory(foodName)?.startsWith('unico_') && (slotMeal === 'comida1' || slotMeal === 'cena1')) {
        const cal = slot.dataset.calendar;
        const slot2Key = slotMeal === 'comida1' ? 'comida2' : 'cena2';
        const slot2 = document.querySelector(`.meal-slot[data-day="${slot.dataset.day}"][data-meal="${slot2Key}"]${cal ? `[data-calendar="${cal}"]` : ''}`);
        if (slot2) {
            slot2.classList.remove('slot-unico-blocked');
            updateSlotWithArray(slot2, []);
            await saveMenu(slot.dataset.day, slot2Key, [], cal ? Number(cal) : null, date);
        }
    }

    // Guardar
    await saveMenu(slot.dataset.day, slot.dataset.meal, foodsArray, null, date);

    if (isFirebaseConfigured) {
        try {
            if (foodsArray.length === 0) {
                const deletePayload = {};
                candidates.forEach(candidateKey => {
                    deletePayload[candidateKey] = firebase.firestore.FieldValue.delete();
                });
                await db.collection('menus').doc(MENU_DOC_ID).update(deletePayload);
            }
        } catch (error) {
            console.error("Error eliminando de Firebase:", error);
        }
    }

    if (foodsArray.length === 0) {
        candidates.forEach(candidateKey => localStorage.removeItem(candidateKey));
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
        if (slot.classList.contains('slot-disabled')) {
            return;
        }

        e.preventDefault();
        slot.classList.add('drag-over');
    });

    slot.addEventListener('dragleave', () => {
        slot.classList.remove('drag-over');
    });

    slot.addEventListener('drop', async (e) => {
        if (slot.classList.contains('slot-disabled')) {
            return;
        }

        e.preventDefault();
        slot.classList.remove('drag-over');

        if (draggedFood) {
            // Añadir nueva comida al slot (evitar duplicados por nombre)
            const foodsArray = getSlotFoods(slot);
            const incomingKey = foodNameKey(draggedFood);
            const exists = foodsArray.some(f => foodNameKey(typeof f === 'string' ? f : f.name) === incomingKey);
            const { date } = getStorageContextFromSlot(slot);

            if (exists) {
                showNotification('Ya existe este plato en este día', 'info');
            } else {
                foodsArray.push(draggedFood);
                updateSlotWithArray(slot, foodsArray);
                await saveMenu(slot.dataset.day, slot.dataset.meal, foodsArray, null, date);
            }
            draggedFood = null;
        }
    });
});

// Guardar plato personalizado en la base de datos
async function saveCustomFood(foodName, category) {
    const normalizedFoodName = normalizeFoodName(foodName);
    if (!normalizedFoodName || !isValidFoodName(normalizedFoodName)) {
        return;
    }

    const _saveFoodRef = userFoodsRef();
    if (isFirebaseConfigured && _saveFoodRef) {
        try {
            const doc = await _saveFoodRef.get();
            const data = doc.exists ? doc.data() : {};
            const customFoods = data.customFoods || {};

            if (!customFoods[category]) {
                customFoods[category] = [];
            }

            const alreadyExists = customFoods[category].some(item => {
                const existingName = normalizeFoodName(getPlateName(item));
                return existingName.toLocaleLowerCase('es') === normalizedFoodName.toLocaleLowerCase('es');
            });

            if (!alreadyExists) {
                customFoods[category].push(normalizedFoodName);
                await _saveFoodRef.set({ customFoods });
            }
        } catch (error) {
            console.error("Error guardando plato en Firebase:", error);
            saveCustomFoodLocal(normalizedFoodName, category);
        }
    } else {
        saveCustomFoodLocal(normalizedFoodName, category);
    }
}

// Guardar plato personalizado en localStorage
function saveCustomFoodLocal(foodName, category) {
    const normalizedFoodName = normalizeFoodName(foodName);
    if (!normalizedFoodName || !isValidFoodName(normalizedFoodName)) {
        return;
    }

    const customFoods = JSON.parse(localStorage.getItem('customFoods') || '{}');
    if (!customFoods[category]) {
        customFoods[category] = [];
    }

    const alreadyExists = customFoods[category].some(item => {
        const existingName = normalizeFoodName(getPlateName(item));
        return existingName.toLocaleLowerCase('es') === normalizedFoodName.toLocaleLowerCase('es');
    });

    if (!alreadyExists) {
        customFoods[category].push(normalizedFoodName);
        localStorage.setItem('customFoods', JSON.stringify(customFoods));
    }
}

// Eliminar plato personalizado de la base de datos
async function removeCustomFood(foodName, category) {
    const normalizedFoodName = normalizeFoodName(foodName);

    const _removeFoodRef = userFoodsRef();
    if (isFirebaseConfigured && _removeFoodRef) {
        try {
            const doc = await _removeFoodRef.get();
            if (doc.exists && doc.data().customFoods) {
                const customFoods = doc.data().customFoods;
                if (customFoods[category]) {
                    customFoods[category] = customFoods[category].filter(item => {
                        const existingName = normalizeFoodName(getPlateName(item));
                        return existingName.toLocaleLowerCase('es') !== normalizedFoodName.toLocaleLowerCase('es');
                    });
                    await _removeFoodRef.set({ customFoods });
                }
            }
        } catch (error) {
            console.error("Error eliminando plato de Firebase:", error);
            removeCustomFoodLocal(normalizedFoodName, category);
        }
    } else {
        removeCustomFoodLocal(normalizedFoodName, category);
    }
}

// Eliminar plato personalizado de localStorage
function removeCustomFoodLocal(foodName, category) {
    const normalizedFoodName = normalizeFoodName(foodName);
    const customFoods = JSON.parse(localStorage.getItem('customFoods') || '{}');
    if (customFoods[category]) {
        customFoods[category] = customFoods[category].filter(item => {
            const existingName = normalizeFoodName(getPlateName(item));
            return existingName.toLocaleLowerCase('es') !== normalizedFoodName.toLocaleLowerCase('es');
        });
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
    const { sanitizedFoods } = sanitizeCustomFoodsMap(customFoods);

    const categoryContainers = document.querySelectorAll('.category-items');
    if (categoryContainers.length === 0) {
        return;
    }

    // Limpiar duplicados en cada categoría
    const cleanedFoods = {};
    Object.keys(sanitizedFoods).forEach(category => {
        const foods = sanitizedFoods[category] || [];
        const uniqueFoods = [];
        const seenNames = new Set();
        
        foods.forEach(food => {
            const foodName = getPlateName(food);
            if (!seenNames.has(foodName)) {
                seenNames.add(foodName);
                uniqueFoods.push(food);
            }
        });

        uniqueFoods.sort((a, b) => {
            const nameA = (typeof a === 'string' ? a : a.name).toLowerCase();
            const nameB = (typeof b === 'string' ? b : b.name).toLowerCase();
            return nameA.localeCompare(nameB, 'es');
        });
        
        cleanedFoods[category] = uniqueFoods;
    });
    
    // Guardar en variable global (ya limpio)
    customFoodsGlobal = cleanedFoods;

    // Limpiar food-item y subcategory-labels (preservar controles como el botón aleatorizar)
    categoryContainers.forEach(cat => {
        Array.from(cat.children).forEach(child => {
            if (child.classList && (child.classList.contains('food-item') || child.classList.contains('food-subcategory-label'))) {
                child.remove();
            }
        });
    });

    // Cargar platos agrupados por subcategoría dentro de cada contenedor padre
    PARENT_GROUP_SUBCATS.forEach((subcats, groupIdx) => {
        const container = categoryContainers[groupIdx];
        if (!container) return;
        const controlsEl = container.querySelector('.category-controls');
        subcats.forEach(subcat => {
            const foods = cleanedFoods[subcat] || [];
            if (foods.length === 0) return;
            const subLabel = document.createElement('div');
            subLabel.className = 'food-subcategory-label';
            subLabel.textContent = SUBCATEGORY_LABELS[subcat];
            controlsEl ? container.insertBefore(subLabel, controlsEl) : container.appendChild(subLabel);
            foods.forEach(food => {
                const el = createFoodItemElement(food);
                controlsEl ? container.insertBefore(el, controlsEl) : container.appendChild(el);
            });
        });
    });

    // Logs para depuración: comprobar que los controles personalizados (ej. botón Aleatorizar) existen
    categoryContainers.forEach((cat, idx) => {
        const catName = Object.keys(CATEGORY_MAP).find(k => CATEGORY_MAP[k] === idx) || `idx:${idx}`;
        const controls = cat.querySelector('.category-controls');
        const randomBtn = cat.querySelector('#randomizeDessertsBtn');
        console.log(`loadCustomFoods: category='${catName}', foodItems=${cat.querySelectorAll('.food-item').length}, hasControls=${!!controls}, randomizeBtn=${!!randomBtn}`);
        if (controls && randomBtn) {
            console.log('loadCustomFoods: Found randomize button in', catName, randomBtn);
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

function findPlateCategory(name) {
    for (const category in customFoodsGlobal) {
        const found = customFoodsGlobal[category].find(p => {
            const n = typeof p === 'string' ? p : p.name;
            return n === name;
        });
        if (found) return category;
    }
    return null;
}

// Normalizar nombre para comparación (clave simple)
function foodNameKey(name) {
    return normalizeFoodName(String(name || '')).toLocaleLowerCase('es');
}

// (mover a) funcionalidad eliminada — eliminar y recrear menú es la alternativa recomendada

// Cargar platos personalizados desde Firebase o localStorage
async function loadCustomFoodsFromDB() {
    if (document.querySelectorAll('.category-items').length === 0) {
        return;
    }
    const _loadFoodRef = userFoodsRef();
    if (isFirebaseConfigured && _loadFoodRef) {
        try {
            const doc = await _loadFoodRef.get();
            if (doc.exists && doc.data().customFoods) {
                const { sanitizedFoods, changed } = sanitizeCustomFoodsMap(doc.data().customFoods);

                if (changed) {
                    await _loadFoodRef.set({ customFoods: sanitizedFoods });
                    localStorage.setItem('customFoods', JSON.stringify(sanitizedFoods));
                }

                loadCustomFoods(sanitizedFoods);
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
    const { sanitizedFoods, changed } = sanitizeCustomFoodsMap(customFoods);

    if (changed) {
        localStorage.setItem('customFoods', JSON.stringify(sanitizedFoods));
    }

    loadCustomFoods(sanitizedFoods);
}

// Log comprobatorio al inicio para depuración rápida
document.addEventListener('DOMContentLoaded', () => {
    loadComboRatings();
    console.log('menu.js: DOMContentLoaded - checking randomize button...');
    const btn = document.getElementById('randomizeDessertsBtn');
    console.log('menu.js: randomizeDessertsBtn exists:', !!btn, btn);

    // Hacer clicables los encabezados de fila 'Postre' en la tabla para activar aleatorización
    try {
        const dayHeaderTexts = Array.from(document.querySelectorAll('#weekTable .day-header'));
        dayHeaderTexts.forEach(td => {
            const textEl = td.querySelector('.text');
            if (textEl && textEl.textContent && textEl.textContent.trim().toLowerCase().includes('postre')) {
                td.style.cursor = 'pointer';
                td.title = 'Click para aleatorizar postres';
                td.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('menu.js: Postre header clicked - invoking randomizeDesserts');
                    randomizeDesserts();
                });
                console.log('menu.js: made Postre header clickable', td);
            }
        });
    } catch (e) {
        console.warn('menu.js: error attaching clickable postre headers', e);
    }
});

// Asignar postres aleatorios a los slots de postre del calendario actual
async function randomizeDesserts() {
    if (isCopyMode) {
        showNotification('No disponible en modo copia', 'error');
        return;
    }

    const desserts = Array.isArray(customFoodsGlobal.postres) ? customFoodsGlobal.postres.map(d => (typeof d === 'string' ? d : d.name)) : [];
    if (!desserts || desserts.length === 0) {
        showNotification('No hay postres en el diccionario', 'error');
        return;
    }

    // Seleccionar slots de postre (comida y cena) y agrupar por día
    const postreSlots = Array.from(document.querySelectorAll('#weekTable .meal-slot[data-meal="postre"]'));
    const cenaPostreSlots = Array.from(document.querySelectorAll('#weekTable .meal-slot[data-meal="cenaPostre"]'));

    const days = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
    const dayGroups = days.map(dayName => {
        const group = [];
        const p = postreSlots.find(s => s.dataset.day === dayName);
        const c = cenaPostreSlots.find(s => s.dataset.day === dayName);
        if (p) group.push(p);
        if (c) group.push(c);
        return { day: dayName, slots: group };
    }).filter(g => g.slots.length > 0);

    if (dayGroups.length === 0) {
        showNotification('No se encontraron casillas de postre', 'error');
        return;
    }

    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    // Deck que iremos consumiendo; cuando se agote se remezcla
    let deck = shuffle(desserts);
    const assignments = [];
    let unavoidableDuplicates = false;

    console.log('randomizeDesserts: desserts count=', desserts.length, desserts);
    console.log('randomizeDesserts: dayGroups count=', dayGroups.length, dayGroups.map(g => ({ day: g.day, slots: g.slots.length })));
    console.log('randomizeDesserts: initial deck=', deck);

    for (const group of dayGroups) {
        const assignedForDay = [];
        for (let i = 0; i < group.slots.length; i++) {
            if (deck.length === 0) deck = shuffle(desserts);

            // Intentar sacar un elemento distinto de los ya asignados en este día
            let candidate = deck.pop();
            console.debug(`randomizeDesserts: day=${group.day} popped candidate=${candidate}`);
            if (assignedForDay.includes(candidate)) {
                // Buscar en deck otro candidato diferente
                const idx = deck.findIndex(x => !assignedForDay.includes(x));
                if (idx !== -1) {
                    candidate = deck.splice(idx, 1)[0];
                    console.debug(`randomizeDesserts: day=${group.day} replaced with candidate=${candidate}`);
                } else {
                    // No queda alternativa: usar candidate (duplicado inevitable)
                    unavoidableDuplicates = true;
                }
            }

            assignedForDay.push(candidate);
            assignments.push({ slot: group.slots[i], value: candidate });
            console.debug(`randomizeDesserts: assigned day=${group.day} slot=${group.slots[i].dataset.meal} -> ${candidate}`);
        }
    }

    // Aplicar asignaciones (guardar silent y actualizar DOM)
    console.log('randomizeDesserts: total assignments=', assignments.length, assignments.map(a => ({ day: a.slot.dataset.day, meal: a.slot.dataset.meal, value: a.value })));
    for (const a of assignments) {
        const slot = a.slot;
        const day = slot.dataset.day;
        const meal = slot.dataset.meal;
        try {
            await saveMenu(day, meal, a.value, currentCalendar, null, { silent: true });
            updateSlotWithArray(slot, [a.value]);
            console.log(`randomizeDesserts: saved ${a.value} -> cal${currentCalendar}-${day}-${meal}`);
        } catch (err) {
            console.error('Error asignando postre aleatorio:', err);
        }
    }

    if (unavoidableDuplicates) {
        showNotification('⚠️ Asignación completada, pero hubo que repetir postres por falta de variedad', 'warning');
    } else {
        showNotification('✅ Postres aleatorios asignados (sin repeticiones por día)', 'success');
    }
}

// ====================================
// GENERADOR DE MENÚ ALEATORIO BALANCEADO
// ====================================

function getSeason() {
    const m = new Date().getMonth(); // 0-indexed
    if (m >= 5 && m <= 8) return 'verano';   // jun–sep
    if (m === 11 || m <= 1) return 'invierno'; // dic–feb (marzo = primavera)
    return 'todo';
}

function plateMatchesSeason(plate, season) {
    const ps = plate?.meta?.temporada || plate?.temporada || 'todo';
    if (season === 'verano'   && ps === 'invierno') return false;
    if (season === 'invierno' && ps === 'verano')   return false;
    return true;
}

// Pollo y pavo son la misma categoría nutricional
const AVE_VARIANTS = new Set(['ave', 'pollo', 'pavo']);
function normalizeProteina(p) {
    return AVE_VARIANTS.has(p) ? 'ave' : (p || null);
}

function getPlateProteina(plate) {
    const raw = plate?.meta?.proteina || plate?.proteina || null;
    return normalizeProteina(raw);
}

function getPlatePeso(plate) {
    return plate?.meta?.peso || plate?.peso || null;
}

function getPlateSubtipo(plate) {
    return plate?.meta?.subtipo || plate?.subtipo || '';
}

function isAnimalProteina(proteina) {
    return proteina && !['ninguna', 'vegetal', 'lacteo'].includes(proteina);
}

const getPlateNameStr = p => p ? (typeof p === 'string' ? p : p.name) : '';

function isPlatoUnico(plate) {
    return !!(plate?.meta?.plato_unico || plate?.plato_unico);
}

function getPlateComponentes(plate) {
    return plate?.meta?.componentes || plate?.componentes || [];
}

function hasProteinaComponente(plate) {
    return getPlateComponentes(plate).includes('proteina');
}

// Filtra platos ocasionales con 30% de probabilidad (para reducir su frecuencia semanal)
function buildPool(plates) {
    return plates.filter(p => {
        const freq = p?.meta?.frecuencia || p?.frecuencia || 'normal';
        return freq !== 'ocasional' || Math.random() < 0.3;
    });
}

function pickFiltered(pool, usedNames, season, avoidProteina, preferPeso) {
    const available = pool.filter(p => {
        return !usedNames.has(getPlateNameStr(p)) && plateMatchesSeason(p, season);
    });

    const withoutProteina = avoidProteina
        ? available.filter(p => {
              const pr = getPlateProteina(p);
              return !pr || pr === 'ninguna' || pr !== avoidProteina;
          })
        : available;

    // Si se pide preferencia de peso, intentar cumplirla sin descartar el resto
    const candidates = preferPeso
        ? withoutProteina.filter(p => getPlatePeso(p) === preferPeso)
        : withoutProteina;

    const src = candidates.length > 0 ? candidates
              : withoutProteina.length > 0 ? withoutProteina
              : available.length > 0 ? available
              : pool;
    return src[Math.floor(Math.random() * src.length)] || null;
}

// Selección aleatoria ponderada por puntuación de combinación.
// pairedWith: nombre del plato ya elegido (primero/cena1) para consultar el score.
// score +N → más probabilidad, score -N → menos (mínimo 0.1, nunca bloqueado).
function pickFilteredWeighted(pool, usedNames, season, avoidProteina, preferPeso, pairedWith) {
    const available = pool.filter(p =>
        !usedNames.has(getPlateNameStr(p)) && plateMatchesSeason(p, season)
    );
    const withoutProteina = avoidProteina
        ? available.filter(p => { const pr = getPlateProteina(p); return !pr || pr === 'ninguna' || pr !== avoidProteina; })
        : available;
    const candidates = preferPeso
        ? withoutProteina.filter(p => getPlatePeso(p) === preferPeso)
        : withoutProteina;
    const src = candidates.length > 0 ? candidates
              : withoutProteina.length > 0 ? withoutProteina
              : available.length > 0 ? available
              : pool;

    if (!pairedWith || src.length === 0) {
        return src[Math.floor(Math.random() * src.length)] || null;
    }

    // Peso = 1 + score * 0.5, mínimo 0.1 (nunca se bloquea)
    const weights = src.map(p => Math.max(0.1, 1 + getComboScore(pairedWith, getPlateNameStr(p)).score * 0.5));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < src.length; i++) {
        r -= weights[i];
        if (r <= 0) return src[i];
    }
    return src[src.length - 1];
}

function showGenerationProgress(pct, label) {
    document.getElementById('generationOverlay').classList.remove('hidden');
    document.getElementById('generationBarFill').style.width = `${pct}%`;
    document.getElementById('generationLabel').textContent = label;
}

function hideGenerationProgress() {
    document.getElementById('generationOverlay').classList.add('hidden');
}

function updateRandomBtnState() {
    const btn = document.getElementById('randomBtn');
    if (!btn) return;
    if (!currentUser) {
        btn.disabled = true;
        return;
    }
    const slots = document.querySelectorAll('#weekTable .meal-slot');
    const hasContent = Array.from(slots).some(s => s.querySelector('.meal-content'));
    btn.disabled = hasContent;
    btn.title = hasContent
        ? 'Reinicia el calendario para generar un menú aleatorio'
        : 'Generar menú semanal aleatorio balanceado';
}

async function generateRandomMenu() {
    if (isCopyMode) {
        showNotification('No disponible en modo copia', 'error');
        return;
    }

    const slots = document.querySelectorAll('#weekTable .meal-slot');
    const hasContent = Array.from(slots).some(s => s.querySelector('.meal-content'));
    if (hasContent) {
        showNotification('La semana ya tiene platos. Reinicia primero para usar el menú aleatorio.', 'error');
        return;
    }

    try {

    const season = getSeason();
    const days = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];

    // ── Pools por etiqueta macro ──────────────────────────────────────────────
    // Hidrato: primeros sin legumbres (legumbres = proteína+hidrato → plato único)
    const hidratoPool = buildPool([
        ...(customFoodsGlobal.primeros_sopa      ||[]),
        ...(customFoodsGlobal.primeros_ensalada  ||[]),
        ...(customFoodsGlobal.primeros_pasta     ||[]),
        ...(customFoodsGlobal.primeros_arroz     ||[]),
        ...(customFoodsGlobal.primeros_verduras  ||[]),
    ]);

    // Proteína: pools por categoría para garantizar rotación real (carne / pescado / huevos)
    const _carnePool    = buildPool([
        ...(customFoodsGlobal.segundos_carne_roja   ||[]),
        ...(customFoodsGlobal.segundos_carne_pollo  ||[]),
        ...(customFoodsGlobal.segundos_carne_cerdo  ||[]),
    ]);
    const _pescadoPool  = buildPool([
        ...(customFoodsGlobal.segundos_pescado_porcion ||[]),
        ...(customFoodsGlobal.segundos_pescado_entero  ||[]),
    ]);
    const _huevosPool   = buildPool(customFoodsGlobal.segundos_huevos  ||[]);
    // Lista de categorías disponibles (las que tengan al menos 1 plato)
    const protCatPools  = [_carnePool, _pescadoPool, _huevosPool].filter(p => p.length > 0);
    // Pool plano de fallback
    const proteinaPool  = [..._carnePool, ..._pescadoPool, ..._huevosPool];

    // Plato único: legumbres + categorías unico_*
    const unicoPool = buildPool([
        ...(customFoodsGlobal.primeros_legumbres     ||[]),
        ...(customFoodsGlobal.unico_guiso_carne      ||[]),
        ...(customFoodsGlobal.unico_guiso_pescado    ||[]),
        ...(customFoodsGlobal.unico_guiso_legumbre   ||[]),
        ...(customFoodsGlobal.unico_asado_carne      ||[]),
        ...(customFoodsGlobal.unico_asado_pollo      ||[]),
        ...(customFoodsGlobal.unico_asado_pescado    ||[]),
        ...(customFoodsGlobal.unico_asado_verduras   ||[]),
        ...(customFoodsGlobal.unico_fast_food        ||[]),
    ]);
    // Postres
    const postresPool = [
        ...(customFoodsGlobal.postres_fruta  ||[]),
        ...(customFoodsGlobal.postres_lacteo ||[]),
        ...(customFoodsGlobal.postres_dulce  ||[]),
    ];

    if (!hidratoPool.length && !proteinaPool.length && !unicoPool.length) {
        showNotification('No hay platos en el banco de comidas', 'error');
        return;
    }

    // ── Elegir 2-3 días aleatorios con plato único para comida ───────────────
    const unicoDaysCount = unicoPool.length >= 2 ? (Math.random() < 0.5 ? 2 : 3) : unicoPool.length;
    const dayIndices = days.map((_, i) => i);
    for (let i = dayIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dayIndices[i], dayIndices[j]] = [dayIndices[j], dayIndices[i]];
    }
    const unicoDaySet = new Set(dayIndices.slice(0, unicoDaysCount));

    // Cena: sin pasta, arroz ni legumbres — priorizar ensalada y verduras
    const cenaLigeroPool = buildPool([
        ...(customFoodsGlobal.primeros_ensalada ||[]),
        ...(customFoodsGlobal.primeros_verduras  ||[]),
    ]);
    const cenaHidratoPool = buildPool([
        ...(customFoodsGlobal.primeros_ensalada  ||[]),
        ...(customFoodsGlobal.primeros_verduras  ||[]),
        ...(customFoodsGlobal.primeros_sopa      ||[]),
    ]);

    // ── Tabla 7 días × 4 columnas ────────────────────────────────────────────
    // Columnas: [0]=comida1  [1]=comida2  [2]=cena1  [3]=cena2
    // Para cada celda: elegimos un plato y comprobamos que su nombre NO esté
    // ya en ninguna otra celda de la tabla. Si está, elegimos otro.

    const cf = customFoodsGlobal;
    const sf = p => plateMatchesSeason(p, season);

    function aleatorizar(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    // Pools completos por tipo (todos los platos disponibles, solo filtro de temporada)
    const pLigeros  = aleatorizar([...(cf.primeros_ensalada||[]), ...(cf.primeros_verduras||[])].filter(sf));
    const pSopas    = aleatorizar([...(cf.primeros_sopa||[])].filter(sf));
    const pPesados  = aleatorizar([...(cf.primeros_pasta||[]), ...(cf.primeros_arroz||[])].filter(sf));
    const pCarnes   = aleatorizar([...(cf.segundos_carne_roja||[]), ...(cf.segundos_carne_pollo||[]), ...(cf.segundos_carne_cerdo||[])].filter(sf));
    const pPescados = aleatorizar([...(cf.segundos_pescado_porcion||[]), ...(cf.segundos_pescado_entero||[])].filter(sf));
    const pHuevos   = aleatorizar([...(cf.segundos_huevos||[])].filter(sf));
    const pUnicos   = aleatorizar([
        ...(cf.primeros_legumbres||[]), ...(cf.unico_guiso_carne||[]), ...(cf.unico_guiso_pescado||[]),
        ...(cf.unico_guiso_legumbre||[]), ...(cf.unico_asado_carne||[]), ...(cf.unico_asado_pollo||[]),
        ...(cf.unico_asado_pescado||[]), ...(cf.unico_asado_verduras||[]), ...(cf.unico_fast_food||[]),
    ].filter(sf));
    const ligeroPosPool = postresPool.filter(p => { const st = getPlateSubtipo(p); return st === 'fruta_fresca' || st === 'lacteo'; });
    const pPostres = aleatorizar((ligeroPosPool.length ? ligeroPosPool : postresPool).filter(sf));

    // Pool comida1: pasta/arroz primero (exclusivos de comida), luego sopa, luego ligeros
    const pComida1 = [...pPesados, ...pSopas, ...pLigeros];

    // Pool proteínas: intercalar carne → pescado → huevos → carne → …
    const pProteinas = [];
    for (let i = 0; i < Math.max(pCarnes.length, pPescados.length, pHuevos.length); i++) {
        if (i < pCarnes.length)   pProteinas.push(pCarnes[i]);
        if (i < pPescados.length) pProteinas.push(pPescados[i]);
        if (i < pHuevos.length)   pProteinas.push(pHuevos[i]);
    }

    // La tabla: 7 filas × 4 columnas, inicialmente vacía
    const tabla = Array.from({length: 7}, () => ['', '', '', '']);
    const enTabla = new Set(); // nombres ya colocados en la tabla

    // Elige el primer plato del pool que NO esté en la tabla.
    // Si todos están ya en la tabla (pool agotado), elige cualquiera de temporada.
    function elegir(pool) {
        const libres = pool.filter(p => !enTabla.has(getPlateNameStr(p)));
        const fuente = libres.length ? libres : pool;
        if (!fuente.length) return '';
        return getPlateNameStr(fuente[Math.floor(Math.random() * fuente.length)]);
    }

    // Coloca un plato en tabla[fila][col] y lo registra en enTabla.
    function colocar(fila, col, pool) {
        const nombre = elegir(pool);
        tabla[fila][col] = nombre;
        if (nombre) enTabla.add(nombre);
    }

    // Pool de cena1: prioriza ligeros (ensalada/verduras); si no quedan libres, añade sopas
    function poolCena1() {
        const libresLigeros = pLigeros.filter(p => !enTabla.has(getPlateNameStr(p)));
        return libresLigeros.length ? pLigeros : [...pLigeros, ...pSopas];
    }

    // Rellenar la tabla fila por fila (día por día), celda por celda
    let unicoIdx = 0;
    for (let i = 0; i < 7; i++) {
        const usarUnico = unicoDaySet.has(i) && pUnicos.length > 0;

        if (usarUnico) {
            // Plato único: comida1 y comida2 llevan el mismo nombre
            const nombre = elegir(pUnicos);
            tabla[i][0] = nombre;
            tabla[i][1] = nombre;
            if (nombre) enTabla.add(nombre);
        } else {
            colocar(i, 0, pComida1);    // primero comida
            colocar(i, 1, pProteinas);  // segundo comida
        }

        colocar(i, 2, poolCena1());     // primero cena
        colocar(i, 3, pProteinas);      // segundo cena
    }

    // Postres: conjunto independiente (pueden repetir si hay pocos)
    const enTablaPostres = new Set();
    function elegirPostre() {
        const libres = pPostres.filter(p => !enTablaPostres.has(getPlateNameStr(p)));
        const fuente = libres.length ? libres : pPostres;
        if (!fuente.length) return '';
        const p = fuente[Math.floor(Math.random() * fuente.length)];
        enTablaPostres.add(getPlateNameStr(p));
        return getPlateNameStr(p);
    }

    // Construir assignments desde la tabla
    const assignments = [];
    for (let i = 0; i < days.length; i++) {
        assignments.push({ day: days[i], slots: {
            comida1:    tabla[i][0],
            comida2:    tabla[i][1],
            postre:     elegirPostre(),
            cena1:      tabla[i][2],
            cena2:      tabla[i][3],
            cenaPostre: elegirPostre(),
        }});
    }

    // Aplicar al calendario actual
    const DAY_LABELS = { lunes:'Lunes', martes:'Martes', miercoles:'Miércoles', jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo' };
    const totalOps = assignments.length * 6;
    let op = 0;
    let saved = 0;

    showGenerationProgress(0, 'Calculando...');

    for (const { day, slots } of assignments) {
        showGenerationProgress(Math.round((op / totalOps) * 95), DAY_LABELS[day] || day);
        for (const [meal, value] of Object.entries(slots)) {
            try {
                const slot = document.querySelector(
                    `#weekTable .meal-slot[data-day="${day}"][data-meal="${meal}"]`
                );
                await saveMenu(day, meal, value || '', currentCalendar, null, { silent: true });
                if (slot) updateSlotWithArray(slot, value ? [value] : []);
                if (value) saved++;
            } catch (err) {
                console.error(`Error guardando ${day}/${meal}:`, err);
            }
            op++;
        }
    }

    showGenerationProgress(100, '¡Listo!');
    await new Promise(r => setTimeout(r, 500));
    hideGenerationProgress();

    showNotification(`✅ Menú generado (${season === 'todo' ? 'temporada mixta' : season})`, 'success');

    } catch (err) {
        hideGenerationProgress();
        showNotification('Error al generar el menú', 'error');
        console.error('generateRandomMenu error:', err);
    }
}

// ====================================
// VALORACIÓN DE COMBINACIONES (puntuación neta)
// ====================================

// { "Plato A|||Plato B": { score: N, lastReason: "..." } }
let comboScores = {};
let pendingRatingCtx = null;

const COMBO_REASONS = [
    '2 verduras juntas',
    '2 proteínas',
    'Muy contundente',
    'Sabores que no combinan',
    'No gusta',
    'Mejor como plato único',
];

function comboKey(primero, segundo) {
    return `${primero}|||${segundo}`;
}

async function loadComboRatings() {
    if (!db) return;
    try {
        const snap = await db.collection('combinations').doc('scores').get();
        if (snap.exists) {
            comboScores = snap.data().pairs || {};
        }
        refreshAllComboRatings();
    } catch (e) {
        console.warn('loadComboRatings error:', e);
    }
}

async function updateComboScore(primero, segundo, delta, reason) {
    const key = comboKey(primero, segundo);
    const current = comboScores[key] || { score: 0, lastReason: null };
    comboScores[key] = {
        score: current.score + delta,
        lastReason: reason || (delta < 0 ? current.lastReason : null),
        lastUpdated: Date.now(),
    };
    if (!db) return;
    try {
        // set+merge para evitar problemas con puntos en nombres de platos
        await db.collection('combinations').doc('scores').set(
            { pairs: { [key]: comboScores[key] } },
            { merge: true }
        );
    } catch (e) {
        console.warn('updateComboScore error:', e);
    }
}

function getComboScore(primero, segundo) {
    return comboScores[comboKey(primero, segundo)] || { score: 0, lastReason: null };
}

function getSlotText(day, meal) {
    const slot = document.querySelector(`#weekTable .meal-slot[data-day="${day}"][data-meal="${meal}"]`);
    return slot?.querySelector('.meal-text')?.textContent?.trim() || '';
}

function refreshComboRating(day, mealType) {
    const meal1 = mealType === 'comida' ? 'comida1' : 'cena1';
    const meal2 = mealType === 'comida' ? 'comida2' : 'cena2';

    const slot2El = document.querySelector(`#weekTable .meal-slot[data-day="${day}"][data-meal="${meal2}"]`);
    if (!slot2El) return;

    const td = slot2El.closest('td');
    if (!td) return;

    td.querySelector('.combo-float')?.remove();

    const name1 = getSlotText(day, meal1);
    const name2 = getSlotText(day, meal2);

    if (!name1 || !name2) return;

    const { score } = getComboScore(name1, name2);

    const float = document.createElement('div');
    float.className = 'combo-float';

    const upBtn = document.createElement('button');
    upBtn.className = 'combo-float-btn';
    upBtn.textContent = '👍';
    upBtn.title = 'Buena combinación (+1)';
    upBtn.addEventListener('click', e => { e.stopPropagation(); handleComboUp(day, mealType, name1, name2); });

    const downBtn = document.createElement('button');
    downBtn.className = 'combo-float-btn';
    downBtn.textContent = '👎';
    downBtn.title = 'No funcionó bien (−1)';
    downBtn.addEventListener('click', e => { e.stopPropagation(); handleComboDown(day, mealType, name1, name2); });

    float.appendChild(upBtn);

    if (score !== 0) {
        const scoreEl = document.createElement('span');
        scoreEl.className = `combo-score ${score > 0 ? 'score-pos' : 'score-neg'}`;
        scoreEl.textContent = score > 0 ? `+${score}` : `${score}`;
        float.appendChild(scoreEl);
    }

    float.appendChild(downBtn);

    td.style.position = 'relative';
    td.appendChild(float);
}

function refreshAllComboRatings() {
    const days = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
    days.forEach(day => {
        refreshComboRating(day, 'comida');
        refreshComboRating(day, 'cena');
    });
}

async function handleComboUp(day, mealType, name1, name2) {
    await updateComboScore(name1, name2, +1, null);
    refreshComboRating(day, mealType);
    const { score } = getComboScore(name1, name2);
    showNotification(`👍 Puntuación: ${score > 0 ? '+' : ''}${score}`, 'success');
}

function handleComboDown(day, mealType, name1, name2) {
    pendingRatingCtx = { day, mealType, name1, name2 };
    const modal = document.getElementById('ratingReasonModal');
    const desc  = document.getElementById('ratingComboDesc');
    const list  = document.getElementById('reasonList');

    desc.textContent = `${name1}  +  ${name2}`;
    list.innerHTML = '';
    COMBO_REASONS.forEach(reason => {
        const btn = document.createElement('button');
        btn.className   = 'reason-btn';
        btn.textContent = reason;
        btn.addEventListener('click', () => confirmComboRating(reason));
        list.appendChild(btn);
    });

    modal.style.display = 'block';
}

async function confirmComboRating(reason) {
    if (!pendingRatingCtx) return;
    const { day, mealType, name1, name2 } = pendingRatingCtx;
    closeRatingReasonModal();
    await updateComboScore(name1, name2, -1, reason);
    refreshComboRating(day, mealType);
    const { score } = getComboScore(name1, name2);
    showNotification(`👎 "${reason}" — Puntuación: ${score > 0 ? '+' : ''}${score}`, 'success');
}

function closeRatingReasonModal() {
    const modal = document.getElementById('ratingReasonModal');
    if (modal) modal.style.display = 'none';
    pendingRatingCtx = null;
}

// Añadir comida personalizada
async function addCustomFood() {
    const input = document.getElementById('customFood');
    const categorySelect = document.getElementById('categorySelect');
    const rawFoodName = input.value.trim();
    const foodName = normalizeFoodName(rawFoodName);
    const category = categorySelect.value;

    const invalidChars = getInvalidFoodChars(rawFoodName);
    if (invalidChars.length > 0) {
        showNotification(`Símbolos no permitidos: ${invalidChars.join(' ')}. Solo se permiten letras, espacios y guion (-)`, 'error');
        return;
    }

    if (rawFoodName && !foodName) {
        showNotification('Solo se permiten letras, espacios y guion (-)', 'error');
        return;
    }

    if (foodName && !isValidFoodName(foodName)) {
        showNotification('Formato inválido: usa palabras y solo guion (-)', 'error');
        return;
    }

    if (foodName) {
        // Verificar si ya existe en esta categoría
        const categoryIndex = CATEGORY_MAP[category];
        const categoryContainer = document.querySelectorAll('.category-items')[categoryIndex];
        const existingItem = Array.from(categoryContainer.querySelectorAll('.food-item-text'))
            .find(item => normalizeFoodName(item.textContent).toLocaleLowerCase('es') === foodName.toLocaleLowerCase('es'));

        if (existingItem) {
            showNotification('Este plato ya existe en esta categoría', 'error');
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
const customFoodInput = document.getElementById('customFood');
if (customFoodInput) {
    customFoodInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addCustomFood();
        }
    });
}

// ====================================
// NAVEGACIÓN DE CALENDARIOS
// ====================================

// Actualizar la interfaz de navegación
function updateCalendarNavigation() {
    // Obtener rango de fechas del calendario actual
    let dates, labelText;

    if (isMobileDevice && currentView === 'day') {
        // En vista de 1 día: mostrar solo la fecha de ese día
        dates = getMobileDates();
        const dayDate = dates[0];
        labelText = formatDateHeader(dayDate);
    } else if (isMobileDevice && currentView === 'three-days') {
        // En vista de 3 días: mostrar rango
        dates = getMobileDates();
        const startDate = formatDateHeader(dates[0]);
        const endDate = formatDateHeader(dates[2]);
        labelText = `(${startDate} - ${endDate})`;
    } else if (!isMobileDevice && currentView === 'daily') {
        // En desktop vista diaria: mostrar solo la fecha de ese día
        const today = getCurrentTestDate();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + (currentCalendar - 1));
        labelText = formatDateHeader(targetDate);
    } else {
        // Vista de semana completa
        const weekOffset = currentCalendar - 1;
        dates = getWeekDates(weekOffset);
        const startDate = formatDateHeader(dates[0]);
        const endDate = formatDateHeader(dates[6]);
        labelText = `(${startDate} - ${endDate})`;
    }

    // Actualizar label con las fechas
    document.getElementById('calendarLabel').textContent = labelText;

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
            if (currentView === 'daily') {
                updateTableForDailyView();
                applyDesktopView('daily');
                loadMenu();
            } else {
                updateTableHeaders();
            }
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
            if (currentView === 'daily') {
                updateTableForDailyView();
                applyDesktopView('daily');
                loadMenu();
            } else {
                updateTableHeaders();
            }
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
            // En desktop
            if (currentView === 'daily') {
                // En vista daily, actualizar la tabla y aplicar la vista
                updateTableForDailyView();
                applyDesktopView('daily');
                loadMenu();
            } else {
                updateTableHeaders();
            }
        }
    }
}

async function downloadMenuPDF() {
    if (isMobileDevice) {
        showNotification('La descarga PDF está disponible solo en la versión web', 'error');
        return;
    }

    const tableElement = document.getElementById('weekTable');
    if (!tableElement || typeof window.html2canvas === 'undefined' || !window.jspdf) {
        showNotification('No se pudo preparar el PDF. Recarga la página e inténtalo de nuevo.', 'error');
        return;
    }

    let exportWrapper = null;

    try {
        showNotification('Generando PDF...', 'info');

        const tableClone = tableElement.cloneNode(true);
        exportWrapper = document.createElement('div');
        exportWrapper.style.position = 'fixed';
        exportWrapper.style.left = '-10000px';
        exportWrapper.style.top = '0';
        exportWrapper.style.padding = '0';
        exportWrapper.style.margin = '0';
        exportWrapper.style.background = '#ffffff';
        exportWrapper.style.zIndex = '-1';
        exportWrapper.appendChild(tableClone);
        document.body.appendChild(exportWrapper);

        tableClone.style.width = `${tableElement.offsetWidth}px`;
        tableClone.style.borderCollapse = 'collapse';
        tableClone.style.tableLayout = 'fixed';
        tableClone.style.background = '#ffffff';

        tableClone.querySelectorAll('*').forEach(node => {
            node.style.setProperty('background', 'transparent', 'important');
            node.style.setProperty('background-image', 'none', 'important');
            node.style.setProperty('box-shadow', 'none', 'important');
            node.style.setProperty('color', '#111111', 'important');
            node.style.setProperty('text-shadow', 'none', 'important');
        });

        tableClone.querySelectorAll('th, td').forEach(cell => {
            cell.style.setProperty('border', '1px solid #222222', 'important');
            cell.style.setProperty('padding', '12px 6px', 'important');
            cell.style.setProperty('background', 'transparent', 'important');
        });

        tableClone.querySelectorAll('th').forEach(headerCell => {
            headerCell.style.setProperty('font-weight', '700', 'important');
            headerCell.style.setProperty('font-size', '22px', 'important');
            headerCell.style.setProperty('line-height', '1.2', 'important');
        });

        tableClone.querySelectorAll('.day-header').forEach(dayHeader => {
            dayHeader.style.setProperty('font-weight', '700', 'important');
            dayHeader.style.setProperty('font-size', '19px', 'important');
        });

        tableClone.querySelectorAll('.meal-text').forEach(mealText => {
            const textLength = (mealText.textContent || '').trim().length;

            let dynamicFontSize = 19;
            if (textLength > 48) {
                dynamicFontSize = 15;
            } else if (textLength > 36) {
                dynamicFontSize = 16;
            } else if (textLength > 26) {
                dynamicFontSize = 17;
            } else if (textLength > 18) {
                dynamicFontSize = 18;
            }

            mealText.style.setProperty('font-size', `${dynamicFontSize}px`, 'important');
            mealText.style.setProperty('font-weight', '700', 'important');
            mealText.style.setProperty('line-height', '1.15', 'important');
            mealText.style.setProperty('hyphens', 'none', 'important');
            mealText.style.setProperty('word-break', 'normal', 'important');
            mealText.style.setProperty('overflow-wrap', 'normal', 'important');
            mealText.style.setProperty('text-wrap', 'pretty', 'important');
            mealText.style.setProperty('text-align', 'center', 'important');
        });

        tableClone.querySelectorAll('.meal-slot').forEach(slot => {
            slot.style.setProperty('min-height', '106px', 'important');
            slot.style.setProperty('height', '106px', 'important');
            slot.style.setProperty('padding', '12px 4px', 'important');
            slot.style.setProperty('background', 'transparent', 'important');
        });

        tableClone.querySelectorAll('.meal-content').forEach(content => {
            content.style.setProperty('background', 'transparent', 'important');
            content.style.setProperty('border', 'none', 'important');
        });

        tableClone.querySelectorAll('.remove-btn, .meal-description-link, .daily-recipe-link, .daily-recipe-placeholder, .daily-comments-block, .daily-recipe-block').forEach(element => {
            element.style.setProperty('display', 'none', 'important');
        });
        tableClone.querySelectorAll('.combo-float').forEach(el => {
            el.style.setProperty('display', 'none', 'important');
        });

        const canvas = await window.html2canvas(exportWrapper, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
        });

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 4;
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - margin * 2;

        const imageWidth = canvas.width;
        const imageHeight = canvas.height;
        const imageRatio = imageWidth / imageHeight;

        let renderWidth = maxWidth;
        let renderHeight = renderWidth / imageRatio;

        if (renderHeight > maxHeight) {
            renderHeight = maxHeight;
            renderWidth = renderHeight * imageRatio;
        }

        const posX = (pageWidth - renderWidth) / 2;
        const posY = (pageHeight - renderHeight) / 2;
        const imageData = canvas.toDataURL('image/png');

        pdf.addImage(imageData, 'PNG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');

        const dateLabel = new Date().toISOString().slice(0, 10);
        pdf.save(`menu-semanal-${dateLabel}.pdf`);
        showNotification('PDF descargado correctamente', 'success');
    } catch (error) {
        console.error('Error generando PDF:', error);
        showNotification('Error al generar el PDF', 'error');
    } finally {
        if (exportWrapper && exportWrapper.parentNode) {
            exportWrapper.parentNode.removeChild(exportWrapper);
        }
    }
}

// Añadir nuevo calendario (desplaza los anteriores)
// Añadir nuevo calendario (desplaza los anteriores)
async function addNewCalendar(autoShift = false) {
    // Check if rotation lock is available
    const lockAcquired = await acquireRotationLock();
    if (!lockAcquired) {
        console.log('⏸️ Rotation already in progress by another user, skipping...');
        if (!autoShift) {
            showNotification('⏸️ Rotation in progress by another user, please wait...', 'info');
        }
        return;
    }

    if (!autoShift) {
        const confirmMsg = '¿Quieres crear un nuevo calendario?\n\n' +
            '⚠️ ATENCIÓN:\n' +
            '• El Calendario 1 será ELIMINADO permanentemente\n' +
            '• El Calendario 2 pasará a ser el 1\n' +
            '• El Calendario 3 pasará a ser el 2\n' +
            '• El Calendario 4 pasará a ser el 3\n' +
            '• Se creará un nuevo Calendario 4 (vacío)\n\n' +
            '✅ Se creará un backup automático antes de la rotación\n\n' +
            '¿Deseas continuar?';

        const confirmed = await showCustomConfirm(confirmMsg, 'Nuevo calendario');
        if (!confirmed) {
            await releaseRotationLock();
            return;
        }
    }

    isResetting = true;

    try {
        console.log('🔄 Starting calendar rotation...');
        
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
                    try {
                        allData[key] = JSON.parse(value);
                    } catch (e) {
                        console.error(`Error parsing ${key}:`, e);
                    }
                }
            }
        }

        // Create backup before rotation
        await createRotationBackup(allData);

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
            console.log('✅ Rotation data saved to Firebase');
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
            console.log('✅ Rotation data saved to localStorage');
        }

        // Log successful rotation
        await logRotation(true);

        // Ir al calendario 4 (el nuevo vacío) o al 1 si es auto-shift
        currentCalendar = autoShift ? 1 : 4;
        updateCalendarNavigation();
        updateTableHeaders();
        loadMenu();

        if (!autoShift) {
            showNotification('✅ Nuevo calendario creado correctamente', 'success');
        } else {
            console.log('✅ Auto-rotation completed successfully');
        }

    } catch (error) {
        console.error("❌ Error creating new calendar:", error);
        await logRotation(false, error);
        
        if (!autoShift) {
            showNotification('❌ Error al crear nuevo calendario', 'error');
        }
    } finally {
        // Release lock
        await releaseRotationLock();
        
        setTimeout(() => {
            isResetting = false;
        }, 500);
    }
}

// Reiniciar calendario actual
async function resetAllMeals() {
    if (!currentUser) {
        showNotification('Sin permiso de edición', 'error');
        return;
    }
    const confirmed = await showCustomConfirm(
        `¿Quieres limpiar el Calendario ${currentCalendar}?`,
        `Limpiar Calendario ${currentCalendar}`
    );

    if (confirmed) {
        if (isCopyMode) {
            const slots = document.querySelectorAll('.meal-slot');
            slots.forEach(slot => {
                slot.innerHTML = '';
                if (slot.dataset) {
                    slot.dataset.foods = '[]';
                }
            });
            captureCopySnapshot();
            updateCopyButtonsVisibility();
            return;
        }

        // Activar flag para evitar que la sincronización interfiera
        isResetting = true;

        try {
            // Limpiar todas las casillas del menú actual
            const slots = document.querySelectorAll('.meal-slot');

            slots.forEach(slot => {
                slot.innerHTML = '';
                // Limpiar localStorage de cada casilla del calendario actual
                const key = `cal${currentCalendar}-${slot.dataset.day}-${slot.dataset.meal}`;
                localStorage.removeItem(key);
            });

            // Limpiar Firebase (solo el calendario actual)
            if (isFirebaseConfigured) {
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
            }

            // Mensaje de confirmación
            showNotification(`Calendario ${currentCalendar} limpiado correctamente`, 'success');
        } catch (error) {
            console.error("Error durante el reset:", error);
            showNotification('Error al reiniciar el menú', 'error');
        } finally {
            // Desactivar flag después de un breve delay
            setTimeout(() => {
                isResetting = false;
            }, 500);
        }
    }
}

// ====================================
// FUNCIONALIDAD DE MODAL PARA MÓVILES
// ====================================

let currentSlot = null;
let isModalOpening = false; // Flag para prevenir múltiples aperturas simultáneas
let replaceTargetFoodName = null;

// Las instrucciones ya están configuradas para click (funciona en todos los dispositivos)

// Abrir modal de selección de comidas
async function openFoodModal(slot, replaceFoodName = null) {
    // Prevenir múltiples llamadas simultáneas
    if (isModalOpening) {
        console.log('Modal ya se está abriendo, ignorando llamada duplicada');
        return;
    }
    
    isModalOpening = true;
    console.log('openFoodModal called for:', slot.dataset.day, slot.dataset.meal);
    
    try {
        currentSlot = slot;
        replaceTargetFoodName = typeof replaceFoodName === 'string' ? replaceFoodName : null;
        const modal = document.getElementById('foodModal');
        const modalFoods = document.getElementById('modalFoods');
        const searchInput = document.getElementById('modalSearchInput');
        const modalFixedCategoryTitle = document.getElementById('modalFixedCategoryTitle');
        const clearSlotBtn = document.getElementById('modalClearSlotBtn');
        const categoryTitles = {
            'primeros': '🥗 Primeros', 'segundos': '🍗 Segundos',
            'unico': '🍲 Plato Único', 'postres': '🍮 Postres',
            ...SUBCATEGORY_LABELS
        };

    function normalizeText(text) {
        return (text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function updateFixedCategoryTitle() {
        const visibleCategories = [...modalFoods.querySelectorAll('.modal-category:not(.hidden-by-search)')];

        if (visibleCategories.length === 0) {
            modalFixedCategoryTitle.textContent = 'Sin resultados';
            return;
        }

        const labels = visibleCategories.map(category => {
            const key = category.dataset.category;
            return categoryTitles[key] || key;
        });

        modalFixedCategoryTitle.textContent = labels.join(' • ');
    }

    function applyModalFoodFilter(searchValue) {
        const normalizedQuery = normalizeText(searchValue.trim());
        const categories = modalFoods.querySelectorAll('.modal-category');

        categories.forEach(category => {
            const foodItems = category.querySelectorAll('.modal-food-item');
            let visibleCount = 0;

            foodItems.forEach(item => {
                const itemName = normalizeText(item.textContent);
                const matches = normalizedQuery.length === 0 || itemName.includes(normalizedQuery);

                item.classList.toggle('hidden-by-search', !matches);
                if (matches) {
                    visibleCount++;
                }
            });

            category.classList.toggle('hidden-by-search', visibleCount === 0);

            // Auto-expandir categorías con resultados al buscar
            if (normalizedQuery.length > 0 && visibleCount > 0) {
                category.classList.remove('collapsed');
                const arrow = category.querySelector('.category-arrow');
                if (arrow) arrow.textContent = '▲';
            }
        });

        updateFixedCategoryTitle();
    }

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
        'cena2': 'Segundo',
        'cenaPostre': 'Postre'
    };

    document.getElementById('modalTitle').textContent = `${dayNames[day]} - ${mealNames[meal]}`;

    // Limpiar contenido anterior COMPLETAMENTE
    modalFoods.innerHTML = '';
    searchInput.value = '';
    modalFixedCategoryTitle.textContent = '';
    searchInput.oninput = (event) => {
        applyModalFoodFilter(event.target.value);
    };
    
    // Pequeño delay para asegurar que la limpieza se complete
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verificar si hay platos disponibles
    if (!customFoodsGlobal || Object.keys(customFoodsGlobal).length === 0) {
        const emptyState = document.createElement('div');
        emptyState.style.padding = '20px';
        emptyState.style.textAlign = 'center';
        emptyState.style.color = '#999';
        emptyState.innerHTML = 'No hay platos disponibles. <a href="gestion-platos.html" style="color: #4CAF50;">Crea algunos platos primero</a>.';
        modalFoods.appendChild(emptyState);
        modal.style.display = 'block';
        return;
    }

    const normalizeFoodsArray = (value) => {
        if (Array.isArray(value)) {
            return value;
        }
        if (value && Array.isArray(value.data)) {
            return value.data;
        }
        return [];
    };

    // Obtener platos ya añadidos en este slot
    const existingPlates = [];
    const candidates = getMenuKeyCandidatesFromSlot(slot, meal);
    if (isCopyMode) {
        const foodsArray = getCopyFoodsArrayForSlot(slot, meal);
        foodsArray.forEach(food => {
            const plateName = typeof food === 'string' ? food : food.name;
            if (plateName) existingPlates.push(plateName);
        });
    } else {
        let menuData = candidates
            .map(candidateKey => localStorage.getItem(candidateKey))
            .find(value => value);
        
        // Intentar cargar desde Firebase si está configurado
        if (isFirebaseConfigured) {
            try {
                const doc = await db.collection('menus').doc(MENU_DOC_ID).get();
                if (doc.exists) {
                    const data = doc.data();
                    const foundKey = candidates.find(candidateKey => data[candidateKey]);
                    if (foundKey) {
                        menuData = JSON.stringify(data[foundKey]);
                    }
                }
            } catch (error) {
                console.log('Error cargando desde Firebase, usando localStorage', error);
            }
        }
        
        if (menuData) {
            try {
                const parsed = JSON.parse(menuData);
                const foodsArray = normalizeFoodsArray(parsed);
                foodsArray.forEach(food => {
                    const plateName = typeof food === 'string' ? food : food.name;
                    if (plateName) existingPlates.push(plateName);
                });
            } catch (e) {
                console.error('Error parsing existing plates:', e);
            }
        }
    }

    if (clearSlotBtn) {
        clearSlotBtn.disabled = existingPlates.length === 0;
    }

    // Determinar grupos a mostrar según tipo de comida
    const modalGroups = MODAL_GROUPS_BY_MEAL[meal] || [];
    const hasMultipleGroups = modalGroups.length > 1;

    let hasPlates = false;
    const visibleGroupTitles = [];

    modalGroups.forEach((group, groupIndex) => {
        // Recoger platos de todas las subcategorías del grupo
        const groupPlates = [];
        group.cats.forEach(subcat => {
            const subcatPlates = (customFoodsGlobal[subcat] || [])
                .filter(plate => {
                    const plateName = typeof plate === 'string' ? plate : plate.name;
                    if (!existingPlates.includes(plateName)) return true;
                    return !!replaceTargetFoodName && plateName === replaceTargetFoodName;
                })
                .sort((a, b) => {
                    const nameA = (typeof a === 'string' ? a : a.name).toLowerCase();
                    const nameB = (typeof b === 'string' ? b : b.name).toLowerCase();
                    return nameA.localeCompare(nameB, 'es');
                });
            if (subcatPlates.length > 0) {
                groupPlates.push({ subcat, plates: subcatPlates });
            }
        });

        if (groupPlates.length === 0) return;

        hasPlates = true;
        visibleGroupTitles.push(group.title);

        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'modal-category';
        categoryDiv.dataset.category = group.key;

        // Encabezado de grupo colapsable cuando hay múltiples grupos
        if (hasMultipleGroups) {
            const startExpanded = groupIndex === 0;
            if (!startExpanded) categoryDiv.classList.add('collapsed');

            const categoryTitle = document.createElement('div');
            categoryTitle.className = 'modal-category-title';
            categoryTitle.innerHTML = `
                <span class="category-title-text">${group.title}</span>
                <span class="category-arrow">${startExpanded ? '▲' : '▼'}</span>
            `;
            categoryTitle.style.cssText = 'cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:12px 15px;background:#f5f5f5;border-radius:6px;margin-bottom:8px;font-weight:600;';
            categoryTitle.onclick = function() {
                const isCollapsed = categoryDiv.classList.toggle('collapsed');
                categoryTitle.querySelector('.category-arrow').textContent = isCollapsed ? '▼' : '▲';
            };
            categoryDiv.appendChild(categoryTitle);
        }

        // Añadir platos agrupados por subcategoría con sub-etiqueta
        groupPlates.forEach(({ subcat, plates }) => {
            const showSubLabel = group.cats.filter(c => (customFoodsGlobal[c] || []).length > 0).length > 1;
            if (showSubLabel) {
                const subLabelEl = document.createElement('div');
                subLabelEl.className = 'modal-subcategory-label';
                subLabelEl.textContent = SUBCATEGORY_LABELS[subcat];
                categoryDiv.appendChild(subLabelEl);
            }
            plates.forEach(plate => {
                const foodName = typeof plate === 'string' ? plate : plate.name;
                const foodDiv = document.createElement('div');
                foodDiv.className = 'modal-food-item';
                foodDiv.textContent = foodName;
                foodDiv.onclick = () => selectFood(foodName);
                categoryDiv.appendChild(foodDiv);
            });
        });

        modalFoods.appendChild(categoryDiv);
    });

    modalFixedCategoryTitle.textContent = visibleGroupTitles.length > 0
        ? visibleGroupTitles.join(' • ')
        : 'Sin categorías disponibles';

    if (!hasPlates) {
        const emptyState = document.createElement('div');
        emptyState.style.padding = '20px';
        emptyState.style.textAlign = 'center';
        emptyState.style.color = '#999';
        emptyState.innerHTML = 'No hay más platos disponibles. <a href="gestion-platos.html" style="color: #4CAF50;">Crea más platos</a> o elimina algunos platos ya añadidos.';
        modalFoods.appendChild(emptyState);
    }

    updateFixedCategoryTitle();

    // Mostrar modal
    modal.style.display = 'block';
    if (!isMobileDevice) {
        setTimeout(() => searchInput.focus(), 50);
    }
    
    } finally {
        // Liberar el flag después de un pequeño delay
        setTimeout(() => {
            isModalOpening = false;
        }, 300);
    }
}

// Cerrar modal
function closeFoodModal() {
    const modal = document.getElementById('foodModal');
    modal.style.display = 'none';
    currentSlot = null;
    replaceTargetFoodName = null;
    isModalOpening = false; // Asegurar que el flag se resetea
}

async function clearCurrentSlotFromModal() {
    if (!currentSlot) {
        return;
    }

    const slot = currentSlot;
    const { date } = getMenuKeyFromSlot(slot);
    const candidates = getMenuKeyCandidatesFromSlot(slot);

    if (isCopyMode) {
        updateSlotWithArray(slot, []);
        await saveMenu(slot.dataset.day, slot.dataset.meal, [], null, date);
        closeFoodModal();
        return;
    }

    updateSlotWithArray(slot, []);
    candidates.forEach(candidateKey => localStorage.removeItem(candidateKey));

    if (isFirebaseConfigured) {
        try {
            const deletePayload = {};
            candidates.forEach(candidateKey => {
                deletePayload[candidateKey] = firebase.firestore.FieldValue.delete();
            });
            await db.collection('menus').doc(MENU_DOC_ID).update(deletePayload);
        } catch (error) {
            console.error('Error borrando casilla en Firebase:', error);
            await saveMenu(slot.dataset.day, slot.dataset.meal, [], null, date);
        }
    }

    closeFoodModal();
}

// Seleccionar comida y añadirla al slot
async function selectFood(foodName) {
    if (currentSlot) {
        const normalizeFoodsArray = (value) => {
            if (Array.isArray(value)) {
                return value;
            }
            if (value && Array.isArray(value.data)) {
                return value.data;
            }
            return [];
        };

        // Leer datos actuales
        const { date } = getMenuKeyFromSlot(currentSlot);
        const candidates = getMenuKeyCandidatesFromSlot(currentSlot);
        let foodsArray = [];

        if (isCopyMode) {
            foodsArray = getCopyFoodsArrayForSlot(currentSlot);
        } else {
            // Cargar array actual
            if (isFirebaseConfigured) {
                try {
                    const doc = await db.collection('menus').doc(MENU_DOC_ID).get();
                    if (doc.exists) {
                        const data = doc.data();
                        const foundKey = candidates.find(candidateKey => data[candidateKey]);
                        if (foundKey) {
                            foodsArray = normalizeFoodsArray(data[foundKey]);
                        }
                    }
                } catch (error) {
                    const saved = candidates
                        .map(candidateKey => localStorage.getItem(candidateKey))
                        .find(value => value);
                    if (saved) foodsArray = normalizeFoodsArray(JSON.parse(saved));
                }
            } else {
                const saved = candidates
                    .map(candidateKey => localStorage.getItem(candidateKey))
                    .find(value => value);
                if (saved) foodsArray = normalizeFoodsArray(JSON.parse(saved));
            }
        }

        // Verificar si el plato ya está en el slot
        const alreadyExists = foodsArray.some(food => {
            const name = typeof food === 'string' ? food : food.name;

            if (replaceTargetFoodName && name === replaceTargetFoodName) {
                return false;
            }

            return name === foodName;
        });

        if (alreadyExists) {
            showNotification('Este plato ya está añadido en esta casilla', 'error');
            return;
        }

        // Buscar el plato completo con descripción
        const fullPlate = findPlateByName(foodName);

        if (replaceTargetFoodName) {
            const replaceIndex = foodsArray.findIndex(food => {
                const name = typeof food === 'string' ? food : food.name;
                return name === replaceTargetFoodName;
            });

            if (replaceIndex >= 0) {
                foodsArray[replaceIndex] = fullPlate;
            } else {
                foodsArray.push(fullPlate);
            }
        } else {
            foodsArray.push(fullPlate);
        }

        updateSlotWithArray(currentSlot, foodsArray);
        await saveMenu(currentSlot.dataset.day, currentSlot.dataset.meal, foodsArray, null, date);

        // Si es plato único → ocupa ambos slots del turno y bloquea el segundo
        const slotMeal = currentSlot.dataset.meal;
        if (findPlateCategory(foodName)?.startsWith('unico_') && (slotMeal === 'comida1' || slotMeal === 'cena1')) {
            const day = currentSlot.dataset.day;
            const cal = currentSlot.dataset.calendar;
            const isPair = slotMeal === 'comida1';
            const slot1Key = isPair ? 'comida1' : 'cena1';
            const slot2Key = isPair ? 'comida2' : 'cena2';
            const slot1 = document.querySelector(`.meal-slot[data-day="${day}"][data-meal="${slot1Key}"]${cal ? `[data-calendar="${cal}"]` : ''}`);
            const slot2 = document.querySelector(`.meal-slot[data-day="${day}"][data-meal="${slot2Key}"]${cal ? `[data-calendar="${cal}"]` : ''}`);
            const platoUnicoArray = [fullPlate];
            if (slot1) { updateSlotWithArray(slot1, platoUnicoArray); await saveMenu(day, slot1Key, platoUnicoArray, cal ? Number(cal) : null, date); }
            if (slot2) { updateSlotWithArray(slot2, platoUnicoArray); slot2.classList.add('slot-unico-blocked'); await saveMenu(day, slot2Key, platoUnicoArray, cal ? Number(cal) : null, date); }
        }

        closeFoodModal();
    }
}

// Cerrar modal al hacer click fuera
window.addEventListener('click', function(event) {
    const modal = document.getElementById('foodModal');
    const confirmModal = document.getElementById('customConfirmModal');
    if (event.target == modal) {
        closeFoodModal();
    }

    if (event.target == confirmModal) {
        resolveCustomConfirm(false);
    }
});

// Agregar evento de click a las casillas (compatible con móvil y web)
let slotHandlersInitialized = false;

function setupSlotClickHandlers() {
    // Prevenir múltiples inicializaciones
    if (slotHandlersInitialized) {
        return;
    }
    slotHandlersInitialized = true;
    
    let touchHandled = false;

    function getReplaceTargetFoodName(slot, eventTarget) {
        const clickedMealContent = eventTarget ? eventTarget.closest('.meal-content') : null;
        const clickedMealTextNode = clickedMealContent ? clickedMealContent.querySelector('.meal-text') : null;

        if (clickedMealTextNode && clickedMealTextNode.textContent) {
            return clickedMealTextNode.textContent.trim();
        }

        const firstMealTextNode = slot.querySelector('.meal-content .meal-text');
        return firstMealTextNode ? firstMealTextNode.textContent.trim() : null;
    }
    
    // Para móviles - usar touchstart
    document.addEventListener('touchstart', (e) => {
        const modal = document.getElementById('foodModal');
        
        // No procesar si el modal está abierto y el click es dentro del modal
        if (modal.style.display === 'block' && modal.contains(e.target)) {
            return;
        }
        
        const slot = e.target.closest('.meal-slot');
        
        if (slot) {
            if (slot.classList.contains('slot-disabled') || !currentUser) {
                return;
            }

            if (!e.target.classList.contains('remove-btn') &&
                !e.target.closest('.remove-btn') &&
                !e.target.classList.contains('meal-description-link') &&
                !e.target.closest('.meal-description-link')) {
                const hasContent = !!slot.querySelector('.meal-content');
                const replaceFoodName = hasContent ? getReplaceTargetFoodName(slot, e.target) : null;
                touchHandled = true;
                setTimeout(() => { touchHandled = false; }, 500);
                openFoodModal(slot, replaceFoodName);
            }
        }
    }, { passive: true });
    
    // Para escritorio - usar click
    document.addEventListener('click', (e) => {
        // Evitar doble activación en dispositivos táctiles
        if (touchHandled) {
            return;
        }
        
        const modal = document.getElementById('foodModal');
        
        if (modal.style.display === 'block' && modal.contains(e.target)) {
            return;
        }
        
        const slot = e.target.closest('.meal-slot');
        
        if (slot) {
            if (slot.classList.contains('slot-disabled') || !currentUser) {
                return;
            }

            if (!e.target.classList.contains('remove-btn') &&
                !e.target.closest('.remove-btn') &&
                !e.target.classList.contains('meal-description-link') &&
                !e.target.closest('.meal-description-link')) {
                const hasContent = !!slot.querySelector('.meal-content');
                const replaceFoodName = hasContent ? getReplaceTargetFoodName(slot, e.target) : null;
                openFoodModal(slot, replaceFoodName);
            }
        }
    });
}

// Inicializar los event handlers
// Se llama después de cargar el DOM

// ====================================
// INICIALIZACIÓN
// ====================================

// Inicializar controles de vista según el dispositivo
function initViewControls() {
    const viewControls = document.getElementById('viewControls');
    if (!viewControls) {
        return;
    }
    const controlsHTML = isMobileDevice
        ? `
            <button class="view-btn" data-view="day" onclick="changeView('day')">Hoy</button>
            <button class="view-btn" data-view="three-days" onclick="changeView('three-days')">3 Días</button>
          `
        : `
            <button class="view-btn active" data-view="single-week" onclick="changeView('single-week')">Semanal</button>
                        <button class="view-btn" data-view="daily" onclick="changeView('daily')">Diario</button>
          `;

    viewControls.innerHTML = '<span class="view-controls-label">Vista:</span>' + controlsHTML;

    // En móvil, activar por defecto la vista "Hoy"
    if (isMobileDevice) {
        setTimeout(() => changeView('day'), 100);
    }
}

// Cargar datos al iniciar
initCopyModeFromRoute();
initThemeMode();
initViewControls();
updateTableHeaders();
checkAndAutoShift();
loadMenu();
loadCustomFoodsFromDB();
updateCalendarNavigation();
updateCopyButtonsVisibility();

// Inicializar eventos de click DESPUÉS de que todo esté cargado
setupSlotClickHandlers();

// ── Definir Platos ────────────────────────────────────────────────────────────
let _definirList = [];   // [{cat, idx}] — lista plana de todos los platos
let _definirIdx  = 0;

function abrirDefinirModal() {
    _definirList = [];
    for (const cat of ALL_CATEGORIES) {
        const plates = customFoodsGlobal[cat] || [];
        plates.forEach((_, i) => _definirList.push({ cat, i }));
    }
    if (!_definirList.length) {
        showNotification('No hay platos definidos', 'warning');
        return;
    }
    _definirIdx = 0;
    _cargarDefinirPlato();
    document.getElementById('definirModal').style.display = 'flex';
}

function cerrarDefinirModal() {
    document.getElementById('definirModal').style.display = 'none';
}

function definirOverlayClick(e) {
    if (e.target === e.currentTarget) cerrarDefinirModal();
}

function _cargarDefinirPlato() {
    const { cat, i } = _definirList[_definirIdx];
    const plate = customFoodsGlobal[cat][i];
    const name = typeof plate === 'string' ? plate : (plate?.name || '—');
    document.getElementById('definirCounter').textContent   = `${_definirIdx + 1} / ${_definirList.length}`;
    document.getElementById('definirPlateName').textContent = name;
    document.getElementById('chkSinGluten').checked    = !!(plate?.sinGluten);
    document.getElementById('chkSinLactosa').checked   = !!(plate?.sinLactosa);
    document.getElementById('chkPrefCena').checked     = !!(plate?.prefCena);
    document.getElementById('chkVegano').checked       = !!(plate?.vegano);
    document.getElementById('chkVegetariano').checked  = !!(plate?.vegetariano);
}

function _recogerFlags() {
    return {
        sinGluten:   document.getElementById('chkSinGluten').checked,
        sinLactosa:  document.getElementById('chkSinLactosa').checked,
        prefCena:    document.getElementById('chkPrefCena').checked,
        vegano:      document.getElementById('chkVegano').checked,
        vegetariano: document.getElementById('chkVegetariano').checked,
    };
}

async function guardarDefinirPlato() {
    const { cat, i } = _definirList[_definirIdx];
    const plate = customFoodsGlobal[cat][i];
    const flags = _recogerFlags();
    customFoodsGlobal[cat][i] = typeof plate === 'string'
        ? { name: plate, ...flags }
        : { ...plate, ...flags };
    try {
        await db.collection('foods').doc(CUSTOM_FOODS_DOC_ID).set({ customFoods: customFoodsGlobal });
        showNotification('✅ Guardado', 'success');
    } catch (e) {
        showNotification('❌ Error guardando', 'error');
    }
}

async function siguienteDefinirPlato() {
    await guardarDefinirPlato();
    if (_definirIdx < _definirList.length - 1) {
        _definirIdx++;
        _cargarDefinirPlato();
    } else {
        cerrarDefinirModal();
        showNotification('✅ Todos los platos definidos', 'success');
    }
}

// ── Estado del botón aleatorio: se actualiza cuando cambia el contenido de la tabla
const weekTableEl = document.getElementById('weekTable');
if (weekTableEl) {
    new MutationObserver(updateRandomBtnState).observe(weekTableEl, { childList: true, subtree: true });
}

// Initialize sync status
updateSyncStatusUI();

// Monitor Firebase connection status
if (isFirebaseConfigured) {
    // Monitor connection status
    const connectedRef = db.collection('__connection_status__').doc('test');
    
    // Try to detect online/offline status
    window.addEventListener('online', () => {
        console.log('🌐 Network online');
        syncStatus = 'syncing';
        updateSyncStatusUI();
        loadMenu(); // Reload from Firebase
    });
    
    window.addEventListener('offline', () => {
        console.log('📡 Network offline');
        syncStatus = 'offline';
        updateSyncStatusUI();
        showNotification('⚠️ Connection lost - working offline', 'warning');
    });
    
    // Periodic sync check every 5 minutes
    setInterval(() => {
        if (navigator.onLine && isFirebaseConfigured) {
            console.log('🔄 Periodic sync check...');
            loadMenu();
        }
    }, 300000); // 5 minutes
}

// Verificar cada hora si hay que auto-desplazar
setInterval(() => {
    checkAndAutoShift();
}, 3600000); // 1 hora

// ====================================
// MIGRACIÓN DE DATOS (EJECUTAR UNA SOLA VEZ)
// ====================================
async function migrateCalendarDays(direction = 'forward') {
    if (!isFirebaseConfigured) {
        console.error('❌ Firebase no configurado. No se puede migrar.');
        return;
    }
    
    const isForward = direction === 'forward';
    const label = isForward ? 'adelante' : 'atrás';
    console.log(`🔄 Iniciando migración de días (${label})...`);
    
    const dayMap = isForward
        ? {
            'lunes': 'martes',
            'martes': 'miercoles',
            'miercoles': 'jueves',
            'jueves': 'viernes',
            'viernes': 'sabado',
            'sabado': 'domingo',
            'domingo': 'lunes'
        }
        : {
            'lunes': 'domingo',
            'martes': 'lunes',
            'miercoles': 'martes',
            'jueves': 'miercoles',
            'viernes': 'jueves',
            'sabado': 'viernes',
            'domingo': 'sabado'
        };
    
    try {
        const doc = await db.collection('menus').doc(MENU_DOC_ID).get();
        if (!doc.exists) {
            console.log('⚠️ No hay datos para migrar');
            return;
        }
        
        const oldData = doc.data();
        const newData = {};
        let migrationCount = 0;
        
        console.log('📊 Datos originales en Firebase:');
        Object.keys(oldData).forEach(key => {
            console.log(`  ${key}`);
        });
        
        console.log('\n🔄 Aplicando migración...');
        Object.keys(oldData).forEach(key => {
            // Parse: cal1-martes-comida1 → cal, day, meal
            const match = key.match(/^(cal\d+)-(\w+)-(.+)$/);
            if (match) {
                const [, cal, oldDay, meal] = match;
                const newDay = dayMap[oldDay] || oldDay;
                const newKey = `${cal}-${newDay}-${meal}`;
                newData[newKey] = oldData[key];
                console.log(`  ✅ ${key} → ${newKey}`);
                migrationCount++;
            } else {
                // Mantener claves que no coinciden con el patrón
                newData[key] = oldData[key];
                console.log(`  ⚠️ ${key} (sin cambios - formato no reconocido)`);
            }
        });
        
        console.log(`\n💾 Creando backup antes de migrar...`);
        await db.collection('menu-backups').add({
            data: oldData,
            timestamp: Date.now(),
            date: new Date().toISOString(),
            reason: `pre-migration-backup-day-shift-${direction}`
        });
        console.log('✅ Backup creado exitosamente');
        
        console.log(`\n📝 Escribiendo datos migrados a Firebase...`);
        await db.collection('menus').doc(MENU_DOC_ID).set(newData);
        console.log(`✅ Migración completada (${label}) exitosamente (${migrationCount} claves migradas)`);
        
        console.log('\n📊 Datos migrados en Firebase:');
        Object.keys(newData).forEach(key => {
            console.log(`  ${key}`);
        });
        
        console.log('\n🔄 Recargando menú...');
        await loadMenu();
        
        showNotification(`✅ Migración ${label} completada - Datos actualizados`, 'success');
        
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        showNotification('❌ Error en la migración - Ver consola', 'error');
    }
}

// Exponer funciones globalmente para ejecutarlas desde consola
window.migrateCalendarDays = migrateCalendarDays;
window.migrateCalendarDaysForward = () => migrateCalendarDays('forward');
window.migrateCalendarDaysBackward = () => migrateCalendarDays('backward');

// ── Recetas Internacionales (Edamam Recipe Search API) ────────────────────────
const _CAT_ES = {
    'Beef':'Ternera','Chicken':'Pollo','Dessert':'Postres','Lamb':'Cordero',
    'Miscellaneous':'Varios','Pasta':'Pasta','Pork':'Cerdo','Seafood':'Mariscos',
    'Side':'Guarnición','Starter':'Entrante','Vegan':'Vegano','Vegetarian':'Vegetariano',
    'Breakfast':'Desayuno','Goat':'Cabra'
};
const _AREA_ES = {
    'American':'Americana','British':'Británica','Canadian':'Canadiense','Chinese':'China',
    'Croatian':'Croata','Dutch':'Holandesa','Egyptian':'Egipcia','Filipino':'Filipina',
    'French':'Francesa','Greek':'Griega','Indian':'India','Irish':'Irlandesa',
    'Italian':'Italiana','Jamaican':'Jamaicana','Japanese':'Japonesa','Kenyan':'Keniana',
    'Malaysian':'Malaya','Mexican':'Mexicana','Moroccan':'Marroquí','Polish':'Polaca',
    'Portuguese':'Portuguesa','Russian':'Rusa','Spanish':'Española','Thai':'Tailandesa',
    'Tunisian':'Tunecina','Turkish':'Turca','Ukrainian':'Ucraniana',
    'Uruguayan':'Uruguaya','Vietnamese':'Vietnamita'
};

let _recetasSeleccionada = null;
let _recetasCurrentUrl   = null;
let _recetasPool = [];
let _recetasShown = new Set();
let _translCache = {};       // caché en memoria (cargado desde Firebase al abrir)
let _translDirty = new Set(); // nombres nuevos pendientes de guardar

async function _loadTranslCache() {
    try {
        const snap = await db.collection('translations').doc('recipe-names').get();
        _translCache = snap.exists ? (snap.data() || {}) : {};
    } catch(e) { _translCache = {}; }
}

async function _saveTranslCache() {
    if (!_translDirty.size) return;
    const updates = {};
    _translDirty.forEach(k => { updates[k] = _translCache[k]; });
    _translDirty.clear();
    try {
        await db.collection('translations').doc('recipe-names').set(updates, { merge: true });
    } catch(e) {}
}

function _isBadTranslation(text) {
    const l = String(text || '').toLowerCase();
    return l.includes('mymemory') || l.includes('quota') ||
           l.includes('daily limit') || l.includes('unavailable');
}

async function _translateText(text) {
    const cached = _translCache[text];
    if (cached && !_isBadTranslation(cached)) return cached;
    try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|es`);
        const data = await res.json();
        const translated = data.responseData?.translatedText || '';
        // Descartar si es un mensaje de error/aviso de MyMemory
        if (!translated || translated.toLowerCase().includes('mymemory') || translated.toLowerCase().includes('limit')) {
            return text;
        }
        if (translated !== text) {
            _translCache[text] = translated;
            _translDirty.add(text);
            _saveTranslCache();
        }
        return translated;
    } catch(e) { return text; }
}

async function abrirRecetasModal() {
    document.getElementById('recetasModal').classList.add('open');
    if (!Object.keys(_translCache).length) await _loadTranslCache();
    await _cargarFiltrosRecetas();
}

function cerrarRecetasModal() {
    document.getElementById('recetasModal').classList.remove('open');
    _recetasSeleccionada = null;
    _recetasCurrentUrl   = null;
    _recetasPool = [];
    _recetasShown = new Set();
    document.getElementById('recetasDayPicker').style.display = 'none';
    document.getElementById('recetasResultados').innerHTML = '';
}

function recetasOverlayClick(e) {
    if (e.target === e.currentTarget) cerrarRecetasModal();
}

function setRecetasTab(tab) {
    document.querySelectorAll('.recetas-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.recetas-search-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById(`recetasPanel${tab}`).classList.remove('hidden');
    document.getElementById('recetasResultados').innerHTML = '';
    document.getElementById('recetasDayPicker').style.display = 'none';
}

async function _cargarFiltrosRecetas() {
    try {
        const [catRes, areaRes] = await Promise.all([
            fetch('https://www.themealdb.com/api/json/v1/1/categories.php'),
            fetch('https://www.themealdb.com/api/json/v1/1/list.php?a=list')
        ]);
        const catData  = await catRes.json();
        const areaData = await areaRes.json();

        document.getElementById('recetasCategoriaSelect').innerHTML =
            '<option value="">Selecciona una categoría...</option>' +
            (catData.categories || []).map(c =>
                `<option value="${c.strCategory}">${_CAT_ES[c.strCategory] || c.strCategory}</option>`
            ).join('');

        document.getElementById('recetasPaisSelect').innerHTML =
            '<option value="">Selecciona un país...</option>' +
            (areaData.meals || []).map(a =>
                `<option value="${a.strArea}">${_AREA_ES[a.strArea] || a.strArea}</option>`
            ).join('');
    } catch(e) {
        console.warn('Error cargando filtros:', e);
    }
}

async function buscarRecetasPorCategoria() {
    const val = document.getElementById('recetasCategoriaSelect').value;
    if (!val) return;
    await _buscarYMostrar(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(val)}`);
}

async function buscarRecetasPorPais() {
    const val = document.getElementById('recetasPaisSelect').value;
    if (!val) return;
    await _buscarYMostrar(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(val)}`);
}

async function buscarRecetasPorIngrediente() {
    const val = document.getElementById('recetasIngredienteInput').value.trim();
    if (!val) { showNotification('Escribe un ingrediente', 'warning'); return; }
    await _buscarYMostrar(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(val)}`);
}

async function _buscarYMostrar(url) {
    _recetasCurrentUrl = url;
    _recetasPool  = [];
    _recetasShown = new Set();
    const grid   = document.getElementById('recetasResultados');
    document.getElementById('recetasDayPicker').style.display = 'none';
    _recetasSeleccionada = null;
    grid.innerHTML = '<div class="recetas-loading">⏳ Cargando recetas...</div>';
    try {
        const res  = await fetch(url);
        const data = await res.json();
        _recetasPool = data.meals || [];
        if (!_recetasPool.length) {
            grid.innerHTML = '<div class="recetas-empty">No se encontraron recetas.</div>';
            return;
        }
        grid.innerHTML = '';
        await _mostrarSiguientes8();
    } catch(e) {
        grid.innerHTML = '<div class="recetas-empty">❌ Error cargando recetas.</div>';
    }
}

async function _mostrarSiguientes8() {
    const grid = document.getElementById('recetasResultados');
    const disponibles = _recetasPool.filter(m => !_recetasShown.has(m.idMeal));
    if (!disponibles.length) { _recetasShown = new Set(); return _mostrarSiguientes8(); }

    const seleccion = disponibles.sort(() => Math.random() - 0.5).slice(0, 8);
    seleccion.forEach(m => _recetasShown.add(m.idMeal));

    const nombres = await Promise.all(seleccion.map(m => _translateText(m.strMeal)));

    grid.innerHTML = '';
    seleccion.forEach((meal, i) => {
        const nombre = nombres[i] || meal.strMeal;
        const card   = document.createElement('div');
        card.className = 'receta-card';
        card.onclick = () => _seleccionarReceta(nombre, meal.strMeal, card);
        card.innerHTML = `
            <img src="${meal.strMealThumb}/preview" alt="${nombre}" loading="lazy" style="width:100%;height:90px;object-fit:cover;display:block;">
            <div style="padding:5px 7px 4px;font-size:0.75rem;font-weight:600;line-height:1.3;word-break:break-word;">${nombre}</div>
            <button class="receta-ver-btn" onclick="event.stopPropagation();verDetalleReceta('${meal.idMeal}','${nombre.replace(/'/g,"\\'")}')">📋 Ver receta</button>
        `;
        grid.appendChild(card);
    });

    // Botón ver más
    const btn = document.createElement('div');
    btn.style.cssText = 'grid-column:1/-1;text-align:center;padding:6px 0 2px;';
    btn.innerHTML = `<button onclick="recetasCargarMas()" style="padding:7px 24px;border:2px dashed #d1d5db;background:none;border-radius:8px;cursor:pointer;font-size:1rem;color:#6b7280;">＋ Ver más</button>`;
    grid.appendChild(btn);
}

async function recetasCargarMas() {
    document.getElementById('recetasDayPicker').style.display = 'none';
    _recetasSeleccionada = null;
    await _mostrarSiguientes8();
}

let _recetasSlotActual = 'comida1';

function selRecetasSlot(btn) {
    document.querySelectorAll('.recetas-slot-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _recetasSlotActual = btn.dataset.slot;
}

async function _translateChunks(text) {
    // Dividir en fragmentos de ~450 chars (compatible con todos los navegadores)
    const parrafos = text.replace(/\r\n/g, '\n').split(/\n+/).filter(s => s.trim());
    const chunks = [];
    let current = '';
    for (const p of parrafos) {
        if ((current + ' ' + p).length > 450) {
            if (current) chunks.push(current.trim());
            current = p;
        } else {
            current += (current ? ' ' : '') + p;
        }
    }
    if (current) chunks.push(current.trim());

    let limitHit = false;
    const translated = [];
    for (const chunk of chunks) {
        try {
            const res  = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|es`);
            const data = await res.json();
            const t    = data.responseData?.translatedText || '';
            if (!t || t.toLowerCase().includes('mymemory')) {
                limitHit = true;
                translated.push(chunk);
            } else {
                translated.push(t);
            }
        } catch(e) { translated.push(chunk); }
        await new Promise(r => setTimeout(r, 300));
    }
    return { text: translated.join('\n\n'), limitHit };
}

async function verDetalleReceta(idMeal, nombreEs) {
    const overlay = document.getElementById('recetaDetalleOverlay');
    document.getElementById('recetaDetalleTitulo').textContent = nombreEs;
    document.getElementById('recetaDetalleImg').src = '';
    document.getElementById('recetaDetalleIngredientes').innerHTML = '<li>Cargando...</li>';
    document.getElementById('recetaDetalleInstrucciones').textContent = '';
    document.getElementById('recetaDetalleYoutube').innerHTML = '';
    overlay.classList.add('open');

    try {
        const res  = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${idMeal}`);
        const data = await res.json();
        const m    = data.meals?.[0];
        if (!m) return;

        document.getElementById('recetaDetalleImg').src = m.strMealThumb;

        // Ingredientes (traducidos)
        const ingredientesRaw = [];
        for (let i = 1; i <= 20; i++) {
            const ing  = m[`strIngredient${i}`]?.trim();
            const cant = m[`strMeasure${i}`]?.trim();
            if (ing) ingredientesRaw.push({ ing, cant });
        }
        const ingsTraducidos = await Promise.all(ingredientesRaw.map(x => _translateText(x.ing)));
        document.getElementById('recetaDetalleIngredientes').innerHTML =
            ingredientesRaw.map((x, i) =>
                `<li>${x.cant ? x.cant + ' ' : ''}${ingsTraducidos[i] || x.ing}</li>`
            ).join('');

        // Instrucciones — comprobar caché Firebase
        const instrEl  = document.getElementById('recetaDetalleInstrucciones');
        const instrOrig = m.strInstructions || '';

        let instrCached = null;
        try {
            const snap = await db.collection('translations').doc('instructions').get();
            instrCached = snap.exists ? snap.data()?.[idMeal] : null;
        } catch(e) {}

        if (instrCached && !_isBadTranslation(instrCached)) {
            instrEl.textContent = instrCached;
        } else {
            instrEl.textContent = instrOrig;
            if (instrOrig) {
                const btnTraducir = document.createElement('button');
                btnTraducir.textContent = '🌐 Traducir instrucciones';
                btnTraducir.style.cssText = 'margin-bottom:10px;padding:6px 14px;background:var(--accent,#2563eb);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.82rem;font-family:inherit;display:block;';
                btnTraducir.onclick = async () => {
                    btnTraducir.textContent = '⏳ Traduciendo...';
                    btnTraducir.disabled = true;
                    const { text: traducido, limitHit } = await _translateChunks(instrOrig);
                    if (limitHit) {
                        btnTraducir.textContent = '⚠️ Límite de traducciones alcanzado. Inténtalo más tarde.';
                        btnTraducir.style.background = '#f59e0b';
                        btnTraducir.disabled = false;
                        btnTraducir.onclick = null;
                        return;
                    }
                    instrEl.textContent = traducido;
                    btnTraducir.remove();
                    try {
                        await db.collection('translations').doc('instructions').set({ [idMeal]: traducido }, { merge: true });
                    } catch(e) {}
                };
                const existingBtn = instrEl.parentNode.querySelector('.btn-traducir-instr');
                if (existingBtn) existingBtn.remove();
                btnTraducir.className = 'btn-traducir-instr';
                instrEl.before(btnTraducir);
            }
        }

        // YouTube
        if (m.strYoutube) {
            document.getElementById('recetaDetalleYoutube').innerHTML =
                `<a href="${m.strYoutube}" target="_blank" rel="noopener" style="font-size:0.85rem;color:#2563eb;">▶️ Ver vídeo en YouTube</a>`;
        }
    } catch(e) {
        document.getElementById('recetaDetalleIngredientes').innerHTML = '<li>Error cargando.</li>';
    }
}

function cerrarDetalleReceta(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('recetaDetalleOverlay').classList.remove('open');
}

function _seleccionarReceta(nombreEs, nombreOrig, cardEl) {
    const yaSeleccionada = cardEl.classList.contains('selected');
    document.querySelectorAll('.receta-card').forEach(c => c.classList.remove('selected'));

    if (yaSeleccionada) {
        _recetasSeleccionada = null;
        document.getElementById('recetasDayPicker').style.display = 'none';
        return;
    }

    cardEl.classList.add('selected');
    _recetasSeleccionada = { nombreEs };

    document.getElementById('recetasSelectedName').textContent = `"${nombreEs}"`;

    const weekOffset = currentCalendar - 1;
    const monday = getMondayOfWeek(weekOffset);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const fmt = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    document.getElementById('recetasWeekNotice').textContent =
        `⚠️ Se insertará en la semana del ${fmt(monday)} al ${fmt(sunday)}`;

    _recetasSlotActual = 'comida1';
    document.querySelectorAll('.recetas-slot-btn').forEach((b, i) => b.classList.toggle('active', i === 0));

    const days   = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
    const labels = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    document.getElementById('recetasDaysRow').innerHTML = days.map((d, i) =>
        `<button class="receta-day-btn" onclick="_añadirRecetaADia('${d}')">${labels[i]}</button>`
    ).join('');

    const picker = document.getElementById('recetasDayPicker');
    picker.style.display = 'block';
    picker.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function cancelarSeleccionReceta() {
    document.getElementById('recetasDayPicker').style.display = 'none';
    document.querySelectorAll('.receta-card').forEach(c => c.classList.remove('selected'));
    _recetasSeleccionada = null;
}

async function _añadirRecetaADia(day) {
    if (!_recetasSeleccionada) return;
    const { nombreEs } = _recetasSeleccionada;

    const slot = document.querySelector(
        `.meal-slot[data-day="${day}"][data-meal="${_recetasSlotActual}"]`
    );
    if (!slot) {
        showNotification('No se encontró el slot del día', 'error');
        return;
    }

    const foodsArray = [nombreEs];
    updateSlotWithArray(slot, foodsArray);
    await saveMenu(day, _recetasSlotActual, foodsArray);

    const dayLabel  = { lunes:'lunes', martes:'martes', miercoles:'miércoles', jueves:'jueves', viernes:'viernes', sabado:'sábado', domingo:'domingo' }[day] || day;
    const slotLabel = { comida1:'1º Comida', comida2:'2º Comida', postre:'Postre Comida', cena1:'1º Cena', cena2:'2º Cena', cenaPostre:'Postre Cena' }[_recetasSlotActual] || _recetasSlotActual;
    showNotification(`✅ "${nombreEs}" añadido al ${dayLabel} (${slotLabel})`, 'success');
    cerrarRecetasModal();
}

