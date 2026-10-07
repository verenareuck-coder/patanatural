# Patagonia Natural — App interna (React + Tailwind + Google Apps Script)

App web responsive de solo lectura para la gestion de ventas, comisiones,
inventario, cartera de clientes, compras de materia prima, pagos, flujo de
caja y estadisticas. Login por PIN de 4 digitos con dos roles.

## 1. Backend (Google Apps Script)

1. Abre https://script.google.com y crea un proyecto nuevo (o usa uno existente).
2. Copia el contenido de `google-apps-script/Code.gs` en el editor.
3. Revisa el objeto `CONFIG` al inicio del archivo:
   - IDs de las 3 planillas (principal, cartera, compras MMPP, pagos).
   - Nombres exactos de las hojas (`DATA`, `Inventario PN`, `Fluxo de Caixa`).
   - El mapeo de columnas de **Compras MMPP** (`COL_MMPP.BOLETOS`) es una
     estimacion basada en el brief (3 boletos en columnas F–N). Ajustalo si
     tu hoja real tiene otro orden.
4. **Implementar > Nueva implementacion**:
   - Tipo: **Aplicacion web**
   - Ejecutar como: **Yo**
   - Quien tiene acceso: **Cualquier usuario** (o "Cualquier usuario con
     cuenta de Google" si prefieres restringirlo, aunque esto puede requerir
     login adicional dentro de la app)
5. Autoriza los permisos solicitados (acceso de lectura a las planillas).
6. Copia la URL que termina en `/exec`. Esa es tu Web App URL.
7. Cada vez que edites `Code.gs`, debes crear una **nueva implementacion**
   (o gestionar versiones) para que los cambios se reflejen en la URL.

> El script es de **solo lectura**: nunca escribe en las planillas, solo usa
> `getValues()`.

## 2. Frontend (React + Vite + Tailwind)

```bash
npm install
cp .env.example .env
# edita .env y pega tu URL /exec si es distinta a la que ya viene por defecto
npm run dev
```

Build de produccion:

```bash
npm run build
```

El resultado queda en `dist/`, listo para subir a Vercel, Netlify, o abrir
directamente en Replit / Bolt.new (ambos detectan un proyecto Vite
automaticamente al importar la carpeta).

### Variables de entorno

| Variable | Descripcion |
|---|---|
| `VITE_APPS_SCRIPT_URL` | URL `/exec` del Web App de Apps Script |

Si no defines la variable, el frontend usa por defecto la URL que
compartiste en el brief.

## 3. Acceso por PIN

Editables en `src/utils/constants.js`:

```js
export const PIN_ROLES = {
  "0000": "trabajador",  // Ventas, Comisiones, Inventario, Cartera de Clientes
  "4367": "gerencia",    // Todo lo anterior + Compras MMPP, Pagos, Flujo de Caja, Estadisticas
};
```

El PIN se valida 100% en el cliente (no hay contraseñas ni datos sensibles
de por medio, ya que toda la data igual es de solo lectura); si tu equipo
crece mas alla de 6 personas o quieres asignar un PIN por persona, agrega
mas entradas al mapa.

## 4. Estructura del proyecto

```
src/
  api/appsScript.js        cliente fetch para el Web App (?action=...)
  components/              Login, Sidebar, UI compartida (estados, banners, etc.)
  modules/                 un componente por modulo del menu
  utils/                   formato de moneda/fechas, constantes de rol y menu
google-apps-script/
  Code.gs                  backend doGet con un endpoint por modulo
```

## 5. Notas sobre datos y supuestos

- **Cartera de Clientes** y **Pagos** se leen de forma generica (primera
  fila = encabezados, cada fila siguiente = un objeto). Funcionan sin
  importar el nombre exacto de las columnas.
- **Inventario**: la app guarda en el dispositivo (localStorage) el ultimo
  stock visto para poder avisar cuando un producto vuelve a tener stock o
  se agota. Es un aviso local al navegador, no una notificacion push.
- **Estadisticas > "Productos mas vendidos en KG"**: la hoja `DATA` descrita
  en el brief no incluye producto/KG por linea de venta, asi que el backend
  expone la accion `productosVendidos` como placeholder (devuelve `[]`).
  Conecta ahi tu hoja de detalle de productos cuando la tengas y el grafico
  se activara solo.
- Los rangos de fecha en **Ventas** permiten historicos desde noviembre de
  2025 (`MIN_DATE` en `src/modules/Ventas.jsx`).

## 6. Instalar en el celular (iPhone y Android)

