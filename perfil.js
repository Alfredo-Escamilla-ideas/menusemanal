// ============================================================
// PERFIL.JS — Panel de perfil de usuario
// ============================================================

const ALERGENOS = [
    { id: 'gluten',       label: 'Gluten',        icon: '🌾' },
    { id: 'lactosa',      label: 'Lácteos',        icon: '🥛' },
    { id: 'huevos',       label: 'Huevos',         icon: '🥚' },
    { id: 'pescado',      label: 'Pescado',         icon: '🐟' },
    { id: 'mariscos',     label: 'Mariscos',        icon: '🦐' },
    { id: 'cacahuetes',   label: 'Cacahuetes',      icon: '🥜' },
    { id: 'frutos_secos', label: 'Frutos secos',    icon: '🌰' },
    { id: 'soja',         label: 'Soja',            icon: '🫘' },
    { id: 'apio',         label: 'Apio',            icon: '🥬' },
    { id: 'mostaza',      label: 'Mostaza',         icon: '🌭' },
    { id: 'sesamo',       label: 'Sésamo',          icon: '⬜' },
    { id: 'sulfitos',     label: 'Sulfitos',        icon: '🍷' },
    { id: 'altramuces',   label: 'Altramuces',      icon: '🌼' },
    { id: 'moluscos',     label: 'Moluscos',        icon: '🦑' },
];

const PREFERENCIAS_ALIM = [
    { id: 'vegetariano', label: 'Vegetariano', icon: '🥗' },
    { id: 'vegano',      label: 'Vegano',       icon: '🌱' },
    { id: 'sin_gluten',  label: 'Sin gluten',   icon: '🌾' },
    { id: 'sin_lactosa', label: 'Sin lactosa',  icon: '🥛' },
    { id: 'halal',       label: 'Halal',        icon: '☪️' },
    { id: 'keto',        label: 'Keto',         icon: '🥩' },
    { id: 'bajo_sodio',  label: 'Bajo sodio',   icon: '🧂' },
];

