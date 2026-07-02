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
let mapaGeojson = null;
let mapaPronto = false;
let selectedUfSigla = null;

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
  if (match) return match[1].toUpperCase();
  if (/^[A-Z]{2}$/i.test(texto)) return texto.toUpperCase();
  return (
    UF_NAME_TO_SIGLA[normalizarTexto(limparUf(texto)).toUpperCase()] ||
    UF_NAME_TO_SIGLA[limparUf(texto).toUpperCase()] ||
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
  const n = Number(String(valor || "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function getAno(row) {
  const anoAcao = Number(String(row.ano_acao || row.Ano || "").trim());
  if (anoAcao >= 2020) return anoAcao;

  const texto = `${row.mes_acao || ""} ${row.data_hora || ""} ${row.descricao || ""}`;
  const match = texto.match(/20\d{2}/);
  return match ? Number(match[0]) : 0;
}

function municipioKeyFromValues(municipio, uf) {
  return `${normalizarTexto(limparMunicipio(municipio))}__${normalizarTexto(limparUf(uf))}`;
}

function municipioKey(row) {
  return municipioKeyFromValues(
    row.municipio || row.Municipio,
    row.uf || row.UF,
  );
}

function municipioLabel(item) {
  return `${item.municipio} - ${item.sigla || ufSigla(item.uf)}`;

}

function getUfFeatureSigla(feature) {
  const p = feature.properties || {};
  const raw =
    p.sigla ||
    p.SIGLA ||
    p.uf ||
    p.UF ||
    p.UF_05 ||
    p.abbrev_state ||
    p.estado_sigla;
  if (raw && /^[A-Z]{2}$/i.test(String(raw))) return String(raw).toUpperCase();

  const name =
    p.name ||
    p.nome ||
    p.NOME ||
    p.Estado ||
    p.estado ||
    p.NM_ESTADO ||
    p.NM_UF ||
    p.NAME_1;
  return ufSigla(name || "");
}

async function buscarTodosRegistros(tabela, colunas = "*") {
  const pageSize = 1000;
  let from = 0;
  let todos = [];

  while (true) {
    const { data, error } = await supabaseClient
      .from(tabela)
      .select(colunas)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    todos = todos.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return todos;
}

function montarMunicipiosIndex() {
  const mapa = new Map();

  function adicionar(municipioOriginal, ufOriginal) {
    const municipio = limparMunicipio(municipioOriginal);
    const uf = limparUf(ufOriginal);
    if (!municipio || !uf) return;

    const key = municipioKeyFromValues(municipio, uf);
    if (!mapa.has(key)) {
      mapa.set(key, {
        key,
        municipio,
        uf,
        sigla: ufSigla(ufOriginal),
        search: normalizarTexto(`${municipio} ${uf} ${ufSigla(ufOriginal)}`),
      });
    }
  }

  

  acoesData.forEach((row) => adicionar(row.municipio, row.uf));
  adolescentesData.forEach((row) => adicionar(row.Municipio, row.UF));
  nucasData.forEach((row) =>
    adicionar(row.Municipio || row.municipio, row.UF || row.uf),
  );

  municipiosIndex = [...mapa.values()].sort((a, b) =>
    municipioLabel(a).localeCompare(municipioLabel(b), "pt-BR"),
  );
}

function buscarSugestoes(termo) {
  const normalizado = normalizarTexto(termo);
  if (!normalizado || normalizado.length < 2) return [];

  const comecaCom = [];
  const contem = [];

  municipiosIndex.forEach((item) => {
    const municipioNormalizado = normalizarTexto(item.municipio);
    if (municipioNormalizado.startsWith(normalizado)) comecaCom.push(item);
    else if (item.search.includes(normalizado)) contem.push(item);
  });

  return [...comecaCom, ...contem].slice(0, 5);
}

function esconderSugestoes() {
  const box = $("suggestionsBox");
  box.classList.remove("show");
  box.innerHTML = "";
  suggestionActiveIndex = -1;
}

function renderizarSugestoes(termo) {
  const sugestoes = buscarSugestoes(termo);
  const box = $("suggestionsBox");
  const normalizado = normalizarTexto(termo);

  if (!sugestoes.length) {
    if (normalizado.length >= 2) {
      box.innerHTML = `<p class="suggestion-empty">Nenhum município encontrado para "${escapeHtml(termo)}".</p>`;
      box.classList.add("show");
    } else {
      esconderSugestoes();
    }
    return;
  }

  box.innerHTML = sugestoes
    .map(
      (item, index) => `
        <button class="suggestion-item" type="button" data-index="${index}" data-key="${escapeHtml(item.key)}">
          <span>${escapeHtml(item.municipio)}</span>
          <small>${escapeHtml(item.sigla || item.uf)}</small>
        </button>
      `,
    )
    .join("");

  box.classList.add("show");

  box.querySelectorAll(".suggestion-item").forEach((button) => {
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const key = button.dataset.key;
      const municipio = municipiosIndex.find((item) => item.key === key);
      if (municipio) selecionarMunicipio(municipio);
    });
  });
}

function atualizarItemAtivo() {
  const itens = [...$("suggestionsBox").querySelectorAll(".suggestion-item")];
  itens.forEach((item, index) =>
    item.classList.toggle("active", index === suggestionActiveIndex),
  );
}

function encontrarMunicipioPorKey(key) {
  const acoes = acoesData.filter((row) => municipioKey(row) === key);
  const adolescentes = adolescentesData.filter(
    (row) => municipioKey(row) === key,
  );
  const nucas = nucasData.filter((row) => municipioKey(row) === key);
  return { acoes, adolescentes, nucas };
}

function encontrarMunicipio(busca) {
  const termo = normalizarTexto(busca).replace(/\s*\([^)]*\)\s*$/, "");
  if (!termo) return null;

  const itemExato = municipiosIndex.find(
    (item) =>
      normalizarTexto(item.municipio) === termo ||
      normalizarTexto(municipioLabel(item)) === normalizarTexto(busca),
  );

  if (itemExato) return itemExato;
  return buscarSugestoes(busca)[0] || null;
}

