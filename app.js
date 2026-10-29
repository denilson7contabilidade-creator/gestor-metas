"use strict";
/* Gestor de Metas — app instalável, dados guardados só no aparelho.
   Família: Gestor de Finanças (mesmo endereço, pastas vizinhas). */

const VERSAO_APP = "2.0";
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
const dadosNovos = () => ({ v: 1, cats: categoriasPadrao(), metas: [], afazeres: [], compras: [], historicoCompras: [], config: { resumo: "07:00", resumoAtivo: true, backupDias: 20, criadoEm: hoje() } });
function normalizar(d) {
  d = d && typeof d === "object" ? d : {};
  for (const k of ["cats", "metas", "afazeres", "compras", "historicoCompras"]) if (!Array.isArray(d[k])) d[k] = [];
  if (!d.cats.length) d.cats = categoriasPadrao();
  d.config = Object.assign({ resumo: "07:00", resumoAtivo: true, criadoEm: hoje() }, d.config || {});
  // versão 1.4 usava semanal/mensal; agora é "avisar depois de X dias" (padrão 20)
  if (d.config.backupDias == null) d.config.backupDias = d.config.backupFreq === "nunca" ? 0 : d.config.backupFreq === "mensal" ? 30 : 20;
  delete d.config.backupFreq;
  d.metas.forEach((m) => {
    m.itens ||= []; m.regs ||= [];
    // prazo (versão 2.0): metas antigas valem o ano todo
    if (!m.prazo) { m.prazoTipo = "ano"; m.prazo = `${m.ano}-12-31`; }
    m.prazoTipo ||= "data";
    if (!m.inicio) m.inicio = `${m.ano}-01-01`;
    m.itens.forEach((i) => { i.leituras ||= []; });
  });
  d.compras.forEach((x) => { x.regs ||= []; });
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
  const d = dadosNovos(), h = hoje(), ano = new Date().getFullYear() + 1, anoAt = new Date().getFullYear();
  const C = (n) => d.cats.find((c) => c.nome === n).id;
  const ini = `${ano}-01-01`;
  const livros = [["Hábitos Atômicos", 320], ["Pai Rico, Pai Pobre", 240], ["O Poder do Hábito", 408]].map(([texto, total]) => ({ id: novoId(), texto, total, feito: false, leituras: [] }));
  livros[0].leituras.push({ dia: somaDias(h, -3), qtd: 40 }, { dia: somaDias(h, -1), qtd: 35 });
  const mLivros = { id: novoId(), titulo: "Ler 12 livros", ano, prazo: `${ano}-12-31`, prazoTipo: "ano", inicio: ini, cat: C("Estudos"), tipo: "lista", alvo: 12, unidade: "livros", medida: "páginas", feita: false, regs: [], itens: livros };
  const mReserva = { id: novoId(), titulo: "Juntar R$ 5.000 de reserva", ano: anoAt + 1, prazo: `${anoAt + 1}-06-30`, prazoTipo: "data", inicio: somaDias(h, -40), cat: C("Finanças"), tipo: "valor", alvo: 500000, unidade: "", feita: false, itens: [],
    regs: [{ id: novoId(), valor: 80000, nota: "Primeiro depósito", data: somaDias(h, -35) }, { id: novoId(), valor: 50000, nota: "Salário", data: somaDias(h, -5) }] };
  const mCorrida = { id: novoId(), titulo: "Correr 300 km", ano: anoAt, prazo: `${anoAt}-12-31`, prazoTipo: "ano", inicio: `${anoAt}-01-01`, cat: C("Saúde"), tipo: "numero", alvo: 300, unidade: "km", feita: false, itens: [],
    regs: [{ id: novoId(), valor: 120, nota: "Treinos até setembro", data: somaDias(h, -40) }, { id: novoId(), valor: 15, nota: "", data: somaDias(h, -6) }] };
  const mViagem = { id: novoId(), titulo: "Viagem de férias em família", ano, prazo: `${ano}-07-15`, prazoTipo: "data", inicio: h, cat: C("Família"), tipo: "simples", alvo: 1, unidade: "", feita: false, itens: [], regs: [] };
  d.metas = [mLivros, mReserva, mCorrida, mViagem];
  const tenis = { id: novoId(), nome: "Tênis de corrida", qtd: 1, preco: 35000, cat: C("Saúde"), nota: "", comprado: false, prazo: somaDias(h, 45), regs: [{ id: novoId(), valor: 10000, data: somaDias(h, -7), nota: "Guardado" }] };
  d.compras = [tenis,
    { id: novoId(), nome: "Mochila escolar", qtd: 1, preco: 18000, cat: C("Família"), nota: "Antes da volta às aulas", comprado: false, regs: [] },
    { id: novoId(), nome: "Lâmpadas LED", qtd: 4, preco: 1200, cat: C("Casa"), nota: "", comprado: true, compradoEm: h, regs: [] }];
  const proxDia = (dd) => { const x = dataDe(h); let y = new Date(x.getFullYear(), x.getMonth(), dd); if (isoDe(y) < h) y = new Date(x.getFullYear(), x.getMonth() + 1, dd); return isoDe(y); };
  const proxSexta = () => { for (let i = 0; i < 7; i++) { const x = somaDias(h, i); if (diaSemana(x) === 5) return x; } return h; };
  d.afazeres = [
    { id: novoId(), titulo: "Levar meu filho na escola", data: somaDias(h, -14), hora: "07:10", repete: "util", aviso: 10, cat: C("Família"), feitos: {} },
    { id: novoId(), titulo: "Pagar o boleto da internet", data: h, hora: "", repete: "nao", aviso: null, cat: C("Casa"), feitos: {} },
    { id: novoId(), titulo: "Ler 20 páginas · Ler 12 livros", data: somaDias(h, -10), hora: "21:00", repete: "diario", aviso: 0, cat: C("Estudos"), feitos: {}, liga: { tipo: "meta", id: mLivros.id, qtd: 20 }, ate: mLivros.prazo },
    { id: novoId(), titulo: "Guardar R$ 500 · Juntar R$ 5.000 de reserva", data: proxDia(5), hora: "", repete: "mensal", aviso: null, cat: C("Finanças"), feitos: {}, liga: { tipo: "meta", id: mReserva.id, qtd: 50000 }, ate: mReserva.prazo },
    { id: novoId(), titulo: "Guardar R$ 50 para Tênis de corrida", data: proxSexta(), hora: "", repete: "semanal", aviso: null, cat: C("Saúde"), feitos: {}, liga: { tipo: "compra", id: tenis.id, qtd: 5000 }, ate: tenis.prazo },
  ];
  // histórico dos últimos dias, para os relatórios terem o que mostrar
  for (let i = 1; i <= 12; i++) {
    const dia = somaDias(h, -i), w = diaSemana(dia);
    if (w >= 1 && w <= 5 && i % 4 !== 0) d.afazeres[0].feitos[dia] = true;
  }
  for (const dia of [somaDias(h, -10), somaDias(h, -9), somaDias(h, -8), somaDias(h, -7), somaDias(h, -4), somaDias(h, -2)]) d.afazeres[2].feitos[dia] = true;
  return d;
}
const S = { d: null, aba: "hoje", dia: hoje(), ano: null, filtro: "todas", rel: { modo: "semana", ref: hoje() } };
const cat = (id) => S.d.cats.find((c) => c.id === id) || { nome: "Sem categoria", icone: "tag", cor: "#546E7A" };
const bola = (c) => `<span class="bola cor" style="--cc:${c.cor}">${ic(c.icone)}</span>`;

/* ================= CÁLCULOS ================= */
const REPETE = { nao: "Só no dia", diario: "Todo dia", util: "Seg a sex", semanal: "Toda semana", mensal: "Todo mês" };
const AVISOS = [[null, "Sem aviso"], [0, "Na hora"], [10, "10 min antes"], [30, "30 min antes"], [60, "1 hora antes"]];
function repeteNoDia(a, iso) {
  if (a.repete === "nao" || !a.repete) return a.data === iso;
  if (a.data > iso || (a.ate && iso > a.ate)) return false;
  if (a.repete === "diario") return true;
  if (a.repete === "util") { const w = diaSemana(iso); return w >= 1 && w <= 5; }
  if (a.repete === "semanal") return diaSemana(iso) === diaSemana(a.data);
  if (a.repete === "mensal") { const d = dataDe(iso), dd = Number(a.data.slice(8)), ult = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); return d.getDate() === Math.min(dd, ult); }
  return false;
}
function valeNoDia(a, iso) {
  if (!repeteNoDia(a, iso)) return false;
  // plano de meta/compra já concluída: some dos próximos dias
  if (a.liga && a.repete !== "nao" && iso >= hoje() && !a.feitos[iso] && ligaConcluida(a)) return false;
  return true;
}
const rotuloRepete = (a) => a.repete === "semanal" ? `Toda ${DIAS[diaSemana(a.data)].replace("-feira", "")}` : a.repete === "mensal" ? `Todo dia ${Number(a.data.slice(8))}` : REPETE[a.repete];
const porHora = (x, y) => (x.hora || "99").localeCompare(y.hora || "99") || x.titulo.localeCompare(y.titulo);
const afazeresDoDia = (iso) => S.d.afazeres.filter((a) => valeNoDia(a, iso)).sort(porHora);
const atrasados = () => { const h = hoje(); return S.d.afazeres.filter((a) => a.repete === "nao" && a.data < h && !a.feitos[a.data]).sort((x, y) => x.data.localeCompare(y.data)); };
function progresso(m) {
  let feito = 0, alvo = Math.max(Number(m.alvo) || 0, 0.0001), rot = "";
  if (m.tipo === "lista") {
    const n = m.itens.filter((i) => i.feito).length;
    const parcial = m.itens.filter((i) => !i.feito && i.total > 0).reduce((s, i) => s + Math.min(lidasItem(i) / i.total, 0.99), 0);
    feito = n >= m.alvo ? n : Math.min(n + parcial, n + 0.99, m.alvo - 0.01); rot = `${n} de ${fmtN(m.alvo)} ${m.unidade || "itens"}`;
  }
  else if (m.tipo === "valor") { feito = m.regs.reduce((s, r) => s + (r.valor || 0), 0); rot = `${fmtR(feito)} de ${fmtR(m.alvo)}`; }
  else if (m.tipo === "numero") { feito = m.regs.reduce((s, r) => s + (r.valor || 0), 0); rot = `${fmtN(feito)} de ${fmtN(m.alvo)} ${m.unidade || ""}`.trim(); }
  else { alvo = 1; feito = m.feita ? 1 : 0; rot = m.feita ? "Concluída" : "Em aberto"; }
  const pct = Math.max(0, Math.min(1, feito / alvo));
  return { feito, alvo, pct, rot, completa: pct >= 1 };
}
const TIPOS = { lista: "Lista", valor: "Dinheiro", numero: "Número", simples: "Sim/Não" };

