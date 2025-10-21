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
 * Função para criar um gráfico de rosca (Doughnut Chart) para gênero.
 * @param {object} generoContagens - Objeto com as contagens de gênero.
 */
function createGenderChart(generoContagens) {
  const ctx = document.getElementById("gender-chart").getContext("2d");
  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(generoContagens),
      datasets: [
        {
          data: Object.values(generoContagens),
          backgroundColor: ["#005980", "#75B4CC", "#F3F3E6"],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.raw;
              const total = context.chart.getDatasetMeta(0).total;
              const percentage = ((value / total) * 100).toFixed(2) + "%";
              return `${label}: ${value} (${percentage})`;
            },
          },
        },
      },
    },
  });
}

/**
 * Função para criar um gráfico de barras horizontais para NUCAs por UF.
 * @param {object} nucaCountByUF - Objeto com a contagem de NUCAs por UF.
 */
function createBarChartNucasUF(nucaCountByUF) {
  const ctx = document.getElementById("bar-chart-nucas-uf").getContext("2d");

  // Ordena os dados em ordem decrescente
  const sortedData = Object.entries(nucaCountByUF).sort(([, a], [, b]) => b - a);
  const labels = sortedData.map(([uf]) => uf);
  const data = sortedData.map(([, count]) => count);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "NUCAs Criados",
          data: data,
          backgroundColor: "#005980",
          borderColor: "#004766",
          borderWidth: 1,
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

/**
 * Função para criar e configurar o mapa de NUCAs por estado.
 * @param {object} nucaCountByUF - Objeto com a contagem de NUCAs por UF.
 * @param {object} detailedDataByCity - Dados detalhados por município.
 */
async function createMap(nucaCountByUF, detailedDataByCity) {
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/light-v11",
    center: [-54, -15],
    zoom: 3.5,
  });

  try {
    const response = await fetch(BRAZIL_STATES_GEOJSON_URL);
    const statesGeoJSON = await response.json();

    map.on("load", () => {
      map.addSource("states", {
        type: "geojson",
        data: statesGeoJSON,
      });

      map.addLayer({
        id: "states-layer",
        type: "fill",
        source: "states",
        paint: {
          "fill-color": [
            "case",
            ["has", ["get", "sigla"], ["literal", nucaCountByUF]],
            [
              "interpolate",
              ["linear"],
              ["get",
                ["get", "sigla"],
                ["literal", nucaCountByUF]
              ],
              0, "#E0E0E0",
              1, "#D4E6F1",
              5, "#A9CCE3",
              10, "#7FB3D5",
              20, "#5499C7",
              50, "#2980B9",
              100, "#2471A3",
              200, "#1F618D",
              500, "#1A5276",
              1000, "#003366"
            ],
            "#E0E0E0", // Cor padrão para estados sem dados
          ],
          "fill-opacity": 0.7,
          "fill-outline-color": "#FFFFFF",
        },
      });

      // Adiciona pop-up ao clicar em um estado
      map.on("click", "states-layer", (e) => {
        const stateSigla = e.features[0].properties.sigla;
        const stateName = e.features[0].properties.nome;
        const nucaCount = nucaCountByUF[stateSigla] || 0;

        let cityListHTML = "<ul>";
        if (detailedDataByCity[stateSigla]) {
          detailedDataByCity[stateSigla].forEach((cityData) => {
            cityListHTML += `<li>${cityData.municipio}: ${cityData.status}</li>`;
          });
        } else {
          cityListHTML = "<p>Nenhum NUCA registrado.</p>";
        }
        cityListHTML += "</ul>";

        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(
            `<h3>${stateName} (${stateSigla})</h3><p><strong>NUCAs Criados:</strong> ${nucaCount}</p>`
          )
          .addTo(map);
      });

      // Altera o cursor para um ponteiro ao passar sobre um estado
      map.on("mouseenter", "states-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "states-layer", () => {
        map.getCanvas().style.cursor = "";
      });
    });
  } catch (error) {
    console.error("Erro ao carregar o GeoJSON dos estados:", error);
  }
}

/**
 * Função para processar os dados do CSV.
 * @param {string} csvText - O texto do arquivo CSV.
 */
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

/**
 * Função para atualizar os elementos da UI com os dados processados.
 */
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

/**
 * Função principal para carregar os dados do CSV e criar os gráficos.
 */
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
            <td>${rowData.Adolescentes || '0'}</td>
            <td>${rowData.Indigenas || '0'}</td>
            <td>${rowData.Quilombolas || '0'}</td>
            <td>${rowData.Ciganos || '0'}</td>
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
                UF: columns[0] || '',
                Municipio: columns[1] || '',
                Indigenas: columns[2] || '0',
                Quilombolas: columns[3] || '0',
                Ciganos: columns[4] || '0',
                Adolescentes: columns[5] || '0',
                Status: columns[6] || ''
            };
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


// --- FIM: NOVAS FUNÇÕES ---


// Aguarda o carregamento completo do DOM para executar o código
document.addEventListener("DOMContentLoaded", () => {
  // Chama a função principal que carrega os dados e cria os gráficos
  loadCSVDataAndCreateCharts();
  // CHAMA A NOVA FUNÇÃO PARA CARREGAR OS DADOS DA TABELA
  loadAdolescentesTableData();
});
