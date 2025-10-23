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

// NOVO: Variável global para armazenar a contagem de NUCAs criados por UF
const NUCA_COUNT_BY_UF = {};

// Variável global para armazenar os dados detalhados por município
// Esta será nossa "fonte da verdade" para os filtros
const DADOS_DETALHADOS_POR_MUNICIPIO = {};

// NOVO: Mapeamento dos Escritórios Zonais (EZ) para as UFs correspondentes
// As UFs devem bater exatamente com o formato vindo do CSV (ex: "Pernambuco (PE)")
const MAPA_EZ_UFS = {
  recife: ["Pernambuco (PE)", "Paraíba (PB)", "Alagoas (AL)"],
  "sao-luis": ["Maranhão (MA)", "Piauí (PI)"],
  fortaleza: ["Ceará (CE)", "Rio Grande do Norte (RN)"],
  salvador: ["Bahia (BA)", "Sergipe (SE)"], // Corrigido de "SE e SE"
  manaus: ["Amazonas (AM)", "Acre (AC)", "Rondônia (RO)"],
  belem: ["Pará (PA)", "Amapá (AP)", "Mato Grosso (MT)", "Tocantins (TO)"],
  "boa-vista": ["Roraima (RR)"],
};

// NOVO: Variável global para armazenar a contagem de adolescentes por UF
const TEEN_COUNT_BY_UF = {};

// Variável Mapbox - IMPORTANTE: Substitua pelo seu token real
const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1IjoibHVjYXN0aGF5bmFuLWVzdGFkYW8iLCJhIjoiY2xnM3N1amQzMGlqeDNrbWdla3doY2o2dCJ9.OXh3OY3_HFqAiF-zzZ6SDQ";

const BRAZIL_STATES_GEOJSON_URL = "./data/brazil_states.geojson";

function createDoughnutChart(canvasId, labels, data, colors) {
  const ctx = document.getElementById(canvasId);

  if (!ctx) {
    console.error(`Canvas com ID '${canvasId}' não encontrado.`);
    return;
  }

  // Destrói o gráfico anterior, se existir, para criar um novo
  if (Chart.getChart(ctx)) {
    Chart.getChart(ctx).destroy();
  }

  // Certifica-se de que o elemento canvas está no tamanho correto para alta resolução
  const container = ctx.closest("div");
  // Obtém o tamanho computado para manter a responsividade do layout
  const size = Math.min(container.clientWidth, container.clientHeight);

  // Ajusta o canvas para o tamanho do contêiner para que o devicePixelRatio funcione
  ctx.width = size;
  ctx.height = size;

  // Configurações básicas para o gráfico de rosca
  const chartConfig = {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: colors,
          hoverOffset: 8, // Aumenta o offset ao passar o mouse
          borderWidth: 0,
        },
      ],
    },
    options: {
      // Configurações de alta resolução (devicePixelRatio: 2)
      responsive: false,
      devicePixelRatio: 2,
      maintainAspectRatio: true,

      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#3E3E3E",
            font: {
              family: "Inter",
              size: 14,
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
              // Formata o valor com separador de milhar
              const value = context.parsed.toLocaleString("pt-BR");
              label += value;
              return label;
            },
          },
        },
      },
    },
  };

  // Cria e renderiza o gráfico
  new Chart(ctx, chartConfig);
}

/**
 * ATUALIZAÇÃO: Função extraída para atualizar os gráficos de rosca.
 * Agora pode ser chamada com dados globais ou filtrados.
 */
