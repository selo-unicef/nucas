const SUPABASE_URL = "https://hsiosuhgmkflakpckxxc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzaW9zdWhnbWtmbGFrcGNreHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTcwOTUsImV4cCI6MjA4NjAzMzA5NX0.c-9dQeQ1DD_6pRPu9xJUGtsr9QAs9eNa8sS3bbsYa3c";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

const DADOS_PROCESSADOS = {
  totalMembros: 0,
  totalMembrosNucaCriado: 0,
  nucaStatus: {},
  generoContagens: {},
};

let larguraTela = window.innerWidth;

const NUCA_COUNT_BY_UF = {};

const DADOS_DETALHADOS_POR_MUNICIPIO = {};

const MAPA_EZ_UFS = {
  "amazonia-legal": [
    "Amazonas (AM)",
    "Acre (AC)",
    "Rondônia (RO)",
    "Pará (PA)",
    "Amapá (AP)",
    "Mato Grosso (MT)",
    "Tocantins (TO)",
    "Roraima (RR)",
  ],
  semiarido: [
    "Pernambuco (PE)",
    "Paraíba (PB)",
    "Alagoas (AL)",
    "Maranhão (MA)",
    "Piauí (PI)",
    "Ceará (CE)",
    "Rio Grande do Norte (RN)",
    "Bahia (BA)",
    "Sergipe (SE)",
    "Minas Gerais (MG)",
  ],
};

const TEEN_COUNT_BY_UF = {};

const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1IjoibHVjYXN0aGF5bmFuLWVzdGFkYW8iLCJhIjoiY21tZmRrdXk1MDZpajJ0cHMyZW01aDg3MCJ9.1WXDZqllxNPv95_HuEEedA";

const BRAZIL_STATES_GEOJSON_URL = "./data/brazil_states.geojson";

let adolescentesData = [];
let todosAdolescentesData = [];
let alertNucasData = [];

let currentPage = 1;
let currentAlertPage = 1;
const rowsPerPage = 10;

let currentLanguage = localStorage.getItem("dashboardLanguage") || "pt";

