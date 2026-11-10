/* ============================================================
   Velyria TTRPG — Lógica de Personaje (v3)
   ============================================================ */

const STORAGE_KEY = 'velyria_characters';
let characters = [];
let currentCharId = null;
let isEditing = false;

// --- Utilidades ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const calculateModifier = (score) => {
  const mod = Math.trunc((parseInt(score) - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
};

const getEmptyCharacter = () => ({
  id: generateId(),
  nombre: '', clase: '', subclase: '', nivel: 1, etnia: 'Indeterminada',
  stats: { fuerza: 10, destreza: 10, constitucion: 10, inteligencia: 10, sabiduria: 10, carisma: 10 },
  combate: { hp_current: 10, hp_max: 10, ac: 10, velocidad: 6 },
  inventario: [],
  caracteristicas: []
});

// --- Persistencia ---
function loadCharacters() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    characters = JSON.parse(data);
    characters.forEach(c => {
      if (c.combate.hp !== undefined) {
        c.combate.hp_max = c.combate.hp;
        c.combate.hp_current = c.combate.hp;
        delete c.combate.hp;
      }
    });
  } else {
    characters = [];
  }
}

function saveCharacters() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
}

// --- Renderizado Principal (Vista de lectura o estado vacío) ---
function renderApp() {
  const app = document.getElementById('character-app');
  if (isEditing) return; // Si estamos editando, el formulario maneja su propio DOM
  
  if (characters.length === 0) {
    app.innerHTML = `
      <div class="empty-state">
        <h2>No hay personajes creados</h2>
        <p>Comienza tu aventura creando tu primer héroe.</p>
        <button class="btn btn-primary" onclick="startCreate()">Crear Personaje</button>
      </div>
    `;
    return;
  }

  if (!currentCharId || !characters.find(c => c.id === currentCharId)) {
    currentCharId = characters[0].id;
  }

  const char = characters.find(c => c.id === currentCharId);
  renderView(char);
}

