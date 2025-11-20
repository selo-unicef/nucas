const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSexVshsJMVGOEm37c0tw4xR5xgku8vC5Dut_hgrcAH3RTte06v2BXWb4ab2-zombbk1KFmdj_1rTko/pub?gid=265766927&single=true&output=csv";

// Variável global para armazenar os dados processados (resumos)
const DADOS_PROCESSADOS = {
  totalMembros: 0,
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
    "Amazonas (AM)", "Acre (AC)", "Rondônia (RO)",
    "Pará (PA)", "Amapá (AP)", "Mato Grosso (MT)", "Tocantins (TO)",
    "Roraima (RR)"
  ],
  "semiarido": [
    "Pernambuco (PE)", "Paraíba (PB)", "Alagoas (AL)",
    "Maranhão (MA)", "Piauí (PI)",
    "Ceará (CE)", "Rio Grande do Norte (RN)",
    "Bahia (BA)", "Sergipe (SE)", "Minas Gerais (MG)"
  ],
};

// Variável global para armazenar a contagem de adolescentes por UF
const TEEN_COUNT_BY_UF = {};

const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1IjoibHVjYXN0aGF5bmFuLWVzdGFkYW8iLCJhIjoiY2xnM3N1amQzMGlqeDNrbWdla3doY2o2dCJ9.OXh3OY3_HFqAiF-zzZ6SDQ";

const BRAZIL_STATES_GEOJSON_URL = "./data/brazil_states.geojson";

