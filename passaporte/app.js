const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

let SELOS = [];
let dadosNucaPrazo = [];

async function carregarSelos() {
  const response = await fetch("./data/dados_carimbos.json");

  if (!response.ok) {
    throw new Error("Erro ao carregar selos.json");
  }

  SELOS = await response.json();
}

async function carregarDadosNucaPrazo() {
  const response = await fetch("./data/nucas_criados_prazo.json");

  if (!response.ok) {
    throw new Error("Erro ao carregar nucas_criados_prazo.json");
  }

  dadosNucaPrazo = await response.json();
}

const UF_NAME_TO_SIGLA = {
  ACRE: "AC",
  ALAGOAS: "AL",
  AMAPÁ: "AP",
  AMAZONAS: "AM",
  BAHIA: "BA",
  CEARÁ: "CE",
  "DISTRITO FEDERAL": "DF",
  "ESPÍRITO SANTO": "ES",
  "ESPIRITO SANTO": "ES",
  GOIÁS: "GO",
  GOIAS: "GO",
  MARANHÃO: "MA",
  MARANHAO: "MA",
  "MATO GROSSO": "MT",
  "MATO GROSSO DO SUL": "MS",
  "MINAS GERAIS": "MG",
  PARÁ: "PA",
  PARA: "PA",
  PARAÍBA: "PB",
  PARAIBA: "PB",
  PARANÁ: "PR",
  PARANA: "PR",
  PERNAMBUCO: "PE",
  PIAUÍ: "PI",
  PIAUI: "PI",
  "RIO DE JANEIRO": "RJ",
  "RIO GRANDE DO NORTE": "RN",
  "RIO GRANDE DO SUL": "RS",
  RONDÔNIA: "RO",
  RONDONIA: "RO",
  RORAIMA: "RR",
  "SANTA CATARINA": "SC",
  "SÃO PAULO": "SP",
  "SAO PAULO": "SP",
  SERGIPE: "SE",
  TOCANTINS: "TO",
};

const $ = (id) => document.getElementById(id);

let acoesData = [];
let adolescentesData = [];
let nucasData = [];
let municipiosIndex = [];
let suggestionActiveIndex = -1;
let municipioSelecionado = null;
let toastTimer = null;
let dadosCarregados = false;
let municipiosDatasetMap = new Map();

const MUNICIPIO_TESTE = {
  key: "__municipio_teste__",
  municipio: "Município Teste",
  uf: "Teste",
  sigla: "TT",
  search: "municipio teste teste tt todos os selos",
  isTeste: true,
};

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function limparMunicipio(valor) {
  return String(valor || "")
    .replace(/\s*\/\s*[A-Z]{2}$/i, "")
    .trim();
}

function limparUf(valor) {
  const texto = String(valor || "").trim();
  const match = texto.match(/^(.+?)\s*\(([A-Z]{2})\)$/i);

  return match ? match[1].trim() : texto;
}

function ufSigla(valor) {
  const texto = String(valor || "").trim();
  const match = texto.match(/\(([A-Z]{2})\)$/i);

  if (match) {
    return match[1].toUpperCase();
  }

  if (/^[A-Z]{2}$/i.test(texto)) {
    return texto.toUpperCase();
  }

  return (
    UF_NAME_TO_SIGLA[
      normalizarTexto(limparUf(texto)).toUpperCase()
    ] ||
    UF_NAME_TO_SIGLA[
      limparUf(texto).toUpperCase()
    ] ||
    texto.toUpperCase()
  );
}

function escapeHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeNumber(valor) {
  const n = Number(
    String(valor || "0").replace(",", ".")
  );

  return Number.isFinite(n) ? n : 0;
}

function getAno(row) {
  const anoAcao = Number(
    String(
      row.ano_acao ||
      row.Ano ||
      ""
    ).trim()
  );

  if (anoAcao >= 2020) {
    return anoAcao;
  }

  const texto = `
    ${row.mes_acao || ""}
    ${row.data_hora || ""}
    ${row.descricao || ""}
  `;

  const match = texto.match(/20\d{2}/);

  return match ? Number(match[0]) : 0;
}

