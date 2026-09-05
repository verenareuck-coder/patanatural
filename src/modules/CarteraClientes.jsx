import { useEffect, useMemo, useState } from "react";
import { User } from "lucide-react";
import { fetchFromSheet } from "../api/appsScript";
import { normalize } from "../utils/format";
import { EmptyState, ErrorState, LoadingState, PageHeader, SearchInput } from "../components/UI";

// Campos que se muestran como titulo de la tarjeta, en orden de preferencia.
const NAME_FIELDS = ["nombre", "cliente", "razonsocial", "razonSocial", "empresa"];

function pickName(record) {
  for (const field of NAME_FIELDS) {
    const key = Object.keys(record).find((k) => normalize(k) === normalize(field));
    if (key && record[key]) return record[key];
  }
  const firstKey = Object.keys(record)[0];
  return firstKey ? record[firstKey] : "Cliente";
}

export default function CarteraClientes() {
  const [data, setData] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [query, setQuery] = useState("");

  function load() {
    setStatus("loading");
    fetchFromSheet("cartera")
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
    return data.filter((record) =>
      Object.values(record).some((value) => normalize(value).includes(q))
    );
  }, [data, query]);

  if (status === "loading") return <LoadingState label="Cargando cartera de clientes..." />;
  if (status === "error") return <ErrorState message={errorMsg} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Cartera de Clientes" description={`${data.length} cliente(s) registrados`} />

      <div className="mb-5">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por nombre, telefono, ciudad..." />
      </div>

      {filtered.length === 0 ? (
        <EmptyState label="No se encontraron clientes con ese criterio." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((record, i) => {
            const name = pickName(record);
            const entries = Object.entries(record).filter(([, v]) => v !== "" && v !== null && v !== undefined);
            return (
              <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-panel">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral-soft">
                    <User className="h-4 w-4 text-coral" />
                  </div>
                  <p className="truncate font-display text-sm font-bold text-navy">{name}</p>
                </div>
                <dl className="space-y-1 text-xs text-slate-500">
                  {entries.slice(0, 6).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-3">
                      <dt className="shrink-0 text-slate-400">{key}</dt>
                      <dd className="truncate text-right text-slate-600">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
