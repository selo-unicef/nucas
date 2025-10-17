const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPqiRFxht-An0D4qkvXOddlecVuv0LIE1gOEEq93MBwYuFgtaa3pfrvg67s0ZhXsEpvMxgaMz77zUn/pub?gid=1024027397&single=true&output=csv";

// Variável global para armazenar os dados processados (resumos)
const DADOS_PROCESSADOS = {
  totalMembros: 0,
  nucaStatus: {},
  generoContagens: {},
};

let larguraTela = window.innerWidth;

const NUCA_COUNT_BY_UF = {};
const DADOS_DETALHADOS_POR_MUNICIPIO = {};

// IMPORTANTE: Substitua pelo seu token real do Mapbox
const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1IjoibHVjYXN0aGF5bmFuLWVzdGFkYW8iLCJhIjoiY2xnM3N1amQzMGlqeDNrbWdla3doY2o2dCJ9.OXh3OY3_HFqAiF-zzZ6SDQ";

// Caminho para o arquivo GeoJSON com os limites dos estados
const BRAZIL_STATES_GEOJSON_URL = "./data/brazil_states.geojson";

/**
 * Função para criar um gráfico de rosca (Doughnut Chart)
 */
function createDoughnutChart(canvasId, labels, data, colors) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) {
    console.error(`Canvas com ID '${canvasId}' não encontrado.`);
    return;
  }

  const container = ctx.closest("div");
  const size = Math.min(container.clientWidth, container.clientHeight);
  ctx.width = size;
  ctx.height = size;

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

/**
 * Função principal para buscar, processar e exibir os dados do CSV.
 */
