import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchFromSheet } from "../api/appsScript";
import { formatBRL, formatMonthLabel, monthKey, normalize } from "../utils/format";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../components/UI";

export default function Estadisticas() {
  const [ventas, setVentas] = useState(null);
  const [ventasError, setVentasError] = useState("");
  const [productos, setProductos] = useState(null);
  const [flujo, setFlujo] = useState(null);

  useEffect(() => {
    fetchFromSheet("ventas")
      .then(setVentas)
      .catch((err) => setVentasError(err.message));

    fetchFromSheet("productosVendidos")
      .then(setProductos)
      .catch(() => setProductos([]));

    fetchFromSheet("flujoCaja")
      .then(setFlujo)
      .catch(() => setFlujo([]));
  }, []);

  const ventasValidas = useMemo(() => {
    if (!ventas) return null;
    // Regla de negocio: para Estadisticas, solo cuenta como venta valida
    // el tipo de venta EXACTO "NF-e" o "NFC-e". Cualquier otro tipo
    // (NF-e_M, Nf-e_Rd, etc.) se ignora en todos los KPIs y graficos.
    return ventas.filter((v) => v.tipoVenta === "NF-e" || v.tipoVenta === "NFC-e");
  }, [ventas]);

  const ventasPorMes = useMemo(() => {
    if (!ventasValidas) return [];
    const map = new Map();
    ventasValidas.forEach((v) => {
      const key = monthKey(v.fecha);
      if (!key) return;
      const label = formatMonthLabel(v.fecha);
      const prev = map.get(key) || { key, label, total: 0 };
      prev.total += Number(v.total) || 0;
      map.set(key, prev);
    });
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [ventasValidas]);

  const topVendedores = useMemo(() => {
    if (!ventasValidas) return [];
    const map = new Map();
    ventasValidas.forEach((v) => {
      const key = v.vendedor || "Sin asignar";
      map.set(key, (map.get(key) || 0) + (Number(v.total) || 0));
    });
    return [...map.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [ventasValidas]);

  // Aportes de capital de los socios: se leen de dos filas especificas del
  // Flujo de Caja (columna "Total" de cada una), traduciendo la etiqueta
  // de portugues a espanol para mostrarla.
  const aportesSocios = useMemo(() => {
    if (!flujo || flujo.length === 0) return [];
    const columns = Object.keys(flujo[0]);
    const labelCol = columns[0];
    const totalCol = columns.find((c) => normalize(c) === "total") || columns[columns.length - 1];

    const buscarFila = (patron) => flujo.find((r) => normalize(r[labelCol]).includes(patron));

    const filaReuck = buscarFila("d. reuck") || buscarFila("reuck");
    const filaAlvarez = buscarFila("r. alvarez") || buscarFila("alvarez");

    const resultado = [];
    if (filaReuck) {
      resultado.push({ name: "Aportes de Diether Reuck", total: Number(filaReuck[totalCol]) || 0 });
    }
    if (filaAlvarez) {
      resultado.push({ name: "Aportes de Roberto Alvarez", total: Number(filaAlvarez[totalCol]) || 0 });
    }
    return resultado;
  }, [flujo]);

  if (ventasError) return <ErrorState message={ventasError} />;
  if (ventas === null) return <LoadingState label="Calculando estadisticas..." />;

  const bars = ["#0B2A4A", "#E8734A", "#123B63", "#F4A583", "#1E7A42", "#92610C"];

  return (
    <div>
      <PageHeader title="Estadisticas" description="Indicadores clave de rendimiento" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-panel">
          <p className="mb-3 text-sm font-medium text-slate-600">Ventas mensuales</p>
          {ventasPorMes.length === 0 ? (
            <EmptyState label="Sin datos suficientes." />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ventasPorMes} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip formatter={(v) => formatBRL(v)} />
                  <Line type="monotone" dataKey="total" stroke="#E8734A" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-panel">
          <p className="mb-3 text-sm font-medium text-slate-600">Vendedores con mejor rendimiento</p>
          {topVendedores.length === 0 ? (
            <EmptyState label="Sin datos suficientes." />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topVendedores} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip formatter={(v) => formatBRL(v)} />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {topVendedores.map((_, i) => (
                      <Cell key={i} fill={bars[i % bars.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-panel">
          <p className="mb-3 text-sm font-medium text-slate-600">Productos mas vendidos (KG)</p>
          {!productos || productos.length === 0 ? (
            <EmptyState label="Aun no hay ventas con producto y KG registrados (columnas F y K de la hoja DATA)." />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productos.slice(0, 8)} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="producto" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip formatter={(v) => `${v} kg`} />
                  <Bar dataKey="kg" radius={[6, 6, 0, 0]} fill="#0B2A4A" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-panel">
          <p className="mb-3 text-sm font-medium text-slate-600">Aportes de capital de los socios</p>
          {!flujo ? (
            <LoadingState label="Cargando flujo de caja..." />
          ) : aportesSocios.length === 0 ? (
            <EmptyState label="No se encontraron las filas de aportes de D. Reuck / R. Alvarez en Flujo de Caja." />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aportesSocios} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip formatter={(v) => formatBRL(v)} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#E8734A" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
