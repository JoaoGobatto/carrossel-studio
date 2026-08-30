/* =============================================================================
   Carrossel Studio | moldes.js  (v2, editorial full-bleed)
   Fonte única dos 10 moldes, da paleta e do renderizador de slide.
   Usado pela vitrine (index.html) e pela produção (producao/gerar.js).

   Princípios desta versão:
   * Foto ocupando o slide inteiro em TODOS os slides, com tratamentos
     diferentes (limpo, escurecido, duotone da marca, desfocado, aproximado).
   * Tipografia grande, texto sempre branco sobre imagem. Sem tinta variável.
   * Sequência é narrativa, não catálogo: gancho, tensão, espelho, virada,
     prova, como e chamada. Cada slide termina com um gancho aberto que
     obriga o arrasto.
   * Palco de 420 x 525. Exporta em 1080 x 1350 pelo device_scale_factor.
   ============================================================================= */
(function (raiz) {

/* ---------- cor ---------------------------------------------------------- */
function hex2rgb(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function rgb2hex(r,g,b){const c=v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0');return '#'+c(r)+c(g)+c(b);}
function rgb2hsl(r,g,b){
  r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,s=0,l=(mx+mn)/2;
  if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);
    h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;}
  return [h,s*100,l*100];
}
function hsl2hex(h,s,l){
  h=((h%360)+360)%360;s/=100;l/=100;
  const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(((h/60)%2)-1)),m=l-c/2;
  let r,g,b;
  if(h<60)[r,g,b]=[c,x,0];else if(h<120)[r,g,b]=[x,c,0];else if(h<180)[r,g,b]=[0,c,x];
  else if(h<240)[r,g,b]=[0,x,c];else if(h<300)[r,g,b]=[x,0,c];else [r,g,b]=[c,0,x];
  return rgb2hex((r+m)*255,(g+m)*255,(b+m)*255);
}
function luz(hex){const [r,g,b]=hex2rgb(hex);return (r*.299+g*.587+b*.114)/255;}
function tinta(hex){return luz(hex)>.62 ? '#141210' : '#ffffff';}

/* Luminância relativa e contraste da WCAG. luz() acima é brilho percebido e
   serve para decidir tinta sobre foto; isto aqui é a conta oficial, e é ela
   que o site usa para saber se a cor do cliente pode virar texto. */
function lumin(hex){
  const [r,g,b] = hex2rgb(hex);
  const f = v => { v /= 255; return v <= .04045 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); };
  return .2126*f(r) + .7152*f(g) + .0722*f(b);
}
function contraste(a, b){
  const x = lumin(a), y = lumin(b);
  return (Math.max(x,y) + .05) / (Math.min(x,y) + .05);
}
/* Rebaixa (ou clareia) a cor mantendo matiz e saturação até ela passar o
   contraste pedido sobre o fundo. É o que permite usar a cor do cliente como
   TEXTO no papel do site: crua, nenhuma das 10 cores dos moldes passa sobre
   #f7f6f3 — a da barbearia dá 2,35:1 contra os 4,5:1 exigidos. Para
   preenchimento (fundo, borda, ponto) continua-se usando a cor viva. */
function corTexto(cor, fundo, alvo){
  alvo = alvo || 4.5;
  if (contraste(cor, fundo) >= alvo) return cor;
  const [h,s,l] = rgb2hsl.apply(null, hex2rgb(cor));
  const sg = Math.min(s + 8, 96);
  const passo = lumin(fundo) > .18 ? -1.5 : 1.5;   // fundo claro escurece, fundo escuro clareia
  let L = l;
  for(let k = 0; k <= 70; k++){
    L += passo;
    if(L < 0 || L > 100) break;
    const c = hsl2hex(h, sg, L);
    if(contraste(c, fundo) >= alvo) return c;
  }
  return passo < 0 ? '#141210' : '#ffffff';
}

/* Paleta derivada de uma cor só. Como o texto é sempre branco sobre foto,
   a paleta serve para acento, duotone e blocos, não para decidir tinta. */
function paleta(primary){
  const [h,s,l] = rgb2hsl.apply(null, hex2rgb(primary));
  const P = {
    primary : primary,
    light   : hsl2hex(h, Math.max(s - 6, 14), Math.min(l + 22, 88)),
    dark    : hsl2hex(h, Math.min(s + 12, 96), Math.max(l - 30, 10)),
    deep    : hsl2hex(h, Math.min(s + 16, 96), Math.max(l - 42, 6)),
    darkBg  : hsl2hex(h, 18, 7)
  };
  /* Os campos de cor levam texto branco. Em vez de escurecer no escuro
     (que apagava a marca) ou clarear demais (que apagava o texto), cada
     ponto do gradiente é ajustado até bater um brilho alvo. Assim azul
     continua azul e amarelo continua quente, com contraste garantido. */
  const ajusta = (alvo) => {
    let L = l, sg = Math.min(s + 10, 96);
    for(let k=0;k<70;k++){
      const c = hsl2hex(h, sg, L), b = luz(c);
      if(Math.abs(b - alvo) < 0.012) return c;
      L += (b > alvo ? -1.2 : 1.2);
      if(L <= 4 || L >= 96) return hsl2hex(h, sg, Math.min(Math.max(L,4),96));
    }
    return hsl2hex(h, sg, L);
  };
  P.mid  = ajusta(0.34);
  P.grad = 'linear-gradient(158deg,' + ajusta(0.18) + ' 0%,' + ajusta(0.33) + ' 55%,' + ajusta(0.46) + ' 100%)';
  P.inkOnPrimary = tinta(primary);
  return P;
}