function municipioKeyFromValues(municipio, uf) {
  return `${
    normalizarTexto(
      limparMunicipio(municipio)
    )
  }__${
    normalizarTexto(
      limparUf(uf)
    )
  }`;
}

function municipioKey(row) {
  return municipioKeyFromValues(
    row.municipio || row.Municipio,
    row.uf || row.UF,
  );
}

function municipioLabel(item) {
  return `${item.municipio} - ${
    item.sigla || ufSigla(item.uf)
  }`;
}

async function buscarTodosRegistros(
  tabela,
  colunas = "*"
) {
  const pageSize = 1000;

  let from = 0;
  let todos = [];

  while (true) {
    const { data, error } = await supabaseClient
      .from(tabela)
      .select(colunas)
      .range(
        from,
        from + pageSize - 1
      );

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    todos = todos.concat(data);

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return todos;
}

function montarMunicipiosIndex() {
  const mapa = new Map();

  function adicionar(
    municipioOriginal,
    ufOriginal
  ) {
    const municipio = limparMunicipio(
      municipioOriginal
    );

    const uf = limparUf(
      ufOriginal
    );

    if (!municipio || !uf) {
      return;
    }

    const key =
      municipioKeyFromValues(
        municipio,
        uf
      );

    if (!mapa.has(key)) {
      mapa.set(key, {
        key,
        municipio,
        uf,
        sigla: ufSigla(ufOriginal),
        search: normalizarTexto(
          `${municipio} ${uf} ${ufSigla(ufOriginal)}`
        ),
      });
    }
  }

  acoesData.forEach((row) => {
    adicionar(
      row.municipio,
      row.uf
    );
  });

  adolescentesData.forEach((row) => {
    adicionar(
      row.Municipio,
      row.UF
    );
  });

  nucasData.forEach((row) => {
    adicionar(
      row.Municipio ||
        row.municipio,
      row.UF ||
        row.uf
    );
  });

  municipiosIndex =
    [...mapa.values()].sort(
      (a, b) =>
        municipioLabel(a).localeCompare(
          municipioLabel(b),
          "pt-BR"
        )
    );

  municipiosDatasetMap =
    new Map();

  municipiosIndex.forEach(
    (item) => {
      municipiosDatasetMap.set(
        item.key,
        {
          acoes: [],
          adolescentes: [],
          nucas: [],
        }
      );
    }
  );

  acoesData.forEach((row) => {
    const key =
      municipioKey(row);

    if (
      municipiosDatasetMap.has(key)
    ) {
      municipiosDatasetMap
        .get(key)
        .acoes
        .push(row);
    }
  });

  adolescentesData.forEach(
    (row) => {
      const key =
        municipioKey(row);

      if (
        municipiosDatasetMap.has(key)
      ) {
        municipiosDatasetMap
          .get(key)
          .adolescentes
          .push(row);
      }
    }
  );

  nucasData.forEach((row) => {
    const key =
      municipioKey(row);

    if (
      municipiosDatasetMap.has(key)
    ) {
      municipiosDatasetMap
        .get(key)
        .nucas
        .push(row);
    }
  });

  municipiosIndex.unshift(
    MUNICIPIO_TESTE
  );
}

function buscarSugestoes(termo) {
  if (!dadosCarregados) {
    return [];
  }

  const normalizado =
    normalizarTexto(termo);

  if (
    !normalizado ||
    normalizado.length < 2
  ) {
    return [];
  }

  const comecaCom = [];
  const contem = [];

  municipiosIndex.forEach(
    (item) => {
      const municipioNormalizado =
        normalizarTexto(
          item.municipio
        );

      if (
        municipioNormalizado
          .startsWith(
            normalizado
          )
      ) {
        comecaCom.push(item);
      } else if (
        item.search.includes(
          normalizado
        )
      ) {
        contem.push(item);
      }
    }
  );

  return [
    ...comecaCom,
    ...contem
  ].slice(0, 5);
}

function esconderSugestoes() {
  const box =
    $("suggestionsBox");

  box.classList.remove("show");
  box.innerHTML = "";

  suggestionActiveIndex = -1;
}

function renderizarSugestoes(termo) {
  const sugestoes =
    buscarSugestoes(termo);

  const box =
    $("suggestionsBox");

  const normalizado =
    normalizarTexto(termo);

  if (!sugestoes.length) {
    if (normalizado.length >= 2) {
      box.innerHTML = `
        <p class="suggestion-empty">
          Nenhum município encontrado para
          "${escapeHtml(termo)}".
        </p>
      `;

      box.classList.add("show");
    } else {
      esconderSugestoes();
    }

    return;
  }

  box.innerHTML =
    sugestoes
      .map(
        (item, index) => `
          <button
            class="suggestion-item"
            type="button"
            data-index="${index}"
            data-key="${escapeHtml(item.key)}"
          >
            <span>
              ${escapeHtml(item.municipio)}
            </span>

            <small>
              ${escapeHtml(
                item.sigla ||
                item.uf
              )}
            </small>
          </button>
        `
      )
      .join("");

  box.classList.add("show");

  box
    .querySelectorAll(
      ".suggestion-item"
    )
    .forEach((button) => {
      button.addEventListener(
        "mousedown",
        (event) => {
          event.preventDefault();

          const key =
            button.dataset.key;

          const municipio =
            municipiosIndex.find(
              (item) =>
                item.key === key
            );

          if (municipio) {
            selecionarMunicipio(
              municipio
            );
          }
        }
      );
    });
}

function atualizarItemAtivo() {
  const itens = [
    ...$("suggestionsBox")
      .querySelectorAll(
        ".suggestion-item"
      )
  ];

  itens.forEach(
    (item, index) => {
      item.classList.toggle(
        "active",
        index ===
          suggestionActiveIndex
      );
    }
  );
}

function encontrarMunicipioPorKey(
  key
) {
  return (
    municipiosDatasetMap.get(key) || {
      acoes: [],
      adolescentes: [],
      nucas: [],
    }
  );
}

function encontrarMunicipio(busca) {
  const termo =
    normalizarTexto(busca)
      .replace(
        /\s*\([^)]*\)\s*$/,
        ""
      );

  if (!termo) {
    return null;
  }

  const itemExato =
    municipiosIndex.find(
      (item) =>
        normalizarTexto(
          item.municipio
        ) === termo ||
        normalizarTexto(
          municipioLabel(item)
        ) ===
          normalizarTexto(busca)
    );

  if (itemExato) {
    return itemExato;
  }

  return (
    buscarSugestoes(busca)[0] ||
    null
  );
}

