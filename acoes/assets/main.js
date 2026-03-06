const API_ACOES_URL = "https://api-selo-unicef-supabase-733cd76b2c05.herokuapp.com/acoes-nuca/";
const BRAZIL_STATES_GEOJSON_URL = "./data/brazil_states.geojson";
const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoibHVjYXN0aGF5bmFuLWVzdGFkYW8iLCJhIjoiY21tZmRrdXk1MDZpajJ0cHMyZW01aDg3MCJ9.1WXDZqllxNPv95_HuEEedA";

let rawData = [];
let filteredData = [];
let currentPage = 1;
let currentAlertPage = 1;
const rowsPerPage = 10;
let actionsMap = null;
let ufMap = {};
const chartInstances = {};

const COLORS = {
  primary: "#005980",
  secondary: "#E1A38E",
  light: "#EBEBD9",
  green: "#BCD876",
  yellow: "#D3A80A",
  gray: "#958C80"
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString("pt-BR");
}

function safeInt(value) {
  if (value === null || value === undefined || value === "") return 0;
  const normalized = String(value).replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeAction(row) {
  return {
    data_hora: String(row.data_hora || "").trim(),
    uf: String(row.uf || "").trim().toUpperCase(),
    municipio: String(row.municipio || "").trim(),
    mes_acao: String(row.mes_acao || "").trim(),
    tema: String(row.tema || "Não informado").trim() || "Não informado",
    descricao: String(row.descricao || "").trim(),
    local_acao: String(row.local_acao || "Não informado").trim() || "Não informado",
    adoles_parcipantes: safeInt(row.adoles_parcipantes),
    publico: safeInt(row.publico),
    rede_social: String(row.rede_social || "").trim(),
    link_acao: String(row.link_acao || "").trim(),
    ano_acao: safeInt(row.ano_acao)
  };
}

function aggregateByKey(data, keyFn, valueFn = () => 1) {
  return data.reduce((acc, item) => {
    const key = keyFn(item) || "Não informado";
    acc[key] = (acc[key] || 0) + valueFn(item);
    return acc;
  }, {});
}

function topNWithOthers(obj, limit = 5) {
  const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, limit);
  const othersTotal = entries.slice(limit).reduce((sum, [, value]) => sum + value, 0);
  if (othersTotal > 0) top.push(["Outros", othersTotal]);
  return top;
}

function buildMunicipioRows(data) {
  const grouped = {};
  data.forEach((item) => {
    const key = `${item.uf}__${item.municipio}`;
    if (!grouped[key]) {
      grouped[key] = {
        uf: item.uf,
        municipio: item.municipio,
        acoes_total: 0,
        adolescentes_total: 0,
        publico_total: 0
      };
    }
    grouped[key].acoes_total += 1;
    grouped[key].adolescentes_total += item.adoles_parcipantes;
    grouped[key].publico_total += item.publico;
  });
  return Object.values(grouped).sort((a, b) => {
    if (b.acoes_total !== a.acoes_total) return b.acoes_total - a.acoes_total;
    return a.municipio.localeCompare(b.municipio, "pt-BR");
  });
}

function createUfMapFromGeojson(geojson) {
  ufMap = {};
  geojson.features.forEach((feature) => {
    const uf = feature.properties.SIGLA || feature.properties.PK_sigla;
    const estado = feature.properties.Estado || uf;
    ufMap[uf] = estado;
  });
}

function buildStateRows(data) {
  const grouped = {};
  data.forEach((item) => {
    const uf = item.uf || "NI";
    if (!grouped[uf]) {
      grouped[uf] = {
        uf,
        estado: ufMap[uf] || uf,
        acoes: 0,
        adolescentes: 0,
        publico: 0,
        municipios: new Set()
      };
    }
    grouped[uf].acoes += 1;
    grouped[uf].adolescentes += item.adoles_parcipantes;
    grouped[uf].publico += item.publico;
    grouped[uf].municipios.add(item.municipio);
  });
  return Object.values(grouped)
    .map((item) => ({ ...item, municipios: item.municipios.size }))
    .sort((a, b) => b.acoes - a.acoes);
}

