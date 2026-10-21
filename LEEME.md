# Muro público — notas para quien lo mantiene

Este archivo NO se publica (ver `.github/workflows/publicar.yml`). Los
archivos que sí se publican (`index.html`, `css/muro.css`, `js/main.js`)
van **sin comentarios**: cualquiera puede ver su código fuente.

## Anonimato total (regla de este sitio)

- En el muro no aparece **ninguna institución ni persona**: ni nombres de
  organizaciones, ni correos, ni teléfonos, ni direcciones. Tampoco en los
  comentarios del código publicado. Decisión del 21 de octubre de 2026.
- Las publicaciones dicen "Revisado antes de publicarse" / "el equipo del
  observatorio", nunca el nombre de quien revisa.
- Cada publicación trae solo: tipo de hecho, familia, cantón o
  departamento, mes y año, y el resumen redactado por el equipo. Nunca el
  relato, la comunidad, el punto exacto, las fotos ni el folio.

## Paleta

Cinco colores: naranja `#e4672f`, verde `#b6d066`, ámbar `#e0b34f`, azul
`#6dafdf` y negro `#212121`. Los cuatro de color son **categorías**, uno
por familia de hecho (naranja = A personas, azul = Agua y tierra, ámbar =
Gestiones, verde = Logros), nunca estados. Cada uno tiene tres formas:
marca (rellenos), fuerte (texto sobre claro, 4,5:1) y tinte (fondos).
Nunca texto blanco sobre un color de marca: va en negro. Sin rojo.

## Publicación

El flujo publica solo `index.html`, `css/` y `js/main.js`. La
configuración (`js/config/`, con `runtime.local.js` en el servidor), la
conexión con la API (`js/data/`, `js/core/`) y las pruebas no se tocan.
Si se cambia uno de esos archivos, hay que sacarlo de la lista de
exclusiones del flujo.

## Foto del banner

Si existe `img/portada.jpg` (paisaje o agua, nunca personas
reconocibles), aparece detrás del título con una capa oscura.
