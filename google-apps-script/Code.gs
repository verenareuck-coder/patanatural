/**
 * PATAGONIA NATURAL - Backend de solo lectura (Google Apps Script)
 * ------------------------------------------------------------------
 * Este script se implementa como "Aplicacion web" (Web App):
 *   Implementar > Nueva implementacion > Tipo: Aplicacion web
 *   Ejecutar como: Yo
 *   Quien tiene acceso: Cualquier usuario   <-- IMPORTANTE, no "Cualquier
 *   usuario con cuenta de Google" (eso redirige a un login y rompe el JSON
 *   para cualquier visitante anonimo, como el que llega desde Netlify).
 *
 * El frontend llama a esta URL con ?action=xxx para obtener cada modulo.
 * Todo es de SOLO LECTURA: este script nunca escribe en las planillas.
 *
 * FORMATO DE RESPUESTA (siempre el mismo, nunca cambia de forma):
 *   Exito:  { "ok": true,  "data": [...] }
 *   Error:  { "ok": false, "data": [], "error": "mensaje" }
 * El frontend siempre lee response.data (con fallback a []), asi que
 * NUNCA debe devolverse un arreglo "pelado" en la raiz de la respuesta.
 *
 * IMPORTANTE: revisa el objeto CONFIG con los IDs de las planillas y
 * los nombres de hoja / rango de columnas. Ajustalos si tu estructura
 * real difiere de la descrita en el brief.
 */

const CONFIG = {
  // Planilla con las hojas "DATA" (ventas/comisiones) e "Inventario PN"
  PRINCIPAL_ID: "1rz0ztf4fkgPBby0A0l2QSnBCvgUNwNZs_WoACbFxDq0",
  HOJA_DATA: "DATA",
  HOJA_INVENTARIO: "Inventario PN",

  // Cartera de clientes
  CARTERA_ID: "1tp-lup74j0tBvs8rpcCm34HBLUjtNFAkqCf14onTkgg",

  // Compras de materia prima (MMPP)
  MMPP_ID: "1vwHUojUqg0tHKaXFMcuySJwgj7VtS_pccpDu3jQlo5g",

  // Pagos (hojas mensuales) y Flujo de Caja
  PAGOS_ID: "1NDABL9kko26HgpTlIkU2rVBeCNoJ6g8G",
  HOJA_FLUJO_CAJA: "Fluxo de Caixa",
  // Hojas que NO son meses y deben excluirse del selector de Pagos
  PAGOS_HOJAS_EXCLUIDAS: ["Encabezado", "MMPP"],

  // Tipos de venta validos para el modulo Ventas
  TIPOS_VENTA_VALIDOS: ["NF-e", "NFC-e", "NF-e_M", "Nf-e_Rd"],

  // Galeria: ID de la carpeta raiz de Google Drive con las subcarpetas
  // de presentacion / fichas tecnicas / fotos de productos.
  // Reemplaza esto con el ID real de tu carpeta (ver README).
  GALERIA_FOLDER_ID: "PON_AQUI_EL_ID_DE_TU_CARPETA_DE_DRIVE",
};

// Indices de columna (0 = A, 1 = B, ... siguiendo notacion de planilla)
const COL = {
  FECHA: 1, // B
  VENDEDOR: 2, // C
  CLIENTE: 3, // D
  TIPO_VENTA: 4, // E
  COMISION: 13, // N
  TOTAL: 15, // P
  ESTADO_PAGO: 20, // U
  FECHA_VENCIMIENTO: 21, // V
  FECHA_PAGO: 22, // W
  NOTA_FISCAL: 24, // Y
};

const COL_INVENTARIO = {
  PRODUCTO: 1, // B
  TAMANO: 2, // C
  KG_DISPONIBLES: 15, // P
  UNIDADES_DISPONIBLES: 16, // Q
};

// Compras MMPP: mapeo segun especificacion de tarjetas (A-D y F-G),
// mas hasta 3 boletos a partir de la columna H. Si tu hoja real tiene
// los boletos en otras columnas, ajusta estos indices.
const COL_MMPP = {
  TIPO_DOCUMENTO: 0, // A
  PROVEEDOR: 1, // B
  NRO: 2, // C
  FECHA_EMISION: 3, // D
  CANTIDAD: 5, // F
  MONTO_TOTAL: 6, // G
  BOLETOS: [
    { VENCIMIENTO: 7, VALOR: 8, ESTADO: 9 }, // H, I, J
    { VENCIMIENTO: 10, VALOR: 11, ESTADO: 12 }, // K, L, M
    { VENCIMIENTO: 13, VALOR: 14, ESTADO: 15 }, // N, O, P
  ],
};