function temTemaExato(
  rows,
  tema
) {
  return rows.some(
    (row) =>
      normalizarTexto(
        row.tema
      ) ===
      normalizarTexto(
        tema
      )
  );
}

function temParticipacaoPovos(rows) {
  return rows.some((row) => {
    return (
      safeNumber(row.Indigenas) > 0 ||
      safeNumber(row.IndigenaRaca) > 0 ||
      safeNumber(row.Quilombolas) > 0 ||
      safeNumber(row.Ribeirinhos) > 0 ||
      safeNumber(row.Ciganos) > 0
    );
  });
}

function municipioEstaNaListaNucaPrazo(
  itemMunicipio =
    municipioSelecionado
) {
  if (
    !dadosNucaPrazo.length ||
    !itemMunicipio
  ) {
    return false;
  }

  const municipioBase =
    normalizarTexto(
      itemMunicipio.municipio
    );

  const ufBase =
    itemMunicipio.sigla;

  return dadosNucaPrazo.some(
    (item) => {
      const municipioJson =
        normalizarTexto(
          item["Município"] ||
          item["Municipio"] ||
          item.municipio ||
          ""
        );

      const ufJson =
        ufSigla(
          item.UF ||
          item.uf ||
          ""
        );

      const status =
        normalizarTexto(
          item["NUCA criado?"] ||
          item["NUCA criado"] ||
          item.Status ||
          item.status ||
          ""
        );

      return (
        municipioJson ===
          municipioBase &&
        ufJson ===
          ufBase &&
        status.includes(
          "nuca criado"
        )
      );
    }
  );
}