/* ---------- utilidades --------------------------------------------------- */
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function tok(s,d){
  return esc(s).replace(/\{marca\}/g, esc(d.nome || 'sua marca'))
               .replace(/\{@\}/g, '@' + esc((d.arroba||'seunegocio').replace(/^@/,'')))
               .replace(/\{cidade\}/g, esc(d.cidade || 'sua cidade'));
}
function inicial(n){const t=(n||'C').trim(); return esc(t.charAt(0).toUpperCase());}

/* Grão de filme. Textura é o que separa arte de template. */
const GRAO = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='260' height='260' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E\")";

/* ---------- CSS do slide (fonte única: vitrine e produção) ---------------- */
const ESTILO_SLIDE = `
.sl{position:relative; width:420px; height:525px; overflow:hidden; color:#fff;
  background:var(--dbg); box-sizing:border-box;
  font-family:var(--body),system-ui,sans-serif; -webkit-font-smoothing:antialiased}
.sl *{box-sizing:border-box; margin:0; padding:0}
.sl .head{font-family:var(--head),Georgia,serif}

/* --- camada de foto e tratamentos --- */
.sl .ph{position:absolute; inset:0; z-index:0; overflow:hidden; background:var(--deep)}
.sl .ph img{width:100%; height:100%; object-fit:cover; display:block}
.sl .ph.dim img{filter:brightness(.46) contrast(1.06) saturate(.9)}
.sl .ph.deep img{filter:brightness(.34) contrast(1.12) saturate(.8)}
.sl .ph.blur img{filter:blur(20px) brightness(1.35) saturate(1.5); transform:scale(1.2)}
.sl .ph.zoom img{transform:scale(1.2); filter:brightness(.74) contrast(1.05)}
.sl .ph.duo img{filter:grayscale(1) contrast(1.3) brightness(.92)}
.sl .ph.duo::after{content:''; position:absolute; inset:0; background:var(--p);
  mix-blend-mode:color; opacity:.92}
.sl .ph.duo::before{content:''; position:absolute; inset:0; z-index:2;
  background:var(--mid); mix-blend-mode:multiply; opacity:.85}

/* --- véus --- */
.sl .veil{position:absolute; inset:0; z-index:1}
.sl .veil.b{background:linear-gradient(transparent 20%,rgba(0,0,0,.52) 50%,rgba(0,0,0,.95) 92%)}
.sl .veil.tb{background:linear-gradient(rgba(0,0,0,.82) 0%,rgba(0,0,0,.12) 36%,rgba(0,0,0,.92) 86%)}
.sl .veil.f{background:rgba(8,8,10,.3)}
.sl .veil.brand{background:var(--grad); opacity:.93}
.sl .veil.brand2{background:linear-gradient(158deg,rgba(0,0,0,.3) 6%,var(--mid) 90%); opacity:.95}

/* --- grão --- */
.sl .grain{position:absolute; inset:0; z-index:3; pointer-events:none;
  background-image:${GRAO}; background-size:260px 260px;
  opacity:.4; mix-blend-mode:overlay}

/* --- cabeçalho do slide --- */
.sl .top{position:absolute; top:24px; left:32px; right:32px; z-index:6;
  display:flex; justify-content:space-between; align-items:center;
  font-size:9.5px; font-weight:700; letter-spacing:2.6px; text-transform:uppercase}
.sl .top .l{color:var(--pl); display:flex; align-items:center; gap:8px}
.sl .top .l i{display:block; width:16px; height:1px; background:currentColor; opacity:.7}
.sl .top .r{color:rgba(255,255,255,.5)}

/* --- conteúdo --- */
.sl .in{position:relative; z-index:5; height:100%; display:flex; flex-direction:column;
  padding:62px 32px 92px}
.sl .in.end{justify-content:flex-end}
.sl .in.mid{justify-content:center}

.sl h1{font-family:var(--head),Georgia,serif; font-size:38px; font-weight:700;
  line-height:1.03; letter-spacing:-1.3px}
.sl h1.xl{font-size:46px; letter-spacing:-2px; line-height:.99}
.sl h1.sm{font-size:28px; letter-spacing:-.7px; line-height:1.09}
.sl .sub{font-size:13.5px; line-height:1.47; color:rgba(255,255,255,.78); margin-top:14px; max-width:93%}
.sl .sub.tight{margin-top:10px; font-size:12.5px}

/* --- componentes --- */
.sl .chk > div{display:flex; gap:11px; align-items:flex-start; padding:8px 0;
  border-bottom:1px solid rgba(255,255,255,.16); font-size:12.5px; line-height:1.32}
.sl .chk > div:last-child{border-bottom:0}
.sl .chk s{text-decoration:none; color:var(--pl); font-size:9px; line-height:1.9; flex:0 0 auto}

.sl .fig{font-family:var(--head),Georgia,serif; font-size:70px; font-weight:700;
  letter-spacing:-3.4px; line-height:.85; color:#fff}
.sl .fig.sm{font-size:47px; letter-spacing:-2px}
.sl .figl{font-size:15px; line-height:1.3; margin-top:12px; font-weight:600; max-width:88%}

.sl .say{font-family:var(--head),Georgia,serif; font-size:16px; font-style:italic;
  line-height:1.42; color:rgba(255,255,255,.92); margin-top:18px;
  padding-left:14px; border-left:2px solid var(--pl)}

.sl .stp > div{display:flex; gap:13px; align-items:flex-start; padding:9.5px 0;
  border-bottom:1px solid rgba(255,255,255,.16)}
.sl .stp > div:last-child{border-bottom:0}
.sl .stp b{font-family:var(--head),Georgia,serif; font-size:20px; font-weight:400;
  color:var(--pl); min-width:27px; line-height:1.05}
.sl .stp p{font-size:13px; font-weight:600; line-height:1.25}
.sl .stp span{display:block; font-size:11px; color:rgba(255,255,255,.58); margin-top:3px; font-weight:400; line-height:1.35}

.sl .mark{display:flex; align-items:center; gap:10px; margin-bottom:auto}
.sl .mark i{width:34px; height:34px; border-radius:50%; background:var(--p); color:var(--pink);
  display:grid; place-items:center; font-weight:800; font-size:14px; font-style:normal; flex:0 0 34px}
.sl .mark b{display:block; font-size:12.5px; font-weight:600; letter-spacing:.3px}
.sl .mark span{display:block; font-size:10.5px; color:rgba(255,255,255,.55)}
.sl .btn2{display:inline-flex; align-items:center; gap:8px; background:var(--p); color:var(--pink);
  padding:13px 24px; border-radius:100px; font-size:13.5px; font-weight:700; margin-top:20px; align-self:flex-start}

/* --- rodapé: gancho de arrasto e barra --- */
.sl .foot{position:absolute; left:0; right:0; bottom:0; z-index:6; padding:0 32px 22px}
.sl .hook{display:flex; align-items:center; gap:8px; font-size:11.5px; font-weight:600;
  color:rgba(255,255,255,.9); margin-bottom:13px}
.sl .hook s{text-decoration:none; color:var(--pl); font-size:14px; line-height:1}
.sl .bar{display:flex; align-items:center; gap:9px}
.sl .bar .tk{flex:1; height:2px; background:rgba(255,255,255,.24); border-radius:2px; overflow:hidden}
.sl .bar .tk b{display:block; height:100%; background:#fff; border-radius:2px}
.sl .bar span{font-size:9.5px; letter-spacing:1.6px; color:rgba(255,255,255,.55); font-weight:600}
`;

