import { log } from './core/logger.js';
import { obtenerMuro, obtenerEstadisticas, obtenerCatalogos } from './data/api-client.js';

const NOMBRE_FAMILIA = { persona: 'A personas', territorio: 'Agua y tierra', gestion: 'Gestión', logro: 'Logro' };
const NOMBRE_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const POR_PAGINA = 12;

const ICONOS = { persona: 'i-persona', territorio: 'i-gota', gestion: 'i-carta', logro: 'i-estrella' };

let filtroFamilia = 'todos';
let filtroDepartamento = '';
let filtroBusqueda = '';
let paginaActual = 1;

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

function iconoTarjeta(p) {
  return `<span class="icono ${esc(p.naturaleza)}" data-familia="${esc(p.familia)}"><svg class="i"><use href="#${ICONOS[p.familia] || ICONOS.gestion}"/></svg></span>`;
}

function formatoMes(mesHecho) {
  if (!mesHecho) return '';
  const [anio, mes] = mesHecho.split('-');
  return `${NOMBRE_MES[Number(mes) - 1]} de ${anio}`;
}

function lugar(p) {
  return [p.canton, p.departamento].filter(Boolean).join(', ');
}

function botonPdf(p, conTexto) {
  const clase = conTexto ? 'btn-compartir' : 'btn-icono';
  return `<button type="button" class="${clase}" data-pdf="${p.id}" aria-label="Descargar la ficha en PDF" title="Descargar la ficha en PDF"><svg class="i"><use href="#i-descargar"/></svg>${conTexto ? 'Ficha PDF' : ''}</button>`;
}

function tarjeta(p, i) {
  return `<article class="tarjeta" data-familia="${esc(p.familia)}" style="--i:${i}">
    <div class="fila-cab">
      ${iconoTarjeta(p)}
      <div>
        <div class="tipo">${esc(p.tipo)}</div>
        <div class="meta">${esc(lugar(p))}${p.mes_hecho ? ' · ' + formatoMes(p.mes_hecho) : ''}</div>
        <span class="revisado"><svg class="i"><use href="#i-check-circulo"/></svg>Revisado antes de publicarse</span>
      </div>
    </div>
    <blockquote class="resumen">${esc(p.resumen_publico)}</blockquote>
    <div class="acciones">
      <button type="button" class="btn-ver" data-ver="${p.id}">Ver el caso completo</button>
      <div class="compartir">${botonPdf(p, false)}</div>
    </div>
  </article>`;
}

function filasDatos(p) {
  return [
    ['Tipo de hecho', p.tipo],
    ['Categoría', NOMBRE_FAMILIA[p.familia] || p.familia],
    ['Departamento', p.departamento],
    ['Cantón', p.canton],
    ['Cuándo ocurrió', formatoMes(p.mes_hecho)]
  ].filter(([, v]) => v);
}

function abrirFicha(p, origen) {
  const ficha = document.getElementById('ficha');
  ficha.dataset.familia = p.familia;
  ficha.querySelector('.ficha__cuerpo').innerHTML = `
    <header class="ficha__cab">
      <span class="ficha__disco"><svg class="i"><use href="#${ICONOS[p.familia] || ICONOS.gestion}"/></svg></span>
      <div>
        <span class="ficha__familia">${esc(NOMBRE_FAMILIA[p.familia] || p.familia)}</span>
        <h2 id="ficha-titulo">${esc(p.tipo)}</h2>
        <p class="ficha__meta">${esc(lugar(p))}${p.mes_hecho ? ' · ' + formatoMes(p.mes_hecho) : ''}</p>
      </div>
    </header>
    <div class="ficha__contenido">
      <span class="revisado"><svg class="i"><use href="#i-check-circulo"/></svg>Revisado antes de publicarse</span>
      <h3>Lo que pasó</h3>
      <p class="ficha__relato">${esc(p.resumen_publico)}</p>
      <h3>Datos del caso</h3>
      <dl class="ficha__datos">${filasDatos(p).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <p class="ficha__nota"><svg class="i"><use href="#i-escudo"/></svg>Lo cuenta la comunidad y lo revisó el equipo del observatorio antes de publicarlo: se quitaron nombres, lugares exactos y todo lo que pueda identificar a una persona.</p>
    </div>
    <footer class="ficha__pie">${botonPdf(p, true)}</footer>`;
  enlazarAcciones(ficha, [p]);
  ficha.showModal();
  ficha.querySelector('.ficha__cerrar').focus();
  ficha.addEventListener('close', () => origen?.focus(), { once: true });
}