function calcularSelos(
  dataset,
  itemMunicipio =
    municipioSelecionado
) {
  if (
    itemMunicipio?.isTeste
  ) {
    return [...SELOS];
  }

  return SELOS.filter(
    (selo) => {

      if (
        selo.tipo ===
        "acoes_ate_ano"
      ) {
        return (
          dataset.acoes.filter(
            (row) => {
              const ano =
                getAno(row);

              return (
                ano > 0 &&
                ano <= selo.ano
              );
            }
          ).length >= 3
        );
      }

      if (
        selo.tipo ===
        "acoes_no_ano"
      ) {
        return (
          dataset.acoes.filter(
            (row) => {
              const ano =
                getAno(row);

              return (
                ano === selo.ano
              );
            }
          ).length >= 3
        );
      }

      if (
        selo.tipo ===
        "tema_exato"
      ) {
        return temTemaExato(
          dataset.acoes,
          selo.tema
        );
      }

      if (
        selo.tipo ===
        "detalhes_adolescentes_povos"
      ) {
        return temParticipacaoPovos(
          dataset.adolescentes
        );
      }

      if (
        selo.tipo ===
        "nuca_criado_prazo"
      ) {
        return municipioEstaNaListaNucaPrazo(
          itemMunicipio
        );
      }

      return false;
    }
  );
}

function logEstatisticasSelos() {
  const resultados =
    municipiosIndex
      .filter(
        (item) =>
          !item.isTeste
      )
      .map((item) => {
        const dataset =
          encontrarMunicipioPorKey(
            item.key
          );

        const totalSelos =
          calcularSelos(
            dataset,
            item
          ).length;

        return {
          municipio:
            item.municipio,
          uf:
            item.sigla ||
            item.uf,
          totalSelos,
        };
      });

  if (!resultados.length) {
    console.warn(
      "Não foi possível calcular as estatísticas de selos."
    );

    return;
  }

  const maiorQuantidade =
    Math.max(
      ...resultados.map(
        (item) =>
          item.totalSelos
      )
    );

  const menorQuantidade =
    Math.min(
      ...resultados.map(
        (item) =>
          item.totalSelos
      )
    );

  const municipiosComMaisSelos =
    resultados.filter(
      (item) =>
        item.totalSelos ===
        maiorQuantidade
    );

  const municipiosComMenosSelos =
    resultados.filter(
      (item) =>
        item.totalSelos ===
        menorQuantidade
    );

  console.group(
    "📊 Estatísticas dos passaportes"
  );

  console.log(
    "🏆 Município com mais selos:",
    municipiosComMaisSelos[0]
  );

  console.log(
    "🔻 Município com menos selos:",
    municipiosComMenosSelos[0]
  );

  if (
    municipiosComMaisSelos.length >
    1
  ) {
    console.log(
      `Empate no maior número de selos (${maiorQuantidade}):`,
      municipiosComMaisSelos
    );
  }

  if (
    municipiosComMenosSelos.length >
    1
  ) {
    console.log(
      `Empate no menor número de selos (${menorQuantidade}):`,
      municipiosComMenosSelos
    );
  }

  console.log(
    `Municípios analisados: ${resultados.length}`
  );

  console.groupEnd();
}

