/* =============================================================================
   GERADOR DO CARTAO DE PREVIA  (og.jpg, 1200 x 630)
   -----------------------------------------------------------------------------
   Abre producao/og-card.html no Chromium headless, espera o cartao avisar que
   esta pronto (fontes e fotos) e salva producao/og.png. O assets/og.jpg que
   vai para o ar sai do producao/og.py: PNG de 560 kB e pesado demais para
   uma previa, e servico de previa costuma desistir antes de baixar.

     node producao/og.mjs && python3 producao/og.py
     CHROME=/caminho/chrome node producao/og.mjs      (para apontar o binario)

   Roda so quando a marca, a manchete ou o leque de slides mudarem. A imagem
   fica versionada em assets/, porque a Vercel serve arquivo estatico e o
   WhatsApp nao executa JavaScript para descobrir a previa.
   ========================================================================== */
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm, copyFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = join(RAIZ, 'producao', 'og.png');
const LARGURA = 1200, ALTURA = 630;

/* O Chromium do ambiente Playwright vem primeiro; depois os nomes usuais.
   Sem isso o script morre com "spawn chrome ENOENT" e ninguem sabe por que. */
async function acharChrome(){
  if(process.env.CHROME) return process.env.CHROME;
  const candidatos = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];
  for(const c of candidatos){ try { await access(c); return c; } catch {} }
  for(const nome of ['chromium','google-chrome','chrome']){
    const r = spawnSync('which', [nome], {encoding:'utf8'});
    if(r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  }
  throw new Error('Chromium nao encontrado. Passe o caminho em CHROME=');
}

const TIPOS = {'.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
               '.css':'text/css; charset=utf-8', '.woff2':'font/woff2',
               '.jpg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml'};

/* As familias que o cartao usa: a do titulo, as da marca e as dos tres moldes
   do leque. Se voce trocar as cenas no og-card.html, acerte esta lista junto. */
const FAMILIAS = [
  'Inter:wght@300;400;500;600',
  'Fraunces:opsz,wght,SOFT,WONK@9..144,300..700,0..100,0..1',
  'Karla:wght@300;400;500;600;700',
  'Playfair+Display:wght@400;600;700',
  'DM+Sans:wght@300;400;500;600',
  'Libre+Baskerville:wght@400;700',
  'Work+Sans:wght@300;400;600',
  'Outfit:wght@300;400;600;700'
];

/* O Chromium headless nao busca o Google Fonts de forma confiavel atras de
   proxy, e quando falha ele nao avisa: o cartao sai em fonte de sistema e a
   imagem parece so "meio errada". Entao as fontes viram arquivo local antes
   de o navegador abrir, baixadas pelo curl, que herda o proxy e a CA do
   ambiente. Feito uma vez; depois e cache em disco.
   O User-Agent de Chrome nao e enfeite: sem ele o Google devolve TTF. */
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function baixar(url){
  const r = spawnSync('curl', ['-sSfL', '-A', UA, url], {encoding:'buffer', maxBuffer:64*1024*1024});
  if(r.status !== 0) throw new Error('falhou baixar ' + url + ': ' + String(r.stderr).trim());
  return r.stdout;
}

async function prepararFontes(){
  const dir = join(RAIZ, 'producao', 'fontes');
  const css = join(dir, 'fontes.css');
  try { await access(css); console.log('fontes   cache em producao/fontes/'); return; } catch {}

  const { mkdir, writeFile } = await import('node:fs/promises');
  await mkdir(dir, {recursive:true});
  let folha = String(baixar('https://fonts.googleapis.com/css2?family=' +
                            FAMILIAS.join('&family=') + '&display=block'));

  const arquivos = [...new Set(folha.match(/https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2/g) || [])];
  if(!arquivos.length) throw new Error('a folha do Google veio sem nenhum woff2');
  for(const url of arquivos){
    const nome = url.split('/').slice(-2).join('-');
    await writeFile(join(dir, nome), baixar(url));
    folha = folha.split(url).join(nome);
  }
  await writeFile(css, folha);
  console.log('fontes   ' + arquivos.length + ' arquivos em producao/fontes/');
}

/* O cartao precisa de HTTP: por file:// o Chrome bloqueia o moldes.js e o
   cartao sai so com o texto do lado esquerdo. */
function servir(){
  return new Promise(ok=>{
    const s = createServer(async (req,res)=>{
      const caminho = join(RAIZ, decodeURIComponent(req.url.split('?')[0]));
      if(!caminho.startsWith(RAIZ)) { res.writeHead(403).end(); return; }
      try {
        const buf = await readFile(caminho);
        res.writeHead(200, {'Content-Type': TIPOS[extname(caminho)] || 'application/octet-stream'});
        res.end(buf);
      } catch { res.writeHead(404).end('nao encontrado'); }
    });
    s.listen(0, '127.0.0.1', ()=> ok(s));
  });
}