// ── Inyección de estilos ──────────────────────────────────────
function _injectProfileStyles() {
    if (document.getElementById('perfil-styles')) return;
    const s = document.createElement('style');
    s.id = 'perfil-styles';
    s.textContent = `
/* ── Profile overlay ─────────────────────────────── */
.profile-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.45);
    z-index: 9000; opacity: 0; pointer-events: none;
    transition: opacity 0.26s ease;
}
.profile-overlay.open { opacity: 1; pointer-events: all; }

/* ── Profile drawer ──────────────────────────────── */
.profile-drawer {
    position: fixed; top: 0; right: 0; bottom: 0;
    width: 420px; max-width: 100vw;
    background: var(--surface-main, #fff);
    border-left: 1px solid var(--border-main, #e0e0e0);
    box-shadow: -8px 0 40px rgba(0,0,0,0.18);
    z-index: 9001;
    display: flex; flex-direction: column;
    transform: translateX(100%);
    transition: transform 0.28s cubic-bezier(.4,0,.2,1);
}
.profile-drawer.open { transform: translateX(0); }

.profile-drawer-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 20px; height: 58px;
    border-bottom: 1px solid var(--border-main, #e0e0e0);
    flex-shrink: 0; gap: 10px;
}
.profile-drawer-title {
    font-size: 0.98rem; font-weight: 700;
    color: var(--text-main, #2a2a2a); white-space: nowrap;
}
.profile-drawer-close {
    background: none; border: none; cursor: pointer;
    font-size: 1.2rem; color: var(--text-main, #666);
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s; flex-shrink: 0;
}
.profile-drawer-close:hover { background: var(--surface-soft, #f5f5f5); }

.profile-drawer-body {
    flex: 1; overflow-y: auto; padding: 24px 22px 16px;
    scroll-behavior: smooth;
}

/* ── Avatar ───────────────────────────────────────── */
.profile-avatar-wrap {
    display: flex; flex-direction: column; align-items: center;
    gap: 6px; margin-bottom: 28px; padding-bottom: 22px;
    border-bottom: 1px solid var(--border-main, #e0e0e0);
}
.profile-avatar-img {
    width: 82px; height: 82px; border-radius: 50%;
    object-fit: cover; border: 3px solid #c2410c;
    box-shadow: 0 4px 16px rgba(194,65,12,0.25);
}
.profile-avatar-ph {
    width: 82px; height: 82px; border-radius: 50%;
    background: linear-gradient(135deg, #c2410c 0%, #ea580c 100%);
    color: #fff; font-size: 2.2rem; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 16px rgba(194,65,12,0.3);
    letter-spacing: -1px;
}
.profile-display-name {
    font-size: 1.08rem; font-weight: 700;
    color: var(--text-main, #2a2a2a); margin-top: 4px;
    text-align: center;
}
.profile-email-tag {
    font-size: 0.78rem; color: #888;
    background: var(--surface-soft, #f5f5f5);
    padding: 3px 10px; border-radius: 12px; text-align: center;
}
.profile-member-since {
    font-size: 0.74rem; color: #aaa;
}

/* ── Sections ─────────────────────────────────────── */
.profile-section { margin-bottom: 22px; }
.profile-section-title {
    font-size: 0.7rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.1em; color: #c2410c;
    margin-bottom: 12px; display: flex; align-items: center; gap: 6px;
}
.profile-section-title::after {
    content: ''; flex: 1; height: 1px;
    background: rgba(194,65,12,0.2); margin-left: 4px;
}

/* ── Fields ───────────────────────────────────────── */
.profile-field { margin-bottom: 11px; }
.profile-field label {
    display: block; font-size: 0.76rem; font-weight: 600;
    color: var(--text-muted, #777); margin-bottom: 4px;
}
.profile-field input {
    width: 100%; padding: 9px 12px; box-sizing: border-box;
    border: 1.5px solid var(--border-main, #e0e0e0);
    border-radius: 8px; font-size: 0.88rem; font-family: inherit;
    color: var(--text-main, #2a2a2a);
    background: var(--surface-main, #fff);
    transition: border-color 0.15s, box-shadow 0.15s;
}
.profile-field input:focus {
    outline: none; border-color: #c2410c;
    box-shadow: 0 0 0 3px rgba(194,65,12,0.12);
}
.profile-field input[readonly] {
    background: var(--surface-soft, #f8f8f8);
    color: #999; cursor: default; border-style: dashed;
}

/* ── Chips ────────────────────────────────────────── */
.profile-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.profile-chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 13px; border-radius: 20px;
    border: 1.5px solid var(--border-main, #ddd);
    background: var(--surface-main, #fff);
    cursor: pointer; font-size: 0.8rem; font-weight: 500;
    color: var(--text-main, #333);
    transition: all 0.15s; user-select: none;
    font-family: inherit;
}
.profile-chip:hover { border-color: #c2410c; background: rgba(194,65,12,0.05); }
.profile-chip.active {
    border-color: #c2410c; background: rgba(194,65,12,0.12);
    color: #c2410c; font-weight: 700;
}

/* ── Save button ──────────────────────────────────── */
.profile-save-btn {
    width: 100%; padding: 11px; margin-top: 4px;
    background: #c2410c; color: #fff; border: none;
    border-radius: 9px; cursor: pointer;
    font-size: 0.9rem; font-weight: 700; font-family: inherit;
    transition: background 0.15s, transform 0.1s;
    letter-spacing: 0.01em;
}
.profile-save-btn:hover { background: #b83a0a; transform: translateY(-1px); }
.profile-save-btn:active { transform: translateY(0); }
.profile-save-btn:disabled { opacity: 0.6; cursor: default; transform: none; }

/* ── Footer ───────────────────────────────────────── */
.profile-drawer-footer {
    padding: 14px 20px; border-top: 1px solid var(--border-main, #e0e0e0);
    display: flex; gap: 10px; flex-shrink: 0;
}
.profile-logout-btn {
    flex: 1; padding: 10px;
    background: var(--surface-soft, #f5f5f5);
    border: 1px solid var(--border-main, #e0e0e0);
    border-radius: 8px; cursor: pointer;
    font-size: 0.84rem; font-weight: 600; font-family: inherit;
    color: var(--text-main, #333); transition: background 0.15s;
}
.profile-logout-btn:hover { background: var(--border-main, #e0e0e0); }
.profile-delete-btn {
    flex: 1; padding: 10px;
    background: rgba(220,38,38,0.08);
    border: 1.5px solid rgba(220,38,38,0.35);
    border-radius: 8px; cursor: pointer;
    font-size: 0.84rem; font-weight: 700; font-family: inherit;
    color: #dc2626; transition: background 0.15s;
}
.profile-delete-btn:hover { background: rgba(220,38,38,0.16); }

/* ── Delete confirm modal ─────────────────────────── */
.profile-confirm-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.6);
    z-index: 9200; display: none;
    align-items: center; justify-content: center;
    padding: 20px; box-sizing: border-box;
}
.profile-confirm-overlay.show { display: flex; }
.profile-confirm-box {
    background: var(--surface-main, #fff);
    border-radius: 14px; padding: 32px 24px 24px;
    max-width: 380px; width: 100%;
    box-shadow: 0 12px 48px rgba(0,0,0,0.25);
    text-align: center; animation: pfSlideUp 0.22s ease;
}
@keyframes pfSlideUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
}
.profile-confirm-icon { font-size: 2.8rem; margin-bottom: 14px; }
.profile-confirm-title {
    font-size: 1.15rem; font-weight: 700;
    color: var(--text-main, #2a2a2a); margin-bottom: 10px;
}
.profile-confirm-msg {
    font-size: 0.87rem; color: #777;
    margin-bottom: 24px; line-height: 1.6;
}
.profile-confirm-actions { display: flex; gap: 10px; }
.profile-confirm-cancel {
    flex: 1; padding: 11px;
    background: var(--surface-soft, #f5f5f5);
    border: 1px solid var(--border-main, #ddd);
    border-radius: 8px; cursor: pointer;
    font-size: 0.9rem; font-weight: 600; font-family: inherit;
    color: var(--text-main, #333);
}
.profile-confirm-delete {
    flex: 1; padding: 11px;
    background: #dc2626; border: none;
    border-radius: 8px; cursor: pointer;
    font-size: 0.9rem; font-weight: 700; font-family: inherit;
    color: #fff; transition: background 0.15s;
}
.profile-confirm-delete:hover { background: #b91c1c; }
.profile-confirm-delete:disabled { opacity: 0.6; cursor: default; }

/* ── Dark mode ────────────────────────────────────── */
.theme-dark .profile-chip.active {
    background: rgba(251,146,60,0.15); border-color: #fb923c; color: #fb923c;
}
.theme-dark .profile-chip:hover { background: rgba(251,146,60,0.08); border-color: #fb923c; }
.theme-dark .profile-section-title { color: #fb923c; }
.theme-dark .profile-section-title::after { background: rgba(251,146,60,0.2); }
.theme-dark .profile-save-btn { background: #ea580c; }
.theme-dark .profile-save-btn:hover { background: #c2410c; }
.theme-dark .profile-avatar-img { border-color: #fb923c; }
.theme-dark .profile-avatar-ph { background: linear-gradient(135deg, #ea580c, #fb923c); }
.theme-dark .profile-delete-btn { background: rgba(220,38,38,0.12); border-color: rgba(220,38,38,0.4); color: #f87171; }
.theme-dark .profile-delete-btn:hover { background: rgba(220,38,38,0.22); }
.theme-dark .profile-email-tag { background: rgba(255,255,255,0.07); color: #aaa; }

/* ── Mobile ───────────────────────────────────────── */
@media (max-width: 480px) {
    .profile-drawer { width: 100vw; border-left: none; }
}
    `;
    document.head.appendChild(s);
}

