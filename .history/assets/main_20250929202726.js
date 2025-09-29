const styles = `
/*
 * ESTILOS CSS ADICIONADOS PARA CONTROLAR O TAMANHO DO CANVAS DO CHART.JS
 * Isso evita que o gráfico "estoure" o container ou cresça infinitamente.
 */
.graphics-pizza {
    display: flex;
    justify-content: space-around;
    align-items: flex-start;
    padding: 20px;
    gap: 20px;
    height: 100%; /* Garante que o container principal ocupe o espaço disponível */
    box-sizing: border-box;
}

.graphics-pizza > div {
    flex: 1; /* Distribui o espaço igualmente */
    max-width: 50%; /* Limita a largura máxima */
    height: 100%;
    /* Define uma altura máxima explícita para o contêiner do canvas */
    max-height: 400px; 
    display: flex;
    flex-direction: column;
    align-items: center;
}

.graphics-pizza canvas {
    /* Ocupa a largura do seu contêiner e a altura é gerenciada pelo max-height da div pai */
    width: 100% !important; 
    height: auto !important;
}

.chart-title {
    margin-bottom: 15px;
    font-size: 1.1rem;
    color: var(--font-color, #3E3E3E);
    text-align: center;
}
`;

// Injeta os estilos no cabeçalho do documento para garantir o layout correto
function injectStyles() {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
}
injectStyles();


// URL do CSV extraído da planilha do Google Sheets (PE, PB e AL)
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQgdVEXfEdmf6_S-HREgfIyhrFulhEsDs_Dz0C_SQDizqbSzGuWlkdlAvLyVcUlUc4zzDKmRUPVSD33/pub?gid=1024027397&single=true&output=csv';

/**
 * Função para criar um gráfico de rosca (Doughnut Chart)
 * @param {string} canvasId - O ID do elemento canvas.
 * @param {string[]} labels - Rótulos para cada fatia do gráfico.
 * @param {number[]} data - Valores numéricos para cada fatia.
 * @param {string[]} colors - Cores de fundo para cada fatia.
 * @param {object} customCenterText - Objeto contendo { total: number, label: string } para o texto central.
 * @param {object} plugins - Array de plugins Chart.js adicionais.
 */
function createDoughnutChart(canvasId, labels, data, colors, customCenterText, plugins = []) {
    const ctx = document.getElementById(canvasId);

    if (!ctx) {
        console.error(`Canvas com ID '${canvasId}' não encontrado.`);
        return;
    }

    // Configurações básicas para o gráfico de rosca
    const chartConfig = {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                hoverOffset: 4,
                borderWidth: 0 // Remove bordas brancas entre as fatias
            }]
        },
        options: {
            responsive: true,
            // A chave aqui é garantir que o Chart.js NÃO use as dimensões default do HTML
            // Ele usará o tamanho do contêiner definido pelo CSS.
            maintainAspectRatio: false, 
            plugins: {
                legend: {
                    position: 'bottom', // Move a legenda para baixo
                    labels: {
                        color: '#3E3E3E', // Cor do texto da legenda (variável --font-color)
                        font: {
                            family: 'Inter, sans-serif'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            // Formata o valor com separador de milhar
                            const value = context.parsed.toLocaleString('pt-BR');
                            label += value;
                            return label;
                        }
                    }
                },
                // Adiciona o objeto customizado de texto central aos options.
                // Isso será lido pelo plugin `doughnutCenterText`.
                centerText: customCenterText 
            }
        },
        plugins: plugins // Adiciona plugins customizados
    };
    
    // Cria e renderiza o gráfico
    new Chart(ctx, chartConfig);
}

/**
 * Função principal para buscar e processar os dados do CSV.
 */
