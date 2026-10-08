import { useMemo, useState } from "react";
import { Menu } from "lucide-react";
import Login from "./components/Login.jsx";
import Sidebar from "./components/Sidebar.jsx";
import { modulesForRole } from "./utils/constants";

import Ventas from "./modules/Ventas.jsx";
import Comisiones from "./modules/Comisiones.jsx";
import Inventario from "./modules/Inventario.jsx";
import CarteraClientes from "./modules/CarteraClientes.jsx";
import ComprasMMPP from "./modules/ComprasMMPP.jsx";
import Pagos from "./modules/Pagos.jsx";
import FlujoCaja from "./modules/FlujoCaja.jsx";
import Estadisticas from "./modules/Estadisticas.jsx";

const MODULE_COMPONENTS = {
  ventas: Ventas,
  comisiones: Comisiones,
  inventario: Inventario,
  cartera: CarteraClientes,
  comprasMMPP: ComprasMMPP,
  pagos: Pagos,
  flujoCaja: FlujoCaja,
  estadisticas: Estadisticas,
};

export default function App() {
  const [role, setRole] = useState(null);
  const [active, setActive] = useState("ventas");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const items = useMemo(() => (role ? modulesForRole(role) : []), [role]);

  function handleLogin(nextRole) {
    setRole(nextRole);
    setActive("ventas");
  }

  function handleLogout() {
    setRole(null);
    setMobileOpen(false);
  }

  if (!role) {
    return <Login onLogin={handleLogin} />;
  }

  const ActiveComponent = MODULE_COMPONENTS[active] || Ventas;
  const activeLabel = items.find((m) => m.key === active)?.label ?? "";

  return (
    <div className="flex min-h-screen bg-slate-50 md:h-screen md:overflow-hidden">
      <Sidebar
        role={role}
        active={active}
        onSelect={setActive}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col md:overflow-y-auto">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-navy hover:bg-slate-100"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="font-display text-sm font-bold text-navy">{activeLabel}</p>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 md:px-8 md:py-8">
          <ActiveComponent role={role} />
        </main>
      </div>
    </div>
  );
}
