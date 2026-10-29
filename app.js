"use strict";
/* Gestor de Metas — app instalável, dados guardados só no aparelho.
   Família: Gestor de Finanças (mesmo endereço, pastas vizinhas). */

const VERSAO_APP = "1.0";
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ic = (n) => `<svg class="ic" viewBox="0 0 24 24">${ICONES[n] || ICONES["tag"]}</svg>`;
const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ================= FAMÍLIA DE APPS ================= */
// Os apps ficam no mesmo endereço (…github.io), cada um na sua pasta.
const FAMILIA = [
  { id: "financas", nome: "Gestor de Finanças", desc: "Despesas, receitas, cartões e investimentos", url: "../gestor-financas/", cor: "#E0560B", icone: "wallet", marca: "gf_usuarios" },
  { id: "metas", nome: "Gestor de Metas", desc: "Metas do ano, afazeres do dia e compras", url: "../gestor-metas/", cor: "#3A3FBF", icone: "target", marca: "gm_dados" },
];
const ESTE_APP = "metas";
const usaApp = (a) => { try { return !!localStorage.getItem(a.marca); } catch { return false; } };

/* ================= DATAS E NÚMEROS ================= */
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const DIAS = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
const p2 = (n) => String(n).padStart(2, "0");
const isoDe = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const hoje = () => isoDe(new Date());
const dataDe = (iso) => { const [a, m, d] = iso.split("-").map(Number); return new Date(a, m - 1, d); };
const somaDias = (iso, n) => { const d = dataDe(iso); d.setDate(d.getDate() + n); return isoDe(d); };
const diaSemana = (iso) => dataDe(iso).getDay();
const nomeData = (iso) => { const d = dataDe(iso); return `${d.getDate()} de ${MESES[d.getMonth()]}`; };
const dataCurta = (iso) => `${iso.slice(8)}/${iso.slice(5, 7)}`;
function rotuloDia(iso) {
  const h = hoje();
  if (iso === h) return "Hoje";
  if (iso === somaDias(h, 1)) return "Amanhã";
  if (iso === somaDias(h, -1)) return "Ontem";
  const n = DIAS[diaSemana(iso)]; return n.charAt(0).toUpperCase() + n.slice(1);
}
const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const nf2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtR = (c) => "R$ " + nf2.format((c || 0) / 100);          // valores em centavos
const fmtN = (n) => nf0.format(n || 0);
function lerNumero(txt) {
  let s = String(txt ?? "").trim().replace(/[R$\s]/g, "");
  if (!s) return NaN;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s); return Number.isFinite(n) ? n : NaN;
}
const lerCentavos = (t) => { const n = lerNumero(t); return Number.isFinite(n) ? Math.round(n * 100) : NaN; };
const paraCampo = (n) => (n == null || n === "" ? "" : String(n).replace(".", ","));

/* ================= DADOS (só no aparelho) ================= */
const CHAVE = "gm_dados";
const CORES_CAT = ["#3A3FBF", "#1E88E5", "#00897B", "#43A047", "#B8860B", "#E0560B", "#C62828", "#D81B60", "#8E24AA", "#6D4C41", "#546E7A", "#111111"];
const ICONES_CAT = ["user-round","piggy-bank","heart-pulse","users","house","briefcase","graduation-cap","book-open","dumbbell","plane","shopping-cart","gift","baby","car","leaf","star","trophy","flag","coins","dog","bike","laptop","camera","guitar","church","school","sparkles","footprints","sun","tag"];
function categoriasPadrao() {
  return [
    ["Pessoal", "user-round", 0], ["Finanças", "piggy-bank", 3], ["Saúde", "heart-pulse", 6], ["Família", "users", 1],
    ["Casa", "house", 4], ["Trabalho", "briefcase", 10], ["Estudos", "graduation-cap", 8],
  ].map(([nome, icone, c]) => ({ id: novoId(), nome, icone, cor: CORES_CAT[c] }));
}
const dadosNovos = () => ({ v: 1, cats: categoriasPadrao(), metas: [], afazeres: [], compras: [], config: { resumo: "07:00", resumoAtivo: true } });
function normalizar(d) {
  d = d && typeof d === "object" ? d : {};
  for (const k of ["cats", "metas", "afazeres", "compras"]) if (!Array.isArray(d[k])) d[k] = [];
  if (!d.cats.length) d.cats = categoriasPadrao();
  d.config = Object.assign({ resumo: "07:00", resumoAtivo: true }, d.config || {});
  d.metas.forEach((m) => { m.itens ||= []; m.regs ||= []; });
  d.afazeres.forEach((a) => { a.feitos ||= {}; a.repete ||= "nao"; if (a.aviso === undefined) a.aviso = a.hora ? 0 : null; });
  d.v = 1; return d;
}
function carregar() { try { const t = localStorage.getItem(CHAVE); if (t) return normalizar(JSON.parse(t)); } catch {} return null; }
function gravar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(S.d)); }
  catch { aviso("Não foi possível salvar. O armazenamento do celular pode estar cheio."); }
  agendarLembretes();
}
function exemplos() {
  const d = dadosNovos(), h = hoje(), ano = new Date().getFullYear() + 1;
  const C = (n) => d.cats.find((c) => c.nome === n).id;
  d.metas = [
    { id: novoId(), titulo: "Ler 12 livros", ano, cat: C("Estudos"), tipo: "lista", alvo: 12, unidade: "livros", feita: false, regs: [],
      itens: ["Hábitos Atômicos", "Pai Rico, Pai Pobre", "O Poder do Hábito"].map((texto) => ({ id: novoId(), texto, feito: false })) },
    { id: novoId(), titulo: "Juntar R$ 10.000 de reserva", ano, cat: C("Finanças"), tipo: "valor", alvo: 1000000, unidade: "", feita: false, itens: [],
      regs: [{ id: novoId(), valor: 80000, nota: "Primeiro depósito", data: h }] },
    { id: novoId(), titulo: "Correr 300 km no ano", ano, cat: C("Saúde"), tipo: "numero", alvo: 300, unidade: "km", feita: false, itens: [],
      regs: [{ id: novoId(), valor: 5, nota: "Primeiro treino", data: h }] },
    { id: novoId(), titulo: "Viagem de férias em família", ano, cat: C("Família"), tipo: "simples", alvo: 1, unidade: "", feita: false, itens: [], regs: [] },
  ];
  d.afazeres = [
    { id: novoId(), titulo: "Levar meu filho na escola", data: h, hora: "07:10", repete: "util", aviso: 10, cat: C("Família"), feitos: {} },
    { id: novoId(), titulo: "Pagar o boleto da internet", data: h, hora: "", repete: "nao", aviso: null, cat: C("Casa"), feitos: {} },
    { id: novoId(), titulo: "Reunião de alinhamento", data: h, hora: "14:00", repete: "nao", aviso: 30, cat: C("Trabalho"), feitos: {} },
  ];
  d.compras = [
    { id: novoId(), nome: "Tênis de corrida", qtd: 1, preco: 35000, cat: C("Saúde"), nota: "", comprado: false },
    { id: novoId(), nome: "Mochila escolar", qtd: 1, preco: 18000, cat: C("Família"), nota: "Antes da volta às aulas", comprado: false },
  ];
  return d;
}

const S = { d: null, aba: "hoje", dia: hoje(), ano: null, filtro: "todas" };
const cat = (id) => S.d.cats.find((c) => c.id === id) || { nome: "Sem categoria", icone: "tag", cor: "#546E7A" };
const bola = (c) => `<span class="bola cor" style="--cc:${c.cor}">${ic(c.icone)}</span>`;

