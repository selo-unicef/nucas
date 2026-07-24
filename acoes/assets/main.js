const SUPABASE_URL = "https://hsiosuhgmkflakpckxxc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzaW9zdWhnbWtmbGFrcGNreHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTcwOTUsImV4cCI6MjA4NjAzMzA5NX0.c-9dQeQ1DD_6pRPu9xJUGtsr9QAs9eNa8sS3bbsYa3c";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

async function buscarTodosRegistros(tabela, colunas = "*") {
  const pageSize = 1000;
  let from = 0;
  let todos = [];

  while (true) {
    const { data, error } = await supabaseClient
      .from(tabela)
      .select(colunas)
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    todos = todos.concat(data);

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return todos;
}

const BRAZIL_STATES_GEOJSON_URL = "./data/brazil_states.geojson";
const POPULACAO_MUNICIPIOS_URL = "./data/populacao_mun.json";
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
let populacaoMunicipiosMap = new Map();
const chartInstances = {};

let currentLanguage = localStorage.getItem("dashboardLanguage") || "pt";

const I18N = {
  pt: {
    locale: "pt-BR",
    pageTitle: "Dashboard - Selo Unicef",
    pageHeading: "NUCA em Ação",
    languagePt: "🇧🇷 Português",
    languageEn: "🇺🇸 Inglês",
    cardActions: "Ações realizadas",
    cardPeople: "PESSOAS MOBILIZADAS NOS TERRITÓRIOS",
    cardTeens: "Adolescentes dos NUCAs com ações",
    cardNucas: "NUCAs em Ação",
    intro1:
      "Este painel interativo mostra as ações realizadas por adolescentes dos NUCAs em seus municípios, organizadas por tema — mudanças climáticas, saúde, prevenção às violências, participação política, entre outros —, com o número de adolescentes participantes e pessoas mobilizadas por eles.",
    intro2:
      'Os dados são registrados pela pessoa mobilizadora de adolescentes via formulário de registro de ações dos NUCAs e validados pelos parceiros implementadores do Selo UNICEF.Para conhecer o perfil de adolescentes integrantes dos NUCAs — por gênero, pertencimento étnico-cultural e raça e cor —, <a href="/nucas">acesse o Painel dos NUCAs</a>',
    territoryFilter: "Filtre por estado",
    territoryAll: "Todos os territórios",
    territorySemiarid: "Semiárido",
    territoryAmazon: "Amazônia Legal",
    chartThemes: "Temas das ações",
    chartPlaces: "Local de realização",
    mapTitle: "Ações pelo Brasil",
    mapSubtitle:
      "Veja a distribuição das ações desenvolvidas nos NUCAs por estado",
    carouselTitle: "Alguns destaques",
    carouselSubtitle:
      "Acompanhe como as atividades realizadas dos NUCAs foram desenvolvidas pelo Brasil",
    detailsTitle: "Panorama das ações por município",
    detailsText:
      "<strong>Filtre por estado</strong> e veja, por município, o total de ações realizadas, adolescentes engajados e pessoas mobilizadas.",
    loadingNational: "Carregando dados nacionais...",
    registeredTitle: "Detalhes das ações registradas",
    registeredText:
      "Confira os registros individuais das ações lançadas pelos municípios, com tema, local, ano, alcance estimado e link de divulgação quando informado.",
    loadingData: "Carregando dados...",
    thState: "Estado",
    thCity: "Município",
    thTotalActions: "Ações totais realizadas",
    thTotalTeens: "Adolescentes totais engajados",
    thPeople: "Pessoas mobilizadas",
    thTheme: "Tema",
    thPlace: "Local",
    thYear: "Ano",
    thDisclosure: "Divulgação",
    allYears: "Todos os anos",
    allStates: "Todos os estados",
    allThemes: "Todos os temas",
    noInfo: "Não informado",
    others: "Outros",
    noData: "Nenhum dado encontrado.",
    seePost: "Ver post",
    actionsLabel: "Ações",
    summaryMain:
      "<strong>{actions}</strong> ações registradas e <strong>{people}</strong> pessoas mobilizadas pelo país",
    summaryAlert:
      "Detalhes de <strong>{actions}</strong> ações{where}, com <strong>{people}</strong> pessoas mobilizadas",
    inBrazil: " no Brasil",
    inState: "no estado <strong>{uf}</strong>",
    inTheme: "no tema <strong>{theme}</strong>",
    mapPopupActions: "Ações",
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
    intro1:
      "The Adolescent Citizenship Centers (NUCAs) are part of the UNICEF Seal methodology and are an essential indicator of adolescents’ and young people’s right to participate, ensuring a safe space for girls, boys, and non-binary adolescents to develop skills and citizenship in their territories.",
    intro2:
      'This interactive dashboard reflects the NUCA movement in the 2025-2028 UNICEF Seal edition. The adolescent mobilizer should help keep this tool updated by using the official forms to register adolescents and NUCA activities. <a href="https://selounicef.org.br/formularios-dos-nucas-edicao-2025-2028-do-selo-unicef" target="_blank">Click here</a> to learn more.',
    territoryFilter: "Filter by state",
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
    detailsText:
      "<strong>Filter by state</strong> and see, by municipality, the total number of actions carried out, adolescents engaged, and people mobilized.",
    loadingNational: "Loading national data...",
    registeredTitle: "Details of registered actions",
    registeredText:
      "Check the individual records of actions submitted by municipalities, including theme, location, year, estimated reach, and dissemination link when provided.",
    loadingData: "Loading data...",
    thState: "State",
    thCity: "Municipality",
    thTotalActions: "Total actions carried out",
    thTotalTeens: "Total adolescents engaged",
    thPeople: "People mobilized",
    thTheme: "Theme",
    thPlace: "Location",
    thYear: "Year",
    thDisclosure: "Dissemination",
    allYears: "All years",
    allStates: "All states",
    allThemes: "All themes",
    noInfo: "Not informed",
    others: "Others",
    noData: "No data found.",
    seePost: "View post",
    actionsLabel: "Actions",
    summaryMain:
      "<strong>{actions}</strong> registered actions and <strong>{people}</strong> people mobilized nationwide",
    summaryAlert:
      "Details of <strong>{actions}</strong> actions{where}, with <strong>{people}</strong> people mobilized",
    inBrazil: " in Brazil",
    inState: "in the state of <strong>{uf}</strong>",
    inTheme: "in the theme <strong>{theme}</strong>",
    mapPopupActions: "Actions",
  },
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

  if (typeof value === "number") return Math.floor(value);

  let str = String(value).trim();

  if (str.includes(",") && str.includes(".")) {
    str = str.replace(/\./g, "").replace(/,/g, "");
  } else if (str.includes(",")) {
    str = str.split(",")[0];
  } else if (/\.\d{3}$/.test(str)) {
    str = str.replace(/\./g, "");
  }

  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? 0 : parsed;
}

function escapeHtml(value) {
  return String(value ?? "");
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function municipioMatchesSearch(row, searchValue) {
  const term = normalizeSearchText(searchValue);
  if (!term) return true;
  return normalizeSearchText(row.municipio).includes(term);
}

function createMunicipioSearchInput(id, onInput) {
  const input = document.createElement("input");
  input.type = "search";
  input.id = id;
  input.className = "municipio-search";
  input.placeholder =
    currentLanguage === "en" ? "Search municipality" : "Buscar município...";
  input.setAttribute("aria-label", input.placeholder);
  input.addEventListener("input", onInput);
  return input;
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

const MAPA_UF_SIGLAS = {
  ACRE: "AC",
  ALAGOAS: "AL",
  AMAPÁ: "AP",
  AMAZONAS: "AM",
  BAHIA: "BA",
  CEARÁ: "CE",
  "DISTRITO FEDERAL": "DF",
  "ESPÍRITO SANTO": "ES",
  GOIÁS: "GO",
  MARANHÃO: "MA",
  "MATO GROSSO": "MT",
  "MATO GROSSO DO SUL": "MS",
  "MINAS GERAIS": "MG",
  PARÁ: "PA",
  PARAÍBA: "PB",
  PARANÁ: "PR",
  PERNAMBUCO: "PE",
  PIAUÍ: "PI",
  "RIO DE JANEIRO": "RJ",
  "RIO GRANDE DO NORTE": "RN",
  "RIO GRANDE DO SUL": "RS",
  RONDÔNIA: "RO",
  RORAIMA: "RR",
  "SANTA CATARINA": "SC",
  "SÃO PAULO": "SP",
  SERGIPE: "SE",
  TOCANTINS: "TO",
};

function getFlexibleValue(row, keys = []) {
  if (!row) return "";
  const normalizedTargetKeys = keys.map((key) => normalizeSearchText(key));
  const foundKey = Object.keys(row).find((key) =>
    normalizedTargetKeys.includes(normalizeSearchText(key)),
  );
  return foundKey ? row[foundKey] : "";
}

function getUfSigla(value) {
  const raw = String(value || "")
    .trim()
    .toUpperCase();
  if (!raw) return "";

  const parenthesisMatch = raw.match(/\(([A-Z]{2})\)/);
  if (parenthesisMatch) return parenthesisMatch[1];

  if (/^[A-Z]{2}$/.test(raw)) return raw;

  const normalizedUf = normalizeSearchText(raw).toUpperCase();
  const normalizedMap = Object.entries(MAPA_UF_SIGLAS).reduce(
    (acc, [estado, sigla]) => {
      acc[normalizeSearchText(estado).toUpperCase()] = sigla;
      return acc;
    },
    {},
  );

  return normalizedMap[normalizedUf] || raw;
}

function parsePopulationValue(value) {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    // O arquivo pode trazer, por exemplo, 9.593 para representar 9.593 habitantes.
    // Nesse caso, o JSON interpreta como decimal; convertemos de volta para inteiro.
    return Number.isInteger(value) ? value : Math.round(value * 1000);
  }

  const digits = String(value).replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function getPopulationKey(municipio, uf) {
  return `${getUfSigla(uf)}__${normalizeSearchText(municipio)}`;
}

function buildPopulationMap(populacaoData) {
  const map = new Map();

  (Array.isArray(populacaoData) ? populacaoData : []).forEach((row) => {
    const municipio = String(
      getFlexibleValue(row, ["Município", "Municipio", "municipio"]) || "",
    ).trim();

    const uf = getUfSigla(
      getFlexibleValue(row, ["UF", "uf", "Estado", "estado", "Município - UF"]),
    );

    const populacao = parsePopulationValue(
      getFlexibleValue(row, [
        "Pop 2022",
        "População 2022",
        "Populacao 2022",
        "populacao",
      ]),
    );

    if (!municipio || !uf || populacao <= 0) return;

    map.set(getPopulationKey(municipio, uf), populacao);
  });

  return map;
}

function getMobilizationLimitPercentage(populacao) {
  if (populacao <= 1000) return 0.5;
  if (populacao <= 10000) return 0.4;
  if (populacao <= 50000) return 0.3;
  if (populacao <= 100000) return 0.2;
  if (populacao <= 500000) return 0.1;
  return 0.05;
}

function adjustMobilizedPeople(action) {
  const publicoInformado = safeInt(action.publico);
  const uf = getUfSigla(action.uf);
  const key = getPopulationKey(action.municipio, uf);
  const populacao = populacaoMunicipiosMap.get(key);

  // Sem população correspondente, preserva o valor informado pela API.
  if (!populacao) {
    return {
      ...action,
      publico: publicoInformado,
      publico_original: publicoInformado,
      populacao_municipio: null,
      publico_foi_ajustado: false,
    };
  }

  const percentualLimite = getMobilizationLimitPercentage(populacao);
  const limiteMobilizados = Math.floor(populacao * percentualLimite);
  const publicoAjustado = Math.min(publicoInformado, limiteMobilizados);

  return {
    ...action,
    publico: publicoAjustado,
    publico_original: publicoInformado,
    populacao_municipio: populacao,
    percentual_limite_publico: percentualLimite,
    limite_publico: limiteMobilizados,
    publico_foi_ajustado: publicoInformado > limiteMobilizados,
  };
}

function getNucaUf(nuca) {
  return getUfSigla(getFlexibleValue(nuca, ["uf", "UF", "estado", "Estado"]));
}

function getNucaMunicipio(nuca) {
  return String(
    getFlexibleValue(nuca, [
      "municipio",
      "Município",
      "município",
      "Municipio",
    ]) || "",
  ).trim();
}

function getActionNucaKey(item) {
  return `${getUfSigla(item.uf)}__${normalizeSearchText(item.municipio)}`;
}

function getNucaKey(nuca) {
  return `${getNucaUf(nuca)}__${normalizeSearchText(getNucaMunicipio(nuca))}`;
}

function isNucaCriado(nuca) {
  const status = String(
    getFlexibleValue(nuca, [
      "NUCA criado?",
      "nuca_criado",
      "nuca criado",
      "status",
    ]),
  ).trim();
  return (
    status.includes("✅") || normalizeSearchText(status).includes("nuca criado")
  );
}

function getTotalMembrosNuca(nuca) {
  const total = safeInt(
    getFlexibleValue(nuca, ["Total membros", "total_membros", "total membros"]),
  );
  if (total > 0) return total;

  return (
    safeInt(getFlexibleValue(nuca, ["Feminino", "feminino"])) +
    safeInt(getFlexibleValue(nuca, ["Masculino", "masculino"])) +
    safeInt(
      getFlexibleValue(nuca, [
        "Não binário",
        "Nao binario",
        "não binário",
        "nao_binario",
      ]),
    )
  );
}

function getNucasCriadosComAcoes(data) {
  const municipiosComAcoes = new Set(
    data.map(getActionNucaKey).filter((key) => !key.endsWith("__")),
  );
  const nucasUnicos = new Map();

  nucasData.forEach((nuca) => {
    const key = getNucaKey(nuca);
    if (
      !key.endsWith("__") &&
      municipiosComAcoes.has(key) &&
      isNucaCriado(nuca)
    ) {
      nucasUnicos.set(key, nuca);
    }
  });

  return [...nucasUnicos.values()];
}

function updateCounters(data) {
  const totalAcoes = data.length;

  const totalPublico = data.reduce((sum, item) => sum + item.publico, 0);

  const nucasCriadosComAcoes = getNucasCriadosComAcoes(data);
  const totalAdolescentes = nucasCriadosComAcoes.reduce(
    (sum, nuca) => sum + getTotalMembrosNuca(nuca),
    0,
  );

  const totalNucasCriados = nucasCriadosComAcoes.length;

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

function createVerticalBarChart(
  canvasId,
  labels,
  values,
  barColor,
  maxItems = 7,
) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  destroyChart(canvasId);

  let finalLabels = [...labels];
  let finalValues = [...values];

  if (maxItems !== null && maxItems !== undefined && labels.length > maxItems) {
    finalLabels = labels.slice(0, maxItems);
    finalValues = values.slice(0, maxItems);

    const othersValue = values
      .slice(maxItems)
      .reduce((acc, curr) => acc + (curr || 0), 0);

    if (othersValue > 0) {
      finalLabels.push(t("others"));
      finalValues.push(othersValue);
    }
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
          barThickness: 30,
          maxBarThickness: 28,
          categoryPercentage: 0.8,
          barPercentage: 0.1,
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
            label: (ctx) =>
              `${t("actionsLabel")}: ${formatNumber(ctx.parsed.x)}`,
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
          right: 20,
          bottom: 8,
          left: 10,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grace: "15%",
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
      "de",
      "da",
      "do",
      "das",
      "dos",
      "e",
      "em",
      "para",
      "por",
      "com",
      "no",
      "na",
      "nos",
      "nas",
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
            label: (ctx) =>
              `${toTitleCasePT(labelName)}: ${formatNumber(ctx.parsed.x)}`,
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
  const temasPermitidos = [
    "Saúde integral e integrada de adolescentes",
    "Transição positiva para o mundo do trabalho",
    "Prevenção às violências",
    "Resiliência Climática - #EntreNoClimaUNICEF",
    "Governança local/Orçamento público (PPA e Agenda Transversal)",
    "Equidade étnico-racial",
    "Empoderamento de meninas",
    "#MeuVotoImporta2026",
  ];

  const temasPermitidosNormalizados = temasPermitidos.map((tema) =>
    tema.trim(),
  );

  const temasAgrupados = aggregateByKey(data, (item) => {
    const tema = (item.tema || "").trim();

    if (temasPermitidosNormalizados.includes(tema)) {
      return translateLabel(tema);
    }

    return t("others");
  });

  const temas = Object.entries(temasAgrupados).sort((a, b) => {
    if (a[0] === t("others")) return 1;
    if (b[0] === t("others")) return -1;
    return b[1] - a[1];
  });

  const locais = topNWithOthers(
    aggregateByKey(data, (item) => translateLabel(item.local_acao)),
    7,
  );

  createVerticalBarChart(
    "temasChart",
    temas.map(([label]) => label),
    temas.map(([, value]) => value),
    COLORS.yellow,
    null,
  );

  createVerticalBarChart(
    "locaisChart",
    locais.map(([label]) => label),
    locais.map(([, value]) => value),
    "#cca079",
    7, // continua agrupando em "Outros"
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
  const ufs = [
    ...new Set(
      data.map((item) => item.uf).filter((u) => u && u !== "NÃO INFORMADO"),
    ),
  ].sort();
  select.innerHTML =
    `<option value="todos">${t("allStates")}</option>` +
    ufs.map((uf) => `<option value="${uf}">${uf}</option>`).join("");
  select.onchange = applyFilters;
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
  const searchId =
    selectId === "filter-uf-alert-select"
      ? "municipio-search-alert"
      : "municipio-search-main";
  container.appendChild(createMunicipioSearchInput(searchId, onChange));
  container.querySelector("select")?.addEventListener("change", onChange);
}

function populateThemeFilter(containerSelector, selectId, onChange) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // const temas = [
  //   ...new Set(
  //     rawData
  //       .map((item) => item.tema)
  //       .filter(
  //         (tema) =>
  //           tema &&
  //           tema.trim() &&
  //           tema !== "Não informado" &&
  //           tema !== "Not informed",
  //       ),
  //   ),
  // ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  const temas = [
    "Saúde integral e integrada de adolescentes",
    "Transição positiva para o mundo do trabalho",
    "Prevenção às violências",
    "Resiliência Climática - #EntreNoClimaUNICEF",
    "Governança local/Orçamento público (PPA e Agenda Transversal)",
    "Equidade étnico-racial",
    "Empoderamento de meninas",
    "#MeuVotoImporta2026",
  ];

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

  const municipioBusca =
    document.getElementById("municipio-search-alert")?.value || "";

  return [...data]
    .filter((item) => uf === "todos" || item.uf === uf)
    .filter((item) => tema === "todos" || item.tema === tema)
    .filter((item) => municipioMatchesSearch(item, municipioBusca));
}

function updateSummaryTexts(data) {
  const textMain = document.querySelector(".text-space");
  const textAlert = document.querySelector(".text-space-alert");

  if (textMain) {
    const ufMain = document.getElementById("filter-uf-main")?.value || "todos";
    const municipioBusca =
      document.getElementById("municipio-search-main")?.value || "";

    const mainRows = buildMunicipioRows(data)
      .filter((item) => ufMain === "todos" || item.uf === ufMain)
      .filter((item) => municipioMatchesSearch(item, municipioBusca));

    const totalAcoesMain = mainRows.reduce(
      (sum, item) => sum + item.acoes_total,
      0,
    );
    const totalPublicoMain = mainRows.reduce(
      (sum, item) => sum + item.publico_total,
      0,
    );

    const complementoMain =
      ufMain !== "todos" ? ` ${t("inState", { uf: escapeHtml(ufMain) })}` : "";

    textMain.innerHTML = t("summaryMain", {
      actions: formatNumber(totalAcoesMain),
      people: formatNumber(totalPublicoMain),
    }).replace(
      currentLanguage === "en" ? " nationwide" : " pelo país",
      complementoMain,
    );
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
    if (uf !== "todos") partes.push(t("inState", { uf: escapeHtml(uf) }));
    if (tema !== "todos")
      partes.push(t("inTheme", { theme: escapeHtml(tema) }));

    const complemento = partes.length
      ? ` ${partes.join(currentLanguage === "en" ? " and " : " e ")}`
      : t("inBrazil");

    textAlert.innerHTML = t("summaryAlert", {
      actions: formatNumber(alertRows.length),
      where: complemento,
      people: formatNumber(totalAlertPublico),
    });
  }
}

function renderMunicipioTable(data, page = 1) {
  const uf = document.getElementById("filter-uf-main")?.value || "todos";
  const municipioBusca =
    document.getElementById("municipio-search-main")?.value || "";
  const rows = buildMunicipioRows(data)
    .filter((item) => uf === "todos" || item.uf === uf)
    .filter((item) => municipioMatchesSearch(item, municipioBusca));
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
        <td>${row.ano_acao > 0 ? row.ano_acao : "-"}</td>
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

  const createBtn = (label, page, disabled = false) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pagination-button";
    btn.disabled = disabled;
    btn.textContent = label;
    btn.addEventListener("click", () => onPageChange(page));
    return btn;
  };

  const status = document.createElement("span");
  status.className = "pagination-status";
  status.textContent = `Página ${current} de ${totalPages}`;

  container.appendChild(
    createBtn("‹", Math.max(1, current - 1), current === 1),
  );
  container.appendChild(status);
  container.appendChild(
    createBtn("›", Math.min(totalPages, current + 1), current === totalPages),
  );
}

async function carregarMapbox(stateRows) {
  console.log(stateRows);
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
  const ufValue = document.getElementById("ez-select")?.value || "todos";

  const chartFilteredData = rawData.filter((item) => {
    return ufValue === "todos" || item.uf === ufValue;
  });

  filteredData = rawData;

  updateCounters(chartFilteredData);
  renderTopCharts(chartFilteredData);
  updateSummaryTexts(chartFilteredData);

  const stateRows = buildStateRows(rawData);
  carregarMapbox(stateRows);
  renderStateBarChart(stateRows);

  renderMunicipioTable(rawData, 1);
  renderActionTable(rawData, 1);
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
    ".container-numbers .total-nucas:nth-of-type(3) p:nth-child(2)":
      "cardTeens",
    ".container-numbers .total-nucas:nth-of-type(4) p:nth-child(2)":
      "cardNucas",
    ".column-2 .container.text.bg-image p:nth-child(1)": "intro1",
    ".column-2 .container.text.bg-image p:nth-child(2)": "intro2",
    ".territory-filters > p": "territoryFilter",
    ".nucas .chart-title": "chartThemes",
    ".genero .chart-title": "chartPlaces",
    ".column-3:not(.carrossel-section) .text-nucas-uf h3": "mapTitle",
    ".column-3:not(.carrossel-section) .text-nucas-uf p": "mapSubtitle",
    ".carrossel-section .carousel-header h3": "carouselTitle",
    ".carrossel-section .carousel-header p": "carouselSubtitle",
    ".column-4:not(#alert-section) .title-img h3": "detailsTitle",
    ".column-4:not(#alert-section) .filter-container .text p:first-child":
      "detailsText",
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

  Object.entries(selectors).forEach(([selector, key]) =>
    setElementContent(selector, key),
  );

  const textSpace = document.querySelector(".text-space");
  if (textSpace && !filteredData.length)
    textSpace.textContent = t("loadingNational");

  const textSpaceAlert = document.querySelector(".text-space-alert");
  if (textSpaceAlert && !filteredData.length)
    textSpaceAlert.textContent = t("loadingData");

  updateLanguageButtons();
}

function updateLanguageButtons() {
  document
    .querySelector(".lang-pt")
    ?.classList.toggle("active", currentLanguage === "pt");
  document
    .querySelector(".lang-en")
    ?.classList.toggle("active", currentLanguage === "en");
}

function refreshAfterLanguageChange() {
  applyStaticTranslations();
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
  if (rawData.length) applyFilters();
}

function setLanguage(language) {
  currentLanguage = language;
  localStorage.setItem("dashboardLanguage", language);
  refreshAfterLanguageChange();
}

function setupLanguageButtons() {
  document
    .querySelector(".lang-pt")
    ?.addEventListener("click", () => setLanguage("pt"));
  document
    .querySelector(".lang-en")
    ?.addEventListener("click", () => setLanguage("en"));
  applyStaticTranslations();
}

async function init() {
  setupLanguageButtons();
  setupTerritoryButtons();

  try {
    const [acoesDataBruto, nucasDataBruto, populacaoResponse] =
      await Promise.all([
        buscarTodosRegistros("acoes_nuca"),
        buscarTodosRegistros("detalhes_nucas"),
        fetch(POPULACAO_MUNICIPIOS_URL),
      ]);

    if (!populacaoResponse.ok) {
      throw new Error(
        `Erro ao carregar população dos municípios: ${populacaoResponse.status} ${populacaoResponse.statusText}`,
      );
    }

    const populacaoData = await populacaoResponse.json();
    populacaoMunicipiosMap = buildPopulationMap(populacaoData);
    nucasData = nucasDataBruto;

    console.log(
      "Municípios com população carregada:",
      populacaoMunicipiosMap.size,
    );

    console.log("Dados de ações brutos:", acoesDataBruto);
    console.log("Status encontrados:", [
      ...new Set(acoesDataBruto.map((acao) => acao.status)),
    ]);

    const statusPermitidos = [
      "Em validação",
      "Aprovado",
      "Em validação/Aprovado",
    ];

    const acoesData = Array.isArray(acoesDataBruto)
      ? acoesDataBruto.filter((acao) => {
          const status = String(acao.status || "").trim();
          return statusPermitidos.includes(status);
        })
      : [];

    console.log("Dados de ações filtrados:", acoesData);
    console.log("Total após filtro:", acoesData.length);

    const totalPublico = acoesData.reduce((soma, acao) => {
      return soma + Number(acao.publico || 0);
    }, 0);

    console.log("Total de público filtrado:", totalPublico);

    rawData = acoesData.map(normalizeAction).map(adjustMobilizedPeople);

    const acoesComPublicoAjustado = rawData.filter(
      (acao) => acao.publico_foi_ajustado,
    );

    console.log("Dados de ações carregados após filtro:", rawData.length);
    console.log(
      "Ações com pessoas mobilizadas ajustadas:",
      acoesComPublicoAjustado.length,
      acoesComPublicoAjustado,
    );

    try {
      const geojsonResponse = await fetch(BRAZIL_STATES_GEOJSON_URL);
      const geojson = await geojsonResponse.json();
      createUfMapFromGeojson(geojson);
    } catch (e) {
      console.warn("GeoJSON indisponível.");
    }

    populateYearFilter(rawData);

    populateUfFilter(".filter-uf", "filter-uf-main", () => {
      updateSummaryTexts(rawData);
      renderMunicipioTable(filteredData, 1);
    });

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
    /youtube\.com\/shorts\/([^?&]+)/,
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

    ${
      item.link
        ? `
          <div class="btn-link-foto">
            <a href="${item.link}" target="_blank" rel="noopener noreferrer">
              Ler matéria
            </a>
          </div>
        `
        : ""
    }
  `;

      modal.classList.add("active");
    });
  }

  return div;
}

fetch("./data/carrossel.json")
  .then((response) => response.json())
  .then((data) => {
    data.forEach((item) => {
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
    behavior: "smooth",
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

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.classList.remove("active");
    modalContent.innerHTML = "";
  }
});
ß;