const I18N = {
  pt: {
    locale: "pt-BR",
    pageTitle: "Dashboard - Selo UNICEF",
    headerHtml:
      '<a href="https://docs.google.com/spreadsheets/d/1hGOlbHZnNqLMpWoksYPZCawfadpJi-aN/edit?gid=1628412039#gid=1628412039" target="_blank">Clique aqui</a> e confira o status e pontuação do seu município em 28/11/2025',
    pageHeading: "Panorama do perfil dos NUCAs",
    languagePt: "🇧🇷 Português",
    languageEn: "🇺🇸 Inglês",
    cardMembers: "Adolescentes inscritos/as",
    cardMunicipalities: "Municípios com adolescentes inscritos/as",
    cardNucas: "NUCAs criados",
    intro1:
      'Este painel interativo mostra o retrato dos Núcleos de Cidadania de Adolescentes (NUCAs) na edição do Selo UNICEF 2025-2028: quantos núcleos foram criados ou reativados em cada município e quem são seus integrantes — por gênero, pertencimento étnico-cultural e raça e cor. Também identifica os municípios "quase lá", com pendências a regularizar até o encerramento desta edição.',
    intro2:
      'Os dados são validados a partir do cadastro de adolescentes feito pela pessoa mobilizadora via formulário de Inscrição de Adolescentes nos NUCAs – Selo UNICEF Edição 2025-2028. Para acompanhar o que os NUCAs estão fazendo em cada território, <a href="/acoes">acesse o Painel NUCA em Ação</a> e saiba mais.',
    ez_all: "Todos os territórios",
    ez_amazonia: "Amazônia Legal",
    ez_semiarido: "Semiárido",
    chart_total_nucas: "Total de NUCAs",
    chart_gender: "Gênero dos adolescentes",
    chart_belonging: "Pertencimento étnico/cultural",
    chart_race: "Raça/Cor",
    mapTitle: "NUCAs espalhados pelo Brasil",
    mapSubtitle:
      "Veja o quantitativo de NUCAs criados e o percentual em relação aos municípios inscritos em cada estado nesta edição do Selo UNICEF",
    detailsTitle: "Detalhes de cada NUCA registrado",
    detailsText:
      "<strong>Filtre por estado</strong> e veja quantos NUCAs já foram criados e o total de adolescentes cadastrados/as, engajados/das e transformando o seu município e seus arredores nesta edição do Selo UNICEF",
    loadingNational: "Carregando dados nacionais...",
    almostThereTitle: "Detalhes dos NUCAs que estão quase lá",
    almostThereText:
      "Estes municípios ainda apresentam pendências, como número insuficiente de membros ou falta de paridade de gênero, e terão até o encerramento desta edição do Selo UNICEF para regularizar todas as exigências.",
    loadingData: "Carregando dados...",
    th_state: "Estado",
    th_city: "Município",
    th_total_teens: "Total de adolescentes",
    th_indigenous: "Indígenas",
    th_quilombola: "Quilombolas",
    th_riverside: "Ribeirinhos",
    th_total: "Total",
    th_female: "Feminino",
    th_male: "Masculino",
    th_nonbinary: "Não binário",
    th_status: "Status",
    chart_status_created: "✅ NUCA criado",
    chart_status_warning: "⚠️ Não atende aos critérios",
    chart_status_insufficient: "❌ Membros insuficientes",
    gender_female: "Feminino",
    gender_male: "Masculino",
    gender_nonbinary: "Não binário",
    belonging_indigenous: "Indígenas",
    belonging_quilombola: "Quilombolas",
    belonging_riverside: "Ribeirinhos",
    race_yellow: "Amarela (oriental)",
    race_white: "Branca",
    race_indigenous: "Indígena",
    race_brown: "Parda",
    race_black: "Preta",
    no_data: "Sem dados",
    all_states: "Todos os estados",
    municipalities_almost_there:
      'No país, <strong>{count}</strong> municípios estão "quase lá"',
    country_almost_there:
      "No país, falta muito pouco para <strong>{count}</strong> terem seus NUCAs criados",
    state_pending: "{uf}: <strong>{count}</strong> municípios com pendências.",
    country_created:
      "No país foram criados <strong>{countNucas} NUCAs</strong> que contam com <strong>{countTeens} adolescentes neles inscritos/as</strong>",
    state_created:
      "{uf} tem no total <strong>{countNucas} NUCAs criados</strong> que contam com <strong>{countTeens} adolescentes neles inscritos/as</strong>",
    map_popup_state: "NUCAs criados",
    bar_dataset: "NUCAs Criados",
    bar_axis: "Contagem de NUCAs",
    bar_tooltip:
      "NUCAs Criados: {value} ({percentage}% dos municípios inscritos)",
    chart_tooltip_prefix: ": ",
    error_load_data:
      "Não foi possível carregar os dados. Tente novamente mais tarde.",
  },
  en: {
    locale: "en-US",
    pageTitle: "Dashboard - UNICEF Seal",
    headerHtml:
      '<a href="https://docs.google.com/spreadsheets/d/1hGOlbHZnNqLMpWoksYPZCawfadpJi-aN/edit?gid=1628412039#gid=1628412039" target="_blank">Click here</a> to check your municipality\'s status and score on 11/28/2025',
    pageHeading: "NUCA Overview",
    languagePt: "🇧🇷 Português",
    languageEn: "🇺🇸 Inglês",
    cardMembers: "Registered adolescents",
    cardMunicipalities: "Municipalities with registered adolescents",
    cardNucas: "Created NUCAs",
    intro1:
      "The <strong>Adolescent Citizenship Centers (NUCAs)</strong> are part of the UNICEF Seal methodology and are an essential indicator of the right of adolescents and young people to participate, ensuring a safe space for girls, boys, and non-binary adolescents to develop skills and citizenship in their territories.",
    intro2:
      'This interactive dashboard shows the movement of NUCAs in the 2025-2028 UNICEF Seal edition. The adolescent mobilizer should help keep this tool updated by using the official forms to register adolescents and NUCA activities. <a href="https://selounicef.org.br/formularios-dos-nucas-edicao-2025-2028-do-selo-unicef" target="_blank">Click here</a> to learn more.',
    ez_all: "All territories",
    ez_amazonia: "Legal Amazon",
    ez_semiarido: "Semi-arid Region",
    chart_total_nucas: "Total NUCAs",
    chart_gender: "Adolescent gender",
    chart_belonging: "Ethnic/cultural identity",
    chart_race: "Race/Color",
    mapTitle: "NUCAs across Brazil",
    mapSubtitle:
      "See the number of created NUCAs and the percentage compared to participating municipalities in each state in this UNICEF Seal edition",
    detailsTitle: "Details of each registered NUCA",
    detailsText:
      "<strong>Filter by state</strong> to see how many NUCAs have already been created and the total number of registered adolescents engaged in transforming their municipality and surrounding areas in this UNICEF Seal edition",
    loadingNational: "Loading national data...",
    almostThereTitle: "Details of NUCAs that are almost there",
    almostThereText:
      "These municipalities still have pending issues, such as an insufficient number of members or a lack of gender parity, and will have until the end of this UNICEF Seal edition to meet all requirements.",
    loadingData: "Loading data...",
    th_state: "State",
    th_city: "Municipality",
    th_total_teens: "Total adolescents",
    th_indigenous: "Indigenous",
    th_quilombola: "Quilombola",
    th_riverside: "Riverside communities",
    th_total: "Total",
    th_female: "Female",
    th_male: "Male",
    th_nonbinary: "Non-binary",
    th_status: "Status",
    chart_status_created: "✅ NUCA created",
    chart_status_warning: "⚠️ Does not meet the criteria",
    chart_status_insufficient: "❌ Insufficient members",
    gender_female: "Female",
    gender_male: "Male",
    gender_nonbinary: "Non-binary",
    belonging_indigenous: "Indigenous",
    belonging_quilombola: "Quilombola",
    belonging_riverside: "Riverside communities",
    race_yellow: "Asian",
    race_white: "White",
    race_indigenous: "Indigenous",
    race_brown: "Brown",
    race_black: "Black",
    no_data: "No data",
    all_states: "All states",
    municipalities_almost_there:
      'Nationwide, <strong>{count}</strong> municipalities are "almost there"',
    country_almost_there:
      "Nationwide, only a little is left for <strong>{count}</strong> municipalities to have their NUCAs created",
    state_pending:
      "{uf}: <strong>{count}</strong> municipalities with pending issues.",
    country_created:
      "Nationwide, <strong>{countNucas} NUCAs</strong> have been created, with <strong>{countTeens} registered adolescents</strong>",
    state_created:
      "{uf} has a total of <strong>{countNucas} created NUCAs</strong> with <strong>{countTeens} registered adolescents</strong>",
    map_popup_state: "Created NUCAs",
    bar_dataset: "Created NUCAs",
    bar_axis: "NUCA count",
    bar_tooltip:
      "Created NUCAs: {value} ({percentage}% of participating municipalities)",
    chart_tooltip_prefix: ": ",
    error_load_data: "Could not load the data. Please try again later.",
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

function formatNumber(value) {
  return Number(value || 0).toLocaleString(getLocale());
}

function translateStatus(status = "") {
  const normalized = status.trim();
  if (normalized === "✅ NUCA criado") return t("chart_status_created");
  if (normalized === "⚠️ Não atende aos critérios")
    return t("chart_status_warning");
  if (normalized === "❌ Membros insuficientes")
    return t("chart_status_insufficient");
  return status;
}

function translateGender(label = "") {
  if (label === "Feminino") return t("gender_female");
  if (label === "Masculino") return t("gender_male");
  if (label === "Não binário") return t("gender_nonbinary");
  return label;
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLanguage === "en" ? "en" : "pt-BR";
  document.title = t("pageTitle");

  const header = document.querySelector("header h4");
  if (header) header.innerHTML = t("headerHtml");

  const selectors = {
    ".info-titulo h1": "pageHeading",
    ".lang-pt": "languagePt",
    ".lang-en": "languageEn",
    ".total-members p:nth-child(2)": "cardMembers",
    ".total-mun p:nth-child(2)": "cardMunicipalities",
    ".total-nucas p:nth-child(2)": "cardNucas",
    ".column-2 .container.text.bg-image p:nth-child(1)": "intro1",
    ".column-2 .container.text.bg-image p:nth-child(2)": "intro2",
    ".nucas .chart-title": "chart_total_nucas",
    ".genero .chart-title": "chart_gender",
    ".pertencimento .chart-title": "chart_belonging",
    ".raca .chart-title": "chart_race",
    ".column-3 .text-nucas-uf h3": "mapTitle",
    ".column-3 .text-nucas-uf p": "mapSubtitle",
    ".column-4:not(#alert-section) .title-img h3": "detailsTitle",
    ".column-4:not(#alert-section) .filter-container .text p:first-child":
      "detailsText",
    "#alert-section .title-img h3": "almostThereTitle",
    "#alert-section .filter-container .text p:first-child": "almostThereText",
    ".column-4:not(#alert-section) th:nth-child(1)": "th_state",
    ".column-4:not(#alert-section) th:nth-child(2)": "th_city",
    ".column-4:not(#alert-section) th:nth-child(3)": "th_total_teens",
    ".column-4:not(#alert-section) th:nth-child(4)": "th_indigenous",
    ".column-4:not(#alert-section) th:nth-child(5)": "th_quilombola",
    ".column-4:not(#alert-section) th:nth-child(6)": "th_riverside",
    "#table-alert th:nth-child(1)": "th_state",
    "#table-alert th:nth-child(2)": "th_city",
    "#table-alert th:nth-child(3)": "th_total",
    "#table-alert th:nth-child(4)": "th_female",
    "#table-alert th:nth-child(5)": "th_male",
    "#table-alert th:nth-child(6)": "th_nonbinary",
    "#table-alert th:nth-child(7)": "th_status",
  };

  Object.entries(selectors).forEach(([selector, key]) => {
    const element = document.querySelector(selector);
    if (!element) return;
    const content = t(key);
    if (content.includes("<") || content.includes("&")) {
      element.innerHTML = content;
    } else {
      element.textContent = content;
    }
  });

  const textSpace = document.querySelector(".text-space");
  if (textSpace && !adolescentesData.length) {
    textSpace.textContent = t("loadingNational");
  }

  const textSpaceAlert = document.querySelector(".text-space-alert");
  if (textSpaceAlert && !alertNucasData.length) {
    textSpaceAlert.textContent = t("loadingData");
  }

  updateLanguageButtons();
  updateEZSelectOptions();
}

function updateLanguageButtons() {
  document
    .querySelector(".lang-pt")
    ?.classList.toggle("active", currentLanguage === "pt");
  document
    .querySelector(".lang-en")
    ?.classList.toggle("active", currentLanguage === "en");
}

function updateEZSelectOptions() {
  const ezSelect = document.getElementById("ez-select");
  if (!ezSelect) return;
  const currentValue = ezSelect.value || "todos";
  const estados = Object.keys(DADOS_DETALHADOS_POR_MUNICIPIO).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  ezSelect.innerHTML =
    `<option value="todos">${t("all_states")}</option>` +
    estados.map((uf) => `<option value="${uf}">${uf}</option>`).join("");
  ezSelect.value = estados.includes(currentValue) ? currentValue : "todos";
}

function refreshDynamicTranslations() {
  updateEZSelectOptions();
  createBarChart(NUCA_COUNT_BY_UF);

  const currentUf = document.querySelector(".filter-uf select")?.value || "";
  const currentUfAlert =
    document.querySelector(".filter-uf-alert select")?.value || "";
  const ezValue = document.getElementById("ez-select")?.value || "todos";

  if (adolescentesData.length) {
    criarFiltroUF(adolescentesData);
    const newMainSelect = document.querySelector(".filter-uf select");
    if (newMainSelect) newMainSelect.value = currentUf;
    aplicarFiltroPorUF(currentUf);
  }

  if (alertNucasData.length) {
    criarFiltroUFAlert(alertNucasData);
    const newAlertSelect = document.querySelector(".filter-uf-alert select");
    if (newAlertSelect) newAlertSelect.value = currentUfAlert;
    aplicarFiltroPorUFAlert(currentUfAlert);
  }

  atualizarGraficosDonutPorEstado(ezValue);
}

function setLanguage(language) {
  currentLanguage = language;
  localStorage.setItem("dashboardLanguage", language);
  applyStaticTranslations();
  refreshDynamicTranslations();
}

function setupLanguageSwitcher() {
  document
    .querySelector(".lang-pt")
    ?.addEventListener("click", () => setLanguage("pt"));
  document
    .querySelector(".lang-en")
    ?.addEventListener("click", () => setLanguage("en"));
}

function createDoughnutChart(canvasId, labels, data, colors) {
  const ctx = document.getElementById(canvasId);

  if (!ctx) {
    console.error(`Canvas com ID '${canvasId}' não encontrado.`);
    return;
  }

  if (Chart.getChart(ctx)) {
    Chart.getChart(ctx).destroy();
  }

  const container = ctx.closest("div");

  const chartConfig = {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: colors,
          hoverOffset: 8,
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      devicePixelRatio: 2,

      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#3E3E3E",
            boxWidth: 12,
            font: {
              family: "Inter",
              size: 12,
            },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.label || "";

              if (label.includes(" (")) {
                label = label.split(" (")[0];
              }

              if (label) {
                label += ": ";
              }
              const value = context.parsed.toLocaleString(getLocale());
              label += value;
              return label;
            },
          },
        },
      },
    },
  };

  new Chart(ctx, chartConfig);
}