/* ================= CÁLCULOS ================= */
const REPETE = { nao: "Só no dia", diario: "Todo dia", util: "Seg a sex" };
const AVISOS = [[null, "Sem aviso"], [0, "Na hora"], [10, "10 min antes"], [30, "30 min antes"], [60, "1 hora antes"]];
function valeNoDia(a, iso) {
  if (a.repete === "diario") return a.data <= iso;
  if (a.repete === "util") { const w = diaSemana(iso); return a.data <= iso && w >= 1 && w <= 5; }
  return a.data === iso;
}
const porHora = (x, y) => (x.hora || "99").localeCompare(y.hora || "99") || x.titulo.localeCompare(y.titulo);
const afazeresDoDia = (iso) => S.d.afazeres.filter((a) => valeNoDia(a, iso)).sort(porHora);
const atrasados = () => { const h = hoje(); return S.d.afazeres.filter((a) => a.repete === "nao" && a.data < h && !a.feitos[a.data]).sort((x, y) => x.data.localeCompare(y.data)); };
function progresso(m) {
  let feito = 0, alvo = Math.max(Number(m.alvo) || 0, 0.0001), rot = "";
  if (m.tipo === "lista") { feito = m.itens.filter((i) => i.feito).length; rot = `${feito} de ${fmtN(m.alvo)} ${m.unidade || "itens"}`; }
  else if (m.tipo === "valor") { feito = m.regs.reduce((s, r) => s + (r.valor || 0), 0); rot = `${fmtR(feito)} de ${fmtR(m.alvo)}`; }
  else if (m.tipo === "numero") { feito = m.regs.reduce((s, r) => s + (r.valor || 0), 0); rot = `${fmtN(feito)} de ${fmtN(m.alvo)} ${m.unidade || ""}`.trim(); }
  else { alvo = 1; feito = m.feita ? 1 : 0; rot = m.feita ? "Concluída" : "Em aberto"; }
  const pct = Math.max(0, Math.min(1, feito / alvo));
  return { feito, alvo, pct, rot, completa: pct >= 1 };
}
const TIPOS = { lista: "Lista", valor: "Dinheiro", numero: "Número", simples: "Sim/Não" };
const TIPO_IC = { lista: "list-checks", valor: "coins", numero: "hash", simples: "circle-check" };

function anel(p) {
  const r = 31, c = 2 * Math.PI * r;
  return `<svg class="anel" viewBox="0 0 74 74" aria-hidden="true"><circle class="a-fundo" cx="37" cy="37" r="${r}"/>
    <circle class="a-frente" cx="37" cy="37" r="${r}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - p)).toFixed(2)}" transform="rotate(-90 37 37)"/>
    <text x="37" y="43" text-anchor="middle">${Math.round(p * 100)}%</text></svg>`;
}

/* ================= CAMADAS (folhas e telas por cima) ================= */
const pilha = [];
history.replaceState({ camada: 0 }, "");
function abrirCamada(html, { tela = false, aoFechar = null, substituir = false } = {}) {
  if (substituir && pilha.length) pilha.pop().c.remove();
  const c = document.createElement("div");
  c.className = "camada";
  c.innerHTML = tela ? `<div class="tela">${html}</div>` : `<div class="fundo-escuro"></div><div class="folha"><div class="pegador"></div>${html}</div>`;
  $("#camadas").appendChild(c);
  pilha.push({ c, aoFechar });
  if (!substituir) history.pushState({ camada: pilha.length }, "");
  if (!tela) $(".fundo-escuro", c).onclick = () => fechar();
  return $(tela ? ".tela" : ".folha", c);
}
let aposFechar = null;
const fechar = (n = 1, depois = null) => { if (!pilha.length) return depois && depois(); aposFechar = depois; history.go(-Math.min(n, pilha.length)); };
window.addEventListener("popstate", (e) => {
  const alvo = (e.state && e.state.camada) || 0;
  while (pilha.length > alvo) { const p = pilha.pop(); p.c.remove(); p.aoFechar && p.aoFechar(); }
  if (aposFechar) { const f = aposFechar; aposFechar = null; f(); }
});
let tAviso;
function aviso(msg) { const a = $("#aviso"); a.textContent = msg; a.hidden = false; clearTimeout(tAviso); tAviso = setTimeout(() => (a.hidden = true), 2600); }
// botão de excluir que pede um segundo toque
function armar(b, acao) {
  b.onclick = () => {
    if (!b.classList.contains("armado")) { b.classList.add("armado"); b.innerHTML = `${ic("trash")} Toque de novo para excluir`; setTimeout(() => b.isConnected && (b.classList.remove("armado"), (b.innerHTML = `${ic("trash")} Excluir`)), 4000); return; }
    acao();
  };
}

