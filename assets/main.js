// dados Nucas (API JSON):
const API_NUCAS_URL =
  "https://api-selo-unicef-7574c4dde446.herokuapp.com/nucas/";

// Variável global para armazenar os dados processados (resumos)
const DADOS_PROCESSADOS = {
  totalMembros: 0,
  totalMembrosNucaCriado: 0, // Nova variável adicionada
  nucaStatus: {},
  generoContagens: {},
};

// Obtém a largura da tela
let larguraTela = window.innerWidth;

// Variável global para armazenar a contagem de NUCAs criados por UF
const NUCA_COUNT_BY_UF = {};

// Variável global para armazenar os dados detalhados por município (usado em filtros e mapa)
const DADOS_DETALHADOS_POR_MUNICIPIO = {};

// Mapeamento para Amazônia Legal e Semiárido
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

// Variável global para armazenar a contagem de adolescentes por UF
const TEEN_COUNT_BY_UF = {};

const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1IjoibHVjYXN0aGF5bmFuLWVzdGFkYW8iLCJhIjoiY21pbmw1Z2VoMG5rYTNkb29rM200bnFwNiJ9.XnNK6daRElU24F0aYBYAzQ";

const BRAZIL_STATES_GEOJSON_URL = "./data/brazil_states.geojson";

// Variáveis globais para as tabelas e dados
let adolescentesData = []; // NUCAs Ativos (Filtrado para a TABELA)
let todosAdolescentesData = []; // TODOS os dados (Sem filtro, para os GRÁFICOS)
let alertNucasData = []; // NUCAs Pendentes (vindo da API NUCAS)

let currentPage = 1;
let currentAlertPage = 1;
const rowsPerPage = 10;

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
  // const size = Math.min(container.clientWidth, container.clientHeight); // (Opcional se quiser forçar tamanho)

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

              // Ajuste: Remove a contagem entre parênteses do label do tooltip para não duplicar,
              // já que agora a legenda tem o valor (ex: "Feminino (100)").
              if (label.includes(" (")) {
                label = label.split(" (")[0];
              }

              if (label) {
                label += ": ";
              }
              const value = context.parsed.toLocaleString("pt-BR");
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
  // 1. Gráfico de Status NUCA
  const nucaStatusLabels = Object.keys(nucaStatusCounts);
  const nucaStatusData = Object.values(nucaStatusCounts);

  // Cria labels formatados com a contagem: "Label (1.234)"
  const nucaStatusLabelsWithCounts = nucaStatusLabels.map((label, index) => {
    const val = nucaStatusData[index];
    return `${label} (${val.toLocaleString("pt-BR")})`;
  });

  const nucaStatusColors = [
    "#178076", // '✅ NUCA criado'
    "#D3A80A", // '⚠️ Não atende aos critérios'
    "#E1A38E", // '❌ Membros insuficientes'
  ];

  createDoughnutChart(
    "nucasChart",
    nucaStatusLabelsWithCounts,
    nucaStatusData,
    nucaStatusColors
  );

  // 2. Gráfico de Gênero
  const genderLabels = Object.keys(genderCounts);
  const genderDataValues = Object.values(genderCounts);

  const genderColors = [
    "#E1A38E", // 'Feminino'
    "#BCD876", // 'Masculino'
    "#958C80", // 'Não binário'
  ];

  const filteredGenderLabels = [];
  const filteredGenderData = [];
  const filteredGenderColors = [];

  genderLabels.forEach((label, index) => {
    const val = genderDataValues[index];
    if (val > 0) {
      // Adiciona a contagem ao label: "Feminino (12.345)"
      filteredGenderLabels.push(`${label} (${val.toLocaleString("pt-BR")})`);
      filteredGenderData.push(val);
      filteredGenderColors.push(genderColors[index]);
    }
  });

  createDoughnutChart(
    "generoChart",
    filteredGenderLabels,
    filteredGenderData,
    filteredGenderColors
  );
}