// ── Inyección del HTML del panel ─────────────────────────────
function _injectProfilePanel() {
    if (document.getElementById('profilePanelRoot')) return;
    const root = document.createElement('div');
    root.id = 'profilePanelRoot';
    root.innerHTML = `
        <div class="profile-overlay" id="profileOverlay" onclick="closeProfilePanel()"></div>

        <div class="profile-drawer" id="profileDrawer">
            <div class="profile-drawer-header">
                <span class="profile-drawer-title">👤 Mi Perfil</span>
                <button class="profile-drawer-close" onclick="closeProfilePanel()" aria-label="Cerrar">✕</button>
            </div>

            <div class="profile-drawer-body">
                <!-- Avatar y datos Google -->
                <div class="profile-avatar-wrap">
                    <div id="pfAvatarEl"></div>
                    <div class="profile-display-name" id="pfDisplayName"></div>
                    <div class="profile-email-tag" id="pfEmailTag"></div>
                    <div class="profile-member-since" id="pfMemberSince"></div>
                </div>

                <!-- Información personal -->
                <div class="profile-section">
                    <div class="profile-section-title">Información personal</div>
                    <div class="profile-field">
                        <label>Nombre</label>
                        <input id="pfNombre" type="text" placeholder="Tu nombre">
                    </div>
                    <div class="profile-field">
                        <label>Apellidos</label>
                        <input id="pfApellidos" type="text" placeholder="Tus apellidos">
                    </div>
                    <div class="profile-field">
                        <label>Apodo / Usuario</label>
                        <input id="pfUsername" type="text" placeholder="@tu_apodo">
                    </div>
                    <div class="profile-field">
                        <label>Email (cuenta Google) 🔒</label>
                        <input id="pfEmail" type="text" readonly>
                    </div>
                </div>

                <!-- Alergias -->
                <div class="profile-section">
                    <div class="profile-section-title">Alergias e intolerancias</div>
                    <div class="profile-chips" id="pfAlergias"></div>
                </div>

                <!-- Preferencias -->
                <div class="profile-section">
                    <div class="profile-section-title">Preferencias alimentarias</div>
                    <div class="profile-chips" id="pfPreferencias"></div>
                </div>

                <button class="profile-save-btn" id="pfSaveBtn" onclick="saveProfileData()">💾 Guardar cambios</button>
            </div>

            <div class="profile-drawer-footer">
                <button class="profile-logout-btn" onclick="logoutAuth()">🚪 Cerrar sesión</button>
                <button class="profile-delete-btn" onclick="confirmDeleteAccount()">🗑️ Eliminar cuenta</button>
            </div>
        </div>

        <!-- Modal confirmación de eliminación -->
        <div class="profile-confirm-overlay" id="pfConfirmOverlay">
            <div class="profile-confirm-box">
                <div class="profile-confirm-icon">⚠️</div>
                <div class="profile-confirm-title">¿Eliminar tu cuenta?</div>
                <div class="profile-confirm-msg">
                    Se eliminarán permanentemente tus platos personalizados, menús guardados y datos de perfil.<br><br>
                    Esta acción <strong>no se puede deshacer</strong>.
                </div>
                <div class="profile-confirm-actions">
                    <button class="profile-confirm-cancel" onclick="closeDeleteConfirm()">Cancelar</button>
                    <button class="profile-confirm-delete" id="pfDeleteBtn" onclick="executeDeleteAccount()">🗑️ Sí, eliminar</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(root);
}

// ── Abrir / cerrar panel ──────────────────────────────────────
function openProfilePanel() {
    if (!currentUser) return;
    if (typeof closeAuthDropdown === 'function') closeAuthDropdown();
    document.getElementById('profileOverlay').classList.add('open');
    document.getElementById('profileDrawer').classList.add('open');
    document.body.style.overflow = 'hidden';
    _renderStaticProfile();
    _loadProfileData();
}

function closeProfilePanel() {
    document.getElementById('profileOverlay')?.classList.remove('open');
    document.getElementById('profileDrawer')?.classList.remove('open');
    document.body.style.overflow = '';
}

// ── Renderizado estático (datos de Google) ────────────────────
function _renderStaticProfile() {
    const user = currentUser;
    if (!user) return;

    // Avatar
    const avatarEl = document.getElementById('pfAvatarEl');
    if (user.photoURL) {
        avatarEl.innerHTML = `<img class="profile-avatar-img" src="${user.photoURL}" alt="avatar" referrerpolicy="no-referrer">`;
    } else {
        const initials = (user.displayName || user.email || '?').slice(0, 2).toUpperCase();
        avatarEl.innerHTML = `<div class="profile-avatar-ph">${initials}</div>`;
    }

    document.getElementById('pfDisplayName').textContent = user.displayName || user.email;
    document.getElementById('pfEmailTag').textContent = user.email || '';
    document.getElementById('pfEmail').value = user.email || '';

    const created = user.metadata?.creationTime;
    if (created) {
        const d = new Date(created);
        document.getElementById('pfMemberSince').textContent =
            'Miembro desde ' + d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    }

    // Render chips vacíos hasta que carguen los datos
    _renderChips('pfAlergias', ALERGENOS, []);
    _renderChips('pfPreferencias', PREFERENCIAS_ALIM, []);
}

// ── Chips ─────────────────────────────────────────────────────
function _renderChips(containerId, items, activeIds) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    items.forEach(item => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'profile-chip' + (activeIds.includes(item.id) ? ' active' : '');
        chip.dataset.id = item.id;
        chip.innerHTML = `<span>${item.icon}</span><span>${item.label}</span>`;
        chip.onclick = () => chip.classList.toggle('active');
        container.appendChild(chip);
    });
}

function _getActiveChips(containerId) {
    return Array.from(document.querySelectorAll(`#${containerId} .profile-chip.active`))
        .map(c => c.dataset.id);
}

