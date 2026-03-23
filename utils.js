// ============================================================
// UTILS.JS — Código compartido entre todas las páginas
// ============================================================

// ── Firebase ─────────────────────────────────────────────────
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCVByYzJFMlyZazwXIDq3Tb1ihWJosaGFw",
    authDomain: "menusemanal-53c08.firebaseapp.com",
    projectId: "menusemanal-53c08",
    storageBucket: "menusemanal-53c08.firebasestorage.app",
    messagingSenderId: "944560384545",
    appId: "1:944560384545:web:0cda30d1dcf3154281d160"
};

let db = null;
let auth = null;
let isFirebaseConfigured = false;

try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    auth = firebase.auth();
    isFirebaseConfigured = true;
    console.log('✅ Firebase conectado');
} catch (e) {
    console.warn('⚠️ Firebase error', e);
}

// ── Auth ──────────────────────────────────────────────────────
const ADMIN_EMAIL = 'alfredo.escamilla.gonzalez@gmail.com';
let currentUser = null;
let isEditorUser = false;
let authDropdownOpen = false;

async function checkIfEditor(user) {
    if (!user || !db) return false;
    try {
        const doc = await db.collection('editors').doc('allowed').get();
        if (!doc.exists) return false;
        return (doc.data().emails || []).map(e => e.toLowerCase()).includes(user.email.toLowerCase());
    } catch (e) {
        return false;
    }
}

function handleAuthClick() {
    if (!auth) return;
    if (!currentUser) {
        auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
            .catch(err => console.warn('Login cancelado', err));
    } else {
        authDropdownOpen = !authDropdownOpen;
        const dd = document.getElementById('authDropdown');
        if (dd) dd.classList.toggle('hidden', !authDropdownOpen);
    }
}

function logoutAuth() {
    if (auth) auth.signOut();
    authDropdownOpen = false;
    const dd = document.getElementById('authDropdown');
    if (dd) dd.classList.add('hidden');
}

function closeAuthDropdown() {
    authDropdownOpen = false;
    const dd = document.getElementById('authDropdown');
    if (dd) dd.classList.add('hidden');
}

function renderAuthWidget(user, isEditor = false) {
    const widget = document.getElementById('authWidget');
    if (!widget) return;
    if (!user) {
        widget.innerHTML = `<div class="auth-login-btn" onclick="handleAuthClick()" title="Iniciar sesión">🔑 Entrar</div>`;
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
            ${avatar}<span class="auth-name">${name}</span><span class="auth-chevron">▾</span>
        </div>
        <div id="authDropdown" class="auth-dropdown hidden">
            <button class="auth-dropdown-item auth-dropdown-profile" onclick="openProfilePanel()">👤 Mi Perfil</button>
            <div class="auth-dropdown-divider"></div>
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
            showNotification('🔒 Inicia sesión para poder editar', 'warning');
        } else {
            showNotification('⛔ Tu cuenta no tiene permiso de edición', 'error');
        }
        return true;
    }
    return false;
}

document.addEventListener('DOMContentLoaded', () => renderAuthWidget(null, false));
document.addEventListener('click', e => {
    if (!e.target.closest('#authWidget')) closeAuthDropdown();
});

if (auth) {
    auth.onAuthStateChanged(async user => {
        currentUser = user;
        isEditorUser = user ? await checkIfEditor(user) : false;
        renderAuthWidget(user, isEditorUser);
        if (typeof onAuthReady === 'function') onAuthReady(user, isEditorUser);
    });
} else {
    if (typeof onAuthReady === 'function') onAuthReady(null, false);
}

// ── Helpers de referencia por usuario ────────────────────────
function userFoodsRef() {
    if (!db || !currentUser) return null;
    return db.collection('users').doc(currentUser.uid).collection('foods').doc('custom-foods');
}

function userMenuRef() {
    if (!db || !currentUser) return null;
    return db.collection('users').doc(currentUser.uid).collection('menus').doc('weekly-menu');
}

async function bootstrapUserFoods() {
    if (!db || !currentUser) return;
    try {
        const ref = userFoodsRef();
        const userDoc = await ref.get();
        if (!userDoc.exists) {
            const defaultDoc = await db.collection('foods').doc('custom-foods').get();
            if (defaultDoc.exists) {
                await ref.set(defaultDoc.data());
                console.log('🌱 Platos iniciales copiados al espacio del usuario');
            }
        }
    } catch(e) {
        console.warn('Error en bootstrapUserFoods:', e);
    }
}

// ── Tema ──────────────────────────────────────────────────────
const THEME_KEY = 'app-theme-mode';

function applyThemeMode(mode) {
    const m = ['light', 'dark'].includes(mode) ? mode : 'light';
    document.body.classList.remove('theme-light', 'theme-dark');
    if (m !== 'light') document.body.classList.add('theme-dark');
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => btn.classList.remove('active'));
    const active = document.querySelector(`.mode-${m}`);
    if (active) active.classList.add('active');
}

function setThemeMode(mode) {
    applyThemeMode(mode);
    localStorage.setItem(THEME_KEY, mode);
}

function initThemeMode() {
    applyThemeMode(localStorage.getItem(THEME_KEY) || 'light');
}

// ── Notificaciones ────────────────────────────────────────────
function showNotification(message, type = 'success') {
    document.querySelector('.notification')?.remove();
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(() => n.classList.add('show'), 10);
    setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 400); }, 3000);
}

// ── Menú hamburguesa ──────────────────────────────────────────
function toggleHamburger() {
    document.getElementById('hamburgerMenu')?.classList.toggle('open');
}

function closeHamburger() {
    document.getElementById('hamburgerMenu')?.classList.remove('open');
}

document.addEventListener('click', e => {
    if (!e.target.closest('#hamburgerBtn') && !e.target.closest('#hamburgerMenu')) closeHamburger();
});
