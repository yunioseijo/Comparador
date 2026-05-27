const STORAGE_KEY = "decision-comparator-state-v1";

const templates = {
  house: {
    title: "Me mudo a otra casa o no",
    items: ["Casa actual", "Casa opcion A"],
    criteria: [
      "Precio de alquiler o compra",
      "Ubicacion",
      "Seguridad de la zona",
      "Distancia al trabajo",
      "Transporte publico cercano",
      "Tiempo de traslado",
      "Tamano general",
      "Numero de habitaciones",
      "Tamano de cocina",
      "Tamano de bano",
      "Estado del inmueble",
      "Luz natural",
      "Ventilacion",
      "Ruido exterior",
      "Vecindario",
      "Parqueadero",
      "Mascotas permitidas",
      "Costo de servicios",
      "Humedad o filtraciones",
      "Altura del techo",
      "Espacio de almacenamiento",
      "Sensacion personal de bienestar"
    ]
  },
  car: {
    title: "Comparar autos",
    items: ["Auto opcion A", "Auto opcion B"],
    criteria: [
      "Precio",
      "Consumo de combustible",
      "Kilometraje",
      "Estado mecanico",
      "Seguridad",
      "Costo de mantenimiento",
      "Disponibilidad de repuestos",
      "Marca y confiabilidad",
      "Espacio interior",
      "Maletero",
      "Comodidad",
      "Tecnologia incluida",
      "Seguro",
      "Impuestos",
      "Reventa",
      "Historial de accidentes",
      "Uso en ciudad",
      "Uso en carretera",
      "Sensacion de manejo"
    ]
  },
  phone: {
    title: "Comparar moviles",
    items: ["Movil opcion A", "Movil opcion B"],
    criteria: [
      "Precio",
      "Camara",
      "Bateria",
      "Pantalla",
      "Rendimiento",
      "Almacenamiento",
      "Memoria RAM",
      "Sistema operativo",
      "Actualizaciones",
      "Tamano",
      "Peso",
      "Diseno",
      "Resistencia",
      "Carga rapida",
      "Calidad de audio",
      "Ecosistema",
      "Reventa",
      "Garantia",
      "Relacion calidad/precio"
    ]
  },
  laptop: {
    title: "Comparar laptops",
    items: ["Laptop opcion A", "Laptop opcion B"],
    criteria: [
      "Precio",
      "Procesador",
      "Memoria RAM",
      "Almacenamiento",
      "Pantalla",
      "Bateria",
      "Peso",
      "Tamano",
      "Teclado",
      "Trackpad",
      "Puertos",
      "Calidad de construccion",
      "Sistema operativo",
      "Graficos/GPU",
      "Ruido",
      "Temperatura",
      "Garantia",
      "Reparabilidad",
      "Uso para trabajo",
      "Uso para estudio",
      "Uso para gaming",
      "Relacion calidad/precio"
    ]
  },
  blank: {
    title: "Nueva comparacion",
    items: ["Opcion A", "Opcion B"],
    criteria: []
  }
};

const els = {
  setupForm: document.querySelector("#setupForm"),
  comparisonTitle: document.querySelector("#comparisonTitle"),
  templateSelect: document.querySelector("#templateSelect"),
  resetButton: document.querySelector("#resetButton"),
  itemForm: document.querySelector("#itemForm"),
  itemName: document.querySelector("#itemName"),
  criterionForm: document.querySelector("#criterionForm"),
  criterionName: document.querySelector("#criterionName"),
  criterionWeight: document.querySelector("#criterionWeight"),
  comparisonTable: document.querySelector("#comparisonTable"),
  rankingList: document.querySelector("#rankingList"),
  scoreChart: document.querySelector("#scoreChart"),
  radarChart: document.querySelector("#radarChart")
};

let state = loadState() || createComparison("house");
let scoreChart;
let radarChart;

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createComparison(templateKey) {
  const template = templates[templateKey] || templates.blank;
  const criteria = template.criteria.map((name) => ({
    id: createId("criterion"),
    name,
    weight: 3
  }));

  return {
    id: createId("comparison"),
    title: template.title,
    template: templateKey,
    criteria,
    items: template.items.map((name) => ({
      id: createId("item"),
      name,
      values: Object.fromEntries(criteria.map((criterion) => [criterion.id, 0]))
    })),
    updatedAt: new Date().toISOString()
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("No se pudo cargar el estado guardado", error);
    return null;
  }
}