function updatePertencimentoChart(counts) {
  const labels = ["Indígenas", "Quilombolas", "Ribeirinhos"];
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
      // Adiciona a contagem ao label
      filteredLabels.push(`${labels[idx]} (${val.toLocaleString("pt-BR")})`);
      filteredData.push(val);
      filteredColors.push(colors[idx]);
    }
  });

  if (filteredData.length === 0) {
    createDoughnutChart("pertencimentoChart", ["Sem dados"], [1], ["#F3F3E6"]);
  } else {
    createDoughnutChart(
      "pertencimentoChart",
      filteredLabels,
      filteredData,
      filteredColors
    );
  }
}

function updateRacaChart(counts) {
  // ATUALIZADO: Incluindo "Indígena" na lista de raças/cor
  const allLabels = [
    "Amarela (oriental)",
    "Branca",
    "Indígena",
    "Parda",
    "Preta",
  ];
  const data = [
    counts.Amarela || 0,
    counts.Branca || 0,
    counts.Indigena || 0, // Garante que lê a propriedade .Indigena
    counts.Parda || 0,
    counts.Preta || 0,
  ];

  const colors = [
    "#F2C94C", // Amarela
    "#D3D3D3", // Branca
    "#E1A38E", // Indígena (reutilizando uma cor da paleta, ajuste se necessário)
    "#A87E6E", // Parda
    "#3E3E3E", // Preta
  ];

  const filteredLabels = [];
  const filteredData = [];
  const filteredColors = [];

  data.forEach((val, idx) => {
    if (val > 0) {
      // Adiciona a contagem ao label
      filteredLabels.push(`${allLabels[idx]} (${val.toLocaleString("pt-BR")})`);
      filteredData.push(val);
      filteredColors.push(colors[idx]);
    }
  });

  if (filteredData.length === 0) {
    createDoughnutChart("racaChart", ["Sem dados"], [1], ["#F3F3E6"]);
  } else {
    createDoughnutChart(
      "racaChart",
      filteredLabels,
      filteredData,
      filteredColors
    );
  }
}

let membrosTotaisBR;