function enlazarFicha() {
  const ficha = document.getElementById('ficha');
  ficha.querySelector('.ficha__cerrar').addEventListener('click', () => ficha.close());
  ficha.addEventListener('click', (e) => { if (e.target === ficha) ficha.close(); });
}

function abrirFichaPdf(p) {
  const ventana = window.open('', '_blank');
  if (!ventana) return;
  const color = { persona: '#e4672f', territorio: '#6dafdf', gestion: '#e0b34f', logro: '#b6d066' }[p.familia] || '#e3dfde';
  const hoy = new Date().toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' });
  ventana.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${esc(p.tipo)} — Ficha de caso</title>
<style>
  @page{size:letter;margin:18mm 16mm}
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#212121;max-width:720px;margin:24px auto;padding:0 20px;line-height:1.55;font-size:13px}
  .franja{display:grid;grid-template-columns:repeat(4,1fr);height:6px;margin-bottom:14px}
  .franja i:nth-child(1){background:#e4672f}.franja i:nth-child(2){background:#6dafdf}.franja i:nth-child(3){background:#e0b34f}.franja i:nth-child(4){background:#b6d066}
  .cab{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;border-bottom:2px solid #212121;padding-bottom:10px}
  .cab strong{display:block;font-size:14px}
  .cab span{font-size:11px;color:#585350}
  .etiqueta{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#585350}
  .titulo{margin:22px 0 18px;padding:16px 18px;border-left:8px solid ${color};background:#f8f5f4;border-radius:0 8px 8px 0}
  .titulo .etiqueta{color:#212121}
  h1{font-size:24px;margin:4px 0 2px;letter-spacing:-.01em}
  .meta{font-size:13px;color:#585350}
  .sello{display:inline-block;margin-top:8px;font-size:11px;font-weight:700;color:#1f7a4d;background:#e8f7f0;border-radius:99px;padding:3px 11px}
  h2{font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin:22px 0 8px;color:#585350}
  .relato{font-size:14.5px;line-height:1.7;white-space:pre-line;margin:0}
  table{width:100%;border-collapse:collapse}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #e3dfde;vertical-align:top}
  th{width:34%;font-weight:600;color:#585350}
  .pie{margin-top:30px;padding-top:12px;border-top:1px solid #e3dfde;font-size:10.5px;color:#7f7976;display:flex;justify-content:space-between;gap:16px}
</style></head><body>
<div class="franja"><i></i><i></i><i></i><i></i></div>
<div class="cab">
  <div><strong>Observatorio Comunitario</strong></div>
  <span class="etiqueta">Ficha de caso</span>
</div>
<div class="titulo">
  <span class="etiqueta">${esc(NOMBRE_FAMILIA[p.familia] || p.familia)}</span>
  <h1>${esc(p.tipo)}</h1>
  <div class="meta">${esc(lugar(p))}${p.mes_hecho ? ' · ' + formatoMes(p.mes_hecho) : ''}</div>
  <span class="sello">Revisado antes de publicarse</span>
</div>
<h2>Lo que pasó</h2>
<p class="relato">${esc(p.resumen_publico)}</p>
<h2>Datos del caso</h2>
<table>${filasDatos(p).map(([k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('')}</table>
<div class="pie">
  <span>Texto contado por la comunidad y revisado por el equipo del observatorio antes de publicarse: se quitaron nombres, lugares exactos y cualquier dato que permita identificar a las personas involucradas.</span>
  <span style="white-space:nowrap">Emitida el ${hoy}</span>
</div>
</body></html>`);
  ventana.document.close();
  ventana.onload = () => ventana.print();
}

function enlazarAcciones(raiz, publicaciones) {
  const buscar = (id) => publicaciones.find((pub) => String(pub.id) === id);
  raiz.querySelectorAll('[data-pdf]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const p = buscar(boton.dataset.pdf);
      if (p) abrirFichaPdf(p);
    });
  });
  raiz.querySelectorAll('[data-ver]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const p = buscar(boton.dataset.ver);
      if (p) abrirFicha(p, boton);
    });
  });
}

async function cargarFeed() {
  const feed = document.getElementById('feed');
  feed.innerHTML = '<p class="cargando">Cargando…</p>';

  const filtros = { pagina: paginaActual, por_pagina: POR_PAGINA };
  if (filtroFamilia !== 'todos') filtros.familia = filtroFamilia;
  if (filtroDepartamento) filtros.departamento_id = filtroDepartamento;
  if (filtroBusqueda) filtros.q = filtroBusqueda;

  const r = await obtenerMuro(filtros);
  if (!r.ok) {
    feed.innerHTML = `<p class="error-carga">No se pudo cargar: ${r.error}</p>`;
    return;
  }

  const { publicaciones, total } = r.data;
  feed.innerHTML = publicaciones.length
    ? publicaciones.map(tarjeta).join('')
    : '<p class="vacio">Todavía no hay publicaciones con este filtro.</p>';

  enlazarAcciones(feed, publicaciones);

  pintarPaginacion(total);
}

function pintarPaginacion(total) {
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const cont = document.getElementById('paginacion');
  if (totalPaginas <= 1) {
    cont.innerHTML = '';
    return;
  }
  cont.innerHTML = `
    <button class="btn-compartir" ${paginaActual <= 1 ? 'disabled' : ''} id="pag-antes">‹ Anteriores</button>
    <span style="margin:0 10px;font-size:12.5px;color:var(--on-surface-var)">Página ${paginaActual} de ${totalPaginas}</span>
    <button class="btn-compartir" ${paginaActual >= totalPaginas ? 'disabled' : ''} id="pag-despues">Siguientes ›</button>`;
  document.getElementById('pag-antes')?.addEventListener('click', () => { paginaActual--; cargarFeed(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.getElementById('pag-despues')?.addEventListener('click', () => { paginaActual++; cargarFeed(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
}

function enlazarFiltros() {
  document.querySelectorAll('.filtro-pill[data-f]').forEach((el) => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.filtro-pill[data-f]').forEach((f) => f.classList.remove('act'));
      el.classList.add('act');
      filtroFamilia = el.dataset.f;
      paginaActual = 1;
      cargarFeed();
    });
  });
  document.getElementById('filtro-departamento').addEventListener('change', (e) => {
    filtroDepartamento = e.target.value;
    paginaActual = 1;
    cargarFeed();
  });
}

function enlazarBusqueda() {
  const input = document.getElementById('buscar-input');
  let temporizador;
  input.addEventListener('input', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      filtroBusqueda = input.value.trim();
      paginaActual = 1;
      cargarFeed();
    }, 350);
  });
}

async function cargarDepartamentos() {
  const r = await obtenerCatalogos();
  if (!r.ok) return;
  const select = document.getElementById('filtro-departamento');
  const departamentos = (r.data.departamentos || []).slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  select.insertAdjacentHTML('beforeend', departamentos.map((d) => `<option value="${d.id}">${esc(d.nombre)}</option>`).join(''));
}

function pintarConteosPills(totalPorFamilia) {
  const total = Object.values(totalPorFamilia).reduce((a, b) => a + b, 0);
  const elTodos = document.querySelector('.filtro-pill__n[data-conteo="todos"]');
  if (elTodos) elTodos.textContent = total || '';
  for (const familia of Object.keys(ICONOS)) {
    const el = document.querySelector(`.filtro-pill__n[data-conteo="${familia}"]`);
    if (el) el.textContent = totalPorFamilia[familia] || '';
  }
}

async function cargarHeroStats() {
  const r = await obtenerEstadisticas();
  if (!r.ok) return;
  const totalPorFamilia = {};
  for (const c of r.data.conteos) {
    totalPorFamilia[c.familia] = (totalPorFamilia[c.familia] || 0) + c.total;
  }
  pintarConteosPills(totalPorFamilia);
  const items = Object.entries(totalPorFamilia).map(([familia, total]) => ({ n: total, t: NOMBRE_FAMILIA[familia] || familia, i: ICONOS[familia] || ICONOS.gestion, familia }));
  if (!items.length) return;
  document.getElementById('hero-stats').innerHTML = items.map((it) => `<div data-familia="${it.familia}"><svg class="i"><use href="#${it.i}"/></svg><b data-cuenta="${it.n}">0</b><span>${it.t}</span></div>`).join('');
  document.querySelectorAll('#hero-stats b[data-cuenta]').forEach(animarConteo);
}

function animarConteo(el) {
  const destino = Number(el.dataset.cuenta);
  if (!destino || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = destino;
    return;
  }
  const duracion = 700;
  const inicio = performance.now();
  function paso(ahora) {
    const avance = Math.min(1, (ahora - inicio) / duracion);
    el.textContent = Math.round(destino * (1 - (1 - avance) ** 3));
    if (avance < 1) requestAnimationFrame(paso);
  }
  requestAnimationFrame(paso);
}

function enlazarBienvenida() {
  const YA_VISTA = 'muro_bienvenida_vista';
  const modal = document.getElementById('bienvenida');
  let yaVista = false;
  try { yaVista = localStorage.getItem(YA_VISTA) === '1'; } catch { /* modo privado: se muestra cada vez, no es grave */ }

  if (!yaVista) modal.classList.add('on');

  document.getElementById('bienvenida-cerrar').addEventListener('click', () => {
    modal.classList.remove('on');
    try { localStorage.setItem(YA_VISTA, '1'); } catch { /* da igual */ }
  });
}

let temporizadorToast;
function enlazarMenuSuperior() {
  const toast = document.getElementById('nav-toast');
  document.querySelectorAll('[data-proximamente]').forEach((boton) => {
    boton.addEventListener('click', () => {
      clearTimeout(temporizadorToast);
      toast.hidden = false;
      toast.classList.remove('oculto');
      temporizadorToast = setTimeout(() => {
        toast.classList.add('oculto');
        setTimeout(() => { toast.hidden = true; }, 220);
      }, 2600);
    });
  });
}

function enlazarSombraFiltros() {
  const barra = document.getElementById('filtros');
  const actualizar = () => barra.classList.toggle('sombra', window.scrollY > 4);
  document.addEventListener('scroll', actualizar, { passive: true });
  actualizar();
}

function cargarFotoPortada() {
  const foto = new Image();
  foto.onload = () => {
    document.getElementById('hero').classList.add('hero--con-foto');
    document.querySelector('.hero-foto').style.backgroundImage = `url("${foto.src}")`;
  };
  foto.src = 'img/portada.jpg';
}

cargarFotoPortada();
enlazarFiltros();
enlazarBusqueda();
function enlazarSubir() {
  const boton = document.getElementById('subir');
  const actualizar = () => { boton.hidden = window.scrollY < 700; };
  document.addEventListener('scroll', actualizar, { passive: true });
  boton.addEventListener('click', () => {
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: suave ? 'smooth' : 'auto' });
  });
  actualizar();
}

enlazarMenuSuperior();
enlazarFicha();
enlazarSubir();
enlazarBienvenida();
enlazarSombraFiltros();
log('muro: arranque');
cargarFeed();
cargarDepartamentos();
cargarHeroStats();
