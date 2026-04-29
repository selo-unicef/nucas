const API_ACOES_URL =
  "https://api-selo-unicef-cloudrun-839032982303.us-central1.run.app/acoes-nuca/";
const API_NUCAS_URL =
  "https://api-selo-unicef-cloudrun-839032982303.us-central1.run.app/nucas/";
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

let currentLanguage = localStorage.getItem("dashboardLanguage") || "pt";

const I18N = {
  pt: {
    locale: "pt-BR",
    pageTitle: "Dashboard - Selo Unicef",
    pageHeading: "NUCAs em ação",
    languagePt: "🇧🇷 Português",
    languageEn: "🇺🇸 Inglês",
    cardActions: "Ações realizadas",
    cardPeople: "PESSOAS MOBILIZADAS NOS TERRITÓRIOS",
    cardTeens: "Adolescentes dos NUCAs participando",
    cardNucas: "NUCAs criados",
    intro1: "Os Núcleos de Cidadania de Adolescentes (NUCAs) fazem parte da metodologia do Selo UNICEF e são um indicador essencial da garantia do direito à participação de adolescentes e jovens, assegurando espaço seguro para o desenvolvimento das competências e da cidadania de meninas, menines e meninos em seus territórios.",
    intro2: 'Este painel interativo reflete o movimento dos NUCAs na edição do Selo UNICEF 2025-2028. A pessoa mobilizadora de adolescentes deve colaborar com a alimentação desta ferramenta através da utilização dos formulários oficiais de registro de adolescentes e de atividades dos NUCAs. <a href="https://selounicef.org.br/formularios-dos-nucas-edicao-2025-2028-do-selo-unicef" target="_blank">Clique aqui</a> e saiba mais.',
    territoryFilter: "Filtre por território",
    territoryAll: "Todos os territórios",
    territorySemiarid: "Semiárido",
    territoryAmazon: "Amazônia Legal",
    chartThemes: "Temas das ações",
    chartPlaces: "Local de realização",
    mapTitle: "Ações pelo Brasil",
    mapSubtitle: "Veja a distribuição das ações desenvolvidas nos NUCAs por estado",
    carouselTitle: "Registros das Ações",
    carouselSubtitle: "Acompanhe como as atividades realizadas dos NUCAs foram desenvolvidas pelo Brasil",
    detailsTitle: "Panorama das ações por município",
    detailsText: "<strong>Filtre por estado</strong> e veja, por município, o total de ações realizadas, adolescentes engajados e pessoas mobilizadas.",
    loadingNational: "Carregando dados nacionais...",
    registeredTitle: "Detalhes das ações registradas",
    registeredText: "Confira os registros individuais das ações lançadas pelos municípios, com tema, local, ano, alcance estimado e link de divulgação quando informado.",
    loadingData: "Carregando dados...",
    thState: "Estado", thCity: "Município", thTotalActions: "Ações totais realizadas", thTotalTeens: "Adolescentes totais engajados", thPeople: "Pessoas mobilizadas", thTheme: "Tema", thPlace: "Local", thYear: "Ano", thDisclosure: "Divulgação",
    allYears: "Todos os anos", allStates: "Todos os estados", allThemes: "Todos os temas", noInfo: "Não informado", others: "Outros", noData: "Nenhum dado encontrado.", seePost: "Ver post", actionsLabel: "Ações",
    summaryMain: "<strong>{actions}</strong> ações registradas e <strong>{people}</strong> pessoas mobilizadas pelo país",
    summaryAlert: "Detalhes de <strong>{actions}</strong> ações{where}, com <strong>{people}</strong> pessoas mobilizadas",
    inBrazil: " no Brasil", inState: "no estado <strong>{uf}</strong>", inTheme: "no tema <strong>{theme}</strong>", mapPopupActions: "Ações"
  },
  en: {
    locale: "en-US",
    pageTitle: "Dashboard - UNICEF Seal",
    pageHeading: "NUCAs in action",
    languagePt: "🇧🇷 Português",
    languageEn: "🇺🇸 Inglês",
    cardActions: "Actions carried out",
    cardPeople: "PEOPLE MOBILIZED IN THE TERRITORIES",
    cardTeens: "Adolescents participating in NUCAs",
    cardNucas: "Created NUCAs",
    intro1: "The Adolescent Citizenship Centers (NUCAs) are part of the UNICEF Seal methodology and are an essential indicator of adolescents’ and young people’s right to participate, ensuring a safe space for girls, boys, and non-binary adolescents to develop skills and citizenship in their territories.",
    intro2: 'This interactive dashboard reflects the NUCA movement in the 2025-2028 UNICEF Seal edition. The adolescent mobilizer should help keep this tool updated by using the official forms to register adolescents and NUCA activities. <a href="https://selounicef.org.br/formularios-dos-nucas-edicao-2025-2028-do-selo-unicef" target="_blank">Click here</a> to learn more.',
    territoryFilter: "Filter by territory",
    territoryAll: "All territories",
    territorySemiarid: "Semi-arid Region",
    territoryAmazon: "Legal Amazon",
    chartThemes: "Action themes",
    chartPlaces: "Action location",
    mapTitle: "Actions across Brazil",
    mapSubtitle: "See the distribution of actions developed in NUCAs by state",
    carouselTitle: "Action records",
    carouselSubtitle: "Follow how NUCA activities were developed across Brazil",
    detailsTitle: "Overview of actions by municipality",
    detailsText: "<strong>Filter by state</strong> and see, by municipality, the total number of actions carried out, adolescents engaged, and people mobilized.",
    loadingNational: "Loading national data...",
    registeredTitle: "Details of registered actions",
    registeredText: "Check the individual records of actions submitted by municipalities, including theme, location, year, estimated reach, and dissemination link when provided.",
    loadingData: "Loading data...",
    thState: "State", thCity: "Municipality", thTotalActions: "Total actions carried out", thTotalTeens: "Total adolescents engaged", thPeople: "People mobilized", thTheme: "Theme", thPlace: "Location", thYear: "Year", thDisclosure: "Dissemination",
    allYears: "All years", allStates: "All states", allThemes: "All themes", noInfo: "Not informed", others: "Others", noData: "No data found.", seePost: "View post", actionsLabel: "Actions",
    summaryMain: "<strong>{actions}</strong> registered actions and <strong>{people}</strong> people mobilized nationwide",
    summaryAlert: "Details of <strong>{actions}</strong> actions{where}, with <strong>{people}</strong> people mobilized",
    inBrazil: " in Brazil", inState: "in the state of <strong>{uf}</strong>", inTheme: "in the theme <strong>{theme}</strong>", mapPopupActions: "Actions"
  }
};

