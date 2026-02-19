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
const THEME_STORAGE_KEY = 'menu-theme-mode';

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
    if (isMobileDevice || !isSingleWeekView()) {
        return;
    }

    captureCopySnapshot();
    setCopyAccessAllowed();
    showNotification('✅ Copia creada. Ya puedes revisar y aplicar.', 'success');
}

async function applyCopyToOfficial() {
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

function applyThemeMode(mode) {
    const normalizedMode = ['light', 'dark'].includes(mode) ? mode : 'light';

    document.body.classList.remove('theme-light', 'theme-dark');
    if (normalizedMode !== 'light') {
        document.body.classList.add(`theme-${normalizedMode}`);
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
    const categories = ['primeros', 'segundos', 'postres', 'cenas'];
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
        'firebase': 'Connected to Firebase',
        'cache': 'Using local cache',
        'offline': 'Offline mode',
        'syncing': 'Syncing...'
    };
    
    const icon = statusIcons[syncStatus] || '⚪';
    const message = statusMessages[syncStatus] || 'Unknown status';
    
    // Update UI element if it exists
    const statusElement = document.getElementById('sync-status');
    if (statusElement) {
        // Mostrar número de reintento si hay más de uno
        let displayMessage = message;
        if (syncStatus === 'syncing' && connectionRetryCount > 0) {
            displayMessage = `Syncing... (intento ${connectionRetryCount + 1}/${maxConnectionRetries})`;
        }
        
        statusElement.textContent = `${icon} ${displayMessage}`;
        statusElement.title = `Last sync: ${lastSyncTimestamp ? new Date(lastSyncTimestamp).toLocaleTimeString() : 'Never'}`;
        
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

    if (isFirebaseConfigured) {
        try {
            syncStatus = 'syncing';
            updateSyncStatusUI();
            
            // Save with timestamp using retry logic
            await retryOperation(async () => {
                await db.collection('menus').doc(MENU_DOC_ID).set({
                    [key]: dataWithTimestamp
                }, { merge: true });
            });
            
            // Verify the save was successful
            const verifyDoc = await db.collection('menus').doc(MENU_DOC_ID).get();
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
    if (isFirebaseConfigured) {
        try {
            syncStatus = 'syncing';
            updateSyncStatusUI();
            
            // Add 10 second timeout
            const doc = await withTimeout(
                db.collection('menus').doc(MENU_DOC_ID).get(),
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

// Sincronización en tiempo real del menú (solo con Firebase)
if (isFirebaseConfigured) {
    db.collection('menus').doc(MENU_DOC_ID).onSnapshot((doc) => {
        // During rotation, we handle updates manually to avoid conflicts
        // But we still accept updates from other users
        if (isResetting) {
            console.log('⏸️ Snapshot update during reset, will process after completion');
            return;
        }

        if (isCopyMode) {
            return;
        }

        const slots = document.querySelectorAll('.meal-slot');
        if (doc.exists) {
            const data = doc.data();
            let updatesApplied = 0;
            
            slots.forEach(slot => {
                const candidates = getMenuKeyCandidatesFromSlot(slot);
                const foundKey = candidates.find(candidateKey => data[candidateKey]);
                
                if (foundKey) {
                    const menuData = data[foundKey];
                    
                    // Handle both old format (array) and new format (object with timestamp)
                    if (Array.isArray(menuData)) {
                        // Old format - migrate to new format on next save
                        updateSlotWithArray(slot, menuData);
                        updatesApplied++;
                    } else if (menuData && menuData.data) {
                        // New format with timestamp - check if newer than local
                        const firebaseTimestamp = menuData.lastModified || 0;
                        
                        // Check localStorage for comparison
                        const localData = localStorage.getItem(foundKey);
                        let shouldUpdate = true;
                        
                        if (localData) {
                            try {
                                const parsed = JSON.parse(localData);
                                const localTimestamp = parsed.lastModified || 0;
                                
                                // Only update if Firebase data is newer or equal
                                if (firebaseTimestamp < localTimestamp) {
                                    console.log(`⚠️ Local data newer for ${foundKey}, keeping local`);
                                    shouldUpdate = false;
                                }
                            } catch (e) {
                                // Invalid local data, accept Firebase data
                            }
                        }
                        
                        if (shouldUpdate) {
                            updateSlotWithArray(slot, menuData.data);
                            updatesApplied++;
                            
                            // Clear outdated localStorage
                            localStorage.removeItem(foundKey);
                        }
                    } else {
                        slot.innerHTML = '';
                    }
                } else {
                    // No data for this slot in Firebase
                    // Check if we have local data that should be uploaded
                    const localData = localStorage.getItem(candidates[0]);
                    if (!localData || localData === '[]') {
                        slot.innerHTML = '';
                    }
                }
            });
            
            if (updatesApplied > 0) {
                console.log(`🔄 Applied ${updatesApplied} remote updates from Firebase`);
                syncStatus = 'firebase';
                lastSyncTimestamp = Date.now();
                updateSyncStatusUI();
            }
        } else {
            // Si el documento no existe, limpiar todas las casillas
            slots.forEach(slot => {
                slot.innerHTML = '';
            });
            console.log('⚠️ Firebase document deleted or does not exist');
        }
    });

    // Sincronización en tiempo real de platos personalizados
    db.collection('foods').doc(CUSTOM_FOODS_DOC_ID).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            if (data.customFoods) {
                loadCustomFoods(data.customFoods);
                console.log('🔄 Custom foods updated from Firebase');
            }
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
}

// Obtener array de comidas de un slot
function getSlotFoods(slot) {
    const tags = slot.querySelectorAll('.meal-text');
    return Array.from(tags).map(tag => tag.textContent);
}

// Eliminar etiqueta individual de comida
async function removeFoodTag(btn) {
    const slot = btn.closest('.meal-slot');
    if (slot.classList.contains('slot-disabled')) {
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
            // Añadir nueva comida al slot
            const foodsArray = getSlotFoods(slot);
            foodsArray.push(draggedFood);
            const { date } = getStorageContextFromSlot(slot);

            updateSlotWithArray(slot, foodsArray);
            await saveMenu(slot.dataset.day, slot.dataset.meal, foodsArray, null, date);
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

    if (isFirebaseConfigured) {
        try {
            const doc = await db.collection('foods').doc(CUSTOM_FOODS_DOC_ID).get();
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
                await db.collection('foods').doc(CUSTOM_FOODS_DOC_ID).set({ customFoods });
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

    if (isFirebaseConfigured) {
        try {
            const doc = await db.collection('foods').doc(CUSTOM_FOODS_DOC_ID).get();
            if (doc.exists && doc.data().customFoods) {
                const customFoods = doc.data().customFoods;
                if (customFoods[category]) {
                    customFoods[category] = customFoods[category].filter(item => {
                        const existingName = normalizeFoodName(getPlateName(item));
                        return existingName.toLocaleLowerCase('es') !== normalizedFoodName.toLocaleLowerCase('es');
                    });
                    await db.collection('foods').doc(CUSTOM_FOODS_DOC_ID).set({ customFoods });
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

    // Limpiar todas las categorías primero
    categoryContainers.forEach(cat => {
        cat.innerHTML = '';
    });

    // Cargar platos en sus respectivas categorías
    Object.keys(cleanedFoods).forEach(category => {
        const categoryIndex = CATEGORY_MAP[category];
        if (categoryIndex !== undefined) {
            const categoryContainer = categoryContainers[categoryIndex];
            cleanedFoods[category].forEach(food => {
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
    if (document.querySelectorAll('.category-items').length === 0) {
        return;
    }
    if (isFirebaseConfigured) {
        try {
            const doc = await db.collection('foods').doc(CUSTOM_FOODS_DOC_ID).get();
            if (doc.exists && doc.data().customFoods) {
                const { sanitizedFoods, changed } = sanitizeCustomFoodsMap(doc.data().customFoods);

                if (changed) {
                    await db.collection('foods').doc(CUSTOM_FOODS_DOC_ID).set({ customFoods: sanitizedFoods });
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
            'primeros': '🥗 Primeros Platos',
            'segundos': '🍗 Segundos Platos',
            'postres': '🍮 Postres',
            'cenas': '🌙 Cenas Ligeras'
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

    // Determinar qué categorías mostrar según el tipo de comida
    let categoriesToShow = [];

    if (meal === 'comida1') {
        // Solo primeros platos para el primer plato de la comida
        categoriesToShow = ['primeros'];
    } else if (meal === 'comida2') {
        // Solo segundos platos para el segundo plato de la comida
        categoriesToShow = ['segundos'];
    } else if (meal === 'postre' || meal === 'cenaPostre') {
        // Solo postres
        categoriesToShow = ['postres'];
    } else if (meal === 'cena1') {
        // Primeros platos + cenas ligeras para el primer plato de cena
        categoriesToShow = ['primeros', 'cenas'];
    } else if (meal === 'cena2') {
        // Segundos platos + cenas ligeras para el segundo plato de cena
        categoriesToShow = ['segundos', 'cenas'];
    }

    let hasPlates = false;
    const availableCategoryKeys = [];
    const hasMultipleCategories = categoriesToShow.length > 1;

    categoriesToShow.forEach((category, index) => {
        const plates = customFoodsGlobal[category] || [];

        // Filtrar platos ya añadidos
        const availablePlates = plates.filter(plate => {
            const plateName = typeof plate === 'string' ? plate : plate.name;
            if (!existingPlates.includes(plateName)) {
                return true;
            }

            return !!replaceTargetFoodName && plateName === replaceTargetFoodName;
        }).sort((a, b) => {
            const nameA = (typeof a === 'string' ? a : a.name).toLowerCase();
            const nameB = (typeof b === 'string' ? b : b.name).toLowerCase();
            return nameA.localeCompare(nameB, 'es');
        });

        if (availablePlates.length > 0) {
            hasPlates = true;
            availableCategoryKeys.push(category);
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'modal-category';
            categoryDiv.dataset.category = category;

            // Si hay múltiples categorías, añadir flecha y funcionalidad de colapso
            if (hasMultipleCategories) {
                const categoryTitle = document.createElement('div');
                categoryTitle.className = 'modal-category-title';
                categoryTitle.innerHTML = `
                    <span class="category-title-text">${categoryTitles[category]}</span>
                    <span class="category-arrow">▼</span>
                `;
                categoryTitle.style.cursor = 'pointer';
                categoryTitle.style.display = 'flex';
                categoryTitle.style.justifyContent = 'space-between';
                categoryTitle.style.alignItems = 'center';
                categoryTitle.style.padding = '12px 15px';
                categoryTitle.style.background = '#f5f5f5';
                categoryTitle.style.borderRadius = '6px';
                categoryTitle.style.marginBottom = '8px';
                categoryTitle.style.fontWeight = '600';
                
                // Empezar colapsado
                categoryDiv.classList.add('collapsed');
                
                categoryTitle.onclick = function() {
                    const isCollapsed = categoryDiv.classList.toggle('collapsed');
                    const arrow = categoryTitle.querySelector('.category-arrow');
                    arrow.textContent = isCollapsed ? '▼' : '▲';
                };

                categoryDiv.appendChild(categoryTitle);
            }

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

    modalFixedCategoryTitle.textContent = availableCategoryKeys.length > 0
        ? availableCategoryKeys.map(category => categoryTitles[category]).join(' • ')
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
            if (slot.classList.contains('slot-disabled')) {
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
            if (slot.classList.contains('slot-disabled')) {
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
            <button class="view-btn active" data-view="single-week" onclick="changeView('single-week')">1 Semana</button>
                        <button class="view-btn" data-view="daily" onclick="changeView('daily')">1 Día</button>
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