/* ---------- peças -------------------------------------------------------- */
/* Cada slide tem a sua foto. d.fotos[i] manda; se faltar, cai na foto do molde.
   O slide da virada é o único que pode repetir sem prejuízo: ele entra
   desfocado sob o gradiente da marca e a imagem quase não aparece. */
function foto(d, trat, i){
  const src = (d.fotos && d.fotos[i]) ? d.fotos[i] : (d.foto || '');
  // se o arquivo do slide ainda nao existir, a vitrine cai na foto do molde
  const fb  = (d.foto && d.foto.slice(0,5) !== 'data:' && d.foto !== src) ? d.foto : '';
  const img = src ? ('<img src=' + JSON.stringify(src)
              + (fb ? ' data-fb=' + JSON.stringify(fb) : '') + ' alt="">') : '';
  return '<div class="ph '+(trat||'')+'">'+img+'</div>';
}
function topo(m,d,s,i,total){
  return '<div class="top"><div class="l"><i></i>'+tok(s.kick||m.nicho,d)+'</div>'
       + '<div class="r">'+String(i+1).padStart(2,'0')+' / '+String(total).padStart(2,'0')+'</div></div>';
}
function rodape(s,d,i,total){
  const pct = ((i+1)/total)*100;
  const h = s.hook ? '<div class="hook"><s>&#8594;</s>'+tok(s.hook,d)+'</div>' : '';
  return '<div class="foot">'+h+'<div class="bar"><div class="tk"><b style="width:'+pct+'%"></b></div>'
       + '<span>'+(i+1)+'/'+total+'</span></div></div>';
}
function marca(d){
  return '<div class="mark"><i>'+inicial(d.nome)+'</i><div><b>'+tok(d.nome||'{marca}',d)+'</b>'
       + '<span>@'+esc((d.arroba||'seunegocio').replace(/^@/,''))+'</span></div></div>';
}