// Ventas por producto (para el KPI "Productos mas vendidos en KG" de
// Estadisticas): misma hoja DATA, columna F = producto, columna K = kilos.
const COL_PRODUCTOS = {
  PRODUCTO: 5, // F
  KILOS: 10, // K
};

// ---------- ROUTER ----------
function doGet(e) {
  const action = normalizeAction(e && e.parameter && e.parameter.action);
  const mes = e && e.parameter ? e.parameter.mes : null;

  let payload;
  try {
    switch (action) {
      case "ventas":
        payload = ok(safeRead(getVentas, "ventas"));
        break;
      case "comisiones":
        payload = ok(safeRead(getComisiones, "comisiones"));
        break;
      case "inventario":
        payload = ok(safeRead(getInventario, "inventario"));
        break;
      case "cartera":
      case "clientes":
        payload = ok(safeRead(getCartera, "cartera"));
        break;
      case "comprasmmpp":
      case "compras":
        payload = ok(safeRead(getComprasMMPP, "comprasMMPP"));
        break;
      case "pagosmeses":
        payload = ok(safeRead(getPagosMeses, "pagosMeses"));
        break;
      case "pagos":
        payload = ok(safeRead(function () { return getPagos(mes); }, "pagos"));
        break;
      case "flujocaja":
      case "flujo":
        payload = ok(safeRead(getFlujoCaja, "flujoCaja"));
        break;
      case "galeria":
      case "fotos":
        payload = ok(safeRead(getGaleria, "galeria"));
        break;
      case "productosvendidos":
        payload = ok(safeRead(getProductosVendidos, "productosVendidos"));
        break;
      case "":
        payload = fail("Falta el parametro ?action=");
        break;
      default:
        payload = fail("Accion no reconocida: " + action);
    }
  } catch (err) {
    payload = fail("Error del servidor: " + err.message);
  }

  return jsonOutput(payload);
}

// Normaliza: quita espacios, pasa a minusculas y remueve prefijos get/get_
function normalizeAction(raw) {
  if (!raw) return "";
  return String(raw).trim().toLowerCase().replace(/^get_?/, "");
}

// Envoltorios de respuesta: SIEMPRE el mismo shape, exito o error.
function ok(data) {
  return { ok: true, data: data || [] };
}
function fail(message) {
  return { ok: false, data: [], error: message };
}

// Ejecuta una funcion de lectura y, si falla (hoja renombrada, columna
// movida, planilla sin permiso, etc.), registra el error en el log de
// ejecuciones de Apps Script y devuelve [] en vez de romper el JSON.
function safeRead(fn, label) {
  try {
    return fn();
  } catch (err) {
    Logger.log("safeRead(" + label + ") fallo: " + err.message);
    return [];
  }
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// Abre una hoja y lanza un error legible si no existe (nombre cambiado, etc.)
function getSheetOrThrow(spreadsheetId, sheetName) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
  if (!sheet) {
    throw new Error(
      'No se encontro la hoja "' + sheetName + '" en la planilla ' + spreadsheetId
    );
  }
  return sheet;
}

// ---------- VENTAS ----------
function getVentas() {
  const sheet = getSheetOrThrow(CONFIG.PRINCIPAL_ID, CONFIG.HOJA_DATA);
  const rows = sheet.getDataRange().getValues();

  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const tipoVenta = String(row[COL.TIPO_VENTA] || "").trim();
    if (CONFIG.TIPOS_VENTA_VALIDOS.indexOf(tipoVenta) === -1) continue;

    out.push({
      fecha: serialize(row[COL.FECHA]),
      vendedor: row[COL.VENDEDOR],
      cliente: row[COL.CLIENTE],
      tipoVenta: tipoVenta,
      notaFiscal: row[COL.NOTA_FISCAL],
      estadoPago: row[COL.ESTADO_PAGO],
      fechaVencimiento: serialize(row[COL.FECHA_VENCIMIENTO]),
      fechaPago: serialize(row[COL.FECHA_PAGO]),
      total: row[COL.TOTAL],
    });
  }
  return out;
}

