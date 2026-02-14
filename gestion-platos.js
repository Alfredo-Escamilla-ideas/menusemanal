// ====================================
// CONFIGURACIÓN FIREBASE
// ====================================
let db = null;

try {
    const firebaseConfig = {
        apiKey: "AIzaSyDPxRwlqftP-RoeJILhw_PsM3fsqCFIfqo",
        authDomain: "comidas-fef2a.firebaseapp.com",
        projectId: "comidas-fef2a",
        storageBucket: "comidas-fef2a.firebasestorage.app",
        messagingSenderId: "926708903105",
        appId: "1:926708903105:web:b09e5c6d2a1c8cfac5f32b"
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
            const doc = await db.collection('menuData').doc(CUSTOM_FOODS_DOC_ID).get();
            if (doc.exists) {
                customFoods = doc.data();
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

    // Guardar en Firebase
    if (db) {
        try {
            await db.collection('menuData').doc(CUSTOM_FOODS_DOC_ID).set(customFoods);
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
        const plates = customFoods[category] || [];
        if (plates.length === 0) continue;

        hasPlates = true;

        const section = document.createElement('div');
        section.className = 'category-section';
        section.innerHTML = `<div class="category-title">${title}</div>`;

        plates.forEach((plate, index) => {
            const plateDiv = document.createElement('div');
            plateDiv.className = 'plate-item';

            const name = typeof plate === 'string' ? plate : plate.name;
            const description = typeof plate === 'object' ? plate.description : '';

            plateDiv.innerHTML = `
                <div class="plate-info">
                    <div class="plate-name">${name}</div>
                    ${description ? `<div class="plate-description">${description}</div>` : ''}
                </div>
                <div class="plate-actions">
                    <button class="btn-edit" onclick="editPlate('${category}', ${index})">✏️ Editar</button>
                    <button class="btn-delete" onclick="deletePlate('${category}', ${index})">🗑️ Eliminar</button>
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
    const category = document.getElementById('plateCategory').value;
    const description = document.getElementById('plateDescription').value.trim();

    if (!name) {
        alert('Por favor, introduce el nombre del plato');
        return;
    }

    const customFoods = await loadPlates();

    if (!customFoods[category]) {
        customFoods[category] = [];
    }

    // Crear objeto de plato con nombre y descripción
    const plate = {
        name: name,
        description: description || ''
    };

    customFoods[category].push(plate);
    await savePlates(customFoods);

    // Limpiar formulario
    document.getElementById('plateName').value = '';
    document.getElementById('plateDescription').value = '';

    // Recargar lista
    renderPlates(customFoods);

    alert(`✅ Plato "${name}" añadido correctamente`);
}

// Editar plato
async function editPlate(category, index) {
    const customFoods = await loadPlates();
    const plate = customFoods[category][index];

    const name = typeof plate === 'string' ? plate : plate.name;
    const description = typeof plate === 'object' ? plate.description : '';

    const newName = prompt('Nuevo nombre del plato:', name);
    if (newName === null) return; // Cancelado

    const newDescription = prompt('Nueva descripción (opcional):', description);
    if (newDescription === null) return; // Cancelado

    customFoods[category][index] = {
        name: newName.trim() || name,
        description: newDescription.trim()
    };

    await savePlates(customFoods);
    renderPlates(customFoods);
}

// Eliminar plato
async function deletePlate(category, index) {
    const customFoods = await loadPlates();
    const plate = customFoods[category][index];
    const name = typeof plate === 'string' ? plate : plate.name;

    if (!confirm(`¿Estás seguro de eliminar "${name}"?`)) return;

    customFoods[category].splice(index, 1);
    await savePlates(customFoods);
    renderPlates(customFoods);
}

// ====================================
// INICIALIZACIÓN
// ====================================

loadPlates();