function mostrarToast(
  municipio,
  uf
) {
  const toast =
    $("toast");

  $("toastText").textContent =
    `Passaporte gerado para ${municipio} (${uf}).`;

  toast.classList.add("show");

  clearTimeout(
    toastTimer
  );

  toastTimer =
    setTimeout(() => {
      toast.classList.remove(
        "show"
      );
    }, 3600);
}

function setLoading(
  isLoading
) {
  $("loadingOverlay")
    .classList.toggle(
      "show",
      isLoading
    );
}

async function renderizarPassaporte(
  item,
  dataset
) {
  setLoading(true);

  $("previewStatus")
    .textContent =
      "Gerando...";

  await new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        420
      )
  );

  municipioSelecionado = {
    municipio:
      item.municipio,
    uf:
      item.uf,
    sigla:
      item.sigla,
    selos: [],
    totalAcoes:
      dataset.acoes.length,
    isTeste:
      item.isTeste ||
      false,
  };

  const selos =
    calcularSelos(
      dataset,
      item
    );

  municipioSelecionado.selos =
    selos;

  $("municipioTitulo")
    .textContent =
      `${item.municipio} (${
        item.sigla ||
        item.uf
      })`;

  $("resumoMunicipio")
    .textContent =
      `${dataset.acoes.length} ação(ões) encontradas · ${selos.length} selo(s) no passaporte`;

  const selosContainer =
    $("selosContainer");

  selosContainer.className =
    "selos-container";

  if (!selos.length) {
    selosContainer.innerHTML = `
      <p class="empty-stamps">
        Nenhum selo automático encontrado para este município.
      </p>
    `;
  } else {
    const quantidadeSelos =
      Math.min(
        selos.length,
        16
      );

    selosContainer
      .classList.add(
        "has-stamps",
        `stamps-${quantidadeSelos}`
      );

    const rotacoes = [
      -8, 7, -4, 5,
      -7, 3, 8, -5,
      4, -3, 6, -6,
      2, -2, 9, -9
    ];

    selosContainer.innerHTML =
      selos
        .slice(0, 16)
        .map(
          (selo, index) => {
            const rot =
              rotacoes[
                index %
                rotacoes.length
              ];

            return `
              <img
                class="selo-img"
                style="--rot:${rot}deg"
                src="assets/selos/${selo.imagem}"
                alt="${escapeHtml(selo.selo)}"
                title="${escapeHtml(selo.selo)}"
              />
            `;
          }
        )
        .join("");
  }

  $("btnPng").disabled =
    false;

  $("btnPdf").disabled =
    false;

  $("statusMessage")
    .className =
      "status-message ok";

  $("statusMessage")
    .textContent =
      `Passaporte gerado para ${item.municipio} (${item.sigla || item.uf}).`;

  $("previewStatus")
    .textContent =
      `${selos.length} selo(s)`;

  setLoading(false);

  mostrarToast(
    item.municipio,
    item.sigla ||
      item.uf
  );
}

function selecionarMunicipio(
  item
) {
  if (!dadosCarregados) {
    return;
  }

  $("municipioSearch")
    .value =
      municipioLabel(item);

  esconderSugestoes();

  const dataset =
    encontrarMunicipioPorKey(
      item.key
    );

  renderizarPassaporte(
    item,
    dataset
  );
}

function buscarMunicipio() {
  if (!dadosCarregados) {
    return;
  }

  const item =
    encontrarMunicipio(
      $("municipioSearch")
        .value
    );

  if (!item) {
    $("statusMessage")
      .className =
        "status-message erro";

    $("statusMessage")
      .textContent =
        "Município não encontrado. Tente conferir acentos, UF ou parte do nome.";

    return;
  }

  selecionarMunicipio(item);
}

function aguardarImagens(
  container =
    $("passaporte")
) {
  const imagens = [
    ...container
      .querySelectorAll("img")
  ];

  return Promise.all(
    imagens.map((img) => {
      if (
        img.complete &&
        img.naturalWidth > 0
      ) {
        return Promise.resolve();
      }

      return new Promise(
        (resolve) => {
          img.onload =
            resolve;

          img.onerror =
            resolve;
        }
      );
    })
  );
}