// Variáveis globais para as tabelas
let adolescentesData = []; // NUCAs Ativos (vindo do CSV_ADOLESCENTES_URL)
let alertNucasData = []; // NUCAs Pendentes (agora vindo do CSV_URL)

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
  const size = Math.min(container.clientWidth, container.clientHeight);

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
  
  const nucaStatusColors = [
    "#178076", // '✅ NUCA criado'
    "#D3A80A", // '⚠️ Não atende aos critérios'
    "#E1A38E", // '❌ Membros insuficientes'
  ];

  createDoughnutChart(
    "nucasChart",
    nucaStatusLabels,
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
    if (genderDataValues[index] > 0) {
      filteredGenderLabels.push(label);
      filteredGenderData.push(genderDataValues[index]);
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
    const labels = ["Indígenas", "Quilombolas", "Ciganos"];
    const data = [counts.Indigenas || 0, counts.Quilombolas || 0, counts.Ciganos || 0];
    const colors = ["#E1A38E", "#BCD876", "#D3A80A"];

    const filteredLabels = [];
    const filteredData = [];
    const filteredColors = [];

    data.forEach((val, idx) => {
        if(val > 0) {
            filteredLabels.push(labels[idx]);
            filteredData.push(val);
            filteredColors.push(colors[idx]);
        }
    });

    if(filteredData.length === 0) {
        createDoughnutChart("pertencimentoChart", ["Sem dados"], [1], ["#F3F3E6"]);
    } else {
        createDoughnutChart("pertencimentoChart", filteredLabels, filteredData, filteredColors);
    }
}

function updateRacaChart(counts) {
    const allLabels = ["Amarela (oriental)", "Branca", "Indígena", "Parda", "Preta"];
    const data = [
        counts.Amarela || 0,
        counts.Branca || 0,
        counts.Indigena || 0,
        counts.Parda || 0,
        counts.Preta || 0
    ];
    
    const colors = [
        "#F2C94C", // Amarela
        "#D3D3D3", // Branca
        "#E1A38E", // Indígena
        "#A87E6E", // Parda
        "#3E3E3E"  // Preta
    ];

     const filteredLabels = [];
     const filteredData = [];
     const filteredColors = [];
 
     data.forEach((val, idx) => {
         if(val > 0) {
             filteredLabels.push(allLabels[idx]);
             filteredData.push(val);
             filteredColors.push(colors[idx]);
         }
     });

     if(filteredData.length === 0) {
        createDoughnutChart("racaChart", ["Sem dados"], [1], ["#F3F3E6"]);
     } else {
        createDoughnutChart("racaChart", filteredLabels, filteredData, filteredColors);
     }
}

async function loadAndProcessData() {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`Erro ao buscar dados: ${response.statusText}`);
    }
    const csvText = await response.text();
    
    // OTIMIZAÇÃO: Uso do PapaParse para processar CSV muito mais rápido que Regex
    const results = Papa.parse(csvText, {
      header: false, // Mantém como array de arrays para usar índices
      skipEmptyLines: true
    });
    
    const rows = results.data;

    let totalMembers = 0;
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

    // O índice começa em 2 para pular cabeçalhos (conforme lógica original)
    for (let i = 2; i < rows.length; i++) {
      const columns = rows[i]; // PapaParse já retorna as colunas separadas
      if (!columns || columns.length < 7) continue;

      const status = columns[6] ? columns[6].trim() : undefined;

      if (status && status !== "---") {
        const uf = columns[0].trim();
        const municipio = columns[1].trim();

        const total = parseInt(columns[5], 10) || 0;
        const feminino = parseInt(columns[2], 10) || 0;
        const masculino = parseInt(columns[3], 10) || 0;
        const naoBinario = parseInt(columns[4], 10) || 0;

        if (status in nucaStatusCounts) {
          nucaStatusCounts[status]++;
        }

        if (status === "✅ NUCA criado") {
          totalMembers += total;
          
          genderCounts["Feminino"] += feminino;
          genderCounts["Masculino"] += masculino;
          genderCounts["Não binário"] += naoBinario;
          
          NUCA_COUNT_BY_UF[uf] = (NUCA_COUNT_BY_UF[uf] || 0) + 1;
        } else {
          // Se NÃO foi criado (pendente), adiciona à lista de alertas
          if (status.includes("❌") || status.includes("⚠️") || status.includes("Membros insuficientes") || status.includes("Não atende aos critérios")) {
              alertNucasData.push({
                UF: uf,
                Municipio: municipio,
                Total: total,
                Feminino: feminino,
                Masculino: masculino,
                NaoBinario: naoBinario,
                Status: status
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
    }

    DADOS_PROCESSADOS.totalMembros = totalMembers;
    DADOS_PROCESSADOS.nucaStatus = nucaStatusCounts;
    DADOS_PROCESSADOS.generoContagens = genderCounts;

    const totalNucasCriados = DADOS_PROCESSADOS.nucaStatus["✅ NUCA criado"] || 0;

    document.querySelector(".nucas-number").textContent = totalNucasCriados.toLocaleString("pt-BR");
    document.querySelector(".members-number").textContent = DADOS_PROCESSADOS.totalMembros.toLocaleString("pt-BR");

    updateDonutCharts(DADOS_PROCESSADOS.nucaStatus, DADOS_PROCESSADOS.generoContagens);

    // Atualiza contagens baseadas nos dados detalhados
    for (const uf in DADOS_DETALHADOS_POR_MUNICIPIO) {
      const municipios = DADOS_DETALHADOS_POR_MUNICIPIO[uf];
      let somaAdolescentes = 0;
  
      municipios.forEach(m => {
        if (m.status === "✅ NUCA criado") {
          somaAdolescentes += m.total;
        }
      });
      // Nota: TEEN_COUNT_BY_UF será sobrescrito pela tabela completa se ela carregar depois, 
      // mas isso garante dados preliminares rápidos se necessário.
    }

    // Renderiza Gráfico de Barras (Depende apenas destes dados)
    createBarChart(NUCA_COUNT_BY_UF);
    
    // Renderiza Tabela de Alertas (Depende apenas destes dados)
    const tableBodyAlert = document.getElementById("tbody-alert");
    const paginationAlert = document.getElementById("pagination-container-alert");
    const textoResumoAlert = document.querySelector(".text-space-alert");

    if (textoResumoAlert) {
        const totalAlert = alertNucasData.length;
        textoResumoAlert.innerHTML = `No país, <strong>${totalAlert.toLocaleString("pt-BR")}</strong> municípios estão quase lá.`;
    }

    if (tableBodyAlert && paginationAlert) {
        displayAlertTablePage(alertNucasData, tableBodyAlert, currentAlertPage);
        setupAlertPagination(alertNucasData, paginationAlert, tableBodyAlert);
    }

    criarFiltroUFAlert(alertNucasData);

    // OTIMIZAÇÃO: Não chamamos carregarMapbox() aqui ainda, pois ele precisa dos dados da outra tabela
    // para os tooltips ficarem corretos. Ele será chamado no Promise.all.

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

  ufsDaEZ.forEach(uf => {
    const municipiosDaUF = DADOS_DETALHADOS_POR_MUNICIPIO[uf];
    
    if (municipiosDaUF) {
        municipiosDaUF.forEach(municipio => {
            if (municipio.status in nucaStatusFiltrado) {
                nucaStatusFiltrado[municipio.status]++;
            }

            if (municipio.status === "✅ NUCA criado") {
                totalMembersFiltrado += municipio.total;
                genderCountsFiltrado["Feminino"] += municipio.feminino;
                genderCountsFiltrado["Masculino"] += municipio.masculino;
                genderCountsFiltrado["Não binário"] += municipio.naoBinario;
            }
        });
    }
  });

  document.querySelector(".nucas-number").textContent = (nucaStatusFiltrado["✅ NUCA criado"] || 0).toLocaleString("pt-BR");
  document.querySelector(".members-number").textContent = totalMembersFiltrado.toLocaleString("pt-BR");

  updateDonutCharts(nucaStatusFiltrado, genderCountsFiltrado);

  const pertencimentoFiltrado = { Indigenas: 0, Quilombolas: 0, Ciganos: 0 };
  const racaFiltrada = { Amarela: 0, Branca: 0, Indigena: 0, Parda: 0, Preta: 0 };

  adolescentesData.forEach(row => {
      const pertenceEZ = ufsDaEZ.some(ufEZ => ufEZ.includes(row.UF));

      if (pertenceEZ) {
          pertencimentoFiltrado.Indigenas += parseInt(row.Indigenas || 0, 10);
          pertencimentoFiltrado.Quilombolas += parseInt(row.Quilombolas || 0, 10);
          pertencimentoFiltrado.Ciganos += parseInt(row.Ciganos || 0, 10);
          
          // Soma Raça
          racaFiltrada.Amarela += parseInt(row.Amarela || 0, 10);
          racaFiltrada.Branca += parseInt(row.Branca || 0, 10);
          racaFiltrada.Parda += parseInt(row.Parda || 0, 10);
          racaFiltrada.Preta += parseInt(row.Preta || 0, 10);
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
    
    if (ezKey === 'todos') {
      updateDonutCharts(DADOS_PROCESSADOS.nucaStatus, DADOS_PROCESSADOS.generoContagens);
      
      const totalNucasGlobal = DADOS_PROCESSADOS.nucaStatus["✅ NUCA criado"] || 0;
      document.querySelector(".nucas-number").textContent = totalNucasGlobal.toLocaleString("pt-BR");
      document.querySelector(".members-number").textContent = DADOS_PROCESSADOS.totalMembros.toLocaleString("pt-BR");
      
      recalcularEAtualizarGraficosExtrasGlobais();

    } else {
      filtrarEAtualizarPorEZ(ezKey);
    }
  });
}

function recalcularEAtualizarGraficosExtrasGlobais() {
    const pertencimentoGlobal = { Indigenas: 0, Quilombolas: 0, Ciganos: 0 };
    const racaGlobal = { Amarela: 0, Branca: 0, Indigena: 0, Parda: 0, Preta: 0 };

    adolescentesData.forEach(row => {
        pertencimentoGlobal.Indigenas += parseInt(row.Indigenas || 0, 10);
        pertencimentoGlobal.Quilombolas += parseInt(row.Quilombolas || 0, 10);
        pertencimentoGlobal.Ciganos += parseInt(row.Ciganos || 0, 10);
        
        // Soma Raça
        racaGlobal.Amarela += parseInt(row.Amarela || 0, 10);
        racaGlobal.Branca += parseInt(row.Branca || 0, 10);
        racaGlobal.Parda += parseInt(row.Parda || 0, 10);
        racaGlobal.Preta += parseInt(row.Preta || 0, 10);
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

function createBarChart(nucaDataByUF) {
  const ctx = document.getElementById("nucasBarChart");
  if (!ctx) return;

  let dataArray = Object.keys(nucaDataByUF).map((uf) => ({
    uf: uf,
    count: nucaDataByUF[uf],
  }));

  dataArray = dataArray.filter((item) => item.count > 0);

  dataArray.sort((a, b) => b.count - a.count);

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
          right: 25,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              const value = context.parsed.x.toLocaleString("pt-BR");
              label += value;
              return label;
            },
          },
        },
        datalabels: {
          display: true,
          align: "end",
          anchor: "end",
          color: "#3E3E3E",
          formatter: (value) => value.toLocaleString("pt-BR"),
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

const CSV_ADOLESCENTES_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSexVshsJMVGOEm37c0tw4xR5xgku8vC5Dut_hgrcAH3RTte06v2BXWb4ab2-zombbk1KFmdj_1rTko/pub?gid=1991621210&single=true&output=csv";


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
              <td>${rowData.Ciganos || ""}</td>
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
        row.classList.add("row-red")
    } else if (rowData.Status && rowData.Status.includes("⚠️")) {
        statusClass = "status-yellow";
        row.classList.add("row-yellow")
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
    )} NUCAs</strong> criados e conta com <strong>${totalAdolescentes.toLocaleString(
      "pt-BR"
    )} adolescentes inscritos/as </strong>`;
  } else {
    const totalNucasNacional = adolescentesData.length;
    const totalAdolescentesNacional = adolescentesData.reduce(
      (acc, item) => acc + Number(item.Adolescentes || 0),
      0
    );
    textoResumo.innerHTML = `No país foram criados <strong>${totalNucasNacional.toLocaleString(
      "pt-BR"
    )} NUCAs</strong> e conta com <strong>${totalAdolescentesNacional.toLocaleString(
      "pt-BR"
    )} adolescentes inscritos/as</strong>`;
  }
}

function aplicarFiltroPorUFAlert(uf) {
  const tableBody = document.getElementById("tbody-alert");
  const paginationContainer = document.getElementById("pagination-container-alert");
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
      textoResumo.innerHTML = `${uf}: <strong>${totalNucas.toLocaleString("pt-BR")}</strong> municípios com pendências.`;
  } else {
      textoResumo.innerHTML = `No país, <strong>${totalNucas.toLocaleString("pt-BR")}</strong> municípios estão quase lá.`;
  }
}

async function loadAdolescentesTableData() {
  try {
    const response = await fetch(CSV_ADOLESCENTES_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    
    // OTIMIZAÇÃO: Usando PapaParse também aqui
    const results = Papa.parse(csvText, {
      header: false,
      skipEmptyLines: true
    });
    
    const allRows = results.data;
    
    if (allRows.length < 2) throw new Error("CSV vazio ou sem dados.");

    // 1. Cabeçalhos estão na primeira linha (índice 0)
    const headerColumns = allRows[0].map(s => s.trim());
    
    const findCol = (patterns) => headerColumns.findIndex(h => patterns.some(p => h.toLowerCase().includes(p.toLowerCase())));

    // Mapeamento de Índices
    const iUF = findCol(["UF", "Estado"]);
    const iMun = findCol(["Município", "Municipio"]);
    const iIndigenas = findCol(["Indígenas", "Indigenas"]); // Plural (Pertencimento)
    const iQuilombolas = findCol(["Quilombolas"]);
    const iCiganos = findCol(["Ciganos"]);
    const iTeen = findCol(["Adolescentes", "Total"]);
    const iStatus = findCol(["Status", "Situação"]);
    
    const iAmarela = findCol(["Amarela", "Oriental"]);
    const iBranca = findCol(["Branca"]);
    const iParda = findCol(["Parda"]);
    const iPreta = findCol(["Preta"]);
    const iIndigenaRaca = findCol(["Indígena", "Cor Indígena"]); 

    // 2. Mapear TODOS os dados brutos (ignora cabeçalho)
    const rawData = allRows.slice(1)
      .map((cols) => {
        // PapaParse já separou as colunas, usamos direto
        const getVal = (idx) => (idx !== -1 && cols[idx] ? cols[idx].trim() : "0");
        const statusVal = (iStatus !== -1 && cols[iStatus]) ? cols[iStatus].trim() : "";

        return {
          UF: getVal(iUF),
          Municipio: getVal(iMun),
          Indigenas: getVal(iIndigenas),
          Quilombolas: getVal(iQuilombolas),
          Ciganos: getVal(iCiganos),
          Adolescentes: getVal(iTeen),
          Status: statusVal,
          Amarela: getVal(iAmarela),
          Branca: getVal(iBranca),
          Parda: getVal(iParda),
          Preta: getVal(iPreta),
          IndigenaRaca: getVal(iIndigenaRaca) 
        };
      })
      .filter(row => row.UF && row.Municipio);

    // 3. Separar APENAS os nucas criados para a tabela principal
    adolescentesData = rawData.filter((row) => row.Status === "✅ NUCA criado");

    // 4. Calcular totais para os gráficos (baseado APENAS nos NUCAs criados)
    const pertencimentoCounts = { Indigenas: 0, Quilombolas: 0, Ciganos: 0 };
    const racaCounts = { Amarela: 0, Branca: 0, Indigena: 0, Parda: 0, Preta: 0 };

    adolescentesData.forEach((row) => {
      const uf = row.UF.trim();
      const teens = parseInt(row.Adolescentes, 10) || 0;
      if (uf) {
        TEEN_COUNT_BY_UF[uf] = (TEEN_COUNT_BY_UF[uf] || 0) + teens;
      }

      // Soma Pertencimento
      pertencimentoCounts.Indigenas += parseInt(row.Indigenas || 0, 10);
      pertencimentoCounts.Quilombolas += parseInt(row.Quilombolas || 0, 10);
      pertencimentoCounts.Ciganos += parseInt(row.Ciganos || 0, 10);

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
      )} NUCAs</strong> e conta com <strong>${totalAdolescentesNacional.toLocaleString(
        "pt-BR"
      )} adolescentes inscritos/as</strong>`;
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