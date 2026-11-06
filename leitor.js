/* Progressive enhancement. The source reading flow never depends on PageFlip. */
(async () => {
  const source = document.querySelector('#livro');
  const pages = [...source.querySelectorAll('.pagina')];
  const stage = document.querySelector('.book-stage');
  const mount = document.querySelector('#livro-montado');
  const wrap = document.querySelector('#book-wrap');
  const params = new URLSearchParams(location.search);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const wide = matchMedia('(min-width: 1000px) and (min-height: 650px)');
  const names = ['Capa','Carta de abertura','Sumário','A época do ano','Agenda da quinzena','Aconteceu no Quintal','Vida nas turmas','Recados e lembretes','Para fazer em casa','Contracapa'];
  let current = Math.max(0, Math.min(9, Number(params.get('pagina')) || 0));
  let pf = null, chosenMode = null, switching = false, mode = 'leitura';
  const previous = document.querySelector('#voltar');
  const next = document.querySelector('#avancar');
  const status = document.querySelector('#onde');
  const toc = document.querySelector('.indice');
  const key = 'caderno-quintal:2026-11-2:mochila';
  let checks = [];
  try { checks = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
  const clean = n => Math.max(0, Math.min(9, Number(n) || 0));
  function updateUrl() { const u=new URL(location.href); if(current)u.searchParams.set('pagina',current);else u.searchParams.delete('pagina');u.hash=''; history.replaceState(null,'',u); }
  function updateChecks(){
    document.querySelectorAll('.marcar').forEach((b,i)=>{const id=i%4;b.dataset.check=id;b.setAttribute('aria-pressed',String(checks.includes(id)));});
  }
  function markBookPages() {
    if(!pf)return;
    const i=pf.getCurrentPageIndex();
    const visible = i===0||i===9?[i]:(i%2?[i,i+1]:[i-1,i]);
    if(!visible.includes(current))current=i;
    [...mount.querySelectorAll('.pagina')].forEach((el,j)=>{el.inert=!visible.includes(j);el.setAttribute('aria-hidden',String(!visible.includes(j)));});
    mount.style.setProperty('--escala',(pf.getBoundsRect().pageWidth/380).toFixed(4));
    wrap.dataset.fechado=i===0?'capa':i===9?'contracapa':'';
    status.textContent=i===0?'Capa':i===9?'Contracapa':`Páginas ${visible[0]} e ${visible[1]}`;
    previous.disabled=i===0; next.disabled=i===9;
    updateUrl();
  }
  function dimensionBook(){wrap.style.setProperty('--largura',Math.floor(Math.min(innerWidth-100,(innerHeight-310)*760/540,1120))+'px');}
  async function initBook(){
    if(pf)return;
    while(document.body.dataset.pronto!=='1'){await new Promise(r=>setTimeout(r,20));}
    mount.dataset.epoca=source.dataset.epoca;
    pages.forEach(p=>{const c=p.cloneNode(true);c.removeAttribute('id');c.setAttribute('tabindex','-1');c.classList.add('ativa');mount.append(c);});
    dimensionBook();
    pf=new St.PageFlip(mount,{width:380,height:540,size:'stretch',minWidth:1,maxWidth:640,minHeight:170,maxHeight:910,startPage:current,showCover:true,usePortrait:false,drawShadow:true,maxShadowOpacity:.18,flippingTime:reduced.matches?1:700,disableFlipByClick:true,clickEventForward:false,mobileScrollSupport:true,showPageCorners:false});
    pf.loadFromHTML([...mount.querySelectorAll('.pagina')]);
    pf.on('flip',markBookPages);pf.on('changeOrientation',markBookPages);
    markBookPages();updateChecks();
    // All controls are handled by the reader rather than the page-turn library.
    mount.querySelectorAll('a,button').forEach(el=>el.addEventListener('pointerdown',e=>e.stopPropagation()));
    window.caderno=pf;
  }
  function focusPage(n,focus=true){
    const el=pages[n];
    el.scrollIntoView({behavior:'instant',block:'start'});
    if(focus)el.focus({preventScroll:true});
  }
  let focusRequest=0;
  async function focusBookPage(n){
    const request=++focusRequest;
    // PageFlip applies display/geometry on its animation frame. Focusing the
    // destination synchronously after turnToPage leaves focus on BODY.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    for(let frame=0;frame<30;frame++){
      if(request!==focusRequest||mode!=='livro'||current!==n)return;
      const target=mount.querySelector(`[data-pagina="${n}"]`);
      if(target&&!target.inert&&target.getClientRects().length&&getComputedStyle(target).visibility!=='hidden'){
        target.focus({preventScroll:true});
        if(document.activeElement===target)return;
      }
      await new Promise(resolve=>requestAnimationFrame(resolve));
    }
  }
  async function setMode(desired,{focus=false}={}){
    if(!wide.matches)desired='leitura';
    if(desired===mode && (desired!=='livro'||pf))return;
    switching=true;mode=desired;
    document.body.dataset.modo=mode;
    document.querySelectorAll('.modos button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.modo===mode)));
    if(mode==='livro'){
      stage.hidden=false;stage.inert=false;document.querySelector('.palco').inert=true;
      await initBook();dimensionBook();pf.update();pf.turnToPage(current);markBookPages();scrollTo({top:0,behavior:'instant'});if(focus)await focusBookPage(current);
    }else{
      stage.hidden=true;stage.inert=true;document.querySelector('.palco').inert=false;
      requestAnimationFrame(()=>focusPage(current,focus));
    }
    setTimeout(()=>{switching=false;},200);
  }
  async function go(n,{focus=true}={}){
    current=clean(n);toc.open=false;switching=true;setTimeout(()=>{switching=false;},250);
    if(mode==='livro'){await initBook();pf.turnToPage(current);markBookPages();if(focus)await focusBookPage(current);}
    else focusPage(current,focus);
    updateUrl();
  }
  document.addEventListener('click',e=>{
    const link=e.target.closest('[data-ir]');
    if(link){e.preventDefault();e.stopPropagation();go(link.dataset.ir);return;}
    const check=e.target.closest('.marcar');
    if(check){e.preventDefault();e.stopPropagation();const id=Number(check.dataset.check);checks=checks.includes(id)?checks.filter(x=>x!==id):[...checks,id];try{localStorage.setItem(key,JSON.stringify(checks));}catch{}updateChecks();}
  });
  document.querySelectorAll('.modos button').forEach(b=>b.addEventListener('click',()=>{chosenMode=b.dataset.modo;setMode(chosenMode,{focus:true});}));
  previous.addEventListener('click',()=>pf?.flipPrev());next.addEventListener('click',()=>pf?.flipNext());
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){toc.open=false;return;}
    if(mode!=='livro'||e.target.closest('input,textarea,select,button,a,summary'))return;
    if(e.key==='ArrowRight'){e.preventDefault();pf?.flipNext();}
    if(e.key==='ArrowLeft'){e.preventDefault();pf?.flipPrev();}
  });
  document.addEventListener('click',e=>{if(!toc.contains(e.target))toc.open=false;});
  function chooseSeason(ep){
    const allowed=['primavera','lanterna','advento'];if(!allowed.includes(ep))return;
    document.querySelectorAll('.caderno').forEach(c=>c.dataset.epoca=ep);
    // Apply the authored seasonal illustration in both representations.
    document.querySelectorAll('[data-aplique]').forEach(g=>{
      const original=source.querySelector(`[data-aplique="${g.dataset.aplique}"]`);
      if(original&&g!==original)g.innerHTML=original.innerHTML;
    });
    const u=new URL(location.href);u.searchParams.set('epoca',ep);history.replaceState(null,'',u);
  }
  document.querySelectorAll('.aprovacao button').forEach(b=>b.addEventListener('click',()=>{
    // The original graphics module owns the artwork and exposes the event bridge.
    document.dispatchEvent(new CustomEvent('caderno:epoca',{detail:b.dataset.epoca}));chooseSeason(b.dataset.epoca);
    document.querySelectorAll('.aprovacao button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  }));
  document.querySelector('.imprimir').addEventListener('click',()=>print());
  updateChecks();
  const note=document.createElement('p');note.className='checklist-nota';note.textContent='Sua lista fica salva apenas neste navegador.';source.querySelector('.checklist').after(note);
  let scrollTick=false;
  function readPosition(){
    if(mode!=='leitura'||switching)return;
    const line=document.querySelector('.cabecalho').getBoundingClientRect().bottom+40;
    const active=pages.find(p=>{const r=p.getBoundingClientRect();return r.top<=line&&r.bottom>line;});
    if(active){current=Number(active.dataset.pagina);document.body.dataset.pagina=current;}
  }
  addEventListener('scroll',()=>{if(!scrollTick){scrollTick=true;requestAnimationFrame(()=>{readPosition();scrollTick=false;});}},{passive:true});
  let resizeTimer;
  addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{
    const desired=wide.matches?(chosenMode||'livro'):'leitura';
    if(desired!==mode)setMode(desired);
    else if(pf&&mode==='livro'){dimensionBook();pf.update();markBookPages();}
  },160);});
  addEventListener('popstate',()=>{const p=new URLSearchParams(location.search);go(p.get('pagina')||0);});
  addEventListener('hashchange',()=>{const m=location.hash.match(/^#pagina-(\d)$/);if(m)go(m[1]);});
  if(params.has('pdf')){document.body.dataset.pronto='1';return;}
  await setMode(wide.matches?'livro':'leitura');
  if(mode==='leitura'&&current)requestAnimationFrame(()=>focusPage(current,false));
  window.leitor={go,setMode,get current(){return current;},get mode(){return mode;}};
})();
