/* =======================================================================
   app.js  —  WattControl
   Lógica da aplicação: estado, cálculos de consumo/custo, renderização
   da tabela e dos gráficos (pizza, barras e linhas).
   Depende de: database.js e Chart.js (carregados antes deste arquivo).
   ======================================================================= */

/* ----------------------- Constantes de cálculo ------------------------ */
// Fator de emissão médio do Sistema Interligado Nacional (kg CO₂ por kWh).
const FATOR_CO2 = 0.0817;

/* ------------------------------ Estado -------------------------------- */
// Map<id, { horas:Number, qtd:Number }>
const selecionados = new Map();
let tarifa = TARIFA_PADRAO;
let filtroCategoria = 'Todos';
let termoBusca = '';

// Instâncias dos gráficos (para destruir antes de recriar).
let chartPizza = null;
let chartBarras = null;
let chartLinhas = null;

/* ----------------------- Atalhos de elementos ------------------------- */
const $ = (sel) => document.querySelector(sel);
const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = (v, d = 1) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ===================================================================== */
/*                      FUNÇÕES DE CÁLCULO                                */
/* ===================================================================== */

// Consumo mensal (kWh) de um item já selecionado.
function consumoMensalItem(eletro, horas, qtd) {
  return (eletro.potencia * horas * qtd * DIAS_NO_MES) / 1000;
}

// Retorna lista detalhada dos itens selecionados com cálculos prontos.
function detalharSelecionados() {
  const linhas = [];
  selecionados.forEach((cfg, id) => {
    const eletro = ELETRODOMESTICOS.find((e) => e.id === id);
    if (!eletro) return;
    const kwh = consumoMensalItem(eletro, cfg.horas, cfg.qtd);
    linhas.push({
      ...eletro,
      horas: cfg.horas,
      qtd: cfg.qtd,
      kwh,
      custo: kwh * tarifa
    });
  });
  return linhas;
}

// Totais gerais.
function calcularTotais(linhas) {
  const kwh = linhas.reduce((s, l) => s + l.kwh, 0);
  const custo = kwh * tarifa;
  const co2 = kwh * FATOR_CO2;
  const difMedia = MEDIA_BRASIL_MENSAL > 0
    ? ((kwh - MEDIA_BRASIL_MENSAL) / MEDIA_BRASIL_MENSAL) * 100
    : 0;
  return { kwh, custo, co2, difMedia };
}

// Agrupa consumo por categoria (para o gráfico de pizza).
function consumoPorCategoria(linhas) {
  const mapa = {};
  linhas.forEach((l) => {
    mapa[l.categoria] = (mapa[l.categoria] || 0) + l.kwh;
  });
  return mapa;
}

// Projeção anual: consumo do usuário vs média brasileira (gráfico de linhas).
function projecaoAnual(linhas) {
  const usuario = new Array(12).fill(0);

  linhas.forEach((l) => {
    const fatores = FATORES_SAZONAIS_CATEGORIA[l.categoria];
    for (let m = 0; m < 12; m++) {
      const fator = fatores ? fatores[m] : 1.0;
      usuario[m] += l.kwh * fator;
    }
  });

  const brasil = PERFIL_SAZONAL_BRASIL.map((f) => MEDIA_BRASIL_MENSAL * f);
  return { usuario, brasil };
}

/* ===================================================================== */
/*                      RENDERIZAÇÃO DA INTERFACE                         */
/* ===================================================================== */