/* ---------- prazos ---------- */
const diffDias = (a, b) => Math.round((dataDe(b) - dataDe(a)) / 864e5); // b menos a
const dataBR = (iso) => `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const dataMes = (iso) => { const d = dataDe(iso); return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}${d.getFullYear() !== new Date().getFullYear() ? " " + d.getFullYear() : ""}`; };
const diasAtePrazo = (m) => diffDias(hoje(), m.prazo);
const plural = (n, um, varios) => `${fmtN(n)} ${n === 1 ? um : varios}`;
function fracaoPrazo(m) {
  if (hoje() < m.inicio) return 0;
  const tot = diffDias(m.inicio, m.prazo);
  if (tot <= 0) return 1;
  return Math.max(0, Math.min(1, diffDias(m.inicio, hoje()) / tot));
}
function textoPrazo(m, longo) {
  const d = diasAtePrazo(m);
  if (d < 0) return `prazo venceu há ${plural(-d, "dia", "dias")}`;
  if (d === 0) return "o prazo é hoje";
  const qual = m.prazoTipo === "ano" ? `até 31/12${longo ? "/" + m.prazo.slice(0, 4) : ""}` : `até ${dataBR(m.prazo)}`;
  return longo || d <= 60 ? `${qual} · faltam ${plural(d, "dia", "dias")}` : qual;
}
// páginas (ou outra medida) de um item de lista
const lidasItem = (i) => (i.leituras || []).reduce((s, l) => s + (l.qtd || 0), 0);
// data em que a meta foi concluída (calculada a partir do histórico)
function dataConclusao(m) {
  if (!progresso(m).completa) return null;
  if (m.tipo === "simples") return m.feitaEm || null;
  if (m.tipo === "lista") { const ds = m.itens.filter((i) => i.feito && i.feitoEm).map((i) => i.feitoEm).sort(); return ds.length >= Math.round(m.alvo) ? ds[Math.round(m.alvo) - 1] : ds[ds.length - 1] || null; }
  let s = 0; for (const r of m.regs.slice().sort((x, y) => x.data.localeCompare(y.data))) { s += r.valor || 0; if (s >= m.alvo) return r.data; }
  return null;
}
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
function abrirCamada(html, { tela = false, aoFechar = null, substituir = false, re = null } = {}) {
  if (substituir && pilha.length) pilha.pop().c.remove();
  const c = document.createElement("div");
  c.className = "camada";
  c.innerHTML = tela ? `<div class="tela">${html}</div>` : `<div class="fundo-escuro"></div><div class="folha"><div class="pegador"></div>${html}</div>`;
  $("#camadas").appendChild(c);
  pilha.push({ c, aoFechar, re });
  if (!substituir) history.pushState({ camada: pilha.length }, "");
  if (!tela) $(".fundo-escuro", c).onclick = () => fechar();
  return $(tela ? ".tela" : ".folha", c);
}
let aposFechar = null;
// redesenha a tela de baixo e a tela aberta por cima (lista de compras, meta…)
function refrescar() { desenhar(); const t = pilha[pilha.length - 1]; if (t && t.re) t.re(); }
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
  const telas = { hoje: telaHoje, metas: telaMetas, relatorios: telaRelatorios, ajustes: telaAjustes };
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
    ${b("relatorios", "chart-column", "Relatórios")}${b("ajustes", "settings", "Ajustes")}</nav>`;
}
const ligar = {};

/* ---------- HOJE ---------- */
function linhaAfazer(a, iso, mostrarData) {
  const c = cat(a.cat), feito = !!a.feitos[iso];
  return `<div class="afz${feito ? " feito" : ""}">
    <button class="marca" data-marcar="${a.id}" data-dia="${iso}" aria-label="${feito ? "Desmarcar" : "Marcar como feito"}"><i>${feito ? ic("check") : ""}</i></button>
    <button class="abrir" data-afazer="${a.id}"><span class="meio"><div>${esc(a.titulo)}</div>
      <span class="info">${a.hora ? `<span class="hora">${a.hora}</span>` : ""}${mostrarData ? `<span>${dataCurta(iso)}</span>` : ""}
      <span><i class="pontinho" style="--cc:${c.cor}"></i>${esc(c.nome)}</span>${a.repete !== "nao" ? `<span>${ic("repeat")}${rotuloRepete(a)}</span>` : ""}${a.hora && a.aviso != null ? `<span>${ic("bell")}</span>` : ""}</span>
      ${a.liga && alvoLiga(a) ? `<span class="liga">${ic(a.liga.tipo === "compra" ? "shopping-cart" : "target")}${esc(rotuloLiga(a))}</span>` : ""}</span></button></div>`;
}
function telaHoje() {
  const iso = S.dia, eHoje = iso === hoje();
  const lista = afazeresDoDia(iso), feitos = lista.filter((a) => a.feitos[iso]).length;
  const atr = eHoje ? atrasados() : [];
  const p = lista.length ? feitos / lista.length : 0;
  const agora = `${p2(new Date().getHours())}:${p2(new Date().getMinutes())}`;
  const prox = eHoje ? lista.find((a) => !a.feitos[iso] && a.hora && a.hora >= agora) : null;
  const vazioTotal = !S.d.afazeres.length && !S.d.metas.length && !S.d.compras.length;
  let corpo = cartaoBackup() + faixaInstalar() + cartaoNotificacoes() + cartaoFamilia();
  if (atr.length) corpo += `<div class="sec atraso"><span>Atrasados</span><span>${atr.length}</span></div>` + atr.map((a) => linhaAfazer(a, a.data, true)).join("");
  if (lista.length) corpo += `<div class="sec"><span>Afazeres ${eHoje ? "de hoje" : "do dia"}</span><span class="num">${feitos}/${lista.length}</span></div>` + lista.map((a) => linhaAfazer(a, iso)).join("");
  else if (vazioTotal) corpo += `<div class="vazio">${ic("target")}Bem-vindo! Toque no <b>+</b> para criar um afazer, uma meta ou uma compra.<button class="btn leve" data-exemplos>Ver o app com exemplos</button></div>`;
  else corpo += `<div class="vazio">${ic("calendar-clock")}Nada marcado para ${eHoje ? "hoje" : "este dia"}.<br>Toque no <b>+</b> para adicionar.</div>`;
  if (!vazioTotal) corpo += atalhoCompras();
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
  const vc = $("[data-ver-compras]"); if (vc) vc.onclick = () => abrirCompras();
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
    <small>${esc(p.rot)} · <span class="${!p.completa && diasAtePrazo(m) < 0 ? "vencido" : ""}">${p.completa ? "concluída" : textoPrazo(m)}</span>${planosDe("meta", m.id).length ? ` · ${ic("calendar-clock")}plano` : ""}</small></span></button>`;
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
  const abertas = vis.filter((m) => !progresso(m).completa).sort((x, y) => x.prazo.localeCompare(y.prazo)), feitas = vis.filter((m) => progresso(m).completa);
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
    const prevs = previsaoItens(m), med = m.medida;
    const atual = m.itens.find((i) => !i.feito && i.total > 0);
    corpo = blocoPlano("meta", m) + `<div class="sec"><span>${esc(m.unidade || "Itens")}</span><span>${((n) => n === 1 ? "1 feito" : n + " feitos")(m.itens.filter((x) => x.feito).length)}</span></div>
      ${m.itens.map((x) => {
        const l = lidasItem(x), pr = prevs[x.id];
        const sub = x.feito ? (x.feitoEm ? `Concluído em ${dataCurta(x.feitoEm)}` : "") : x.total ? `${fmtN(l)} de ${fmtN(x.total)} ${esc(med || "páginas")}${pr ? ` · termina ~${dataCurta(pr)}` : ""}` : med ? `Toque no ⋮ para informar as ${esc(med)}` : "";
        return `<div class="linha-item${x.feito ? " feito" : ""}${x === atual ? " atual" : ""}"><button class="marca" data-item="${x.id}" aria-label="Marcar"><i>${x.feito ? ic("check") : ""}</i></button>
          <span class="t">${esc(x.texto)}${x === atual ? ' <span class="chip bom">lendo</span>' : ""}${sub ? `<small>${sub}</small>` : ""}${x.total && !x.feito ? `<span class="mini-trilho"><i style="width:${Math.min(100, (l / x.total) * 100).toFixed(1)}%"></i></span>` : ""}</span>
          <button class="rm" data-menu-item="${x.id}" aria-label="Opções de ${esc(x.texto)}">${ic("ellipsis-vertical")}</button></div>`; }).join("")}
      ${vagas ? `<div class="linha-item"><span class="marca"></span><span class="t vaga">Ainda ${vagas === 1 ? "falta 1 para escolher" : `faltam ${vagas} para escolher`}</span></div>` : ""}
      <form class="add-linha${med ? " duplo-inv" : ""}" data-add-item><input name="t" maxlength="120" placeholder="Adicionar ${esc(m.unidade ? m.unidade.replace(/s$/, "") : "item")}…" aria-label="Novo item" required>${med ? `<input name="tot" inputmode="numeric" placeholder="${esc(med)}" aria-label="${esc(med)}">` : ""}<button class="btn preto">${ic("plus")}</button></form>`;
  } else if (m.tipo === "valor" || m.tipo === "numero") {
    const din = m.tipo === "valor";
    corpo = blocoPlano("meta", m) + `<form class="add-linha duplo" data-add-reg><input name="v" inputmode="decimal" placeholder="${din ? "Valor" : "Quanto"}" aria-label="Valor" required><input name="n" maxlength="60" placeholder="Nota (opcional)" aria-label="Nota"><button class="btn preto">${ic("plus")}</button></form>
      <div class="sec"><span>${din ? "Depósitos" : "Registros"}</span><span>${m.regs.length}</span></div>
      ${m.regs.length ? m.regs.slice().reverse().map((r) => `<div class="linha-item"><span class="marca">${ic(din ? "coins" : "hash")}</span><span class="t">${esc(r.nota || (din ? "Depósito" : "Registro"))}<small>${dataCurta(r.data)}/${r.data.slice(0, 4)}</small></span><span class="val">${din ? fmtR(r.valor) : fmtN(r.valor) + " " + esc(m.unidade || "")}</span><button class="rm" data-menu-reg="${r.id}" aria-label="Opções">${ic("ellipsis-vertical")}</button></div>`).join("")
        : `<div class="vazio" style="padding:28px">${din ? "Registre cada valor que você guardar." : "Some cada avanço aqui."}</div>`}`;
  } else {
    corpo = `<div style="padding:20px 16px"><button class="btn ${m.feita ? "leve" : "preto"}" data-simples>${ic(m.feita ? "repeat" : "check")} ${m.feita ? "Reabrir meta" : "Marcar como concluída"}</button></div>`;
  }
  const falta = m.tipo === "valor" ? `Faltam ${fmtR(Math.max(0, m.alvo - p.feito))}` : m.tipo === "numero" ? `Faltam ${fmtN(Math.max(0, m.alvo - p.feito))} ${m.unidade || ""}` : m.tipo === "lista" ? `Faltam ${fmtN(Math.max(0, Math.round(m.alvo) - m.itens.filter((i) => i.feito).length))}` : "";
  const el = abrirCamada(`<header class="topo">
      <div class="topo-linha"><button class="bt-redondo" data-voltar aria-label="Voltar">${ic("chevron-left")}</button>
        <div class="tit"><b>${esc(m.titulo)}</b><small>${esc(c.nome)} · ${TIPOS[m.tipo]} · prazo ${dataBR(m.prazo)}</small></div>
        <button class="bt-redondo" data-editar aria-label="Editar meta">${ic("pencil")}</button></div>
      <div class="det-grande">${Math.round(p.pct * 100)}%</div>
      <div class="det-sub">${esc(p.rot)}${!p.completa && falta ? " · " + falta : p.completa ? " · Meta alcançada!" : ""}</div>
      <div class="trilho"><i style="width:${(p.pct * 100).toFixed(1)}%"></i>${!p.completa && m.tipo !== "simples" && fracaoPrazo(m) > 0 && fracaoPrazo(m) < 1 ? `<em style="left:${(fracaoPrazo(m) * 100).toFixed(1)}%"></em>` : ""}</div>
      ${!p.completa ? `<div class="det-prazo">${ic("calendar-clock")} ${textoPrazo(m, true)}${m.tipo !== "simples" && fracaoPrazo(m) > 0 && fracaoPrazo(m) < 1 ? ` · a marca na barra é onde você deveria estar hoje` : ""}</div>` : ""}
    </header><div class="corpo">${corpo}</div>`, { tela: true, aoFechar: desenhar, substituir, re: () => telaMeta(id, true) });
  const de_novo = () => telaMeta(id, true);
  $("[data-voltar]", el).onclick = () => fechar();
  $("[data-editar]", el).onclick = () => editarMeta(m);
  ligarBlocoPlano(el, "meta", m);
  $$("[data-item]", el).forEach((b) => (b.onclick = () => { const x = m.itens.find((i) => i.id === b.dataset.item); x.feito = !x.feito; x.feitoAuto = false; if (x.feito) x.feitoEm = hoje(); else delete x.feitoEm; const antes = p.completa; gravar(); de_novo(); if (!antes && progresso(m).completa) aviso("Meta alcançada! 🎉"); }));
  $$("[data-menu-item]", el).forEach((b) => (b.onclick = () => menuItem(m, m.itens.find((i) => i.id === b.dataset.menuItem))));
  $$("[data-menu-reg]", el).forEach((b) => (b.onclick = () => menuRegistro(m, m.regs.find((r) => r.id === b.dataset.menuReg))));
  const fi = $("[data-add-item]", el);
  if (fi) fi.onsubmit = (e) => { e.preventDefault(); const t = fi.t.value.trim(); if (!t) return; const tot = fi.tot ? Math.round(lerNumero(fi.tot.value)) : 0; m.itens.push({ id: novoId(), texto: t, feito: false, total: tot > 0 ? tot : 0, leituras: [] }); gravar(); de_novo(); setTimeout(() => { const f = $("[data-add-item] input"); f && f.focus(); }, 30); };
  const fr = $("[data-add-reg]", el);
  if (fr) fr.onsubmit = (e) => {
    e.preventDefault();
    const v = m.tipo === "valor" ? lerCentavos(fr.v.value) : lerNumero(fr.v.value);
    if (!Number.isFinite(v) || v === 0) return aviso("Digite um valor. Ex.: 250,00");
    const antes = p.completa; m.regs.push({ id: novoId(), valor: v, nota: fr.n.value.trim(), data: hoje() }); gravar(); de_novo();
    aviso(!antes && progresso(m).completa ? "Meta alcançada! 🎉" : m.tipo === "valor" ? `${fmtR(v)} guardados` : "Registrado");
  };
  const fs = $("[data-simples]", el);
  if (fs) fs.onclick = () => { m.feita = !m.feita; if (m.feita) m.feitaEm = hoje(); else delete m.feitaEm; gravar(); de_novo(); if (m.feita) aviso("Meta concluída! 🎉"); };
}

