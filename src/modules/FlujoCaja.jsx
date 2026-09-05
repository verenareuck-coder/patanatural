import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchFromSheet } from "../api/appsScript";
import { formatBRL, normalize } from "../utils/format";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../components/UI";

function findNumericColumns(row) {
  return Object.entries(row)
    .filter(([, v]) => v !== "" && !isNaN(Number(String(v).replace(/[^\d.-]/g, ""))))
    .map(([k]) => k);
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
  const labelCol = columns[0];
  const numericCols = rows[0] ? findNumericColumns(rows[0]) : [];
  // Columna literalmente llamada "Total" (ej. columna N): se destaca en
  // negrita en todas las filas, ademas del resaltado de fila que corresponda.
  const totalCol = columns.find((c) => normalize(c) === "total");
  const balanceCol =
    totalCol ||
    numericCols.find((c) => normalize(c).includes("saldo") || normalize(c).includes("balance")) ||
    numericCols[numericCols.length - 1];

  const chartData = useMemo(
    () =>
      rows
        .filter((r) => String(r[labelCol] ?? "").trim() !== "")
        .map((r) => ({
          label: String(r[labelCol] ?? ""),
          valor: Number(r[balanceCol]) || 0,
        })),
    [rows, labelCol, balanceCol]
  );

  if (status === "loading") return <LoadingState label="Cargando flujo de caja..." />;
  if (status === "error") return <ErrorState message={errorMsg} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Flujo de Caja" description="Reporte anual resumido" />

      {rows.length === 0 ? (
        <EmptyState label="Aun no hay datos de flujo de caja." />
      ) : (
        <>
          {balanceCol && (
            <div className="mb-6 h-64 rounded-2xl border border-slate-100 bg-white p-4 shadow-panel">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip formatter={(v) => formatBRL(v)} />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]} fill="#E8734A" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

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
                    const rowClass = filaBalance
                      ? "bg-coral-soft"
                      : filaTotal
                      ? "bg-slate-100"
                      : "bg-white";
                    const textClass = filaBalance || filaTotal ? "font-bold text-navy" : "text-slate-600";
                    const sizeClass = filaBalance ? "text-base" : filaTotal ? "text-[0.95rem]" : "";

                    return (
                      <tr key={i} className={rowClass}>
                        {columns.map((col) => {
                          const esColTotal = col === totalCol;
                          const value = numericCols.includes(col) ? formatBRL(row[col]) : String(row[col] ?? "—");
                          return (
                            <td
                              key={col}
                              className={`whitespace-nowrap px-4 py-3 ${textClass} ${sizeClass} ${
                                esColTotal && !filaTotal && !filaBalance ? "font-bold text-navy" : ""
                              }`}
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
        </>
      )}
    </div>
  );
}
