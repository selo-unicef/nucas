// URL do CSV
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTPqiRFxht-An0D4qkvXOddlecVuv0LIE1gOEEq93MBwYuFgtaa3pfrvg67s0ZhXsEpvMxgaMz77zUn/pub?gid=1024027397&single=true&output=csv';

// Dicionário onde os dados serão salvos
const municipiosData = {}; 

async function loadAndProcessData() {
    try {
        const response = await fetch(CSV_URL);
        if (!response.ok) throw new Error(`Erro ao buscar dados: ${response.statusText}`);
        const csvText = await response.text();

        const rows = csvText.split(/\r?\n/);

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

        // Loop principal
        for (let i = 2; i < rows.length; i++) {
            const row = rows[i].trim();
            if (!row) continue;

            const columns = row.split(',');

            const status = columns[6];
            if (columns.length >= 7 && status !== '---' && status !== undefined) {
                const uf = columns[0].trim();
                const municipio = columns[1].trim();
                const feminino = parseInt(columns[2], 10) || 0;
                const masculino = parseInt(columns[3], 10) || 0;
                const naoBinario = parseInt(columns[4], 10) || 0;
                const total = parseInt(columns[5], 10) || 0;

                // 👉 Adiciona ao dicionário
                municipiosData[municipio] = {
                    uf,
                    municipio,
                    feminino,
                    masculino,
                    naoBinario,
                    total,
                    status
                };

                // Totais gerais
                totalMembers += total;
                if (status in nucaStatusCounts) nucaStatusCounts[status]++;
                genderCounts['Feminino'] += feminino;
                genderCounts['Masculino'] += masculino;
                genderCounts['Não binário'] += naoBinario;
            }
        }

        const totalNucasCriados = nucaStatusCounts['✅ NUCA criado'];

        document.querySelector('.nucas-number').textContent = totalNucasCriados.toLocaleString('pt-BR');
        document.querySelector('.members-number').textContent = totalMembers.toLocaleString('pt-BR');

        // --- Gráfico de NUCA ---
        const nucaStatusLabels = Object.keys(nucaStatusCounts);
        const nucaStatusData = Object.values(nucaStatusCounts);
        const nucaStatusColors = ['#178076', '#ABE1FA', '#D3A80A'];
        createDoughnutChart('nucasChart', nucaStatusLabels, nucaStatusData, nucaStatusColors);

        // --- Gráfico de Gênero ---
        const genderLabels = Object.keys(genderCounts);
        const genderData = Object.values(genderCounts);
        const genderColors = ['#E1A38E', '#BCD876', '#958C80'];

        const filteredLabels = [];
        const filteredData = [];
        const filteredColors = [];

        genderLabels.forEach((label, i) => {
            if (genderData[i] > 0) {
                filteredLabels.push(label);
                filteredData.push(genderData[i]);
                filteredColors.push(genderColors[i]);
            }
        });

        createDoughnutChart('generoChart', filteredLabels, filteredData, filteredColors);

        // 👉 Mostra o dicionário no console
        console.log('Dicionário de municípios:', municipiosData);

    } catch (error) {
        console.error('Falha ao processar os dados:', error);
        document.querySelector('.nucas-number').textContent = 'Erro';
        document.querySelector('.members-number').textContent = 'Erro';
    }
}

window.onload = loadAndProcessData;
