import { useEffect, useMemo, useState } from "react";
import { fetchFromSheet } from "../api/appsScript";
import { formatBRL, normalize } from "../utils/format";
import { EmptyState, ErrorState, LoadingState, PageHeader, SelectInput } from "../components/UI";

const RESPONSABLE_FIELDS = ["responsable", "responsible", "encargado"];

function pickField(record, candidates) {
  const key = Object.keys(record).find((k) => candidates.some((c) => normalize(k).includes(c)));
  return key ? record[key] : undefined;
}

function esColumnaMonetaria(nombreColumna) {
  const AMOUNT_FIELDS = ["monto", "valor", "total", "importe", "pago", "preco", "precio"];
  const n = normalize(nombreColumna);
  return AMOUNT_FIELDS.some((f) => n.includes(f));
}

export default function Pagos() {
  const [meses, setMeses] = useState([]);
  const [mesActivo, setMesActivo] = useState("");
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [responsable, setResponsable] = useState("");

  useEffect(() => {
    fetchFromSheet("pagosMeses")
      .then((list) => {
        setMeses(list);
        if (list.length) setMesActivo(list[list.length - 1]);
        else setStatus("ready");
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    if (!mesActivo) return;
    setStatus("loading");
    fetchFromSheet("pagos", { mes: mesActivo })
      .then((data) => {
        setRows(data);
        setStatus("ready");
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setStatus("error");
      });
  }, [mesActivo]);

  const columns = rows[0] ? Object.keys(rows[0]) : [];

  const responsables = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const val = pickField(r, RESPONSABLE_FIELDS);
      if (val) set.add(val);
    });
    return [...set];
  }, [rows]);

  // Se muestran TODAS las filas tal cual vienen de la hoja, incluyendo su
  // propia fila de totales al final (como en la hoja original).
  const filtered = useMemo(() => {
    if (!responsable) return rows;
    return rows.filter((r) => pickField(r, RESPONSABLE_FIELDS) === responsable);
  }, [rows, responsable]);

  if (status === "error") return <ErrorState message={errorMsg} onRetry={() => setMesActivo((m) => m)} />;

  return (
    <div>
      <PageHeader
        title="Pagos"
        description="Detalle de compras y gastos mes a mes"
        right={
          meses.length > 0 && (
            <SelectInput value={mesActivo} onChange={setMesActivo} options={meses} placeholder="Selecciona mes" />
          )
        }
      />

      {status === "loading" ? (
        <LoadingState label="Cargando pagos..." />
      ) : rows.length === 0 ? (
        <EmptyState label="No hay pagos registrados para este mes." />
      ) : (
        <>
          {responsables.length > 0 && (
            <div className="mb-5">
              <SelectInput
                value={responsable}
                onChange={setResponsable}
                options={responsables}
                placeholder="Todos los responsables"
              />
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
                  {filtered.map((row, i) => (
                    <tr key={i} className="bg-white">
                      {columns.map((col) => (
                        <td key={col} className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {esColumnaMonetaria(col) && row[col] !== "" && row[col] !== null && row[col] !== undefined
                            ? formatBRL(row[col])
                            : String(row[col] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
