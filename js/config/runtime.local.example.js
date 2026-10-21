/* Plantilla para runtime.local.js — mismo patrón que
   app/ y panel/. En el servidor:

     cp js/config/runtime.local.example.js js/config/runtime.local.js
     # editar appSecret (= API_SECRET del .env del API)

   No hace falta nada más acá: el muro no tiene sesión de ningún tipo,
   lo ve cualquier persona sin identificarse. */
window.__MURO_RUNTIME_OVERRIDE__ = {
  appSecret: 'PEGAR_AQUI_EL_MISMO_API_SECRET_DEL_ENV'
};
