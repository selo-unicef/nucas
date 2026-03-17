const API_ACOES_URL =
  "https://api-selo-unicef-supabase-733cd76b2c05.herokuapp.com/acoes-nuca/";
const API_NUCAS_URL =
  "https://api-selo-unicef-supabase-733cd76b2c05.herokuapp.com/nucas/";
const BRAZIL_STATES_GEOJSON_URL = "./data/brazil_states.geojson";
const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1IjoibHVjYXN0aGF5bmFuLWVzdGFkYW8iLCJhIjoiY21tZmRrdXk1MDZpajJ0cHMyZW01aDg3MCJ9.1WXDZqllxNPv95_HuEEedA";

let rawData = [];
let nucasData = [];
let filteredData = [];
let currentPage = 1;
let currentAlertPage = 1;
let currentTerritory = "todos";
const rowsPerPage = 10;
let actionsMap = null;
let ufMap = {};
const chartInstances = {};

const COLORS = {
  primary: "#E1A38E",
  secondary: "#E1A38E",
  light: "#EBEBD9",
  green: "#BCD876",
  yellow: "#D3A80A",
  gray: "#958C80",
};

// Mapeamento para Amazônia Legal e Semiárido
const MAPA_EZ_UFS = {
  "amazonia-legal": [
    "AMAZONAS",
    "ACRE",
    "RONDÔNIA",
    "PARÁ",
    "AMAPÁ",
    "MATO GROSSO",
    "TOCANTINS",
    "RORAIMA",
  ],
  semiarido: [
    "PERNAMBUCO",
    "PARAÍBA",
    "ALAGOAS",
    "MARANHÃO",
    "PIAUÍ",
    "CEARÁ",
    "RIO GRANDE DO NORTE",
    "BAHIA",
    "SERGIPE",
    "MINAS GERAIS",
  ],
};



function formatNumber(value) {
  return Number(value || 0).toLocaleString("pt-BR");
}

function safeInt(value) {
  if (value === null || value === undefined || value === "") return 0;

  // Se já for número, retorna o inteiro
  if (typeof value === "number") return Math.floor(value);

  // Tratamento de String
  let str = String(value).trim();

  // Se contiver vírgula e ponto (ex: 1.250,50), remove o ponto e troca vírgula por nada (para contagens inteiras)
  if (str.includes(",") && str.includes(".")) {
    str = str.replace(/\./g, "").replace(/,/g, "");
  }
  // Se contiver apenas vírgula (ex: 1250,50), remove a parte decimal
  else if (str.includes(",")) {
    str = str.split(",")[0];
  }
  // Se contiver apenas ponto e parecer separador de milhar (ex: 1.250)
  // Estratégia: se o ponto estiver seguido de 3 dígitos, removemos (milhar)
  else if (/\.\d{3}$/.test(str)) {
    str = str.replace(/\./g, "");
  }

  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? 0 : parsed;
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
    uf: String(row.uf || "")
      .trim()
      .toUpperCase(),
    municipio: String(row.municipio || "").trim(),
    mes_acao: String(row.mes_acao || "").trim(),
    tema: String(row.tema || "Não informado").trim() || "Não informado",
    descricao: String(row.descricao || "").trim(),
    local_acao:
      String(row.local_acao || "Não informado").trim() || "Não informado",
    adoles_parcipantes: safeInt(row.adoles_parcipantes),
    publico: safeInt(row.publico),
    rede_social: String(row.rede_social || "").trim(),
    link_acao: String(row.link_acao || "").trim(),
    ano_acao: safeInt(row.ano_acao),
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
  const entries = Object.entries(obj)
    .filter(([key]) => {
      const nome = key.trim().toLowerCase();
      return nome !== "outro" && nome !== "outros";
    })
    .sort((a, b) => b[1] - a[1]);

  const top = entries.slice(0, limit);

  const othersTotal = entries
    .slice(limit)
    .reduce((sum, [, value]) => sum + value, 0);

  if (othersTotal > 0) top.push(["Outros", othersTotal]);

  return top;
}

