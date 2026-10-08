// Cliente de solo lectura para el Web App de Google Apps Script.
// TODAS las peticiones de la app pasan por fetchFromSheet(): es el unico
// lugar donde se llama a fetch(), asi que la configuracion (URL, redirect,
// manejo de errores) vive aqui y en ningun otro archivo.
//
// Variable de entorno (Netlify > Site configuration > Environment variables):
//   Nombre : VITE_APPS_SCRIPT_URL        (debe empezar con VITE_)
//   Valor  : https://script.google.com/macros/s/<ID_DEL_DESPLIEGUE>/exec
// Se aceptan tambien VITE_API_URL por si ya la creaste con ese nombre.

// Despliegue vigente de Apps Script. Solo se usa si NINGUNA variable de
// entorno llega al build. Actualizalo si creas una implementacion nueva.
const DEFAULT_URL =
  "https://script.google.com/macros/s/AKfycbyHQVNYdNlaEe4lI30b0lNFCrGg35sEFqoISaYFhMdmzeYottlAZKPQAA3NRneyUQ3y6w/exec";

// Quita espacios y comillas sobrantes (error comun al pegar en Netlify).
function limpiarUrl(raw) {
  return String(raw || "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
}

const URL_DE_ENTORNO = limpiarUrl(
  import.meta.env.VITE_APPS_SCRIPT_URL || import.meta.env.VITE_API_URL
);
const BASE_URL = URL_DE_ENTORNO || DEFAULT_URL;

// Una sola vez al cargar: deja en la consola de que URL sale la data.
console.info(
  "[Patagonia] API en uso:",
  URL_DE_ENTORNO ? "variable de entorno" : "URL por defecto (no llego ninguna variable de entorno)",
  "->",
  BASE_URL
);

function construirUrl(action, params) {
  let url;
  try {
    url = new URL(BASE_URL);
  } catch {
    throw new Error(
      "La URL configurada en VITE_APPS_SCRIPT_URL no es valida. Debe ser completa, ej: https://script.google.com/macros/s/XXXX/exec"
    );
  }
  if (/\/dev\/?$/.test(url.pathname)) {
    throw new Error(
      "La URL termina en /dev (modo de prueba). Usa la URL de la implementacion, que termina en /exec."
    );
  }
  if (!/\/exec\/?$/.test(url.pathname)) {
    console.warn("[Patagonia] La URL de Apps Script normalmente termina en /exec:", BASE_URL);
  }

  url.searchParams.set("action", action);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url;
}

// Servicios de Ventas: siempre piden el anio en curso completo (1 de enero
// hasta hoy). El backend tambien usa el anio en curso si no se envia.
export function fetchVentas(anio = new Date().getFullYear()) {
  return fetchFromSheet("ventas", { anio });
}

export function fetchProductosVendidos(anio = new Date().getFullYear()) {
  return fetchFromSheet("productosVendidos", { anio });
}

export async function fetchFromSheet(action, params = {}) {
  const url = construirUrl(action, params);

  let res;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow", // Apps Script 302-redirige de /exec a googleusercontent.com; el navegador lo sigue solo
      cache: "no-store",
    });
  } catch (err) {
    throw new Error(
      "No se pudo conectar con la planilla. Revisa tu conexion a internet."
    );
  }

  if (!res.ok) {
    if (res.status === 404) {
      console.error("[Patagonia] 404 al consultar:", url.toString());
      const esGoogle = url.host.includes("google");
      throw new Error(
        esGoogle
          ? `Error 404 en ${url.host} (accion: ${action}). El despliegue de Apps Script de esa URL no existe, fue archivado o la URL esta incompleta. Revisa VITE_APPS_SCRIPT_URL en Netlify: debe ser la URL de la implementacion vigente y terminar en /exec.`
          : `Error 404 en ${url.host} (accion: ${action}). VITE_APPS_SCRIPT_URL apunta a tu propio sitio y no a Apps Script. Corrige la variable en Netlify.`
      );
    }
    throw new Error(`El servidor respondio con un error (${res.status}) en ${url.host} (accion: ${action}).`);
  }

  let json;
  try {
    json = await res.json();
  } catch (err) {
    // Esto pasa cuando Apps Script devuelve HTML en vez de JSON: casi
    // siempre porque el despliegue quedo con acceso "Cualquier usuario
    // con cuenta de Google" (redirige a un login) en vez de "Cualquier
    // usuario", o porque la URL usada no es la de la ULTIMA implementacion.
    throw new Error(
      "La respuesta del Web App no es JSON valido. Revisa que el despliegue de Apps Script tenga acceso 'Cualquier usuario' y que estes usando la URL de la ultima implementacion."
    );
  }

  if (json && json.error) {
    throw new Error(json.error);
  }

  // El backend avisa aqui si una hoja no se encontro (devuelve [] en vez de fallar).
  if (json && json.warning) {
    console.warn(`[Patagonia] Advertencia del backend (${action}):`, json.warning);
  }

  return Array.isArray(json?.data) ? json.data : [];
}
