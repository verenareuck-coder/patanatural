import { useEffect, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { fetchFromSheet } from "../api/appsScript";
import { formatBRL, normalize } from "../utils/format";
import { EmptyState, ErrorState, LoadingState, PageHeader, SelectInput } from "../components/UI";

const AMOUNT_FIELDS = ["monto", "valor", "total", "importe", "pago", "preco", "precio"];
const RESPONSABLE_FIELDS = ["responsable", "responsible", "encargado"];

function pickField(record, candidates) {
  const key = Object.keys(record).find((k) => candidates.some((c) => normalize(k).includes(c)));
  return key ? record[key] : undefined;
}

function esColumnaMonetaria(nombreColumna) {
  const n = normalize(nombreColumna);
  return AMOUNT_FIELDS.some((f) => n.includes(f));
}

// Busca la palabra "total" en CUALQUIER columna de texto de la fila (no
// solo la primera), porque en muchas hojas la etiqueta "Total Mes" no
// esta en la columna A sino en la de "Descripcion" o similar.
function esFilaDeTotal(row) {
  return Object.values(row).some((v) => typeof v === "string" && normalize(v).includes("total"));
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

  // Fila de resumen que la propia planilla ya trae (ej. "Total Mes"): la
  // excluimos del listado de registros individuales, y usamos SU monto
  // como el total mostrado, en vez de recalcularlo nosotros (evita
  // diferencias de redondeo o doble conteo).
  const totalRowFromSheet = useMemo(() => {
    return rows.find((r) => esFilaDeTotal(r)) || null;
  }, [rows]);

  const rowsSinTotal = useMemo(() => {
    if (!totalRowFromSheet) return rows;
    return rows.filter((r) => r !== totalRowFromSheet);
  }, [rows, totalRowFromSheet]);

  const responsables = useMemo(() => {
    const set = new Set();
    rowsSinTotal.forEach((r) => {
      const val = pickField(r, RESPONSABLE_FIELDS);
      if (val) set.add(val);
    });
    return [...set];
  }, [rowsSinTotal]);

  const filtered = useMemo(() => {
    if (!responsable) return rowsSinTotal;
    return rowsSinTotal.filter((r) => pickField(r, RESPONSABLE_FIELDS) === responsable);
  }, [rowsSinTotal, responsable]);

  // Si hay filtro de responsable activo, el total mostrado se recalcula
  // sobre lo filtrado (la fila "Total Mes" de la planilla es el total SIN
  // filtrar, asi que solo la usamos como fuente de verdad cuando se estan
  // viendo todos los registros).
  const total = responsable
    ? filtered.reduce((sum, r) => sum + (Number(pickField(r, AMOUNT_FIELDS)) || 0), 0)
    : totalRowFromSheet
    ? Number(pickField(totalRowFromSheet, AMOUNT_FIELDS)) || 0
    : filtered.reduce((sum, r) => sum + (Number(pickField(r, AMOUNT_FIELDS)) || 0), 0);

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
      ) : rowsSinTotal.length === 0 ? (
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

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-navy px-5 py-4 text-white">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Wallet className="h-4 w-4" />
              {filtered.length} registro(s) · {mesActivo}
            </div>
            <p className="font-display text-lg font-bold">{formatBRL(total)}</p>
          </div>
        </>
      )}
    </div>
  );
}