// --- Vista de Lectura (Hoja de Personaje) ---
function renderView(char) {
  const app = document.getElementById('character-app');
  const options = characters.map(c => `<option value="${c.id}" ${c.id === char.id ? 'selected' : ''}>${c.nombre || 'Sin nombre'}</option>`).join('');

  const priority = { accion: 1, adicional: 2, reaccion: 3, pasivo: 4 };
  const sortedFeatures = [...char.caracteristicas].sort((a, b) => (priority[a.tipo] || 5) - (priority[b.tipo] || 5));

  app.innerHTML = `
    <div class="toolbar">
      <select onchange="selectCharacter(this.value)" class="char-select">${options}</select>
      <div class="toolbar-actions">
        <button class="btn btn-secondary" onclick="startEdit()">Editar</button>
        <button class="btn btn-danger" onclick="deleteCharacter()">Borrar</button>
        <button class="btn btn-primary" onclick="startCreate()">Nuevo</button>
      </div>
    </div>

    <div class="sheet">
      <div class="sheet-header">
        <h2>${char.nombre || 'Sin Nombre'}</h2>
        <p>${char.clase} ${char.subclase ? `(${char.subclase})` : ''} • Nivel ${char.nivel} • ${char.etnia}</p>
      </div>

      <div class="sheet-grid">
        <!-- Combate -->
        <div class="panel">
          <h3>Combate</h3>
          <div class="combat-stats">
            <div class="stat-box">
              <span>PG (Puntos de Golpe)</span>
              <strong>${char.combate.hp_current} / ${char.combate.hp_max}</strong>
            </div>
            <div class="stat-box"><span>CA</span><strong>${char.combate.ac}</strong></div>
            <div class="stat-box"><span>Velocidad</span><strong>${char.combate.velocidad} casillas</strong></div>
          </div>
          
          <div class="hp-controls">
            <input type="number" id="hp-amount" placeholder="Cant." min="1" style="width: 70px;">
            <button class="btn btn-danger btn-sm" onclick="modifyHP(-1)">Recibir Daño</button>
            <button class="btn btn-secondary btn-sm" onclick="modifyHP(1)">Curar</button>
          </div>
        </div>

        <!-- Atributos -->
        <div class="panel">
          <h3>Atributos</h3>
          <div class="attributes-grid">
            ${Object.entries(char.stats).map(([key, val]) => `
              <div class="attr-box">
                <span class="attr-name">${key.substring(0,3).toUpperCase()}</span>
                <span class="attr-score">${val}</span>
                <span class="attr-mod">${calculateModifier(val)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Características Especiales (Ordenadas y sin scroll) -->
        <div class="panel full-width">
          <h3>Características y Acciones</h3>
          ${sortedFeatures.length === 0 ? '<p class="text-muted">No hay características añadidas.</p>' : ''}
          <ul class="features-list">
            ${sortedFeatures.map(f => `
              <li>
                <span class="shape shape-${f.tipo}" title="${f.tipo}"></span>
                <div class="feature-text">
                  <strong>${f.nombre}</strong>
                  <div class="feature-desc">${f.descripcion || 'Sin descripción.'}</div>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>

        <!-- Inventario -->
        <div class="panel full-width">
          <h3>Inventario</h3>
          ${char.inventario.length === 0 ? '<p class="text-muted">Inventario vacío.</p>' : ''}
          <ul class="inventory-list">
            ${char.inventario.map(i => `
              <li>
                <div class="inv-header">
                  <strong>${i.cantidad}x ${i.nombre}</strong>
                  ${i.equipado ? '<span class="badge">Equipado</span>' : ''}
                </div>
                ${i.descripcion ? `<div class="inv-desc">${i.descripcion}</div>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    </div>
  `;
}

// --- Vista de Edición / Creación (Formulario) ---
function renderForm(char) {
  const app = document.getElementById('character-app');
  
  app.innerHTML = `
    <div class="toolbar">
      <h2>${char.nombre ? 'Editando' : 'Nuevo Personaje'}</h2>
      <div class="toolbar-actions">
        <button class="btn btn-secondary" onclick="cancelEdit()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveForm()">Guardar</button>
      </div>
    </div>

    <form id="char-form" class="sheet-form" onsubmit="event.preventDefault();">
      <!-- Datos Básicos -->
      <div class="form-row">
        <label>Nombre <input type="text" id="f-nombre" value="${char.nombre}" required></label>
        <label>Clase <input type="text" id="f-clase" value="${char.clase}"></label>
        <label>Subclase <input type="text" id="f-subclase" value="${char.subclase}"></label>
      </div>
      <div class="form-row">
        <label>Nivel <input type="number" id="f-nivel" value="${char.nivel}" min="1" max="20"></label>
        <label>Etnia 
          <select id="f-etnia">
            ${['Selgiano', 'Calumiense', 'Bornomés', 'Magnio', 'Indeterminada'].map(e => `<option value="${e}" ${char.etnia === e ? 'selected' : ''}>${e}</option>`).join('')}
          </select>
        </label>
      </div>

      <!-- Combate -->
      <h3>Combate</h3>
      <div class="form-row">
        <label>PG Máximos <input type="number" id="f-hp-max" value="${char.combate.hp_max}" min="1"></label>
        <label>PG Actuales <input type="number" id="f-hp-current" value="${char.combate.hp_current}" min="0"></label>
        <label>Clase de Armadura (CA) <input type="number" id="f-ac" value="${char.combate.ac}"></label>
        <label>Velocidad (casillas) <input type="number" id="f-vel" value="${char.combate.velocidad}"></label>
      </div>

      <!-- Atributos -->
      <h3>Atributos</h3>
      <div class="form-row attributes-row">
        ${Object.keys(char.stats).map(stat => `
          <label>${stat.substring(0,3).toUpperCase()} 
            <input type="number" class="stat-input" data-stat="${stat}" value="${char.stats[stat]}" oninput="updateModPreview(this)">
            <span class="mod-preview" id="mod-${stat}">${calculateModifier(char.stats[stat])}</span>
          </label>
        `).join('')}
      </div>

      <!-- Características Dinámicas (Acordeones) -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--card-border); padding-bottom: 6px; margin: 20px 0 12px;">
        <h3 style="border: none; margin: 0; padding: 0;">Características y Acciones</h3>
        <button type="button" class="btn btn-secondary btn-sm" onclick="addFeature()">+ Añadir</button>
      </div>
      <div id="features-container">
        ${char.caracteristicas.map((f) => renderFeatureItem(f)).join('')}
      </div>

      <!-- Inventario Dinámico -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--card-border); padding-bottom: 6px; margin: 20px 0 12px;">
        <h3 style="border: none; margin: 0; padding: 0;">Inventario</h3>
        <button type="button" class="btn btn-secondary btn-sm" onclick="addInventory()">+ Añadir</button>
      </div>
      <div id="inventory-container">
        ${char.inventario.map((i) => renderInventoryRow(i)).join('')}
      </div>
    </form>
  `;
}

function renderFeatureItem(f) {
  const isNew = !f.nombre;
  return `
    <details class="feature-item" ${isNew ? 'open' : ''}>
      <summary>
        <span class="shape shape-${f.tipo || 'accion'}"></span>
        <span class="summary-name">${f.nombre || 'Nueva Característica'}</span>
      </summary>
      <div class="feature-details">
        <div class="form-row">
          <label style="flex: 2;">Nombre <input type="text" class="f-name" value="${f.nombre || ''}" placeholder="Ej. Bola de Fuego"></label>
          <label style="flex: 1;">Tipo 
            <select class="f-tipo" onchange="updateSummaryShape(this)">
              <option value="accion" ${f.tipo === 'accion' ? 'selected' : ''}>Acción (Verde)</option>
              <option value="adicional" ${f.tipo === 'adicional' ? 'selected' : ''}>Acc. Adicional (Naranja)</option>
              <option value="reaccion" ${f.tipo === 'reaccion' ? 'selected' : ''}>Reacción (Violeta)</option>
              <option value="pasivo" ${f.tipo === 'pasivo' ? 'selected' : ''}>Pasivo (Amarillo)</option>
            </select>
          </label>
        </div>
        <label>Descripción / Efecto
          <textarea class="f-desc" rows="3" placeholder="Escribe los detalles, daño, alcance (en casillas), etc...">${f.descripcion || ''}</textarea>
        </label>
        <div style="text-align: right;">
          <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.feature-item').remove()">Eliminar Característica</button>
        </div>
      </div>
    </details>
  `;
}

function renderInventoryRow(i) {
  return `
    <div class="dynamic-row inv-row">
      <input type="text" placeholder="Objeto" class="i-name" value="${i.nombre || ''}">
      <input type="number" placeholder="Cant." class="i-qty" value="${i.cantidad || 1}" min="1">
      <input type="text" placeholder="Descripción / Efecto" class="i-desc" value="${i.descripcion || ''}">
      <label class="checkbox-label"><input type="checkbox" class="i-eq" ${i.equipado ? 'checked' : ''}> Equipado</label>
      <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">X</button>
    </div>
  `;
}

// --- Acciones del Usuario ---
window.selectCharacter = (id) => {
  currentCharId = id;
  renderApp();
};

window.startCreate = () => {
  const newChar = getEmptyCharacter();
  currentCharId = newChar.id;
  isEditing = true;
  renderForm(newChar); // Llamada directa, sin pasar por renderApp
};

window.startEdit = () => {
  const char = characters.find(c => c.id === currentCharId);
  isEditing = true;
  renderForm(char); // Llamada directa, sin pasar por renderApp
};

window.cancelEdit = () => {
  isEditing = false;
  renderApp();
};

window.deleteCharacter = () => {
  if (confirm('¿Estás seguro de que quieres borrar este personaje?')) {
    characters = characters.filter(c => c.id !== currentCharId);
    currentCharId = null;
    saveCharacters();
    renderApp();
  }
};

window.updateModPreview = (input) => {
  const stat = input.dataset.stat;
  const preview = document.getElementById(`mod-${stat}`);
  preview.textContent = calculateModifier(input.value);
};

window.updateSummaryShape = (select) => {
  const details = select.closest('.feature-item');
  const summaryShape = details.querySelector('summary .shape');
  const newType = select.value;
  summaryShape.className = `shape shape-${newType}`;
};

window.addFeature = () => {
  const container = document.getElementById('features-container');
  container.insertAdjacentHTML('beforeend', renderFeatureItem({}));
};

window.addInventory = () => {
  const container = document.getElementById('inventory-container');
  container.insertAdjacentHTML('beforeend', renderInventoryRow({}));
};

window.modifyHP = (direction) => {
  const amountInput = document.getElementById('hp-amount');
  const amount = parseInt(amountInput.value);
  
  if (!amount || amount <= 0) {
    alert("Introduce un número mayor a 0 para dañar o curar.");
    return;
  }

  const char = characters.find(c => c.id === currentCharId);
  
  if (direction === -1) {
    char.combate.hp_current = Math.max(0, char.combate.hp_current - amount);
  } else {
    char.combate.hp_current = Math.min(char.combate.hp_max, char.combate.hp_current + amount);
  }

  saveCharacters();
  renderView(char);
};

window.saveForm = () => {
  const form = document.getElementById('char-form');
  if (!form.querySelector('#f-nombre').value.trim()) {
    alert("El nombre es obligatorio.");
    return;
  }

  const newChar = {
    id: currentCharId,
    nombre: document.getElementById('f-nombre').value,
    clase: document.getElementById('f-clase').value,
    subclase: document.getElementById('f-subclase').value,
    nivel: parseInt(document.getElementById('f-nivel').value) || 1,
    etnia: document.getElementById('f-etnia').value,
    combate: {
      hp_max: parseInt(document.getElementById('f-hp-max').value) || 1,
      hp_current: parseInt(document.getElementById('f-hp-current').value) || 0,
      ac: parseInt(document.getElementById('f-ac').value) || 10,
      velocidad: parseInt(document.getElementById('f-vel').value) || 6
    },
    stats: {},
    inventario: [],
    caracteristicas: []
  };

  if (newChar.combate.hp_current > newChar.combate.hp_max) {
    newChar.combate.hp_current = newChar.combate.hp_max;
  }

  document.querySelectorAll('.stat-input').forEach(input => {
    newChar.stats[input.dataset.stat] = parseInt(input.value) || 10;
  });

  document.querySelectorAll('.feature-item').forEach(item => {
    const nombre = item.querySelector('.f-name').value.trim();
    if (nombre) {
      newChar.caracteristicas.push({
        nombre: nombre,
        descripcion: item.querySelector('.f-desc').value.trim(),
        tipo: item.querySelector('.f-tipo').value
      });
    }
  });

  document.querySelectorAll('.inv-row').forEach(row => {
    const nombre = row.querySelector('.i-name').value.trim();
    if (nombre) {
      newChar.inventario.push({
        nombre: nombre,
        cantidad: parseInt(row.querySelector('.i-qty').value) || 1,
        descripcion: row.querySelector('.i-desc').value.trim(),
        equipado: row.querySelector('.i-eq').checked
      });
    }
  });

  const existingIndex = characters.findIndex(c => c.id === currentCharId);
  if (existingIndex >= 0) {
    characters[existingIndex] = newChar;
  } else {
    characters.push(newChar); // Aquí ya no se sobreescriben los nuevos personajes
  }

  saveCharacters();
  isEditing = false;
  renderApp();
};

// --- Inicialización ---
loadCharacters();
renderApp();