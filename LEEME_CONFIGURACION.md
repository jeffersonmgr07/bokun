# My Cusco Trip · Portal privado

## Qué incluye

- `Index.html`: nuevo diseño responsive de acceso personal; correo, país, número asociado y OTP de seis dígitos.
- `Code.gs`: verificador de usuarios y códigos en servidor, envío de correo y sesiones temporales.
- `Countries.gs` y `Countries.html`: 236 países y territorios con códigos de marcación.
- `Theme.html`: rediseño CSS sobre el dashboard existente (reservas, finanzas, productos, disponibilidad, rendimiento, opiniones y marketplace).
- `UiBridge.html`: presentación de marca y conexión del botón «Cerrar sesión» con el servidor.
- `Vista_previa_login.html`: vista del diseño Bókun-inspired con identidad propia, sin envío de códigos.
- `countries.json`: catálogo de 236 países y territorios, con sus prefijos.

## Paso 1 · Resguardar el dashboard original

El HTML original se encuentra en:

https://github.com/viatorsupplier/mycuscotrip/blob/main/dashboard.html

**IMPORTANTE:** el archivo original del repositorio es público e incluye datos de demostración (nombres, pasaportes ficticios, fechas e importes). El login del repositorio anterior no protege esos datos: el script tiene una contraseña en el navegador, el código OTP incluía un modo local y el dashboard declara `REQUIRE_LOGIN = false`.

Para que el acceso sea privado, crea el proyecto de Apps Script en tu cuenta y **copia el contenido de `dashboard.html` exclusivamente a un archivo HTML privado llamado `Dashboard.html` dentro de Apps Script**. Después de migrar, retira el dashboard con datos del repositorio público o vuelve privado el repositorio. No publiques `Dashboard.html` en GitHub Pages.

El archivo Dashboard.html **no se incluye en este ZIP** porque su contenido se conserva en tu repositorio tal cual, sin reescribir sus miles de líneas.

## Paso 2 · Crear proyecto de Google Apps Script

1. Abre https://script.google.com y crea un proyecto nuevo llamado `My Cusco Trip · Portal`.
2. Sustituye `Code.gs` por el archivo de este paquete.
3. Agrega otro archivo de script `Countries.gs` y pega su contenido.
4. Crea archivos HTML `Index`, `Countries`, `Theme`, `UiBridge` y `Dashboard` (nombres exactos). Pega en cada uno el contenido homónimo del paquete y, en `Dashboard`, el HTML original de tu repositorio.
5. En **Configuración del proyecto → Propiedades del script**, crea `AUTHORIZED_USERS_JSON` con un listado de **hasta 5 usuarios**; cada cuenta debe tener su propio correo y teléfono asociado.

Ejemplo de formato (reemplaza los datos de ejemplo por tus cinco cuentas reales):

```json
[
  {"email":"contact@mycuscotrip.com","country":"PE","phone":"+519XXXXXXXX","active":true}
]
```

La clave `phone` debe contener **el prefijo internacional y el celular completo, sin espacios**. El ejemplo con `X` no funcionará; tienes que introducir el número verdadero. Si un número de otro país incluye prefijos de marcación especiales, asegúrate de que coincida con el que se selecciona en el formulario.

No guardes esta lista en el HTML ni en el repositorio público. No hace falta usar contraseñas ni habilitar registro abierto: las cuentas se administran desde las Propiedades del Script.

## Paso 3 · Autorizar e implementar

1. Guarda el proyecto. Autoriza los permisos de MailApp del propietario cuando corresponda.
2. Haz **Implementar → Nueva implementación → Aplicación web**.
3. **Ejecutar como:** tu cuenta (propietario del script).
4. **Quién tiene acceso:** cualquier usuario con el enlace (el verificador solo permite iniciar sesión a los 1–5 pares correo/teléfono configurados).
5. Copia la URL `/exec` de Apps Script. Esa será la URL del portal con autenticación del servidor.
6. Abre la URL `/exec`, completa correo, país y celular; revisa el código en el correo y entra.

### Cómo funciona

- Acceso: correo autorizado + país/prefijo + teléfono exacto.
- OTP: **6 dígitos, vigencia de 5 minutos, un solo uso**.
- Se bloquean los códigos después de 5 intentos y se limitan a 3 envíos por 15 minutos para cada cuenta. Las respuestas no revelan si un correo está autorizado.
- Sesión temporal del servidor: 2 horas, con token en `sessionStorage` del navegador.
- El servidor no entrega el HTML del dashboard antes de verificar la sesión. El contenido del dashboard original se conserva; el tema visual se añade solo al cargarlo.
- `CacheService` puede desalojar claves antes de su vencimiento; si ocurre, se solicitará un nuevo código.

## Seguridad y funcionamiento real

El dashboard estático anterior expone sus datos a cualquiera que conozca la URL pública. **Un formulario OTP delante de GitHub Pages no puede proteger archivos HTML/JSON ya publicados.** Por ello, no utilices el viejo `dashboard.html` como destino de un login privado.

Este paquete está preparado para desplegarse en Apps Script con el dashboard alojado dentro del mismo proyecto privado. Las funciones de OTP, envío de correo y visualización protegida requieren que completes la configuración y hagas el despliegue. No se han probado todavía contra tu cuenta ni correo reales.

Rota y deja de usar cualquier contraseña que estuviera en el `index.html` anterior. El código antiguo contenía una credencial legible en fuente pública.

El diseño se identifica con **My Cusco Trip**, no con Viator Supplier. Si más adelante migras datos operativos reales, guárdalos en una base de datos con reglas de acceso del lado del servidor, no dentro de una página web pública.

## Nota de compatibilidad del dashboard

El dashboard anterior contiene mucha lógica JavaScript local, tarjetas y reservas de demostración. `Theme.html` modifica únicamente el CSS y `UiBridge.html` adapta el encabezado y cierre de sesión; no altera la estructura de reservas, el contenido de las finanzas ni las interacciones de búsqueda y marketplace. Algunos recursos gráficos de `assets/` siguen cargándose desde la ruta pública del repositorio; no contienen la lista privada de usuarios.

No he actualizado los archivos del repositorio porque la conexión de GitHub actual permite leer, pero **no tiene permisos de escritura** sobre ese repositorio. Los archivos de este paquete son para copiar a Apps Script.


## Ajustes de presentación (noviembre 2026)

- Colores: verde corporativo #07873E y verde oscuro #173C2F, acentos lima #DBFF26 (basados en una referencia visual proporcionada por el usuario, sin reproducir la marca Bókun).
- «Espacio de gestión» reemplazado por «Plataforma de gestión».
- Eslogan: «Con My Cusco Trip, siempre tu operación a la mano».
- Pie del login: «My Cusco Trip · Acceso único».
- Retirado el aviso técnico visible sobre Google Apps Script. Los requisitos siguen descritos solo en este archivo de configuración.
- Se mantienen el formulario de correo/teléfono/código y el dashboard original; `Theme.html` únicamente aporta el nuevo diseño.
- La insignia «Vista de prueba» aparece tras iniciar sesión para distinguir los datos de demostración de operaciones reales.

El código está preparado para el despliegue, **no se activará automáticamente** hasta configurarlo y autorizar su funcionamiento en tu propia cuenta de Apps Script.