function updateDonutCharts(nucaStatusCounts, genderCounts) {
  const nucaStatusLabels = Object.keys(nucaStatusCounts).map((label) =>
    translateStatus(label),
  );
  const nucaStatusData = Object.values(nucaStatusCounts);

  const nucaStatusLabelsWithCounts = nucaStatusLabels.map((label, index) => {
    const val = nucaStatusData[index];
    return `${label} (${formatNumber(val)})`;
  });

  const nucaStatusColors = ["#178076", "#D3A80A", "#E1A38E"];

  createDoughnutChart(
    "nucasChart",
    nucaStatusLabelsWithCounts,
    nucaStatusData,
    nucaStatusColors,
  );

  const genderLabels = Object.keys(genderCounts);
  const genderDataValues = Object.values(genderCounts);

  const genderColors = ["#E1A38E", "#BCD876", "#958C80"];

  const filteredGenderLabels = [];
  const filteredGenderData = [];
  const filteredGenderColors = [];

  genderLabels.forEach((label, index) => {
    const val = genderDataValues[index];
    if (val > 0) {
      filteredGenderLabels.push(
        `${translateGender(label)} (${formatNumber(val)})`,
      );
      filteredGenderData.push(val);
      filteredGenderColors.push(genderColors[index]);
    }
  });

  createDoughnutChart(
    "generoChart",
    filteredGenderLabels,
    filteredGenderData,
    filteredGenderColors,
  );
}