/* ---------- renderizador de um slide ------------------------------------- */
function renderSlide(m, d, i, total){
  const s = m.seq[i];
  const P = paleta(d.cor || m.cor);
  const vars = '--p:'+P.primary+';--pl:'+P.light+';--pd:'+P.dark+';--deep:'+P.deep
             + ';--dbg:'+P.darkBg+';--mid:'+P.mid+';--grad:'+P.grad+';--pink:'+P.inkOnPrimary
             + ';--head:\''+m.fonte[0]+'\';--body:\''+m.fonte[1]+'\';';
  let camadas = '', corpo = '', pos = 'end';

  switch(s.t){
    case 'gancho':
      camadas = foto(d,'',i) + '<div class="veil b"></div>';
      corpo = marca(d)
            + '<div><h1 class="head xl">'+tok(s.titulo,d)+'</h1>'
            + (s.sub ? '<p class="sub">'+tok(s.sub,d)+'</p>' : '') + '</div>';
      break;

    case 'tensao':
      camadas = foto(d,'dim',i) + '<div class="veil tb"></div>';
      corpo = '<div><h1 class="head">'+tok(s.titulo,d)+'</h1>'
            + '<p class="sub">'+tok(s.texto,d)+'</p></div>';
      break;

    case 'espelho':
      camadas = foto(d,'duo',i) + '<div class="veil f"></div>';
      corpo = '<div><h1 class="head sm">'+tok(s.titulo,d)+'</h1>'
            + '<div class="chk" style="margin-top:16px">'
            + s.itens.map(t=>'<div><s>&#9679;</s><span>'+tok(t,d)+'</span></div>').join('')
            + '</div></div>';
      break;

    case 'virada':
      camadas = foto(d,'blur',i) + '<div class="veil brand"></div>';
      pos = 'mid';
      corpo = '<div><h1 class="head">'+tok(s.titulo,d)+'</h1>'
            + '<div class="say head">'+tok(s.frase,d)+'</div></div>';
      break;

    case 'prova':
      camadas = foto(d,'zoom',i) + '<div class="veil b"></div>';
      corpo = '<div><div class="fig head'+(String(s.fig).length>6?' sm':'')+'">'+tok(s.fig,d)+'</div>'
            + '<div class="figl">'+tok(s.figl,d)+'</div>'
            + '<p class="sub tight">'+tok(s.texto,d)+'</p></div>';
      break;

    case 'como':
      camadas = foto(d,'deep',i) + '<div class="veil f"></div>';
      corpo = '<div><h1 class="head sm">'+tok(s.titulo,d)+'</h1>'
            + '<div class="stp" style="margin-top:14px">'
            + s.passos.map(p=>'<div><b class="head">'+esc(p[0])+'</b><div><p>'+tok(p[1],d)+'</p>'
              + '<span>'+tok(p[2],d)+'</span></div></div>').join('')
            + '</div></div>';
      break;

    case 'cta':
      camadas = foto(d,'dim',i) + '<div class="veil brand2"></div>';
      corpo = marca(d)
            + '<div><h1 class="head">'+tok(s.titulo,d)+'</h1>'
            + '<p class="sub">'+tok(s.texto,d)+'</p>'
            + '<span class="btn2">'+tok(s.botao,d)+'</span></div>';
      break;
  }

  return '<div class="sl" style="'+vars+'">'
       + camadas
       + '<div class="grain"></div>'
       + topo(m,d,s,i,total)
       + '<div class="in '+pos+'">'+corpo+'</div>'
       + rodape(s,d,i,total)
       + '</div>';
}

function renderCarrossel(m,d){
  const n = m.seq.length;
  let out = '';
  for(let i=0;i<n;i++) out += renderSlide(m,d,i,n);
  return out;
}

/* =============================================================================
   OS 10 MOLDES
   Mesma narrativa em todos: gancho, tensão, espelho, virada, prova, como
   e chamada. O que muda é a dor do nicho.
   ============================================================================= */
