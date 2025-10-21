const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSexVshsJMVGOEm37c0tw4xR5xgku8vC5Dut_hgrcAH3RTte06v2BXWb4ab2-zombbk1KFmdj_1rTko/pub?gid=265766927&single=true&output=csv";

// Variável global para armazenar os dados processados (resumos)
const DADOS_PROCESSADOS = {
  totalMembros: 0,
  nucaStatus: {},
  generoContagens: {},
};

// // Obtém a largura da tela
let larguraTela = window.innerWidth;

// NOVO: Variável global para armazenar a contagem de NUCAs criados por UF
const NUCA_COUNT_BY_UF = {};

// Variável global para armazenar os dados detalhados por município
const DADOS_DETALHADOS_POR_MUNICIPIO = {};

// Variável Mapbox - IMPORTANTE: Substitua pelo seu token real
const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1IjoibHVjYXN0aGF5bmFuLWVzdGFkYW8iLCJhIjoiY2xnM3N1amQzMGlqeDNrbWdla3doY2o2dCJ9.OXh3OY3_HFqAiF-zzZ6SDQ";

const BRAZIL_STATES_GEOJSON_URL = "./data/brazil_states.geojson";

/**
 * Função para criar um gráfico de rosca (Doughnut Chart)
 * @param {string} canvasId - O ID do elemento canvas.
 * @param {string[]} labels - Rótulos para cada fatia do gráfico.
 * @param {number[]} data - Valores numéricos para cada fatia.
 * @param {string[]} colors - Cores de fundo para cada fatia.
 */
function createDoughnutChart(canvasId, labels, data, colors) {
  const ctx = document.getElementById(canvasId);

  if (!ctx) {
    console.error(`Canvas com ID '${canvasId}' não encontrado.`);
    return;
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

    // Variáveis de totalização temporárias
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

        // 3. Cálculo dos Totais Agregados
        totalMembers += total;

        // Contagem de Status do NUCA
        if (status in nucaStatusCounts) {
          nucaStatusCounts[status]++;
        }

        // Contagem de Gênero
        genderCounts["Feminino"] += feminino;
        genderCounts["Masculino"] += masculino;
        genderCounts["Não binário"] += naoBinario;

        // NOVO: Armazenamento da contagem de NUCAs CRIADOS por UF
        if (status === "✅ NUCA criado") {
          NUCA_COUNT_BY_UF[uf] = (NUCA_COUNT_BY_UF[uf] || 0) + 1;
        }

        // NOVO: Armazenamento por município no novo dicionário
        DADOS_DETALHADOS_POR_MUNICIPIO[municipio] = {
          uf: uf,
          municipio: municipio,
          feminino: feminino,
          masculino: masculino,
          naoBinario: naoBinario,
          total: total,
          status: status,
        };
      }
    }

    // --- 4. Armazenamento dos dados no dicionário global DADOS_PROCESSADOS ---
    DADOS_PROCESSADOS.totalMembros = totalMembers;
    DADOS_PROCESSADOS.nucaStatus = nucaStatusCounts;
    DADOS_PROCESSADOS.generoContagens = genderCounts;
    // --- Fim do Armazenamento ---

    // 5. Atualização dos Valores no HTML
    const totalNucasCriados =
      DADOS_PROCESSADOS.nucaStatus["✅ NUCA criado"] || 0;

    document.querySelector(".nucas-number").textContent =
      totalNucasCriados.toLocaleString("pt-BR");
    document.querySelector(".members-number").textContent =
      DADOS_PROCESSADOS.totalMembros.toLocaleString("pt-BR");

    // 6. Geração dos Gráficos com Chart.js
    const nucaStatusLabels = Object.keys(DADOS_PROCESSADOS.nucaStatus);
    const nucaStatusData = Object.values(DADOS_PROCESSADOS.nucaStatus);
    const nucaStatusColors = [
      "#178076", // Teal Escuro para '✅ NUCA criado'
      "#D3A80A", // Amarelo Dourado para '⚠️ Não atende aos critérios'
      "#E1A38E", // Rosa Suave para '❌ Membros insuficientes'
    ];

    createDoughnutChart(
      "nucasChart",
      nucaStatusLabels,
      nucaStatusData,
      nucaStatusColors
    );

    const genderLabels = Object.keys(DADOS_PROCESSADOS.generoContagens);
    const genderData = Object.values(DADOS_PROCESSADOS.generoContagens);
    const genderColors = [
      "#E1A38E", // Rosa Suave para 'Feminino'
      "#BCD876", // Verde Claro/Lima para 'Masculino'
      "#958C80", // Cinza Quente para 'Não binário'
    ];

    // Filtra para remover categorias com contagem 0
    const filteredGenderLabels = [];
    const filteredGenderData = [];
    const filteredGenderColors = [];

    genderLabels.forEach((label, index) => {
      if (genderData[index] > 0) {
        filteredGenderLabels.push(label);
        filteredGenderData.push(genderData[index]);
        filteredGenderColors.push(genderColors[index]);
      }
    });

    createDoughnutChart(
      "generoChart",
      filteredGenderLabels,
      filteredGenderData,
      filteredGenderColors
    );

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