/* ---------- COMPRAS ---------- */
function linhaCompra(x) {
  const c = cat(x.cat), tot = totalCompra(x), g = guardadoCompra(x), plan = planosDe("compra", x.id).length;
  const d = x.prazo ? diffDias(hoje(), x.prazo) : null;
  return `<div class="afz compra${x.comprado ? " feito" : ""}">
    <button class="marca" data-comprar="${x.id}" aria-label="${x.comprado ? "Desmarcar" : "Marcar como comprado"}"><i>${x.comprado ? ic("check") : ""}</i></button>
    <button class="abrir" data-compra="${x.id}"><span class="meio"><div>${x.qtd > 1 ? `${fmtN(x.qtd)}× ` : ""}${esc(x.nome)}</div>
      <span class="info"><span><i class="pontinho" style="--cc:${c.cor}"></i>${esc(c.nome)}</span>${x.prazo && !x.comprado ? `<span class="${d < 0 ? "vencido" : ""}">${ic("calendar")}até ${dataCurta(x.prazo)}</span>` : ""}${x.nota ? `<span>${esc(x.nota)}</span>` : ""}</span>
      ${!x.comprado && (g || plan) && tot ? `<span class="guardado"><span class="mini-trilho"><i style="width:${Math.min(100, (g / tot) * 100).toFixed(1)}%"></i></span><small>${fmtR(g)} de ${fmtR(tot)} guardados${g >= tot ? " · pronto para comprar!" : ""}</small></span>` : ""}</span>
      ${tot ? `<span class="val">${fmtR(tot)}</span>` : ""}</button></div>`;
}
function atalhoCompras() {
  const pend = S.d.compras.filter((x) => !x.comprado);
  const total = pend.reduce((s, x) => s + (x.preco || 0) * (x.qtd || 1), 0);
  return `<button class="atalho" data-ver-compras><span class="bola">${ic("shopping-cart")}</span>
    <span class="meio"><b>Lista de compras</b><small>${pend.length ? `${pend.length} para comprar · ${fmtR(total)}` : "Nada pendente"}</small></span><span class="seta">${ic("chevron-right")}</span></button>`;
}
function abrirCompras(substituir = false) {
  const pend = S.d.compras.filter((x) => !x.comprado), feitas = S.d.compras.filter((x) => x.comprado);
  const total = pend.reduce((s, x) => s + (x.preco || 0) * (x.qtd || 1), 0);
  let corpo = "";
  if (pend.length) corpo += `<div class="sec"><span>Para comprar</span><span>${pend.length}</span></div>` + pend.map(linhaCompra).join("");
  else corpo += `<div class="vazio">${ic("shopping-cart")}Nada pendente na lista.</div>`;
  if (feitas.length) corpo += `<div class="sec"><span>Comprados</span><button data-limpar>Limpar comprados</button></div>` + feitas.map(linhaCompra).join("");
  const el = abrirCamada(`<header class="topo">
      <div class="topo-linha"><button class="bt-redondo" data-voltar aria-label="Voltar">${ic("chevron-left")}</button><div class="tit"><b>Compras</b><small>O que você precisa comprar</small></div>
        <button class="bt-redondo" data-nova-compra aria-label="Nova compra">${ic("plus")}</button></div>
      <div class="painel"><span class="bola" style="width:74px;height:74px;background:var(--vidro);color:var(--sobre-fundo)">${ic("shopping-bag")}</span>
        <div class="txt"><b class="num">${fmtR(total)}</b><span>${pend.length ? `estimado para ${pend.length} ${pend.length === 1 ? "item" : "itens"}` : "nenhum item pendente"}</span></div></div>
    </header><div class="corpo">${corpo}</div>`, { tela: true, aoFechar: desenhar, substituir, re: () => abrirCompras(true) });
  $("[data-voltar]", el).onclick = () => fechar();
  $("[data-nova-compra]", el).onclick = () => editarCompra();
  $$("[data-comprar]", el).forEach((b) => (b.onclick = () => {
    const x = S.d.compras.find((i) => i.id === b.dataset.comprar); x.comprado = !x.comprado;
    if (x.comprado) x.compradoEm = hoje(); else delete x.compradoEm;
    gravar(); abrirCompras(true);
  }));
  $$("[data-compra]", el).forEach((b) => (b.onclick = () => editarCompra(S.d.compras.find((i) => i.id === b.dataset.compra))));
  const l = $("[data-limpar]", el); if (l) l.onclick = () => {
    const n = feitas.length;
    // guarda o que foi comprado (para os relatórios) e tira da lista
    S.d.historicoCompras.push(...feitas.map((x) => ({ nome: x.nome, valor: (x.preco || 0) * (x.qtd || 1), cat: x.cat, data: x.compradoEm || hoje() })));
    S.d.compras = pend; gravar(); abrirCompras(true); aviso(`${n} ${n === 1 ? "item removido" : "itens removidos"} da lista`);
  };
}

/* ---------- ITENS E REGISTROS DAS METAS (menu ⋮) ---------- */
function menuAcoes(titulo, sub, aoEditar, aoExcluir, extra) {
  const el = abrirCamada(`<h2>${esc(titulo)}</h2>${sub ? `<p class="dica" style="text-align:center;margin-top:-8px">${esc(sub)}</p>` : ""}
    <div class="botoes">${extra ? `<button class="btn preto" data-extra>${ic(extra.ic)} ${esc(extra.rot)}</button>` : ""}<button class="btn leve" data-ed>${ic("pencil")} Editar</button><button class="btn perigo" data-ex>${ic("trash")} Excluir</button></div>`, { aoFechar: refrescar });
  if (extra) $("[data-extra]", el).onclick = extra.acao;
  $("[data-ed]", el).onclick = aoEditar;
  armar($("[data-ex]", el), aoExcluir);
}
function menuItem(m, x) {
  if (!x) return;
  const med = m.medida || "páginas", l = lidasItem(x);
  const extra = !x.feito && x.total ? { rot: `Registrar ${med} lidas`, ic: "book-open", acao: () => {
    const el = abrirCamada(`<h2>${esc(x.texto)}</h2><p class="dica" style="text-align:center;margin-top:-8px">${fmtN(l)} de ${fmtN(x.total)} ${esc(med)}</p><form data-f>
      <div class="dois"><label>Quantas ${esc(med)} hoje?<input name="q" inputmode="numeric" required></label><label>Dia<input type="date" name="d" value="${hoje()}"></label></div>
      <div class="botoes"><button class="btn preto">${ic("check")} Registrar</button></div></form>`, { aoFechar: refrescar, substituir: true });
    const f = $("[data-f]", el); f.q.focus();
    f.onsubmit = (e) => { e.preventDefault(); const q = Math.round(lerNumero(f.q.value)); if (!(q > 0)) return; x.leituras.push({ dia: f.d.value || hoje(), qtd: Math.min(q, x.total - l) }); if (lidasItem(x) >= x.total) { x.feito = true; x.feitoAuto = true; x.feitoEm = f.d.value || hoje(); } gravar(); fechar(); aviso(x.feito ? `Terminou “${x.texto}”! 📚` : `${fmtN(lidasItem(x))} de ${fmtN(x.total)} ${med}`); };
  } } : null;
  menuAcoes(x.texto, x.feito ? "Marcado como feito" : x.total ? `${fmtN(l)} de ${fmtN(x.total)} ${med}` : "", () => {
    const el = abrirCamada(`<h2>Editar ${esc(m.unidade ? m.unidade.replace(/s$/, "") : "item")}</h2><form data-f>
      <label>Nome<input name="t" maxlength="120" required value="${esc(x.texto)}"></label>
      ${m.medida ? `<div class="dois"><label>Total de ${esc(med)}<input name="tot" inputmode="numeric" value="${x.total || ""}"></label><label>Já ${med === "páginas" ? "lidas" : "feitas"}<input name="lid" inputmode="numeric" value="${l || ""}"></label></div>` : ""}
      <label class="marcar-linha"><input type="checkbox" name="feito" ${x.feito ? "checked" : ""}> Já foi feito</label>
      <div class="botoes"><button class="btn preto">${ic("check")} Salvar</button></div></form>`, { aoFechar: refrescar, substituir: true });
    const f = $("[data-f]", el); f.t.focus();
    f.onsubmit = (e) => {
      e.preventDefault(); const t = f.t.value.trim(); if (!t) return;
      x.texto = t;
      if (f.tot) {
        const tot = Math.round(lerNumero(f.tot.value)); x.total = tot > 0 ? tot : 0;
        const lid = Math.round(lerNumero(f.lid.value)) || 0;
        if (lid !== lidasItem(x)) { x.leituras = x.leituras.filter((r) => r.afz); const dif = lid - lidasItem(x); if (dif > 0) x.leituras.push({ dia: hoje(), qtd: dif }); }
      }
      const marcado = f.feito.checked || (x.total > 0 && lidasItem(x) >= x.total);
      if (marcado && !x.feito) x.feitoEm = hoje(); if (!marcado) delete x.feitoEm;
      x.feito = marcado; x.feitoAuto = false;
      gravar(); fechar(); aviso("Item atualizado");
    };
  }, () => { m.itens = m.itens.filter((i) => i.id !== x.id); gravar(); fechar(); aviso("Item excluído"); }, extra);
}
function menuRegistro(m, r) {
  if (!r) return;
  const din = m.tipo === "valor";
  const rot = din ? fmtR(r.valor) : `${fmtN(r.valor)} ${m.unidade || ""}`.trim();
  menuAcoes(rot, `${r.nota || (din ? "Depósito" : "Registro")} · ${dataCurta(r.data)}/${r.data.slice(0, 4)}`, () => {
    const el = abrirCamada(`<h2>Editar ${din ? "depósito" : "registro"}</h2><form data-f>
      <div class="dois"><label>${din ? "Valor (R$)" : "Quanto"}<input name="v" inputmode="decimal" required value="${din ? paraCampo(r.valor / 100) : paraCampo(r.valor)}"></label>
        <label>Dia<input type="date" name="d" required value="${r.data}"></label></div>
      <label>Nota<input name="n" maxlength="60" value="${esc(r.nota)}" placeholder="Opcional"></label>
      <div class="botoes"><button class="btn preto">${ic("check")} Salvar</button></div></form>`, { aoFechar: refrescar, substituir: true });
    const f = $("[data-f]", el);
    f.onsubmit = (e) => {
      e.preventDefault();
      const v = din ? lerCentavos(f.v.value) : lerNumero(f.v.value);
      if (!Number.isFinite(v) || v === 0) return aviso("Digite um valor. Ex.: 250,00");
      Object.assign(r, { valor: v, data: f.d.value || r.data, nota: f.n.value.trim() });
      m.regs.sort((x, y) => x.data.localeCompare(y.data)); gravar(); fechar(); aviso("Registro atualizado");
    };
  }, () => { m.regs = m.regs.filter((i) => i.id !== r.id); gravar(); fechar(); aviso("Registro excluído"); });
}