async function loadAndProcessData() {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`Erro ao buscar dados: ${response.statusText}`);
    }
    const csvText = await response.text();
    const rows = csvText.split(/\r?\n/);

    let totalMembers = 0;
    const nucaStatusCounts = {
      "✅ NUCA criado": 0,
      "⚠️ Não atende aos critérios": 0,
      "❌ Membros insuficientes": 0,
    };
    const genderCounts = { Feminino: 0, Masculino: 0, "Não binário": 0 };

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i].trim();
      if (!row) continue;

      const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      const status = columns[6] ? columns[6].trim().replace(/"/g, "") : undefined;

      if (columns.length >= 7 && status && status !== "---") {
        const uf = columns[0].trim().replace(/"/g, "");
        const municipio = columns[1].trim().replace(/"/g, "");
        const total = parseInt(columns[5].replace(/"/g, ""), 10) || 0;
        const feminino = parseInt(columns[2].replace(/"/g, ""), 10) || 0;
        const masculino = parseInt(columns[3].replace(/"/g, ""), 10) || 0;
        const naoBinario = parseInt(columns[4].replace(/"/g, ""), 10) || 0;

        totalMembers += total;

        if (status in nucaStatusCounts) {
          nucaStatusCounts[status]++;
        }

        genderCounts["Feminino"] += feminino;
        genderCounts["Masculino"] += masculino;
        genderCounts["Não binário"] += naoBinario;

        if (status === "✅ NUCA criado") {
          NUCA_COUNT_BY_UF[uf] = (NUCA_COUNT_BY_UF[uf] || 0) + 1;
        }

        DADOS_DETALHADOS_POR_MUNICIPIO[municipio] = {
          uf, municipio, feminino, masculino, naoBinario, total, status,
        };
      }
    }

    DADOS_PROCESSADOS.totalMembros = totalMembers;
    DADOS_PROCESSADOS.nucaStatus = nucaStatusCounts;
    DADOS_PROCESSADOS.generoContagens = genderCounts;

    const totalNucasCriados = DADOS_PROCESSADOS.nucaStatus["✅ NUCA criado"] || 0;
    document.querySelector(".nucas-number").textContent = totalNucasCriados.toLocaleString("pt-BR");
    document.querySelector(".members-number").textContent = DADOS_PROCESSADOS.totalMembros.toLocaleString("pt-BR");

    createDoughnutChart("nucasChart", Object.keys(DADOS_PROCESSADOS.nucaStatus), Object.values(DADOS_PROCESSADOS.nucaStatus), ["#178076", "#D3A80A", "#E1A38E"]);

    const genderLabels = Object.keys(DADOS_PROCESSADOS.generoContagens);
    const genderData = Object.values(DADOS_PROCESSADOS.generoContagens);
    const genderColors = ["#E1A38E", "#BCD876", "#958C80"];
    const filteredGenderLabels = [], filteredGenderData = [], filteredGenderColors = [];
    genderLabels.forEach((label, index) => {
      if (genderData[index] > 0) {
        filteredGenderLabels.push(label);
        filteredGenderData.push(genderData[index]);
        filteredGenderColors.push(genderColors[index]);
      }
    });
    createDoughnutChart("generoChart", filteredGenderLabels, filteredGenderData, filteredGenderColors);

    carregarMapbox(NUCA_COUNT_BY_UF);
    createBarChart(NUCA_COUNT_BY_UF);
  } catch (error) {
    console.error("Falha ao processar os dados:", error);
    document.querySelector(".nucas-number").textContent = "Erro";
    document.querySelector(".members-number").textContent = "Erro";
  }
}

window.onload = loadAndProcessData;

/**
 * Carrega e pinta o mapa do Brasil com Mapbox GL JS.
 */
function carregarMapbox(nucaDataByUF) {
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

  const counts = Object.values(nucaDataByUF).filter((c) => c > 0);
  const minCount = counts.length > 0 ? Math.min(...counts) : 0;
  const maxCount = counts.length > 0 ? Math.max(...counts) : 1;

  const colorStops = [0, "#D5EFF8", minCount, "#75B4CC", (maxCount + minCount) / 2, "#48849E", maxCount, "#005586"];

  const caseStatements = ["case"];
  for (const ufCode in nucaDataByUF) {
    // CORREÇÃO: A propriedade no GeoJSON que corresponde à sigla do estado é "SIGLA".
    caseStatements.push(["==", ["get", "SIGLA"], ufCode]);
    caseStatements.push(nucaDataByUF[ufCode]);
  }
  caseStatements.push(0);

  const fillStyle = ["step", caseStatements, ...colorStops];

  const map = new mapboxgl.Map({
    container: "mapbox-map",
    style: {
      version: 8,
      name: "White Canvas",
      sources: {},
      layers: [{ id: "background", type: "background", paint: { "background-color": "#F3F3E6" } }],
    },
    center: [-54.17, -15.45],
    zoom: 3.2,
    minZoom: 1,
    projection: "mercator",
  });

  if (larguraTela <= 600) {
    map.scrollZoom.disable();
    map.dragPan.disable();
  }

  map.on("load", async () => {
    try {
      const response = await fetch(BRAZIL_STATES_GEOJSON_URL);
      if (!response.ok) throw new Error("Falha ao carregar GeoJSON dos estados.");
      const geojsonData = await response.json();
      
      map.addSource("brazil-states", { type: "geojson", data: geojsonData });

      map.addLayer({
        id: "states-fill",
        type: "fill",
        source: "brazil-states",
        paint: {
          // CORREÇÃO: Usar a variável `fillStyle` para a cor, em vez de um valor fixo.
          "fill-color": fillStyle,
          "fill-opacity": 0.85,
        },
      });

      map.addLayer({
        id: "states-border",
        type: "line",
        source: "brazil-states",
        paint: {
          "line-color": "#FFFFFF",
          "line-width": 1.5,
        },
      });

      const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, anchor: "top" });

      map.on("mousemove", "states-fill", (e) => {
        if (e.features.length > 0) {
          const feature = e.features[0];
          // CORREÇÃO: As propriedades no GeoJSON são "SIGLA" e "Estado".
          const ufCode = feature.properties.SIGLA;
          const ufName = feature.properties.Estado;
          const count = nucaDataByUF[ufCode] || 0;

          map.getCanvas().style.cursor = "pointer";
          popup
            .setLngLat(e.lngLat)
            .setHTML(`<div style="font-family: Inter, sans-serif; color: #3E3E3E; padding: 4px;">
                        <strong>${ufName} (${ufCode})</strong><br>
                        NUCAs criados: ${count.toLocaleString("pt-BR")}
                      </div>`)
            .addTo(map);
        }
      });

      map.on("mouseleave", "states-fill", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

    } catch (e) {
      console.error("Erro ao buscar o GeoJSON dos estados:", e);
      document.getElementById("mapbox-map").innerHTML = `<div style="padding: 20px; text-align: center; color: #cc0000;">ERRO: Não foi possível carregar as fronteiras dos estados.</div>`;
    }
  });
}

/**
 * Cria o gráfico de barras horizontal por UF.
 */
function createBarChart(nucaDataByUF) {
  const ctx = document.getElementById("nucasBarChart");
  if (!ctx) return;

  let dataArray = Object.keys(nucaDataByUF).map((uf) => ({ uf, count: nucaDataByUF[uf] }));
  dataArray = dataArray.filter((item) => item.count > 0);
  dataArray.sort((a, b) => b.count - a.count);

  const labels = dataArray.map((item) => item.uf);
  const data = dataArray.map((item) => item.count);

  if (Chart.getChart(ctx)) {
    Chart.getChart(ctx).destroy();
  }

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "NUCAs Criados",
        data: data,
        backgroundColor: "#005586",
        borderColor: "#003350",
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      layout: { padding: { right: 25 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `NUCAs Criados: ${context.parsed.x.toLocaleString("pt-BR")}`,
          },
        },
        datalabels: {
          display: true,
          align: "end",
          anchor: "end",
          color: "#3E3E3E",
          formatter: (value) => value.toLocaleString("pt-BR"),
          font: { weight: "bold" },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          title: { display: true, text: "Contagem de NUCAs" },
          ticks: { callback: (value) => value.toLocaleString("pt-BR") },
          grid: { display: false },
        },
        y: { grid: { display: false } },
      },
    },
    plugins: [ChartDataLabels],
  });
}
