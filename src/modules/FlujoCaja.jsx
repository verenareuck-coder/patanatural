import { useEffect, useState } from "react";
import { fetchFromSheet } from "../api/appsScript";
import { formatBRL, normalize } from "../utils/format";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../components/UI";

function findNumericColumns(rows) {
  const cols = new Set();
  rows.forEach((row) => {
    Object.entries(row).forEach(([k, v]) => {
      if (v !== "" && v !== null && v !== undefined && !isNaN(Number(String(v).replace(/[^\d.-]/g, "")))) {
        cols.add(k);
      }
    });
  });
  return [...cols];
}

// Filas de "Total" (entradas/recebimento, saidas/pagamentos): destacadas
// con fondo sutil, negrita y tipografia mas grande.
function esFilaTotal(label) {
  const n = normalize(label);
  return n.includes("total entradas") || n.includes("total saidas");
}

// Filas de resultado/balance: destacadas con color de acento distinto.
function esFilaBalance(label) {
  const n = normalize(label);
  return n.includes("geracao operacional") || n.includes("saldo operacional") || n.includes("saldo final");
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

  const columns = rows[0] ? Object.keys(rows[0]) : [];
  // Columna A (conceptos/etiquetas): siempre la primera columna devuelta.
  // Si en la hoja real no tiene texto de encabezado, el backend ya le
  // asigna un nombre de respaldo ("Columna A") para que nunca se pierda.
  const labelCol = columns[0];
  const numericCols = findNumericColumns(rows);
  const totalCol = columns.find((c) => normalize(c) === "total");

  if (status === "loading") return <LoadingState label="Cargando flujo de caja..." />;
  if (status === "error") return <ErrorState message={errorMsg} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Flujo de Caja" description="Reporte anual resumido" />

      {rows.length === 0 ? (
        <EmptyState label="Aun no hay datos de flujo de caja." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-panel">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="sticky top-0 z-10 bg-navy text-xs uppercase tracking-wide text-white/70">
                  {columns.map((col) => (
                    <th key={col} className="whitespace-nowrap px-4 py-3 font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => {
                  const label = row[labelCol];
                  const filaTotal = esFilaTotal(label);
                  const filaBalance = esFilaBalance(label);
                  const rowClass = filaBalance ? "bg-coral-soft" : filaTotal ? "bg-slate-100" : "bg-white";
                  const textClass = filaBalance || filaTotal ? "font-bold text-navy" : "text-slate-600";
                  const sizeClass = filaBalance ? "text-base" : filaTotal ? "text-[0.95rem]" : "";

                  return (
                    <tr key={i} className={rowClass}>
                      {columns.map((col) => {
                        const esColLabel = col === labelCol;
                        const esColTotal = col === totalCol;
                        const rawValue = row[col];
                        const vacio = rawValue === "" || rawValue === null || rawValue === undefined;
                        const value = vacio
                          ? "—"
                          : numericCols.includes(col)
                          ? formatBRL(rawValue)
                          : String(rawValue);
                        return (
                          <td
                            key={col}
                            className={`whitespace-nowrap px-4 py-3 ${textClass} ${sizeClass} ${
                              esColLabel ? "font-medium text-slate-700" : ""
                            } ${esColTotal && !filaTotal && !filaBalance ? "font-bold text-navy" : ""}`}
                          >
                            {value}
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
      )}
    </div>
  );
}