async function gerarCanvas(
  scale = 2
) {
  const elemento =
    $("passaporte");

  await document.fonts.ready;

  await aguardarImagens(
    elemento
  );

  const exportHost =
    document.createElement(
      "div"
    );

  exportHost.className =
    "export-host";

  const clone =
    elemento.cloneNode(
      true
    );

  clone.id =
    "passaporte-export";

  clone.classList.add(
    "exporting"
  );

  exportHost.appendChild(
    clone
  );

  document.body.appendChild(
    exportHost
  );

  await aguardarImagens(
    clone
  );

  await new Promise(
    (resolve) =>
      requestAnimationFrame(
        resolve
      )
  );

  try {
    return await html2canvas(
      clone,
      {
        scale,
        backgroundColor:
          "#FFFFFF",
        useCORS: true,
        allowTaint: true,
        width: 1400,
        height: 980,
        windowWidth: 1400,
        windowHeight: 980,
        scrollX: 0,
        scrollY: 0,
      }
    );
  } finally {
    exportHost.remove();
  }
}

function nomeArquivo(ext) {
  const base =
    municipioSelecionado
      ? `passaporte_${normalizarTexto(
          municipioSelecionado.municipio
        ).replace(/\s+/g, "_")}`
      : "passaporte_selo_unicef";

  return `${base}.${ext}`;
}

async function baixarPng() {
  setLoading(true);

  try {
    const canvas =
      await gerarCanvas(2);

    const link =
      document.createElement(
        "a"
      );

    link.download =
      nomeArquivo("png");

    link.href =
      canvas.toDataURL(
        "image/png"
      );

    link.click();

  } finally {
    setLoading(false);
  }
}