/* ================= TEMA (cor do app) ================= */
// escuro: true quando o fundo do topo é claro e o texto precisa ser escuro
const TEMAS = [
  { id: "indigo", nome: "Índigo", fundo: "#3A3FBF", suave: "#E6E7FA", destaque: "#3A3FBF", escuro: false },
  { id: "azul", nome: "Azul", fundo: "#1F5FAD", suave: "#E3ECF8", destaque: "#1F5FAD", escuro: false },
  { id: "verde", nome: "Verde", fundo: "#2C7A4E", suave: "#E2F1E8", destaque: "#2C7A4E", escuro: false },
  { id: "roxo", nome: "Roxo", fundo: "#5E43A0", suave: "#ECE7F6", destaque: "#5E43A0", escuro: false },
  { id: "rosa", nome: "Rosa", fundo: "#C9467A", suave: "#FBE5EE", destaque: "#C9467A", escuro: false },
  { id: "grafite", nome: "Grafite", fundo: "#2A2A33", suave: "#EEEEF2", destaque: "#2A2A33", escuro: false },
  { id: "azulclaro", nome: "Azul claro", fundo: "#B9DCF5", suave: "#E8F3FC", destaque: "#2B7BBF", escuro: true },
  { id: "menta", nome: "Menta", fundo: "#B5E3CB", suave: "#E7F6EE", destaque: "#2E8B57", escuro: true },
  { id: "lilas", nome: "Lilás", fundo: "#D8CCF0", suave: "#F1ECFA", destaque: "#7550B8", escuro: true },
];
const temaAtual = () => { try { return TEMAS.find((t) => t.id === localStorage.getItem("gm_tema")) || TEMAS[0]; } catch { return TEMAS[0]; } };
function aplicarTema(t = temaAtual()) {
  const r = document.documentElement;
  r.style.setProperty("--fundo", t.fundo); r.style.setProperty("--fundo-suave", t.suave); r.style.setProperty("--destaque", t.destaque);
  r.dataset.contraste = t.escuro ? "escuro" : "claro";
  const m = $('meta[name="theme-color"]'); if (m) m.content = t.fundo;
}
function escolherTema() {
  const atual = temaAtual();
  const el = abrirCamada(`<h2>Cor do app</h2><p class="dica" style="text-align:center">Toque numa cor para ver na hora.</p>
    <div class="temas">${TEMAS.map((t) => `<button data-tema="${t.id}" class="${t.id === atual.id ? "sel" : ""}"><span class="tema-amostra" style="background:${t.fundo}"><i style="background:${t.escuro ? "#14141F" : "#fff"}"></i><i style="background:${t.destaque === t.fundo ? "#fff" : t.destaque}"></i></span>${t.nome}</button>`).join("")}</div>
    <div class="botoes" style="margin-top:16px"><button class="btn preto" data-ok>Pronto</button></div>`, { aoFechar: desenhar });
  $$("[data-tema]", el).forEach((b) => (b.onclick = () => {
    try { localStorage.setItem("gm_tema", b.dataset.tema); } catch {}
    aplicarTema(); $$("[data-tema]", el).forEach((x) => x.classList.toggle("sel", x === b)); desenhar();
  }));
  $("[data-ok]", el).onclick = () => fechar();
}

/* ================= TELAS PRINCIPAIS ================= */
function desenhar() {
  const telas = { hoje: telaHoje, metas: telaMetas, compras: telaCompras, ajustes: telaAjustes };
  $("#app").innerHTML = telas[S.aba]() + nav();
  $$("[data-aba]").forEach((b) => (b.onclick = () => { S.aba = b.dataset.aba; desenhar(); scrollTo(0, 0); }));
  $("[data-novo]").onclick = () => escolherNovo();
  ligar[S.aba] && ligar[S.aba]();
  ligarComuns();
}
function nav() {
  const b = (aba, icone, rot) => `<button data-aba="${aba}" class="${S.aba === aba ? "ativo" : ""}">${ic(icone)}${rot}</button>`;
  return `<nav class="nav">${b("hoje", "calendar", "Hoje")}${b("metas", "target", "Metas")}
    <button class="mais" data-novo aria-label="Adicionar"><span>${ic("plus")}</span></button>
    ${b("compras", "shopping-cart", "Compras")}${b("ajustes", "settings", "Ajustes")}</nav>`;
}
const ligar = {};

/* ---------- HOJE ---------- */
function linhaAfazer(a, iso, mostrarData) {
  const c = cat(a.cat), feito = !!a.feitos[iso];
  return `<div class="afz${feito ? " feito" : ""}">
    <button class="marca" data-marcar="${a.id}" data-dia="${iso}" aria-label="${feito ? "Desmarcar" : "Marcar como feito"}"><i>${feito ? ic("check") : ""}</i></button>
    <button class="abrir" data-afazer="${a.id}"><span class="meio"><div>${esc(a.titulo)}</div>
      <span class="info">${a.hora ? `<span class="hora">${a.hora}</span>` : ""}${mostrarData ? `<span>${dataCurta(iso)}</span>` : ""}
      <span><i class="pontinho" style="--cc:${c.cor}"></i>${esc(c.nome)}</span>${a.repete !== "nao" ? `<span>${ic("repeat")}${REPETE[a.repete]}</span>` : ""}${a.hora && a.aviso != null ? `<span>${ic("bell")}</span>` : ""}</span></span></button></div>`;
}
function telaHoje() {
  const iso = S.dia, eHoje = iso === hoje();
  const lista = afazeresDoDia(iso), feitos = lista.filter((a) => a.feitos[iso]).length;
  const atr = eHoje ? atrasados() : [];
  const p = lista.length ? feitos / lista.length : 0;
  const agora = `${p2(new Date().getHours())}:${p2(new Date().getMinutes())}`;
  const prox = eHoje ? lista.find((a) => !a.feitos[iso] && a.hora && a.hora >= agora) : null;
  const vazioTotal = !S.d.afazeres.length && !S.d.metas.length && !S.d.compras.length;
  let corpo = faixaInstalar() + cartaoNotificacoes() + cartaoFamilia();
  if (atr.length) corpo += `<div class="sec atraso"><span>Atrasados</span><span>${atr.length}</span></div>` + atr.map((a) => linhaAfazer(a, a.data, true)).join("");
  if (lista.length) corpo += `<div class="sec"><span>Afazeres ${eHoje ? "de hoje" : "do dia"}</span><span class="num">${feitos}/${lista.length}</span></div>` + lista.map((a) => linhaAfazer(a, iso)).join("");
  else if (vazioTotal) corpo += `<div class="vazio">${ic("target")}Bem-vindo! Toque no <b>+</b> para criar um afazer, uma meta ou uma compra.<button class="btn leve" data-exemplos>Ver o app com exemplos</button></div>`;
  else corpo += `<div class="vazio">${ic("calendar-clock")}Nada marcado para ${eHoje ? "hoje" : "este dia"}.<br>Toque no <b>+</b> para adicionar.</div>`;
  return `<header class="topo">
      <div class="topo-linha"><button class="bt-redondo" data-dia="-1" aria-label="Dia anterior">${ic("chevron-left")}</button>
        <div class="tit"><b>${rotuloDia(iso)}</b><small>${nomeData(iso)}</small></div>
        <button class="bt-redondo" data-dia="1" aria-label="Próximo dia">${ic("chevron-right")}</button></div>
      <div class="painel">${anel(p)}<div class="txt"><b>${lista.length ? `${feitos} de ${lista.length} feitos` : "Dia livre"}</b>
        <span>${!lista.length ? "Nenhum afazer marcado." : feitos === lista.length ? "Tudo feito. Muito bem!" : `Falta${lista.length - feitos > 1 ? "m" : ""} ${lista.length - feitos}`}${!eHoje ? ` · <u data-hoje>voltar para hoje</u>` : ""}</span></div></div>
      ${prox ? `<div class="prox">${ic("clock")}<span>Próximo: ${esc(prox.titulo)}</span><b>${prox.hora}</b></div>` : ""}
    </header><main class="conteudo">${corpo}</main>`;
}
ligar.hoje = () => {
  $$("[data-dia]").forEach((b) => (b.onclick = () => { S.dia = somaDias(S.dia, Number(b.dataset.dia)); desenhar(); }));
  const h = $("[data-hoje]"); if (h) h.onclick = () => { S.dia = hoje(); desenhar(); };
  const ex = $("[data-exemplos]"); if (ex) ex.onclick = () => { S.d = exemplos(); gravar(); desenhar(); aviso("Exemplos carregados. Edite ou apague à vontade."); };
};

/* ---------- METAS ---------- */
function anosDisponiveis() {
  const s = new Set(S.d.metas.map((m) => Number(m.ano))); const a = new Date().getFullYear(); s.add(a); s.add(a + 1);
  return [...s].filter(Boolean).sort((x, y) => x - y);
}
function anoPadrao() { const a = new Date().getFullYear(); return S.d.metas.some((m) => m.ano === a + 1) && !S.d.metas.some((m) => m.ano === a) ? a + 1 : a; }
function linhaMeta(m) {
  const p = progresso(m), c = cat(m.cat);
  return `<button class="meta-c${p.completa ? " completa" : ""}" data-meta="${m.id}" style="--cc:${c.cor}">${bola(c)}
    <span class="meio"><span class="l1"><b>${esc(m.titulo)}</b><span>${p.completa ? "✓" : Math.round(p.pct * 100) + "%"}</span></span>
    <span class="trilho"><i style="width:${(p.pct * 100).toFixed(1)}%"></i></span>
    <small>${esc(p.rot)} · <span class="selo">${TIPOS[m.tipo]}</span></small></span></button>`;
}
function telaMetas() {
  if (!S.ano) S.ano = anoPadrao();
  const doAno = S.d.metas.filter((m) => Number(m.ano) === S.ano);
  const cats = S.d.cats.filter((c) => doAno.some((m) => m.cat === c.id));
  if (S.filtro !== "todas" && !cats.some((c) => c.id === S.filtro)) S.filtro = "todas";
  const vis = doAno.filter((m) => S.filtro === "todas" || m.cat === S.filtro);
  const ps = doAno.map(progresso), media = ps.length ? ps.reduce((s, p) => s + p.pct, 0) / ps.length : 0, comp = ps.filter((p) => p.completa).length;
  const anos = anosDisponiveis(), i = anos.indexOf(S.ano);
  let corpo = "";
  if (cats.length > 1) corpo += `<div class="filtros"><button data-filtro="todas" class="${S.filtro === "todas" ? "ativo" : ""}">Todas</button>${cats.map((c) => `<button data-filtro="${c.id}" class="${S.filtro === c.id ? "ativo" : ""}">${esc(c.nome)}</button>`).join("")}</div>`;
  const abertas = vis.filter((m) => !progresso(m).completa), feitas = vis.filter((m) => progresso(m).completa);
  if (!doAno.length) corpo += `<div class="vazio">${ic("target")}Nenhuma meta para ${S.ano} ainda.<br>Ex.: ler 12 livros, juntar um valor, correr 300 km.<button class="btn preto" data-nova-meta>${ic("plus")} Criar meta para ${S.ano}</button></div>`;
  if (abertas.length) corpo += `<div class="sec"><span>Em andamento</span><span>${abertas.length}</span></div>` + abertas.map(linhaMeta).join("");
  if (feitas.length) corpo += `<div class="sec"><span>Concluídas</span><span>${feitas.length}</span></div>` + feitas.map(linhaMeta).join("");
  return `<header class="topo">
      <div class="topo-linha"><button class="bt-redondo${i > 0 ? "" : " vazio"}" data-ano="-1" ${i > 0 ? "" : "disabled"} aria-label="Ano anterior">${i > 0 ? ic("chevron-left") : ""}</button>
        <div class="tit"><b>Metas de ${S.ano}</b><small>${doAno.length} ${doAno.length === 1 ? "meta" : "metas"}</small></div>
        <button class="bt-redondo" data-ano="1" aria-label="Próximo ano">${ic("chevron-right")}</button></div>
      <div class="painel">${anel(media)}<div class="txt"><b>${doAno.length ? `${comp} de ${doAno.length} ${doAno.length === 1 ? "concluída" : "concluídas"}` : "Comece seu ano"}</b>
        <span>${doAno.length ? "Média de progresso de todas as metas" : `Defina o que quer conquistar em ${S.ano}`}</span></div></div>
    </header><main class="conteudo">${corpo}</main>`;
}
ligar.metas = () => {
  $$("[data-ano]").forEach((b) => (b.onclick = () => { S.ano += Number(b.dataset.ano); S.filtro = "todas"; desenhar(); }));
  $$("[data-filtro]").forEach((b) => (b.onclick = () => { S.filtro = b.dataset.filtro; desenhar(); }));
  $$("[data-meta]").forEach((b) => (b.onclick = () => telaMeta(b.dataset.meta)));
  const n = $("[data-nova-meta]"); if (n) n.onclick = () => editarMeta();
};

/* ---------- DETALHE DA META ---------- */
function telaMeta(id, substituir = false) {
  const m = S.d.metas.find((x) => x.id === id); if (!m) return;
  const p = progresso(m), c = cat(m.cat);
  let corpo = "";
  if (m.tipo === "lista") {
    const vagas = Math.max(0, Math.round(m.alvo) - m.itens.length);
    corpo = `<div class="sec"><span>${esc(m.unidade || "Itens")}</span><span>${((n) => n === 1 ? "1 feito" : n + " feitos")(m.itens.filter((x) => x.feito).length)}</span></div>
      ${m.itens.map((x) => `<div class="linha-item${x.feito ? " feito" : ""}"><button class="marca" data-item="${x.id}" aria-label="Marcar"><i>${x.feito ? ic("check") : ""}</i></button><span class="t">${esc(x.texto)}</span><button class="rm" data-rm-item="${x.id}" aria-label="Remover">${ic("x")}</button></div>`).join("")}
      ${vagas ? `<div class="linha-item"><span class="marca"></span><span class="t vaga">Ainda ${vagas === 1 ? "falta 1 para escolher" : `faltam ${vagas} para escolher`}</span></div>` : ""}
      <form class="add-linha" data-add-item><input name="t" maxlength="120" placeholder="Adicionar ${esc(m.unidade ? m.unidade.replace(/s$/, "") : "item")}…" aria-label="Novo item" required><button class="btn preto">${ic("plus")}</button></form>`;
  } else if (m.tipo === "valor" || m.tipo === "numero") {
    const din = m.tipo === "valor";
    corpo = `<form class="add-linha duplo" data-add-reg><input name="v" inputmode="decimal" placeholder="${din ? "Valor" : "Quanto"}" aria-label="Valor" required><input name="n" maxlength="60" placeholder="Nota (opcional)" aria-label="Nota"><button class="btn preto">${ic("plus")}</button></form>
      <div class="sec"><span>${din ? "Depósitos" : "Registros"}</span><span>${m.regs.length}</span></div>
      ${m.regs.length ? m.regs.slice().reverse().map((r) => `<div class="linha-item"><span class="marca">${ic(din ? "coins" : "hash")}</span><span class="t">${esc(r.nota || (din ? "Depósito" : "Registro"))}<small>${dataCurta(r.data)}/${r.data.slice(0, 4)}</small></span><span class="val">${din ? fmtR(r.valor) : fmtN(r.valor) + " " + esc(m.unidade || "")}</span><button class="rm" data-rm-reg="${r.id}" aria-label="Remover">${ic("x")}</button></div>`).join("")
        : `<div class="vazio" style="padding:28px">${din ? "Registre cada valor que você guardar." : "Some cada avanço aqui."}</div>`}`;
  } else {
    corpo = `<div style="padding:20px 16px"><button class="btn ${m.feita ? "leve" : "preto"}" data-simples>${ic(m.feita ? "repeat" : "check")} ${m.feita ? "Reabrir meta" : "Marcar como concluída"}</button></div>`;
  }
  const falta = m.tipo === "valor" ? `Faltam ${fmtR(Math.max(0, m.alvo - p.feito))}` : m.tipo === "numero" ? `Faltam ${fmtN(Math.max(0, m.alvo - p.feito))} ${m.unidade || ""}` : m.tipo === "lista" ? `Faltam ${fmtN(Math.max(0, m.alvo - p.feito))}` : "";
  const el = abrirCamada(`<header class="topo">
      <div class="topo-linha"><button class="bt-redondo" data-voltar aria-label="Voltar">${ic("chevron-left")}</button>
        <div class="tit"><b>${esc(m.titulo)}</b><small>${esc(c.nome)} · ${m.ano} · ${TIPOS[m.tipo]}</small></div>
        <button class="bt-redondo" data-editar aria-label="Editar meta">${ic("pencil")}</button></div>
      <div class="det-grande">${Math.round(p.pct * 100)}%</div>
      <div class="det-sub">${esc(p.rot)}${!p.completa && falta ? " · " + falta : p.completa ? " · Meta alcançada!" : ""}</div>
      <div class="trilho"><i style="width:${(p.pct * 100).toFixed(1)}%"></i></div>
    </header><div class="corpo">${corpo}</div>`, { tela: true, aoFechar: desenhar, substituir });
  const de_novo = () => telaMeta(id, true);
  $("[data-voltar]", el).onclick = () => fechar();
  $("[data-editar]", el).onclick = () => editarMeta(m);
  $$("[data-item]", el).forEach((b) => (b.onclick = () => { const x = m.itens.find((i) => i.id === b.dataset.item); x.feito = !x.feito; const antes = p.completa; gravar(); de_novo(); if (!antes && progresso(m).completa) aviso("Meta alcançada! 🎉"); }));
  $$("[data-rm-item]", el).forEach((b) => (b.onclick = () => { m.itens = m.itens.filter((i) => i.id !== b.dataset.rmItem); gravar(); de_novo(); }));
  $$("[data-rm-reg]", el).forEach((b) => (b.onclick = () => { m.regs = m.regs.filter((r) => r.id !== b.dataset.rmReg); gravar(); de_novo(); }));
  const fi = $("[data-add-item]", el);
  if (fi) fi.onsubmit = (e) => { e.preventDefault(); const t = fi.t.value.trim(); if (!t) return; m.itens.push({ id: novoId(), texto: t, feito: false }); gravar(); de_novo(); setTimeout(() => { const f = $("[data-add-item] input"); f && f.focus(); }, 30); };
  const fr = $("[data-add-reg]", el);
  if (fr) fr.onsubmit = (e) => {
    e.preventDefault();
    const v = m.tipo === "valor" ? lerCentavos(fr.v.value) : lerNumero(fr.v.value);
    if (!Number.isFinite(v) || v === 0) return aviso("Digite um valor. Ex.: 250,00");
    const antes = p.completa; m.regs.push({ id: novoId(), valor: v, nota: fr.n.value.trim(), data: hoje() }); gravar(); de_novo();
    aviso(!antes && progresso(m).completa ? "Meta alcançada! 🎉" : m.tipo === "valor" ? `${fmtR(v)} guardados` : "Registrado");
  };
  const fs = $("[data-simples]", el);
  if (fs) fs.onclick = () => { m.feita = !m.feita; gravar(); de_novo(); if (m.feita) aviso("Meta concluída! 🎉"); };
}

/* ---------- COMPRAS ---------- */
function linhaCompra(x) {
  const c = cat(x.cat), tot = (x.preco || 0) * (x.qtd || 1);
  return `<div class="afz compra${x.comprado ? " feito" : ""}">
    <button class="marca" data-comprar="${x.id}" aria-label="${x.comprado ? "Desmarcar" : "Marcar como comprado"}"><i>${x.comprado ? ic("check") : ""}</i></button>
    <button class="abrir" data-compra="${x.id}"><span class="meio"><div>${x.qtd > 1 ? `${fmtN(x.qtd)}× ` : ""}${esc(x.nome)}</div>
      <span class="info"><span><i class="pontinho" style="--cc:${c.cor}"></i>${esc(c.nome)}</span>${x.nota ? `<span>${esc(x.nota)}</span>` : ""}</span></span>
      ${tot ? `<span class="val">${fmtR(tot)}</span>` : ""}</button></div>`;
}
function telaCompras() {
  const pend = S.d.compras.filter((x) => !x.comprado), feitas = S.d.compras.filter((x) => x.comprado);
  const total = pend.reduce((s, x) => s + (x.preco || 0) * (x.qtd || 1), 0);
  let corpo = "";
  if (pend.length) corpo += `<div class="sec"><span>Para comprar</span><span>${pend.length}</span></div>` + pend.map(linhaCompra).join("");
  else corpo += `<div class="vazio">${ic("shopping-cart")}Nada pendente na lista.<br>Toque no <b>+</b> e escolha <b>Compra</b>.</div>`;
  if (feitas.length) corpo += `<div class="sec"><span>Comprados</span><button data-limpar>Limpar comprados</button></div>` + feitas.map(linhaCompra).join("");
  return `<header class="topo">
      <div class="topo-linha"><span class="bt-redondo vazio"></span><div class="tit"><b>Compras</b><small>O que você precisa comprar</small></div><span class="bt-redondo vazio"></span></div>
      <div class="painel"><span class="bola" style="width:74px;height:74px;background:var(--vidro);color:var(--sobre-fundo)">${ic("shopping-bag")}</span>
        <div class="txt"><b class="num">${fmtR(total)}</b><span>${pend.length ? `estimado para ${pend.length} ${pend.length === 1 ? "item" : "itens"}` : "nenhum item pendente"}</span></div></div>
    </header><main class="conteudo">${corpo}</main>`;
}
ligar.compras = () => {
  $$("[data-comprar]").forEach((b) => (b.onclick = () => { const x = S.d.compras.find((i) => i.id === b.dataset.comprar); x.comprado = !x.comprado; gravar(); desenhar(); }));
  $$("[data-compra]").forEach((b) => (b.onclick = () => editarCompra(S.d.compras.find((i) => i.id === b.dataset.compra))));
  const l = $("[data-limpar]"); if (l) l.onclick = () => { const n = S.d.compras.filter((x) => x.comprado).length; S.d.compras = S.d.compras.filter((x) => !x.comprado); gravar(); desenhar(); aviso(`${n} ${n === 1 ? "item removido" : "itens removidos"}`); };
};

/* ---------- AJUSTES ---------- */
function telaAjustes() {
  const st = estadoNotificacoes();
  const rotN = { ativo: "Ativadas", bloqueado: "Bloqueadas", pedir: "Desativadas", sem: "Indisponível" }[st];
  const cfg = S.d.config;
  return `<header class="topo"><div class="topo-linha"><span class="bt-redondo vazio"></span><div class="tit"><b>Ajustes</b><small>Gestor de Metas</small></div><span class="bt-redondo vazio"></span></div></header>
  <main class="conteudo">${faixaInstalar()}
    <div class="secao"><h2>Lembretes</h2><div class="caixa">
      <button class="linha-opc" data-notif>${bola({ cor: "#3A3FBF", icone: st === "ativo" ? "bell" : "bell-off" })}<span class="meio">Notificações no celular<small>${{ ativo: "Avisos dos afazeres com horário e resumo do dia.", bloqueado: "O Chrome está bloqueando. Toque para ver como liberar.", pedir: "Toque para permitir os avisos.", sem: "Este navegador não mostra notificações." }[st]}</small></span><span class="estado${st === "ativo" ? " on" : ""}">${rotN}</span></button>
      <div class="linha-opc">${bola({ cor: "#B8860B", icone: "sun" })}<span class="meio">Resumo do dia<small>Avisa quantos afazeres você tem no dia.</small>
        <span class="hora-linha">Todo dia às <input type="time" data-resumo-hora value="${cfg.resumo}" aria-label="Horário do resumo"></span></span><button class="chave${cfg.resumoAtivo ? " on" : ""}" data-resumo aria-label="Ligar ou desligar o resumo"></button></div>
      ${st === "ativo" ? `<button class="linha-opc" data-testar>${bola({ cor: "#00897B", icone: "sparkles" })}<span class="meio">Testar notificação<small>Mostra um aviso agora para conferir.</small></span><span class="seta">${ic("chevron-right")}</span></button>` : ""}
    </div><p class="dica" style="font-size:13px;color:var(--cinza);margin:10px 4px 0">Para um alarme garantido, abra o afazer e toque em <b>Pôr na agenda do celular</b>.</p></div>
    <div class="secao"><h2>Organização</h2><div class="caixa">
      <button class="linha-opc" data-cats>${bola({ cor: "#8E24AA", icone: "layout-grid" })}<span class="meio">Categorias<small>${S.d.cats.length} categorias</small></span><span class="seta">${ic("chevron-right")}</span></button>
      <button class="linha-opc" data-tema-bt>${bola({ cor: temaAtual().destaque, icone: "palette" })}<span class="meio">Cor do app<small>${temaAtual().nome}</small></span><span class="seta">${ic("chevron-right")}</span></button>
    </div></div>
    <div class="secao"><h2>Seus dados</h2><div class="caixa">
      <button class="linha-opc" data-backup>${bola({ cor: "#1E88E5", icone: "download" })}<span class="meio">Salvar backup<small>Baixa um arquivo com tudo, para guardar ou trocar de celular.</small></span><span class="seta">${ic("chevron-right")}</span></button>
      <label class="linha-opc" style="cursor:pointer">${bola({ cor: "#43A047", icone: "upload" })}<span class="meio">Restaurar backup<small>Usa um arquivo salvo antes. Substitui os dados atuais.</small></span><span class="seta">${ic("chevron-right")}</span><input type="file" accept=".json,application/json" data-restaurar hidden></label>
    </div><p class="dica" style="font-size:13px;color:var(--cinza);margin:10px 4px 0">Seus dados ficam só neste celular. Nada é enviado para a internet.</p></div>
    <div class="secao"><h2>Apps da família</h2><div class="caixa">
      ${FAMILIA.map((a) => a.id === ESTE_APP
        ? `<div class="linha-opc"><span class="mini-ic" style="--cc:${a.cor}">${ic(a.icone)}</span><span class="meio">${a.nome}<small>${a.desc}</small></span><span class="estado">Este app</span></div>`
        : `<a class="linha-opc" href="${a.url}"><span class="mini-ic" style="--cc:${a.cor}">${ic(a.icone)}</span><span class="meio">${a.nome}<small>${a.desc}</small></span><span class="seta">${ic("external-link")}</span></a>`).join("")}
    </div></div>
    <div class="rodape">Gestor de Metas · versão ${VERSAO_APP}</div>
  </main>`;
}
ligar.ajustes = () => {
  $("[data-notif]").onclick = pedirNotificacoes;
  $("[data-resumo]").onclick = () => { S.d.config.resumoAtivo = !S.d.config.resumoAtivo; gravar(); desenhar(); };
  $("[data-resumo-hora]").onchange = (e) => { if (e.target.value) { S.d.config.resumo = e.target.value; gravar(); aviso(`Resumo às ${e.target.value}`); } };
  const t = $("[data-testar]"); if (t) t.onclick = () => notificar({ id: "teste-" + Date.now(), titulo: "Gestor de Metas", corpo: "Os avisos estão funcionando." });
  $("[data-cats]").onclick = telaCategorias;
  $("[data-tema-bt]").onclick = escolherTema;
  $("[data-backup]").onclick = salvarBackup;
  $("[data-restaurar]").onchange = (e) => restaurarBackup(e.target.files[0]);
};

/* ---------- cartões do topo da lista ---------- */
let pedidoInstalar = null;
const instalado = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const dispensado = (k) => { try { return localStorage.getItem(k) === "1"; } catch { return false; } };
const dispensar = (k) => { try { localStorage.setItem(k, "1"); } catch {} };
function faixaInstalar() {
  if (instalado() || !pedidoInstalar || dispensado("gm_sem_banner")) return "";
  return `<div class="instalar"><img src="icons/icon-192.png" alt=""><span>Instale o app para ter o ícone na tela e receber os lembretes.</span><button data-instalar>Instalar</button><button class="x" data-x-instalar aria-label="Fechar">${ic("x")}</button></div>`;
}
function cartaoNotificacoes() {
  if (estadoNotificacoes() !== "pedir" || dispensado("gm_sem_cartao_notif")) return "";
  if (!S.d.afazeres.some((a) => a.hora && a.aviso != null)) return "";
  return `<div class="cartao-aviso">${ic("bell")}<div><b>Quer ser avisado no celular?</b><small>Permita as notificações para receber os lembretes dos afazeres.</small>
    <div class="acoes"><button data-permitir>Permitir</button><button class="sec-bt" data-x-notif>Agora não</button></div></div></div>`;
}
function cartaoFamilia() {
  const outro = FAMILIA.find((a) => a.id !== ESTE_APP && !usaApp(a));
  if (!outro || dispensado("gm_sem_familia_" + outro.id) || !S.d.afazeres.length) return "";
  return `<div class="cartao-aviso"><span class="mini-ic" style="--cc:${outro.cor}">${ic(outro.icone)}</span><div><b>Conheça o ${outro.nome}</b><small>${outro.desc}. Da mesma família deste app.</small>
    <div class="acoes"><a href="${outro.url}">Abrir</a><button class="sec-bt" data-x-familia="${outro.id}">Agora não</button></div></div></div>`;
}
function ligarComuns() {
  const bi = $("[data-instalar]"); if (bi) bi.onclick = instalarApp;
  const xi = $("[data-x-instalar]"); if (xi) xi.onclick = () => { dispensar("gm_sem_banner"); desenhar(); aviso("Para instalar depois: menu ⋮ do Chrome → Instalar app."); };
  const pn = $("[data-permitir]"); if (pn) pn.onclick = pedirNotificacoes;
  const xn = $("[data-x-notif]"); if (xn) xn.onclick = () => { dispensar("gm_sem_cartao_notif"); desenhar(); };
  const xf = $("[data-x-familia]"); if (xf) xf.onclick = () => { dispensar("gm_sem_familia_" + xf.dataset.xFamilia); desenhar(); };
  $$("[data-marcar]").forEach((b) => (b.onclick = () => {
    const a = S.d.afazeres.find((x) => x.id === b.dataset.marcar), d = b.dataset.dia;
    if (a.feitos[d]) delete a.feitos[d]; else a.feitos[d] = true;
    gravar(); desenhar();
  }));
  $$("[data-afazer]").forEach((b) => (b.onclick = () => editarAfazer(S.d.afazeres.find((x) => x.id === b.dataset.afazer))));
}
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); pedidoInstalar = e; desenhar(); });
window.addEventListener("appinstalled", () => { pedidoInstalar = null; desenhar(); registrarPeriodico(); });
async function instalarApp() {
  if (!pedidoInstalar) return aviso("No Chrome, toque em ⋮ e depois em “Instalar app”.");
  pedidoInstalar.prompt(); await pedidoInstalar.userChoice; pedidoInstalar = null; desenhar();
}

/* ================= ADICIONAR E EDITAR ================= */
function escolherNovo() {
  const el = abrirCamada(`<h2>O que você quer adicionar?</h2><div class="grade-add">
    <button data-n="afazer"><span class="bola">${ic("calendar")}</span>Afazer<small>Algo para fazer num dia</small></button>
    <button data-n="meta"><span class="bola">${ic("target")}</span>Meta<small>Algo para conquistar no ano</small></button>
    <button data-n="compra"><span class="bola">${ic("shopping-cart")}</span>Compra<small>Algo para comprar</small></button></div>`);
  $$("[data-n]", el).forEach((b) => (b.onclick = () => ({ afazer: editarAfazer, meta: editarMeta, compra: editarCompra }[b.dataset.n])(null, true)));
}
// grade de categorias, com opção de criar uma nova
function gradeCat(sel) {
  return `<span class="rot">Categoria</span><div class="grade-cat">${S.d.cats.map((c) => `<button type="button" data-cat="${c.id}" class="${c.id === sel ? "sel" : ""}" style="--cc:${c.cor}">${bola(c)}<span>${esc(c.nome)}</span></button>`).join("")}
    <button type="button" data-cat-nova><span class="bola">${ic("plus")}</span><span>Nova</span></button></div>`;
}
function ligarGradeCat(el, estado) {
  $$("[data-cat]", el).forEach((b) => (b.onclick = () => { estado.cat = b.dataset.cat; $$("[data-cat]", el).forEach((x) => x.classList.toggle("sel", x === b)); }));
  $("[data-cat-nova]", el).onclick = () => editarCategoria(null, (c) => {
    estado.cat = c.id;
    const g = $(".grade-cat", el); const tmp = document.createElement("div"); tmp.innerHTML = gradeCat(c.id);
    g.replaceWith($(".grade-cat", tmp)); ligarGradeCat(el, estado);
  });
}

/* ---------- afazer ---------- */
function linkAgenda(a) {
  let dia = a.data;
  if (a.repete !== "nao") { dia = a.data > hoje() ? a.data : hoje(); let n = 0; while (!valeNoDia(a, dia) && n++ < 7) dia = somaDias(dia, 1); }
  const ini = new Date(`${dia}T${a.hora}:00`), fim = new Date(ini.getTime() + 30 * 60000);
  const f = (d) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${p2(d.getHours())}${p2(d.getMinutes())}00`;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
  let u = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(a.titulo)}&dates=${f(ini)}/${f(fim)}&ctz=${encodeURIComponent(tz)}&details=${encodeURIComponent("Afazer do Gestor de Metas")}`;
  if (a.repete === "diario") u += "&recur=" + encodeURIComponent("RRULE:FREQ=DAILY");
  if (a.repete === "util") u += "&recur=" + encodeURIComponent("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
  return u;
}
function editarAfazer(a, substituir = false) {
  const novo = !a;
  const e = { cat: a ? a.cat : S.d.cats[0]?.id, repete: a ? a.repete : "nao", aviso: a ? a.aviso : 0 };
  const el = abrirCamada(`<h2>${novo ? "Novo afazer" : "Editar afazer"}</h2>
    <form data-f>
      <label>O que precisa fazer?<input name="titulo" maxlength="120" required value="${esc(a?.titulo)}" placeholder="Ex.: Levar meu filho na escola"></label>
      <div class="dois"><label>Dia<input type="date" name="data" required value="${a ? a.data : S.dia}"></label>
        <label>Horário<input type="time" name="hora" value="${a?.hora || ""}"></label></div>
      <span class="rot">Repetir</span><div class="seletor" style="margin-bottom:12px">${Object.entries(REPETE).map(([k, v]) => `<button type="button" data-rep="${k}" class="${k === e.repete ? "sel" : ""}">${v}</button>`).join("")}</div>
      <label data-aviso-campo>Lembrete no celular<select name="aviso">${AVISOS.map(([v, r]) => `<option value="${v ?? ""}" ${String(v ?? "") === String(e.aviso ?? "") ? "selected" : ""}>${r}</option>`).join("")}</select></label>
      ${gradeCat(e.cat)}
      <div class="botoes"><button class="btn preto">${ic("check")} Salvar</button>
        ${!novo && a.hora ? `<a class="btn contorno" href="${linkAgenda(a)}" target="_blank" rel="noopener">${ic("calendar-plus")} Pôr na agenda do celular</a>` : ""}
        ${!novo ? `<button type="button" class="btn perigo" data-excluir>${ic("trash")} Excluir</button>` : ""}</div>
    </form>`, { aoFechar: desenhar, substituir });
  const f = $("[data-f]", el);
  const atualizarAviso = () => { $("[data-aviso-campo]", el).hidden = !f.hora.value; };
  f.hora.oninput = atualizarAviso; atualizarAviso();
  $$("[data-rep]", el).forEach((b) => (b.onclick = () => { e.repete = b.dataset.rep; $$("[data-rep]", el).forEach((x) => x.classList.toggle("sel", x === b)); }));
  ligarGradeCat(el, e);
  f.onsubmit = (ev) => {
    ev.preventDefault();
    const dados = { titulo: f.titulo.value.trim(), data: f.data.value || S.dia, hora: f.hora.value || "", repete: e.repete, cat: e.cat };
    dados.aviso = dados.hora && f.aviso.value !== "" ? Number(f.aviso.value) : null;
    if (!dados.titulo) return;
    if (novo) S.d.afazeres.push({ id: novoId(), feitos: {}, ...dados }); else Object.assign(a, dados);
    if (novo && dados.repete === "nao") S.dia = dados.data;
    if (novo) S.aba = "hoje";
    gravar(); fechar();
    aviso(novo ? "Afazer adicionado" : "Afazer atualizado");
    if (dados.aviso != null && estadoNotificacoes() === "pedir") setTimeout(() => aviso("Para receber o lembrete, permita as notificações."), 2700);
  };
  const x = $("[data-excluir]", el);
  if (x) armar(x, () => { S.d.afazeres = S.d.afazeres.filter((i) => i.id !== a.id); gravar(); fechar(); aviso("Afazer excluído"); });
}

/* ---------- meta ---------- */
function editarMeta(m, substituir = false) {
  const novo = !m;
  const e = { cat: m ? m.cat : S.d.cats[0]?.id, tipo: m ? m.tipo : "lista" };
  const alvoTxt = m ? (m.tipo === "valor" ? paraCampo(m.alvo / 100) : paraCampo(m.alvo)) : "";
  const el = abrirCamada(`<h2>${novo ? "Nova meta" : "Editar meta"}</h2>
    <form data-f>
      <label>Meta<input name="titulo" maxlength="120" required value="${esc(m?.titulo)}" placeholder="Ex.: Ler 12 livros"></label>
      <span class="rot">Como medir</span><div class="seletor" style="--n:4;margin-bottom:8px">${Object.entries(TIPOS).map(([k, v]) => `<button type="button" data-tipo="${k}" class="${k === e.tipo ? "sel" : ""}">${v}</button>`).join("")}</div>
      <p class="dica" data-dica-tipo></p>
      <div class="dois" data-alvo-linha><label><span data-rot-alvo>Quantidade</span><input name="alvo" inputmode="decimal" value="${alvoTxt}"></label>
        <label data-un>Unidade<input name="unidade" maxlength="20" value="${esc(m?.unidade)}"></label></div>
      <div class="dois"><label>Ano<input type="number" name="ano" min="2000" max="2100" required value="${m ? m.ano : S.ano || anoPadrao()}"></label><span></span></div>
      ${gradeCat(e.cat)}
      <div class="botoes"><button class="btn preto">${ic("check")} Salvar</button>
        ${!novo ? `<button type="button" class="btn perigo" data-excluir>${ic("trash")} Excluir</button>` : ""}</div>
    </form>`, { aoFechar: novo ? desenhar : null, substituir });
  const f = $("[data-f]", el);
  const tipo = () => {
    const t = e.tipo;
    $$("[data-tipo]", el).forEach((b) => b.classList.toggle("sel", b.dataset.tipo === t));
    $("[data-dica-tipo]", el).textContent = { lista: "Para metas com itens, como livros para ler. Você adiciona cada item depois.", valor: "Para juntar dinheiro. Você registra cada valor guardado.", numero: "Para somar números, como km corridos ou horas de estudo.", simples: "Para metas que são feitas ou não, como tirar a CNH." }[t];
    $("[data-alvo-linha]", el).hidden = t === "simples";
    $("[data-un]", el).hidden = t === "valor";
    $("[data-rot-alvo]", el).textContent = t === "valor" ? "Valor (R$)" : t === "lista" ? "Quantidade" : "Alvo";
    f.unidade.placeholder = t === "lista" ? "livros" : "km";
    f.alvo.placeholder = t === "valor" ? "10.000,00" : "12";
  };
  tipo();
  $$("[data-tipo]", el).forEach((b) => (b.onclick = () => { e.tipo = b.dataset.tipo; tipo(); }));
  ligarGradeCat(el, e);
  f.onsubmit = (ev) => {
    ev.preventDefault();
    const t = e.tipo, titulo = f.titulo.value.trim(); if (!titulo) return;
    let alvo = 1;
    if (t !== "simples") { alvo = t === "valor" ? lerCentavos(f.alvo.value) : lerNumero(f.alvo.value); if (!Number.isFinite(alvo) || alvo <= 0) return aviso("Informe o alvo da meta. Ex.: 12"); }
    const dados = { titulo, tipo: t, alvo, unidade: t === "valor" || t === "simples" ? "" : f.unidade.value.trim(), ano: Number(f.ano.value) || new Date().getFullYear(), cat: e.cat };
    let alvoMeta = m;
    if (novo) { alvoMeta = { id: novoId(), itens: [], regs: [], feita: false, ...dados }; S.d.metas.push(alvoMeta); }
    else Object.assign(m, dados);
    S.ano = dados.ano; S.filtro = "todas"; S.aba = "metas";
    gravar();
    if (novo) { telaMeta(alvoMeta.id, true); aviso("Meta criada"); }
    else { fechar(1, () => telaMeta(m.id, true)); aviso("Meta atualizada"); }
  };
  const x = $("[data-excluir]", el);
  if (x) armar(x, () => { S.d.metas = S.d.metas.filter((i) => i.id !== m.id); gravar(); fechar(2); aviso("Meta excluída"); });
}

/* ---------- compra ---------- */
function editarCompra(x, substituir = false) {
  const novo = !x;
  const e = { cat: x ? x.cat : S.d.cats[0]?.id };
  const el = abrirCamada(`<h2>${novo ? "Nova compra" : "Editar compra"}</h2>
    <form data-f>
      <label>O que comprar?<input name="nome" maxlength="100" required value="${esc(x?.nome)}" placeholder="Ex.: Mochila escolar"></label>
      <div class="dois"><label>Quantidade<input name="qtd" inputmode="decimal" value="${x ? paraCampo(x.qtd) : "1"}"></label>
        <label>Preço (cada)<input name="preco" inputmode="decimal" value="${x && x.preco ? paraCampo(x.preco / 100) : ""}" placeholder="0,00"></label></div>
      <label>Observação<input name="nota" maxlength="80" value="${esc(x?.nota)}" placeholder="Opcional"></label>
      ${gradeCat(e.cat)}
      <div class="botoes"><button class="btn preto">${ic("check")} Salvar</button>
        ${!novo ? `<button type="button" class="btn perigo" data-excluir>${ic("trash")} Excluir</button>` : ""}</div>
    </form>`, { aoFechar: desenhar, substituir });
  const f = $("[data-f]", el);
  ligarGradeCat(el, e);
  f.onsubmit = (ev) => {
    ev.preventDefault();
    const nome = f.nome.value.trim(); if (!nome) return;
    const qtd = lerNumero(f.qtd.value), preco = lerCentavos(f.preco.value);
    const dados = { nome, qtd: Number.isFinite(qtd) && qtd > 0 ? qtd : 1, preco: Number.isFinite(preco) ? preco : 0, nota: f.nota.value.trim(), cat: e.cat };
    if (novo) S.d.compras.push({ id: novoId(), comprado: false, ...dados }); else Object.assign(x, dados);
    if (novo) S.aba = "compras";
    gravar(); fechar(); aviso(novo ? "Adicionado à lista" : "Item atualizado");
  };
  const b = $("[data-excluir]", el);
  if (b) armar(b, () => { S.d.compras = S.d.compras.filter((i) => i.id !== x.id); gravar(); fechar(); aviso("Item excluído"); });
}

/* ---------- categorias ---------- */
function telaCategorias() {
  const desenharLista = (el) => {
    $("[data-lista]", el).innerHTML = S.d.cats.map((c) => {
      const usos = S.d.metas.filter((m) => m.cat === c.id).length + S.d.afazeres.filter((a) => a.cat === c.id).length + S.d.compras.filter((x) => x.cat === c.id).length;
      return `<button class="linha-opc" data-ed="${c.id}">${bola(c)}<span class="meio">${esc(c.nome)}<small>${usos ? `${usos} ${usos === 1 ? "uso" : "usos"}` : "Sem uso"}</small></span><span class="seta">${ic("pencil")}</span></button>`;
    }).join("");
    $$("[data-ed]", el).forEach((b) => (b.onclick = () => editarCategoria(S.d.cats.find((c) => c.id === b.dataset.ed), () => desenharLista(el))));
  };
  const el = abrirCamada(`<h2>Categorias</h2><div class="caixa" data-lista></div>
    <div class="botoes" style="margin-top:14px"><button class="btn leve" data-nova>${ic("plus")} Nova categoria</button><button class="btn preto" data-ok>Pronto</button></div>`, { aoFechar: desenhar });
  desenharLista(el);
  $("[data-nova]", el).onclick = () => editarCategoria(null, () => desenharLista(el));
  $("[data-ok]", el).onclick = () => fechar();
}
function editarCategoria(c, depois) {
  const novo = !c;
  const e = { icone: c ? c.icone : "tag", cor: c ? c.cor : CORES_CAT[S.d.cats.length % CORES_CAT.length] };
  const el = abrirCamada(`<h2>${novo ? "Nova categoria" : "Editar categoria"}</h2>
    <form data-f><label>Nome<input name="nome" maxlength="30" required value="${esc(c?.nome)}" placeholder="Ex.: Estudos"></label>
      <span class="rot">Ícone</span><div class="grade-icones">${ICONES_CAT.map((n) => `<button type="button" data-ic="${n}" class="${n === e.icone ? "sel" : ""}" aria-label="${n}">${ic(n)}</button>`).join("")}</div>
      <span class="rot">Cor</span><div class="cores">${CORES_CAT.map((k) => `<button type="button" class="cor-op${k === e.cor ? " sel" : ""}" data-cor="${k}" style="background:${k}" aria-label="Cor"></button>`).join("")}</div>
      <div class="botoes"><button class="btn preto">${ic("check")} Salvar</button>${!novo ? `<button type="button" class="btn perigo" data-excluir>${ic("trash")} Excluir</button>` : ""}</div></form>`);
  $$("[data-ic]", el).forEach((b) => (b.onclick = () => { e.icone = b.dataset.ic; $$("[data-ic]", el).forEach((x) => x.classList.toggle("sel", x === b)); }));
  $$("[data-cor]", el).forEach((b) => (b.onclick = () => { e.cor = b.dataset.cor; $$("[data-cor]", el).forEach((x) => x.classList.toggle("sel", x === b)); }));
  const f = $("[data-f]", el);
  f.onsubmit = (ev) => {
    ev.preventDefault();
    const nome = f.nome.value.trim(); if (!nome) return;
    let r = c;
    if (novo) { r = { id: novoId(), nome, icone: e.icone, cor: e.cor }; S.d.cats.push(r); } else Object.assign(c, { nome, icone: e.icone, cor: e.cor });
    gravar(); fechar(1, () => depois && depois(r));
  };
  const x = $("[data-excluir]", el);
  if (x) armar(x, () => {
    if (S.d.cats.length <= 1) return aviso("Mantenha pelo menos uma categoria.");
    S.d.cats = S.d.cats.filter((i) => i.id !== c.id);
    const resto = S.d.cats[0].id;
    for (const lista of [S.d.metas, S.d.afazeres, S.d.compras]) lista.forEach((i) => { if (i.cat === c.id) i.cat = resto; });
    gravar(); fechar(1, () => depois && depois()); aviso(`Itens movidos para ${S.d.cats[0].nome}`);
  });
}

/* ================= BACKUP ================= */
function salvarBackup() {
  const blob = new Blob([JSON.stringify({ app: "gestor-metas", versao: VERSAO_APP, salvoEm: new Date().toISOString(), dados: S.d }, null, 1)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `gestor-metas-backup-${hoje()}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  aviso("Backup salvo na pasta Downloads.");
}
async function restaurarBackup(arq) {
  if (!arq) return;
  let bk;
  try { bk = JSON.parse(await arq.text()); } catch { return aviso("Esse arquivo não é um backup válido."); }
  const dados = bk && bk.app === "gestor-metas" ? bk.dados : null;
  if (!dados || !Array.isArray(dados.metas)) return aviso("Esse arquivo não é um backup do Gestor de Metas.");
  const el = abrirCamada(`<h2>Restaurar backup?</h2><p class="dica" style="text-align:center">Backup de ${bk.salvoEm ? new Date(bk.salvoEm).toLocaleDateString("pt-BR") : "data desconhecida"}: ${dados.metas.length} metas, ${(dados.afazeres || []).length} afazeres e ${(dados.compras || []).length} compras.<br>Os dados atuais deste celular serão substituídos.</p>
    <div class="botoes"><button class="btn preto" data-sim>Restaurar</button><button class="btn leve" data-nao>Cancelar</button></div>`);
  $("[data-sim]", el).onclick = () => { S.d = normalizar(dados); S.ano = null; gravar(); fechar(); aviso("Backup restaurado"); };
  $("[data-nao]", el).onclick = () => fechar();
}

