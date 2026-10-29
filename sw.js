// Guarda os arquivos do app no celular para funcionar sem internet
// e mostra os lembretes quando o Chrome acorda o app.
// Atenção: o Gestor de Finanças fica no mesmo endereço, então só mexemos
// em caches que começam com "gm-".
const VERSAO = "gm-v5";
const AGENDA = "gm-agenda";
const ARQUIVOS = [
  "./",
  "index.html",
  "estilo.css",
  "app.js",
  "icones.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/badge-96.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSAO)
      .then((c) => c.addAll(ARQUIVOS.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith("gm-") && k !== VERSAO && k !== AGENDA).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  e.respondWith(
    caches.open(VERSAO).then(async (cache) => {
      const daRede = fetch(req, { cache: "no-cache" })
        .then((resp) => { if (resp.ok) cache.put(req, resp.clone()); return resp; })
        .catch(() => null);
      // espera a internet por até 3 segundos; depois disso usa a cópia guardada
      const limite = new Promise((ok) => setTimeout(() => ok(null), 3000));
      const resp = await Promise.race([daRede, limite]);
      if (resp) return resp;
      const guardado = await cache.match(req, { ignoreSearch: true });
      if (guardado) { e.waitUntil(daRede); return guardado; }
      return (await daRede) || (await cache.match("index.html")) || Response.error();
    })
  );
});

/* ---------- lembretes ---------- */
async function lerJSON(c, nome, padrao) { try { const r = await c.match(nome); return r ? await r.json() : padrao; } catch { return padrao; } }

async function mostrarPendentes() {
  const c = await caches.open(AGENDA);
  const agenda = await lerJSON(c, "agenda.json", null);
  if (!agenda || !Array.isArray(agenda.avisos)) return;
  const mostrados = await lerJSON(c, "mostrados.json", []);
  const agora = Date.now();
  let mudou = false;
  for (const a of agenda.avisos) {
    // mostra o que já passou da hora há no máximo 6 horas e ainda não apareceu
    if (a.at <= agora && a.at > agora - 6 * 3600e3 && !mostrados.includes(a.id)) {
      await self.registration.showNotification(a.titulo, { body: a.corpo, tag: a.id, icon: "icons/icon-192.png", badge: "icons/badge-96.png", data: { url: "./" } });
      mostrados.push(a.id); mudou = true;
    }
  }
  if (mudou) await c.put("mostrados.json", new Response(JSON.stringify(mostrados.slice(-300))));
}

self.addEventListener("periodicsync", (e) => {
  if (e.tag === "gm-lembretes") e.waitUntil(mostrarPendentes());
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      const meu = cs.find((c) => c.url.startsWith(self.registration.scope));
      return meu ? meu.focus() : self.clients.openWindow("./");
    })
  );
});