function updatePertencimentoChart(counts) {
  const labels = [
    t("belonging_indigenous"),
    t("belonging_quilombola"),
    t("belonging_riverside"),
  ];
  const data = [
    counts.Indigenas || 0,
    counts.Quilombolas || 0,
    counts.Ribeirinhos || 0,
  ];
  const colors = ["#E1A38E", "#BCD876", "#D3A80A"];

  const filteredLabels = [];
  const filteredData = [];
  const filteredColors = [];

  data.forEach((val, idx) => {
    if (val > 0) {
      filteredLabels.push(`${labels[idx]} (${formatNumber(val)})`);
      filteredData.push(val);
      filteredColors.push(colors[idx]);
    }
  });

  if (filteredData.length === 0) {
    createDoughnutChart("pertencimentoChart", [t("no_data")], [1], ["#F3F3E6"]);
  } else {
    createDoughnutChart(
      "pertencimentoChart",
      filteredLabels,
      filteredData,
      filteredColors,
    );
  }
}

function updateRacaChart(counts) {
  const allLabels = [
    t("race_yellow"),
    t("race_white"),
    t("race_indigenous"),
    t("race_brown"),
    t("race_black"),
  ];
  const data = [
    counts.Amarela || 0,
    counts.Branca || 0,
    counts.Indigena || 0,
    counts.Parda || 0,
    counts.Preta || 0,
  ];

  const colors = ["#F2C94C", "#D3D3D3", "#E1A38E", "#A87E6E", "#3E3E3E"];

  const filteredLabels = [];
  const filteredData = [];
  const filteredColors = [];

  data.forEach((val, idx) => {
    if (val > 0) {
      filteredLabels.push(`${allLabels[idx]} (${formatNumber(val)})`);
      filteredData.push(val);
      filteredColors.push(colors[idx]);
    }
  });

  if (filteredData.length === 0) {
    createDoughnutChart("racaChart", [t("no_data")], [1], ["#F3F3E6"]);
  } else {
    createDoughnutChart(
      "racaChart",
      filteredLabels,
      filteredData,
      filteredColors,
    );
  }
}

let membrosTotaisBR;

async function loadAndProcessData() {
  try {
    // Limpa dados anteriores para evitar contagens duplicadas
    Object.keys(NUCA_COUNT_BY_UF).forEach((uf) => {
      delete NUCA_COUNT_BY_UF[uf];
    });

    Object.keys(DADOS_DETALHADOS_POR_MUNICIPIO).forEach((uf) => {
      delete DADOS_DETALHADOS_POR_MUNICIPIO[uf];
    });

    alertNucasData = [];

    const rows = await buscarTodosRegistros("detalhes_nucas");

    let totalMembers = 0;
    let totalMembersNucaCriado = 0;

    const nucaStatusCounts = {
      "✅ NUCA criado": 0,
      "⚠️ Não atende aos critérios": 0,
      "❌ Membros insuficientes": 0,
    };

    const genderCounts = {
      Feminino: 0,
      Masculino: 0,
      "Não binário": 0,
    };

    rows.forEach((item) => {
      const status = item.status ? item.status.trim() : "";
      const uf = item.uf ? item.uf.trim() : "";
      const municipio = item.municipio ? item.municipio.trim() : "";

      if (!status || status === "---") return;

      const total = parseInt(item.total_membros, 10) || 0;
      const feminino = parseInt(item.feminino, 10) || 0;
      const masculino = parseInt(item.masculino, 10) || 0;
      const naoBinario = parseInt(item.nao_binario, 10) || 0;

      if (status in nucaStatusCounts) {
        nucaStatusCounts[status]++;
      }

      totalMembers += total;

      if (status === "✅ NUCA criado") {
        NUCA_COUNT_BY_UF[uf] = (NUCA_COUNT_BY_UF[uf] || 0) + 1;
        totalMembersNucaCriado += total;

        genderCounts.Feminino += feminino;
        genderCounts.Masculino += masculino;
        genderCounts["Não binário"] += naoBinario;
      } else if (
        status.includes("❌") ||
        status.includes("⚠️") ||
        status.includes("Membros insuficientes") ||
        status.includes("Não atende aos critérios")
      ) {
        alertNucasData.push({
          UF: uf,
          Municipio: municipio,
          Total: total,
          Feminino: feminino,
          Masculino: masculino,
          NaoBinario: naoBinario,
          Status: status,
        });
      }

      if (!DADOS_DETALHADOS_POR_MUNICIPIO[uf]) {
        DADOS_DETALHADOS_POR_MUNICIPIO[uf] = [];
      }

      DADOS_DETALHADOS_POR_MUNICIPIO[uf].push({
        uf,
        municipio,
        feminino,
        masculino,
        naoBinario,
        total,
        status,
      });
    });

    membrosTotaisBR = totalMembers;

    DADOS_PROCESSADOS.totalMembros = totalMembers;
    DADOS_PROCESSADOS.totalMembrosNucaCriado = totalMembersNucaCriado;
    DADOS_PROCESSADOS.nucaStatus = nucaStatusCounts;
    DADOS_PROCESSADOS.generoContagens = genderCounts;

    console.log("DADOS_PROCESSADOS:", DADOS_PROCESSADOS);

    const totalNucasCriados =
      DADOS_PROCESSADOS.nucaStatus["✅ NUCA criado"] || 0;
    const totalMunc =
      (DADOS_PROCESSADOS.nucaStatus["✅ NUCA criado"] || 0) +
      (DADOS_PROCESSADOS.nucaStatus["⚠️ Não atende aos critérios"] || 0) +
      (DADOS_PROCESSADOS.nucaStatus["❌ Membros insuficientes"] || 0);

    document.querySelector(".nucas-number").textContent =
      formatNumber(totalNucasCriados);
    document.querySelector(".members-number").textContent = formatNumber(
      DADOS_PROCESSADOS.totalMembros,
    );
    document.querySelector(".mun-number").textContent = formatNumber(totalMunc);

    updateDonutCharts(
      DADOS_PROCESSADOS.nucaStatus,
      DADOS_PROCESSADOS.generoContagens,
    );

    for (const uf in DADOS_DETALHADOS_POR_MUNICIPIO) {
      const municipios = DADOS_DETALHADOS_POR_MUNICIPIO[uf];
    }

    createBarChart(NUCA_COUNT_BY_UF);

    const tableBodyAlert = document.getElementById("tbody-alert");
    const paginationAlert = document.getElementById(
      "pagination-container-alert",
    );
    const textoResumoAlert = document.querySelector(".text-space-alert");

    if (textoResumoAlert) {
      const totalAlert = alertNucasData.length;
      textoResumoAlert.innerHTML = t("municipalities_almost_there", {
        count: formatNumber(totalAlert),
      });
    }

    if (tableBodyAlert && paginationAlert) {
      displayAlertTablePage(alertNucasData, tableBodyAlert, currentAlertPage);
      setupAlertPagination(alertNucasData, paginationAlert, tableBodyAlert);
    }

    criarFiltroUFAlert(alertNucasData);
  } catch (error) {
    console.error("Falha ao processar os dados principais:", error);
    document.querySelector(".nucas-number").textContent = "Erro";
    document.querySelector(".members-number").textContent = "Erro";
  }
}