async function baixarPdf() {
  setLoading(true);

  try {
    const canvas =
      await gerarCanvas(
        1.25
      );

    const imgData =
      canvas.toDataURL(
        "image/jpeg",
        0.84
      );

    const { jsPDF } =
      window.jspdf;

    const pdf =
      new jsPDF({
        orientation:
          "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

    const pageWidth =
      pdf.internal.pageSize
        .getWidth();

    const pageHeight =
      pdf.internal.pageSize
        .getHeight();

    const margin = 5;

    const maxWidth =
      pageWidth -
      margin * 2;

    const maxHeight =
      pageHeight -
      margin * 2;

    const imageRatio =
      canvas.width /
      canvas.height;

    let imageWidth =
      maxWidth;

    let imageHeight =
      imageWidth /
      imageRatio;

    if (
      imageHeight >
      maxHeight
    ) {
      imageHeight =
        maxHeight;

      imageWidth =
        imageHeight *
        imageRatio;
    }

    const x =
      (
        pageWidth -
        imageWidth
      ) / 2;

    const y =
      (
        pageHeight -
        imageHeight
      ) / 2;

    pdf.addImage(
      imgData,
      "JPEG",
      x,
      y,
      imageWidth,
      imageHeight,
      undefined,
      "MEDIUM"
    );

    pdf.save(
      nomeArquivo("pdf")
    );

  } finally {
    setLoading(false);
  }
}

async function carregarDados() {
  const [
    acoes,
    adolescentes,
    nucas
  ] =
    await Promise.allSettled([
      buscarTodosRegistros(
        TABLE_ACOES_NUCA
      ),
      buscarTodosRegistros(
        TABLE_DETALHES_ADOLESCENTES
      ),
      buscarTodosRegistros(
        TABLE_DETALHES_NUCAS
      ),
    ]);

  if (
    acoes.status ===
    "rejected"
  ) {
    throw acoes.reason;
  }

  acoesData =
    acoes.value || [];

  adolescentesData =
    adolescentes.status ===
    "fulfilled"
      ? adolescentes.value || []
      : [];

  nucasData =
    nucas.status ===
    "fulfilled"
      ? nucas.value || []
      : [];

  if (
    adolescentes.status ===
    "rejected"
  ) {
    console.warn(
      "Tabela detalhes_adolescentes não carregada.",
      adolescentes.reason
    );
  }

  if (
    nucas.status ===
    "rejected"
  ) {
    console.warn(
      "Tabela detalhes_nucas não carregada.",
      nucas.reason
    );
  }
}

async function init() {
  const inputBusca =
    $("municipioSearch");

  const botaoBusca =
    $("btnBuscar");

  inputBusca.disabled =
    true;

  botaoBusca.disabled =
    true;

  inputBusca.placeholder =
    "Carregando municípios...";

  try {
    await Promise.all([
      carregarSelos(),
      carregarDadosNucaPrazo(),
      carregarDados(),
    ]);

    montarMunicipiosIndex();

    dadosCarregados =
      true;

    inputBusca.disabled =
      false;

    botaoBusca.disabled =
      false;

    inputBusca.placeholder =
      "Ex.: São Francisco de Assis do Piauí";

    const totalMunicipiosReais =
      municipiosIndex.filter(
        (item) =>
          !item.isTeste
      ).length;

    $("statusMessage")
      .className =
        "status-message ok";

    $("statusMessage")
      .textContent =
        `${totalMunicipiosReais.toLocaleString("pt-BR")} municípios disponíveis. Digite ao menos 2 letras e clique em uma sugestão.`;

    logEstatisticasSelos();

  } catch (error) {
    console.error(error);

    dadosCarregados =
      false;

    inputBusca.disabled =
      true;

    botaoBusca.disabled =
      true;

    inputBusca.placeholder =
      "Não foi possível carregar os dados";

    $("statusMessage")
      .className =
        "status-message erro";

    $("statusMessage")
      .textContent =
        "Erro ao carregar dados. Verifique a configuração do projeto.";
  }
}

$("btnBuscar")
  .addEventListener(
    "click",
    buscarMunicipio
  );

$("municipioSearch")
  .addEventListener(
    "input",
    (event) => {
      if (!dadosCarregados) {
        return;
      }

      renderizarSugestoes(
        event.target.value
      );
    }
  );

$("municipioSearch")
  .addEventListener(
    "keydown",
    (event) => {
      if (!dadosCarregados) {
        return;
      }

      const itens = [
        ...$("suggestionsBox")
          .querySelectorAll(
            ".suggestion-item"
          )
      ];

      if (
        event.key ===
          "ArrowDown" &&
        itens.length
      ) {
        event.preventDefault();

        suggestionActiveIndex =
          Math.min(
            suggestionActiveIndex + 1,
            itens.length - 1
          );

        atualizarItemAtivo();

        return;
      }

      if (
        event.key ===
          "ArrowUp" &&
        itens.length
      ) {
        event.preventDefault();

        suggestionActiveIndex =
          Math.max(
            suggestionActiveIndex - 1,
            0
          );

        atualizarItemAtivo();

        return;
      }

      if (
        event.key ===
        "Enter"
      ) {
        event.preventDefault();

        if (
          suggestionActiveIndex >= 0 &&
          itens[
            suggestionActiveIndex
          ]
        ) {
          itens[
            suggestionActiveIndex
          ].dispatchEvent(
            new MouseEvent(
              "mousedown",
              {
                bubbles: true
              }
            )
          );

          return;
        }

        buscarMunicipio();
      }

      if (
        event.key ===
        "Escape"
      ) {
        esconderSugestoes();
      }
    }
  );

$("municipioSearch")
  .addEventListener(
    "blur",
    () =>
      setTimeout(
        esconderSugestoes,
        130
      )
  );

$("btnPng")
  .addEventListener(
    "click",
    baixarPng
  );

$("btnPdf")
  .addEventListener(
    "click",
    baixarPdf
  );

document.addEventListener(
  "DOMContentLoaded",
  init
);