function updateDonutCharts(nucaStatusCounts, genderCounts) {
  // 1. Gráfico de Status NUCA
  const nucaStatusLabels = Object.keys(nucaStatusCounts);
  const nucaStatusData = Object.values(nucaStatusCounts);
  
  // ATUALIZAÇÃO: Calcula e atualiza o total para NUCAs
  // const totalNucas = nucaStatusData.reduce((acc, val) => acc + val, 0);
  // const nucasTotalEl = document.getElementById('nucasTotal');
  // if (nucasTotalEl) {
  //     nucasTotalEl.textContent = totalNucas.toLocaleString('pt-BR');
  // }

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

  // ATUALIZAÇÃO: Calcula e atualiza o total para Gênero
  // const totalGenero = genderDataValues.reduce((acc, val) => acc + val, 0);
  // const generoTotalEl = document.getElementById('generoTotal');
  // if (generoTotalEl) {
  //     generoTotalEl.textContent = totalGenero.toLocaleString('pt-BR');
  // }

  const genderColors = [
    "#E1A38E", // 'Feminino'
    "#BCD876", // 'Masculino'
    "#958C80", // 'Não binário'
  ];

  // Filtra para remover categorias com contagem 0
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

/**
 * Função principal para buscar, processar e exibir os dados do CSV.
 */
async function loadAndProcessData() {
  try {
    // 1. Fetch dos dados do CSV
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`Erro ao buscar dados: ${response.statusText}`);
    }
    const csvText = await response.text();

    // 2. Processamento do CSV
    const rows = csvText.split(/\r?\n/);

    // Variáveis de totalização temporárias (para os dados GLOBAIS)
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

    // Itera pelas linhas a partir da 3ª linha (índice 2), ignorando os cabeçalhos e resumos estaduais
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i].trim();
      if (!row) continue; // Ignora linhas vazias

      // Usando regex para dividir por vírgula fora de aspas
      const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

      // Verifica se a linha é uma linha de dados de município válida
      const status = columns[6]
        ? columns[6].trim().replace(/"/g, "")
        : undefined;

      if (columns.length >= 7 && status && status !== "---") {
        // Colunas: [0] UF, [1] Município, [2] Feminino, [3] Masculino, [4] Não binário, [5] Total membros, [6] NUCA criado?

        const uf = columns[0].trim().replace(/"/g, "");
        const municipio = columns[1].trim().replace(/"/g, "");

        // Conversão de números (remove aspas e garante que são números)
        const total = parseInt(columns[5].replace(/"/g, ""), 10) || 0;
        const feminino = parseInt(columns[2].replace(/"/g, ""), 10) || 0;
        const masculino = parseInt(columns[3].replace(/"/g, ""), 10) || 0;
        const naoBinario = parseInt(columns[4].replace(/"/g, ""), 10) || 0;

        // --- Contagem para os totais GLOBAIS ---
        if (status in nucaStatusCounts) {
          nucaStatusCounts[status]++;
        }

        // Armazenamento da contagem de NUCAs CRIADOS por UF (para o mapa/barras)
        // E SOMA dos totais de membros e gênero APENAS se o NUCA estiver criado.
        if (status === "✅ NUCA criado") {
          // 3. Cálculo dos Totais Agregados (AGORA APENAS PARA NUCAS CRIADOS)
          totalMembers += total;
          
          // Contagem de Gênero (AGORA APENAS PARA NUCAS CRIADOS)
          genderCounts["Feminino"] += feminino;
          genderCounts["Masculino"] += masculino;
          genderCounts["Não binário"] += naoBinario;
          
          // Contagem de NUCAs por UF
          NUCA_COUNT_BY_UF[uf] = (NUCA_COUNT_BY_UF[uf] || 0) + 1;
        }
        // --- Fim da contagem global ---


        // Armazenamento por município (FONTE DA VERDADE PARA FILTROS)
        // Usamos a UF como chave principal para facilitar a filtragem por EZ
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

    // --- 4. Armazenamento dos dados GLOBAIS no dicionário global DADOS_PROCESSADOS ---
    DADOS_PROCESSADOS.totalMembros = totalMembers;
    DADOS_PROCESSADOS.nucaStatus = nucaStatusCounts;
    DADOS_PROCESSADOS.generoContagens = genderCounts;
    // --- Fim do Armazenamento ---

    // 5. Atualização dos Valores no HTML (inicial com dados globais)
    const totalNucasCriados = DADOS_PROCESSADOS.nucaStatus["✅ NUCA criado"] || 0;

    document.querySelector(".nucas-number").textContent = totalNucasCriados.toLocaleString("pt-BR");
    document.querySelector(".members-number").textContent = DADOS_PROCESSADOS.totalMembros.toLocaleString("pt-BR");

    // 6. Geração dos Gráficos com Chart.js (inicial com dados globais)
    // ATUALIZAÇÃO: Chamando a nova função reutilizável
    updateDonutCharts(DADOS_PROCESSADOS.nucaStatus, DADOS_PROCESSADOS.generoContagens);

    // --- NOVO BLOCO: Atualiza TEEN_COUNT_BY_UF com base nos mesmos dados dos gráficos ---
    for (const uf in DADOS_DETALHADOS_POR_MUNICIPIO) {
      const municipios = DADOS_DETALHADOS_POR_MUNICIPIO[uf];
      let somaAdolescentes = 0;
  
      municipios.forEach(m => {
        if (m.status === "✅ NUCA criado") {
          somaAdolescentes += m.total;
        }
      });
  
      TEEN_COUNT_BY_UF[uf] = somaAdolescentes;
    }

    // 7. Geração do Mapa e Gráfico de Barras por UF
    carregarMapbox(NUCA_COUNT_BY_UF); // Chamada da nova função do Mapbox
    createBarChart(NUCA_COUNT_BY_UF);
  } catch (error) {
    console.error("Falha ao processar os dados:", error);
    // Exibe mensagem de erro na interface
    document.querySelector(".nucas-number").textContent = "Erro";
    document.querySelector(".members-number").textContent = "Erro";
  }



}

// --- NOVAS FUNÇÕES DE FILTRAGEM POR EZ ---

/**
 * Filtra os dados globais com base em uma chave de EZ e atualiza os cards e gráficos.
 * @param {string} ezKey - A chave do MAPA_EZ_UFS (ex: "recife", "sao-luis").
 */
function filtrarEAtualizarPorEZ(ezKey) {
  const ufsDaEZ = MAPA_EZ_UFS[ezKey];
  if (!ufsDaEZ) {
    console.warn(`Chave de EZ não encontrada: ${ezKey}`);
    return;
  }

  // Variáveis para os novos cálculos filtrados
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

  // Itera sobre as UFs da EZ selecionada
  ufsDaEZ.forEach(uf => {
    const municipiosDaUF = DADOS_DETALHADOS_POR_MUNICIPIO[uf];
    
    if (municipiosDaUF) {
        // Itera sobre os municípios daquela UF
        municipiosDaUF.forEach(municipio => {
            // 1. Contagem de Status (para todos os municípios da EZ)
            if (municipio.status in nucaStatusFiltrado) {
                nucaStatusFiltrado[municipio.status]++;
            }

            // 2. Contagem de Membros e Gênero (APENAS para NUCAs criados na EZ)
            if (municipio.status === "✅ NUCA criado") {
                totalMembersFiltrado += municipio.total;
                genderCountsFiltrado["Feminino"] += municipio.feminino;
                genderCountsFiltrado["Masculino"] += municipio.masculino;
                genderCountsFiltrado["Não binário"] += municipio.naoBinario;
            }
        });
    }
  });

  // 3. Atualizar Cards com os totais filtrados
  document.querySelector(".nucas-number").textContent = (nucaStatusFiltrado["✅ NUCA criado"] || 0).toLocaleString("pt-BR");
  document.querySelector(".members-number").textContent = totalMembersFiltrado.toLocaleString("pt-BR");

  // 4. Atualizar Gráficos de Rosca com os dados filtrados
  updateDonutCharts(nucaStatusFiltrado, genderCountsFiltrado);
}


/**
 * Configura os event listeners para o dropdown de filtro da EZ.
 */
function setupEZFilters() {
  // ATUALIZADO: Seleciona o dropdown pelo ID
  const ezSelect = document.getElementById("ez-select");
  if (!ezSelect) {
    console.error("Dropdown de filtro EZ (#ez-select) não encontrado.");
    return;
  }

  // ATUALIZADO: Muda o evento de 'click' para 'change'
  ezSelect.addEventListener("change", (event) => {
    
    // ATUALIZADO: Pega o valor da option selecionada
    const ezKey = event.target.value; 
    
    if (ezKey === 'todos') {
      // Recarregar os gráficos com os dados GLOBAIS
      updateDonutCharts(DADOS_PROCESSADOS.nucaStatus, DADOS_PROCESSADOS.generoContagens);
      
      // Atualizar cards com os totais GLOBAIS
      const totalNucasGlobal = DADOS_PROCESSADOS.nucaStatus["✅ NUCA criado"] || 0;
      document.querySelector(".nucas-number").textContent = totalNucasGlobal.toLocaleString("pt-BR");
      document.querySelector(".members-number").textContent = DADOS_PROCESSADOS.totalMembros.toLocaleString("pt-BR");

    } else {
      // Filtrar e recarregar com base na EZ
      filtrarEAtualizarPorEZ(ezKey);
    }
  });
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

  // Converte nomes do CSV para siglas de UF
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

  // Ajusta o zoom e o centro do mapa com base na largura da tela
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
            "background-color": "#F3F3E6", //#F3F3E6
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

  // Adiciona controles de navegação
  map.addControl(
    new mapboxgl.NavigationControl({
      showCompass: false,
      showZoom: false,
    }),
    "top-right"
  );

  map.on("load", async () => {
    try {
      // 1. Fetch do GeoJSON dos estados
      const response = await fetch(BRAZIL_STATES_GEOJSON_URL);
      if (!response.ok) {
        throw new Error(`Erro ao buscar GeoJSON: ${response.statusText}`);
      }
      const geojsonData = await response.json();

      // Encontra o valor máximo para a escala de cores
      const maxNucas = Math.max(...Object.values(dadosConvertidos), 0);

      // 2. Mescla os dados do CSV nas propriedades do GeoJSON
      geojsonData.features.forEach((feature) => {
        const stateSigla = feature.properties.SIGLA;
        const nucaCount = dadosConvertidos[stateSigla] || 0;
        feature.properties.nucasCriados = nucaCount;

        // NOVO: Adiciona a contagem de adolescentes
        const possibleKeys = [
          stateSigla,
          feature.properties.Estado, // se o CSV usou "Acre (AC)" ou "Acre"
          feature.properties.NOME || "", // alternativa caso o GeoJSON tenha outra propriedade de nome
        ].filter(Boolean);

        // encontra a primeira chave que exista em TEEN_COUNT_BY_UF
        let teenCount = 0;
        for (const k of possibleKeys) {
          if (TEEN_COUNT_BY_UF[k] !== undefined) {
            teenCount = TEEN_COUNT_BY_UF[k];
            break;
          }
        }
        // garante número
        teenCount = parseInt(teenCount, 10) || 0;

        feature.properties.adolescentes = teenCount;
      });

      // 3. Adiciona a fonte de dados (source) ao mapa
      map.addSource("states-data", {
        type: "geojson",
        data: geojsonData,
      });

      // 4. Adiciona a camada de preenchimento (fill) para o choropleth
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
            "#CFCFC0", // cinza claro para estados sem dados
            1,
            "#d0e3f0", // azul bem claro
            maxNucas * 0.25,
            "#a6cee3", // azul médio claro
            maxNucas * 0.5,
            "#529cb9", // azul médio (mantém o tom original)
            maxNucas * 0.75,
            "#1f78b4", // azul escuro saturado
            maxNucas,
            "#08306b", // azul mais escuro (máximo valor)
          ],
          "fill-opacity": 0.8,
        },
      });

      // 5. Adiciona uma camada de borda para os estados
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

      // 6. Cria um popup, mas não o adiciona ao mapa ainda
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
      });

      // 7. Adiciona eventos de mousemove e mouseleave
      map.on("mousemove", "states-fill", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const properties = e.features[0].properties;
        const nucasValue = properties.nucasCriados;
        const stateName = properties.Estado;
        const teenValue = properties.adolescentes;

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

  // Converte o objeto de contagens em um array de objetos para fácil ordenação
  let dataArray = Object.keys(nucaDataByUF).map((uf) => ({
    uf: uf,
    count: nucaDataByUF[uf],
  }));

  // Filtra para manter apenas as UFs com NUCAs criados para o gráfico
  dataArray = dataArray.filter((item) => item.count > 0);

  // Ordena do maior para o menor
  dataArray.sort((a, b) => b.count - a.count);

  const labels = dataArray.map((item) => item.uf);
  const data = dataArray.map((item) => item.count);

  // Cor do tema (Azul escuro)
  const backgroundColor = "#005586";

  // Destrói o gráfico anterior, se existir (para evitar duplicações em re-render)
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
      indexAxis: "y", // Gráfico de barras horizontal
      layout: {
        padding: {
          left: 0,
          right: 25, // Espaço extra para o datalabel
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
              // Formata o valor com separador de milhar
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
let adolescentesData = [];
let currentPage = 1;
const rowsPerPage = 10;

function displayTablePage(data, tableBody, page) {
  tableBody.innerHTML = "";
  page--; // Ajusta para o índice do array (base 0)

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

/**
 * --- ATUALIZAÇÃO SOLICITADA ---
 * FUNÇÃO DE PAGINAÇÃO ATUALIZADA
 * Configura os controles para mostrar [<-] [1] [...] [MEIO] [...] [ÚLTIMA] [->]
 */
function setupPagination(data, paginationContainer, tableBody) {
    paginationContainer.innerHTML = "";
    const pageCount = Math.ceil(data.length / rowsPerPage);
    if (pageCount <= 1) return; // Não exibe paginação se houver apenas uma página

    // Função auxiliar para criar e adicionar um botão
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
            setupPagination(data, paginationContainer, tableBody); // Re-renderiza para atualizar o estado ativo
        });
        paginationContainer.appendChild(btn);
    };

    // Função auxiliar para adicionar "..."
    const addEllipsis = () => {
        const ellipsis = document.createElement("span");
        ellipsis.innerText = "...";
        ellipsis.className = "ellipsis";
        paginationContainer.appendChild(ellipsis);
    };

    // Botão "Anterior"
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

    // --- INÍCIO DA NOVA LÓGICA (PRIMEIRA, MEIO, ÚLTIMA) ---

    // 1. Botão da Primeira Página (Sempre aparece)
    addButton(1);

    // 2. Reticências Iniciais (...)
    // Aparece se a página atual for maior que 2 (ou seja, a partir da 3)
    if (currentPage > 2) {
        addEllipsis();
    }

    // 3. Botão da Página Atual (O "Meio")
    // Aparece se não for a primeira e nem a última página
    if (currentPage > 1 && currentPage < pageCount) {
        addButton(currentPage);
    }

    // 4. Reticências Finais (...)
    // Aparece se a página atual for menor que a penúltima (pageCount - 1)
    if (currentPage < pageCount - 1) {
        addEllipsis();
    }

    // 5. Botão da Última Página
    // Aparece se o total de páginas for maior que 1 (para não duplicar com a pág 1)
    if (pageCount > 1) {
        addButton(pageCount);
    }
    
    // --- FIM DA NOVA LÓGICA ---


    // Botão "Próximo"
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
    )} adolescentes inscritos </strong>`;
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
    )} adolescentes inscritos</strong>`;
  }
}

async function loadAdolescentesTableData() {
  try {
    const response = await fetch(CSV_ADOLESCENTES_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    const rows = csvText.trim().split(/\r?\n/).slice(1);

    adolescentesData = rows
      .map((row) => {
        const cleanedRow = row.trim();
        const columns = cleanedRow.split(",");
        return {
          UF: columns[0] || "",
          Municipio: columns[1] || "",
          Indigenas: columns[2] || "0",
          Quilombolas: columns[3] || "0",
          Ciganos: columns[4] || "0",
          Adolescentes: columns[5] || "0",
          Status: columns[6] || "",
        };
      })
      .filter((row) => row.UF && row.Municipio && row.Status === "✅ NUCA criado");

    // Popula a contagem de adolescentes por UF (para o popup do mapa)
    adolescentesData.forEach((row) => {
      const uf = row.UF.trim();
      const teens = parseInt(row.Adolescentes, 10) || 0;
      if (uf) {
        TEEN_COUNT_BY_UF[uf] = (TEEN_COUNT_BY_UF[uf] || 0) + teens;
      }
    });

    const tableBody = document.querySelector(".table-container tbody");
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
      )} adolescentes inscritos</strong>`;
    }

    if (tableBody && paginationContainer) {
      displayTablePage(adolescentesData, tableBody, currentPage);
      // CORREÇÃO: A variável aqui deve ser 'adolescentesData', que contém os dados carregados.
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

// Aguarda o carregamento completo do DOM para executar o código
document.addEventListener("DOMContentLoaded", async () => {
  // Carrega os dados da tabela (que populam TEEN_COUNT_BY_UF)
  await loadAdolescentesTableData(); 
  
  // Carrega os dados principais (que populam DADOS_PROCESSADOS e DADOS_DETALHADOS_POR_MUNICIPIO)
  await loadAndProcessData(); 
  
  // Configura os filtros de EZ DEPOIS que todos os dados foram carregados
  setupEZFilters(); 
});