function calcularDadosGraficosPorEstado(ufSelecionada) {
  const nucaStatusFiltrado = {
    "✅ NUCA criado": 0,
    "⚠️ Não atende aos critérios": 0,
    "❌ Membros insuficientes": 0,
  };
  const genderCountsFiltrado = {
    Feminino: 0,
    Masculino: 0,
    "Não binário": 0,
  };
  const pertencimentoFiltrado = {
    Indigenas: 0,
    Quilombolas: 0,
    Ribeirinhos: 0,
  };
  const racaFiltrada = {
    Amarela: 0,
    Branca: 0,
    Indigena: 0,
    Parda: 0,
    Preta: 0,
  };

  const municipios =
    ufSelecionada === "todos"
      ? Object.values(DADOS_DETALHADOS_POR_MUNICIPIO).flat()
      : DADOS_DETALHADOS_POR_MUNICIPIO[ufSelecionada] || [];

  let totalMembersFiltrado = 0;
  municipios.forEach((municipio) => {
  if (municipio.status in nucaStatusFiltrado) {
    nucaStatusFiltrado[municipio.status]++;
  }

  // Gênero e total apenas dos municípios com NUCA criado
  if (municipio.status === "✅ NUCA criado") {
    totalMembersFiltrado += municipio.total;
    genderCountsFiltrado["Feminino"] += municipio.feminino;
    genderCountsFiltrado["Masculino"] += municipio.masculino;
    genderCountsFiltrado["Não binário"] += municipio.naoBinario;
  }
});

  const adolescentesBase =
    ufSelecionada === "todos"
      ? todosAdolescentesData
      : todosAdolescentesData.filter((row) => row.UF === ufSelecionada);

  adolescentesBase.forEach((row) => {
    pertencimentoFiltrado.Indigenas += parseInt(row.Indigenas || 0, 10);
    pertencimentoFiltrado.Quilombolas += parseInt(row.Quilombolas || 0, 10);
    pertencimentoFiltrado.Ribeirinhos += parseInt(row.Ribeirinhos || 0, 10);
    racaFiltrada.Amarela += parseInt(row.Amarela || 0, 10);
    racaFiltrada.Branca += parseInt(row.Branca || 0, 10);
    racaFiltrada.Parda += parseInt(row.Parda || 0, 10);
    racaFiltrada.Preta += parseInt(row.Preta || 0, 10);
    racaFiltrada.Indigena += parseInt(row.IndigenaRaca || 0, 10);
  });

  return {
    nucaStatusFiltrado,
    genderCountsFiltrado,
    pertencimentoFiltrado,
    racaFiltrada,
    totalMembersFiltrado,
  };
}

function somarAdolescentesCriadosPorUF(ufSelecionada = "todos") {
  const base =
    ufSelecionada === "todos"
      ? adolescentesData
      : adolescentesData.filter((row) => row.UF === ufSelecionada);

  return base.reduce((acc, item) => {
    return acc + (parseInt(item.Adolescentes, 10) || 0);
  }, 0);
}

function atualizarGraficosDonutPorEstado(ufSelecionada = "todos") {
  if (ufSelecionada === "todos") {
    updateDonutCharts(
      DADOS_PROCESSADOS.nucaStatus,
      DADOS_PROCESSADOS.generoContagens,
    );

    document.querySelector(".nucas-number").textContent = formatNumber(
      DADOS_PROCESSADOS.nucaStatus["✅ NUCA criado"] || 0,
    );

    document.querySelector(".members-number").textContent = formatNumber(
      somarAdolescentesCriadosPorUF("todos"),
    );

    recalcularEAtualizarGraficosExtrasGlobais();
    return;
  }

  const dados = calcularDadosGraficosPorEstado(ufSelecionada);

  document.querySelector(".nucas-number").textContent = formatNumber(
    dados.nucaStatusFiltrado["✅ NUCA criado"] || 0,
  );

  document.querySelector(".members-number").textContent = formatNumber(
    somarAdolescentesCriadosPorUF(ufSelecionada),
  );

  updateDonutCharts(dados.nucaStatusFiltrado, dados.genderCountsFiltrado);
  updatePertencimentoChart(dados.pertencimentoFiltrado);
  updateRacaChart(dados.racaFiltrada);
}

function setupEZFilters() {
  const ezSelect = document.getElementById("ez-select");
  if (!ezSelect) {
    console.error("Dropdown de filtro de estado (#ez-select) não encontrado.");
    return;
  }

  const estados = Object.keys(DADOS_DETALHADOS_POR_MUNICIPIO).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  const valorAtual = ezSelect.value || "todos";
  ezSelect.innerHTML =
    `<option value="todos">${t("all_states")}</option>` +
    estados.map((uf) => `<option value="${uf}">${uf}</option>`).join("");
  ezSelect.value = estados.includes(valorAtual) ? valorAtual : "todos";
  ezSelect.onchange = (event) =>
    atualizarGraficosDonutPorEstado(event.target.value);
}