function buildMunicipioRows(data) {
  const grouped = {};
  data.forEach((item) => {
    // Para a tabela, ainda precisamos agrupar, mas ignoramos itens sem local na listagem por município
    if (!item.uf || !item.municipio) return;

    const key = `${item.uf}__${item.municipio}`;
    if (!grouped[key]) {
      grouped[key] = {
        uf: item.uf,
        municipio: item.municipio,
        acoes_total: 0,
        adolescentes_total: 0,
        publico_total: 0,
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
    const uf = item.uf || "NÃO INFORMADO";
    if (!grouped[uf]) {
      grouped[uf] = {
        uf,
        estado: ufMap[uf] || uf,
        acoes: 0,
        adolescentes: 0,
        publico: 0,
        municipios: new Set(),
      };
    }
    grouped[uf].acoes += 1;
    grouped[uf].adolescentes += item.adoles_parcipantes;
    grouped[uf].publico += item.publico;
    if (item.municipio) grouped[uf].municipios.add(item.municipio);
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
  // 1. Ações realizadas (Total absoluto de registros)
  const totalAcoes = data.length;

  // 2. Pessoas mobilizadas (Soma total)
  const totalPublico = data.reduce((sum, item) => sum + item.publico, 0);

  // 3. Adolescentes participando (Soma total)
  const totalAdolescentes = data.reduce(
    (sum, item) => sum + item.adoles_parcipantes,
    0,
  );

  // 4. NUCAs criados (Vem da API secundária)
  const totalNucasCriados = nucasData.filter(
    (n) => n.status && n.status.includes("✅"),
  ).length;

  setCounter(".acoes-number", totalAcoes);
  setCounter(".mobilizacao-number", totalPublico);
  setCounter(".adolescentes-number", totalAdolescentes);
  setCounter(".nucas-number", totalNucasCriados);
}

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
  }
}

function createVerticalBarChart(canvasId, labels, values, barColor) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  destroyChart(canvasId);

  const wrapLabel = (label, maxChars = 22, maxLines = 3) => {
    if (!label) return "";

    const words = String(label).split(" ");
    const lines = [];
    let currentLine = "";

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (testLine.length > maxChars) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) lines.push(currentLine);

    return lines.slice(0, maxLines);
  };

  chartInstances[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: barColor,
          borderRadius: 0,
          borderSkipped: false,
          barThickness: 30,
          maxBarThickness: 36,
          categoryPercentage: 0.9,
          barPercentage: 0.9,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          displayColors: false,
          callbacks: {
            title: (items) => items?.[0]?.label || "",
            label: (ctx) => `Ações: ${formatNumber(ctx.parsed.x)}`,
          },
        },
        datalabels: {
          anchor: "end",
          align: "right",
          offset: 6,
          color: "#3E3E3E",
          font: {
            weight: "700",
            size: 12,
            family: "Inter",
          },
          formatter: (value) => formatNumber(value),
        },
      },
      layout: {
        padding: {
          top: 8,
          right: 40,
          bottom: 8,
          left: 8,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grace: "10%",
          grid: {
            display: false,
            drawBorder: false,
          },
          border: {
            display: false,
          },
          ticks: {
            display: false,
          },
        },
        y: {
          grid: {
            display: false,
            drawBorder: false,
          },
          border: {
            display: false,
          },
          ticks: {
            autoSkip: false,
            color: "#3E3E3E",
            font: {
              family: "Inter",
              size: 11,
            },
            callback: function (value) {
              const label = this.getLabelForValue(value);
              return wrapLabel(label, 22, 4);
            },
          },
        },
      },
    },
    plugins: [ChartDataLabels],
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
      datasets: [
        {
          label: labelName,
          data: values,
          backgroundColor: COLORS.primary,
          borderRadius: 3,
          maxBarThickness: 28,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${labelName}: ${formatNumber(ctx.parsed.x)}`,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            color: "#3E3E3E",
            callback: (value) => formatNumber(value),
          },
        },
        y: {
          ticks: { color: "#3E3E3E", font: { family: "Inter", size: 12 } },
          grid: { display: false },
        },
      },
    },
  });
}

function renderTopCharts(data) {
  const temas = topNWithOthers(
    aggregateByKey(data, (item) => item.tema),
    6,
  );
  const locais = topNWithOthers(
    aggregateByKey(data, (item) => item.local_acao),
    6,
  );

  createVerticalBarChart(
    "temasChart",
    temas.map(([label]) => label),
    temas.map(([, value]) => value),
    COLORS.yellow,
  );

  createVerticalBarChart(
    "locaisChart",
    locais.map(([label]) => label),
    locais.map(([, value]) => value),
    "#cca079",
  );
}

function getYearOptions(data) {
  return [
    ...new Set(data.map((item) => item.ano_acao).filter((a) => a > 0)),
  ].sort((a, b) => b - a);
}

function populateYearFilter(data) {
  const select = document.getElementById("ez-select");
  if (!select) return;
  const years = getYearOptions(data);
  select.innerHTML =
    '<option value="todos">Todos os anos</option>' +
    years.map((year) => `<option value="${year}">${year}</option>`).join("");
  select.addEventListener("change", applyFilters);
}

function populateUfFilter(containerSelector, selectId, onChange) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  const ufs = [
    ...new Set(
      rawData.map((item) => item.uf).filter((u) => u && u !== "NÃO INFORMADO"),
    ),
  ].sort();
  container.innerHTML = `
    <select id="${selectId}">
      <option value="todos">Todos os estados</option>
      ${ufs.map((uf) => `<option value="${uf}">${uf}</option>`).join("")}
    </select>
  `;
  container.querySelector("select")?.addEventListener("change", onChange);
}

function updateSummaryTexts(data) {
  const totalMunicipios = new Set(
    data
      .filter((i) => i.municipio)
      .map((item) => `${item.uf}__${item.municipio}`),
  ).size;
  const totalAcoes = data.length;
  const totalPublico = data.reduce((sum, item) => sum + item.publico, 0);

  const textMain = document.querySelector(".text-space");
  const textAlert = document.querySelector(".text-space-alert");
  if (textMain) {
    textMain.innerHTML = `<strong>${formatNumber(totalAcoes)}</strong> ações registradas e <strong>${formatNumber(totalPublico)}</strong> pessoas mobilizadas pelo país`;
  }
  if (textAlert) {
    textAlert.innerHTML = `Detalhes das <strong>${formatNumber(data.length)} ações </strong> realizadas nos NUCAs pelo Brasil`;
  }
}

function renderMunicipioTable(data, page = 1) {
  const uf = document.getElementById("filter-uf-main")?.value || "todos";
  const rows = buildMunicipioRows(data).filter(
    (item) => uf === "todos" || item.uf === uf,
  );
  const tbody = document.querySelector(".table-container tbody");
  const pagination = document.getElementById("pagination-container");
  if (!tbody || !pagination) return;

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  tbody.innerHTML =
    pageRows
      .map(
        (row) => `
    <tr>
      <td>${escapeHtml(row.uf)}</td>
      <td>${escapeHtml(row.municipio)}</td>
      <td>${formatNumber(row.acoes_total)}</td>
      <td>${formatNumber(row.adolescentes_total)}</td>
      <td>${formatNumber(row.publico_total)}</td>
    </tr>
  `,
      )
      .join("") || `<tr><td colspan="5">Nenhum dado encontrado.</td></tr>`;

  renderPagination(pagination, totalPages, currentPage, (newPage) =>
    renderMunicipioTable(data, newPage),
  );
}

function renderActionTable(data, page = 1) {
  const uf =
    document.getElementById("filter-uf-alert-select")?.value || "todos";
  const rows = [...data]
    .filter((item) => uf === "todos" || item.uf === uf)
    .sort(
      (a, b) =>
        b.ano_acao - a.ano_acao ||
        a.municipio.localeCompare(b.municipio, "pt-BR"),
    );

  const tbody = document.getElementById("tbody-alert");
  const pagination = document.getElementById("pagination-container-alert");
  if (!tbody || !pagination) return;

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  currentAlertPage = Math.min(page, totalPages);
  const pageRows = rows.slice(
    (currentAlertPage - 1) * rowsPerPage,
    currentAlertPage * rowsPerPage,
  );

  tbody.innerHTML =
    pageRows
      .map((row) => {
        const link =
          row.link_acao && row.link_acao.toLowerCase() !== "não"
            ? `<a href="${escapeHtml(row.link_acao)}" target="_blank" rel="noopener noreferrer">Ver post</a>`
            : "-";
        return `
      <tr>
        <td>${escapeHtml(row.uf || "-")}</td>
        <td>${escapeHtml(row.municipio || "-")}</td>
        <td title="${escapeHtml(row.tema)}">${escapeHtml(row.tema)}</td>
        <td title="${escapeHtml(row.local_acao)}">${escapeHtml(row.local_acao)}</td>
        <td>${row.ano_acao > 0 ? formatNumber(row.ano_acao) : "-"}</td>
        <td>${formatNumber(row.publico)}</td>
        <td>${link}</td>
      </tr>
    `;
      })
      .join("") || `<tr><td colspan="7">Nenhum dado encontrado.</td></tr>`;

  renderPagination(pagination, totalPages, currentAlertPage, (newPage) =>
    renderActionTable(data, newPage),
  );
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

  container.appendChild(
    createBtn("‹", Math.max(1, current - 1), current === 1),
  );

  for (let page = 1; page <= totalPages; page += 1) {
    if (
      page === 1 ||
      page === totalPages ||
      (page >= current - 1 && page <= current + 1)
    ) {
      container.appendChild(
        createBtn(String(page), page, false, page === current),
      );
    } else if (page === current - 2 || page === current + 2) {
      const ellipsis = document.createElement("span");
      ellipsis.className = "pagination-ellipsis";
      ellipsis.textContent = "...";
      container.appendChild(ellipsis);
    }
  }

  container.appendChild(
    createBtn("›", Math.min(totalPages, current + 1), current === totalPages),
  );
}

async function carregarMapbox(stateRows) {
  console.log(stateRows);
  // console.log("Dados de NUCA por UF:", nucaDataByUF);
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

  const MAPA_UF = {
    PARÁ: "PA",
    PIAUÍ: "PI",
    PARAÍBA: "PB",
    PERNAMBUCO: "PE",
    MARANHÃO: "MA",
    RONDÔNIA: "RO",
    ALAGOAS: "AL",
    "MATO GROSSO": "MT",
    BAHIA: "BA",
    TOCANTINS: "TO",
    CEARÁ: "CE",
    "RIO GRANDE DO NORTE": "RN",
    "MINAS GERAIS": "MG",
    ACRE: "AC",
    AMAZONAS: "AM",
    SERGIPE: "SE",
    AMAPÁ: "AP",
    RORAIMA: "RR",
  };

  const dadosConvertidos = {};

  for (const [chave, valor] of Object.entries(stateRows)) {
    // console.log(chave);
    console.log(valor["estado"]);

    const sigla = MAPA_UF[valor["estado"]] || valor["estado"];

    dadosConvertidos[sigla] = (dadosConvertidos[sigla] || 0) + valor["acoes"];
  }
  console.log("Dados convertidos para siglas:", dadosConvertidos);

  let larguraTela = window.innerWidth;

  window.addEventListener("resize", () => {
    larguraTela = window.innerWidth;
  });

  let zoomMap;
  let centerMap;

  if (larguraTela <= 600) {
    zoomMap = 2.5;
    centerMap = [-53.9212, -16.99743];
  } else {
    zoomMap = 3.0;
    centerMap = [-54.26511, -15.395505];
  }

  const map = new mapboxgl.Map({
    container: "mapbox-map",
    style: {
      version: 8,
      name: "White Canvas",
      sources: {},
      layers: [
        {
          id: "background",
          type: "background",
          paint: {
            "background-color": "#F3F3E6",
          },
        },
      ],
    },
    center: centerMap,
    zoom: zoomMap,
    minZoom: 1,
    projection: "mercator",
  });

  if (larguraTela <= 600) {
    map.scrollZoom.disable();
    map.dragPan.disable();
  } else {
    map.scrollZoom.disable();
    map.dragPan.disable();
  }

  map.addControl(
    new mapboxgl.NavigationControl({
      showCompass: false,
      showZoom: false,
    }),
    "top-right",
  );

  map.on("load", async () => {
    try {
      const response = await fetch(BRAZIL_STATES_GEOJSON_URL);
      if (!response.ok) {
        throw new Error(`Erro ao buscar GeoJSON: ${response.statusText}`);
      }
      const geojsonData = await response.json();

      const maxNucas = Math.max(...Object.values(dadosConvertidos), 0);

      geojsonData.features.forEach((feature) => {
        const stateSigla = feature.properties.SIGLA;
        const acoesCount = dadosConvertidos[stateSigla] || 0;

        feature.properties.nucasCriados = acoesCount;
        feature.properties.adolescentes = 0;
      });

      map.addSource("states-data", {
        type: "geojson",
        data: geojsonData,
      });

      map.addLayer({
        id: "states-fill",
        type: "fill",
        source: "states-data",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "nucasCriados"],
            0,
            "#CFCFC0",
            1,
            "#f8ccbd",
            maxNucas * 0.25,
            "#E1A38E",
            maxNucas * 0.5,
            "#cd907c",
            maxNucas * 0.75,
            "#c08470",
            maxNucas,
            "#9a6959",
          ],
          "fill-opacity": 0.8,
        },
      });

      map.addLayer({
        id: "states-borders",
        type: "line",
        source: "states-data",
        layout: {},
        paint: {
          "line-color": "#F3F3E6",
          "line-width": 1.5,
        },
      });

      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
      });

      map.on("mousemove", "states-fill", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const properties = e.features[0].properties;
        const nucasValue = properties.nucasCriados;
        const stateName = properties.Estado;

        const description = `
  <div style="font-family: 'Lato', sans-serif; padding: 5px;">
    <strong style="font-size: 16px;">${stateName}</strong>
    <p style="margin: 5px 0 0 0;">Ações: <strong>${formatNumber(nucasValue)}</strong></p>
  </div>`;

        popup.setLngLat(e.lngLat).setHTML(description).addTo(map);
      });

      map.on("mouseleave", "states-fill", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });
    } catch (error) {
      console.error("Falha ao carregar o mapa de estados:", error);
    }
  });
}

function renderStateBarChart(stateRows) {
  createHorizontalBarChart(
    "nucasBarChart",
    stateRows.map((row) => row.uf),
    stateRows.map((row) => row.acoes),
    "Ações",
  );
}

function getAllowedUfsByTerritory(territory) {
  if (territory === "todos") return null;
  return MAPA_EZ_UFS[territory] || null;
}

function filterDataByTerritory(data, territory) {
  const allowedStates = getAllowedUfsByTerritory(territory);
  if (!allowedStates) return data;

  const allowedUfs = allowedStates.map((item) => {
    const match = item.match(/\((.*?)\)/);
    return match ? match[1].toUpperCase() : item.toUpperCase();
  });

  return data.filter((item) => allowedUfs.includes(item.uf));
}

function setupTerritoryButtons() {
  const buttons = document.querySelectorAll(".territory-btn");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentTerritory = button.dataset.territory || "todos";
      applyFilters();
    });
  });
}

function applyFilters() {
  const yearValue = document.getElementById("ez-select")?.value || "todos";

  let baseData = rawData.filter((item) => {
    return yearValue === "todos" || String(item.ano_acao) === yearValue;
  });

  filteredData = filterDataByTerritory(baseData, currentTerritory);

  updateCounters(filteredData);
  renderTopCharts(filteredData);
  updateSummaryTexts(filteredData);

  const stateRows = buildStateRows(filteredData);
  carregarMapbox(stateRows);
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
  setupTerritoryButtons();

  //  add time stamp to API calls to prevent caching during development
  const timestamp = new Date().getTime();

  try {
    const [acoesRes, nucasRes] = await Promise.all([
      fetch(`${API_ACOES_URL}?t=${timestamp}`),
      fetch(`${API_NUCAS_URL}?t=${timestamp}`),
    ]);

    const acoesData = await acoesRes.json();
    nucasData = await nucasRes.json();

    console.log("Dados de ações brutos:", acoesData);

    const totalPublico = acoesData.reduce((soma, acao) => {
      return soma + Number(acao.publico || 0);
    }, 0);

    console.log("Total de público:", totalPublico);

    // PROCESSAMENTO: Removemos o .filter restrito para garantir que TODAS as ações sejam somadas
    // Mesmo que UF ou Município estejam vazios, a ação conta para o total global.
    rawData = Array.isArray(acoesData) ? acoesData.map(normalizeAction) : [];

    console.log("Dados de ações carregados (Total Bruto):", rawData.length);

    try {
      const geojsonResponse = await fetch(BRAZIL_STATES_GEOJSON_URL);
      const geojson = await geojsonResponse.json();
      createUfMapFromGeojson(geojson);
    } catch (e) {
      console.warn("GeoJSON indisponível.");
    }

    populateYearFilter(rawData);
    populateUfFilter(".filter-uf", "filter-uf-main", () =>
      renderMunicipioTable(filteredData, 1),
    );
    populateUfFilter(".filter-uf-alert", "filter-uf-alert-select", () =>
      renderActionTable(filteredData, 1),
    );

    applyFilters();
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
  }
}

document.addEventListener("DOMContentLoaded", init);