La app es un "PWA" (Progressive Web App): no necesita App Store ni Play
Store, ni ninguna cuenta de Apple/Google/Netlify para descargarse. Cada
persona solo abre la URL del sitio en su navegador y la agrega a su
pantalla de inicio. El PIN de acceso (0000 / 4367) sigue siendo lo unico
que se pide, y es interno de la app, no de Apple/Google.

**iPhone (Safari, no Chrome):**
1. Abre la URL del sitio en Safari.
2. Toca el icono de compartir (el cuadrado con la flecha hacia arriba).
3. Elige "Agregar a inicio" / "Add to Home Screen".
4. Aparece el icono de Patagonia Natural en la pantalla de inicio, se abre
   a pantalla completa como una app.

**Android (Chrome):**
1. Abre la URL del sitio en Chrome.
2. Toca el menu (los 3 puntos arriba a la derecha).
3. Elige "Instalar app" o "Agregar a pantalla de inicio" (a veces Chrome
   ya muestra un banner automatico sugiriendolo).
4. Se instala como cualquier app, con su propio icono.

No hace falta iniciar sesion con ninguna cuenta para este paso: es
simplemente guardar un acceso directo al sitio web. Los archivos
`public/manifest.webmanifest`, `public/sw.js` y los iconos
`public/icon-*.png` son los que habilitan esto.

## 7. Galeria de fotos y fichas tecnicas (Google Drive)

El modulo "Fotos y Fichas" muestra el contenido de una carpeta de Google
Drive: cada subcarpeta se convierte automaticamente en una categoria
(pestaña) dentro de la app. No hay boton de "subir" en la app misma —
subes los archivos directo en Drive (desde el celular o la compu) y la
app los refleja solo, igual que con las planillas.

**Configuracion (una sola vez):**

1. En Google Drive, crea una carpeta, por ejemplo `Patagonia Natural - Galeria`.
2. Dentro, crea subcarpetas por categoria, por ejemplo:
   - `Presentacion` (PDF de la empresa)
   - `Fichas Tecnicas` (PDFs de productos)
   - `Fotos Productos` (JPG/PNG)
3. Sube tus archivos a cada subcarpeta correspondiente.
4. Click derecho en la carpeta raiz (`Patagonia Natural - Galeria`) →
   **Compartir** → **Acceso general** → cambia a **"Cualquier usuario con
   el enlace"**, rol **Lector**. Esto es necesario para que las fotos se
   puedan mostrar directo en el navegador de tus clientes/equipo (los
   PDFs y fotos de productos, no tus planillas de ventas — esa carpeta es
   independiente).
5. Copia el ID de la carpeta desde su URL: en
   `https://drive.google.com/drive/folders/AQUI_VA_EL_ID`, el ID es todo
   lo que viene despues de `/folders/`.
6. En `Code.gs`, pega ese ID en `CONFIG.GALERIA_FOLDER_ID`.
7. Crea una nueva version del deployment (Implementar > Administrar
   implementaciones > editar > Nueva version).

Listo — desde ahi, cualquier foto o PDF que agregues (o borres) en esas
carpetas de Drive aparece (o desaparece) solo en la app la proxima vez
que alguien entre al modulo.

**Formatos soportados:** imagenes (jpg, png, webp) se muestran en una
grilla con visor a pantalla completa; PDFs se muestran como tarjetas que
abren la vista previa de Drive en una pestaña nueva.

## 9. Cambios de esta ronda (importante revisar)

- **Compras MMPP** cambio de mapeo de columnas: ahora A=Tipo de documento,
  B=Proveedor, C=N°, D=Fecha emision, F=Cantidad, G=Monto total (columna E
  sin usar). Si tu hoja real tiene otro orden, ajusta `COL_MMPP` en
  `Code.gs`. Se elimino el tracking de boletos (no estaba en la nueva
  especificacion de tarjetas).
- **Comisiones** ahora muestra SOLO el resumen mensual de "Ricardo Aguero",
  "Ricardo Battistini" y "Verena Reuck" (Diether Reuck y Roberto Alvarez
  quedan excluidos). Si cambian los nombres exactos en tu planilla, edita
  la lista `VENDEDORES_VISIBLES` en `src/modules/Comisiones.jsx`.
- **Pagos**: se excluyen automaticamente las hojas "Encabezado" y "MMPP"
  del selector de meses (ver `CONFIG.PAGOS_HOJAS_EXCLUIDAS` en `Code.gs`).
  Si tu hoja mensual ya trae su propia fila de "Total Mes", la app la usa
  como el monto oficial del recuadro azul en vez de recalcularlo.