function temTemaExato(rows, tema) {
  return rows.some(
    (row) => normalizarTexto(row.tema) === normalizarTexto(tema),
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

function temStatusNucaCriado(rows) {
  return rows.some((row) =>
    normalizarTexto(row.Status).includes("nuca criado"),
  );
}

function municipioEstaNaListaNucaPrazo() {
  if (!dadosNucaPrazo.length || !municipioSelecionado) return false;

  const municipioBase = normalizarTexto(municipioSelecionado.municipio);
  const ufBase = municipioSelecionado.sigla;

  return dadosNucaPrazo.some((item) => {
    const municipioJson = normalizarTexto(
      item["Município"] || item["Municipio"] || item.municipio || ""
    );

    const ufJson = ufSigla(item.UF || item.uf || "");

    const status = normalizarTexto(
      item["NUCA criado?"] || item["NUCA criado"] || item.Status || item.status || ""
    );

    return (
      municipioJson === municipioBase &&
      ufJson === ufBase &&
      status.includes("nuca criado")
    );
  });
}

function calcularSelos(dataset) {
  return SELOS.filter((selo) => {
    if (selo.tipo === "acoes_ate_ano") {
      return (
        dataset.acoes.filter((row) => {
          const ano = getAno(row);
          return ano > 0 && ano <= selo.ano;
        }).length >= 3
      );
    }

    if (selo.tipo === "acoes_no_ano") {
      return (
        dataset.acoes.filter((row) => {
          const ano = getAno(row);
          return ano === selo.ano;
        }).length >= 3
      );
    }

    if (selo.tipo === "tema_exato") {
      return temTemaExato(dataset.acoes, selo.tema);
    }

    if (selo.tipo === "detalhes_adolescentes_povos") {
      return temParticipacaoPovos(dataset.adolescentes);
    }

    if (selo.tipo === "nuca_criado_prazo") {
  return municipioEstaNaListaNucaPrazo();
}

    return false;
  });
}

async function carregarMapaBrasil() {
  try {
    const response = await fetch(BRASIL_GEOJSON_URL);
    if (!response.ok) throw new Error("GeoJSON indisponível");
    mapaGeojson = await response.json();
    desenharMapaBrasil();
  } catch (error) {
    console.warn("Não foi possível carregar o GeoJSON do Brasil.", error);
    desenharMapaFallback();
  }
}

function desenharMapaBrasil() {
  if (!mapaGeojson || !window.d3) return desenharMapaFallback();

  const svg = d3.select("#brasilMap");
  svg.selectAll("*").remove();

  const width = 520;
  const height = 430;
  const projection = d3.geoMercator().fitSize([width, height], mapaGeojson);
  const path = d3.geoPath().projection(projection);

  svg
    .selectAll("path")
    .data(mapaGeojson.features)
    .join("path")
    .attr("class", (feature) => {
      const sigla = getUfFeatureSigla(feature);
      return `state-path ${selectedUfSigla && sigla === selectedUfSigla ? "selected-state" : ""}`;
    })
    .attr("d", path);

  if (selectedUfSigla) {
    const feature = mapaGeojson.features.find(
      (f) => getUfFeatureSigla(f) === selectedUfSigla,
    );
    if (feature) {
      const [x, y] = path.centroid(feature);
      desenharPinSvg(svg, x, y);
    }
  }

  mapaPronto = true;
}

function desenharPinSvg(svg, x, y) {
  const pin = svg
    .append("g")
    .attr("transform", `translate(${x}, ${y - 18}) scale(0.55)`);

  pin
    .append("path")
    .attr("class", "map-pin-svg")
    .attr(
      "d",
      "M0,-30 C17,-30 29,-18 29,-3 C29,17 0,42 0,42 C0,42 -29,17 -29,-3 C-29,-18 -17,-30 0,-30 Z",
    );

  pin
    .append("circle")
    .attr("class", "map-pin-core")
    .attr("r", 9)
    .attr("cy", -4);
}

function desenharMapaFallback() {
  const svg = document.getElementById("brasilMap");
  svg.innerHTML = `
    <path class="state-path" d="M182 36c31-13 76-5 103 12 18 11 30 28 53 31 24 4 42-7 65 3 31 14 41 48 26 76 26 12 45 38 42 69-2 22-15 37-29 52-12 13-18 25-20 44-2 25-14 48-37 58-22 10-45 3-67 4-31 2-48 25-75 35-25 9-56 0-69-23-10-18-5-35-15-52-9-16-28-20-44-27-32-14-55-39-59-75-3-27 9-47 22-69 11-19 13-34 10-56-4-35 28-68 94-82z" />
  `;
  mapaPronto = true;
}

function mostrarToast(municipio, uf) {
  const toast = $("toast");
  $("toastText").textContent = `Passaporte gerado para ${municipio} (${uf}).`;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3600);
}

function setLoading(isLoading) {
  $("loadingOverlay").classList.toggle("show", isLoading);
}

async function renderizarPassaporte(item, dataset) {
  setLoading(true);
  $("previewStatus").textContent = "Gerando...";

  await new Promise((resolve) => setTimeout(resolve, 420));

  municipioSelecionado = {
  municipio: item.municipio,
  uf: item.uf,
  sigla: item.sigla,
  selos: [],
  totalAcoes: dataset.acoes.length,
};

const selos = calcularSelos(dataset);
municipioSelecionado.selos = selos;

  selectedUfSigla = item.sigla;
  desenharMapaBrasil();

  $("municipioTitulo").textContent =
    `${item.municipio} (${item.sigla || item.uf})`;
  $("resumoMunicipio").textContent =
    `${dataset.acoes.length} ação(ões) encontradas · ${selos.length} selo(s) no passaporte`;

  const selosContainer = $("selosContainer");
  selosContainer.className = "selos-container";

  if (!selos.length) {
    selosContainer.innerHTML = `<p class="empty-stamps">Nenhum selo automático encontrado para este município.</p>`;
  } else {
    const quantidadeSelos = Math.min(selos.length, 16);
    selosContainer.classList.add("has-stamps", `stamps-${quantidadeSelos}`);
    selosContainer.innerHTML = selos
      .slice(0, 16)
      .map((selo, index) => {
        const rot = [-8, 7, -4, 5, -7, 3, 8, -5, 4, -3, 6, -6, 2, -2, 9, -9][
          index % 16
        ];
        return `<img class="selo-img" style="--rot:${rot}deg" src="assets/selos/${selo.imagem}" alt="${escapeHtml(selo.selo)}" title="${escapeHtml(selo.selo)}" />`;
      })
      .join("");
  }

  $("btnPng").disabled = false;
  $("btnPdf").disabled = false;
  $("statusMessage").className = "status-message ok";
  $("statusMessage").textContent =
    `Passaporte gerado para ${item.municipio} (${item.sigla || item.uf}).`;
  $("previewStatus").textContent = `${selos.length} selo(s)`;

  setLoading(false);
  mostrarToast(item.municipio, item.sigla || item.uf);
}

function selecionarMunicipio(item) {
  $("municipioSearch").value = municipioLabel(item);
  esconderSugestoes();
  const dataset = encontrarMunicipioPorKey(item.key);
  renderizarPassaporte(item, dataset);
}

function buscarMunicipio() {
  const item = encontrarMunicipio($("municipioSearch").value);

  if (!item) {
    $("statusMessage").className = "status-message erro";
    $("statusMessage").textContent =
      "Município não encontrado. Tente conferir acentos, UF ou parte do nome.";
    return;
  }

  selecionarMunicipio(item);
}

function aguardarImagens(container = $("passaporte")) {
  const imagens = [...container.querySelectorAll("img")];

  return Promise.all(
    imagens.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();

      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }),
  );
}