function t(key, vars = {}) {
  let value = I18N[currentLanguage]?.[key] ?? I18N.pt[key] ?? key;
  Object.entries(vars).forEach(([varKey, varValue]) => {
    value = value.replaceAll(`{${varKey}}`, varValue);
  });
  return value;
}

function getLocale() {
  return I18N[currentLanguage]?.locale || "pt-BR";
}

function translateLabel(label = "") {
  if (label === "Não informado" || label === "Not informed") return t("noInfo");
  if (label === "Outros" || label === "Others") return t("others");
  return label;
}


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
  return Number(value || 0).toLocaleString(getLocale());
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
    const key = keyFn(item) || t("noInfo");
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

  if (othersTotal > 0) top.push([t("others"), othersTotal]);

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

  // --- Processamento de Dados: 7 itens + Outros ---
  let finalLabels = [...labels];
  let finalValues = [...values];

  if (labels.length > 7) {
    const limit = 7;
    finalLabels = labels.slice(0, limit);
    finalValues = values.slice(0, limit);

    const othersValue = values
      .slice(limit)
      .reduce((acc, curr) => acc + (curr || 0), 0);

    finalLabels.push(t("others"));
    finalValues.push(othersValue);
  }

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
      labels: finalLabels,
      datasets: [
        {
          data: finalValues,
          backgroundColor: barColor,
          borderRadius: 0,
          borderSkipped: false,
          // Ajustado barThickness e barPercentage para aumentar o espaçamento
          barThickness: 30,
          maxBarThickness: 28,
          categoryPercentage: 0.8,
          barPercentage: 0.1, // Reduzido de 0.9 para 0.6 para mais respiro
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
            label: (ctx) => `${t("actionsLabel")}: ${formatNumber(ctx.parsed.x)}`,
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
          right: 20, // Aumentado levemente para não cortar labels longos
          bottom: 8,
          left: 10,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grace: "15%", // Aumentado para dar mais espaço ao datalabel
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

  function toTitleCasePT(text) {
    if (!text) return "";

    const lowerWords = [
      "de", "da", "do", "das", "dos",
      "e", "em", "para", "por", "com",
      "no", "na", "nos", "nas"
    ];

    return String(text)
      .toLowerCase()
      .split(" ")
      .map((word, index) => {
        if (index === 0 || !lowerWords.includes(word)) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return word;
      })
      .join(" ");
  }

  const formattedLabels = labels.map((label) => toTitleCasePT(label));

  chartInstances[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: formattedLabels,
      datasets: [
        {
          label: toTitleCasePT(labelName),
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
            title: (items) => items?.[0]?.label || "",
            label: (ctx) => `${toTitleCasePT(labelName)}: ${formatNumber(ctx.parsed.x)}`,
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
          right: 40,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grace: "10%",
          ticks: {
            color: "#3E3E3E",
            callback: (value) => formatNumber(value),
          },
          grid: {
            display: false,
          },
        },
        y: {
          ticks: {
            color: "#3E3E3E",
            font: { family: "Inter", size: 13 },
          },
          grid: { display: false },
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}

function renderTopCharts(data) {
  const temas = topNWithOthers(
    aggregateByKey(data, (item) => translateLabel(item.tema)),
    7,
  );
  const locais = topNWithOthers(
    aggregateByKey(data, (item) => translateLabel(item.local_acao)),
    7,
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
    `<option value="todos">${t("allYears")}</option>` +
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
      <option value="todos">${t("allStates")}</option>
      ${ufs.map((uf) => `<option value="${uf}">${uf}</option>`).join("")}
    </select>
  `;
  container.querySelector("select")?.addEventListener("change", onChange);
}

function populateThemeFilter(containerSelector, selectId, onChange) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const temas = [
    ...new Set(
      rawData
        .map((item) => item.tema)
        .filter((tema) => tema && tema.trim() && tema !== "Não informado" && tema !== "Not informed"),
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  container.innerHTML = `
    <select id="${selectId}">
      <option value="todos">${t("allThemes")}</option>
      ${temas.map((tema) => `<option value="${escapeHtml(tema)}">${escapeHtml(tema)}</option>`).join("")}
    </select>
  `;
  container.querySelector("select")?.addEventListener("change", onChange);
}

function getFilteredAlertRows(data) {
  const uf =
    document.getElementById("filter-uf-alert-select")?.value || "todos";
  const tema =
    document.getElementById("filter-theme-alert-select")?.value || "todos";

  return [...data]
    .filter((item) => uf === "todos" || item.uf === uf)
    .filter((item) => tema === "todos" || item.tema === tema);
}

function updateSummaryTexts(data) {
  const totalAcoes = data.length;
  const totalPublico = data.reduce((sum, item) => sum + item.publico, 0);

  const textMain = document.querySelector(".text-space");
  const textAlert = document.querySelector(".text-space-alert");
  if (textMain) {
    textMain.innerHTML = t("summaryMain", { actions: formatNumber(totalAcoes), people: formatNumber(totalPublico) });
  }

  if (textAlert) {
    const uf =
      document.getElementById("filter-uf-alert-select")?.value || "todos";
    const tema =
      document.getElementById("filter-theme-alert-select")?.value || "todos";
    const alertRows = getFilteredAlertRows(data);
    const totalAlertPublico = alertRows.reduce(
      (sum, item) => sum + item.publico,
      0,
    );

    const partes = [];
    if (uf !== "todos")
      partes.push(t("inState", { uf: escapeHtml(uf) }));
    if (tema !== "todos")
      partes.push(t("inTheme", { theme: escapeHtml(tema) }));

    const complemento = partes.length ? ` ${partes.join(currentLanguage === "en" ? " and " : " e ")}` : t("inBrazil");

    textAlert.innerHTML = t("summaryAlert", { actions: formatNumber(alertRows.length), where: complemento, people: formatNumber(totalAlertPublico) });
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
      .join("") || `<tr><td colspan="5">${t("noData")}</td></tr>`;

  renderPagination(pagination, totalPages, currentPage, (newPage) =>
    renderMunicipioTable(data, newPage),
  );
}

function renderActionTable(data, page = 1) {
  const rows = getFilteredAlertRows(data).sort(
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
        const hasLink =
          row.link_acao &&
          String(row.link_acao).trim() !== "" &&
          String(row.link_acao).toLowerCase() !== "não";

        const link = hasLink
          ? `<a href="${escapeHtml(row.link_acao)}" target="_blank" rel="noopener noreferrer">${t("seePost")}</a>`
          : "";

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
      .join("") || `<tr><td colspan="7">${t("noData")}</td></tr>`;

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
    <p style="margin: 5px 0 0 0;">${t("mapPopupActions")}: <strong>${formatNumber(nucasValue)}</strong></p>
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

function setElementContent(selector, key) {
  const element = document.querySelector(selector);
  if (!element) return;
  const content = t(key);
  if (content.includes("<")) element.innerHTML = content;
  else element.textContent = content;
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLanguage === "en" ? "en" : "pt-BR";
  document.title = t("pageTitle");

  const selectors = {
    ".info-titulo h1": "pageHeading",
    ".lang-pt": "languagePt",
    ".lang-en": "languageEn",
    ".total-members p:nth-child(2)": "cardActions",
    ".total-mun p:nth-child(2)": "cardPeople",
    ".container-numbers .total-nucas:nth-of-type(3) p:nth-child(2)": "cardTeens",
    ".container-numbers .total-nucas:nth-of-type(4) p:nth-child(2)": "cardNucas",
    ".column-2 .container.text.bg-image p:nth-child(1)": "intro1",
    ".column-2 .container.text.bg-image p:nth-child(2)": "intro2",
    ".territory-filters > p": "territoryFilter",
    ".territory-btn[data-territory='todos']": "territoryAll",
    ".territory-btn[data-territory='semiarido']": "territorySemiarid",
    ".territory-btn[data-territory='amazonia-legal']": "territoryAmazon",
    ".nucas .chart-title": "chartThemes",
    ".genero .chart-title": "chartPlaces",
    ".column-3:not(.carrossel-section) .text-nucas-uf h3": "mapTitle",
    ".column-3:not(.carrossel-section) .text-nucas-uf p": "mapSubtitle",
    ".carrossel-section .carousel-header h3": "carouselTitle",
    ".carrossel-section .carousel-header p": "carouselSubtitle",
    ".column-4:not(#alert-section) .title-img h3": "detailsTitle",
    ".column-4:not(#alert-section) .filter-container .text p:first-child": "detailsText",
    "#alert-section .title-img h3": "registeredTitle",
    "#alert-section .filter-container .text p:first-child": "registeredText",
    ".column-4:not(#alert-section) th:nth-child(1)": "thState",
    ".column-4:not(#alert-section) th:nth-child(2)": "thCity",
    ".column-4:not(#alert-section) th:nth-child(3)": "thTotalActions",
    ".column-4:not(#alert-section) th:nth-child(4)": "thTotalTeens",
    ".column-4:not(#alert-section) th:nth-child(5)": "thPeople",
    "#table-alert th:nth-child(1)": "thState",
    "#table-alert th:nth-child(2)": "thCity",
    "#table-alert th:nth-child(3)": "thTheme",
    "#table-alert th:nth-child(4)": "thPlace",
    "#table-alert th:nth-child(5)": "thYear",
    "#table-alert th:nth-child(6)": "thPeople",
    "#table-alert th:nth-child(7)": "thDisclosure",
  };

  Object.entries(selectors).forEach(([selector, key]) => setElementContent(selector, key));

  const textSpace = document.querySelector(".text-space");
  if (textSpace && !filteredData.length) textSpace.textContent = t("loadingNational");

  const textSpaceAlert = document.querySelector(".text-space-alert");
  if (textSpaceAlert && !filteredData.length) textSpaceAlert.textContent = t("loadingData");

  updateLanguageButtons();
}

function updateLanguageButtons() {
  document.querySelector(".lang-pt")?.classList.toggle("active", currentLanguage === "pt");
  document.querySelector(".lang-en")?.classList.toggle("active", currentLanguage === "en");
}

function refreshAfterLanguageChange() {
  applyStaticTranslations();
  populateYearFilter(rawData);
  populateUfFilter(".filter-uf", "filter-uf-main", () => renderMunicipioTable(filteredData, 1));
  populateUfFilter(".filter-uf-alert", "filter-uf-alert-select", () => {
    updateSummaryTexts(filteredData);
    renderActionTable(filteredData, 1);
  });
  populateThemeFilter(".filter-theme-alert", "filter-theme-alert-select", () => {
    updateSummaryTexts(filteredData);
    renderActionTable(filteredData, 1);
  });
  if (rawData.length) applyFilters();
}

function setLanguage(language) {
  currentLanguage = language;
  localStorage.setItem("dashboardLanguage", language);
  refreshAfterLanguageChange();
}

function setupLanguageButtons() {
  document.querySelector(".lang-pt")?.addEventListener("click", () => setLanguage("pt"));
  document.querySelector(".lang-en")?.addEventListener("click", () => setLanguage("en"));
  applyStaticTranslations();
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
    populateUfFilter(".filter-uf-alert", "filter-uf-alert-select", () => {
      updateSummaryTexts(filteredData);
      renderActionTable(filteredData, 1);
    });
    populateThemeFilter(
      ".filter-theme-alert",
      "filter-theme-alert-select",
      () => {
        updateSummaryTexts(filteredData);
        renderActionTable(filteredData, 1);
      },
    );

    applyFilters();
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
  }
}

document.addEventListener("DOMContentLoaded", init);



// carrossel


const track = document.getElementById("carousel-track");
const modal = document.getElementById("media-modal");
const modalContent = document.getElementById("modal-content");
const closeModal = document.getElementById("modal-close");

function getYoutubeId(url) {
  if (!url) return "";

  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return "";
}

function createCarouselItem(item) {
  const div = document.createElement("div");
  div.className = "carousel-item";

  const isVideo = item.url_video && item.url_video.trim() !== "";
  const isPhoto = item.url_foto && item.url_foto.trim() !== "";

  if (isVideo) {
    const videoId = getYoutubeId(item.url_video);

    div.innerHTML = `
      <div class="video-thumb">
        <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="${item.descricao}">
        <div class="play-icon">▶</div>
      </div>
      <div class="carousel-caption">${item.descricao}</div>
    `;

    div.addEventListener("click", () => {
      modalContent.innerHTML = `
        <iframe
          src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0"
          title="${item.descricao}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe>
      `;
      modal.classList.add("active");
    });
  } else if (isPhoto) {
    div.innerHTML = `
      <img src="${item.url_foto}" alt="${item.descricao}">
      <div class="carousel-caption">${item.descricao}</div>
    `;

    div.addEventListener("click", () => {
      modalContent.innerHTML = `
        <img src="${item.url_foto}" alt="${item.descricao}">
      `;
      modal.classList.add("active");
    });
  }

  return div;
}

fetch("./data/carrossel.json")
  .then(response => response.json())
  .then(data => {
    data.forEach(item => {
      if (item.url_foto || item.url_video) {
        track.appendChild(createCarouselItem(item));
      }
    });
  });

function scrollCarousel(direction) {
  const item = track.querySelector(".carousel-item");
  if (!item) return;

  const gap = 16;
  const itemWidth = item.offsetWidth + gap;

  track.scrollBy({
    left: direction * itemWidth,
    behavior: "smooth"
  });
}

document.querySelector(".carousel-btn.next").addEventListener("click", () => {
  scrollCarousel(1);
});

document.querySelector(".carousel-btn.prev").addEventListener("click", () => {
  scrollCarousel(-1);
});

closeModal.addEventListener("click", () => {
  modal.classList.remove("active");
  modalContent.innerHTML = "";
});

modal.addEventListener("click", event => {
  if (event.target === modal) {
    modal.classList.remove("active");
    modalContent.innerHTML = "";
  }
});