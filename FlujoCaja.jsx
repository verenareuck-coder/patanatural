import { useEffect, useMemo, useState } from "react";
import { fetchFromSheet } from "../api/appsScript";
import { aNumero, formatBRL, normalize } from "../utils/format";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../components/UI";

// Estructura de la hoja: A = variables (texto), B..M = Janeiro..Dezembro,
// N = Total. Solo B..N llevan formato de moneda; A siempre es texto.
const MAX_COLUMNAS = 14;

// Filas de total (entradas/recebimento, saidas/pagamentos).
function esFilaTotal(label) {
  const n = normalize(label);
  return n.includes("total entradas") || n.includes("total saidas");
}

// Filas de resultado: geracao operacional / saldo final.
function esFilaBalance(label) {
  const n = normalize(label);
  return n.includes("geracao operacional") || n.includes("saldo operacional") || n.includes("saldo final");
}

// Tabla pura (sin fetch): replica la estructura visual de la planilla.
export function TablaFlujo({ rows }) {
  const columns = useMemo(() => (rows[0] ? Object.keys(rows[0]).slice(0, MAX_COLUMNAS) : []), [rows]);
  const labelCol = columns[0];
  const valueCols = useMemo(() => columns.slice(1), [columns]);
  const totalCol = useMemo(
    () =>
      valueCols.find((c) => normalize(c) === "total") ||
      (columns.length === MAX_COLUMNAS ? columns[MAX_COLUMNAS - 1] : null),
    [columns, valueCols]
  );

  // Clasifica cada fila: balance / total / seccion (titulo sin datos) / normal.
  const filas = useMemo(
    () =>
      rows
        .map((row) => {
          const label = String(row[labelCol] ?? "").trim();
          const tieneDatos = valueCols.some((c) => aNumero(row[c]) !== null);
          let tipo = "normal";
          if (esFilaBalance(label)) tipo = "balance";
          else if (esFilaTotal(label)) tipo = "total";
          else if (label !== "" && !tieneDatos) tipo = "seccion";
          return { row, label, tieneDatos, tipo };
        })
        .filter((f) => f.label !== "" || f.tieneDatos),
    [rows, labelCol, valueCols]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-panel">
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="sticky top-0 z-10 bg-navy text-xs uppercase tracking-wide text-white/70">
              {columns.map((col, idx) =>
                idx === 0 ? (
                  <th key={col} className="sticky left-0 z-20 min-w-[240px] bg-navy px-4 py-3 font-medium">
                    {col}
                  </th>
                ) : (
                  <th
                    key={col}
                    className={`whitespace-nowrap px-4 py-3 text-right font-medium ${
                      col === totalCol ? "font-bold text-white" : ""
                    }`}
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filas.map(({ row, label, tipo }, i) => {
              if (tipo === "seccion") {
                return (
                  <tr key={i} className="bg-slate-200">
                    <td className="sticky left-0 z-[5] min-w-[240px] whitespace-nowrap bg-inherit px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-navy">
                      {label}
                    </td>
                    {valueCols.map((col) => (
                      <td key={col} className="px-4 py-2.5" />
                    ))}
                  </tr>
                );
              }

              const rowClass =
                tipo === "balance" ? "bg-coral-soft" : tipo === "total" ? "bg-slate-100" : "bg-white";
              const textClass =
                tipo === "balance"
                  ? "text-base font-bold text-navy"
                  : tipo === "total"
                  ? "text-[0.95rem] font-bold text-navy"
                  : "text-slate-600";

              return (
                <tr key={i} className={rowClass}>
                  <td
                    className={`sticky left-0 z-[5] min-w-[240px] bg-inherit px-4 py-3 ${
                      tipo === "normal" ? "font-medium text-slate-700" : textClass
                    }`}
                  >
                    {label}
                  </td>
                  {valueCols.map((col) => {
                    const raw = row[col];
                    const vacio = raw === "" || raw === null || raw === undefined;
                    const n = aNumero(raw);
                    const texto = vacio ? "—" : n !== null ? formatBRL(n) : String(raw);
                    const esColTotal = col === totalCol;
                    return (
                      <td
                        key={col}
                        className={`whitespace-nowrap px-4 py-3 text-right ${textClass} ${
                          esColTotal && tipo === "normal" ? "bg-slate-50 font-bold text-navy" : ""
                        }`}
                      >
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
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");

  function load() {
    setStatus("loading");
    fetchFromSheet("flujoCaja")
      .then((data) => {
        setRows(data);
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
      {rows.length === 0 ? <EmptyState label="Aun no hay datos de flujo de caja." /> : <TablaFlujo rows={rows} />}
    </div>
  );
}