async function gerarCanvas() {
  const elemento = $("passaporte");

  await document.fonts.ready;
  await aguardarImagens(elemento);

  // Exporta uma cópia fora da tela para evitar o efeito visual de crescimento no preview.
  const exportHost = document.createElement("div");
  exportHost.className = "export-host";

  const clone = elemento.cloneNode(true);
  clone.id = "passaporte-export";
  clone.classList.add("exporting");

  exportHost.appendChild(clone);
  document.body.appendChild(exportHost);

  await aguardarImagens(clone);
  await new Promise((resolve) => requestAnimationFrame(resolve));

  try {
    return await html2canvas(clone, {
      scale: 2,
      backgroundColor: "#F7C81E",
      useCORS: true,
      allowTaint: true,
      width: 980,
      height: 1140,
      windowWidth: 980,
      windowHeight: 1140,
      scrollX: 0,
      scrollY: 0,
    });
  } finally {
    exportHost.remove();
  }
}

function nomeArquivo(ext) {
  const base = municipioSelecionado
    ? `passaporte_${normalizarTexto(municipioSelecionado.municipio).replace(/\s+/g, "_")}`
    : "passaporte_selo_unicef";
  return `${base}.${ext}`;
}

async function baixarPng() {
  setLoading(true);
  try {
    const canvas = await gerarCanvas();
    const link = document.createElement("a");
    link.download = nomeArquivo("png");
    link.href = canvas.toDataURL("image/png");
    link.click();
  } finally {
    setLoading(false);
  }
}