// Inicializa o carregamento dos dados e gráficos
window.onload = loadAndProcessData;

// --- FUNÇÕES DO MAPBOX (SUBSTITUEM AS FUNÇÕES DE SVG ESTÁTICO) ---

/**
 * Pinta o mapa usando Mapbox GL JS com o volume de NUCAs criados por UF.
 * @param {object} nucaDataByUF - Objeto com a contagem de NUCAs criados por UF (ex: {'SP': 10, 'RJ': 5}).
 */
function carregarMapbox(nucaDataByUF) {
  // Configura o token de acesso (substituir o placeholder pelo token real)
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

  // Encontra os valores min e max para a escala de cores
  const counts = Object.values(nucaDataByUF).filter((c) => c > 0);
  const minCount = counts.length > 0 ? Math.min(...counts) : 0;
  const maxCount = counts.length > 0 ? Math.max(...counts) : 1; // Evita divisão por zero

  // Cria a escala de cores Mapbox
  // Gradiente: de Azul Claro (#75B4CC) para Azul Escuro (#005586)
  const colorStops = [
    0,
    "#75B4CC", // Para contagem 0, use a cor mais clara
    minCount,
    "#75B4CC", // Mínimo
    // Adiciona um ponto intermediário e o máximo
    (maxCount + minCount) / 2,
    "#48849E",
    maxCount,
    "#005586",
  ];

  // A Mapbox GL JS usa uma expressão de estilo para data-driven styling.
  // Criamos o 'case' para mapear cada código UF com seu valor, caindo para a escala de cor.
  const caseStatements = ["case"];
  for (const ufCode in nucaDataByUF) {
    // Adiciona a lógica: se a propriedade 'uf_code' for igual ao UF, use o valor para a escala.
    // Aqui usamos o código UF (ex: 'SP') para buscar o valor.
    caseStatements.push(["==", ["get", "uf_code"], ufCode]);
    caseStatements.push(nucaDataByUF[ufCode]);
  }
  // Valor padrão se não for encontrado: 0
  caseStatements.push(0);

  // Combina o case com o gradiente (step)
  const fillStyle = [
    "step",
    caseStatements, // Input: o valor do NUCA
    // Output colors: A escala de cor
    ...colorStops,
  ];

  // Inicialização do Mapa
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
    center: [-54.174281, -15.459189], // Centro do Brasil
    zoom: 2.97,
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

  map.on("move", () => {
    const center = map.getCenter(); // retorna {lng, lat}
    const zoom = map.getZoom();

    console.log(
      `Latitude: ${center.lat.toFixed(6)}, Longitude: ${center.lng.toFixed(
        6
      )}, Zoom: ${zoom.toFixed(2)}`
    );
  });

  map.on("load", async () => {
    // 1. Carregar o GeoJSON dos estados
    let geojsonData;
    try {
      const response = await fetch(BRAZIL_STATES_GEOJSON_URL);
      if (!response.ok)
        throw new Error("Falha ao carregar GeoJSON dos estados.");
      geojsonData = await response.json();
    } catch (e) {
      console.error(
        "Erro ao buscar o GeoJSON dos estados. Use um arquivo local ou GeoJSON embutido.",
        e
      );
      // Exibe erro na interface
      document.getElementById("mapbox-map").innerHTML = `
            <div style="padding: 20px; text-align: center; color: #cc0000; background-color: #ffe6e6; border: 1px solid #cc0000; border-radius: 8px; height: 100%; display: flex; align-items: center; justify-content: center;">
                <p><strong>ERRO DE MAPA:</strong> Não foi possível carregar as fronteiras dos estados (GeoJSON).</p>
            </div>
        `;
      return;
    }

    // 2. Adicionar Fonte de Dados (Source)
    map.addSource("brazil-states", {
      type: "geojson",
      data: geojsonData,
    });

    // 3. Adicionar Camada (Layer) com Estilo Dirigido por Dados (Data-Driven Styling)
    map.addLayer({
      id: "states-fill",
      type: "fill",
      source: "brazil-states",
      paint: {
        "fill-color": "#ca6a6a",
        "fill-opacity": 0.8,
      },
    });

    // 4. Adicionar Contorno (Stroke)
    map.addLayer({
      id: "states-border",
      type: "line",
      source: "brazil-states",
      layout: {},
      paint: {
        "line-color": "#d12929",
        "line-width": 1,
      },
    });

    // 5. Adicionar Interatividade (Tooltip)
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      anchor: "top",
    });

    map.on("mousemove", "states-fill", (e) => {
      if (e.features.length > 0) {
        const feature = e.features[0];
        const ufCode = feature.properties.uf_code;
        const ufName = feature.properties.name;
        const count = nucaDataByUF[ufCode] || 0;

        map.getCanvas().style.cursor = "pointer";

        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `
                    <div style="font-family: Inter, sans-serif; color: #3E3E3E; padding: 4px;">
                        <strong>${ufName} (${ufCode})</strong><br>
                        ${count.toLocaleString("pt-BR")} NUCAs
                    </div>
                 `
          )
          .addTo(map);
      }
    });

    map.on("mouseleave", "states-fill", () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });
  });
}