/* ================= LEMBRETES (notificações) ================= */
// Como funciona: com o app aberto ou usado há pouco, o aviso aparece no horário.
// Com o app instalado, o Chrome também acorda o app de tempos em tempos para
// mostrar avisos pendentes (o próprio Chrome decide a frequência).
const temNotif = "Notification" in window && "serviceWorker" in navigator;
function estadoNotificacoes() {
  if (!temNotif) return "sem";
  return Notification.permission === "granted" ? "ativo" : Notification.permission === "denied" ? "bloqueado" : "pedir";
}
async function pedirNotificacoes() {
  const st = estadoNotificacoes();
  if (st === "sem") return aviso("Este navegador não mostra notificações. Use o Chrome.");
  if (st === "bloqueado") {
    const el = abrirCamada(`<h2>Notificações bloqueadas</h2><p class="dica">Para liberar no Android:</p>
      <p style="margin:0 0 14px;line-height:1.5">1. Segure o ícone do app na tela inicial e toque em <b>Informações do app</b> (ⓘ).<br>2. Entre em <b>Notificações</b> e ative.<br><br>Se usa pelo Chrome sem instalar: toque no cadeado ao lado do endereço → <b>Permissões</b> → <b>Notificações</b>.</p>
      <div class="botoes"><button class="btn preto" data-ok>Entendi</button></div>`);
    $("[data-ok]", el).onclick = () => fechar();
    return;
  }
  if (st === "ativo") return aviso("As notificações já estão ativadas.");
  const r = await Notification.requestPermission();
  desenhar();
  if (r === "granted") { aviso("Pronto! Você vai receber os lembretes."); agendarLembretes(); registrarPeriodico(); }
  else aviso("Sem permissão, os lembretes não aparecem.");
}
function proximosAvisos() {
  const agora = Date.now(), fim = agora + 36 * 3600e3, h = hoje(), lista = [];
  for (let i = 0; i < 2; i++) {
    const iso = somaDias(h, i);
    const doDia = afazeresDoDia(iso);
    for (const a of doDia) {
      if (!a.hora || a.aviso == null || a.feitos[iso]) continue;
      const at = new Date(`${iso}T${a.hora}:00`).getTime() - a.aviso * 60000;
      if (at > agora - 60000 && at < fim) lista.push({ id: `a-${a.id}-${iso}`, at, titulo: a.titulo, corpo: a.aviso ? `Daqui a ${a.aviso >= 60 ? "1 hora" : a.aviso + " minutos"} (${a.hora})` : `Agora, ${a.hora}` });
    }
    const cfg = S.d.config;
    if (cfg.resumoAtivo && cfg.resumo) {
      const at = new Date(`${iso}T${cfg.resumo}:00`).getTime();
      const pend = doDia.filter((a) => !a.feitos[iso]);
      if (at > agora - 60000 && at < fim && pend.length) {
        const nomes = pend.slice(0, 3).map((a) => (a.hora ? a.hora + " " : "") + a.titulo).join(" · ");
        lista.push({ id: `r-${iso}`, at, titulo: `Você tem ${pend.length} ${pend.length === 1 ? "afazer" : "afazeres"} hoje`, corpo: nomes + (pend.length > 3 ? " …" : "") });
      }
    }
  }
  return lista.sort((x, y) => x.at - y.at);
}
let timers = [];
async function lerMostrados() { try { const c = await caches.open("gm-agenda"); const r = await c.match("mostrados.json"); return r ? await r.json() : []; } catch { return []; } }
async function marcarMostrado(id) { try { const c = await caches.open("gm-agenda"); const l = await lerMostrados(); l.push(id); await c.put("mostrados.json", new Response(JSON.stringify(l.slice(-300)))); } catch {} }
async function notificar(a) {
  if (estadoNotificacoes() !== "ativo") return;
  if (!a.id.startsWith("teste") && (await lerMostrados()).includes(a.id)) return;
  const op = { body: a.corpo, tag: a.id, icon: "icons/icon-192.png", badge: "icons/badge-96.png", vibrate: [120, 60, 120], data: { url: "./" } };
  try { const reg = await navigator.serviceWorker.getRegistration(); if (reg) await reg.showNotification(a.titulo, op); else new Notification(a.titulo, op); }
  catch { try { new Notification(a.titulo, op); } catch { return aviso("Não foi possível mostrar a notificação."); } }
  marcarMostrado(a.id);
}
async function agendarLembretes() {
  timers.forEach(clearTimeout); timers = [];
  if (estadoNotificacoes() !== "ativo") return;
  const lista = proximosAvisos();
  // deixa a lista guardada para o service worker mostrar quando o Chrome acordar o app
  try { const c = await caches.open("gm-agenda"); await c.put("agenda.json", new Response(JSON.stringify({ gerado: Date.now(), avisos: lista }), { headers: { "content-type": "application/json" } })); } catch {}
  for (const a of lista) { const ms = a.at - Date.now(); if (ms < 2147483000) timers.push(setTimeout(() => notificar(a), Math.max(0, ms))); }
}
async function registrarPeriodico() {
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!("periodicSync" in reg)) return;
    const p = await navigator.permissions.query({ name: "periodic-background-sync" });
    if (p.state === "granted") await reg.periodicSync.register("gm-lembretes", { minInterval: 60 * 60 * 1000 });
  } catch {}
}
// reagenda ao voltar para o app e na virada de cada hora (o dia pode ter mudado)
document.addEventListener("visibilitychange", () => { if (!document.hidden) { if (S.dia < hoje() && pilha.length === 0) S.dia = hoje(); agendarLembretes(); if (!pilha.length) desenhar(); } });
setInterval(agendarLembretes, 30 * 60000);

/* ================= INÍCIO ================= */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  const tinhaControle = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (tinhaControle) location.reload(); });
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(() => { agendarLembretes(); registrarPeriodico(); }).catch(() => {});
}
aplicarTema();
S.d = carregar() || dadosNovos();
if (!localStorage.getItem(CHAVE)) { try { localStorage.setItem(CHAVE, JSON.stringify(S.d)); } catch {} }
desenhar();
agendarLembretes();