async function baixarPdf() {
  setLoading(true);
  try {
    const canvas = await gerarCanvas();
    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    const orientation = canvas.width > canvas.height ? "landscape" : "portrait";
    const pdf = new jsPDF({
      orientation,
      unit: "px",
      format: [canvas.width, canvas.height],
      compress: true,
    });
    pdf.addImage(
      imgData,
      "PNG",
      0,
      0,
      canvas.width,
      canvas.height,
      undefined,
      "FAST",
    );
    pdf.save(nomeArquivo("pdf"));
  } finally {
    setLoading(false);
  }
}

async function carregarDados() {
  const [acoes, adolescentes, nucas] = await Promise.allSettled([
    buscarTodosRegistros(TABLE_ACOES_NUCA),
    buscarTodosRegistros(TABLE_DETALHES_ADOLESCENTES),
    buscarTodosRegistros(TABLE_DETALHES_NUCAS),
  ]);

  if (acoes.status === "rejected") throw acoes.reason;

  acoesData = acoes.value || [];
  adolescentesData =
    adolescentes.status === "fulfilled" ? adolescentes.value || [] : [];
  nucasData = nucas.status === "fulfilled" ? nucas.value || [] : [];

  if (adolescentes.status === "rejected")
    console.warn(
      "Tabela detalhes_adolescentes não carregada.",
      adolescentes.reason,
    );
  if (nucas.status === "rejected")
    console.warn("Tabela detalhes_nucas não carregada.", nucas.reason);
}

async function init() {
  try {
    await Promise.all([
      carregarSelos(),
      carregarDadosNucaPrazo(),
      carregarMapaBrasil(),
      carregarDados()
    ]);

    montarMunicipiosIndex();

    $("statusMessage").className = "status-message ok";
    $("statusMessage").textContent =
      `${municipiosIndex.length.toLocaleString("pt-BR")} municípios disponíveis. Digite ao menos 2 letras e clique em uma sugestão.`;
  } catch (error) {
    console.error(error);

    $("statusMessage").className = "status-message erro";
    $("statusMessage").textContent =
      "Erro ao carregar dados. Verifique a configuração do projeto.";
  }
}

$("btnBuscar").addEventListener("click", buscarMunicipio);

$("municipioSearch").addEventListener("input", (event) => {
  renderizarSugestoes(event.target.value);
});

$("municipioSearch").addEventListener("keydown", (event) => {
  const itens = [...$("suggestionsBox").querySelectorAll(".suggestion-item")];

  if (event.key === "ArrowDown" && itens.length) {
    event.preventDefault();
    suggestionActiveIndex = Math.min(
      suggestionActiveIndex + 1,
      itens.length - 1,
    );
    atualizarItemAtivo();
    return;
  }

  if (event.key === "ArrowUp" && itens.length) {
    event.preventDefault();
    suggestionActiveIndex = Math.max(suggestionActiveIndex - 1, 0);
    atualizarItemAtivo();
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    if (suggestionActiveIndex >= 0 && itens[suggestionActiveIndex]) {
      itens[suggestionActiveIndex].dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true }),
      );
      return;
    }
    buscarMunicipio();
  }

  if (event.key === "Escape") esconderSugestoes();
});

$("municipioSearch").addEventListener("blur", () =>
  setTimeout(esconderSugestoes, 130),
);
$("btnPng").addEventListener("click", baixarPng);
$("btnPdf").addEventListener("click", baixarPdf);

document.addEventListener("DOMContentLoaded", init);
