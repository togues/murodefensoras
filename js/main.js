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

function iconoTarjeta(p) {
  return `<span class="icono ${p.naturaleza}" data-familia="${p.familia}"><svg class="i"><use href="#${ICONOS[p.familia] || ICONOS.gestion}"/></svg></span>`;
}

function formatoMes(mesHecho) {
  if (!mesHecho) return '';
  const [anio, mes] = mesHecho.split('-');
  return `${NOMBRE_MES[Number(mes) - 1]} de ${anio}`;
}

function textoCompartir(p) {
  return `${p.tipo} — ${p.canton ? p.canton + ', ' : ''}${p.departamento || ''}. ${p.resumen_publico}`;
}

function botonesCompartir(p) {
  const texto = encodeURIComponent(textoCompartir(p) + '\n\n' + location.href);
  const botones = [
    { id: 'wa', nombre: 'WhatsApp', href: `https://wa.me/?text=${texto}` },
    { id: 'fb', nombre: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}&quote=${encodeURIComponent(textoCompartir(p))}` }
  ];
  const iconoCompartir = '<svg class="i"><use href="#i-compartir"/></svg>';
  let html = botones.map((b) => `<a class="btn-compartir" href="${b.href}" target="_blank" rel="noopener">${iconoCompartir}${b.nombre}</a>`).join('');
  if (navigator.share) {
    html += `<button class="btn-compartir" data-compartir-nativo="${p.id}">${iconoCompartir}Compartir</button>`;
  }
  return html;
}

function tarjeta(p, i) {
  return `<article class="tarjeta" data-familia="${p.familia}" style="--i:${i}">
    <div class="fila-cab">
      ${iconoTarjeta(p)}
      <div>
        <div class="tipo">${p.tipo}</div>
        <div class="meta">${[p.canton, p.departamento].filter(Boolean).join(', ')}${p.mes_hecho ? ' · ' + formatoMes(p.mes_hecho) : ''}</div>
        <span class="revisado"><svg class="i"><use href="#i-check-circulo"/></svg>Revisado antes de publicarse</span>
      </div>
    </div>
    <blockquote class="resumen">${p.resumen_publico}</blockquote>
    <div class="compartir">${botonesCompartir(p)}<button class="btn-compartir btn-pdf" data-pdf="${p.id}"><svg class="i"><use href="#i-descargar"/></svg>Ficha PDF</button></div>
  </article>`;
}

function abrirFichaPdf(p) {
  const ventana = window.open('', '_blank');
  if (!ventana) return;
  const meta = [p.canton, p.departamento].filter(Boolean).join(', ') + (p.mes_hecho ? ' · ' + formatoMes(p.mes_hecho) : '');
  ventana.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${p.tipo} — Observatorio Comunitario</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;max-width:640px;margin:40px auto;padding:0 24px;color:#1c1c1c;line-height:1.6}
  h1{font-size:22px;margin:0 0 4px}
  .meta{font-size:13px;color:#555;margin-bottom:22px}
  blockquote{font-style:italic;border-left:3px solid #2c6e49;padding-left:16px;margin:0 0 26px;font-size:16px}
  .sello{display:inline-block;font-size:11px;font-weight:700;color:#2c6e49;background:#eaf3ec;border-radius:99px;padding:4px 12px;margin-bottom:20px}
  .pie{font-size:11px;color:#777;border-top:1px solid #ddd;padding-top:12px;margin-top:32px}
</style></head><body>
<span class="sello">Revisado antes de publicarse</span>
<h1>${p.tipo}</h1>
<div class="meta">${meta}</div>
<blockquote>${p.resumen_publico}</blockquote>
<div class="pie">
  Observatorio Comunitario de Vulneraciones de Derechos a Personas Defensoras.<br>
  Este resumen fue redactado y revisado por el equipo del observatorio antes de publicarse; no incluye ubicación exacta,
  nombres ni ningún otro dato que permita identificar a las personas involucradas.
</div>
</body></html>`);
  ventana.document.close();
  ventana.onload = () => ventana.print();
}

function confirmarCompartido(boton) {
  const original = boton.innerHTML;
  boton.classList.add('hecho');
  boton.innerHTML = '<svg class="i"><use href="#i-check"/></svg>Compartido';
  setTimeout(() => {
    boton.classList.remove('hecho');
    boton.innerHTML = original;
  }, 1800);
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

  feed.querySelectorAll('[data-compartir-nativo]').forEach((boton) => {
    boton.addEventListener('click', async () => {
      const p = publicaciones.find((pub) => String(pub.id) === boton.dataset.compartirNativo);
      if (!p) return;
      try {
        await navigator.share({ text: textoCompartir(p), url: location.href });
        confirmarCompartido(boton);
      } catch { /* la persona canceló el diálogo del sistema — no es un error */ }
    });
  });

  feed.querySelectorAll('[data-pdf]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const p = publicaciones.find((pub) => String(pub.id) === boton.dataset.pdf);
      if (p) abrirFichaPdf(p);
    });
  });

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
  select.insertAdjacentHTML('beforeend', departamentos.map((d) => `<option value="${d.id}">${d.nombre}</option>`).join(''));
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
enlazarSubir();
enlazarBienvenida();
enlazarSombraFiltros();
log('muro: arranque');
cargarFeed();
cargarDepartamentos();
cargarHeroStats();