async function loadAndProcessData() {
  try {
    const response = await fetch(API_NUCAS_URL);
    if (!response.ok) {
      throw new Error(`Erro ao buscar dados: ${response.statusText}`);
    }
    const data = await response.json();

    // Os dados agora vêm em JSON, não precisa de Papa.parse
    const rows = data;

    let totalMembers = 0;
    let totalMembersNucaCriado = 0; // Inicializa contador específico

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

    // Reinicializa a lista de alertas
    alertNucasData = [];

    rows.forEach((item) => {
      // Mapeamento dos campos da API JSON (/nucas/)
      const status = item.status ? item.status.trim() : undefined;

      if (status && status !== "---") {
        const uf = item.uf ? item.uf.trim() : "";
        const municipio = item.municipio ? item.municipio.trim() : "";

        // Campos numéricos mapeados da API
        const total = parseInt(item.total_membros, 10) || 0;
        const feminino = parseInt(item.feminino, 10) || 0;
        const masculino = parseInt(item.masculino, 10) || 0;
        const naoBinario = parseInt(item.nao_binario, 10) || 0;

        if (status in nucaStatusCounts) {
          nucaStatusCounts[status]++;
        }

        totalMembers += total;

        // CORREÇÃO: Contagem de gêneros movida para fora do IF para contar TODOS os status
        genderCounts["Feminino"] += feminino;
        genderCounts["Masculino"] += masculino;
        genderCounts["Não binário"] += naoBinario;

        if (status === "✅ NUCA criado") {
          NUCA_COUNT_BY_UF[uf] = (NUCA_COUNT_BY_UF[uf] || 0) + 1;
          totalMembersNucaCriado += total; // Adiciona ao total específico de NUCAs criados
        } else {
          // Se NÃO foi criado (pendente), adiciona à lista de alertas
          if (
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
        }

        if (!DADOS_DETALHADOS_POR_MUNICIPIO[uf]) {
          DADOS_DETALHADOS_POR_MUNICIPIO[uf] = [];
        }
        DADOS_DETALHADOS_POR_MUNICIPIO[uf].push({
          uf: uf,
          municipio: municipio,
          feminino: feminino,
          masculino: masculino,
          naoBinario: naoBinario,
          total: total,
          status: status,
        });
      }
    });

    membrosTotaisBR = totalMembers;

    DADOS_PROCESSADOS.totalMembros = totalMembers;
    DADOS_PROCESSADOS.totalMembrosNucaCriado = totalMembersNucaCriado; // Salva no objeto global
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
      totalNucasCriados.toLocaleString("pt-BR");
    document.querySelector(".members-number").textContent =
      DADOS_PROCESSADOS.totalMembros.toLocaleString("pt-BR");
    document.querySelector(".mun-number").textContent =
      totalMunc.toLocaleString("pt-BR");

    updateDonutCharts(
      DADOS_PROCESSADOS.nucaStatus,
      DADOS_PROCESSADOS.generoContagens
    );

    // Atualiza contagens baseadas nos dados detalhados (redundante com a lógica acima, mas mantém consistência)
    for (const uf in DADOS_DETALHADOS_POR_MUNICIPIO) {
      const municipios = DADOS_DETALHADOS_POR_MUNICIPIO[uf];
      // Note: A contagem de adolescentes por UF (TEEN_COUNT_BY_UF) será refinada no loadAdolescentesTableData
    }

    // Renderiza Gráfico de Barras (Depende apenas destes dados)
    createBarChart(NUCA_COUNT_BY_UF);

    // Renderiza Tabela de Alertas
    const tableBodyAlert = document.getElementById("tbody-alert");
    const paginationAlert = document.getElementById(
      "pagination-container-alert"
    );
    const textoResumoAlert = document.querySelector(".text-space-alert");

    if (textoResumoAlert) {
      const totalAlert = alertNucasData.length;
      textoResumoAlert.innerHTML = `No país, <strong>${totalAlert.toLocaleString(
        "pt-BR"
      )}</strong> municípios estão "quase lá"`;
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

function filtrarEAtualizarPorEZ(ezKey) {
  const ufsDaEZ = MAPA_EZ_UFS[ezKey];
  if (!ufsDaEZ) {
    console.warn(`Chave de EZ não encontrada: ${ezKey}`);
    return;
  }

  let totalMembersFiltrado = 0;
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

  ufsDaEZ.forEach((uf) => {
    const municipiosDaUF = DADOS_DETALHADOS_POR_MUNICIPIO[uf];

    if (municipiosDaUF) {
      municipiosDaUF.forEach((municipio) => {
        if (municipio.status in nucaStatusFiltrado) {
          nucaStatusFiltrado[municipio.status]++;
        }

        // CORREÇÃO: Contagem de membros e gêneros para TODOS (não apenas NUCA criado) no filtro
        totalMembersFiltrado += municipio.total;
        genderCountsFiltrado["Feminino"] += municipio.feminino;
        genderCountsFiltrado["Masculino"] += municipio.masculino;
        genderCountsFiltrado["Não binário"] += municipio.naoBinario;
      });
    }
  });

  document.querySelector(".nucas-number").textContent = (
    nucaStatusFiltrado["✅ NUCA criado"] || 0
  ).toLocaleString("pt-BR");
  document.querySelector(".members-number").textContent =
    totalMembersFiltrado.toLocaleString("pt-BR");

  updateDonutCharts(nucaStatusFiltrado, genderCountsFiltrado);

  const pertencimentoFiltrado = { Indigenas: 0, Quilombolas: 0, Ribeirinhos: 0 };
  const racaFiltrada = {
    Amarela: 0,
    Branca: 0,
    Indigena: 0,
    Parda: 0,
    Preta: 0,
  };

  // Alterado de adolescentesData para todosAdolescentesData para incluir pendentes nos gráficos
  todosAdolescentesData.forEach((row) => {
    const pertenceEZ = ufsDaEZ.some((ufEZ) => ufEZ.includes(row.UF));

    if (pertenceEZ) {
      pertencimentoFiltrado.Indigenas += parseInt(row.Indigenas || 0, 10);
      pertencimentoFiltrado.Quilombolas += parseInt(row.Quilombolas || 0, 10);
      pertencimentoFiltrado.Ribeirinhos += parseInt(row.Ribeirinhos || 0, 10);

      // Soma Raça
      racaFiltrada.Amarela += parseInt(row.Amarela || 0, 10);
      racaFiltrada.Branca += parseInt(row.Branca || 0, 10);
      racaFiltrada.Parda += parseInt(row.Parda || 0, 10);
      racaFiltrada.Preta += parseInt(row.Preta || 0, 10);
      // Soma Indígena na Raça também
      racaFiltrada.Indigena += parseInt(row.IndigenaRaca || 0, 10);
    }
  });

  updatePertencimentoChart(pertencimentoFiltrado);
  updateRacaChart(racaFiltrada);
}

function setupEZFilters() {
  const ezSelect = document.getElementById("ez-select");
  if (!ezSelect) {
    console.error("Dropdown de filtro EZ (#ez-select) não encontrado.");
    return;
  }

  ezSelect.addEventListener("change", (event) => {
    const ezKey = event.target.value;

    if (ezKey === "todos") {
      updateDonutCharts(
        DADOS_PROCESSADOS.nucaStatus,
        DADOS_PROCESSADOS.generoContagens
      );

      const totalNucasGlobal =
        DADOS_PROCESSADOS.nucaStatus["✅ NUCA criado"] || 0;
      document.querySelector(".nucas-number").textContent =
        totalNucasGlobal.toLocaleString("pt-BR");
      document.querySelector(".members-number").textContent =
        DADOS_PROCESSADOS.totalMembros.toLocaleString("pt-BR");

      recalcularEAtualizarGraficosExtrasGlobais();
    } else {
      filtrarEAtualizarPorEZ(ezKey);
    }
  });
}

function recalcularEAtualizarGraficosExtrasGlobais() {
  const pertencimentoGlobal = { Indigenas: 0, Quilombolas: 0, Ribeirinhos: 0 };
  const racaGlobal = { Amarela: 0, Branca: 0, Indigena: 0, Parda: 0, Preta: 0 };

  // Alterado de adolescentesData para todosAdolescentesData para incluir pendentes
  todosAdolescentesData.forEach((row) => {
    pertencimentoGlobal.Indigenas += parseInt(row.Indigenas || 0, 10);
    pertencimentoGlobal.Quilombolas += parseInt(row.Quilombolas || 0, 10);
    pertencimentoGlobal.Ribeirinhos += parseInt(row.Ribeirinhos || 0, 10);

    // Soma Raça
    racaGlobal.Amarela += parseInt(row.Amarela || 0, 10);
    racaGlobal.Branca += parseInt(row.Branca || 0, 10);
    racaGlobal.Parda += parseInt(row.Parda || 0, 10);
    racaGlobal.Preta += parseInt(row.Preta || 0, 10);
    // Soma Indígena na Raça também
    racaGlobal.Indigena += parseInt(row.IndigenaRaca || 0, 10);
  });

  updatePertencimentoChart(pertencimentoGlobal);
  updateRacaChart(racaGlobal);
}

// --- FUNÇÕES DO MAPBOX ---

async function carregarMapbox(nucaDataByUF) {
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
    "top-right"
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
            <p style="margin: 5px 0 0 0;">NUCAs criados: <strong>${nucasValue.toLocaleString(
              "pt-BR"
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

  // 1. Calcular o total de NUCAs para usar na porcentagem
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
          label: "NUCAs Criados",
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
          right: 40, // Aumentei um pouco o padding para caber o texto extra "(xx%)"
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

              return `NUCAs Criados: ${value} (${percentage}% dos municípios inscritos)`;
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
            text: "Contagem de NUCAs",
          },
          ticks: {
            callback: function (value) {
              return value.toLocaleString("pt-BR");
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

// --- INÍCIO: FUNÇÕES PARA A TABELA DE ADOLESCENTES ---
// API JSON Adolescentes:
const API_ADOLESCENTES_URL =
  "https://api-selo-unicef-7574c4dde446.herokuapp.com/adolescentes/";

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

// Função específica para renderizar a tabela de alertas com colunas de Gênero
function displayAlertTablePage(data, tableBody, page) {
  tableBody.innerHTML = "";
  page--;

  const start = rowsPerPage * page;
  const end = start + rowsPerPage;
  const paginatedItems = data.slice(start, end);

  paginatedItems.forEach((rowData) => {
    const row = document.createElement("tr");

    // Determina a cor do status
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
              <td class="${statusClass}">${rowData.Status || ""}</td>
          `;
    tableBody.appendChild(row);
  });
}

function setupPagination(data, paginationContainer, tableBody) {
  paginationContainer.innerHTML = "";
  const pageCount = Math.ceil(data.length / rowsPerPage);
  if (pageCount <= 1) return;

  const addButton = (page, text) => {
    const btn = document.createElement("button");
    btn.innerText = text || page;
    btn.classList.add("pagination-button");
    if (page === currentPage) {
      btn.classList.add("active");
    }
    btn.addEventListener("click", () => {
      currentPage = page;
      displayTablePage(data, tableBody, currentPage);
      setupPagination(data, paginationContainer, tableBody);
    });
    paginationContainer.appendChild(btn);
  };

  const addEllipsis = () => {
    const ellipsis = document.createElement("span");
    ellipsis.innerText = "...";
    ellipsis.className = "ellipsis";
    paginationContainer.appendChild(ellipsis);
  };

  const prevButton = document.createElement("button");
  prevButton.innerText = "←";
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      displayTablePage(data, tableBody, currentPage);
      setupPagination(data, paginationContainer, tableBody);
    }
  });
  paginationContainer.appendChild(prevButton);

  addButton(1);

  if (currentPage > 2) {
    addEllipsis();
  }

  if (currentPage > 1 && currentPage < pageCount) {
    addButton(currentPage);
  }

  if (currentPage < pageCount - 1) {
    addEllipsis();
  }

  if (pageCount > 1) {
    addButton(pageCount);
  }

  const nextButton = document.createElement("button");
  nextButton.innerText = "→";
  nextButton.disabled = currentPage === pageCount;
  nextButton.addEventListener("click", () => {
    if (currentPage < pageCount) {
      currentPage++;
      displayTablePage(data, tableBody, currentPage);
      setupPagination(data, paginationContainer, tableBody);
    }
  });
  paginationContainer.appendChild(nextButton);
}

// Duplicação da lógica de paginação para a tabela de alertas (separando estados de página)
function setupAlertPagination(data, paginationContainer, tableBody) {
  paginationContainer.innerHTML = "";
  const pageCount = Math.ceil(data.length / rowsPerPage);
  if (pageCount <= 1) return;

  const addButton = (page, text) => {
    const btn = document.createElement("button");
    btn.innerText = text || page;
    btn.classList.add("pagination-button");
    if (page === currentAlertPage) {
      btn.classList.add("active");
    }
    btn.addEventListener("click", () => {
      currentAlertPage = page;
      displayAlertTablePage(data, tableBody, currentAlertPage);
      setupAlertPagination(data, paginationContainer, tableBody);
    });
    paginationContainer.appendChild(btn);
  };

  const addEllipsis = () => {
    const ellipsis = document.createElement("span");
    ellipsis.innerText = "...";
    ellipsis.className = "ellipsis";
    paginationContainer.appendChild(ellipsis);
  };

  const prevButton = document.createElement("button");
  prevButton.innerText = "←";
  prevButton.disabled = currentAlertPage === 1;
  prevButton.addEventListener("click", () => {
    if (currentAlertPage > 1) {
      currentAlertPage--;
      displayAlertTablePage(data, tableBody, currentAlertPage);
      setupAlertPagination(data, paginationContainer, tableBody);
    }
  });
  paginationContainer.appendChild(prevButton);

  addButton(1);

  if (currentAlertPage > 2) {
    addEllipsis();
  }

  if (currentAlertPage > 1 && currentAlertPage < pageCount) {
    addButton(currentAlertPage);
  }

  if (currentAlertPage < pageCount - 1) {
    addEllipsis();
  }

  if (pageCount > 1) {
    addButton(pageCount);
  }

  const nextButton = document.createElement("button");
  nextButton.innerText = "→";
  nextButton.disabled = currentAlertPage === pageCount;
  nextButton.addEventListener("click", () => {
    if (currentAlertPage < pageCount) {
      currentAlertPage++;
      displayAlertTablePage(data, tableBody, currentAlertPage);
      setupAlertPagination(data, paginationContainer, tableBody);
    }
  });
  paginationContainer.appendChild(nextButton);
}

function criarFiltroUF(dados) {
  const filtroUFDiv = document.querySelector(".filter-uf");
  if (!filtroUFDiv) return;

  const ufs = [...new Set(dados.map((d) => d.UF))].sort();

  const select = document.createElement("select");
  select.innerHTML =
    `<option value="">Todos os estados</option>` +
    ufs.map((uf) => `<option value="${uf}">${uf}</option>`).join("");

  filtroUFDiv.appendChild(select);

  select.addEventListener("change", (e) => {
    const ufSelecionada = e.target.value;
    aplicarFiltroPorUF(ufSelecionada);
  });
}

function criarFiltroUFAlert(dados) {
  const filtroUFDiv = document.querySelector(".filter-uf-alert");
  if (!filtroUFDiv) return;

  // Pega UFs da lista de alertas
  const ufs = [...new Set(dados.map((d) => d.UF))].sort();

  const select = document.createElement("select");
  select.innerHTML =
    `<option value="">Todos os estados</option>` +
    ufs.map((uf) => `<option value="${uf}">${uf}</option>`).join("");

  filtroUFDiv.appendChild(select);

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

  currentPage = 1;
  displayTablePage(dadosFiltrados, tableBody, currentPage);
  setupPagination(dadosFiltrados, paginationContainer, tableBody);

  if (uf) {
    const totalNucas = dadosFiltrados.length;
    const totalAdolescentes = dadosFiltrados.reduce(
      (acc, item) => acc + Number(item.Adolescentes || 0),
      0
    );
    const nomeEstado = uf;

    textoResumo.innerHTML = `${nomeEstado} tem no total <strong>${totalNucas.toLocaleString(
      "pt-BR"
    )} NUCAs criados</strong> que contam com <strong>${totalAdolescentes.toLocaleString(
      "pt-BR"
    )} adolescentes neles inscritos/as </strong>`;
  } else {
    const totalNucasNacional = adolescentesData.length;
    const totalAdolescentesNacional = adolescentesData.reduce(
      (acc, item) => acc + Number(item.Adolescentes || 0),
      0
    );
    textoResumo.innerHTML = `No país foram criados <strong>${totalNucasNacional.toLocaleString(
      "pt-BR"
    )} NUCAs</strong> que contam com <strong>${DADOS_PROCESSADOS.totalMembrosNucaCriado.toLocaleString(
      "pt-BR"
    )} adolescentes neles inscritos/as</strong>`;
  }
}

function aplicarFiltroPorUFAlert(uf) {
  const tableBody = document.getElementById("tbody-alert");
  const paginationContainer = document.getElementById(
    "pagination-container-alert"
  );
  const textoResumo = document.querySelector(".text-space-alert");

  if (!tableBody || !paginationContainer || !textoResumo) return;

  let dadosFiltrados = alertNucasData;

  if (uf) {
    dadosFiltrados = alertNucasData.filter((row) => row.UF === uf);
  }

  currentAlertPage = 1;
  displayAlertTablePage(dadosFiltrados, tableBody, currentAlertPage);
  setupAlertPagination(dadosFiltrados, paginationContainer, tableBody);

  // Atualiza texto resumo
  const totalNucas = dadosFiltrados.length;
  if (uf) {
    textoResumo.innerHTML = `${uf}: <strong>${totalNucas.toLocaleString(
      "pt-BR"
    )}</strong> municípios com pendências.`;
  } else {
    textoResumo.innerHTML = `No país, falta muito pouco para <strong>${totalNucas.toLocaleString(
      "pt-BR"
    )}</strong> terem seus NUCAs criados`;
  }
}

async function loadAdolescentesTableData() {
  try {
    const response = await fetch(API_ADOLESCENTES_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // API retorna JSON, não precisa de Papa.parse nem mapeamento de colunas por índice
    const rows = data;

    // Mapear dados da API (/adolescentes/)
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
          // Assumindo que 'indigenas' no JSON é usado tanto para o campo de pertencimento quanto de raça
          // já que não há um campo separado 'cor_indigena' no JSON de exemplo.
          IndigenaRaca: item.indigenas || "0",
        };
      })
      .filter((row) => row.UF && row.Municipio);

    // Salva todos os dados para uso nos gráficos (sem filtro de status)
    todosAdolescentesData = rawData;

    // 3. Separar APENAS os nucas criados para a tabela principal
    adolescentesData = rawData.filter((row) => row.Status === "✅ NUCA criado");

    console.log(adolescentesData);

    // 4. Calcular totais para os gráficos (baseado em TODOS os dados, usando todosAdolescentesData)
    const pertencimentoCounts = { Indigenas: 0, Quilombolas: 0, Ribeirinhos: 0 };
    const racaCounts = {
      Amarela: 0,
      Branca: 0,
      Indigena: 0,
      Parda: 0,
      Preta: 0,
    };

    // ALTERADO: Loop agora usa todosAdolescentesData em vez de adolescentesData
    todosAdolescentesData.forEach((row) => {
      const uf = row.UF.trim();
      const teens = parseInt(row.Adolescentes, 10) || 0;
      if (uf) {
        // Isso também atualiza o mapa para mostrar o total de adolescentes independentemente do status
        TEEN_COUNT_BY_UF[uf] = (TEEN_COUNT_BY_UF[uf] || 0) + teens;
      }

      // Soma Pertencimento
      pertencimentoCounts.Indigenas += parseInt(row.Indigenas || 0, 10);
      pertencimentoCounts.Quilombolas += parseInt(row.Quilombolas || 0, 10);
      pertencimentoCounts.Ribeirinhos += parseInt(row.Ribeirinhos || 0, 10);

      // Soma Raça
      racaCounts.Amarela += parseInt(row.Amarela || 0, 10);
      racaCounts.Branca += parseInt(row.Branca || 0, 10);
      racaCounts.Parda += parseInt(row.Parda || 0, 10);
      racaCounts.Preta += parseInt(row.Preta || 0, 10);
      racaCounts.Indigena += parseInt(row.IndigenaRaca || 0, 10);
    });

    // Renderiza os gráficos extras iniciais
    updatePertencimentoChart(pertencimentoCounts);
    updateRacaChart(racaCounts);

    // --- RENDERIZA TABELA PRINCIPAL (NUCAS CRIADOS) ---
    // A tabela continua usando adolescentesData (filtrado)
    const tableBody = document.querySelector(".table-container tbody"); // Seleciona o primeiro tbody
    const paginationContainer = document.getElementById("pagination-container");
    const textoResumo = document.querySelector(".text-space");

    if (textoResumo) {
      const totalNucasNacional = adolescentesData.length;
      const totalAdolescentesNacional = adolescentesData.reduce(
        (acc, item) => acc + Number(item.Adolescentes || 0),
        0
      );
      textoResumo.innerHTML = `No país foram criados <strong>${totalNucasNacional.toLocaleString(
        "pt-BR"
      )} NUCAs</strong> que contam com <strong>${DADOS_PROCESSADOS.totalMembrosNucaCriado.toLocaleString(
        "pt-BR"
      )} adolescentes neles inscritos/as</strong>`;
    }

    if (tableBody && paginationContainer) {
      displayTablePage(adolescentesData, tableBody, currentPage);
      setupPagination(adolescentesData, paginationContainer, tableBody);
    }

    criarFiltroUF(adolescentesData);
  } catch (error) {
    console.error(
      "Erro ao carregar os dados da tabela de adolescentes:",
      error
    );
    const tableBody = document.querySelector(".table-container tbody");
    if (tableBody) {
      tableBody.innerHTML =
        '<tr><td colspan="7">Não foi possível carregar os dados. Tente novamente mais tarde.</td></tr>';
    }
  }
}

// --- FIM: FUNÇÕES DA TABELA ---

// OTIMIZAÇÃO: Carregamento paralelo usando Promise.all
document.addEventListener("DOMContentLoaded", async () => {
  // Inicia ambos os carregamentos simultaneamente
  const loadTopData = loadAndProcessData(); // Dados do topo + tabela alerta
  const loadBottomData = loadAdolescentesTableData(); // Tabela principal + dados do mapa

  // Aguarda o término de ambos
  await Promise.all([loadTopData, loadBottomData]);

  // Configura mapa e filtros somente quando TUDO estiver pronto para evitar dados parciais
  // (O mapa precisa de NUCA_COUNT_BY_UF do topo E TEEN_COUNT_BY_UF da base)
  carregarMapbox(NUCA_COUNT_BY_UF);
  setupEZFilters();
});