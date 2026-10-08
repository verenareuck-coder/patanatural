import { useEffect, useMemo, useState } from "react";
import { PackageCheck, PackageX } from "lucide-react";
import { fetchFromSheet } from "../api/appsScript";
import { normalize } from "../utils/format";
import { Badge, Banner, EmptyState, ErrorState, LoadingState, PageHeader, SearchInput } from "../components/UI";

function snapshotKey(origen) {
  return `pn_inventario_snapshot_v2_${origen}`;
}

function itemKey(item) {
  return `${item.producto}__${item.tamano}`;
}

function loadSnapshot(origen) {
  try {
    return JSON.parse(localStorage.getItem(snapshotKey(origen)) || "{}");
  } catch {
    return {};
  }
}

const ORIGENES = [
  { key: "pn", label: "Inventario PN" },
  { key: "nixxen", label: "Inventario Nixxen" },
];

export default function Inventario() {
  const [origen, setOrigen] = useState("pn");
  const [data, setData] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [query, setQuery] = useState("");
  const [changes, setChanges] = useState({ nuevos: [], agotados: [] });

  function load(origenActual) {
    setStatus("loading");
    fetchFromSheet("inventario", { origen: origenActual })
      .then((rows) => {
        setData(rows);
        setStatus("ready");

        const prev = loadSnapshot(origenActual);
        const nuevos = [];
        const agotados = [];
        rows.forEach((item) => {
          const key = itemKey(item);
          const prevKg = prev[key];
          const kg = Number(item.kgDisponibles) || 0;
          if (prevKg !== undefined) {
            if (prevKg <= 0 && kg > 0) nuevos.push(item);
            if (prevKg > 0 && kg <= 0) agotados.push(item);
          }
        });
        setChanges({ nuevos, agotados });

        const next = {};
        rows.forEach((item) => {
          next[itemKey(item)] = Number(item.kgDisponibles) || 0;
        });
        localStorage.setItem(snapshotKey(origenActual), JSON.stringify(next));
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setStatus("error");
      });
  }

  useEffect(() => load(origen), [origen]);

  const filtered = useMemo(() => {
    if (!query) return data;
    return data.filter((item) => normalize(item.producto).includes(normalize(query)));
  }, [data, query]);

  return (
    <div>
      <PageHeader title="Inventario" description="Stock disponible por producto y tamano" />

      <div className="mb-5 flex gap-2">
        {ORIGENES.map((o) => (
          <button
            key={o.key}
            onClick={() => setOrigen(o.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              origen === o.key ? "bg-coral text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {status === "loading" ? (
        <LoadingState label="Cargando inventario..." />
      ) : status === "error" ? (
        <ErrorState message={errorMsg} onRetry={() => load(origen)} />
      ) : (
        <>
          <div className="mb-5 space-y-3">
            {changes.nuevos.length > 0 && (
              <Banner tone="ok" icon={PackageCheck}>
                Nuevo stock disponible:{" "}
                <span className="font-medium">
                  {changes.nuevos.map((i) => `${i.producto} (${i.tamano})`).join(", ")}
                </span>
              </Banner>
            )}
            {changes.agotados.length > 0 && (
              <Banner tone="bad" icon={PackageX}>
                Se agotaron:{" "}
                <span className="font-medium">
                  {changes.agotados.map((i) => `${i.producto} (${i.tamano})`).join(", ")}
                </span>
              </Banner>
            )}
          </div>

          <div className="mb-5">
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar producto..." />
          </div>

          {filtered.length === 0 ? (
            <EmptyState label="No hay productos que coincidan con la busqueda." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-panel">
              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="sticky top-0 z-10 bg-navy text-xs uppercase tracking-wide text-white/70">
                      <th className="px-4 py-3 font-medium">Producto</th>
                      <th className="px-4 py-3 font-medium">Tamano</th>
                      <th className="px-4 py-3 text-right font-medium">KG disponibles</th>
                      <th className="px-4 py-3 text-right font-medium">Unidades</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((item, i) => {
                      const kg = Number(item.kgDisponibles) || 0;
                      const unidades = Number(item.unidadesDisponibles) || 0;
                      const hasStock = kg > 0 || unidades > 0;
                      return (
                        <tr key={i} className={hasStock ? "bg-ok-row" : "bg-slate-50 text-slate-400"}>
                          <td className="px-4 py-3 font-medium text-slate-700">{item.producto}</td>
                          <td className="px-4 py-3">{item.tamano ? `${item.tamano} GR` : "—"}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            {kg === 0 ? (
                              <Badge tone="neutral">Sin Stock</Badge>
                            ) : (
                              `${kg.toLocaleString("pt-BR")} kg`
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            {unidades === 0 ? (
                              <Badge tone="neutral">Sin Stock</Badge>
                            ) : (
                              `${unidades} UN`
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