const MOLDES = [

/* 1 ------------------------------------------------------------------ */
{id:'odonto', nicho:'Odontologia', nome:'A Consulta Adiada', cor:'#2E9BD6', img:'odonto.jpg',
 fonte:['Playfair Display','DM Sans'],
 desc:'Ataca a vergonha, não o dente. É o que faz voltar quem sumiu.',
 seq:[
  {t:'gancho', kick:'ninguém fala disso', hook:'o que trava você de verdade',
   titulo:'Você não tem medo de dentista.',
   sub:'Tem medo de ouvir o quanto piorou. E é exatamente por isso que já faz quatro anos.'},
  {t:'tensao', kick:'a verdade', hook:'veja se isso é você',
   titulo:'A cadeira não dói. Dói ouvir "nossa, tá assim?"',
   texto:'Quase ninguém some do dentista por causa da dor. Some por vergonha do que vai escutar. E cada ano de silêncio não deixa a boca parada: deixa a conta maior.'},
  {t:'espelho', kick:'olhe com sinceridade', hook:'existe outro caminho',
   titulo:'Dois destes já são motivo suficiente',
   itens:['Adia a consulta há mais de um ano','Evita sorrir de boca aberta nas fotos',
          'Mastiga sempre do mesmo lado','Sente o gelado doer em um dente específico',
          'Já desistiu de um orçamento e nunca voltou']},
  {t:'virada', kick:'como é aqui', hook:'e quanto custa descobrir',
   titulo:'A primeira consulta não é tratamento. É conversa.',
   frase:'Ninguém vai te dar bronca. A gente olha, explica o que dá para fazer e você decide se quer começar.'},
  {t:'prova', kick:'o número', hook:'do primeiro passo até o fim',
   fig:'R$ 0', figl:'é o que custa saber quanto custa',
   texto:'Avaliação com raio-x e plano fechado, sem cobrança e sem compromisso. Você sai com o valor no papel e decide em casa.'},
  {t:'como', kick:'passo a passo', hook:'só falta você mandar mensagem',
   titulo:'Três passos e acabou a novela',
   passos:[['01','Avaliação','30 minutos, com documentação completa'],
           ['02','Plano','Valor, prazo e opções, tudo por escrito'],
           ['03','Começo','Em até 7 dias da sua aprovação']]},
  {t:'cta', kick:'{marca}', titulo:'Quatro anos esperando. Dez minutos para resolver.',
   texto:'Manda uma mensagem para a {marca}. A gente encaixa você esta semana.',
   botao:'Marcar minha avaliação'}
 ]},

/* 2 ------------------------------------------------------------------ */
{id:'estetica', nicho:'Estética e beleza', nome:'Se Reconhecer', cor:'#D9538A', img:'estetica.jpg',
 fonte:['Playfair Display','DM Sans'],
 desc:'Fala de autoestima sem prometer milagre. Gera salvamento e direct.',
 seq:[
  {t:'gancho', kick:'sobre o espelho', hook:'o que te venderam errado',
   titulo:'Você não quer ficar irreconhecível.',
   sub:'Quer se reconhecer de novo. São coisas diferentes, e quase ninguém trata essa diferença.'},
  {t:'tensao', kick:'por que não funcionou', hook:'confira se é o seu caso',
   titulo:'Te venderam resultado. Deviam ter vendido processo.',
   texto:'Sessão avulsa, promessa de milagre e antes e depois com luz diferente. Você gastou, viu pouco e concluiu que o problema era o seu corpo. Não era. Era o método.'},
  {t:'espelho', kick:'sinceramente', hook:'tem um jeito diferente',
   titulo:'Se você marcou dois, o problema não é você',
   itens:['Já fez sessão avulsa e não viu diferença','Compara sua foto de cinco anos atrás',
          'Evita foto de corpo inteiro','Começou três tratamentos e não terminou nenhum',
          'Já não acredita em antes e depois na internet']},
  {t:'virada', kick:'o protocolo', hook:'quantas sessões, de verdade',
   titulo:'Protocolo é o oposto de promessa.',
   frase:'A gente mede na primeira sessão, fotografa sempre na mesma luz e mostra a diferença real. Se não estiver funcionando, muda.'},
  {t:'prova', kick:'o número honesto', hook:'como começa',
   fig:'4', figl:'sessões até o espelho concordar',
   texto:'Não é uma. Quem promete uma está vendendo. É por volta da quarta que a diferença aparece sem precisar de ângulo.'},
  {t:'como', kick:'primeiros passos', hook:'a avaliação está aberta',
   titulo:'Do direct até a primeira sessão',
   passos:[['01','Avaliação','Gratuita, com plano fechado na hora'],
           ['02','Protocolo','Número de sessões e investimento definidos'],
           ['03','Registro','Foto inicial na mesma luz de todas']]},
  {t:'cta', kick:'{marca}', titulo:'Comece pelo espelho. A gente cuida do resto.',
   texto:'Chama a {marca} no direct e reserve sua avaliação desta semana.',
   botao:'Quero minha avaliação'}
 ]},

/* 3 ------------------------------------------------------------------ */
{id:'solar', nicho:'Energia solar', nome:'A Conta Invisível', cor:'#E0A81E', img:'solar.jpg',
 fonte:['Space Grotesk','Space Grotesk'],
 desc:'Transforma conta de luz em número grande. É o argumento que fecha.',
 seq:[
  {t:'gancho', kick:'conta de luz', hook:'faça a conta comigo',
   titulo:'Você já pagou por um sistema solar.',
   sub:'Só que entregou o dinheiro para a distribuidora e não levou nada para casa.'},
  {t:'tensao', kick:'o que mudou', hook:'isso vale para você?',
   titulo:'R$ 480 por mês não são R$ 480. São vinte e cinco anos.',
   texto:'Some reajuste anual, bandeira tarifária e o Fio B, a taxa que passou a ser cobrada de quem gera a própria energia. A conta sobe todo ano. O seu salário, nem sempre.'},
  {t:'espelho', kick:'confira', hook:'tem uma saída simples',
   titulo:'Três destes já pagam o sistema',
   itens:['Sua conta passou de R$ 300 por mês','O telhado é seu, não alugado',
          'Pretende ficar no imóvel por mais de cinco anos','Já pediu orçamento e adiou',
          'Ainda acha que não compensa']},
  {t:'virada', kick:'a virada', hook:'o número dos 25 anos',
   titulo:'Você não compra energia. Você para de alugar.',
   frase:'A parcela do sistema costuma ficar abaixo da conta que você já paga hoje. A diferença é que a parcela um dia termina.'},
  {t:'prova', kick:'o número', hook:'quanto tempo leva',
   fig:'R$ 144 mil', figl:'é o que a conta de luz leva em 25 anos',
   texto:'Contando só R$ 480 por mês, sem nenhum reajuste. Com reajuste, passa disso. É o valor de um imóvel indo embora em silêncio.'},
  {t:'como', kick:'como funciona', hook:'manda sua conta e eu simulo',
   titulo:'Do orçamento ao sistema gerando',
   passos:[['01','Simulação','Pela sua conta real, em 24 horas'],
           ['02','Instalação','De um a três dias no telhado'],
           ['03','Homologação','A gente resolve com a concessionária']]},
  {t:'cta', kick:'{marca}', titulo:'Manda a foto da sua conta de luz.',
   texto:'A {marca} devolve a simulação em 24 horas, sem compromisso nenhum.',
   botao:'Simular minha economia'}
 ]},

/* 4 ------------------------------------------------------------------ */
{id:'food', nicho:'Restaurante e delivery', nome:'Cansaço de Decidir', cor:'#E07A28', img:'food.jpg',
 fonte:['Fraunces','Outfit'],
 desc:'Não vende comida, vende o fim da indecisão. Direto ao apetite.',
 seq:[
  {t:'gancho', kick:'12h47', hook:'por que o aplicativo cansa',
   titulo:'Você não está sem fome. Está sem vontade de decidir.',
   sub:'De novo. E daqui a pouco vai pedir o mesmo de ontem.'},
  {t:'tensao', kick:'a rotina', hook:'reconhece a cena?',
   titulo:'Meia hora rolando para pedir o de sempre',
   texto:'Foto tratada, comida morna e uma taxa que come um terço do valor. No fim você paga caro por um almoço que não valeu nem a espera nem a decisão.'},
  {t:'espelho', kick:'todo dia', hook:'existe um jeito mais simples',
   titulo:'Se três destes acontecem, o problema não é o cardápio',
   itens:['Abre o aplicativo sem saber o que quer','Pede o mesmo prato há semanas',
          'Já cancelou pedido por causa da taxa','Recebeu comida fria mais de uma vez',
          'Almoça depois das 14h por indecisão']},
  {t:'virada', kick:'nossa proposta', hook:'e o tempo de entrega',
   titulo:'Uma opção por dia. A decisão já vem pronta.',
   frase:'Cozinha de verdade, comprada de manhã e servida no almoço. O que não sai no dia não volta para a panela amanhã.'},
  {t:'prova', kick:'o número', hook:'como pedir agora',
   fig:'30 min', figl:'da mensagem até a sua porta',
   texto:'Entrega própria, sem intermediário e sem taxa de aplicativo. Você fala direto com quem cozinha.'},
  {t:'como', kick:'é simples', hook:'o cardápio de hoje já saiu',
   titulo:'Três toques e o almoço vem',
   passos:[['01','Chama no zap','O cardápio do dia chega na hora'],
           ['02','Escolhe','A gente confirma o tempo real de entrega'],
           ['03','Recebe','Quente, na embalagem que segura o calor']]},
  {t:'cta', kick:'{marca}', titulo:'Hoje você não precisa decidir nada.',
   texto:'Chama a {marca} e veja o prato do dia. Cardápio novo todo dia às 10h.',
   botao:'Ver o cardápio de hoje'}
 ]},

/* 5 ------------------------------------------------------------------ */
{id:'fit', nicho:'Academia e personal', nome:'Não Foi Preguiça', cor:'#8BC421', img:'fit.jpg',
 fonte:['Plus Jakarta Sans','Plus Jakarta Sans'],
 desc:'Tira a culpa do aluno e devolve o problema ao método. Converte quem já desistiu.',
 seq:[
  {t:'gancho', kick:'leia se você já desistiu', hook:'o que realmente cansa',
   titulo:'Não foi preguiça. Foi treinar sem saber o que fazer hoje.',
   sub:'Decidir sozinho todo dia cansa mais que o próprio treino.'},
  {t:'tensao', kick:'o ciclo', hook:'veja se você já viveu isso',
   titulo:'Duas semanas animado, três meses culpado',
   texto:'Você começa forte, treina sem direção, não vê resultado e para. Aí vem a culpa, e a culpa vira mais um mês parado. O ciclo nunca foi sobre força de vontade.'},
  {t:'espelho', kick:'sem julgamento', hook:'dá para quebrar o ciclo',
   titulo:'Marcou dois? Você não precisa de mais vontade',
   itens:['Já pagou academia sem ir','Treina com ficha de anos atrás',
          'Não sabe se está evoluindo','Sente vergonha de não saber usar a máquina',
          'Já disse "segunda eu começo" este mês']},
  {t:'virada', kick:'o método', hook:'quanto tempo até mudar',
   titulo:'O plano se adapta a você, não o contrário.',
   frase:'Três dias por semana, uma hora cada. Se a semana virar, a gente remonta. Você só precisa aparecer.'},
  {t:'prova', kick:'o número', hook:'o que acontece em cada semana',
   fig:'30', figl:'dias para o corpo mudar de assunto',
   texto:'Não é transformação de foto. É o ponto em que a carga sobe, a técnica firma e o treino deixa de ser sacrifício.'},
  {t:'como', kick:'os 30 dias', hook:'as vagas do desafio abriram',
   titulo:'Semana a semana, sem mistério',
   passos:[['01','Semana 1','Avaliação e adaptação, sem exagero'],
           ['02','Semanas 2 e 3','A carga sobe e a técnica firma'],
           ['03','Semana 4','Reavaliação com números na mão']]},
  {t:'cta', kick:'{marca}', titulo:'Você não precisa de motivação. Precisa de um plano.',
   texto:'Chama a {marca} no direct e entre no desafio desta turma.',
   botao:'Entrar no desafio'}
 ]},

/* 6 ------------------------------------------------------------------ */
{id:'juri', nicho:'Advocacia', nome:'Antes de Assinar', cor:'#8E7CD8', img:'juri.jpg',
 fonte:['Libre Baskerville','Work Sans'],
 desc:'Autoridade com urgência real. Gera consulta sem parecer panfleto.',
 seq:[
  {t:'gancho', kick:'antes de assinar', hook:'por que a pressa não é sua',
   titulo:'A pressa da empresa não é a sua pressa.',
   sub:'Ela sabe disso desde o começo. Você costuma descobrir depois de assinar.'},
  {t:'tensao', kick:'o erro mais comum', hook:'confira o que pode faltar',
   titulo:'Assinou no mesmo dia, sem conferir uma linha',
   texto:'Depois de assinada, cobrar o que faltou deixa de ser conversa e vira processo. E processo é o caminho longo para receber aquilo que era simples de ajustar antes.'},
  {t:'espelho', kick:'verifique', hook:'existe um passo antes',
   titulo:'Sua rescisão precisa mostrar todos estes',
   itens:['Aviso prévio com os dias por ano de casa','Férias vencidas e proporcionais com o terço',
          'Décimo terceiro proporcional','FGTS em dia mais a multa de 40 por cento',
          'Horas extras, inclusive as não registradas']},
  {t:'virada', kick:'o que fazemos', hook:'quantos direitos são, afinal',
   titulo:'Conferir custa uma tarde. Não conferir custa anos.',
   frase:'Você manda o cálculo, a gente confere verba por verba e diz se falta algo. Se não faltar, a gente diz isso também.'},
  {t:'prova', kick:'o número', hook:'como enviar os documentos',
   fig:'7', figl:'direitos que precisam estar no papel',
   texto:'A maioria assina conferindo três. Os outros quatro são justamente os que costumam vir errados ou simplesmente não vir.'},
  {t:'como', kick:'como funciona', hook:'a primeira análise não custa nada',
   titulo:'Do documento ao parecer',
   passos:[['01','Envio','Rescisão e carteira pelo WhatsApp'],
           ['02','Análise','Parecer por escrito em até 48 horas'],
           ['03','Decisão','Você escolhe seguir ou encerrar ali']]},
  {t:'cta', kick:'{marca}', titulo:'Não assine hoje o que dá para conferir amanhã.',
   texto:'Mande sua rescisão para a {marca}. A primeira análise é sem custo.',
   botao:'Falar com um advogado'}
 ]},

/* 7 ------------------------------------------------------------------ */
{id:'imob', nicho:'Imobiliária', nome:'Parar de Procurar', cor:'#22A98E', img:'imob.jpg',
 fonte:['Plus Jakarta Sans','Plus Jakarta Sans'],
 desc:'Fala com quem está exausto de visitar imóvel errado. Filtra e agenda.',
 seq:[
  {t:'gancho', kick:'sobre a procura', hook:'o que o anúncio esconde',
   titulo:'Você não procura imóvel. Você procura parar de procurar.',
   sub:'São coisas diferentes, e só uma delas cansa tanto assim.'},
  {t:'tensao', kick:'o jogo do anúncio', hook:'veja quantos você já viveu',
   titulo:'"Sob consulta" é o jeito educado de dizer "vem que eu te convenço"',
   texto:'Foto de lente larga, metragem que some e condomínio que ninguém informa. Você atravessa a cidade num sábado para descobrir que não era nada daquilo.'},
  {t:'espelho', kick:'reconhece?', hook:'tem um jeito de encurtar isso',
   titulo:'Se três aconteceram, você está perdendo sábados',
   itens:['Visitou imóvel que não batia com a foto','Descobriu o condomínio só na visita',
          'Perguntou o preço e ouviu "vamos conversar"','Viu o mesmo imóvel em três anúncios',
          'Já desistiu de procurar por cansaço']},
  {t:'virada', kick:'como trabalhamos', hook:'o que vem na ficha',
   titulo:'A ficha completa chega antes de você sair de casa.',
   frase:'Metragem real, condomínio, IPTU, andar, posição do sol e o que o prédio tem. Se não servir, você não perde o sábado.'},
  {t:'prova', kick:'este imóvel', hook:'da ficha até as chaves',
   fig:'120 m²', figl:'três quartos, duas vagas, no centro',
   texto:'Planta com medidas de cada cômodo, custo mensal declarado e matrícula conferida antes de o anúncio existir.'},
  {t:'como', kick:'próximos passos', hook:'peça a ficha agora',
   titulo:'Três passos até a assinatura',
   passos:[['01','Ficha','Chega no seu WhatsApp em minutos'],
           ['02','Visita','Só se a ficha fizer sentido para você'],
           ['03','Proposta','Negociação e financiamento por nossa conta']]},
  {t:'cta', kick:'{marca}', titulo:'Seu próximo sábado pode ser livre.',
   texto:'Chama a {marca} e receba a ficha completa antes de qualquer visita.',
   botao:'Quero a ficha completa'}
 ]},

/* 8 ------------------------------------------------------------------ */
{id:'pet', nicho:'Pet shop e veterinária', nome:'Ele Lembra', cor:'#22B27A', img:'pet.jpg',
 fonte:['Bricolage Grotesque','Bricolage Grotesque'],
 desc:'Toque afetivo com uma pontada de culpa boa. Formato que mais salva.',
 seq:[
  {t:'gancho', kick:'ele não é teimoso', hook:'o que ele está lembrando',
   titulo:'Ele não foge do banho. Foge da última vez.',
   sub:'Cachorro tem memória, e a memória de um banho ruim dura muito tempo.'},
  {t:'tensao', kick:'o que acontece lá dentro', hook:'confira os sinais',
   titulo:'Gaiola de secagem, secador no ouvido e pressa',
   texto:'Ele não consegue contar o que passou. Só consegue tremer na porta na próxima vez. E aí você acha que ele é difícil, quando ele só está com medo.'},
  {t:'espelho', kick:'observe', hook:'dá para ser diferente',
   titulo:'Dois destes já dizem muita coisa',
   itens:['Ele treme quando entra na loja','Volta do banho quieto ou arisco',
          'Fica com o ouvido irritado depois','Você nunca viu onde ele espera a vez',
          'O banho demora mais de três horas']},
  {t:'virada', kick:'a regra da casa', hook:'quantos ficam esperando aqui',
   titulo:'Um profissional por animal. Sem gaiola e sem pressa.',
   frase:'Secagem na mão, avaliação de pele antes do shampoo e nenhum pet trancado esperando a vez. Se ele estressar, a gente para.'},
  {t:'prova', kick:'o número', hook:'como funciona o agendamento',
   fig:'0', figl:'animais esperando trancados aqui',
   texto:'Agenda fechada por horário, um de cada vez. Pet ansioso tem vaga no início da manhã, com a loja vazia, e custa o mesmo.'},
  {t:'como', kick:'agendar', hook:'a foto do fim é sua',
   titulo:'Simples assim',
   passos:[['01','Chama no zap','Conte a raça, o porte e o histórico'],
           ['02','Escolhe o horário','Leva e traz disponível na região'],
           ['03','Recebe a foto','De como ele saiu, em toda visita']]},
  {t:'cta', kick:'{marca}', titulo:'Da próxima vez, ele pode não tremer na porta.',
   texto:'Chama a {marca} e agende com hora marcada, sem espera em gaiola.',
   botao:'Agendar o banho dele'}
 ]},

/* 9 ------------------------------------------------------------------ */
{id:'moda', nicho:'Moda e loja de roupa', nome:'Armário Cheio', cor:'#B08968', img:'moda.jpg',
 fonte:['Playfair Display','DM Sans'],
 desc:'Editorial e silencioso. Vende curadoria, não peça.',
 seq:[
  {t:'gancho', kick:'toda manhã', hook:'por que isso acontece',
   titulo:'Não falta roupa. Falta roupa que conversa entre si.',
   sub:'É por isso que o armário está cheio e você repete as mesmas três peças.'},
  {t:'tensao', kick:'a conta escondida', hook:'confira o seu armário',
   titulo:'Compra por impulso custa duas vezes',
   texto:'Custa o preço da peça e custa o espaço que ela ocupa sem sair do cabide. Cada uma pede um sapato diferente, uma ocasião diferente. Nenhuma resolve segunda-feira.'},
  {t:'espelho', kick:'seja honesta', hook:'existe outro jeito de comprar',
   titulo:'Três destes e o problema é curadoria',
   itens:['Tem peça com etiqueta há mais de um ano','Compra na promoção e não usa',
          'Repete o mesmo look por segurança','Nada combina com o que você já tem',
          'Sente que não tem um estilo definido']},
  {t:'virada', kick:'a ideia', hook:'quantas peças bastam',
   titulo:'Doze peças que combinam entre si de propósito.',
   frase:'Mesma cartela, mesmos tecidos, mesma modelagem. Qualquer peça fecha com qualquer outra, então a semana se monta sozinha.'},
  {t:'prova', kick:'o número', hook:'como reservar a sua',
   fig:'12', figl:'peças, mais de trinta combinações',
   texto:'Alfaiataria leve, malha que respira no calor daqui e cartela neutra de três cores que se sobrepõem sem erro.'},
  {t:'como', kick:'como comprar', hook:'a coleção já está no ar',
   titulo:'Da vitrine ao seu armário',
   passos:[['01','Escolhe','Provador virtual pelo direct'],
           ['02','Reserva','Peça guardada por 48 horas'],
           ['03','Recebe','Troca livre em sete dias']]},
  {t:'cta', kick:'{marca}', titulo:'Menos peças. Mais manhãs resolvidas.',
   texto:'Chama a {marca} no direct para reservar as suas antes de acabar.',
   botao:'Ver a coleção'}
 ]},

/* 10 ----------------------------------------------------------------- */
{id:'barber', nicho:'Barbearia', nome:'Explicar com a Mão', cor:'#D99518', img:'barber.jpg',
 fonte:['Space Grotesk','Space Grotesk'],
 desc:'Dor universal e específica. Vira catálogo que o cliente salva.',
 seq:[
  {t:'gancho', kick:'toda vez a mesma', hook:'por que isso sempre dá errado',
   titulo:'Você explica com a mão. Ele entende metade.',
   sub:'E o resultado só aparece quando já não dá para voltar atrás. Aí é esperar crescer.'},
  {t:'tensao', kick:'o problema real', hook:'veja quantos você já passou',
   titulo:'Ninguém corta cabelo errado de propósito',
   texto:'A máquina liga antes de existir combinado. Você acha que foi entendido, ele acha que entendeu, e os dois só descobrem a verdade quando o espelho vira.'},
  {t:'espelho', kick:'confira', hook:'tem uma regra que resolve',
   titulo:'Dois destes e o problema não é o seu cabelo',
   itens:['Já saiu da cadeira sem gostar','Mostrou foto e veio outra coisa',
          'Usou boné por duas semanas','Trocou de barbeiro por causa de um corte',
          'Nunca soube o nome do corte que quer']},
  {t:'virada', kick:'a regra da casa', hook:'quais são os quatro',
   titulo:'A máquina só liga depois que a gente combina.',
   frase:'Você mostra a foto, a gente diz o que dá no seu cabelo e o que não dá. Só depois disso alguém encosta na sua cabeça.'},
  {t:'prova', kick:'o catálogo', hook:'como marcar o seu',
   fig:'4', figl:'cortes que resolvem noventa por cento',
   texto:'Print o que você quiser e mostre na cadeira. Cada um fica registrado na sua ficha para repetir igual na próxima.'},
  {t:'como', kick:'agendar', hook:'a cadeira está aberta esta semana',
   titulo:'Três toques e está marcado',
   passos:[['01','Escolhe','Deste catálogo mesmo, sem explicar por gesto'],
           ['02','Marca','Pelo WhatsApp, hora fechada e sem fila'],
           ['03','Senta','No horário combinado, não por ordem de chegada']]},
  {t:'cta', kick:'{marca}', titulo:'Da próxima vez, o espelho não vai te surpreender.',
   texto:'Chama a {marca} e marque seu horário com o corte já combinado.',
   botao:'Agendar meu corte'}
 ]}
];

const FONTES = [...new Set(MOLDES.flatMap(m => m.fonte))];

const API = {MOLDES, FONTES, ESTILO_SLIDE, paleta, renderSlide, renderCarrossel, esc, tinta, luz,
             lumin, contraste, corTexto};
if (typeof module !== 'undefined' && module.exports) module.exports = API;
raiz.CS = API;

})(typeof window !== 'undefined' ? window : globalThis);