/* ---- Catálogo de eletrodomésticos ---- */
function renderCatalogo() {
  const grid = $('#catalogo');
  const lista = ELETRODOMESTICOS.filter((e) => {
    const okCat = filtroCategoria === 'Todos' || e.categoria === filtroCategoria;
    const okBusca = e.nome.toLowerCase().includes(termoBusca.toLowerCase());
    return okCat && okBusca;
  });

  if (lista.length === 0) {
    grid.innerHTML = `<p style="grid-column:1/-1;color:var(--ink-faint);padding:20px;text-align:center">Nenhum aparelho encontrado.</p>`;
    return;
  }

  grid.innerHTML = lista.map((e) => `
    <button class="appl" data-add="${e.id}" title="Adicionar ${e.nome}">
      <span class="appl__icon">${e.icone}</span>
      <span class="appl__info">
        <span class="appl__name">${e.nome}</span>
        <span class="appl__watt">${e.potencia} W · ${e.categoria}</span>
      </span>
      <span class="appl__add">+</span>
    </button>
  `).join('');
}

/* ---- Tabela dos aparelhos selecionados ---- */
function renderTabela(linhas, totais) {
  const alvo = $('#selecionados');

  if (linhas.length === 0) {
    alvo.innerHTML = `
      <div class="empty">
        <span class="big">🔌</span>
        <strong>Nenhum aparelho adicionado ainda.</strong>
        <p style="margin-top:6px">Escolha eletrodomésticos no catálogo acima para iniciar a simulação.</p>
      </div>`;
    return;
  }

  const corpo = linhas.map((l) => `
    <tr>
      <td>
        <div class="cell-name">
          <span class="ic">${l.icone}</span>
          <div>
            <div>${l.nome}</div>
            <span class="cat-badge" style="background:${CORES_CATEGORIA[l.categoria]}">${l.categoria}</span>
          </div>
        </div>
      </td>
      <td class="num hide-sm">${l.potencia} W</td>
      <td class="num">
        <div class="stepper">
          <button data-h-minus="${l.id}">–</button>
          <input type="number" min="0" max="24" step="0.5" value="${l.horas}" data-h-input="${l.id}">
          <button data-h-plus="${l.id}">+</button>
        </div>
      </td>
      <td class="num hide-sm">
        <div class="stepper">
          <button data-q-minus="${l.id}">–</button>
          <input type="number" min="1" max="50" step="1" value="${l.qtd}" data-q-input="${l.id}">
          <button data-q-plus="${l.id}">+</button>
        </div>
      </td>
      <td class="num">${fmtNum(l.kwh)} kWh</td>
      <td class="num">${fmtBRL(l.custo)}</td>
      <td class="num"><button class="btn-del" data-del="${l.id}" title="Remover">✕</button></td>
    </tr>
  `).join('');

  alvo.innerHTML = `
    <table class="tbl">
      <thead>
        <tr>
          <th>Eletrodoméstico</th>
          <th class="num hide-sm">Potência</th>
          <th class="num">Horas/dia</th>
          <th class="num hide-sm">Qtd.</th>
          <th class="num">Consumo/mês</th>
          <th class="num">Custo/mês</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${corpo}</tbody>
      <tfoot>
        <tr>
          <td>Total (${linhas.length} ${linhas.length === 1 ? 'aparelho' : 'aparelhos'})</td>
          <td class="num hide-sm"></td>
          <td class="num"></td>
          <td class="num hide-sm"></td>
          <td class="num">${fmtNum(totais.kwh)} kWh</td>
          <td class="num">${fmtBRL(totais.custo)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>`;
}

/* ---- Cartões de indicadores (KPIs) ---- */
function renderKPIs(totais) {
  $('#kpi-kwh').innerHTML = `${fmtNum(totais.kwh)} <small>kWh</small>`;
  $('#kpi-custo').textContent = fmtBRL(totais.custo);
  $('#kpi-custo-ano').textContent = `${fmtBRL(totais.custo * 12)} por ano`;
  $('#kpi-co2').innerHTML = `${fmtNum(totais.co2)} <small>kg</small>`;

  const dif = totais.difMedia;
  const elDif = $('#kpi-media');
  const elSub = $('#kpi-media-sub');
  if (totais.kwh === 0) {
    elDif.innerHTML = '—';
    elSub.textContent = 'Adicione aparelhos para comparar';
  } else if (dif >= 0) {
    elDif.innerHTML = `+${fmtNum(dif, 0)}<small>%</small>`;
    elSub.innerHTML = `<b class="up">acima</b> da média nacional (${MEDIA_BRASIL_MENSAL} kWh)`;
  } else {
    elDif.innerHTML = `${fmtNum(dif, 0)}<small>%</small>`;
    elSub.innerHTML = `<b class="down">abaixo</b> da média nacional (${MEDIA_BRASIL_MENSAL} kWh)`;
  }
}

