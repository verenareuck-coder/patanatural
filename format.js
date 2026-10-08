// Formatea un valor numerico como Real brasileno: R$ 0,00
export function formatBRL(value) {
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  return safe.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Convierte texto/fecha/serial de Sheets a un objeto Date valido o null
export function parseDateSafe(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value) ? null : value;

  // Numero serial de Google Sheets (dias desde 1899-12-30)
  if (typeof value === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + value * 86400000);
    return isNaN(d) ? null : d;
  }

  const str = String(value).trim();

  // yyyy-MM-dd: es el formato que devuelve Code.gs. Se parsea SIEMPRE como
  // fecha local (anio, mes, dia) y nunca pasando el string directo a
  // `new Date(...)`, porque un string de solo fecha en formato ISO se
  // interpreta como medianoche UTC, lo que corre la fecha un dia hacia
  // atras en cualquier zona horaria detras de UTC (como Brasil).
  const isoSoloFecha = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoSoloFecha) {
    const [, y, m, d] = isoSoloFecha;
    const parsed = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(parsed) ? null : parsed;
  }

  // dd/mm/yyyy o dd-mm-yyyy
  const br = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (br) {
    const [, d, m, y] = br;
    const year = y.length === 2 ? `20${y}` : y;
    const parsed = new Date(Number(year), Number(m) - 1, Number(d));
    return isNaN(parsed) ? null : parsed;
  }

  const iso = new Date(str);
  return isNaN(iso) ? null : iso;
}

// Formatea a dd/mm/yyyy (estandar Brasil)
export function formatDate(value) {
  const d = parseDateSafe(value);
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR");
}

// Nombre de mes + anio, ej: "marzo 2026"
export function formatMonthLabel(value) {
  const d = parseDateSafe(value);
  if (!d) return "—";
  const label = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function monthKey(value) {
  const d = parseDateSafe(value);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Dias restantes hasta una fecha (negativo = ya vencido)
export function daysUntil(value) {
  const d = parseDateSafe(value);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

export function normalize(str) {
  return String(str ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
