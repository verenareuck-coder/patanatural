import * as Icons from "lucide-react";
import { LogOut, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { modulesForRole, ROLE_LABELS } from "../utils/constants";

export default function Sidebar({
  role,
  active,
  onSelect,
  mobileOpen,
  onCloseMobile,
  collapsed,
  onToggleCollapsed,
  onLogout,
}) {
  const items = modulesForRole(role);

  return (
    <>
      {mobileOpen && (
        <button
          onClick={onCloseMobile}
          aria-label="Cerrar menu"
          className="fixed inset-0 z-30 bg-navy-dark/60 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full flex-col bg-navy transition-all duration-200 ease-out
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static
        ${collapsed ? "md:w-[76px]" : "md:w-64"} w-72`}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <img
            src="/logo-mark.png"
            alt="Patagonia Natural"
            className="h-11 w-11 shrink-0 object-contain"
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold text-white">Patagonia Natural</p>
              <p className="truncate text-[11px] text-white/45">{ROLE_LABELS[role]}</p>
            </div>
          )}
          <button
            onClick={onCloseMobile}
            className="ml-auto rounded-lg p-1.5 text-white/60 hover:bg-white/10 md:hidden"
            aria-label="Cerrar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {items.map((item) => {
            const Icon = Icons[item.icon] || Icons.Circle;
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onSelect(item.key);
                  onCloseMobile();
                }}
                title={collapsed ? item.label : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition
                ${
                  isActive
                    ? "bg-coral text-white font-medium shadow-sm"
                    : "text-white/65 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-white/10 px-3 py-3">
          <button
            onClick={onToggleCollapsed}
            className="hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/50 transition hover:bg-white/8 hover:text-white md:flex"
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
            {!collapsed && <span>Colapsar menu</span>}
          </button>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Cerrar sesion</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