/* --headless --screenshot dispara assim que o load termina, e o load termina
   antes das fontes do Google chegarem. Por isso o cartao roda pelo protocolo:
   da para esperar o window.CARTAO_PRONTO virar true antes de fotografar. */
async function fotografar(chrome, url, destino){
  const perfil = await mkdtemp(join(tmpdir(), 'og-'));
  const porta = 9223;
  const flags = [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--force-color-profile=srgb', '--font-render-hinting=none',
    '--remote-debugging-port=' + porta, '--user-data-dir=' + perfil,
    '--window-size=' + LARGURA + ',' + ALTURA
  ];
  /* O cartao nao busca nada na rede: fonte e foto sao arquivo local servido
     pelo servidor aqui de cima. Entao nada de --proxy-server, nem quando o
     ambiente tem um: a flag <-loopback> jogaria o proprio 127.0.0.1 dentro do
     proxy e a pagina nunca carregaria. Quem fala com o Google e o curl do
     prepararFontes(), que ja herda proxy e CA do ambiente. */
  const nav = spawn(chrome, [...flags, url], {stdio:'ignore'});

  try {
    const alvo = await esperar(async ()=>{
      const r = await fetch('http://127.0.0.1:' + porta + '/json').catch(()=>null);
      if(!r || !r.ok) return null;
      return (await r.json()).find(t => t.type === 'page' && t.url.includes('og-card'));
    }, 20000, 'o Chromium nao abriu a pagina do cartao');

    const cdp = await abrirCDP(alvo.webSocketDebuggerUrl);

    await esperar(async ()=>{
      const r = await cdp('Runtime.evaluate', {expression:'window.CARTAO_PRONTO === true', returnByValue:true});
      return r.result && r.result.value === true ? true : null;
    }, 30000, 'as fontes ou as fotos do cartao nao carregaram');

    const tiro = await cdp('Page.captureScreenshot', {
      format:'png',
      clip:{x:0, y:0, width:LARGURA, height:ALTURA, scale:1},
      captureBeyondViewport:true
    });
    const { writeFile } = await import('node:fs/promises');
    await writeFile(destino, Buffer.from(tiro.data, 'base64'));
  } finally {
    /* Esperar o processo morrer antes de apagar o perfil: o Chromium ainda
       escreve no Default/ depois do kill e o rmdir toma ENOTEMPTY. */
    const morreu = new Promise(ok => nav.once('exit', ok));
    nav.kill();
    await Promise.race([morreu, new Promise(r => setTimeout(r, 4000))]);
    await rm(perfil, {recursive:true, force:true}).catch(()=>{});
  }
}

/* Espera ate a funcao devolver algo diferente de null, ou estoura com uma
   mensagem que diz o que faltou em vez de um timeout mudo. */
async function esperar(fn, ms, oque){
  const fim = Date.now() + ms;
  while(Date.now() < fim){
    const v = await fn();
    if(v) return v;
    await new Promise(r => setTimeout(r, 150));
  }
  throw new Error('tempo esgotado: ' + oque);
}

/* Cliente CDP minimo. O node 22 ja tem WebSocket nativo, entao nao ha
   dependencia nenhuma para instalar. */
async function abrirCDP(url){
  const ws = new WebSocket(url);
  await new Promise((ok, err)=>{ ws.onopen = ok; ws.onerror = ()=>err(new Error('CDP recusou conexao')); });
  let id = 0;
  const pendentes = new Map();
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    const p = pendentes.get(m.id);
    if(!p) return;
    pendentes.delete(m.id);
    m.error ? p.err(new Error(m.error.message)) : p.ok(m.result);
  };
  return (metodo, params)=> new Promise((ok, err)=>{
    const n = ++id;
    pendentes.set(n, {ok, err});
    ws.send(JSON.stringify({id:n, method:metodo, params:params || {}}));
  });
}

await prepararFontes();
const servidor = await servir();
const chrome = await acharChrome();
const url = 'http://127.0.0.1:' + servidor.address().port + '/producao/og-card.html';
console.log('cartao   ' + url);
console.log('chromium ' + chrome);
try {
  await fotografar(chrome, url, SAIDA);
  console.log('gerado   producao/og.png  ' + LARGURA + ' x ' + ALTURA);
  console.log('agora    python3 producao/og.py   (vira assets/og.jpg)');
} finally {
  servidor.close();
}
