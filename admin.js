// ====================================
// CONFIGURACIÓN
// ====================================
const ADMIN_EMAIL = 'alfredo.escamilla.gonzalez@gmail.com';

// ====================================
// INICIALIZACIÓN FIREBASE
// ====================================
let db = null;

try {
    const firebaseConfig = {
        apiKey: "AIzaSyCVByYzJFMlyZazwXIDq3Tb1ihWJosaGFw",
        authDomain: "menusemanal-53c08.firebaseapp.com",
        projectId: "menusemanal-53c08",
        storageBucket: "menusemanal-53c08.firebasestorage.app",
        messagingSenderId: "944560384545",
        appId: "1:944560384545:web:0cda30d1dcf3154281d160"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    db = firebase.firestore();

    console.log('✅ Firebase conectado correctamente (admin)');
} catch (error) {
    console.error('⚠️ Error al conectar Firebase:', error);
}

const auth = firebase.auth();

// ====================================
// TEMA
// ====================================
const ADMIN_THEME_STORAGE_KEY = 'app-theme-mode';

function applyThemeMode(mode) {
    const normalizedMode = ['light', 'dark'].includes(mode) ? mode : 'light';

    document.body.classList.remove('theme-light', 'theme-dark');
    if (normalizedMode !== 'light') {
        document.body.classList.add('theme-dark');
    }

    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeBtn = document.querySelector(`.mode-${normalizedMode}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

function setThemeMode(mode) {
    applyThemeMode(mode);
    localStorage.setItem(ADMIN_THEME_STORAGE_KEY, mode);
}

function initThemeMode() {
    const savedMode = localStorage.getItem(ADMIN_THEME_STORAGE_KEY) || 'light';
    applyThemeMode(savedMode);
}

// ====================================
// PANTALLAS
// ====================================
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
}

// ====================================
// AUTENTICACIÓN
// ====================================
auth.onAuthStateChanged(user => {
    if (!user) {
        showScreen('loginScreen');
        return;
    }

    const email = (user.email || '').toLowerCase();
    const adminEmail = ADMIN_EMAIL.toLowerCase();

    if (email !== adminEmail) {
        auth.signOut();
        window.location.replace('menu.html');
        return;
    }

    // Es admin
    showScreen('adminPanel');

    const avatar = document.getElementById('adminAvatar');
    if (avatar) {
        avatar.src = user.photoURL || '';
        avatar.style.display = user.photoURL ? 'block' : 'none';
    }

    const nameEl = document.getElementById('adminName');
    if (nameEl) {
        nameEl.textContent = user.displayName || user.email;
    }

    loadEditors();
});

function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => {
        console.warn('Login cancelado o error:', err);
        showNotification('No se pudo iniciar sesión. Inténtalo de nuevo.', 'error');
    });
}

function logout() {
    auth.signOut().catch(err => {
        console.warn('Error al cerrar sesión:', err);
    });
}

// ====================================
// GESTIÓN DE EDITORES
// ====================================
async function loadEditors() {
    const listEl = document.getElementById('editorsList');
    if (listEl) {
        listEl.innerHTML = '<div class="editors-empty">Cargando...</div>';
    }

    try {
        const docRef = db.collection('editors').doc('allowed');
        const docSnap = await docRef.get();

        let emails = [];
        let updatedAt = null;

        if (docSnap.exists) {
            const data = docSnap.data();
            emails = data.emails || [];
            updatedAt = data.updatedAt || null;
        }

        renderEditors(emails, updatedAt);
    } catch (err) {
        console.error('Error al cargar editores:', err);
        if (listEl) {
            listEl.innerHTML = '<div class="editors-empty">Error al cargar la lista de editores.</div>';
        }
        showNotification('Error al cargar los editores', 'error');
    }
}

function renderEditors(emails, updatedAt) {
    const listEl = document.getElementById('editorsList');
    if (!listEl) return;

    if (!emails || emails.length === 0) {
        listEl.innerHTML = '<div class="editors-empty">No hay editores configurados.</div>';
        return;
    }

    let html = '';

    emails.forEach(email => {
        html += `
        <div class="editor-row">
            <span class="editor-email">${escapeHtml(email)}</span>
            <button class="btn-danger" onclick="removeEditor('${escapeHtml(email)}')">Eliminar</button>
        </div>`;
    });

    html += `<div class="editors-count">Total: ${emails.length} editor${emails.length !== 1 ? 'es' : ''}`;
    if (updatedAt) {
        const date = updatedAt.toDate ? updatedAt.toDate() : new Date(updatedAt);
        html += `<div class="editors-updated">Última modificación: ${date.toLocaleString('es-ES')}</div>`;
    }
    html += '</div>';

    listEl.innerHTML = html;
}

async function addEditor() {
    const input = document.getElementById('newEditorEmail');
    if (!input) return;

    const email = input.value.trim().toLowerCase();

    if (!email) {
        showNotification('Introduce un correo electrónico', 'warning');
        return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('El formato del correo no es válido', 'error');
        return;
    }

    try {
        const docRef = db.collection('editors').doc('allowed');
        const docSnap = await docRef.get();

        let emails = [];
        if (docSnap.exists) {
            emails = docSnap.data().emails || [];
        }

        // Comprobar duplicado
        if (emails.map(e => e.toLowerCase()).includes(email)) {
            showNotification('Este correo ya es editor', 'warning');
            return;
        }

        emails.push(email);

        await docRef.set({
            emails: emails,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        input.value = '';
        showNotification(`✅ ${email} añadido como editor`, 'success');
        await loadEditors();
    } catch (err) {
        console.error('Error al añadir editor:', err);
        showNotification('Error al añadir el editor. Comprueba los permisos.', 'error');
    }
}

async function removeEditor(email) {
    const confirmed = await showConfirm(`¿Eliminar a ${email} de la lista de editores?`);
    if (!confirmed) return;

    try {
        const docRef = db.collection('editors').doc('allowed');
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            showNotification('No se encontró la lista de editores', 'error');
            return;
        }

        let emails = docSnap.data().emails || [];
        emails = emails.filter(e => e.toLowerCase() !== email.toLowerCase());

        await docRef.set({
            emails: emails,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification(`🗑️ ${email} eliminado de editores`, 'success');
        await loadEditors();
    } catch (err) {
        console.error('Error al eliminar editor:', err);
        showNotification('Error al eliminar el editor. Comprueba los permisos.', 'error');
    }
}

// ====================================
// UTILIDADES
// ====================================
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ====================================
// NOTIFICACIONES
// ====================================
function showNotification(message, type = 'success') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 400);
    }, 3500);
}

// ====================================
// CONFIRM MODAL (programático)
// ====================================
function showConfirm(message) {
    return new Promise(resolve => {
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.className = 'admin-confirm-overlay';

        overlay.innerHTML = `
            <div class="admin-confirm-box">
                <p>${escapeHtml(message)}</p>
                <div class="admin-confirm-actions">
                    <button class="btn-cancel" id="confirmCancelBtn">Cancelar</button>
                    <button class="btn-confirm-danger" id="confirmOkBtn">Eliminar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        function cleanup(result) {
            overlay.remove();
            resolve(result);
        }

        overlay.querySelector('#confirmOkBtn').addEventListener('click', () => cleanup(true));
        overlay.querySelector('#confirmCancelBtn').addEventListener('click', () => cleanup(false));

        // Cerrar al hacer clic fuera del box
        overlay.addEventListener('click', e => {
            if (e.target === overlay) cleanup(false);
        });

        // Cerrar con Escape
        function onKeyDown(e) {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', onKeyDown);
                cleanup(false);
            }
        }
        document.addEventListener('keydown', onKeyDown);
    });
}



// ====================================
// INICIO
// ====================================
initThemeMode();
