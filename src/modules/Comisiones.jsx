import { useEffect, useMemo, useState } from "react";
import { Percent } from "lucide-react";
import { fetchFromSheet } from "../api/appsScript";
import { formatBRL, formatMonthLabel, monthKey, normalize } from "../utils/format";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../components/UI";

// Unicos vendedores que se muestran en el resumen. Cualquier otro
// (incluyendo Diether Reuck y Roberto Alvarez) queda fuera del calculo.
const VENDEDORES_VISIBLES = ["Ricardo Aguero", "Ricardo Battistini", "Verena Reuck"];
const VENDEDORES_NORMALIZADOS = VENDEDORES_VISIBLES.map(normalize);

export default function Comisiones() {
  const [data, setData] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");

  function load() {
    setStatus("loading");
    fetchFromSheet("comisiones")
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

  // Filtra solo los 3 vendedores permitidos, ANTES de cualquier agregacion.
  const dataVisible = useMemo(
    () => data.filter((c) => VENDEDORES_NORMALIZADOS.includes(normalize(c.vendedor))),
    [data]
  );

  // Agrupa: fila por mes, columna por vendedor (nombre canonico exacto de VENDEDORES_VISIBLES).
  const resumen = useMemo(() => {
    const map = new Map();
    dataVisible.forEach((c) => {
      const key = monthKey(c.fechaPago);
      if (!key) return;
      const canonico = VENDEDORES_VISIBLES.find((v) => normalize(v) === normalize(c.vendedor));
      if (!canonico) return;

      if (!map.has(key)) {
        map.set(key, {
          key,
          label: formatMonthLabel(c.fechaPago),
          totales: Object.fromEntries(VENDEDORES_VISIBLES.map((v) => [v, 0])),
        });
      }
      map.get(key).totales[canonico] += Number(c.comision) || 0;
    });
    return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
  }, [dataVisible]);

  const totalesGenerales = useMemo(() => {
    const totales = Object.fromEntries(VENDEDORES_VISIBLES.map((v) => [v, 0]));
    resumen.forEach((mesRow) => {
      VENDEDORES_VISIBLES.forEach((v) => {
        totales[v] += mesRow.totales[v];
      });
    });
    return totales;
  }, [resumen]);

  const granTotal = VENDEDORES_VISIBLES.reduce((sum, v) => sum + totalesGenerales[v], 0);

  if (status === "loading") return <LoadingState label="Cargando comisiones..." />;
  if (status === "error") return <ErrorState message={errorMsg} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Comisiones" description="Resumen mensual agregado por vendedor" />

      {resumen.length === 0 ? (
        <EmptyState label="No hay comisiones registradas para estos vendedores todavia." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-panel">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="bg-navy text-xs uppercase tracking-wide text-white/70">
                    <th className="px-4 py-3 font-medium">Mes</th>
                    {VENDEDORES_VISIBLES.map((v) => (
                      <th key={v} className="px-4 py-3 text-right font-medium">
                        {v}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right font-medium">Total mes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resumen.map((mesRow) => {
                    const totalMes = VENDEDORES_VISIBLES.reduce((s, v) => s + mesRow.totales[v], 0);
                    return (
                      <tr key={mesRow.key} className="bg-white">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">{mesRow.label}</td>
                        {VENDEDORES_VISIBLES.map((v) => (
                          <td key={v} className="whitespace-nowrap px-4 py-3 text-right">
                            {formatBRL(mesRow.totales[v])}
                          </td>
                        ))}
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-navy">
                          {formatBRL(totalMes)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-100 bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">Total general</td>
                    {VENDEDORES_VISIBLES.map((v) => (
                      <td key={v} className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-700">
                        {formatBRL(totalesGenerales[v])}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-navy">
                      {formatBRL(granTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-navy px-5 py-4 text-white">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Percent className="h-4 w-4" />
              {resumen.length} mes(es) con comisiones
            </div>
            <p className="font-display text-lg font-bold">{formatBRL(granTotal)}</p>
          </div>
        </>
      )}
    </div>
  );
}