/* ===================================================================== */
/*                              GRÁFICOS                                  */
/* ===================================================================== */

const FONTE_GRAFICO = "'Plus Jakarta Sans', sans-serif";
Chart.defaults.font.family = FONTE_GRAFICO;
Chart.defaults.color = '#5A584E';

/* Gráfico de PIZZA (donut) — consumo por categoria */
function renderPizza(linhas) {
  const dados = consumoPorCategoria(linhas);
  const labels = Object.keys(dados);
  const valores = labels.map((c) => dados[c]);
  const cores = labels.map((c) => CORES_CATEGORIA[c]);

  if (chartPizza) chartPizza.destroy();
  if (labels.length === 0) return;

  chartPizza = new Chart($('#grafPizza'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: valores, backgroundColor: cores, borderColor: '#fff', borderWidth: 3, hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '58%',
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12, boxHeight: 12, padding: 14, font: { size: 12.5 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = valores.reduce((s, v) => s + v, 0);
              const pct = total ? (ctx.parsed / total * 100) : 0;
              return ` ${ctx.label}: ${fmtNum(ctx.parsed)} kWh (${fmtNum(pct, 0)}%)`;
            }
          }
        }
      }
    }
  });
}

/* Gráfico de BARRAS/COLUNAS — custo mensal por aparelho (Top 8) */
function renderBarras(linhas) {
  const top = [...linhas].sort((a, b) => b.custo - a.custo).slice(0, 8);
  const labels = top.map((l) => l.nome);
  const valores = top.map((l) => l.custo);
  const cores = top.map((l) => CORES_CATEGORIA[l.categoria]);

  if (chartBarras) chartBarras.destroy();
  if (top.length === 0) return;

  chartBarras = new Chart($('#grafBarras'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Custo mensal (R$)', data: valores, backgroundColor: cores, borderRadius: 7, maxBarThickness: 46 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${fmtBRL(ctx.parsed.x)} / mês` } }
      },
      scales: {
        x: { grid: { color: '#EFEADF' }, ticks: { callback: (v) => 'R$ ' + v } },
        y: {
          grid: { display: false },
          ticks: {
            font: { size: 12 },
            callback: function(value) {
              const label = this.getLabelForValue(value);
              if (window.innerWidth < 480 && label.length > 18) {
                return label.slice(0, 17) + '…';
              }
              return label;
            }
          }
        }
      }
    }
  });
}

