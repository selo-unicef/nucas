const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPqiRFxht-An0D4qkvXOddlecVuv0LIE1gOEEq93MBwYuFgtaa3pfrvg67s0ZhXsEpvMxgaMz77zUn/pub?gid=1024027397&single=true&output=csv";

// Variável global para armazenar os dados processados (resumos)
const DADOS_PROCESSADOS = {
  totalMembros: 0,
  nucaStatus: {},
  generoContagens: {},
};

// NOVO: Variável global para armazenar a contagem de NUCAs criados por UF
const NUCA_COUNT_BY_UF = {};

// Variável global para armazenar os dados detalhados por município
const DADOS_DETALHADOS_POR_MUNICIPIO = {};

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

    // Remove a classe de pulso (loading)
    document.querySelector(".nucas-number").classList.remove("animate-pulse");
    document.querySelector(".members-number").classList.remove("animate-pulse");

    // 6. Geração dos Gráficos com Chart.js
    // ... (Lógica de criação de gráficos de rosca - Donut Charts) ...
    const nucaStatusLabels = Object.keys(DADOS_PROCESSADOS.nucaStatus);
    const nucaStatusData = Object.values(DADOS_PROCESSADOS.nucaStatus);
    const nucaStatusColors = [
      "#178076", // Teal Escuro para '✅ NUCA criado'
      "#D3A80A", // Amarelo Dourado para '❌ Membros insuficientes'
      "#ABE1FA", // Ciano Claro para '⚠️ Não atende aos critérios'
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
    await carregarMapa(NUCA_COUNT_BY_UF);
    createBarChart(NUCA_COUNT_BY_UF);

  } catch (error) {
    console.error("Falha ao processar os dados:", error);
    // Exibe mensagem de erro na interface
    document.querySelector(".nucas-number").textContent = "Erro";
    document.querySelector(".members-number").textContent = "Erro";

    // Remove a classe de pulso (loading)
    document.querySelector(".nucas-number").classList.remove("animate-pulse");
    document.querySelector(".members-number").classList.remove("animate-pulse");
  }
}

// Inicializa o carregamento dos dados e gráficos
window.onload = loadAndProcessData;


// --- FUNÇÕES DO MAPA E GRÁFICO DE BARRAS ---

/**
 * Retorna uma cor em RGB baseada na posição do valor em um gradiente entre min e max.
 * @param {number} value - O valor atual.
 * @param {number} min - O valor mínimo do intervalo.
 * @param {number} max - O valor máximo do intervalo.
 * @returns {string} Cor em formato rgb().
 */
function getColorForValue(value, min, max) {
    // Gradiente: de claro (#ABE1FA) a escuro (#178076)
    const colorMin = [171, 225, 250]; 
    const colorMax = [23, 128, 118]; 

    if (max <= min) {
        // Retorna uma cor intermediária se não houver variação
        return `rgb(${Math.round((colorMin[0] + colorMax[0]) / 2)}, 
                    ${Math.round((colorMin[1] + colorMax[1]) / 2)}, 
                    ${Math.round((colorMin[2] + colorMax[2]) / 2)})`;
    }

    const ratio = (value - min) / (max - min);

    const r = Math.round(colorMin[0] + ratio * (colorMax[0] - colorMin[0]));
    const g = Math.round(colorMin[1] + ratio * (colorMax[1] - colorMin[1]));
    const b = Math.round(colorMin[2] + ratio * (colorMax[2] - colorMin[2]));

    return `rgb(${r},${g},${b})`;
}

/**
 * Pinta o mapa SVG com base na contagem de NUCAs por UF.
 * @param {SVGElement} svgElement - O elemento <svg> do mapa.
 * @param {Object<string, number>} nucaDataByUF - Objeto com {UF: contagem}.
 */
