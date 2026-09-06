import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Fish } from "lucide-react";
import { fetchFromSheet } from "../api/appsScript";
import { formatBRL, formatDate, daysUntil, normalize, parseDateSafe } from "../utils/format";
import { Badge, Banner, EmptyState, ErrorState, LoadingState, PageHeader, SearchInput } from "../components/UI";

function boletoTone(boleto) {
  const estado = normalize(boleto.estadoPago);
  if (estado === "sim" || estado === "pago" || estado === "pagado") return "ok";
  const dias = daysUntil(boleto.fechaVencimiento);
  if (dias !== null && dias <= 5) return "bad";
  return "warn";
}

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

  // Mas recientes arriba, mas antiguas abajo, por fecha de emision.
  const dataOrdenada = useMemo(() => {
    return [...data].sort((a, b) => {
      const fa = parseDateSafe(a.fechaEmision);
      const fb = parseDateSafe(b.fechaEmision);
      if (!fa && !fb) return 0;
      if (!fa) return 1;
      if (!fb) return -1;
      return fb - fa;
    });
  }, [data]);

  const filtered = useMemo(() => {
    if (!query) return dataOrdenada;
    const q = normalize(query);
    return dataOrdenada.filter(
      (c) => normalize(c.proveedor).includes(q) || normalize(c.nro).includes(q)
    );
  }, [dataOrdenada, query]);

  const alertas = useMemo(() => {
    const pendientes = [];
    data.forEach((compra) => {
      (compra.boletos || []).forEach((b) => {
        if (!b.fechaVencimiento) return;
        const estado = normalize(b.estadoPago);
        if (estado === "sim" || estado === "pago" || estado === "pagado") return;
        const dias = daysUntil(b.fechaVencimiento);
        if (dias !== null && dias <= 5) pendientes.push({ compra, boleto: b });
      });
    });
    return pendientes;
  }, [data]);

  const total = filtered.reduce((sum, c) => sum + (Number(c.montoTotal) || 0), 0);

  if (status === "loading") return <LoadingState label="Cargando compras..." />;
  if (status === "error") return <ErrorState message={errorMsg} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Compras MMPP" description="Materia prima: compras a proveedores, mas recientes primero" />

      {alertas.length > 0 && (
        <div className="mb-5">
          <Banner tone="bad" icon={AlertTriangle}>
            <span className="font-medium">{alertas.length} boleto(s)</span> proximos a vencer o vencidos,
            pendientes de pago.
          </Banner>
        </div>
      )}

      <div className="mb-5">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por proveedor o N°..." />
      </div>

      {filtered.length === 0 ? (
        <EmptyState label="No hay compras registradas para esta busqueda." />
      ) : (
        <>
          <div className="space-y-4">
            {filtered.map((c, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-panel">
                <div className="flex flex-wrap items-start justify-between gap-4 p-4">
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

                {c.boletos && c.boletos.length > 0 && (
                  <div className="grid grid-cols-1 divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                    {c.boletos.map((b, idx) => (
                      <div key={idx} className="px-4 py-3">
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                          Boleto {idx + 1}
                        </p>
                        <p className="text-sm text-slate-600">Vence {formatDate(b.fechaVencimiento)}</p>
                        <p className="text-sm font-medium text-slate-700">{formatBRL(b.valorPagar)}</p>
                        <Badge tone={boletoTone(b)}>{b.estadoPago || "Pendiente"}</Badge>
                      </div>
                    ))}
                  </div>
                )}
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
