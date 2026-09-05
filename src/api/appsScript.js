// Cliente de solo lectura para el Web App de Google Apps Script.
// El backend (ver /google-apps-script/Code.gs) expone un unico endpoint doGet
// que enruta segun el parametro ?action=

const BASE_URL =
  import.meta.env.VITE_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbxC9gdvc7l5-KMPCFK9HjlS2Jq6IlWKWQ3jSeYmd3SPcmKArkM-m0hchfiB_84uTkJ54A/exec";

export async function fetchFromSheet(action, params = {}) {
  const url = new URL(BASE_URL);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  let res;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow", // Apps Script siempre 302-redirige de /exec a googleusercontent.com; el navegador lo sigue solo
      cache: "no-store",
    });
  } catch (err) {
    throw new Error(
      "No se pudo conectar con la planilla. Revisa tu conexion a internet."
    );
  }

  if (!res.ok) {
    throw new Error(`El servidor respondio con un error (${res.status}).`);
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

  return Array.isArray(json?.data) ? json.data : [];
}
