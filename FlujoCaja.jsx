import { useEffect, useMemo, useState } from "react";
import { fetchFromSheet } from "../api/appsScript";
import { aNumero, formatBRL, normalize } from "../utils/format";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../components/UI";

/* ───────────────────────────────────────────────────────────────────────
   FLUJO DE CAJA — lectura POSICIONAL de la hoja
   Posicion 0      = "Variables" (columna A)  -> SIEMPRE texto literal
   Posiciones 1-12 = Janeiro..Dezembro (B a M) -> moneda R$
   Posicion 13     = Total (columna N)         -> moneda R$
   La columna A jamas pasa por aNumero() ni formatBRL().
   ─────────────────────────────────────────────────────────────────────── */

const N_COLUMNAS = 14;
const IDX_TOTAL = 13;
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Fuerza cada fila a exactamente 14 celdas (la alineacion nunca se rompe).
function aFilaDe14(celdas) {
  return Array.from({ length: N_COLUMNAS }, (_, i) =>
    celdas[i] === undefined || celdas[i] === null ? "" : celdas[i]
  );
}

const esVacia = (v) => String(v ?? "").trim() === "";
const tieneNumeros = (celdas) => celdas.slice(1).some((c) => aNumero(c) !== null);

// Acepta la respuesta nueva (matriz: arreglo de arreglos) y tambien la
// anterior (arreglo de objetos, leido por posicion con Object.values).
export function normalizarRespuesta(data) {
  const lista = Array.isArray(data) ? data : [];
  if (lista.length === 0) return { tituloA: "Variables", filas: [] };

  let tituloA = "Variables";
  let matriz;

  if (Array.isArray(lista[0])) {
    matriz = lista.map(aFilaDe14);
    // La fila de encabezados es la que trae "Janeiro" en la posicion 1.
    let iHeader = matriz.findIndex((f) => normalize(f[1]) === "janeiro");
    // Sin "Janeiro": la fila 0 es encabezado solo si no trae numeros.
    if (iHeader < 0) iHeader = tieneNumeros(matriz[0]) ? -1 : 0;
    if (iHeader >= 0) {
      const t = String(matriz[iHeader][0] ?? "").trim();
      if (t) tituloA = t;
      matriz = matriz.slice(iHeader + 1); // descarta titulos previos y el encabezado
    }
  } else {
    const t = String(Object.keys(lista[0])[0] ?? "").trim();
    if (t && !/^columna\s+[a-z]+$/i.test(t)) tituloA = t;
    matriz = lista.map((o) => aFilaDe14(Object.values(o)));
  }

  const filas = matriz
    .filter((f) => normalize(f[1]) !== "janeiro") // encabezado repetido
    .filter((f) => !esVacia(f[0]) || tieneNumeros(f)); // descarta filas en blanco
  return { tituloA, filas };
}

// Clasifica la fila SOLO por el texto de la columna A.
export function tipoDeFila(label) {
  const n = normalize(label);
  if (n.includes("geracao operacional") || n.includes("saldo operacional") || n.includes("saldo final")) {
    return "resultado";
  }
  if (n.startsWith("total") && (n.includes("entradas") || n.includes("recebimento"))) return "total-entradas";
  if (n.startsWith("total") && (n.includes("saidas") || n.includes("pagamentos"))) return "total-salidas";
  if (n.startsWith("saldo inicial") || /^(entradas|saidas)(\s*\/.*)?$/.test(n)) return "principal";
  return "item";
}

// Clases completas (estaticas) para que Tailwind las detecte.
const ESTILOS = {
  principal: { fila: "bg-slate-200 border-b border-slate-300", base: "font-bold", color: "text-navy" },
  "total-entradas": { fila: "bg-blue-50 border-y-2 border-blue-200", base: "font-bold", color: "text-blue-800" },
  "total-salidas": { fila: "bg-rose-50 border-y-2 border-rose-200", base: "font-bold", color: "text-rose-800" },
  resultado: { fila: "bg-emerald-50 border-y-2 border-emerald-500", base: "text-base font-bold", color: "text-emerald-900" },
  item: { fila: "bg-white border-b border-slate-100", base: "font-normal", color: "text-slate-600" },
};

function colorDeValor(tipo, n) {
  if (tipo === "resultado" && n !== null && n < 0) return "text-rose-700"; // resultado negativo
  return ESTILOS[tipo].color;
}

export function TablaFlujoCaja({ data }) {
  const { tituloA, filas } = useMemo(() => normalizarRespuesta(data), [data]);
  const encabezados = [tituloA, ...MESES, "Total"];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-panel">
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[1500px] text-left text-sm">
          <thead>
            <tr className="sticky top-0 z-10 bg-navy text-xs uppercase tracking-wide text-white/70">
              {encabezados.map((titulo, idx) =>
                idx === 0 ? (
                  <th key={idx} className="sticky left-0 z-20 min-w-[260px] bg-navy px-4 py-3 font-medium">
                    {titulo}
                  </th>
                ) : (
                  <th
                    key={idx}
                    className={`min-w-[120px] whitespace-nowrap px-4 py-3 text-right ${
                      idx === IDX_TOTAL ? "font-bold text-white" : "font-medium"
                    }`}
                  >
                    {titulo}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filas.map((celdas, i) => {
              const label = String(celdas[0]).trim(); // columna A: texto literal
              const tipo = tipoDeFila(label);
              const estilo = ESTILOS[tipo];
              const conDatos = tieneNumeros(celdas);

              return (
                <tr key={i} className={estilo.fila}>
                  <td
                    className={`sticky left-0 z-[5] min-w-[260px] bg-inherit py-2.5 pr-4 ${
                      tipo === "item" ? "pl-8 font-normal text-slate-700" : `pl-3 ${estilo.base} ${estilo.color}`
                    }`}
                  >
                    {label}
                  </td>
                  {celdas.slice(1).map((raw, j) => {
                    const idx = j + 1;
                    const n = aNumero(raw);
                    const texto = esVacia(raw)
                      ? conDatos
                        ? "—"
                        : ""
                      : n !== null
                      ? formatBRL(n)
                      : String(raw);
                    const clase =
                      idx === IDX_TOTAL && tipo === "item"
                        ? "bg-slate-50 font-bold text-navy"
                        : `${estilo.base} ${colorDeValor(tipo, n)}`;
                    return (
                      <td key={idx} className={`whitespace-nowrap px-4 py-2.5 text-right tabular-nums ${clase}`}>
                        {texto}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FlujoCaja() {
  const [data, setData] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");

  function load() {
    setStatus("loading");
    fetchFromSheet("flujoCajaTabla")
      // Si Code.gs aun no fue actualizado, usa el formato anterior sin romperse.
      .catch(() => fetchFromSheet("flujoCaja"))
      .then((rows) => {
        setData(rows);
        setStatus("ready");
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setStatus("error");
      });
  }

  useEffect(load, []);

  if (status === "loading") return <LoadingState label="Cargando flujo de caja..." />;
  if (status === "error") return <ErrorState message={errorMsg} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Flujo de Caja" description="Reporte anual resumido" />
      {data.length === 0 ? <EmptyState label="Aun no hay datos de flujo de caja." /> : <TablaFlujoCaja data={data} />}
    </div>
  );
}