- **Flujo de Caja**: se corrigio un bug en `sheetToObjects` que borraba
  cualquier columna sin texto en el encabezado (por eso la Columna A no
  se veia). Ahora esas columnas se preservan con un nombre de respaldo
  ("Columna A", etc.) si el encabezado esta vacio.
- **Inventario**: se oculta automaticamente el segundo registro devuelto
  por la API (indice 1). Si tu planilla cambia de orden, revisa el filtro
  en `src/modules/Inventario.jsx`.
- **Estadisticas**: todas las metricas de ventas solo cuentan filas con
  tipo de venta EXACTO "NF-e" o "NFC-e", ignorando "NF-e_M" y "Nf-e_Rd"
  (aunque esos si aparecen en el modulo Ventas normal).

## 11. Ajustes de la ultima ronda

- **Ventas**: columna "Estado" renombrada a "Pago" + nuevo filtro por Pago.
- **Compras MMPP**: boletos de vuelta (hasta 3), leidos desde las columnas
  H en adelante (`COL_MMPP.BOLETOS` en `Code.gs`) — como no diste el
  detalle exacto de estas columnas esta vez, es una suposicion razonable;
  ajustala si no calza con tu hoja real. Orden por fecha de emision, mas
  reciente arriba.
- **Pagos**: se corrigio un bug real — la deteccion del monto tomaba el
  nombre de columna de forma EXACTA (ej. solo "total", no "Total Mes"),
  por eso siempre daba $0. Ahora usa coincidencia parcial, y busca la fila
  de "Total" en cualquier columna, no solo la primera.
- **Flujo de Caja**: el grafico ahora es de lineas, una por cada
  concepto/variable, mostrando su evolucion a traves de las columnas de
  periodo (en vez de comparar conceptos entre si en un solo momento).
- **Estadisticas**: se quitaron los 4 KPI superiores. "Productos mas
  vendidos (KG)" ahora usa datos reales (hoja DATA, columna F=producto,
  K=kilos, solo ventas NF-e/NFC-e). El grafico de "Gastos operativos" se
  reemplazo por "Aportes de capital de los socios", leyendo las filas de
  D. Reuck y R. Alvarez del Flujo de Caja (busqueda por apellido en la
  etiqueta de fila, columna "Total").

## 13. Ajustes de esta ronda

- **Fotos y Fichas**: se quito del menu y de las rutas de React. El
  backend (accion `galeria` en `Code.gs`) se dejo intacto por si quieres
  reactivarla despues — no hace falta tocar Apps Script para esto.
- **Inventario**: ahora hay un selector "Inventario PN" / "Inventario
  Nixxen" arriba del modulo. **Importante:** no me diste el detalle exacto
  de que columna es cada cosa en "Inventario Nixxen" (solo "de la A a la
  N"), asi que `COL_INVENTARIO_NIXXEN` en `Code.gs` es una suposicion
  (producto en B, tamano en C, kg en M, unidades en N) — ajustala apenas
  la revises con datos reales. Tambien asumi que esta hoja vive en la
  MISMA planilla que "Inventario PN"; si es un archivo de Sheets distinto,
  cambia `INVENTARIO_NIXXEN_ID`. Ya NO se oculta ninguna fila en ningun
  origen.
- **Ventas**: el backend ahora solo devuelve los ultimos 3 meses
  (incluyendo el actual) directo desde `Code.gs` — los datos mas viejos ni
  siquiera se transfieren, no es solo un filtro visual.
- **Comisiones**: se agrego "Carlos Garcia" a los 4 vendedores visibles.
- **Pagos**: vuelve a mostrar todas las filas tal cual vienen de tu hoja,
  incluyendo su propia fila de total al final. Se quito el recuadro azul
  de resumen.
- **Flujo de Caja**: se quito el grafico de este modulo (la tabla de
  conceptos/montos con sus resaltados sigue igual).
- **Estadisticas**: nuevo grafico de lineas "Salidas Totales vs. Meses",
  leyendo la fila "Total Saidas/Pagamentos" del Flujo de Caja a traves de
  sus columnas de periodo/mes.

## 14. Paleta y tipografia

- Sidebar azul marino `#0B2A4A`, acento salmon `#E8734A` (coherente con el
  producto: salmon ahumado), fondo principal blanco.
- Tipografia: Plus Jakarta Sans (titulos/numeros) + Inter (texto/tablas),
  cargadas via Google Fonts en `index.html`.