function renderMap(svgElement, nucaDataByUF) {
    const counts = Object.values(nucaDataByUF);
    
    // Se não houver dados, pinta tudo de uma cor base
    if (counts.length === 0 || counts.every(c => c === 0)) {
        svgElement.querySelectorAll('path[id^="BR"]').forEach(path => {
            path.style.fill = '#F3F3E6'; // Cor de fundo claro (var(--bg-container-light))
            path.setAttribute('title', `${path.getAttribute('name')} (UF): 0 NUCAs Criados`);
        });
        return;
    }

    // Calcula min e max, ignorando zeros para estados sem NUCAs para melhor contraste
    const nonZeroCounts = counts.filter(c => c > 0);
    const maxCount = nonZeroCounts.length > 0 ? Math.max(...nonZeroCounts) : 0;
    const minCount = nonZeroCounts.length > 0 ? Math.min(...nonZeroCounts) : 0;
    
    // Define um valor mínimo efetivo para evitar que todos os estados com 1 NUCA recebam a cor mais clara
    const effectiveMin = (maxCount === minCount && maxCount > 0) ? 0 : minCount;


    // Itera sobre todos os 'path' que representam estados (começam com BR)
    svgElement.querySelectorAll('path[id^="BR"]').forEach(path => {
        // ID do estado no formato BRXX, ex: BRAL, BRSP
        const svgId = path.id; 
        // Extrai a UF (XX)
        const uf = svgId.substring(2); 

        const nucaCount = nucaDataByUF[uf] || 0;
        
        let color;
        if (nucaCount === 0) {
            // Cor para estados sem NUCAs criados (cinza muito claro)
            color = '#EFEFEF'; 
        } else {
            // Define a cor usando o gradiente
            color = getColorForValue(nucaCount, effectiveMin, maxCount);
        }

        // Aplica a cor
        path.style.fill = color;
        
        // Adiciona um tooltip (title) para aparecer ao passar o mouse
        path.setAttribute('title', `${path.getAttribute('name')} (${uf}): ${nucaCount.toLocaleString('pt-BR')} NUCAs Criados`);
    });
}


/**
 * Carrega o SVG do mapa e o renderiza com os dados de NUCAs por UF.
 * @param {Object<string, number>} nucaDataByUF - Objeto com {UF: contagem}.
 */
async function carregarMapa(nucaDataByUF) {
    const mapContainer = document.getElementById('mapaBrasilContainer');
    if (!mapContainer) return;

    // Remove a tag <img> placeholder se estiver presente
    const placeholderImg = mapContainer.querySelector('img');
    if (placeholderImg) {
        placeholderImg.remove();
    }

    try {
        // Tenta carregar o arquivo SVG
        // Assumindo que o caminho é correto baseado no HTML original
        const response = await fetch('./imagens/map_brazil.svg'); 
        if (!response.ok) {
            // Em caso de falha, exibe uma mensagem no container
            mapContainer.innerHTML = '<p style="text-align:center; color:red; font-weight: bold;">Erro ao carregar o mapa SVG.</p>';
            throw new Error("Erro ao carregar o mapa SVG. Verifique o caminho 'imagens/map_brazil.svg'.");
        }

        const svgText = await response.text();

        // Injeta o conteúdo SVG no container
        mapContainer.innerHTML = svgText;

        // O primeiro elemento SVG dentro do container é o mapa
        const svgElement = mapContainer.querySelector('svg');
        if (svgElement) {
            // Passa o elemento SVG e os dados para a função de renderização
            renderMap(svgElement, nucaDataByUF);
        } else {
            mapContainer.innerHTML = 'Erro: O arquivo SVG não contém um elemento <svg> válido.';
        }

    } catch (error) {
        console.error('Falha ao carregar ou renderizar o mapa SVG:', error);
    }
}

/**
 * Cria e renderiza o gráfico de barras horizontais.
 * @param {Object<string, number>} nucaDataByUF - Objeto com {UF: contagem}.
 */
function createBarChart(nucaDataByUF) {
    const ctx = document.getElementById('nucasBarChart');
    if (!ctx) return;

    // Converte o objeto de contagens em um array de objetos para fácil ordenação
    let dataArray = Object.keys(nucaDataByUF).map(uf => ({
        uf: uf,
        count: nucaDataByUF[uf]
    }));
    
    // Filtra para manter apenas as UFs com NUCAs criados para o gráfico
    dataArray = dataArray.filter(item => item.count > 0);

    // Ordena do maior para o menor
    dataArray.sort((a, b) => b.count - a.count);

    const labels = dataArray.map(item => item.uf);
    const data = dataArray.map(item => item.count);
    
    // Cor do tema (Azul escuro)
    const backgroundColor = "#005586"; 
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'NUCAs Criados',
                data: data,
                backgroundColor: backgroundColor,
                borderColor: '#003350', 
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            indexAxis: 'y', // Gráfico de barras horizontal
            layout: {
                padding: {
                    left: 0,
                    right: 25 // Espaço extra para o datalabel
                }
            },
            plugins: {
                legend: {
                    display: false
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
                    align: 'end',
                    anchor: 'end',
                    color: '#3E3E3E',
                    formatter: (value) => value.toLocaleString('pt-BR'),
                    font: {
                        weight: 'bold'
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Contagem de NUCAs'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('pt-BR');
                        }
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}