function recalcularEAtualizarGraficosExtrasGlobais() {
  const pertencimentoGlobal = { Indigenas: 0, Quilombolas: 0, Ribeirinhos: 0 };
  const racaGlobal = { Amarela: 0, Branca: 0, Indigena: 0, Parda: 0, Preta: 0 };

  todosAdolescentesData.forEach((row) => {
    pertencimentoGlobal.Indigenas += parseInt(row.Indigenas || 0, 10);
    pertencimentoGlobal.Quilombolas += parseInt(row.Quilombolas || 0, 10);
    pertencimentoGlobal.Ribeirinhos += parseInt(row.Ribeirinhos || 0, 10);
    racaGlobal.Amarela += parseInt(row.Amarela || 0, 10);
    racaGlobal.Branca += parseInt(row.Branca || 0, 10);
    racaGlobal.Parda += parseInt(row.Parda || 0, 10);
    racaGlobal.Preta += parseInt(row.Preta || 0, 10);
    racaGlobal.Indigena += parseInt(row.IndigenaRaca || 0, 10);
  });

  updatePertencimentoChart(pertencimentoGlobal);
  updateRacaChart(racaGlobal);
}

async function carregarMapbox(nucaDataByUF) {
  console.log("Dados de NUCA por UF:", nucaDataByUF);
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

  const MAPA_UF = {
    "Acre (AC)": "AC",
    "Alagoas (AL)": "AL",
    "Amapá (AP)": "AP",
    "Amazonas (AM)": "AM",
    "Bahia (BA)": "BA",
    "Ceará (CE)": "CE",
    "Distrito Federal (DF)": "DF",
    "Espírito Santo (ES)": "ES",
    "Goiás (GO)": "GO",
    "Maranhão (MA)": "MA",
    "Mato Grosso (MT)": "MT",
    "Mato Grosso do Sul (MS)": "MS",
    "Minas Gerais (MG)": "MG",
    "Pará (PA)": "PA",
    "Paraíba (PB)": "PB",
    "Paraná (PR)": "PR",
    "Pernambuco (PE)": "PE",
    "Piauí (PI)": "PI",
    "Rio de Janeiro (RJ)": "RJ",
    "Rio Grande do Norte (RN)": "RN",
    "Rio Grande do Sul (RS)": "RS",
    "Rondônia (RO)": "RO",
    "Roraima (RR)": "RR",
    "Santa Catarina (SC)": "SC",
    "São Paulo (SP)": "SP",
    "Sergipe (SE)": "SE",
    "Tocantins (TO)": "TO",
  };

  const dadosConvertidos = {};
  for (const chave in nucaDataByUF) {
    const sigla = MAPA_UF[chave] || chave;
    dadosConvertidos[sigla] =
      (dadosConvertidos[sigla] || 0) + nucaDataByUF[chave];
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
        const nucaCount = dadosConvertidos[stateSigla] || 0;
        feature.properties.nucasCriados = nucaCount;

        const possibleKeys = [
          stateSigla,
          feature.properties.Estado,
          feature.properties.NOME || "",
        ].filter(Boolean);

        let teenCount = 0;
        for (const k of possibleKeys) {
          if (TEEN_COUNT_BY_UF[k] !== undefined) {
            teenCount = TEEN_COUNT_BY_UF[k];
            break;
          }
        }
        teenCount = parseInt(teenCount, 10) || 0;

        feature.properties.adolescentes = teenCount;
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
            "#d0e3f0",
            maxNucas * 0.25,
            "#a6cee3",
            maxNucas * 0.5,
            "#529cb9",
            maxNucas * 0.75,
            "#1f78b4",
            maxNucas,
            "#08306b",
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
            <p style="margin: 5px 0 0 0;">${t("map_popup_state")}: <strong>${formatNumber(
              nucasValue,
            )}</strong></p>
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

const municipiosInscritoUF = {
  "Acre (AC)": 22,
  "Alagoas (AL)": 94,
  "Amapá (AP)": 16,
  "Amazonas (AM)": 61,
  "Bahia (BA)": 251,
  "Ceará (CE)": 183,
  "Maranhão (MA)": 216,
  "Minas Gerais (MG)": 147,
  "Mato Grosso (MT)": 113,
  "Pará (PA)": 143,
  "Paraíba (PB)": 212,
  "Pernambuco (PE)": 153,
  "Piauí (PI)": 224,
  "Rio Grande do Norte (RN)": 163,
  "Rondônia (RO)": 52,
  "Roraima (RR)": 15,
  "Sergipe (SE)": 62,
  "Tocantins (TO)": 139,
};

function createBarChart(nucaDataByUF) {
  const ctx = document.getElementById("nucasBarChart");
  if (!ctx) return;

  let dataArray = Object.keys(nucaDataByUF).map((uf) => ({
    uf: uf,
    count: nucaDataByUF[uf],
  }));

  dataArray = dataArray.filter((item) => item.count > 0);

  dataArray.sort((a, b) => b.count - a.count);

  const totalCount = dataArray.reduce((sum, item) => sum + item.count, 0);

  const labels = dataArray.map((item) => item.uf);
  const data = dataArray.map((item) => item.count);

  const backgroundColor = "#005586";

  if (Chart.getChart(ctx)) {
    Chart.getChart(ctx).destroy();
  }

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: t("bar_dataset"),
          data: data,
          backgroundColor: backgroundColor,
          borderColor: "#003350",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      layout: {
        padding: {
          left: 0,
          right: 40,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const uf = context.label;
              const value = context.parsed.x;
              const totalMunicipios = municipiosInscritoUF[uf];

              if (!totalMunicipios) return `${value}`;

              const percentage = ((value / totalMunicipios) * 100)
                .toFixed(1)
                .replace(".", ",");

              return t("bar_tooltip", {
                value: formatNumber(value),
                percentage,
              });
            },
          },
        },

        datalabels: {
          display: true,
          align: "end",
          anchor: "end",
          color: "#3E3E3E",
          formatter: (value, context) => {
            const uf = context.chart.data.labels[context.dataIndex];
            const totalMunicipios = municipiosInscritoUF[uf];

            if (!totalMunicipios) return value;

            const percentage = ((value / totalMunicipios) * 100)
              .toFixed(1)
              .replace(".", ",");

            return `${value} (${percentage}%)`;
          },
          font: {
            weight: "bold",
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: t("bar_axis"),
          },
          ticks: {
            callback: function (value) {
              return Number(value).toLocaleString(getLocale());
            },
          },
          grid: {
            display: false,
          },
        },
        y: {
          grid: {
            display: false,
          },
        },
      },
    },
    plugins: [ChartDataLabels],
  });
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
  return normalizeSearchText(row.Municipio).includes(term);
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

