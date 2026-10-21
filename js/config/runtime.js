// Config pública de runtime del muro — mismo patrón que
// panel/js/config/runtime.js. Sin sesión de ningún tipo: esto lo ve
// cualquier persona, no hace falta login ni token de dispositivo.
const host = location.hostname;
const isLocal = host === 'localhost' || host === '127.0.0.1';

export const runtime = {
  apiBaseUrl: isLocal ? 'http://localhost:8080/api/v1' : location.origin + '/api/v1',
  appSecret: isLocal ? 'dev_secret_local' : ''
};

const override = window.__MURO_RUNTIME_OVERRIDE__;
if (override && typeof override === 'object') {
  Object.assign(runtime, override);
}