/* Gráfico de LINHAS — projeção anual vs média brasileira */
function renderLinhas(linhas) {
  const { usuario, brasil } = projecaoAnual(linhas);

  if (chartLinhas) chartLinhas.destroy();

  chartLinhas = new Chart($('#grafLinhas'), {
    type: 'line',
    data: {
      labels: MESES,
      datasets: [
        {
          label: 'Seu consumo estimado',
          data: usuario,
          borderColor: '#E08600', backgroundColor: 'rgba(245,166,35,.14)',
          borderWidth: 3, fill: true, tension: .35,
          pointBackgroundColor: '#E08600', pointRadius: 4, pointHoverRadius: 6
        },
        {
          label: 'Média residencial brasileira',
          data: brasil,
          borderColor: '#3D7DD8', backgroundColor: 'transparent',
          borderWidth: 2.5, borderDash: [7, 5], fill: false, tension: .35,
          pointBackgroundColor: '#3D7DD8', pointRadius: 3, pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 16, boxHeight: 3, padding: 16, font: { size: 12.5 } } },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmtNum(ctx.parsed.y)} kWh` } }
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: '#EFEADF' }, ticks: { callback: (v) => v + ' kWh' }, beginAtZero: true }
      }
    }
  });
}

/* ===================================================================== */
/*                       ORQUESTRAÇÃO / UPDATE                            */
/* ===================================================================== */

function atualizarTudo() {
  const linhas = detalharSelecionados();
  const totais = calcularTotais(linhas);
  renderKPIs(totais);
  renderTabela(linhas, totais);
  renderPizza(linhas);
  renderBarras(linhas);
  renderLinhas(linhas);
}

/* ===================================================================== */
/*                        AÇÕES DO USUÁRIO                                */
/* ===================================================================== */

function adicionar(id) {
  if (selecionados.has(id)) return; // já está na lista
  const eletro = ELETRODOMESTICOS.find((e) => e.id === id);
  selecionados.set(id, { horas: eletro.horasPadrao, qtd: 1 });
  atualizarTudo();
}

function remover(id) {
  selecionados.delete(id);
  atualizarTudo();
}

function setHoras(id, valor) {
  const cfg = selecionados.get(id);
  if (!cfg) return;
  cfg.horas = Math.min(24, Math.max(0, valor));
  atualizarTudo();
}

function setQtd(id, valor) {
  const cfg = selecionados.get(id);
  if (!cfg) return;
  cfg.qtd = Math.min(50, Math.max(1, Math.round(valor)));
  atualizarTudo();
}

/* ===================================================================== */
/*                       LIGAÇÃO DE EVENTOS                               */
/* ===================================================================== */

function ligarEventos() {
  // Catálogo (delegação de clique)
  $('#catalogo').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (btn) adicionar(btn.dataset.add);
  });

  // Tabela de selecionados (delegação)
  $('#selecionados').addEventListener('click', (e) => {
    const t = e.target;
    if (t.dataset.del) return remover(t.dataset.del);
    if (t.dataset.hMinus) { const c = selecionados.get(t.dataset.hMinus); setHoras(t.dataset.hMinus, c.horas - 0.5); }
    if (t.dataset.hPlus)  { const c = selecionados.get(t.dataset.hPlus);  setHoras(t.dataset.hPlus, c.horas + 0.5); }
    if (t.dataset.qMinus) { const c = selecionados.get(t.dataset.qMinus); setQtd(t.dataset.qMinus, c.qtd - 1); }
    if (t.dataset.qPlus)  { const c = selecionados.get(t.dataset.qPlus);  setQtd(t.dataset.qPlus, c.qtd + 1); }
  });
  $('#selecionados').addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.hInput) setHoras(t.dataset.hInput, parseFloat(t.value) || 0);
    if (t.dataset.qInput) setQtd(t.dataset.qInput, parseInt(t.value) || 1);
  });

  // Filtros de categoria
  $('#chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    filtroCategoria = chip.dataset.cat;
    document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === chip));
    renderCatalogo();
  });

  // Busca
  $('#busca').addEventListener('input', (e) => { termoBusca = e.target.value; renderCatalogo(); });

  // Tarifa
  $('#tarifa').addEventListener('input', (e) => {
    const v = parseFloat(e.target.value.replace(',', '.'));
    tarifa = isNaN(v) || v < 0 ? 0 : v;
    atualizarTudo();
  });
}

/* ===================================================================== */
/*                          INICIALIZAÇÃO                                 */
/* ===================================================================== */

function montarChips() {
  const cats = ['Todos', ...CATEGORIAS];
  $('#chips').innerHTML = cats.map((c, i) =>
    `<button class="chip${i === 0 ? ' active' : ''}" data-cat="${c}">${c}</button>`
  ).join('');
}

function init() {
  $('#tarifa').value = tarifa.toFixed(2).replace('.', ',');
  montarChips();
  renderCatalogo();
  ligarEventos();
  atualizarTudo();
}

document.addEventListener('DOMContentLoaded', init);
