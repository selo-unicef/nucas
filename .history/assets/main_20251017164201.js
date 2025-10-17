// URL do CSV extraído da planilha do Google Sheets (PE, PB e AL)
        const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTPqiRFxht-An0D4qkvXOddlecVuv0LIE1gOEEq93MBwYuFgtaa3pfrvg67s0ZhXsEpvMxgaMz77zUn/pub?gid=1024027397&single=true&output=csv';

        // Variável global para armazenar os dados processados (resumos)
        // ESSA É A VARIÁVEL SOLICITADA PELO USUÁRIO (versão agregada)
        const DADOS_PROCESSADOS = {
            totalMembros: 0,
            nucaStatus: {},
            generoContagens: {}
        };

        // NOVO: Variável global para armazenar a contagem de NUCAs por UF
        const NUCAS_POR_UF = {};

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
            const container = ctx.closest('div');
            // Obtém o tamanho computado para manter a responsividade do layout
            const size = Math.min(container.clientWidth, container.clientHeight);

            // Ajusta o canvas para o tamanho do contêiner para que o devicePixelRatio funcione
            ctx.width = size;
            ctx.height = size;

            // Configurações básicas para o gráfico de rosca
            const chartConfig = {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        hoverOffset: 8, // Aumenta o offset ao passar o mouse
                        borderWidth: 0
                    }]
                },
                options: {
                    // Configurações de alta resolução (devicePixelRatio: 2)
                    responsive: false, 
                    devicePixelRatio: 2, 
                    maintainAspectRatio: true, 
                    
                    plugins: {
                        legend: {
                            position: 'bottom', 
                            labels: {
                                color: '#3E3E3E', 
                                font: {
                                    family: 'Inter',
                                    size: 14,
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
                        }
                    }
                }
            };
            
            // Cria e renderiza o gráfico
            new Chart(ctx, chartConfig);
        }

        /**
         * NOVO: Função para criar um gráfico de barras (Bar Chart)
         * @param {string} canvasId - O ID do elemento canvas.
         * @param {string[]} labels - Rótulos para as barras (UFs).
         * @param {number[]} data - Valores numéricos para as barras.
         */
        function createBarChart(canvasId, labels, data) {
            const ctx = document.getElementById(canvasId);

            if (!ctx) {
                console.error(`Canvas com ID '${canvasId}' não encontrado.`);
                return;
            }
            
            // Cores gradientes para as barras (usando o tema azul)
            const backgroundColors = data.map((_, index) => {
                return index % 2 === 0 ? '#005586' : '#12699C'; // Azul Escuro e um tom ligeiramente mais claro
            });

            const chartConfig = {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'NUCAs Criados',
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: '#005586',
                        borderWidth: 0,
                        borderRadius: 4,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y', // Tornar o gráfico horizontal
                    scales: {
                        x: {
                            beginAtZero: true,
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#3E3E3E',
                            }
                        },
                        y: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#3E3E3E',
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    const value = context.parsed.x.toLocaleString('pt-BR');
                                    label += value;
                                    return label;
                                }
                            }
                        }
                    }
                }
            };
            
            new Chart(ctx, chartConfig);
        }


        /**
         * NOVO: Função para colorir o mapa SVG baseado na contagem de NUCAs por UF.
         * @param {object} data - Objeto com a contagem de NUCAs por UF (ex: {PE: 20, PB: 15, AL: 10}).
         */
        function renderMap(data) {
            const svgMap = document.getElementById('mapaBrasil');
            if (!svgMap) return;

            // Apenas os UFs que temos dados
            const states = ['PE', 'PB', 'AL'];
            const counts = states.map(uf => data[uf] || 0);
            const maxCount = Math.max(...counts);

            // Função para gerar uma cor entre azul claro e azul escuro (simulação de heatmap)
            // De: #75B4CC (light) para #005586 (dark)
            function interpolateColor(value, max) {
                if (max === 0 || value === 0) return '#D5EFF8'; // Cor muito clara se não houver dados
                const ratio = value / max;
                
                // Interpolação simples do valor (0 a 255) para os canais R, G, B
                const R_start = 117, G_start = 180, B_start = 204;
                const R_end = 0, G_end = 85, B_end = 134;

                const R = Math.round(R_start + (R_end - R_start) * ratio);
                const G = Math.round(G_start + (G_end - G_start) * ratio);
                const B = Math.round(B_start + (B_end - B_start) * ratio);

                return `rgb(${R}, ${G}, ${B})`;
            }

            states.forEach(uf => {
                const path = svgMap.querySelector(`#path-${uf}`);
                const count = data[uf] || 0;

                if (path) {
                    path.style.fill = interpolateColor(count, maxCount);
                    // Adiciona um evento para mostrar o tooltip (simples, no console)
                    path.addEventListener('mouseover', () => console.log(`${uf}: ${count} NUCAs`));
                }
            });
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
                    '✅ NUCA criado': 0,
                    '⚠️ Não atende aos critérios': 0,
                    '❌ Membros insuficientes': 0,
                };
                const genderCounts = {
                    'Feminino': 0,
                    'Masculino': 0,
                    'Não binário': 0,
                };
                // NOVO: Contagem de NUCAs por UF para o novo gráfico/mapa (temp)
                const nucaCountByUf = { 'PE': 0, 'PB': 0, 'AL': 0 };

                // Itera pelas linhas a partir da 3ª linha (índice 2), ignorando os cabeçalhos e resumos estaduais
                for (let i = 2; i < rows.length; i++) {
                    const row = rows[i].trim();
                    if (!row) continue; // Ignora linhas vazias

                    // Usando uma regex simples para tentar lidar melhor com vírgulas dentro de aspas,
                    // mas o split(',') é suficiente para o formato pub?gid=X&output=csv do Google Sheets.
                    const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                    
                    // Verifica se a linha é uma linha de dados de município válida
                    // A coluna "NUCA criado?" (índice 6) deve ter um dos status definidos
                    const status = columns[6] ? columns[6].trim().replace(/"/g, '') : undefined;

                    if (columns.length >= 7 && status && status !== '---') {
                        // Colunas: [0] UF, [1] Município, [2] Feminino, [3] Masculino, [4] Não binário, [5] Total membros, [6] NUCA criado?
                        
                        const uf = columns[0].trim().replace(/"/g, '');
                        const municipio = columns[1].trim().replace(/"/g, '');
                        
                        // Conversão de números (remove aspas e garante que são números)
                        const total = parseInt(columns[5].replace(/"/g, ''), 10) || 0;
                        const feminino = parseInt(columns[2].replace(/"/g, ''), 10) || 0;
                        const masculino = parseInt(columns[3].replace(/"/g, ''), 10) || 0;
                        const naoBinario = parseInt(columns[4].replace(/"/g, ''), 10) || 0;

                        // 3. Cálculo dos Totais Agregados
                        totalMembers += total;
                        
                        // Contagem de Status do NUCA
                        if (status in nucaStatusCounts) {
                            nucaStatusCounts[status]++;
                        }
                        
                        // NOVO: Contagem de NUCAs Criados por UF
                        if (status === '✅ NUCA criado') {
                             if (uf in nucaCountByUf) {
                                nucaCountByUf[uf]++;
                            }
                        }

                        // Contagem de Gênero
                        genderCounts['Feminino'] += feminino;
                        genderCounts['Masculino'] += masculino;
                        genderCounts['Não binário'] += naoBinario;

                        // Armazenamento por município no novo dicionário (mantido)
                        DADOS_DETALHADOS_POR_MUNICIPIO[municipio] = {
                            uf: uf,
                            municipio: municipio,
                            feminino: feminino,
                            masculino: masculino,
                            naoBinario: naoBinario,
                            total: total,
                            status: status
                        };
                    }
                }

                // --- 4. Armazenamento dos dados no dicionário global DADOS_PROCESSADOS / NUCAS_POR_UF ---
                DADOS_PROCESSADOS.totalMembros = totalMembers;
                DADOS_PROCESSADOS.nucaStatus = nucaStatusCounts;
                DADOS_PROCESSADOS.generoContagens = genderCounts;
                // Preenche o novo objeto global NUCAS_POR_UF
                Object.assign(NUCAS_POR_UF, nucaCountByUf);
                // --- Fim do Armazenamento ---

                console.log('Dados Processados armazenados (Agregado):', DADOS_PROCESSADOS);
                console.log('Dados Processados armazenados (Detalhado por Município):', DADOS_DETALHADOS_POR_MUNICIPIO);
                console.log('NUCAS por UF:', NUCAS_POR_UF);

                // 5. Atualização dos Valores no HTML (existente)
                const totalNucasCriados = DADOS_PROCESSADOS.nucaStatus['✅ NUCA criado'] || 0;
                
                document.querySelector('.nucas-number').textContent = totalNucasCriados.toLocaleString('pt-BR');
                document.querySelector('.members-number').textContent = DADOS_PROCESSADOS.totalMembros.toLocaleString('pt-BR');
                
                // Remove a classe de pulso (loading)
                document.querySelector('.nucas-number').classList.remove('animate-pulse');
                document.querySelector('.members-number').classList.remove('animate-pulse');


                // 6. Geração dos Gráficos com Chart.js

                // --- Gráfico de Status do NUCA (existente) ---
                const nucaStatusLabels = Object.keys(DADOS_PROCESSADOS.nucaStatus);
                const nucaStatusData = Object.values(DADOS_PROCESSADOS.nucaStatus);
                const nucaStatusColors = [
                    '#178076', // Teal Escuro para '✅ NUCA criado'
                    '#D3A80A', // Amarelo Dourado para '❌ Membros insuficientes'
                    '#ABE1FA', // Ciano Claro para '⚠️ Não atende aos critérios'
                ];

                createDoughnutChart('nucasChart', nucaStatusLabels, nucaStatusData, nucaStatusColors);

                // --- Gráfico de Gênero (existente) ---
                const genderLabels = Object.keys(DADOS_PROCESSADOS.generoContagens);
                const genderData = Object.values(DADOS_PROCESSADOS.generoContagens);
                const genderColors = [
                    '#E1A38E', // Rosa Suave para 'Feminino'
                    '#BCD876', // Verde Claro/Lima para 'Masculino'
                    '#958C80', // Cinza Quente para 'Não binário'
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

                createDoughnutChart('generoChart', filteredGenderLabels, filteredGenderData, filteredGenderColors);

                // NOVO: --- Gráfico de Barras por UF ---
                const ufLabels = Object.keys(NUCAS_POR_UF);
                const ufData = Object.values(NUCAS_POR_UF);
                createBarChart('nucasBarChart', ufLabels, ufData);

                // NOVO: --- Renderiza o Mapa ---
                renderMap(NUCAS_POR_UF);

            } catch (error) {
                console.error('Falha ao processar os dados:', error);
                // Exibe mensagem de erro na interface
                document.querySelector('.nucas-number').textContent = 'Erro';
                document.querySelector('.members-number').textContent = 'Erro';
                
                // Remove a classe de pulso (loading)
                document.querySelector('.nucas-number').classList.remove('animate-pulse');
                document.querySelector('.members-number').classList.remove('animate-pulse');
            }
        }

        // Inicializa o carregamento dos dados e gráficos
        window.onload = loadAndProcessData;