// const API_ADOLESCENTES_URL =
//   "https://api-selo-unicef-cloudrun-839032982303.us-central1.run.app/adolescentes/";

function displayTablePage(data, tableBody, page) {
  tableBody.innerHTML = "";
  page--;

  const start = rowsPerPage * page;
  const end = start + rowsPerPage;
  const paginatedItems = data.slice(start, end);

  paginatedItems.forEach((rowData) => {
    const row = document.createElement("tr");
    row.innerHTML = `
              <td>${rowData.UF || ""}</td>
              <td>${rowData.Municipio || ""}</td>
              <td>${rowData.Adolescentes || ""}</td>
              <td>${rowData.Indigenas || ""}</td>
              <td>${rowData.Quilombolas || ""}</td>
              <td>${rowData.Ribeirinhos || ""}</td>
          `;
    tableBody.appendChild(row);
  });
}

function displayAlertTablePage(data, tableBody, page) {
  tableBody.innerHTML = "";
  page--;

  const start = rowsPerPage * page;
  const end = start + rowsPerPage;
  const paginatedItems = data.slice(start, end);

  paginatedItems.forEach((rowData) => {
    const row = document.createElement("tr");

    let statusClass = "";
    if (rowData.Status && rowData.Status.includes("❌")) {
      statusClass = "status-red";
      row.classList.add("row-red");
    } else if (rowData.Status && rowData.Status.includes("⚠️")) {
      statusClass = "status-yellow";
      row.classList.add("row-yellow");
    }

    row.innerHTML = `
              <td>${rowData.UF || ""}</td>
              <td>${rowData.Municipio || ""}</td>
              <td>${rowData.Total || "0"}</td>
              <td>${rowData.Feminino || "0"}</td>
              <td>${rowData.Masculino || "0"}</td>
              <td>${rowData.NaoBinario || "0"}</td>
              <td class="${statusClass}">${translateStatus(rowData.Status || "")}</td>
          `;
    tableBody.appendChild(row);
  });
}

function setupPagination(data, paginationContainer, tableBody) {
  paginationContainer.innerHTML = "";
  const pageCount = Math.ceil(data.length / rowsPerPage);
  if (pageCount <= 1) return;

  const createButton = (label, disabled, onClick) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.classList.add("pagination-button");
    btn.innerText = label;
    btn.disabled = disabled;
    btn.addEventListener("click", onClick);
    return btn;
  };

  const updatePage = (page) => {
    currentPage = Math.min(Math.max(page, 1), pageCount);
    displayTablePage(data, tableBody, currentPage);
    setupPagination(data, paginationContainer, tableBody);
  };

  const prevButton = createButton("←", currentPage === 1, () =>
    updatePage(currentPage - 1),
  );
  const status = document.createElement("span");
  status.className = "pagination-status";
  status.innerText = `Página ${currentPage} de ${pageCount}`;
  const nextButton = createButton("→", currentPage === pageCount, () =>
    updatePage(currentPage + 1),
  );

  paginationContainer.appendChild(prevButton);
  paginationContainer.appendChild(status);
  paginationContainer.appendChild(nextButton);
}

function setupAlertPagination(data, paginationContainer, tableBody) {
  paginationContainer.innerHTML = "";
  const pageCount = Math.ceil(data.length / rowsPerPage);
  if (pageCount <= 1) return;

  const createButton = (label, disabled, onClick) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.classList.add("pagination-button");
    btn.innerText = label;
    btn.disabled = disabled;
    btn.addEventListener("click", onClick);
    return btn;
  };

  const updatePage = (page) => {
    currentAlertPage = Math.min(Math.max(page, 1), pageCount);
    displayAlertTablePage(data, tableBody, currentAlertPage);
    setupAlertPagination(data, paginationContainer, tableBody);
  };

  const prevButton = createButton("←", currentAlertPage === 1, () =>
    updatePage(currentAlertPage - 1),
  );
  const status = document.createElement("span");
  status.className = "pagination-status";
  status.innerText = `Página ${currentAlertPage} de ${pageCount}`;
  const nextButton = createButton("→", currentAlertPage === pageCount, () =>
    updatePage(currentAlertPage + 1),
  );

  paginationContainer.appendChild(prevButton);
  paginationContainer.appendChild(status);
  paginationContainer.appendChild(nextButton);
}

function criarFiltroUF(dados) {
  const filtroUFDiv = document.querySelector(".filter-uf");
  if (!filtroUFDiv) return;
  filtroUFDiv.innerHTML = "";

  const ufs = [...new Set(dados.map((d) => d.UF))].sort();

  const select = document.createElement("select");
  select.innerHTML =
    `<option value="">${t("all_states")}</option>` +
    ufs.map((uf) => `<option value="${uf}">${uf}</option>`).join("");

  const searchInput = createMunicipioSearchInput(
    "municipio-search-main",
    () => {
      aplicarFiltroPorUF(select.value);
    },
  );

  filtroUFDiv.appendChild(select);
  filtroUFDiv.appendChild(searchInput);

  select.addEventListener("change", (e) => {
    const ufSelecionada = e.target.value;
    aplicarFiltroPorUF(ufSelecionada);
  });
}

function criarFiltroUFAlert(dados) {
  const filtroUFDiv = document.querySelector(".filter-uf-alert");
  if (!filtroUFDiv) return;
  filtroUFDiv.innerHTML = "";

  const ufs = [...new Set(dados.map((d) => d.UF))].sort();

  const select = document.createElement("select");
  select.innerHTML =
    `<option value="">${t("all_states")}</option>` +
    ufs.map((uf) => `<option value="${uf}">${uf}</option>`).join("");

  const searchInput = createMunicipioSearchInput(
    "municipio-search-alert",
    () => {
      aplicarFiltroPorUFAlert(select.value);
    },
  );

  filtroUFDiv.appendChild(select);
  filtroUFDiv.appendChild(searchInput);

  select.addEventListener("change", (e) => {
    const ufSelecionada = e.target.value;
    aplicarFiltroPorUFAlert(ufSelecionada);
  });
}