async function loadAndProcessData() {
    try {
        // ----------------------------------------------------
        // 1. Definição do Plugin para Texto Central (Total)
        // ----------------------------------------------------
        const doughnutCenterText = {
            id: 'doughnutCenterText',
            beforeDraw(chart) {
                const { ctx, width, height } = chart;
                const centerText = chart.options.plugins.centerText;

                if (!centerText || !centerText.total) return;

                const text = centerText.total.toLocaleString('pt-BR');
                const label = centerText.label;
                const centerX = width / 2;
                const centerY = height / 2;

                ctx.restore();
                
                // --- Desenhar o Valor Total ---
                const fontSizeTotal = (Math.min(height, width) / 100).toFixed(2);
                ctx.font = `bold ${fontSizeTotal}em Inter, sans-serif`;
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#3E3E3E'; // Cor da fonte
                
                // Centraliza o texto na horizontal
                const textMetricsTotal = ctx.measureText(text);
                const textXTotal = centerX - textMetricsTotal.width / 2;
                // Move ligeiramente acima do centro para dar espaço ao rótulo
                const textYTotal = centerY - 15; 
                ctx.fillText(text, textXTotal, textYTotal);

                // --- Desenhar o Rótulo (Label) ---
                const fontSizeLabel = (Math.min(height, width) / 150).toFixed(2);
                ctx.font = `${fontSizeLabel}em Inter, sans-serif`;
                ctx.fillStyle = '#666666'; // Cor da fonte secundária
                
                // Centraliza o texto na horizontal
                const textMetricsLabel = ctx.measureText(label);
                const textXLabel = centerX - textMetricsLabel.width / 2;
                // Posiciona abaixo do valor total
                const textYLabel = centerY + 10; 
                ctx.fillText(label, textXLabel, textYLabel);

                ctx.save();
            }
        };

        // ----------------------------------------------------
        // 2. Fetch e Processamento do CSV
        // ----------------------------------------------------
        const response = await fetch(CSV_URL);
        if (!response.ok) {
            throw new Error(`Erro ao buscar dados: ${response.statusText}`);
        }
        const csvText = await response.text();

        // Processamento do CSV
        const rows = csvText.split(/\r?\n/);
        
        // Define as variáveis de totalização
        let totalMembers = 0;
        let totalNucasCount = 0; // Total de municípios na base (para o gráfico de status)
        const nucaStatusCounts = {
            '✅ NUCA criado': 0,
            '⚠️ Não atende aos critérios': 0,
            '❌ Membros insuficientes': 0,
        };
        const genderCounts = {
            'Feminino': 0,
            'Masculino': 0,
            'Não binário': 0,
        };

        // Itera pelas linhas a partir da 3ª linha (índice 2), ignorando os cabeçalhos e resumos estaduais
        for (let i = 2; i < rows.length; i++) {
            const row = rows[i].trim();
            if (!row) continue; // Ignora linhas vazias

            // O separador é vírgula, e o Google Sheets CSV geralmente é bem formatado.
            const columns = row.split(',');
            
            // Verifica se a linha é uma linha de dados de município (não um resumo estadual)
            // A coluna "NUCA criado?" (índice 6) deve ser uma das três categorias de status
            const status = columns[6];

            if (columns.length >= 7 && status !== '---' && status !== undefined) {
                // Colunas: [0] UF, [1] Município, [2] Feminino, [3] Masculino, [4] Não binário, [5] Total membros, [6] NUCA criado?
                
                // Conversão de números (usamos parseInt para garantir que são números)
                const total = parseInt(columns[5], 10) || 0;
                const feminino = parseInt(columns[2], 10) || 0;
                const masculino = parseInt(columns[3], 10) || 0;
                const naoBinario = parseInt(columns[4], 10) || 0;

                // 3. Cálculo dos Totais
                totalMembers += total;
                totalNucasCount++; // Contamos o município para o total do gráfico de status
                
                // Contagem de Status do NUCA (apenas para municípios)
                if (status in nucaStatusCounts) {
                    nucaStatusCounts[status]++;
                }

                // Contagem de Gênero (somamos todos os membros)
                genderCounts['Feminino'] += feminino;
                genderCounts['Masculino'] += masculino;
                genderCounts['Não binário'] += naoBinario;
            }
        }

        // Calcula o total de NUCAs criados (apenas os com status '✅ NUCA criado')
        const totalNucasCriados = nucaStatusCounts['✅ NUCA criado'];

        // 4. Atualização dos Valores no HTML
        document.querySelector('.nucas-number').textContent = totalNucasCriados.toLocaleString('pt-BR');
        // Formata o número de membros com separador de milhar
        document.querySelector('.members-number').textContent = totalMembers.toLocaleString('pt-BR');

        // 5. Geração dos Gráficos com Chart.js

        // --- Gráfico de Status do NUCA ---
        const nucaStatusLabels = Object.keys(nucaStatusCounts);
        const nucaStatusData = Object.values(nucaStatusCounts);
        const nucaStatusColors = [
            '#4CAF50', // Verde para '✅ NUCA criado'
            '#FFC107', // Amarelo/Laranja para '⚠️ Não atende aos critérios'
            '#F44336', // Vermelho para '❌ Membros insuficientes'
        ];

        createDoughnutChart(
            'nucasChart', 
            nucaStatusLabels, 
            nucaStatusData, 
            nucaStatusColors,
            // Texto central: Total de municípios
            { total: totalNucasCount, label: 'Municípios' }, 
            [doughnutCenterText]
        );

        // --- Gráfico de Gênero ---
        const genderLabels = Object.keys(genderCounts);
        const genderData = Object.values(genderCounts);
        const genderColors = [
            '#E91E63', // Rosa para 'Feminino'
            '#2196F3', // Azul para 'Masculino'
            '#00BCD4', // Ciano para 'Não binário'
        ];

        // Filtra para remover a categoria 'Não binário' se o total for 0, para não aparecer no gráfico
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
            'generoChart', 
            filteredGenderLabels, 
            filteredGenderData, 
            filteredGenderColors,
            // Texto central: Total de membros
            { total: totalMembers, label: 'Membros' },
            [doughnutCenterText]
        );

    } catch (error) {
        console.error('Falha ao processar os dados:', error);
        // Exibe mensagem de erro na interface
        document.querySelector('.nucas-number').textContent = 'Erro';
        document.querySelector('.members-number').textContent = 'Erro';
    }
}

// Inicializa o carregamento dos dados e gráficos
window.onload = loadAndProcessData;