/* ---------- PLANOS (afazer ligado a uma meta ou compra) ---------- */
// a.liga = { tipo: "meta" | "compra", id, qtd }  → ao marcar o afazer como feito, soma qtd no alvo
const alvoLiga = (a) => !a.liga ? null : a.liga.tipo === "compra" ? S.d.compras.find((x) => x.id === a.liga.id) : S.d.metas.find((x) => x.id === a.liga.id);
const totalCompra = (x) => (x.preco || 0) * (x.qtd || 1);
const guardadoCompra = (x) => (x.regs || []).reduce((s, r) => s + (r.valor || 0), 0);
function ligaConcluida(a) {
  const o = alvoLiga(a); if (!o) return false;
  if (a.liga.tipo === "compra") return o.comprado || (totalCompra(o) > 0 && guardadoCompra(o) >= totalCompra(o));
  return progresso(o).completa;
}
function qtdTexto(tipo, m, q) {
  if (tipo === "compra" || (m && m.tipo === "valor")) return fmtR(q);
  if (m && m.tipo === "lista") return `${fmtN(q)} ${m.medida || "páginas"}`;
  return `${fmtN(q)} ${(m && m.unidade) || ""}`.trim();
}
function rotuloLiga(a) {
  const o = alvoLiga(a); if (!o) return "";
  return `+${qtdTexto(a.liga.tipo, a.liga.tipo === "meta" ? o : null, a.liga.qtd)} · ${a.liga.tipo === "compra" ? o.nome : o.titulo}`;
}
// marca/desmarca o afazer: soma ou tira a contribuição no alvo. Devolve uma mensagem.
function contribuir(a, d, on) {
  const o = alvoLiga(a); if (!o) return "";
  const q = a.liga.qtd || 0;
  if (a.liga.tipo === "compra") {
    o.regs = (o.regs || []).filter((r) => !(r.afz === a.id && r.data === d));
    if (!on) return "";
    o.regs.push({ id: novoId(), valor: q, data: d, afz: a.id, nota: a.titulo });
    const g = guardadoCompra(o), t = totalCompra(o);
    return t && g >= t ? `Dinheiro completo para comprar ${o.nome}! 🎉` : `${fmtR(q)} guardados para ${o.nome}`;
  }
  const m = o, antes = progresso(m).completa;
  if (m.tipo === "valor" || m.tipo === "numero") {
    m.regs = m.regs.filter((r) => !(r.afz === a.id && r.data === d));
    if (on) m.regs.push({ id: novoId(), valor: q, nota: a.titulo, data: d, afz: a.id });
  } else if (m.tipo === "lista") {
    for (const it of m.itens) {
      const n0 = it.leituras.length;
      it.leituras = it.leituras.filter((l) => !(l.afz === a.id && l.dia === d));
      if (it.leituras.length !== n0 && it.feitoAuto && lidasItem(it) < it.total) { it.feito = false; it.feitoAuto = false; delete it.feitoEm; }
    }
    if (on) {
      let resto = q; const terminou = [];
      while (resto > 0) {
        const it = m.itens.find((i) => !i.feito && i.total > 0); if (!it) break;
        const parte = Math.min(resto, it.total - lidasItem(it));
        it.leituras.push({ dia: d, qtd: parte, afz: a.id }); resto -= parte;
        if (lidasItem(it) >= it.total) { it.feito = true; it.feitoAuto = true; it.feitoEm = d; terminou.push(it.texto); }
      }
      if (resto === q) return `Cadastre as ${m.medida || "páginas"} de um ${(m.unidade || "item").replace(/s$/, "")} em "${m.titulo}" para contar.`;
      if (terminou.length) return `Terminou “${terminou[terminou.length - 1]}”! 📚`;
      const atual = m.itens.find((i) => !i.feito && i.total > 0);
      if (atual) return `+${fmtN(q - resto)} ${m.medida || "páginas"} em “${atual.texto}” (${fmtN(lidasItem(atual))} de ${fmtN(atual.total)})`;
    }
  }
  if (on && !antes && progresso(m).completa) return "Meta alcançada! 🎉";
  return on ? `+${qtdTexto("meta", m, q)} em ${m.titulo}` : "";
}
// quanto falta para concluir (na mesma unidade do plano)
function faltaAlvo(tipo, o) {
  if (tipo === "compra") return Math.max(0, totalCompra(o) - guardadoCompra(o));
  if (o.tipo === "lista") return o.itens.filter((i) => !i.feito && i.total > 0).reduce((s, i) => s + i.total - lidasItem(i), 0);
  const p = progresso(o); return Math.max(0, p.alvo - p.feito);
}
const prazoAlvo = (tipo, o) => (tipo === "compra" ? o.prazo || null : o.prazo);
// conta quantas vezes um plano acontece entre duas datas
function ocorrencias(plano, de, ate) {
  let n = 0; for (let d = de, i = 0; d <= ate && i < 4000; d = somaDias(d, 1), i++) if (repeteNoDia(plano, d)) n++;
  return n;
}
// simula os planos ligados (a partir de amanhã, ou de hoje se ainda não marcou) e diz quando chega em "falta"
function previsaoPlanos(planos, falta, extra) {
  if (falta <= 0) return hoje();
  const todos = planos.concat(extra ? [extra] : []);
  if (!todos.length) return null;
  let s = 0;
  for (let d = hoje(), i = 0; i < 3660; d = somaDias(d, 1), i++) {
    for (const p of todos) if (repeteNoDia(p, d) && !(p.feitos && p.feitos[d])) s += p.liga ? p.liga.qtd : p.qtd;
    if (s >= falta) return d;
  }
  return null;
}
const planosDe = (tipo, id) => S.d.afazeres.filter((a) => a.liga && a.liga.tipo === tipo && a.liga.id === id && (!a.ate || a.ate >= hoje()));
// previsão do livro em que cada item termina, seguindo os planos de leitura
function previsaoItens(m) {
  const planos = planosDe("meta", m.id), res = {};
  if (!planos.length) return res;
  const fila = m.itens.filter((i) => !i.feito && i.total > 0).map((i) => ({ id: i.id, falta: i.total - lidasItem(i) }));
  let k = 0;
  for (let d = hoje(), n = 0; k < fila.length && n < 3660; d = somaDias(d, 1), n++) {
    let q = 0; for (const p of planos) if (repeteNoDia(p, d) && !p.feitos[d]) q += p.liga.qtd;
    while (q > 0 && k < fila.length) { const u = Math.min(q, fila[k].falta); fila[k].falta -= u; q -= u; if (fila[k].falta <= 0) { res[fila[k].id] = d; k++; } }
  }
  return res;
}
const descPlano = (a) => `${rotuloRepete(a)}${a.hora ? " às " + a.hora : ""}`;
function proximaVez(a) { for (let d = hoje(), i = 0; i < 400; d = somaDias(d, 1), i++) if (repeteNoDia(a, d) && !a.feitos[d]) return d; return null; }
// bloco "Plano" dentro da meta ou da compra
function blocoPlano(tipo, o) {
  const planos = planosDe(tipo, o.id);
  const falta = faltaAlvo(tipo, o), prazo = prazoAlvo(tipo, o);
  const prev = previsaoPlanos(planos, falta);
  let txt = "";
  if (planos.length && falta > 0) {
    const cad = tipo === "meta" && o.tipo === "lista" ? o.itens.filter((i) => !i.feito && i.total > 0).length : 0;
    txt = prev ? (cad ? `Seguindo o plano, termina ${cad === 1 ? `o ${(o.unidade || "item").replace(/s$/, "")} cadastrado` : `os ${cad} ${o.unidade || "itens"} cadastrados`} em <b>${dataBR(prev)}</b>` : `Seguindo o plano, você chega lá em <b>${dataBR(prev)}</b>`) : "Com esse plano, não dá para chegar lá";
    if (prazo && prev) txt += prev <= prazo ? ` <span class="chip ok">antes do prazo</span>` : ` <span class="chip ruim">depois do prazo (${dataBR(prazo)})</span>`;
  }
  const semMedida = tipo === "meta" && o.tipo === "lista" && !o.itens.some((i) => !i.feito && i.total > 0);
  return `<div class="plano"><div class="plano-cab"><b>${ic("calendar-clock")} Plano</b><button class="btn preto" data-novo-plano>${ic("plus")} ${planos.length ? "Outro plano" : "Criar plano"}</button></div>
    ${planos.length ? planos.map((a) => { const pv = proximaVez(a); return `<button class="plano-l" data-plano="${a.id}"><span class="meio"><b>${esc(a.titulo)}</b><small>${descPlano(a)} · +${qtdTexto(tipo, tipo === "meta" ? o : null, a.liga.qtd)} cada vez${pv ? ` · próximo: ${dataCurta(pv)}` : ""}</small></span>${ic("chevron-right")}</button>`; }).join("")
      : `<p class="dica" style="margin:6px 0 0">${tipo === "compra" ? "Crie um afazer, por exemplo “guardar R$ 50 toda sexta”. Cada vez que marcar como feito, o valor entra aqui." : o.tipo === "lista" ? `Crie um afazer, por exemplo “ler 20 ${o.medida || "páginas"} por dia”. Cada vez que marcar como feito, soma no ${(o.unidade || "item").replace(/s$/, "")} atual.` : "Crie um afazer que se repete, por exemplo “guardar R$ 500 todo dia 5”. Cada vez que marcar como feito, o valor entra na meta."}</p>`}
    ${semMedida ? `<p class="dica" style="margin:8px 0 0">Para o plano contar, informe as <b>${o.medida || "páginas"}</b> de cada ${(o.unidade || "item").replace(/s$/, "")} (toque no ⋮ → Editar).</p>` : ""}
    ${txt ? `<p class="plano-prev">${txt}</p>` : ""}</div>`;
}
function ligarBlocoPlano(el, tipo, o) {
  const b = $("[data-novo-plano]", el); if (b) b.onclick = () => abrirPlano(tipo, o);
  $$("[data-plano]", el).forEach((x) => (x.onclick = () => editarAfazer(S.d.afazeres.find((a) => a.id === x.dataset.plano))));
}
// assistente: cria o afazer do plano, sugere quanto por vez e mostra se chega no prazo
function abrirPlano(tipo, o) {
  const m = tipo === "meta" ? o : null;
  const nome = tipo === "compra" ? o.nome : o.titulo;
  const din = tipo === "compra" || m.tipo === "valor", lista = m && m.tipo === "lista";
  const unid = din ? "R$" : lista ? (m.medida || "páginas") : (m.unidade || "");
  const prazo = prazoAlvo(tipo, o);
  const e = { repete: din ? "mensal" : "diario" };
  const verbo = din ? "Guardar" : lista ? "Ler" : "";
  const el = abrirCamada(`<h2>Plano para: ${esc(nome)}</h2>
    <p class="dica" style="text-align:center;margin-top:-8px">${esc(tipo === "compra" ? `Faltam ${fmtR(faltaAlvo(tipo, o))}` : progresso(o).rot)}${prazo ? ` · prazo ${dataBR(prazo)}` : ""}</p>
    <form data-f>
      <span class="rot">Com que frequência?</span>
      <div class="seletor" style="--n:4;margin-bottom:12px">${[["diario", "Todo dia"], ["util", "Seg a sex"], ["semanal", "Semanal"], ["mensal", "Mensal"]].map(([k, v]) => `<button type="button" data-rep="${k}" class="${k === e.repete ? "sel" : ""}">${v}</button>`).join("")}</div>
      <label data-c-mensal>Em que dia do mês? <small style="color:var(--cinza)">(ex.: dia do salário)</small><input name="diaMes" type="number" min="1" max="31" value="5"></label>
      <label data-c-semanal>Em que dia da semana?<select name="diaSem">${DIAS.map((n, i) => `<option value="${i}" ${i === 5 ? "selected" : ""}>${n.charAt(0).toUpperCase() + n.slice(1)}</option>`).join("")}</select></label>
      <div class="dois"><label>${din ? "Quanto guardar cada vez (R$)" : `Quanto cada vez (${esc(unid)})`}<input name="qtd" inputmode="decimal" required></label>
        <label>Horário (opcional)<input type="time" name="hora"></label></div>
      <p class="sugestao" data-sug></p>
      <label>Nome do afazer<input name="titulo" maxlength="120" required></label>
      <p class="plano-prev" data-prev></p>
      <div class="botoes"><button class="btn preto">${ic("check")} Criar plano</button></div>
    </form>`);
  const f = $("[data-f]", el);
  let tituloTocado = false;
  f.titulo.oninput = () => (tituloTocado = true);
  // monta o plano a partir do formulário
  const montar = () => {
    let data = hoje();
    if (e.repete === "semanal") { const w = Number(f.diaSem.value); for (let i = 0; i < 7; i++) { const d = somaDias(hoje(), i); if (diaSemana(d) === w) { data = d; break; } } }
    if (e.repete === "mensal") { const dd = Math.max(1, Math.min(31, Number(f.diaMes.value) || 1)); const x = dataDe(data); data = `${x.getFullYear()}-${p2(x.getMonth() + 1)}-${p2(Math.min(dd, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()))}`; if (data < hoje()) { const y = new Date(x.getFullYear(), x.getMonth() + 1, 1); data = `${y.getFullYear()}-${p2(y.getMonth() + 1)}-${p2(Math.min(dd, new Date(y.getFullYear(), y.getMonth() + 1, 0).getDate()))}`; } }
    if (e.repete === "util") { for (let i = 0; i < 7; i++) { const d = somaDias(hoje(), i), w = diaSemana(d); if (w >= 1 && w <= 5) { data = d; break; } } }
    const q = din ? lerCentavos(f.qtd.value) : lerNumero(f.qtd.value);
    return { repete: e.repete, data, qtd: Number.isFinite(q) ? q : 0, feitos: {} };
  };
  const atualizar = () => {
    $("[data-c-mensal]", el).hidden = e.repete !== "mensal";
    $("[data-c-semanal]", el).hidden = e.repete !== "semanal";
    $$("[data-rep]", el).forEach((b) => b.classList.toggle("sel", b.dataset.rep === e.repete));
    const p = montar(), falta = faltaAlvo(tipo, o);
    // sugestão: quanto por vez para terminar no prazo
    let sug = 0;
    if (prazo && prazo >= hoje() && falta > 0) { const n = ocorrencias(p, p.data, prazo); if (n > 0) sug = din ? Math.ceil(falta / n / 100) * 100 : Math.ceil((falta / n) * 10) / 10; }
    $("[data-sug]", el).innerHTML = sug ? `Para terminar no prazo: <b>${din ? fmtR(sug) : fmtN(sug) + " " + esc(unid)}</b> cada vez. <button type="button" data-usar>Usar</button>` : !prazo ? "Sem data definida: escolha o valor que cabe no seu bolso." : falta <= 0 ? (lista ? `Cadastre as ${esc(unid)} dos ${esc(m.unidade || "itens")} para calcular.` : "Já está completo.") : "";
    const u = $("[data-usar]", el); if (u) u.onclick = () => { f.qtd.value = din ? paraCampo(sug / 100) : paraCampo(sug); atualizar(); };
    if (!tituloTocado) f.titulo.value = p.qtd ? `${verbo ? verbo + " " : ""}${din ? fmtR(p.qtd).replace(",00", "") : fmtN(p.qtd) + " " + unid}${din && tipo === "compra" ? " para " + nome : " · " + nome}` : `${verbo ? verbo + " · " : ""}${nome}`;
    const prev = p.qtd > 0 ? previsaoPlanos(planosDe(tipo, o.id), falta, p) : null;
    $("[data-prev]", el).innerHTML = p.qtd > 0 && falta > 0 ? (prev ? `Assim você chega lá em <b>${dataBR(prev)}</b>${prazo ? (prev <= prazo ? ` <span class="chip ok">antes do prazo</span>` : ` <span class="chip ruim">depois do prazo</span>`) : ""}` : "Com esse valor, leva mais de 10 anos.") : "";
  };
  $$("[data-rep]", el).forEach((b) => (b.onclick = () => { e.repete = b.dataset.rep; atualizar(); }));
  f.qtd.oninput = atualizar; f.diaMes.oninput = atualizar; f.diaSem.onchange = atualizar;
  atualizar();
  f.onsubmit = (ev) => {
    ev.preventDefault();
    const p = montar(); if (!(p.qtd > 0)) return aviso("Informe quanto cada vez.");
    const hora = f.hora.value || "";
    S.d.afazeres.push({ id: novoId(), titulo: f.titulo.value.trim() || nome, data: p.data, hora, repete: p.repete, aviso: hora ? 0 : null, cat: o.cat, feitos: {}, liga: { tipo, id: o.id, qtd: p.qtd }, ate: prazo || null });
    gravar(); fechar(); aviso("Plano criado. Ele aparece nos afazeres do dia.");
  };
}