/**
 * Cria o gráfico de barras horizontal por UF.
 * @param {object} nucaDataByUF - Objeto com a contagem de NUCAs criados por UF.
 */
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



// --- INÍCIO: NOVAS FUNÇÕES PARA A TABELA DE ADOLESCENTES ---

const CSV_ADOLESCENTES_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSexVshsJMVGOEm37c0tw4xR5xgku8vC5Dut_hgrcAH3RTte06v2BXWb4ab2-zombbk1KFmdj_1rTko/pub?gid=1991621210&single=true&output=csv';
let adolescentesData = [];
let currentPage = 1;
const rowsPerPage = 10;

/**
 * Exibe uma página específica da tabela de adolescentes.
 * @param {Array} data - O array de dados completo.
 * @param {HTMLElement} tableBody - O elemento tbody da tabela.
 * @param {number} page - O número da página a ser exibida.
 */
function displayTablePage(data, tableBody, page) {
    tableBody.innerHTML = '';
    page--; // Ajusta para o índice do array (base 0)

    const start = rowsPerPage * page;
    const end = start + rowsPerPage;
    const paginatedItems = data.slice(start, end);

    paginatedItems.forEach(rowData => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${rowData.UF || ''}</td>
            <td>${rowData.Municipio || ''}</td>
            <td>${rowData.Adolescentes || ''}</td>
            <td>${rowData.Indigenas || ''}</td>
            <td>${rowData.Quilombolas || ''}</td>
            <td>${rowData.Ciganos || ''}</td>
            <td>${rowData.Status || ''}</td>
        `;
        tableBody.appendChild(row);
    });
}

/**
 * Configura os botões de paginação da tabela.
 * @param {Array} data - O array de dados completo.
 * @param {HTMLElement} paginationContainer - O container para os botões.
 * @param {HTMLElement} tableBody - O elemento tbody da tabela.
 */
function setupPagination(data, paginationContainer, tableBody) {
    paginationContainer.innerHTML = '';
    const pageCount = Math.ceil(data.length / rowsPerPage);

    for (let i = 1; i <= pageCount; i++) {
        const btn = document.createElement('button');
        btn.innerText = i;
        btn.classList.add('pagination-button');
        btn.addEventListener('click', () => {
            currentPage = i;
            displayTablePage(data, tableBody, currentPage);
            
            let currentActive = paginationContainer.querySelector('.active');
            if (currentActive) {
                currentActive.classList.remove('active');
            }
            btn.classList.add('active');
        });
        paginationContainer.appendChild(btn);
    }
    
    if (paginationContainer.firstChild) {
        paginationContainer.firstChild.classList.add('active');
    }
}

/**
 * Carrega e processa os dados do CSV para a tabela de adolescentes.
 */
async function loadAdolescentesTableData() {
    try {
        const response = await fetch(CSV_ADOLESCENTES_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        const rows = csvText.trim().split(/\r?\n/).slice(1);
        
        adolescentesData = rows.map(row => {
            const cleanedRow = row.trim();
            const columns = cleanedRow.split(',');
            return {
                UF: cleanedColumns[0] || '',
                Municipio: cleanedColumns[1] || '',
                // AQUI A MUDANÇA: Verifica se o valor numérico é > 0
                Indigenas: Number(cleanedColumns[2]) > 0 ? 'Sim' : '',
                Quilombolas: Number(cleanedColumns[3]) > 0 ? 'Sim' : '',
                Ciganos: Number(cleanedColumns[4]) > 0 ? 'Sim' : '',
                Adolescentes: cleanedColumns[5] || '',
                Status: cleanedColumns[6] || ''
            };
            //   return {
            //     UF: columns[0] || '',
            //     Municipio: columns[1] || '',
            //     Indigenas: columns[2] || '',
            //     Quilombolas: columns[3] || '',
            //     Ciganos: columns[4] || '',
            //     Adolescentes: columns[5] || '',
            //     Status: columns[6] || ''
            // };
        }).filter(row => row.UF && row.Municipio); // Filtra linhas vazias

        const tableBody = document.querySelector('.table-container tbody');
        const paginationContainer = document.getElementById('pagination-container');

        if (tableBody && paginationContainer) {
            displayTablePage(adolescentesData, tableBody, currentPage);
            setupPagination(adolescentesData, paginationContainer, tableBody);
        }

    } catch (error) {
        console.error("Erro ao carregar os dados da tabela de adolescentes:", error);
        const tableBody = document.querySelector('.table-container tbody');
        if (tableBody) {
             tableBody.innerHTML = '<tr><td colspan="7">Não foi possível carregar os dados. Tente novamente mais tarde.</td></tr>';
        }
    }
}

function processCSVData(csvText) {
  const rows = csvText.split("\n").slice(1);
  rows.forEach((row) => {
    const columns = row.split(",");
    const [
      timestamp,
      uf,
      municipio,
      nome,
      dataNascimento,
      genero,
      raca,
      status,
    ] = columns;

    if (uf && municipio && status) {
      const ufClean = uf.trim();
      const municipioClean = municipio.trim();
      const statusClean = status.trim();
      const generoClean = genero ? genero.trim() : "Não informado";

      // Processamento para o total de membros
      DADOS_PROCESSADOS.totalMembros++;

      // Processamento para status dos NUCAs
      DADOS_PROCESSADOS.nucaStatus[statusClean] =
        (DADOS_PROCESSADOS.nucaStatus[statusClean] || 0) + 1;

      // Processamento para contagem de gênero
      DADOS_PROCESSADOS.generoContagens[generoClean] =
        (DADOS_PROCESSADOS.generoContagens[generoClean] || 0) + 1;

      // Processamento para contagem de NUCAs por UF (se for "NUCA criado")
      if (statusClean === "✅ NUCA criado") {
        const stateSigla = ufClean.match(/\((.*?)\)/);
        if (stateSigla && stateSigla[1]) {
          const sigla = stateSigla[1];
          NUCA_COUNT_BY_UF[sigla] = (NUCA_COUNT_BY_UF[sigla] || 0) + 1;
        }
      }
    }
  });
}

async function loadCSVDataAndCreateCharts() {
  try {
    const response = await fetch(CSV_URL);
    const csvText = await response.text();
    processCSVData(csvText);
    updateUI();
    // Agora que temos os dados, criamos o mapa
    createMap(NUCA_COUNT_BY_UF, DADOS_DETALHADOS_POR_MUNICIPIO);
  } catch (error) {
    console.error("Erro ao carregar ou processar o CSV:", error);
  }
}


function updateUI() {
  document.getElementById("total-membros").innerText =
    DADOS_PROCESSADOS.totalMembros.toLocaleString("pt-BR");

  const statusList = document.getElementById("status-list");
  statusList.innerHTML = "";
  for (const status in DADOS_PROCESSADOS.nucaStatus) {
    const count = DADOS_PROCESSADOS.nucaStatus[status];
    const statusItem = document.createElement("div");
    statusItem.className = "status-item";
    statusItem.innerHTML = `
            <span>${status}</span>
            <span class="status-count">${count.toLocaleString("pt-BR")}</span>
        `;
    statusList.appendChild(statusItem);
  }

  createGenderChart(DADOS_PROCESSADOS.generoContagens);
  createBarChartNucasUF(NUCA_COUNT_BY_UF);
}



// --- FILTRO POR UF E TEXTO DINÂMICO ---

function criarFiltroUF(dados) {
    const filtroUFDiv = document.querySelector('.filter-uf');
    if (!filtroUFDiv) return;

    // Obter lista única de UFs
    const ufs = [...new Set(dados.map(d => d.UF))].sort();

    // Criar o elemento <select>
    const select = document.createElement('select');
    select.innerHTML = `<option value="">Todos os estados</option>` + 
        ufs.map(uf => `<option value="${uf}">${uf}</option>`).join('');

    filtroUFDiv.appendChild(select);

    // Quando o usuário muda o filtro
    select.addEventListener('change', (e) => {
        const ufSelecionada = e.target.value;
        aplicarFiltroPorUF(ufSelecionada);
    });
}

function aplicarFiltroPorUF(uf) {
    const tableBody = document.querySelector('.table-container tbody');
    const paginationContainer = document.getElementById('pagination-container');
    const textoResumo = document.querySelector('.text-space');

    if (!tableBody || !paginationContainer || !textoResumo) return;

    let dadosFiltrados = adolescentesData;

    if (uf) {
        dadosFiltrados = adolescentesData.filter(row => row.UF === uf);
    }

    // Atualiza a tabela
    displayTablePage(dadosFiltrados, tableBody, 1);
    setupPagination(dadosFiltrados, paginationContainer, tableBody);

    // Atualiza o texto descritivo
    if (uf) {
        const totalNucas = dadosFiltrados.length;
        const totalAdolescentes = dadosFiltrados.reduce((acc, item) => acc + Number(item.Adolescentes || 0), 0);
        const nomeEstado = uf; // pode ser adaptado se quiser o nome por extenso

        textoResumo.textContent = `No estado ${nomeEstado} foram criados ${totalNucas.toLocaleString('pt-BR')} NUCAs e há ${totalAdolescentes.toLocaleString('pt-BR')} adolescentes engajados.`;
    } else {
        textoResumo.textContent = `Selecione um estado para ver quantos NUCAs foram criados e o total de adolescentes engajados.`;
    }
}

// Depois que os dados forem carregados, criamos o filtro
async function loadAdolescentesTableData() {
    try {
        const response = await fetch(CSV_ADOLESCENTES_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        const rows = csvText.trim().split(/\r?\n/).slice(1);
        
        adolescentesData = rows.map(row => {
            const cleanedRow = row.trim();
            const columns = cleanedRow.split(',');
            return {
                UF: columns[0] || '',
                Municipio: columns[1] || '',
                Indigenas: columns[2] || '',
                Quilombolas: columns[3] || '',
                Ciganos: columns[4] || '',
                Adolescentes: columns[5] || '',
                Status: columns[6] || ''
            };
        }).filter(row => row.UF && row.Municipio);

        const tableBody = document.querySelector('.table-container tbody');
        const paginationContainer = document.getElementById('pagination-container');

        if (tableBody && paginationContainer) {
            displayTablePage(adolescentesData, tableBody, currentPage);
            setupPagination(adolescentesData, paginationContainer, tableBody);
        }

        // 🆕 Cria o filtro de UF
        criarFiltroUF(adolescentesData);

    } catch (error) {
        console.error("Erro ao carregar os dados da tabela de adolescentes:", error);
        const tableBody = document.querySelector('.table-container tbody');
        if (tableBody) {
             tableBody.innerHTML = '<tr><td colspan="7">Não foi possível carregar os dados. Tente novamente mais tarde.</td></tr>';
        }
    }
}


// --- FIM: NOVAS FUNÇÕES ---


// Aguarda o carregamento completo do DOM para executar o código
document.addEventListener("DOMContentLoaded", () => {
  // Chama a função principal que carrega os dados e cria os gráficos
  loadCSVDataAndCreateCharts();
  // CHAMA A NOVA FUNÇÃO PARA CARREGAR OS DADOS DA TABELA
  loadAdolescentesTableData();
});



