import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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

const LINE_COLORS = [
  "#0B2A4A", "#E8734A", "#1E7A42", "#92610C", "#7C3AED",
  "#0EA5E9", "#DB2777", "#65A30D", "#B45309", "#334155",
];

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
  const numericCols = useMemo(() => findNumericColumns(rows), [rows]);
  const totalCol = columns.find((c) => normalize(c) === "total");
  // Columnas de periodo = todas menos la de conceptos/etiqueta.
  const periodCols = columns.filter((c) => c !== labelCol);

  // Filas con nombre real (variable/concepto) y al menos un valor numerico:
  // son las lineas que se grafican a lo largo del tiempo.
  const filasGraficables = useMemo(
    () =>
      rows.filter((r) => {
        const label = String(r[labelCol] ?? "").trim();
        if (!label) return false;
        return periodCols.some((c) => numericCols.includes(c) && r[c] !== "");
      }),
    [rows, labelCol, periodCols, numericCols]
  );

  // Transpone: un punto por periodo, con una serie (linea) por cada concepto.
  const chartData = useMemo(
    () =>
      periodCols
        .filter((c) => numericCols.includes(c))
        .map((periodo) => {
          const punto = { periodo };
          filasGraficables.forEach((r) => {
            punto[String(r[labelCol])] = Number(r[periodo]) || 0;
          });
          return punto;
        }),
    [periodCols, numericCols, filasGraficables, labelCol]
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
          {chartData.length > 0 && filasGraficables.length > 0 && (
            <div className="mb-6 h-80 rounded-2xl border border-slate-100 bg-white p-4 shadow-panel">
              <p className="mb-2 text-sm font-medium text-slate-600">Como fluctuan los montos en el tiempo</p>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip formatter={(v) => formatBRL(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {filasGraficables.map((r, i) => {
                    const label = String(r[labelCol]);
                    const destacada = esFilaTotal(label) || esFilaBalance(label);
                    return (
                      <Line
                        key={label}
                        type="monotone"
                        dataKey={label}
                        stroke={LINE_COLORS[i % LINE_COLORS.length]}
                        strokeWidth={destacada ? 3 : 1.5}
                        dot={{ r: destacada ? 3 : 2 }}
                      />
                    );
                  })}
                </LineChart>
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
        </>
      )}
    </div>
  );
}
