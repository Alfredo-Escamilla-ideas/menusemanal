// ── Auth + Init: gestionado por utils.js ─────────────────────
function onAuthReady() {
    if (!window._appInitialized) {
        window._appInitialized = true;
        init();
    }
}

// ── Categorías ────────────────────────────────────────────────────────────────
const PRIMEROS_CATS = [
    'primeros_sopa','primeros_ensalada','primeros_pasta',
    'primeros_arroz','primeros_legumbres','primeros_verduras'
];
const SEGUNDOS_CATS = [
    'segundos_carne','segundos_pescado','segundos_marisco','segundos_huevos'
];
const CAT_LABEL = {
    primeros_sopa:      '🥣 Sopa / Crema',
    primeros_ensalada:  '🥗 Ensalada',
    primeros_pasta:     '🍝 Pasta',
    primeros_arroz:     '🍚 Arroz',
    primeros_legumbres: '🫘 Legumbres',
    primeros_verduras:  '🥦 Verduras',
    segundos_carne:     '🍗 Carne',
    segundos_pescado:   '🐟 Pescado',
    segundos_marisco:   '🦐 Marisco',
    segundos_huevos:    '🥚 Huevos'
};

// ── Estado ────────────────────────────────────────────────────────────────────
let pairs      = [];     // [{ p1:{name,cat}, p2:{name,cat} }] — pares pendientes
let reviewed   = {};     // { "p1||p2": true/false/null(skip) }
let combos     = [];     // [{ primero, segundo }] — aprobados
let queueIdx   = 0;
let history    = [];     // para deshacer
let saveTimer  = null;


// ── Helpers ───────────────────────────────────────────────────────────────────
function pairKey(a, b) { return `${a}||${b}`; }

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
    document.getElementById('app').innerHTML = '<div class="loading">Cargando platos…</div>';
    try {
        const [foodsDoc, combosDoc] = await Promise.all([
            db.collection('foods').doc('custom-foods').get(),
            db.collection('foods').doc('combos').get()
        ]);

        const cf = foodsDoc.data()?.customFoods || {};

        // Construir listas de nombres
        const primeros = [];
        for (const cat of PRIMEROS_CATS) {
            for (const p of (cf[cat] || [])) {
                const name = typeof p === 'string' ? p : p.name;
                if (name) primeros.push({ name, cat });
            }
        }
        const segundos = [];
        for (const cat of SEGUNDOS_CATS) {
            for (const p of (cf[cat] || [])) {
                const name = typeof p === 'string' ? p : p.name;
                if (name) segundos.push({ name, cat });
            }
        }

        // Cargar datos guardados
        const saved = combosDoc.exists ? combosDoc.data() : {};
        reviewed = saved.reviewed || {};
        combos   = saved.combos   || [];

        // Generar todos los pares, filtrar los ya revisados, mezclar
        const allPairs = [];
        for (const p1 of primeros) {
            for (const p2 of segundos) {
                const k = pairKey(p1.name, p2.name);
                if (!(k in reviewed)) allPairs.push({ p1, p2 });
            }
        }
        pairs = shuffle(allPairs);
        queueIdx = 0;

    } catch (e) {
        console.error(e);
        document.getElementById('app').innerHTML = '<div class="loading">❌ Error cargando datos. Recarga la página.</div>';
        return;
    }

    updateStats();
    renderCard();
    setupKeys();
}

// ── Render card ───────────────────────────────────────────────────────────────
function renderCard() {
    const app = document.getElementById('app');

    if (queueIdx >= pairs.length) {
        renderDone();
        return;
    }

    const { p1, p2 } = pairs[queueIdx];
    app.innerHTML = `
        <div class="hint">¿Combina bien este primero con este segundo?</div>
        <div class="card-area">
            <div class="pair-card" id="pairCard">
                <span class="card-label yes" id="lblYes">✅ ¡SÍ!</span>
                <span class="card-label no"  id="lblNo">❌ NO</span>
                <div class="plate-block">
                    <span class="plate-tag">Primero</span>
                    <span class="plate-name">${p1.name}</span>
                    <span class="plate-cat">${CAT_LABEL[p1.cat] || p1.cat}</span>
                </div>
                <div class="pair-divider">+</div>
                <div class="plate-block">
                    <span class="plate-tag">Segundo</span>
                    <span class="plate-name">${p2.name}</span>
                    <span class="plate-cat">${CAT_LABEL[p2.cat] || p2.cat}</span>
                </div>
            </div>
        </div>
        <div class="action-btns">
            <button class="btn-no"   onclick="vote(false)" title="No combina (←)">❌</button>
            <button class="btn-skip" onclick="vote(null)"  title="Saltar (↑)">⏭</button>
            <button class="btn-yes"  onclick="vote(true)"  title="¡Combina! (→)">✅</button>
        </div>
        <button class="btn-undo" id="btnUndo" onclick="undo()" ${history.length === 0 ? 'disabled' : ''}>↩ Deshacer</button>
        <div class="key-hint">← No combina &nbsp;|&nbsp; ↑ Saltar &nbsp;|&nbsp; → ¡Combina!</div>
    `;

    // Touch/swipe support
    setupSwipe(document.getElementById('pairCard'));
}