// ---------- COMISIONES ----------
function getComisiones() {
  const sheet = getSheetOrThrow(CONFIG.PRINCIPAL_ID, CONFIG.HOJA_DATA);
  const rows = sheet.getDataRange().getValues();

  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const tipoVenta = String(row[COL.TIPO_VENTA] || "").trim();
    const estadoPago = String(row[COL.ESTADO_PAGO] || "").trim().toLowerCase();
    const esTipoValido = tipoVenta === "NF-e" || tipoVenta === "NFC-e";
    if (!esTipoValido || estadoPago !== "sim") continue;

    out.push({
      vendedor: row[COL.VENDEDOR],
      comision: row[COL.COMISION],
      fechaPago: serialize(row[COL.FECHA_PAGO]),
    });
  }
  return out;
}

// ---------- INVENTARIO ----------
function getInventario() {
  const sheet = getSheetOrThrow(CONFIG.PRINCIPAL_ID, CONFIG.HOJA_INVENTARIO);
  const rows = sheet.getDataRange().getValues();

  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[COL_INVENTARIO.PRODUCTO]) continue;
    out.push({
      producto: row[COL_INVENTARIO.PRODUCTO],
      tamano: row[COL_INVENTARIO.TAMANO],
      kgDisponibles: row[COL_INVENTARIO.KG_DISPONIBLES],
      unidadesDisponibles: row[COL_INVENTARIO.UNIDADES_DISPONIBLES],
    });
  }
  return out;
}

// ---------- CARTERA DE CLIENTES ----------
// Lectura generica: usa la primera fila como encabezados y devuelve
// un objeto por fila. Soporta cualquier estructura de columnas.
function getCartera() {
  const sheet = getSheetOrThrow(CONFIG.CARTERA_ID, null);
  return sheetToObjects(sheet);
}

// ---------- COMPRAS MMPP ----------
function getComprasMMPP() {
  const sheet = getSheetOrThrow(CONFIG.MMPP_ID, null);
  const rows = sheet.getDataRange().getValues();

  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[COL_MMPP.PROVEEDOR] && !row[COL_MMPP.NRO]) continue;

    const boletos = COL_MMPP.BOLETOS.map((b) => ({
      fechaVencimiento: serialize(row[b.VENCIMIENTO]),
      valorPagar: row[b.VALOR],
      estadoPago: row[b.ESTADO],
    })).filter((b) => b.fechaVencimiento || b.valorPagar || b.estadoPago);

    out.push({
      tipoDocumento: row[COL_MMPP.TIPO_DOCUMENTO],
      proveedor: row[COL_MMPP.PROVEEDOR],
      nro: row[COL_MMPP.NRO],
      fechaEmision: serialize(row[COL_MMPP.FECHA_EMISION]),
      cantidad: row[COL_MMPP.CANTIDAD],
      montoTotal: row[COL_MMPP.MONTO_TOTAL],
      boletos: boletos,
    });
  }
  return out;
}

// ---------- PRODUCTOS VENDIDOS (KG) ----------
// Para el KPI de Estadisticas: suma los KG vendidos por producto,
// contando solo filas cuyo tipo de venta sea EXACTAMENTE NF-e o NFC-e.
function getProductosVendidos() {
  const sheet = getSheetOrThrow(CONFIG.PRINCIPAL_ID, CONFIG.HOJA_DATA);
  const rows = sheet.getDataRange().getValues();

  const totales = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const tipoVenta = String(row[COL.TIPO_VENTA] || "").trim();
    if (tipoVenta !== "NF-e" && tipoVenta !== "NFC-e") continue;

    const producto = String(row[COL_PRODUCTOS.PRODUCTO] || "").trim();
    if (!producto) continue;

    const kg = Number(row[COL_PRODUCTOS.KILOS]) || 0;
    totales[producto] = (totales[producto] || 0) + kg;
  }

  return Object.keys(totales)
    .map((producto) => ({ producto: producto, kg: Math.round(totales[producto] * 100) / 100 }))
    .sort((a, b) => b.kg - a.kg);
}