function saveState() {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getValueClass(value) {
  if (value <= -3) return "value-negative";
  if (value < 0) return "value-soft-negative";
  if (value === 0) return "value-neutral";
  if (value <= 2) return "value-soft-positive";
  return "value-positive";
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (Number.isNaN(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function getItemScore(item) {
  return state.criteria.reduce((total, criterion) => {
    const value = Number(item.values[criterion.id] || 0);
    return total + value * Number(criterion.weight || 0);
  }, 0);
}

function getRanking() {
  return [...state.items]
    .map((item) => ({ ...item, score: getItemScore(item) }))
    .sort((a, b) => b.score - a.score);
}

function render() {
  els.comparisonTitle.value = state.title;
  els.templateSelect.value = state.template;
  renderTable();
  renderRanking();
  renderCharts();
}

function renderTable() {
  if (state.items.length === 0) {
    els.comparisonTable.innerHTML = '<p class="empty-state">Agrega al menos una opcion para empezar.</p>';
    return;
  }

  const itemHeaders = state.items
    .map(
      (item) => `
        <th>
          <div class="item-heading">
            <input class="item-name" data-action="rename-item" data-item-id="${item.id}" value="${escapeHtml(item.name)}" aria-label="Nombre de opcion" />
            <button class="delete-button" data-action="delete-item" data-item-id="${item.id}" type="button">Eliminar</button>
          </div>
        </th>`
    )
    .join("");

  const rows = state.criteria
    .map((criterion) => {
      const cells = state.items
        .map((item) => {
          const value = Number(item.values[criterion.id] || 0);
          return `
            <td class="score-cell">
              <div class="range-row">
                <input data-action="update-value" data-item-id="${item.id}" data-criterion-id="${criterion.id}" type="range" min="-5" max="5" step="1" value="${value}" aria-label="Valor de ${escapeHtml(criterion.name)} para ${escapeHtml(item.name)}" />
                <span class="value-pill ${getValueClass(value)}">${value}</span>
              </div>
            </td>`;
        })
        .join("");

      return `
        <tr>
          <td>
            <div class="criterion-cell">
              <input class="criterion-name" data-action="rename-criterion" data-criterion-id="${criterion.id}" value="${escapeHtml(criterion.name)}" aria-label="Nombre del criterio" />
              <button class="delete-button" data-action="delete-criterion" data-criterion-id="${criterion.id}" type="button">Eliminar</button>
            </div>
          </td>
          <td>
            <input class="weight-input" data-action="update-weight" data-criterion-id="${criterion.id}" type="number" min="0" max="5" step="1" value="${criterion.weight}" aria-label="Peso de ${escapeHtml(criterion.name)}" />
          </td>
          ${cells}
        </tr>`;
    })
    .join("");

  const totals = state.items.map((item) => `<td>${getItemScore(item)} pts</td>`).join("");

  els.comparisonTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Criterio</th>
          <th>Peso</th>
          ${itemHeaders}
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="99"><p class="empty-state">Agrega criterios para calcular puntajes.</p></td></tr>'}
        <tr class="total-row">
          <td>Total</td>
          <td></td>
          ${totals}
        </tr>
      </tbody>
    </table>`;
}

function renderRanking() {
  const ranking = getRanking();
  if (ranking.length === 0) {
    els.rankingList.innerHTML = '<p class="empty-state">Aun no hay opciones.</p>';
    return;
  }

  const max = Math.max(...ranking.map((item) => Math.abs(item.score)), 1);

  els.rankingList.innerHTML = ranking
    .map((item, index) => {
      const width = Math.max(6, Math.round((Math.abs(item.score) / max) * 100));
      return `
        <article class="rank-card">
          <div class="rank-title">
            <span>${index + 1}. ${escapeHtml(item.name)}</span>
            <span class="rank-score">${item.score} pts</span>
          </div>
          <div class="rank-bar" aria-hidden="true"><span style="width: ${width}%"></span></div>
        </article>`;
    })
    .join("");
}

function renderCharts() {
  if (!window.Chart) return;

  const ranking = getRanking();
  const labels = state.items.map((item) => item.name);
  const scores = state.items.map((item) => getItemScore(item));
  const palette = ["#3157ff", "#00a985", "#e2892f", "#9b5cff", "#d44444", "#12a8c8"];

  if (scoreChart) scoreChart.destroy();
  scoreChart = new Chart(els.scoreChart, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Puntaje",
          data: scores,
          borderRadius: 14,
          backgroundColor: labels.map((_, index) => palette[index % palette.length])
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: "#172033", padding: 12, cornerRadius: 12 }
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "rgba(100, 112, 137, 0.16)" } }
      }
    }
  });

  const radarCriteria = state.criteria.slice(0, 10);
  if (radarChart) radarChart.destroy();
  radarChart = new Chart(els.radarChart, {
    type: "radar",
    data: {
      labels: radarCriteria.map((criterion) => criterion.name),
      datasets: ranking.slice(0, 4).map((item, index) => ({
        label: item.name,
        data: radarCriteria.map((criterion) => Number(item.values[criterion.id] || 0)),
        borderColor: palette[index % palette.length],
        backgroundColor: `${palette[index % palette.length]}26`,
        pointBackgroundColor: palette[index % palette.length],
        borderWidth: 2
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: { backgroundColor: "#172033", padding: 12, cornerRadius: 12 }
      },
      scales: {
        r: {
          min: -5,
          max: 5,
          ticks: { stepSize: 1, backdropColor: "transparent" },
          grid: { color: "rgba(100, 112, 137, 0.18)" },
          angleLines: { color: "rgba(100, 112, 137, 0.2)" }
        }
      }
    }
  });
}

function updateAndRender() {
  saveState();
  render();
}

function addItem(name) {
  const values = Object.fromEntries(state.criteria.map((criterion) => [criterion.id, 0]));
  state.items.push({ id: createId("item"), name, values });
  updateAndRender();
}

function addCriterion(name, weight) {
  const criterion = { id: createId("criterion"), name, weight };
  state.criteria.push(criterion);
  state.items.forEach((item) => {
    item.values[criterion.id] = 0;
  });
  updateAndRender();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const nextState = createComparison(els.templateSelect.value);
  nextState.title = els.comparisonTitle.value.trim() || nextState.title;
  state = nextState;
  updateAndRender();
});

els.comparisonTitle.addEventListener("input", () => {
  state.title = els.comparisonTitle.value;
  saveState();
});

els.resetButton.addEventListener("click", () => {
  if (!confirm("Quieres borrar la comparacion actual y volver a la plantilla de casa?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = createComparison("house");
  updateAndRender();
});

els.itemForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = els.itemName.value.trim();
  if (!name) return;
  addItem(name);
  els.itemName.value = "";
});

els.criterionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = els.criterionName.value.trim();
  if (!name) return;
  const weight = clampNumber(els.criterionWeight.value, 0, 5);
  addCriterion(name, weight);
  els.criterionName.value = "";
  els.criterionWeight.value = "3";
});

els.comparisonTable.addEventListener("input", (event) => {
  const target = event.target;
  const action = target.dataset.action;
  if (!action) return;

  if (action === "update-value") {
    const item = state.items.find((current) => current.id === target.dataset.itemId);
    if (!item) return;
    item.values[target.dataset.criterionId] = clampNumber(target.value, -5, 5);
  }

  if (action === "update-weight") {
    const criterion = state.criteria.find((current) => current.id === target.dataset.criterionId);
    if (!criterion) return;
    criterion.weight = clampNumber(target.value, 0, 5);
  }

  if (action === "rename-item") {
    const item = state.items.find((current) => current.id === target.dataset.itemId);
    if (!item) return;
    item.name = target.value;
    saveState();
    renderRanking();
    renderCharts();
    return;
  }

  if (action === "rename-criterion") {
    const criterion = state.criteria.find((current) => current.id === target.dataset.criterionId);
    if (!criterion) return;
    criterion.name = target.value;
    saveState();
    renderCharts();
    return;
  }

  updateAndRender();
});

els.comparisonTable.addEventListener("click", (event) => {
  const target = event.target;
  const action = target.dataset.action;
  if (action === "delete-item") {
    state.items = state.items.filter((item) => item.id !== target.dataset.itemId);
    updateAndRender();
  }

  if (action === "delete-criterion") {
    state.criteria = state.criteria.filter((criterion) => criterion.id !== target.dataset.criterionId);
    state.items.forEach((item) => delete item.values[target.dataset.criterionId]);
    updateAndRender();
  }
});

render();
saveState();
