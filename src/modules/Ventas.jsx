import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Receipt } from "lucide-react";
import { fetchFromSheet } from "../api/appsScript";
import {
  formatBRL,
  formatDate,
  formatMonthLabel,
  daysUntil,
  monthKey,
  normalize,
  parseDateSafe,
} from "../utils/format";
import { Banner, EmptyState, ErrorState, LoadingState, PageHeader, SearchInput, SelectInput, Badge } from "../components/UI";

function saleTone(sale) {
  const estado = normalize(sale.estadoPago);
  if (estado === "sim") return "ok";
  if (estado.includes("prazo")) return "warn";
  if (estado === "nao") return "bad";
  return "neutral";
}

const TONE_ROW = {
  ok: "bg-ok-row",
  warn: "bg-warn-row",
  bad: "bg-bad-row",
  neutral: "bg-white",
};

export default function Ventas() {
  const [data, setData] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const [vendedor, setVendedor] = useState("");
  const [cliente, setCliente] = useState("");
  const [mes, setMes] = useState("");
  const [tipoVenta, setTipoVenta] = useState("");
  const [pago, setPago] = useState("");

  function load() {
    setStatus("loading");
    fetchFromSheet("ventas")
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

  // Ordenadas de la mas reciente a la mas antigua, siempre.
  const dataOrdenada = useMemo(() => {
    return [...data].sort((a, b) => {
      const fa = parseDateSafe(a.fecha);
      const fb = parseDateSafe(b.fecha);
      if (!fa && !fb) return 0;
      if (!fa) return 1;
      if (!fb) return -1;
      return fb - fa;
    });
  }, [data]);

  const vendedores = useMemo(
    () => [...new Set(data.map((d) => d.vendedor).filter(Boolean))].sort(),
    [data]
  );

  const tiposVenta = useMemo(
    () => [...new Set(data.map((d) => d.tipoVenta).filter(Boolean))].sort(),
    [data]
  );

  const estadosPago = useMemo(
    () => [...new Set(data.map((d) => d.estadoPago).filter(Boolean))].sort(),
    [data]
  );

  const meses = useMemo(() => {
    const map = new Map();
    data.forEach((d) => {
      const key = monthKey(d.fecha);
      if (key && !map.has(key)) map.set(key, formatMonthLabel(d.fecha));
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);

  const filtered = useMemo(() => {
    return dataOrdenada.filter((s) => {
      if (vendedor && s.vendedor !== vendedor) return false;
      if (cliente && !normalize(s.cliente).includes(normalize(cliente))) return false;
      if (mes && monthKey(s.fecha) !== mes) return false;
      if (tipoVenta && s.tipoVenta !== tipoVenta) return false;
      if (pago && s.estadoPago !== pago) return false;
      return true;
    });
  }, [dataOrdenada, vendedor, cliente, mes, tipoVenta, pago]);

  const total = filtered.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

  const proximasAVencer = useMemo(
    () =>
      data.filter((s) => {
        if (normalize(s.estadoPago) === "sim") return false;
        const dias = daysUntil(s.fechaVencimiento);
        return dias !== null && dias <= 5;
      }),
    [data]
  );

  if (status === "loading") return <LoadingState label="Cargando ventas..." />;
  if (status === "error") return <ErrorState message={errorMsg} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Ventas"
        description="Notas fiscales emitidas (NF-e, NFC-e, NF-e_M, Nf-e_Rd) · mas recientes primero"
      />

      {proximasAVencer.length > 0 && (
        <div className="mb-5">
          <Banner tone="bad" icon={AlertTriangle}>
            <span className="font-medium">{proximasAVencer.length} venta(s)</span> con boleto proximo a
            vencer o vencido. Contacta a estos clientes:{" "}
            <span className="font-medium">
              {[...new Set(proximasAVencer.map((s) => s.cliente))].slice(0, 4).join(", ")}
              {proximasAVencer.length > 4 ? "…" : ""}
            </span>
          </Banner>
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-3">
        <SearchInput value={cliente} onChange={setCliente} placeholder="Buscar cliente..." />
        <SelectInput value={vendedor} onChange={setVendedor} options={vendedores} placeholder="Todos los vendedores" />
        <SelectInput
          value={mes}
          onChange={setMes}
          options={meses.map(([key]) => key)}
          placeholder="Filtrar por mes"
        />
        <SelectInput
          value={tipoVenta}
          onChange={setTipoVenta}
          options={tiposVenta}
          placeholder="Filtrar por tipo de venta"
        />
        <SelectInput value={pago} onChange={setPago} options={estadosPago} placeholder="Filtrar por pago" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState label="No hay ventas que coincidan con estos filtros." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-panel">
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="sticky top-0 z-10 bg-navy text-xs uppercase tracking-wide text-white/70">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Vendedor</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">N° NF</th>
                    <th className="px-4 py-3 font-medium">Pago</th>
                    <th className="px-4 py-3 font-medium">Vencimiento</th>
                    <th className="px-4 py-3 font-medium">Fecha pago</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((s, i) => {
                    const tone = saleTone(s);
                    return (
                      <tr key={i} className={TONE_ROW[tone]}>
                        <td className="whitespace-nowrap px-4 py-3">{formatDate(s.fecha)}</td>
                        <td className="whitespace-nowrap px-4 py-3">{s.vendedor}</td>
                        <td className="px-4 py-3">{s.cliente}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">{s.tipoVenta}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">{s.notaFiscal}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Badge tone={tone}>{s.estadoPago || "—"}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(s.fechaVencimiento)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(s.fechaPago)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatBRL(s.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-navy px-5 py-4 text-white">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Receipt className="h-4 w-4" />
              {filtered.length} nota(s) fiscal(es)
            </div>
            <p className="font-display text-lg font-bold">{formatBRL(total)}</p>
          </div>
        </>
      )}
    </div>
  );
}