function setCounter(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = formatNumber(value);
}

function updateCounters(data) {
  const totalAcoes = data.length;
  const totalPublico = data.reduce((sum, item) => sum + item.publico, 0);
  const totalAdolescentes = data.reduce((sum, item) => sum + item.adoles_parcipantes, 0);
  const totalNucas = new Set(data.map((item) => `${item.uf}__${item.municipio}`)).size;

  setCounter(".members-number", totalAcoes);
  setCounter(".mun-number", totalPublico);
  setCounter(".adolescentes-number", totalAdolescentes);
  setCounter(".nucas-number", totalNucas);
}

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
  }
}

function createVerticalBarChart(canvasId, labels, values, labelName) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  destroyChart(canvasId);
  chartInstances[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: labelName,
        data: values,
        backgroundColor: [COLORS.primary, COLORS.secondary, COLORS.green, COLORS.yellow, COLORS.gray, COLORS.light],
        borderRadius: 6,
        maxBarThickness: 48
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${labelName}: ${formatNumber(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#3E3E3E", font: { family: "Inter", size: 11 } },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#3E3E3E",
            callback: (value) => formatNumber(value)
          }
        }
      }
    }
  });
}

function createHorizontalBarChart(canvasId, labels, values, labelName) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  destroyChart(canvasId);
  chartInstances[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: labelName,
        data: values,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        maxBarThickness: 28
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${labelName}: ${formatNumber(ctx.parsed.x)}`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            color: "#3E3E3E",
            callback: (value) => formatNumber(value)
          }
        },
        y: {
          ticks: { color: "#3E3E3E", font: { family: "Inter", size: 12 } },
          grid: { display: false }
        }
      }
    }
  });
}

function renderTopCharts(data) {
  const temas = topNWithOthers(aggregateByKey(data, (item) => item.tema));
  const locais = topNWithOthers(aggregateByKey(data, (item) => item.local_acao));

  createVerticalBarChart(
    "temasChart",
    temas.map(([label]) => label),
    temas.map(([, value]) => value),
    "Ações"
  );

  createVerticalBarChart(
    "locaisChart",
    locais.map(([label]) => label),
    locais.map(([, value]) => value),
    "Ações"
  );
}

function getYearOptions(data) {
  return [...new Set(data.map((item) => item.ano_acao).filter(Boolean))].sort((a, b) => b - a);
}

function populateYearFilter(data) {
  const select = document.getElementById("ez-select");
  if (!select) return;
  const years = getYearOptions(data);
  select.innerHTML = '<option value="todos">Todos os anos</option>' + years.map((year) => `<option value="${year}">${year}</option>`).join("");
  select.addEventListener("change", applyFilters);
}

function populateUfFilter(containerSelector, selectId, onChange) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  const ufs = [...new Set(rawData.map((item) => item.uf).filter(Boolean))].sort();
  container.innerHTML = `
    <select id="${selectId}">
      <option value="todos">Todos os estados</option>
      ${ufs.map((uf) => `<option value="${uf}">${uf}</option>`).join("")}
    </select>
  `;
  container.querySelector("select")?.addEventListener("change", onChange);
}

function updateSummaryTexts(data) {
  const totalMunicipios = new Set(data.map((item) => `${item.uf}__${item.municipio}`)).size;
  const totalAcoes = data.length;
  const totalPublico = data.reduce((sum, item) => sum + item.publico, 0);

  const textMain = document.querySelector(".text-space");
  const textAlert = document.querySelector(".text-space-alert");
  if (textMain) {
    textMain.textContent = `${formatNumber(totalMunicipios)} municípios com ${formatNumber(totalAcoes)} ações registradas e ${formatNumber(totalPublico)} pessoas mobilizadas.`;
  }
  if (textAlert) {
    textAlert.textContent = `${formatNumber(data.length)} registros individuais disponíveis para consulta.`;
  }
}

function renderMunicipioTable(data, page = 1) {
  const uf = document.getElementById("filter-uf-main")?.value || "todos";
  const rows = buildMunicipioRows(data).filter((item) => uf === "todos" || item.uf === uf);
  const tbody = document.querySelector(".table-container tbody");
  const pagination = document.getElementById("pagination-container");
  if (!tbody || !pagination) return;

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  tbody.innerHTML = pageRows.map((row) => `
    <tr>
      <td>${escapeHtml(row.uf)}</td>
      <td>${escapeHtml(row.municipio)}</td>
      <td>${formatNumber(row.acoes_total)}</td>
      <td>${formatNumber(row.adolescentes_total)}</td>
      <td>${formatNumber(row.publico_total)}</td>
    </tr>
  `).join("") || `<tr><td colspan="5">Nenhum dado encontrado.</td></tr>`;

  renderPagination(pagination, totalPages, currentPage, (newPage) => renderMunicipioTable(data, newPage));
}

function renderActionTable(data, page = 1) {
  const uf = document.getElementById("filter-uf-alert-select")?.value || "todos";
  const rows = [...data]
    .filter((item) => uf === "todos" || item.uf === uf)
    .sort((a, b) => (b.ano_acao - a.ano_acao) || a.municipio.localeCompare(b.municipio, "pt-BR"));

  const tbody = document.getElementById("tbody-alert");
  const pagination = document.getElementById("pagination-container-alert");
  if (!tbody || !pagination) return;

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  currentAlertPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentAlertPage - 1) * rowsPerPage, currentAlertPage * rowsPerPage);

  tbody.innerHTML = pageRows.map((row) => {
    const link = row.link_acao
      ? `<a href="${escapeHtml(row.link_acao)}" target="_blank" rel="noopener noreferrer">Ver link</a>`
      : "-";
    return `
      <tr>
        <td>${escapeHtml(row.uf)}</td>
        <td>${escapeHtml(row.municipio)}</td>
        <td title="${escapeHtml(row.tema)}">${escapeHtml(row.tema)}</td>
        <td title="${escapeHtml(row.local_acao)}">${escapeHtml(row.local_acao)}</td>
        <td>${formatNumber(row.ano_acao)}</td>
        <td>${formatNumber(row.publico)}</td>
        <td>${link}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="7">Nenhum dado encontrado.</td></tr>`;

  renderPagination(pagination, totalPages, currentAlertPage, (newPage) => renderActionTable(data, newPage));
}

function renderPagination(container, totalPages, current, onPageChange) {
  container.innerHTML = "";
  if (totalPages <= 1) return;

  const createBtn = (label, page, disabled = false, active = false) => {
    const btn = document.createElement("button");
    btn.className = "pagination-button";
    if (active) btn.classList.add("active");
    btn.disabled = disabled;
    btn.textContent = label;
    btn.addEventListener("click", () => onPageChange(page));
    return btn;
  };

  container.appendChild(createBtn("‹", Math.max(1, current - 1), current === 1));

  for (let page = 1; page <= totalPages; page += 1) {
    if (
      page === 1 ||
      page === totalPages ||
      (page >= current - 1 && page <= current + 1)
    ) {
      container.appendChild(createBtn(String(page), page, false, page === current));
    } else if (
      page === current - 2 ||
      page === current + 2
    ) {
      const ellipsis = document.createElement("span");
      ellipsis.className = "pagination-ellipsis";
      ellipsis.textContent = "...";
      container.appendChild(ellipsis);
    }
  }

  container.appendChild(createBtn("›", Math.min(totalPages, current + 1), current === totalPages));
}

async function renderMap(stateRows) {
  const response = await fetch(BRAZIL_STATES_GEOJSON_URL);
  const geojson = await response.json();
  createUfMapFromGeojson(geojson);

  const counts = Object.fromEntries(stateRows.map((row) => [row.uf, row.acoes]));
  geojson.features.forEach((feature) => {
    const uf = feature.properties.SIGLA || feature.properties.PK_sigla;
    feature.properties.acoes = counts[uf] || 0;
    const match = stateRows.find((row) => row.uf === uf);
    feature.properties.publico = match?.publico || 0;
    feature.properties.adolescentes = match?.adolescentes || 0;
    feature.properties.municipios = match?.municipios || 0;
  });

  if (actionsMap) {
    actionsMap.remove();
  }

  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
  actionsMap = new mapboxgl.Map({
    container: "mapbox-map",
    style: "mapbox://styles/mapbox/light-v11",
    center: [-54.0, -14.5],
    zoom: 2.8,
    attributionControl: false
  });

  actionsMap.on("load", () => {
    actionsMap.addSource("estados", { type: "geojson", data: geojson });
    actionsMap.addLayer({
      id: "estados-fill",
      type: "fill",
      source: "estados",
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "acoes"],
          0, "#EBEBD9",
          10, "#BCD876",
          50, "#D3A80A",
          100, "#E1A38E",
          250, "#005980"
        ],
        "fill-opacity": 0.9
      }
    });

    actionsMap.addLayer({
      id: "estados-line",
      type: "line",
      source: "estados",
      paint: {
        "line-color": "#FFFFFF",
        "line-width": 1.2
      }
    });

    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

    actionsMap.on("mousemove", "estados-fill", (event) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const props = feature.properties;
      popup
        .setLngLat(event.lngLat)
        .setHTML(`
          <div style="font-family: Inter, sans-serif;">
            <strong>${escapeHtml(props.Estado || props.SIGLA)}</strong><br>
            Ações: ${formatNumber(props.acoes)}<br>
            Municípios com registros: ${formatNumber(props.municipios)}<br>
            Adolescentes engajados: ${formatNumber(props.adolescentes)}<br>
            Pessoas mobilizadas: ${formatNumber(props.publico)}
          </div>
        `)
        .addTo(actionsMap);
    });

    actionsMap.on("mouseleave", "estados-fill", () => popup.remove());
  });
}

function renderStateBarChart(stateRows) {
  createHorizontalBarChart(
    "nucasBarChart",
    stateRows.map((row) => row.uf),
    stateRows.map((row) => row.acoes),
    "Ações"
  );
}

function applyFilters() {
  const yearValue = document.getElementById("ez-select")?.value || "todos";
  filteredData = rawData.filter((item) => yearValue === "todos" || String(item.ano_acao) === yearValue);

  updateCounters(filteredData);
  renderTopCharts(filteredData);
  updateSummaryTexts(filteredData);

  const stateRows = buildStateRows(filteredData);
  renderMap(stateRows);
  renderStateBarChart(stateRows);
  renderMunicipioTable(filteredData, 1);
  renderActionTable(filteredData, 1);
}

function setupLanguageButtons() {
  const pt = document.querySelector(".lang-pt");
  const en = document.querySelector(".lang-en");
  const toggleActive = (target) => {
    pt?.classList.toggle("active", target === "pt");
    en?.classList.toggle("active", target === "en");
  };
  pt?.addEventListener("click", () => toggleActive("pt"));
  en?.addEventListener("click", () => toggleActive("en"));
}

async function init() {
  setupLanguageButtons();

  try {
    const response = await fetch(API_ACOES_URL);
    const data = await response.json();
    // rawData = Array.isArray(data) ? data.map(normalizeAction).filter((item) => item.uf && item.municipio) : [];
    rawData = data

    console.log("Dados carregados:", data);

    const geojsonResponse = await fetch(BRAZIL_STATES_GEOJSON_URL);
    const geojson = await geojsonResponse.json();
    createUfMapFromGeojson(geojson);

    populateYearFilter(rawData);
    populateUfFilter(".filter-uf", "filter-uf-main", () => renderMunicipioTable(filteredData, 1));
    populateUfFilter(".filter-uf-alert", "filter-uf-alert-select", () => renderActionTable(filteredData, 1));
    applyFilters();
  } catch (error) {
    console.error("Erro ao carregar dados da API:", error);
    const textMain = document.querySelector(".text-space");
    const textAlert = document.querySelector(".text-space-alert");
    if (textMain) textMain.textContent = "Erro ao carregar os dados.";
    if (textAlert) textAlert.textContent = "Erro ao carregar os dados.";
  }
}

document.addEventListener("DOMContentLoaded", init);
