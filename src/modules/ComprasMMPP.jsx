import { useEffect, useMemo, useState } from "react";
import { Fish } from "lucide-react";
import { fetchFromSheet } from "../api/appsScript";
import { formatBRL, formatDate, normalize } from "../utils/format";
import { EmptyState, ErrorState, LoadingState, PageHeader, SearchInput } from "../components/UI";

export default function ComprasMMPP() {
  const [data, setData] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [query, setQuery] = useState("");

  function load() {
    setStatus("loading");
    fetchFromSheet("comprasMMPP")
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

  const filtered = useMemo(() => {
    if (!query) return data;
    const q = normalize(query);
    return data.filter(
      (c) => normalize(c.proveedor).includes(q) || normalize(c.nro).includes(q)
    );
  }, [data, query]);

  const total = filtered.reduce((sum, c) => sum + (Number(c.montoTotal) || 0), 0);

  if (status === "loading") return <LoadingState label="Cargando compras..." />;
  if (status === "error") return <ErrorState message={errorMsg} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Compras MMPP" description="Materia prima: compras a proveedores" />

      <div className="mb-5">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por proveedor o N°..." />
      </div>

      {filtered.length === 0 ? (
        <EmptyState label="No hay compras registradas para esta busqueda." />
      ) : (
        <>
          <div className="space-y-3">
            {filtered.map((c, i) => (
              <div
                key={i}
                className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-panel"
              >
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold text-navy">{c.proveedor}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {c.tipoDocumento} {c.nro ? `N° ${c.nro}` : ""}
                  </p>
                  <p className="text-xs text-slate-400">Emision: {formatDate(c.fechaEmision)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">{c.cantidad ?? "—"} kg</p>
                  <p className="font-display text-base font-bold text-navy">{formatBRL(c.montoTotal)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-navy px-5 py-4 text-white">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Fish className="h-4 w-4" />
              {filtered.length} compra(s)
            </div>
            <p className="font-display text-lg font-bold">{formatBRL(total)}</p>
          </div>
        </>
      )}
    </div>
  );
}
