import { chromium } from 'playwright';

const b = await chromium.launch();
const p = await b.newPage();
const errores = [];
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
p.on('pageerror', (e) => errores.push('pageerror: ' + e.message));

const s = {};
async function paso(nombre, fn) {
  try {
    await fn();
    s[nombre] = true;
  } catch (e) {
    s[nombre] = false;
    console.error(`FALLO en "${nombre}":`, e.message);
  }
}

await p.goto('http://localhost:8904/index.html', { waitUntil: 'networkidle' });

await paso('bienvenida_aparece_en_la_primera_visita', async () => {
  await p.waitForSelector('#bienvenida.on', { timeout: 4000 });
});

await paso('cerrar_bienvenida_la_oculta_y_no_reaparece_al_recargar', async () => {
  await p.click('#bienvenida-cerrar');
  await p.waitForTimeout(200);
  const abierta = await p.locator('#bienvenida.on').count();
  if (abierta !== 0) throw new Error('la bienvenida no se cerró');
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  const reaparecio = await p.locator('#bienvenida.on').count();
  if (reaparecio !== 0) throw new Error('la bienvenida reapareció tras recargar');
});

await paso('feed_muestra_publicaciones_reales_sin_folio', async () => {
  await p.waitForSelector('.tarjeta', { timeout: 8000 });
  const total = await p.locator('.tarjeta').count();
  if (total === 0) throw new Error('el muro está vacío');
  const texto = await p.locator('.feed').textContent();
  if (/SV\d{2}-\d{4}-\d{4}/.test(texto)) throw new Error('el muro mostró un folio — no debería (api_v1.md sección 5)');
});

await paso('filtro_logro_muestra_solo_logros', async () => {
  await p.click('.filtro-pill[data-f="logro"]');
  await p.waitForTimeout(400);
  const tarjetas = await p.locator('.tarjeta').count();
  if (tarjetas !== 2) throw new Error('esperaba 2 logros de demo, hay ' + tarjetas);
  const iconos = await p.locator('.tarjeta .icono.positivo').count();
  if (iconos !== tarjetas) throw new Error('no todas las tarjetas de "logro" muestran ícono positivo');
});

await paso('filtro_departamento_se_llena_con_datos_reales', async () => {
  await p.click('.filtro-pill[data-f="todos"]');
  await p.waitForFunction(() => document.getElementById('filtro-departamento')?.options.length > 1, { timeout: 4000 });
  const opciones = await p.locator('#filtro-departamento option').allTextContents();
  if (!opciones.some((o) => o.includes('Usulut'))) throw new Error('no apareció un departamento real: ' + opciones.join(', '));
});

await paso('boton_whatsapp_apunta_a_wa_me_con_el_resumen', async () => {
  const href = await p.locator('.tarjeta .btn-compartir').first().getAttribute('href');
  if (!href.startsWith('https://wa.me/')) throw new Error('el botón de WhatsApp no apunta a wa.me: ' + href);
});

await paso('hero_muestra_estadisticas_agregadas_reales', async () => {
  await p.waitForSelector('#hero-stats > div', { timeout: 8000 });
  const texto = await p.locator('#hero-stats').textContent();
  if (!/\d/.test(texto)) throw new Error('las estadísticas del encabezado no mostraron ningún número: ' + texto);
});

console.log(JSON.stringify(s, null, 2));
const fallas = Object.entries(s).filter(([, v]) => v !== true);
const erroresInesperados = errores.filter((e) => !/Failed to load resource.*404/.test(e));
console.log('errores de consola inesperados:', erroresInesperados);
console.log(fallas.length === 0 && erroresInesperados.length === 0 ? 'TODO OK' : 'FALLAS: ' + JSON.stringify(fallas));

await b.close();
process.exit(fallas.length === 0 && erroresInesperados.length === 0 ? 0 : 1);