// ---------- PAGOS (hojas mensuales) ----------
function getPagosMeses() {
  const ss = SpreadsheetApp.openById(CONFIG.PAGOS_ID);
  const excluidas = [CONFIG.HOJA_FLUJO_CAJA].concat(CONFIG.PAGOS_HOJAS_EXCLUIDAS || []);
  return ss
    .getSheets()
    .map((s) => s.getName())
    .filter((name) => excluidas.indexOf(name) === -1);
}

function getPagos(mes) {
  const ss = SpreadsheetApp.openById(CONFIG.PAGOS_ID);
  const sheet = mes ? ss.getSheetByName(mes) : ss.getSheets()[0];
  if (!sheet) return [];
  return sheetToObjects(sheet);
}

// ---------- FLUJO DE CAJA ----------
function getFlujoCaja() {
  const sheet = getSheetOrThrow(CONFIG.PAGOS_ID, CONFIG.HOJA_FLUJO_CAJA);
  return sheetToObjects(sheet);
}

// ---------- GALERIA (fotos, fichas tecnicas, presentacion) ----------
// Lee una carpeta de Drive de forma recursiva: cada subcarpeta se usa
// como "categoria" (ej. "Fotos Productos", "Fichas Tecnicas").
// IMPORTANTE: la carpeta debe compartirse como "Cualquier usuario con el
// enlace: Lector" para que las imagenes se puedan mostrar directo en el
// navegador (ver instrucciones en el README).
function getGaleria() {
  if (!CONFIG.GALERIA_FOLDER_ID || CONFIG.GALERIA_FOLDER_ID.indexOf("PON_AQUI") === 0) {
    return [];
  }
  const root = DriveApp.getFolderById(CONFIG.GALERIA_FOLDER_ID);
  const out = [];
  collectFromFolder(root, root.getName(), out);
  // Mas nuevos primero
  out.sort((a, b) => (b.fechaModificacion || "").localeCompare(a.fechaModificacion || ""));
  return out;
}

function collectFromFolder(folder, categoria, out) {
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const mime = file.getMimeType();
    const id = file.getId();

    let tipo = "otro";
    if (mime.indexOf("image/") === 0) tipo = "imagen";
    else if (mime === "application/pdf") tipo = "pdf";

    out.push({
      categoria: categoria,
      nombre: file.getName(),
      tipo: tipo,
      fileId: id,
      // Vista directa para <img>, funciona si la carpeta es publica ("cualquiera con el enlace")
      miniatura: tipo === "imagen" ? "https://lh3.googleusercontent.com/d/" + id + "=w500" : null,
      urlCompleta: tipo === "imagen" ? "https://lh3.googleusercontent.com/d/" + id + "=w1600" : null,
      // Para PDFs: vista previa incrustable de Drive
      urlPreview: tipo === "pdf" ? "https://drive.google.com/file/d/" + id + "/preview" : null,
      urlDescarga: "https://drive.google.com/uc?export=download&id=" + id,
      fechaModificacion: serialize(file.getLastUpdated()),
    });
  }

  const subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    const sub = subfolders.next();
    collectFromFolder(sub, sub.getName(), out);
  }
}

// ---------- HELPERS ----------

// Convierte una hoja con encabezados en la primera fila a un arreglo de objetos.
// IMPORTANTE: si una columna no tiene texto en el encabezado (comun en la
// columna de "conceptos" de Flujo de Caja), NO se descarta: se le asigna
// un nombre de respaldo segun su letra de columna (ej. "Columna A") para
// que el dato siga llegando al frontend.
function sheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map((h, idx) => {
    const text = String(h).trim();
    return text || "Columna " + columnLetter(idx);
  });
  const out = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const isEmpty = row.every((cell) => cell === "" || cell === null);
    if (isEmpty) continue;

    const obj = {};
    headers.forEach((header, idx) => {
      const value = row[idx];
      obj[header] = value instanceof Date ? serialize(value) : value;
    });
    out.push(obj);
  }
  return out;
}

// Convierte un indice de columna (0-based) a su letra de planilla: 0->A, 1->B, ..., 26->AA
function columnLetter(index) {
  let n = index;
  let letter = "";
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

// Convierte fechas de Sheets a texto ISO (yyyy-MM-dd) para que el frontend
// las parsee de forma consistente sin importar la zona horaria del usuario.
function serialize(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone() || "GMT-3", "yyyy-MM-dd");
  }
  return value;
}