/* ---------- RELATÓRIOS ---------- */
const MES3 = MESES.map((m) => m.slice(0, 3));
const DIA1 = ["D", "S", "T", "Q", "Q", "S", "S"];
function periodo(ref = S.rel.ref, modo = S.rel.modo) {
  const d = dataDe(ref);
  if (modo === "semana") { const ini = somaDias(ref, -((d.getDay() + 6) % 7)); return { ini, fim: somaDias(ini, 6) }; }
  if (modo === "mes") { const ini = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-01`; return { ini, fim: isoDe(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }; }
  return { ini: `${d.getFullYear()}-01-01`, fim: `${d.getFullYear()}-12-31` };
}
function rotuloPeriodo() {
  const { modo, ref } = S.rel, { ini, fim } = periodo(), d = dataDe(ref);
  if (modo === "semana") { const a = dataDe(ini), b = dataDe(fim); return `${a.getDate()} ${MES3[a.getMonth()]} – ${b.getDate()} ${MES3[b.getMonth()]}`; }
  if (modo === "mes") return `${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  return String(d.getFullYear());
}
function moverPeriodo(n) {
  const { modo, ref } = S.rel, d = dataDe(ref);
  if (modo === "semana") S.rel.ref = somaDias(ref, 7 * n);
  else if (modo === "mes") S.rel.ref = isoDe(new Date(d.getFullYear(), d.getMonth() + n, 1));
  else S.rel.ref = `${d.getFullYear() + n}-01-01`;
}
// total e feitos de cada dia do período (só até hoje)
function diasDoPeriodo(ref, modo) {
  const { ini, fim } = periodo(ref, modo), h = hoje(), dias = [];
  for (let iso = ini; iso <= fim; iso = somaDias(iso, 1)) {
    if (iso > h) { dias.push({ iso, futuro: true, total: 0, feitos: 0 }); continue; }
    const l = afazeresDoDia(iso);
    dias.push({ iso, total: l.length, feitos: l.filter((a) => a.feitos[iso]).length, lista: l });
  }
  return dias;
}
function sequenciaAtual() {
  let n = 0, iso = hoje();
  const lh = afazeresDoDia(iso);
  if (!lh.length || lh.some((a) => !a.feitos[iso])) iso = somaDias(iso, -1); // hoje ainda não terminou
  for (let i = 0; i < 400; i++, iso = somaDias(iso, -1)) {
    const l = afazeresDoDia(iso);
    if (!l.length) { if (!S.d.afazeres.some((a) => a.data <= iso)) break; continue; }
    if (l.every((a) => a.feitos[iso])) n++; else break;
  }
  return n;
}
function graficoSemana(dias) {
  const max = Math.max(1, ...dias.map((d) => d.total)), h = hoje();
  return `<div class="g-semana">${dias.map((d) => {
    const w = diaSemana(d.iso);
    return `<div class="g-col${d.iso === h ? " hoje" : ""}"><span class="g-n">${d.futuro || !d.total ? "" : `${d.feitos}/${d.total}`}</span>
      <span class="g-trilho" style="height:${(d.total / max) * 100}%"><i style="height:${d.total ? (d.feitos / d.total) * 100 : 0}%"></i></span>
      <small>${DIA1[w]}<br>${dataDe(d.iso).getDate()}</small></div>`;
  }).join("")}</div>`;
}
function graficoMes(dias) {
  const vazio = (dataDe(dias[0].iso).getDay() + 6) % 7, h = hoje();
  const nivel = (d) => d.futuro ? "fut" : !d.total ? "n0" : d.feitos === d.total ? "n4" : d.feitos / d.total >= 0.5 ? "n3" : d.feitos ? "n2" : "n1";
  return `<div class="calor">${["S", "T", "Q", "Q", "S", "S", "D"].map((x) => `<span class="calor-cab">${x}</span>`).join("")}
    ${"<span></span>".repeat(vazio)}${dias.map((d) => `<span class="calor-d ${nivel(d)}${d.iso === h ? " hoje" : ""}" title="${d.total ? `${d.feitos} de ${d.total}` : "sem afazeres"}">${dataDe(d.iso).getDate()}</span>`).join("")}</div>
    <div class="calor-leg"><span>Nada feito</span><i class="n1"></i><i class="n2"></i><i class="n3"></i><i class="n4"></i><span>Tudo feito</span></div>`;
}
function graficoAno(dias) {
  const meses = Array.from({ length: 12 }, () => ({ total: 0, feitos: 0, fut: true }));
  for (const d of dias) { const m = meses[dataDe(d.iso).getMonth()]; if (!d.futuro) { m.fut = false; m.total += d.total; m.feitos += d.feitos; } }
  const mesAt = new Date().getMonth(), anoAt = new Date().getFullYear(), anoP = dataDe(S.rel.ref).getFullYear();
  return `<div class="g-semana g-ano">${meses.map((m, i) => {
    const pct = m.total ? m.feitos / m.total : 0;
    return `<div class="g-col${anoP === anoAt && i === mesAt ? " hoje" : ""}"><span class="g-n">${m.total ? Math.round(pct * 100) + "%" : ""}</span>
      <span class="g-trilho" style="height:100%"><i style="height:${pct * 100}%"></i></span><small>${MES3[i].charAt(0).toUpperCase()}</small></div>`;
  }).join("")}</div>`;
}
function rosca(fatias, total) {
  const r = 42, C = 2 * Math.PI * r; let acc = 0;
  const arcos = fatias.map((f) => { const len = (f.n / total) * C; const s = `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${f.cor}" stroke-width="16" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 60 60)"/>`; acc += len; return s; }).join("");
  return `<svg viewBox="0 0 120 120" class="rosca" aria-hidden="true"><circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--cinza-claro)" stroke-width="16"/>${arcos}
    <text x="60" y="58" text-anchor="middle" class="rosca-n">${total}</text><text x="60" y="74" text-anchor="middle" class="rosca-t">feitos</text></svg>`;
}
// necessidade até o prazo, na unidade que faz sentido (por mês, semana ou dia)
function necessidade(m, falta) {
  const dias = diasAtePrazo(m) + 1; if (dias <= 0 || falta <= 0) return "";
  const [div, per] = dias > 62 ? [dias / 30.44, "mês"] : dias > 14 ? [dias / 7, "semana"] : [dias, "dia"];
  const q = falta / Math.max(div, 1);
  if (m.tipo === "valor") return `${fmtR(Math.ceil(q / 100) * 100)} por ${per}`;
  const r = Math.ceil(q * 10) / 10, u = m.tipo === "lista" ? (m.unidade || "itens") : (m.unidade || "");
  return `${fmtN(r)} ${r === 1 ? u.replace(/s$/, "") : u} por ${per}`.trim();
}
function ritmoMeta(m) {
  const p = progresso(m), esp = fracaoPrazo(m), d = diasAtePrazo(m);
  let st, cls;
  if (p.completa) { st = "Concluída"; cls = "ok"; }
  else if (d < 0) { st = "Prazo vencido"; cls = "ruim"; }
  else if (hoje() < m.inicio) { st = `Começa ${dataCurta(m.inicio)}`; cls = "neutro"; }
  else if (m.tipo === "simples") { st = d <= 7 ? "Prazo chegando" : "Em aberto"; cls = d <= 7 ? "amar" : "neutro"; }
  else if (p.pct >= esp + 0.08) { st = "Adiantada"; cls = "ok"; }
  else if (p.pct >= esp - 0.08) { st = "No ritmo"; cls = "bom"; }
  else { st = "Atrasada"; cls = "ruim"; }
  // previsão: pelo plano, se houver; senão, pelo ritmo de até agora
  let prev = "";
  if (!p.completa && m.tipo !== "simples" && d >= 0) {
    const planos = planosDe("meta", m.id);
    const falta = m.tipo === "lista" ? Math.max(0, p.alvo - p.feito) : Math.max(0, p.alvo - p.feito);
    if (planos.length && (m.tipo !== "lista" || m.itens.some((i) => !i.feito && i.total > 0))) {
      const dt = previsaoPlanos(planos, faltaAlvo("meta", m));
      if (dt && m.tipo !== "lista") prev = dt <= m.prazo ? `Com o plano, termina em ${dataBR(dt)}` : `Com o plano, só termina em ${dataBR(dt)}. Precisa de ${necessidade(m, falta)}`;
      else if (m.tipo === "lista") prev = `Plano ativo · precisa de ${necessidade(m, falta)}`;
    } else {
      const decorridos = diffDias(m.inicio, hoje());
      if (decorridos >= 7 && p.feito > 0) {
        const porDia = p.feito / decorridos, dt = somaDias(hoje(), Math.ceil(falta / porDia));
        prev = dt <= m.prazo ? `No ritmo atual, termina em ${dataBR(dt)}` : `No ritmo atual, não chega no prazo. Precisa de ${necessidade(m, falta)}`;
      } else prev = `Precisa de ${necessidade(m, falta)} até ${dataBR(m.prazo)}`;
    }
  }
  return { p, esp, st, cls, prev, d };
}
// conquistas no período: livros terminados, metas concluídas, dinheiro guardado, compras feitas
function conquistas(ini, fim) {
  const ev = [], noPer = (x) => x && x >= ini && x <= fim;
  for (const m of S.d.metas) {
    const dc = dataConclusao(m);
    if (noPer(dc)) ev.push({ d: dc, ic: "trophy", t: `Meta concluída: ${m.titulo}` });
    if (m.tipo === "lista") m.itens.forEach((i) => { if (i.feito && noPer(i.feitoEm)) ev.push({ d: i.feitoEm, ic: "book-open", t: `Terminou “${i.texto}”` }); });
    if (m.tipo === "valor" || m.tipo === "numero") {
      const regs = m.regs.filter((r) => noPer(r.data)); if (!regs.length) continue;
      const s = regs.reduce((x, r) => x + (r.valor || 0), 0), ult = regs.map((r) => r.data).sort().pop();
      ev.push({ d: ult, ic: m.tipo === "valor" ? "piggy-bank" : "trending-up", t: m.tipo === "valor" ? `Guardou ${fmtR(s)} em ${m.titulo}` : `+${fmtN(s)} ${m.unidade || ""} em ${m.titulo}` });
    }
  }
  for (const x of S.d.compras) if (x.comprado && noPer(x.compradoEm)) ev.push({ d: x.compradoEm, ic: "shopping-bag", t: `Comprou ${x.nome}` });
  for (const x of S.d.historicoCompras) if (noPer(x.data)) ev.push({ d: x.data, ic: "shopping-bag", t: `Comprou ${x.nome}` });
  return ev.sort((a, b) => b.d.localeCompare(a.d));
}
function telaRelatorios() {
  const { modo } = S.rel, { ini, fim } = periodo();
  const nomePer = modo === "semana" ? "semana" : modo === "mes" ? "mês" : "ano";
  const naPer = modo === "semana" ? "na semana" : modo === "mes" ? "no mês" : "no ano";
  const ehAtual = ini <= hoje() && hoje() <= fim;
  // ----- afazeres -----
  const dias = diasDoPeriodo(), passados = dias.filter((d) => !d.futuro);
  const total = passados.reduce((s, d) => s + d.total, 0), feitos = passados.reduce((s, d) => s + d.feitos, 0);
  const pct = total ? feitos / total : 0, perfeitos = passados.filter((d) => d.total && d.feitos === d.total).length;
  const refAnt = modo === "semana" ? somaDias(S.rel.ref, -7) : modo === "mes" ? isoDe(new Date(dataDe(ini).getFullYear(), dataDe(ini).getMonth() - 1, 1)) : `${Number(ini.slice(0, 4)) - 1}-01-01`;
  const ant = diasDoPeriodo(refAnt).filter((d) => !d.futuro), tAnt = ant.reduce((s, d) => s + d.total, 0), fAnt = ant.reduce((s, d) => s + d.feitos, 0);
  const dif = total && tAnt ? Math.round((pct - fAnt / tAnt) * 100) : null;
  const seq = sequenciaAtual();
  // hábitos: afazeres que se repetem, com % no período
  const habitos = S.d.afazeres.filter((a) => a.repete !== "nao").map((a) => {
    const ds = passados.filter((d) => (d.lista || []).includes(a));
    return { a, ds, n: ds.length, f: ds.filter((d) => a.feitos[d.iso]).length };
  }).filter((h) => h.n).sort((x, y) => y.n - x.n || y.f / y.n - x.f / x.n).slice(0, 4);
  // ----- metas -----
  const metasAbertas = S.d.metas.filter((m) => !progresso(m).completa && m.prazo >= ini && (m.inicio <= fim || planosDe("meta", m.id).length));
  const ritmos = metasAbertas.map((m) => ({ m, r: ritmoMeta(m) }));
  const ord = { ruim: 0, amar: 1, bom: 2, neutro: 3, ok: 4 };
  ritmos.sort((x, y) => ord[x.r.cls] - ord[y.r.cls] || x.m.prazo.localeCompare(y.m.prazo));
  const concluidasPer = S.d.metas.filter((m) => { const dc = dataConclusao(m); return dc && dc >= ini && dc <= fim; });
  const cont = { ok: 0, bom: 0, ruim: 0 }; ritmos.forEach(({ r }) => { if (r.cls === "ruim") cont.ruim++; else if (r.cls === "ok" || r.cls === "bom") cont.bom++; });
  // ----- compras -----
  const noPer = (x) => x && x >= ini && x <= fim;
  const comprados = [...S.d.compras.filter((x) => x.comprado && noPer(x.compradoEm)).map((x) => totalCompra(x)), ...S.d.historicoCompras.filter((x) => noPer(x.data)).map((x) => x.valor)];
  const gasto = comprados.reduce((s, v) => s + v, 0);
  const pend = S.d.compras.filter((x) => !x.comprado), pendTot = pend.reduce((s, x) => s + totalCompra(x), 0);
  const planejadas = pend.filter((x) => totalCompra(x) && (guardadoCompra(x) || planosDe("compra", x.id).length || x.prazo)).slice(0, 3);
  const guardadoPer = S.d.compras.reduce((s, x) => s + (x.regs || []).filter((r) => noPer(r.data)).reduce((t, r) => t + r.valor, 0), 0);
  // ----- frase de resumo -----
  const frases = [];
  if (total) frases.push(`Você fez <b>${Math.round(pct * 100)}%</b> dos afazeres ${naPer}${dif !== null && dif !== 0 ? `, <b>${Math.abs(dif)} pontos ${dif > 0 ? "a mais" : "a menos"}</b> que ${modo === "semana" ? "na semana passada" : modo === "mes" ? "no mês passado" : "no ano passado"}` : ""}.`);
  const atras = ritmos.filter(({ r }) => r.cls === "ruim");
  if (atras.length) frases.push(`Atenção: <b>${esc(atras[0].m.titulo)}</b> ${atras[0].r.d < 0 ? "passou do prazo" : "está atrasada"}${atras.length > 1 ? ` (e mais ${atras.length - 1})` : ""}.`);
  else if (ritmos.length) frases.push("Suas metas estão no ritmo. 👏");
  if (concluidasPer.length) frases.push(`${concluidasPer.length === 1 ? "1 meta concluída" : concluidasPer.length + " metas concluídas"} ${naPer}! 🎉`);
  const proxCompra = planejadas.find((x) => guardadoCompra(x) < totalCompra(x));
  if (proxCompra) frases.push(`Faltam <b>${fmtR(totalCompra(proxCompra) - guardadoCompra(proxCompra))}</b> para comprar ${esc(proxCompra.nome)}.`);
  const eventos = conquistas(ini, fim).slice(0, 5);

  let corpo = "";
  // AFAZERES
  corpo += `<section class="rel-bloco"><h3>${ic("calendar")} Afazeres</h3>
    <div class="rel-tres">
      <div><b>${total ? Math.round(pct * 100) + "%" : "—"}</b><span>feitos${dif ? ` <em class="${dif > 0 ? "sobe" : "desce"}">${dif > 0 ? "▲" : "▼"}${Math.abs(dif)}</em>` : ""}</span></div>
      <div><b>${seq ? "🔥 " + seq : "0"}</b><span>${seq === 1 ? "dia seguido" : "dias seguidos"} com tudo feito</span></div>
      <div><b>${perfeitos}</b><span>${perfeitos === 1 ? "dia perfeito" : "dias perfeitos"} ${naPer}</span></div>
    </div>
    ${total ? (modo === "semana" ? graficoSemana(dias) : modo === "mes" ? graficoMes(dias) : graficoAno(dias)) : `<p class="rel-vazio">Nenhum afazer ${naPer}.</p>`}
    ${habitos.length ? `<h4>Hábitos</h4>${habitos.map(({ a, ds, n, f }) => { const pc = f / n; return `<div class="hab"><div class="hab-l1"><span>${esc(a.titulo)}</span><span class="chip ${pc >= 0.8 ? "ok" : pc >= 0.5 ? "amar" : "ruim"}">${Math.round(pc * 100)}%</span></div>
      ${modo !== "ano" ? `<div class="pontos">${ds.map((d) => `<i class="${a.feitos[d.iso] ? "f" : "x"}"></i>`).join("")}</div>` : ""}<small>${f} de ${n} ${n === 1 ? "vez" : "vezes"}</small></div>`; }).join("")}` : ""}
  </section>`;
  // METAS
  corpo += `<section class="rel-bloco"><h3>${ic("target")} Metas</h3>
    ${ritmos.length || concluidasPer.length ? `<div class="rel-chips"><span class="chip bom">${cont.bom} no ritmo</span><span class="chip ruim">${cont.ruim} ${cont.ruim === 1 ? "atrasada" : "atrasadas"}</span><span class="chip ok">${concluidasPer.length} ${concluidasPer.length === 1 ? "concluída" : "concluídas"} ${naPer}</span></div>` : ""}
    ${ritmos.length ? ritmos.slice(0, 6).map(({ m, r }) => `<button class="ritmo" data-meta-rel="${m.id}" style="--cc:${cat(m.cat).cor}">
      <span class="ritmo-l1"><b>${esc(m.titulo)}</b><span class="chip ${r.cls}">${r.st}</span></span>
      <span class="ritmo-barra"><i style="width:${(r.p.pct * 100).toFixed(1)}%"></i>${r.esp > 0 && r.esp < 1 && m.tipo !== "simples" ? `<em style="left:${(r.esp * 100).toFixed(1)}%"></em>` : ""}</span>
      <small>${esc(r.p.rot)} · ${textoPrazo(m)}${r.prev ? `<br><b>${esc(r.prev)}</b>` : ""}</small></button>`).join("") : `<p class="rel-vazio">Nenhuma meta em andamento.</p>`}
    ${ritmos.length > 6 ? `<p class="rel-nota">e mais ${ritmos.length - 6} na aba Metas.</p>` : ""}
  </section>`;
  // COMPRAS
  corpo += `<section class="rel-bloco"><h3>${ic("shopping-cart")} Compras</h3>
    <div class="rel-dois">
      <div><span>Comprado ${naPer}</span><b class="num">${fmtR(gasto)}</b><small>${comprados.length} ${comprados.length === 1 ? "item" : "itens"}</small></div>
      <div><span>Ainda para comprar</span><b class="num">${fmtR(pendTot)}</b><small>${pend.length} ${pend.length === 1 ? "item" : "itens"}${guardadoPer ? ` · ${fmtR(guardadoPer)} guardados ${naPer}` : ""}</small></div></div>
    ${planejadas.length ? `<h4>Planejadas</h4>${planejadas.map((x) => { const g = guardadoCompra(x), t = totalCompra(x); return `<div class="plan-c"><div class="hab-l1"><span>${esc(x.nome)}</span><small>${x.prazo ? "até " + dataCurta(x.prazo) : ""}</small></div><span class="mini-trilho"><i style="width:${Math.min(100, (g / t) * 100).toFixed(1)}%"></i></span><small>${fmtR(g)} de ${fmtR(t)} guardados${g >= t ? " · pronto para comprar!" : ""}</small></div>`; }).join("")}` : ""}
    <button class="btn leve" data-ver-compras style="margin-top:12px">${ic("shopping-cart")} Ver lista de compras</button></section>`;
  // CONQUISTAS
  if (eventos.length) corpo += `<section class="rel-bloco"><h3>${ic("trophy")} Conquistas ${naPer}</h3><div class="conq">${eventos.map((e) => `<div>${ic(e.ic)}<span>${esc(e.t)}</span><small>${dataCurta(e.d)}</small></div>`).join("")}</div></section>`;

  const modos = [["semana", "Semana"], ["mes", "Mês"], ["ano", "Ano"]];
  return `<header class="topo">
      <div class="topo-linha"><button class="bt-redondo" data-per="-1" aria-label="Período anterior">${ic("chevron-left")}</button>
        <div class="tit"><b>Relatórios</b><small>${rotuloPeriodo()}${ehAtual ? "" : ` · <u data-per-atual>atual</u>`}</small></div>
        <button class="bt-redondo" data-per="1" aria-label="Próximo período">${ic("chevron-right")}</button></div>
      <div class="alternar">${modos.map(([k, v]) => `<button data-modo="${k}" class="${modo === k ? "ativo" : ""}">${v}</button>`).join("")}</div>
      <div class="rel-frase">${frases.length ? frases.join(" ") : `Ainda não há dados ${naPer === "no ano" ? "neste ano" : naPer === "no mês" ? "neste mês" : "nesta semana"}.`}</div>
    </header><main class="conteudo">${corpo}</main>`;
}
ligar.relatorios = () => {
  $$("[data-per]").forEach((b) => (b.onclick = () => { moverPeriodo(Number(b.dataset.per)); desenhar(); }));
  const at = $("[data-per-atual]"); if (at) at.onclick = () => { S.rel.ref = hoje(); desenhar(); };
  $$("[data-modo]").forEach((b) => (b.onclick = () => { S.rel.modo = b.dataset.modo; desenhar(); }));
  $$("[data-meta-rel]").forEach((b) => (b.onclick = () => telaMeta(b.dataset.metaRel)));
  const vc = $("[data-ver-compras]"); if (vc) vc.onclick = () => abrirCompras();
};

/* ---------- AJUSTES ---------- */
function telaAjustes() {
  const st = estadoNotificacoes();
  const rotN = { ativo: "Ativadas", bloqueado: "Bloqueadas", pedir: "Desativadas", sem: "Indisponível" }[st];
  const cfg = S.d.config;
  return `<header class="topo"><div class="topo-linha"><span class="bt-redondo vazio"></span><div class="tit"><b>Ajustes</b><small>Gestor de Metas</small></div><span class="bt-redondo vazio"></span></div></header>
  <main class="conteudo">
    <div class="secao"><h2>Aplicativo</h2><div class="caixa">
      ${instalado()
        ? `<div class="linha-opc">${bola({ cor: "#1F8A55", icone: "circle-check" })}<span class="meio">App instalado<small>Você está usando o app pela tela inicial do celular.</small></span><span class="estado on">Instalado</span></div>`
        : `<button class="linha-opc" data-instalar-ajustes>${bola({ cor: "#3A3FBF", icone: "smartphone" })}<span class="meio">Instalar o app<small>Coloca o ícone do Gestor de Metas na tela inicial do celular.</small></span><span class="seta">${ic("download")}</span></button>`}
    </div></div>
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
      <button class="linha-opc" data-backup>${bola({ cor: "#1E88E5", icone: "download" })}<span class="meio">Fazer backup agora<small>${textoUltimoBackup()}</small></span><span class="seta">${ic("chevron-right")}</span></button>
      <div class="linha-opc">${bola({ cor: "#B8860B", icone: "calendar-clock" })}<span class="meio">Lembrete de backup<small>${S.d.config.backupDias ? `Depois de ${S.d.config.backupDias} dias sem backup, o app avisa ao abrir e manda notificação às 9h, 13h e 19h até você fazer.` : "Desligado. O app não vai lembrar do backup."}</small>
        <span class="seletor" style="margin-top:10px;--n:4">${[[7, "7 dias"], [20, "20 dias"], [30, "30 dias"], [0, "Desligado"]].map(([k, v]) => `<button data-freq="${k}" class="${S.d.config.backupDias === k ? "sel" : ""}">${v}</button>`).join("")}</span></span></div>
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
  const ia = $("[data-instalar-ajustes]"); if (ia) ia.onclick = instalarApp;
  $("[data-notif]").onclick = pedirNotificacoes;
  $("[data-resumo]").onclick = () => { S.d.config.resumoAtivo = !S.d.config.resumoAtivo; gravar(); desenhar(); };
  $("[data-resumo-hora]").onchange = (e) => { if (e.target.value) { S.d.config.resumo = e.target.value; gravar(); aviso(`Resumo às ${e.target.value}`); } };
  const t = $("[data-testar]"); if (t) t.onclick = testarNotificacao;
  $("[data-cats]").onclick = telaCategorias;
  $("[data-tema-bt]").onclick = escolherTema;
  $("[data-backup]").onclick = () => escolherBackup();
  $$("[data-freq]").forEach((b) => (b.onclick = () => { const n = Number(b.dataset.freq); S.d.config.backupDias = n; S.d.config.backupAdiado = null; gravar(); desenhar(); aviso(n ? `Aviso depois de ${n} dias sem backup` : "Lembrete de backup desligado"); }));
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
  const bf = $("[data-bk-fazer]"); if (bf) bf.onclick = () => escolherBackup();
  const ba = $("[data-bk-adiar]"); if (ba) ba.onclick = () => { S.d.config.backupAdiado = somaDias(hoje(), 1); gravar(); desenhar(); aviso("Lembro de novo amanhã"); };
  const bn = $("[data-bk-nunca]"); if (bn) bn.onclick = () => { S.d.config.backupDias = 0; gravar(); desenhar(); aviso("Não vou mais lembrar. Dá para religar em Ajustes."); };
  const xf = $("[data-x-familia]"); if (xf) xf.onclick = () => { dispensar("gm_sem_familia_" + xf.dataset.xFamilia); desenhar(); };
  $$("[data-marcar]").forEach((b) => (b.onclick = () => {
    const a = S.d.afazeres.find((x) => x.id === b.dataset.marcar), d = b.dataset.dia;
    if (a.feitos[d]) delete a.feitos[d]; else a.feitos[d] = true;
    const msg = contribuir(a, d, !!a.feitos[d]);
    gravar(); desenhar(); if (msg) aviso(msg);
  }));
  $$("[data-afazer]").forEach((b) => (b.onclick = () => editarAfazer(S.d.afazeres.find((x) => x.id === b.dataset.afazer))));
}
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); pedidoInstalar = e; desenhar(); });
window.addEventListener("appinstalled", () => { pedidoInstalar = null; desenhar(); registrarPeriodico(); });
async function instalarApp() {
  if (pedidoInstalar) {
    const p = pedidoInstalar; p.prompt();
    const r = await p.userChoice; pedidoInstalar = null; desenhar();
    if (r && r.outcome === "accepted") aviso("Pronto! O ícone vai aparecer na tela inicial.");
    return;
  }
  // o Chrome não ofereceu a instalação direta: mostra o caminho manual
  const el = abrirCamada(`<h2>Instalar o app</h2>
    <div class="passos">
      <div><b>1</b><span>No <b>Chrome</b>, toque nos três pontinhos <b>⋮</b> no canto de cima.</span></div>
      <div><b>2</b><span>Toque em <b>Instalar app</b>. Em alguns celulares aparece <b>Adicionar à tela inicial</b>.</span></div>
      <div><b>3</b><span>Confirme em <b>Instalar</b>. O ícone do Gestor de Metas aparece na tela inicial.</span></div>
    </div>
    <p class="dica">Usa o navegador da Samsung? Toque em <b>☰</b> (embaixo) → <b>Adicionar página a</b> → <b>Tela inicial</b>.<br>Se a opção não aparecer, o app pode já estar instalado: procure o ícone <b>Gestor de Metas</b> na tela inicial ou na gaveta de apps.</p>
    <div class="botoes"><button class="btn preto" data-ok>Entendi</button></div>`);
  $("[data-ok]", el).onclick = () => fechar();
}

/* ================= ADICIONAR E EDITAR ================= */
function escolherNovo() {
  const el = abrirCamada(`<h2>O que você quer adicionar?</h2><div class="grade-add">
    <button data-n="afazer"><span class="bola">${ic("calendar")}</span>Afazer<small>Algo para fazer num dia</small></button>
    <button data-n="meta"><span class="bola">${ic("target")}</span>Meta<small>Algo para conquistar até um prazo</small></button>
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
  if (a.repete !== "nao") { dia = a.data > hoje() ? a.data : hoje(); let n = 0; while (!repeteNoDia(a, dia) && n++ < 40) dia = somaDias(dia, 1); }
  const ini = new Date(`${dia}T${a.hora}:00`), fim = new Date(ini.getTime() + 30 * 60000);
  const f = (d) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${p2(d.getHours())}${p2(d.getMinutes())}00`;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
  let u = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(a.titulo)}&dates=${f(ini)}/${f(fim)}&ctz=${encodeURIComponent(tz)}&details=${encodeURIComponent("Afazer do Gestor de Metas")}`;
  if (a.repete === "diario") u += "&recur=" + encodeURIComponent("RRULE:FREQ=DAILY");
  if (a.repete === "util") u += "&recur=" + encodeURIComponent("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
  if (a.repete === "semanal") u += "&recur=" + encodeURIComponent("RRULE:FREQ=WEEKLY");
  if (a.repete === "mensal") u += "&recur=" + encodeURIComponent("RRULE:FREQ=MONTHLY");
  if (a.ate && a.repete !== "nao") u = u.replace(/RRULE%3A([^&]*)/, (s) => s + encodeURIComponent(";UNTIL=" + a.ate.replace(/-/g, "") + "T235959Z"));
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
      <label>Repetir<select name="repete">${Object.entries(REPETE).map(([k, v]) => `<option value="${k}" ${k === e.repete ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <p class="dica" data-rep-dica></p>
      <label data-ate-campo>Repetir até (opcional)<input type="date" name="ate" value="${a?.ate || ""}"></label>
      ${a && a.liga && alvoLiga(a) ? `<div class="plano-info">${ic(a.liga.tipo === "compra" ? "shopping-cart" : "target")}<div>Faz parte do plano de <b>${esc(a.liga.tipo === "compra" ? alvoLiga(a).nome : alvoLiga(a).titulo)}</b>. Cada vez que marcar como feito, soma:
        <input name="ligaQtd" inputmode="decimal" value="${a.liga.tipo === "compra" || alvoLiga(a).tipo === "valor" ? paraCampo(a.liga.qtd / 100) : paraCampo(a.liga.qtd)}" aria-label="Quanto soma cada vez"> ${a.liga.tipo === "compra" || alvoLiga(a).tipo === "valor" ? "reais" : esc(alvoLiga(a).tipo === "lista" ? alvoLiga(a).medida || "páginas" : alvoLiga(a).unidade || "")}</div></div>` : ""}
      <label data-aviso-campo>Lembrete no celular<select name="aviso">${AVISOS.map(([v, r]) => `<option value="${v ?? ""}" ${String(v ?? "") === String(e.aviso ?? "") ? "selected" : ""}>${r}</option>`).join("")}</select></label>
      ${gradeCat(e.cat)}
      <div class="botoes"><button class="btn preto">${ic("check")} Salvar</button>
        ${!novo && a.hora ? `<a class="btn contorno" href="${linkAgenda(a)}" target="_blank" rel="noopener">${ic("calendar-plus")} Pôr na agenda do celular</a>` : ""}
        ${!novo ? `<button type="button" class="btn perigo" data-excluir>${ic("trash")} Excluir</button>` : ""}</div>
    </form>`, { aoFechar: refrescar, substituir });
  const f = $("[data-f]", el);
  const atualizarAviso = () => { $("[data-aviso-campo]", el).hidden = !f.hora.value; };
  f.hora.oninput = atualizarAviso; atualizarAviso();
  const atualizarRep = () => {
    const r = f.repete.value, d = f.data.value || S.dia;
    $("[data-ate-campo]", el).hidden = r === "nao";
    $("[data-rep-dica]", el).textContent = r === "semanal" ? `Repete toda ${DIAS[diaSemana(d)]} (o dia da semana da data acima).` : r === "mensal" ? `Repete todo dia ${Number(d.slice(8))} de cada mês (o dia da data acima).` : "";
  };
  f.repete.onchange = atualizarRep; f.data.onchange = atualizarRep; atualizarRep();
  ligarGradeCat(el, e);
  f.onsubmit = (ev) => {
    ev.preventDefault();
    const dados = { titulo: f.titulo.value.trim(), data: f.data.value || S.dia, hora: f.hora.value || "", repete: f.repete.value, cat: e.cat, ate: f.repete.value !== "nao" && f.ate.value ? f.ate.value : null };
    if (f.ligaQtd) { const din = a.liga.tipo === "compra" || alvoLiga(a).tipo === "valor"; const q = din ? lerCentavos(f.ligaQtd.value) : lerNumero(f.ligaQtd.value); if (Number.isFinite(q) && q > 0) a.liga.qtd = q; }
    dados.aviso = dados.hora && f.aviso.value !== "" ? Number(f.aviso.value) : null;
    if (!dados.titulo) return;
    if (novo) S.d.afazeres.push({ id: novoId(), feitos: {}, ...dados }); else Object.assign(a, dados);
    if (novo && dados.repete === "nao") S.dia = dados.data;
    if (novo) S.aba = "hoje";
    gravar(); fechar();
    aviso(novo ? "Afazer adicionado" : "Afazer atualizado");
    if (dados.ate && dados.ate < dados.data) setTimeout(() => aviso("A data de “repetir até” é antes do início."), 2700);
    if (dados.aviso != null && estadoNotificacoes() === "pedir") setTimeout(() => aviso("Para receber o lembrete, permita as notificações."), 2700);
  };
  const x = $("[data-excluir]", el);
  if (x) armar(x, () => { S.d.afazeres = S.d.afazeres.filter((i) => i.id !== a.id); gravar(); fechar(); aviso(a.liga ? "Plano excluído. O que já foi somado continua na meta." : "Afazer excluído"); });
}

/* ---------- meta ---------- */
function editarMeta(m, substituir = false) {
  const novo = !m;
  const anoIni = m ? m.ano : S.ano || anoPadrao();
  const e = { cat: m ? m.cat : S.d.cats[0]?.id, tipo: m ? m.tipo : "lista", prazoTipo: m ? m.prazoTipo : "ano" };
  const alvoTxt = m ? (m.tipo === "valor" ? paraCampo(m.alvo / 100) : paraCampo(m.alvo)) : "";
  const el = abrirCamada(`<h2>${novo ? "Nova meta" : "Editar meta"}</h2>
    <form data-f>
      <label>Meta<input name="titulo" maxlength="120" required value="${esc(m?.titulo)}" placeholder="Ex.: Ler 12 livros"></label>
      <span class="rot">Como medir</span><div class="seletor" style="--n:4;margin-bottom:8px">${Object.entries(TIPOS).map(([k, v]) => `<button type="button" data-tipo="${k}" class="${k === e.tipo ? "sel" : ""}">${v}</button>`).join("")}</div>
      <p class="dica" data-dica-tipo></p>
      <div class="dois" data-alvo-linha><label><span data-rot-alvo>Quantidade</span><input name="alvo" inputmode="decimal" value="${alvoTxt}"></label>
        <label data-un>Unidade<input name="unidade" maxlength="20" value="${esc(m?.unidade)}"></label></div>
      <label data-medida>Cada item tem (opcional)<input name="medida" maxlength="20" value="${esc(m?.medida)}" placeholder="páginas"></label>
      <p class="dica" data-medida-dica>Ex.: livros têm páginas. Assim o app conta as páginas lidas de cada livro e mostra quando ele termina.</p>
      <span class="rot">Prazo</span>
      <div class="seletor" style="--n:2;margin-bottom:10px"><button type="button" data-pt="ano" class="${e.prazoTipo === "ano" ? "sel" : ""}">Ano todo</button><button type="button" data-pt="data" class="${e.prazoTipo === "data" ? "sel" : ""}">Até uma data</button></div>
      <div class="dois" data-p-ano><label>Ano<input type="number" name="ano" min="2000" max="2100" value="${anoIni}"></label><p class="dica" style="align-self:end;margin:0 0 14px" data-p-ano-dica></p></div>
      <label data-p-data>Data limite<input type="date" name="prazo" value="${m && m.prazoTipo === "data" ? m.prazo : ""}" min="${hoje()}"></label>
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
    $("[data-medida]", el).hidden = $("[data-medida-dica]", el).hidden = t !== "lista";
    $("[data-rot-alvo]", el).textContent = t === "valor" ? "Valor (R$)" : t === "lista" ? "Quantidade" : "Alvo";
    f.unidade.placeholder = t === "lista" ? "livros" : "km";
    f.alvo.placeholder = t === "valor" ? "10.000,00" : "12";
  };
  tipo();
  $$("[data-tipo]", el).forEach((b) => (b.onclick = () => { e.tipo = b.dataset.tipo; tipo(); }));
  const prazoUI = () => {
    $$("[data-pt]", el).forEach((b) => b.classList.toggle("sel", b.dataset.pt === e.prazoTipo));
    $("[data-p-ano]", el).hidden = e.prazoTipo !== "ano"; $("[data-p-data]", el).hidden = e.prazoTipo !== "data";
    $("[data-p-ano-dica]", el).textContent = `Vale até 31/12/${f.ano.value || anoIni}`;
  };
  $$("[data-pt]", el).forEach((b) => (b.onclick = () => { e.prazoTipo = b.dataset.pt; prazoUI(); if (e.prazoTipo === "data" && !f.prazo.value) f.prazo.focus(); }));
  f.ano.oninput = prazoUI; prazoUI();
  ligarGradeCat(el, e);
  f.onsubmit = (ev) => {
    ev.preventDefault();
    const t = e.tipo, titulo = f.titulo.value.trim(); if (!titulo) return;
    let alvo = 1;
    if (t !== "simples") { alvo = t === "valor" ? lerCentavos(f.alvo.value) : lerNumero(f.alvo.value); if (!Number.isFinite(alvo) || alvo <= 0) return aviso("Informe o alvo da meta. Ex.: 12"); }
    let prazo, ano;
    if (e.prazoTipo === "data") { prazo = f.prazo.value; if (!prazo) return aviso("Escolha a data limite da meta."); ano = Number(prazo.slice(0, 4)); }
    else { ano = Number(f.ano.value) || new Date().getFullYear(); prazo = `${ano}-12-31`; }
    const dados = { titulo, tipo: t, alvo, unidade: t === "valor" || t === "simples" ? "" : f.unidade.value.trim(), medida: t === "lista" ? f.medida.value.trim() : "", ano, prazo, prazoTipo: e.prazoTipo, cat: e.cat };
    // início da contagem do ritmo: 1º de janeiro (ano todo) ou o dia de hoje
    const iniAno = `${ano}-01-01`, inicioNovo = e.prazoTipo === "ano" ? (hoje() > iniAno && hoje() < prazo ? hoje() : iniAno) : (hoje() < prazo ? hoje() : somaDias(prazo, -30));
    let alvoMeta = m;
    if (novo) { alvoMeta = { id: novoId(), itens: [], regs: [], feita: false, inicio: inicioNovo, ...dados }; S.d.metas.push(alvoMeta); }
    else { if (m.prazo !== prazo && (m.inicio >= prazo || m.prazoTipo !== e.prazoTipo)) dados.inicio = inicioNovo; Object.assign(m, dados); planosDe("meta", m.id).forEach((p) => { if (p.ate) p.ate = prazo; }); }
    S.ano = dados.ano; S.filtro = "todas"; S.aba = "metas";
    gravar();
    if (novo) { telaMeta(alvoMeta.id, true); aviso("Meta criada"); }
    else { fechar(1, () => telaMeta(m.id, true)); aviso("Meta atualizada"); }
  };
  const x = $("[data-excluir]", el);
  if (x) armar(x, () => { S.d.metas = S.d.metas.filter((i) => i.id !== m.id); S.d.afazeres = S.d.afazeres.filter((p) => !(p.liga && p.liga.id === m.id)); gravar(); fechar(2); aviso("Meta excluída"); });
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
      <label>Quero comprar até (opcional)<input type="date" name="prazo" value="${x?.prazo || ""}"></label>
      ${!novo && totalCompra(x) ? `<label>Somar dinheiro guardado (R$)<input name="guardar" inputmode="decimal" placeholder="Já guardado: ${fmtR(guardadoCompra(x))}"></label>` : ""}
      ${gradeCat(e.cat)}
      <div class="botoes"><button class="btn preto">${ic("check")} Salvar</button>
        ${!novo && totalCompra(x) && !x.comprado ? `<button type="button" class="btn contorno" data-plano-compra>${ic("calendar-clock")} ${planosDe("compra", x.id).length ? "Ver plano para juntar" : "Planejar: juntar o dinheiro"}</button>` : ""}
        ${!novo ? `<button type="button" class="btn perigo" data-excluir>${ic("trash")} Excluir</button>` : ""}</div>
      <p class="dica" style="margin-top:10px">${novo ? "Dica: com preço e data, depois você pode criar um plano para juntar o dinheiro." : ""}</p>
    </form>`, { aoFechar: refrescar, substituir });
  const f = $("[data-f]", el);
  ligarGradeCat(el, e);
  f.onsubmit = (ev) => {
    ev.preventDefault();
    const nome = f.nome.value.trim(); if (!nome) return;
    const qtd = lerNumero(f.qtd.value), preco = lerCentavos(f.preco.value);
    const dados = { nome, qtd: Number.isFinite(qtd) && qtd > 0 ? qtd : 1, preco: Number.isFinite(preco) ? preco : 0, nota: f.nota.value.trim(), cat: e.cat, prazo: f.prazo.value || null };
    if (novo) S.d.compras.push({ id: novoId(), comprado: false, regs: [], ...dados }); else Object.assign(x, dados);
    if (!novo && f.guardar && f.guardar.value) { const v = lerCentavos(f.guardar.value); if (Number.isFinite(v) && v) x.regs.push({ id: novoId(), valor: v, data: hoje(), nota: "Guardado" }); }
    if (!novo) planosDe("compra", x.id).forEach((p) => { p.ate = dados.prazo; });
    gravar();
    const listaAberta = pilha.some((p) => p.re && p.c.querySelector("[data-nova-compra]"));
    if (novo && !listaAberta) fechar(1, () => abrirCompras()); else fechar();
    aviso(novo ? "Adicionado à lista de compras" : "Item atualizado");
  };
  const pc = $("[data-plano-compra]", el);
  if (pc) pc.onclick = () => { const planos = planosDe("compra", x.id); if (planos.length) editarAfazer(planos[0]); else abrirPlano("compra", x); };
  const b = $("[data-excluir]", el);
  if (b) armar(b, () => { S.d.compras = S.d.compras.filter((i) => i.id !== x.id); S.d.afazeres = S.d.afazeres.filter((p) => !(p.liga && p.liga.id === x.id)); gravar(); fechar(); aviso("Item excluído"); });
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
const DIA_MS = 864e5;
const temDados = () => S.d.metas.length + S.d.afazeres.length + S.d.compras.length > 0;
function diasDesde(iso) { return iso ? Math.floor((dataDe(hoje()) - dataDe(iso.slice(0, 10))) / DIA_MS) : null; }
function textoUltimoBackup() {
  const d = diasDesde(S.d.config.ultimoBackup);
  return d === null ? "Nenhum backup feito ainda." : d === 0 ? "Último backup: hoje." : d === 1 ? "Último backup: ontem." : `Último backup: há ${d} dias.`;
}
// chegou a hora? (X dias desde o último backup, ou desde o início do uso)
const diasSemBackup = () => diasDesde(S.d.config.ultimoBackup || S.d.config.criadoEm || hoje());
function backupVencido() {
  const c = S.d.config;
  if (!c.backupDias || !temDados()) return false;
  if (c.backupAdiado && c.backupAdiado > hoje()) return false;
  return diasSemBackup() >= c.backupDias;
}
function cartaoBackup() {
  if (!backupVencido()) return "";
  const d = diasDesde(S.d.config.ultimoBackup);
  return `<div class="cartao-aviso alerta">${ic("download")}<div><b>${d === null ? "Você ainda não fez backup" : `Faz ${d} dias sem backup`}</b>
    <small>O backup protege suas metas e afazeres se você limpar o Chrome ou trocar de celular.</small>
    <div class="acoes"><button data-bk-fazer>Fazer backup</button><button class="sec-bt" data-bk-adiar>Lembrar amanhã</button><button class="sec-bt" data-bk-nunca>Não perguntar mais</button></div></div></div>`;
}
function arquivoBackup() {
  const nome = `gestor-metas-backup-${hoje()}.json`;
  const texto = JSON.stringify({ app: "gestor-metas", versao: VERSAO_APP, salvoEm: new Date().toISOString(), dados: S.d }, null, 1);
  return { nome, blob: new Blob([texto], { type: "application/json" }) };
}
function marcarBackupFeito() { S.d.config.ultimoBackup = new Date().toISOString(); S.d.config.backupAdiado = null; gravar(); desenhar(); }
function podeCompartilhar() {
  try { const { nome, blob } = arquivoBackup(); return !!(navigator.canShare && navigator.canShare({ files: [new File([blob], nome, { type: "application/json" })] })); } catch { return false; }
}
function escolherBackup() {
  const share = podeCompartilhar();
  const el = abrirCamada(`<h2>Fazer backup</h2><p class="dica" style="text-align:center">${esc(textoUltimoBackup())}</p>
    <div class="botoes">
      ${share ? `<button class="btn preto" data-enviar>${ic("upload")} Enviar para Drive, WhatsApp ou e-mail</button>` : ""}
      <button class="btn ${share ? "leve" : "preto"}" data-baixar>${ic("download")} Salvar no celular (Downloads)</button>
    </div>
    <p class="dica" style="margin-top:12px">Dica: mandar para o <b>Google Drive</b> ou para o seu e-mail deixa o celular mais leve e protege o backup se você perder o aparelho.</p>`);
  const be = $("[data-enviar]", el);
  if (be) be.onclick = async () => {
    const { nome, blob } = arquivoBackup();
    try {
      await navigator.share({ files: [new File([blob], nome, { type: "application/json" })], title: "Backup do Gestor de Metas" });
      fechar(); marcarBackupFeito(); aviso("Backup enviado");
    } catch (e) { if (e && e.name !== "AbortError") aviso("Não foi possível compartilhar. Use Salvar no celular."); }
  };
  $("[data-baixar]", el).onclick = () => { salvarBackup(); fechar(); };
}
function salvarBackup() {
  const { nome, blob } = arquivoBackup();
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  marcarBackupFeito();
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
  $("[data-sim]", el).onclick = () => { S.d = normalizar(dados); S.d.config.ultimoBackup = bk.salvoEm || new Date().toISOString(); S.ano = null; gravar(); fechar(); aviso("Backup restaurado"); };
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
  // prazos de metas e compras: 7 dias antes, na véspera e no dia, às 9h30
  for (let i = 0; i < 2; i++) {
    const iso = somaDias(h, i), at = new Date(`${iso}T09:30:00`).getTime();
    if (!(at > agora - 60000 && at < fim)) continue;
    const quando = (d) => (d === 0 ? "Hoje é o prazo" : d === 1 ? "O prazo é amanhã" : `Faltam ${d} dias`);
    for (const m of S.d.metas) {
      const d = diffDias(iso, m.prazo); if (![7, 1, 0].includes(d) || progresso(m).completa) continue;
      lista.push({ id: `p-${m.id}-${iso}`, at, titulo: `${quando(d)}: ${m.titulo}`, corpo: `${progresso(m).rot}. Abra o app para ver o que falta.` });
    }
    for (const x of S.d.compras) {
      if (!x.prazo || x.comprado) continue; const d = diffDias(iso, x.prazo); if (![7, 1, 0].includes(d)) continue;
      lista.push({ id: `c-${x.id}-${iso}`, at, titulo: `${quando(d)} para comprar: ${x.nome}`, corpo: totalCompra(x) ? `${fmtR(guardadoCompra(x))} de ${fmtR(totalCompra(x))} guardados.` : "Está na sua lista de compras." });
    }
  }
  // backup atrasado: avisa às 9h, 13h e 19h até ser feito (ou "lembrar amanhã" / "não perguntar mais")
  if (S.d.config.backupDias && temDados()) {
    for (let i = 0; i < 2; i++) {
      const iso = somaDias(h, i);
      if (S.d.config.backupAdiado && S.d.config.backupAdiado > iso) continue;
      const dias = diasSemBackup() + i;
      if (dias < S.d.config.backupDias) continue;
      for (const hora of ["09:00", "13:00", "19:00"]) {
        const at = new Date(`${iso}T${hora}:00`).getTime();
        if (at > agora - 60000 && at < fim) lista.push({ id: `b-${iso}-${hora}`, at, titulo: `Faz ${dias} dias sem backup`, corpo: "Abra o Gestor de Metas e toque em Fazer backup. Leva 5 segundos." });
      }
    }
  }
  return lista.sort((x, y) => x.at - y.at);
}
let timers = [];
async function lerMostrados() { try { const c = await caches.open("gm-agenda"); const r = await c.match("mostrados.json"); return r ? await r.json() : []; } catch { return []; } }
async function marcarMostrado(id) { try { const c = await caches.open("gm-agenda"); const l = await lerMostrados(); l.push(id); await c.put("mostrados.json", new Response(JSON.stringify(l.slice(-300)))); } catch {} }
// Teste: mostra o aviso e explica o que fazer se ele não aparecer no celular
async function testarNotificacao() {
  let erro = "", criada = false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) erro = "O app ainda não terminou de carregar. Feche e abra de novo.";
    else {
      await reg.showNotification("Gestor de Metas", { body: "Teste: os avisos estão funcionando.", tag: "teste", icon: "icons/icon-192.png", badge: "icons/badge-96.png", vibrate: [120, 60, 120], data: { url: "./" } });
      criada = (await reg.getNotifications({ tag: "teste" })).length > 0;
    }
  } catch (e) { erro = String(e && e.message || e); }
  const el = abrirCamada(`<h2>${criada ? "Aviso enviado" : "O aviso não foi criado"}</h2>
    <p class="dica" style="text-align:center">${criada ? "Puxe a barra de notificações do celular para baixo. O aviso de teste deve estar lá." : esc(erro || "O navegador recusou o aviso.")}</p>
    <p style="margin:0 0 8px"><b>Não apareceu?</b> No Samsung, o Android pode estar bloqueando:</p>
    <div class="passos">
      <div><b>1</b><span>Abra <b>Configurações</b> do celular → <b>Notificações</b> → <b>Notificações de apps</b>.</span></div>
      <div><b>2</b><span>Ative <b>Chrome</b>. Se o app estiver instalado, ative também <b>Gestor de Metas</b>.</span></div>
      <div><b>3</b><span>Toque no nome do app e confira se as categorias de aviso estão ligadas e se ele <b>não</b> está em <b>Não perturbe</b>.</span></div>
      <div><b>4</b><span>Em <b>Configurações → Bateria → Limites de uso em segundo plano</b>, tire o Chrome e o Gestor de Metas de <b>Apps em suspensão</b>.</span></div>
    </div>
    <div class="botoes"><button class="btn preto" data-ok>Entendi</button><button class="btn leve" data-de-novo>Testar de novo</button></div>`);
  $("[data-ok]", el).onclick = () => fechar();
  $("[data-de-novo]", el).onclick = () => fechar(1, testarNotificacao);
}
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
// pede ao Chrome para não apagar os dados sozinho quando o celular ficar sem espaço
async function pedirArmazenamentoPermanente() {
  try { if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch {}
}
aplicarTema();
S.d = carregar() || dadosNovos();
if (!localStorage.getItem(CHAVE)) { try { localStorage.setItem(CHAVE, JSON.stringify(S.d)); } catch {} }
desenhar();
agendarLembretes();
pedirArmazenamentoPermanente();