// ── Votar ─────────────────────────────────────────────────────────────────────
async function vote(val) {
    if (queueIdx >= pairs.length) return;

    const card = document.getElementById('pairCard');
    if (!card) return;

    const { p1, p2 } = pairs[queueIdx];
    const k = pairKey(p1.name, p2.name);

    // Guardar en historial para poder deshacer
    history.push({ k, p1, p2, wasInCombos: combos.some(c => c.primero === p1.name && c.segundo === p2.name) });

    // Animación
    if (val === true) {
        card.querySelector('#lblYes')?.classList.add('visible');
        card.classList.add('flash-yes');
        setTimeout(() => card.classList.add('fly-right'), 80);
    } else if (val === false) {
        card.querySelector('#lblNo')?.classList.add('visible');
        card.classList.add('flash-no');
        setTimeout(() => card.classList.add('fly-left'), 80);
    } else {
        card.classList.add('fly-up');
    }

    // Actualizar datos
    reviewed[k] = val;
    if (val === true) {
        combos.push({ primero: p1.name, segundo: p2.name });
    }

    queueIdx++;
    updateStats();

    // Guardar (debounced)
    scheduleSave();

    await delay(320);
    renderCard();
}

// ── Deshacer ──────────────────────────────────────────────────────────────────
async function undo() {
    if (!history.length) return;
    const last = history.pop();
    delete reviewed[last.k];
    combos = combos.filter(c => !(c.primero === last.p1.name && c.segundo === last.p2.name));
    // Reinsertar el par al principio de la cola
    pairs.splice(--queueIdx, 0, { p1: last.p1, p2: last.p2 });
    updateStats();
    scheduleSave();
    renderCard();
}

// ── Guardar ───────────────────────────────────────────────────────────────────
function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveToFirebase, 1200);
}

async function saveToFirebase() {
    try {
        await db.collection('foods').doc('combos').set({ combos, reviewed });
    } catch (e) {
        showToast('⚠️ Error guardando');
    }
}

// ── Done ──────────────────────────────────────────────────────────────────────
function renderDone() {
    const totalReviewed = Object.keys(reviewed).length;
    const totalCombos   = combos.length;
    document.getElementById('app').innerHTML = `
        <div class="done-screen">
            <div class="done-icon">🎉</div>
            <div class="done-title">¡Has revisado todos los pares!</div>
            <div class="done-sub">
                ${totalReviewed} combinaciones revisadas<br>
                <strong>${totalCombos} combos aprobados</strong> listos para el generador de menú
            </div>
            <button class="btn-primary" onclick="toggleCombos()">Ver combos aprobados</button>
            <button class="btn-primary" onclick="resetAndRestart()" style="background:var(--skip-color)">Revisar de nuevo</button>
        </div>
        <div class="combos-list" id="combosList" style="display:none">
            <h3>${totalCombos} combos aprobados</h3>
            ${renderCombosList()}
        </div>
    `;
}

function toggleCombos() {
    const el = document.getElementById('combosList');
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function renderCombosList() {
    if (!combos.length) return '<p style="color:var(--text-soft);font-size:0.85rem">Ningún combo aprobado aún.</p>';
    return combos.map((c, i) => `
        <div class="combo-row">
            <span class="p1">${c.primero}</span>
            <span class="plus">+</span>
            <span class="p2">${c.segundo}</span>
            <button class="btn-rm" onclick="removeCombo(${i})" title="Eliminar combo">✕</button>
        </div>`).join('');
}

async function removeCombo(idx) {
    combos.splice(idx, 1);
    await saveToFirebase();
    renderDone();
    showToast('Combo eliminado');
}

function resetAndRestart() {
    // Resetear revisados para empezar de nuevo (conservar combos aprobados)
    reviewed = {};
    history  = [];
    init();
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function updateStats() {
    const total    = pairs.length + Object.keys(reviewed).length;
    const done     = Object.keys(reviewed).length;
    const yes      = combos.length;
    const no       = Object.values(reviewed).filter(v => v === false).length;
    const pct      = total ? Math.round(done / total * 100) : 0;

    document.getElementById('statTotal').textContent    = total;
    document.getElementById('statReviewed').textContent = done;
    document.getElementById('statYes').textContent      = yes;
    document.getElementById('statNo').textContent       = no;
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressLabel').textContent = `${done} de ${total} revisados`;
}

// ── Teclado ───────────────────────────────────────────────────────────────────
function setupKeys() {
    document.addEventListener('keydown', e => {
        if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
        if (e.key === 'ArrowRight' || e.key === 'd') vote(true);
        else if (e.key === 'ArrowLeft'  || e.key === 'a') vote(false);
        else if (e.key === 'ArrowUp'    || e.key === 's') vote(null);
        else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undo(); }
    });
}

// ── Swipe táctil ──────────────────────────────────────────────────────────────
function setupSwipe(el) {
    if (!el) return;
    let startX = 0, startY = 0;
    el.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: true });
    el.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) vote(dx > 0);
        else if (dy < -60 && Math.abs(dy) > Math.abs(dx)) vote(null);
    }, { passive: true });
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
}

// ── Utility ───────────────────────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Start: gestionado por auth.onAuthStateChanged arriba ──────────────────────

