/* Cliente del API del muro — versión mínima: solo lectura, sin sesión
   de ningún tipo. Mismo patrón de envoltura que app/ y panel/. */
import { runtime } from '../config/runtime.js';

function buildUrl(path) {
  return runtime.apiBaseUrl.replace(/\/$/, '') + path;
}

async function pedir(path, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = { Accept: 'application/json' };
    if (runtime.appSecret) headers['X-App-Secret'] = runtime.appSecret;
    const respuesta = await fetch(buildUrl(path), { headers, signal: controller.signal });
    const cuerpo = await respuesta.json().catch(() => null);
    if (!cuerpo) return { ok: false, code: 'RESPUESTA_INVALIDA', error: 'Respuesta inválida del servidor' };
    if (!respuesta.ok || cuerpo.success !== true) {
      return { ok: false, code: cuerpo.code || 'ERROR', error: cuerpo.error || 'Error del servidor' };
    }
    return { ok: true, data: cuerpo.data };
  } catch (e) {
    const code = e.name === 'AbortError' ? 'TIEMPO_AGOTADO' : 'SIN_CONEXION';
    return { ok: false, code, error: 'No se pudo conectar con el servidor' };
  } finally {
    clearTimeout(timer);
  }
}

export function obtenerMuro(filtros = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filtros)) {
    if (v !== '' && v !== null && v !== undefined) params.set(k, v);
  }
  const qs = params.toString();
  return pedir('/publico/muro' + (qs ? '?' + qs : ''));
}

export function obtenerEstadisticas() {
  return pedir('/publico/estadisticas');
}

// El filtro de departamento reutiliza /catalogos, igual que el panel
// reutiliza el mismo endpoint para su filtro de comunidad.
export function obtenerCatalogos() {
  return pedir('/catalogos');
}