// ── Cargar datos de Firestore ─────────────────────────────────
async function _loadProfileData() {
    if (!db || !currentUser) return;
    try {
        const doc = await db.collection('users').doc(currentUser.uid)
            .collection('profile').doc('data').get();
        if (!doc.exists) return;
        const data = doc.data();
        document.getElementById('pfNombre').value    = data.nombre    || '';
        document.getElementById('pfApellidos').value = data.apellidos || '';
        document.getElementById('pfUsername').value  = data.username  || '';
        _renderChips('pfAlergias',     ALERGENOS,       data.alergias     || []);
        _renderChips('pfPreferencias', PREFERENCIAS_ALIM, data.preferencias || []);
    } catch(e) {
        console.warn('Error cargando perfil:', e);
    }
}

// ── Guardar perfil ────────────────────────────────────────────
async function saveProfileData() {
    if (!db || !currentUser) return;
    const btn = document.getElementById('pfSaveBtn');
    btn.textContent = '⏳ Guardando...';
    btn.disabled = true;
    try {
        await db.collection('users').doc(currentUser.uid)
            .collection('profile').doc('data')
            .set({
                nombre:       document.getElementById('pfNombre').value.trim(),
                apellidos:    document.getElementById('pfApellidos').value.trim(),
                username:     document.getElementById('pfUsername').value.trim(),
                alergias:     _getActiveChips('pfAlergias'),
                preferencias: _getActiveChips('pfPreferencias'),
                updatedAt:    firebase.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        showNotification('✅ Perfil guardado', 'success');
    } catch(e) {
        console.error('Error guardando perfil:', e);
        showNotification('❌ Error al guardar el perfil', 'error');
    } finally {
        btn.textContent = '💾 Guardar cambios';
        btn.disabled = false;
    }
}

// ── Eliminar cuenta ───────────────────────────────────────────
function confirmDeleteAccount() {
    document.getElementById('pfConfirmOverlay').classList.add('show');
}

function closeDeleteConfirm() {
    document.getElementById('pfConfirmOverlay').classList.remove('show');
}

async function executeDeleteAccount() {
    if (!currentUser) return;
    const btn = document.getElementById('pfDeleteBtn');
    btn.textContent = '⏳ Eliminando...';
    btn.disabled = true;
    try {
        // Borrar datos de Firestore del usuario
        if (db) {
            const uid = currentUser.uid;
            const userRef = db.collection('users').doc(uid);
            const subDocs = [
                userRef.collection('profile').doc('data'),
                userRef.collection('foods').doc('custom-foods'),
                userRef.collection('menus').doc('weekly-menu'),
            ];
            await Promise.all(subDocs.map(ref =>
                ref.get().then(snap => snap.exists ? snap.ref.delete() : null)
            ));
        }
        // Borrar cuenta de Firebase Auth
        await currentUser.delete();
        closeProfilePanel();
        closeDeleteConfirm();
        showNotification('Cuenta eliminada correctamente', 'success');
    } catch(e) {
        console.error('Error eliminando cuenta:', e);
        if (e.code === 'auth/requires-recent-login') {
            showNotification('⚠️ Cierra sesión, vuelve a iniciarla y repite la acción', 'warning');
        } else {
            showNotification('❌ Error al eliminar la cuenta', 'error');
        }
        btn.textContent = '🗑️ Sí, eliminar';
        btn.disabled = false;
    }
}

// ── Inicialización ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    _injectProfileStyles();
    _injectProfilePanel();
});