function aplicarFiltroPorUF(uf) {
  const tableBody = document.querySelector(".table-container tbody");
  const paginationContainer = document.getElementById("pagination-container");
  const textoResumo = document.querySelector(".text-space");

  if (!tableBody || !paginationContainer || !textoResumo) return;

  let dadosFiltrados = adolescentesData;

  if (uf) {
    dadosFiltrados = adolescentesData.filter((row) => row.UF === uf);
  }

  const municipioBusca =
    document.getElementById("municipio-search-main")?.value || "";
  dadosFiltrados = dadosFiltrados.filter((row) =>
    municipioMatchesSearch(row, municipioBusca),
  );

  currentPage = 1;
  displayTablePage(dadosFiltrados, tableBody, currentPage);
  setupPagination(dadosFiltrados, paginationContainer, tableBody);

  if (uf) {
    const totalNucas = dadosFiltrados.length;
    const totalAdolescentes = dadosFiltrados.reduce(
      (acc, item) => acc + Number(item.Adolescentes || 0),
      0,
    );
    const nomeEstado = uf;

    textoResumo.innerHTML = t("state_created", {
      uf: nomeEstado,
      countNucas: formatNumber(totalNucas),
      countTeens: formatNumber(totalAdolescentes),
    });
  } else {
    const totalNucasNacional = adolescentesData.length;
    const totalAdolescentesNacional = adolescentesData.reduce(
      (acc, item) => acc + Number(item.Adolescentes || 0),
      0,
    );
    textoResumo.innerHTML = t("country_created", {
      countNucas: formatNumber(totalNucasNacional),
      countTeens: formatNumber(DADOS_PROCESSADOS.totalMembrosNucaCriado),
    });
  }
}

function aplicarFiltroPorUFAlert(uf) {
  const tableBody = document.getElementById("tbody-alert");
  const paginationContainer = document.getElementById(
    "pagination-container-alert",
  );
  const textoResumo = document.querySelector(".text-space-alert");

  if (!tableBody || !paginationContainer || !textoResumo) return;

  let dadosFiltrados = alertNucasData;

  if (uf) {
    dadosFiltrados = alertNucasData.filter((row) => row.UF === uf);
  }

  const municipioBusca =
    document.getElementById("municipio-search-alert")?.value || "";
  dadosFiltrados = dadosFiltrados.filter((row) =>
    municipioMatchesSearch(row, municipioBusca),
  );

  currentAlertPage = 1;
  displayAlertTablePage(dadosFiltrados, tableBody, currentAlertPage);
  setupAlertPagination(dadosFiltrados, paginationContainer, tableBody);

  const totalNucas = dadosFiltrados.length;
  if (uf) {
    textoResumo.innerHTML = t("state_pending", {
      uf,
      count: formatNumber(totalNucas),
    });
  } else {
    textoResumo.innerHTML = t("country_almost_there", {
      count: formatNumber(totalNucas),
    });
  }
}

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

async function loadAdolescentesTableData() {
  try {
    const rows = await buscarTodosRegistros("detalhes_adolescentes");

    const rawData = rows
      .map((item) => {
        return {
          UF: item.uf || "",
          Municipio: item.municipio || "",
          Indigenas: item.indigenas || "0",
          Quilombolas: item.quilombolas || "0",
          Ribeirinhos: item.ribeirinhos || "0",
          Adolescentes: item.adolescentes || "0",
          Status: item.status || "",
          Amarela: item.amarela || "0",
          Branca: item.branca || "0",
          Parda: item.parda || "0",
          Preta: item.preta || "0",
          IndigenaRaca: item.indigenas || "0",
        };
      })
      .filter((row) => row.UF && row.Municipio);

    todosAdolescentesData = rawData;

    adolescentesData = rawData.filter((row) => row.Status === "✅ NUCA criado");

    console.log(adolescentesData);

    const pertencimentoCounts = {
      Indigenas: 0,
      Quilombolas: 0,
      Ribeirinhos: 0,
    };
    const racaCounts = {
      Amarela: 0,
      Branca: 0,
      Indigena: 0,
      Parda: 0,
      Preta: 0,
    };

    todosAdolescentesData.forEach((row) => {
      const uf = row.UF.trim();
      const teens = parseInt(row.Adolescentes, 10) || 0;
      if (uf) {
        TEEN_COUNT_BY_UF[uf] = (TEEN_COUNT_BY_UF[uf] || 0) + teens;
      }

      pertencimentoCounts.Indigenas += parseInt(row.Indigenas || 0, 10);
      pertencimentoCounts.Quilombolas += parseInt(row.Quilombolas || 0, 10);
      pertencimentoCounts.Ribeirinhos += parseInt(row.Ribeirinhos || 0, 10);

      racaCounts.Amarela += parseInt(row.Amarela || 0, 10);
      racaCounts.Branca += parseInt(row.Branca || 0, 10);
      racaCounts.Parda += parseInt(row.Parda || 0, 10);
      racaCounts.Preta += parseInt(row.Preta || 0, 10);
      racaCounts.Indigena += parseInt(row.IndigenaRaca || 0, 10);
    });

    updatePertencimentoChart(pertencimentoCounts);
    updateRacaChart(racaCounts);

    const tableBody = document.querySelector(".table-container tbody");
    const paginationContainer = document.getElementById("pagination-container");
    const textoResumo = document.querySelector(".text-space");

    if (textoResumo) {
      const totalNucasNacional = adolescentesData.length;
      const totalAdolescentesNacional = adolescentesData.reduce(
        (acc, item) => acc + Number(item.Adolescentes || 0),
        0,
      );
      textoResumo.innerHTML = t("country_created", {
        countNucas: formatNumber(totalNucasNacional),
        countTeens: formatNumber(somarAdolescentesCriadosPorUF("todos")),
      });
    }

    if (tableBody && paginationContainer) {
      displayTablePage(adolescentesData, tableBody, currentPage);
      setupPagination(adolescentesData, paginationContainer, tableBody);
    }

    criarFiltroUF(adolescentesData);
  } catch (error) {
    console.error(
      "Erro ao carregar os dados da tabela de adolescentes:",
      error,
    );
    const tableBody = document.querySelector(".table-container tbody");
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="7">${t("error_load_data")}</td></tr>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  applyStaticTranslations();
  setupLanguageSwitcher();
  const loadTopData = loadAndProcessData();
  const loadBottomData = loadAdolescentesTableData();

  await Promise.all([loadTopData, loadBottomData]);

  carregarMapbox(NUCA_COUNT_BY_UF);
  setupEZFilters();
  refreshDynamicTranslations();
});
