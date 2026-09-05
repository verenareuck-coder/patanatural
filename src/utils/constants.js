// PIN de 4 digitos -> rol. Editar aqui si cambian los PIN del equipo.
export const PIN_ROLES = {
  "0000": "trabajador",
  "4367": "gerencia",
};

export const ROLE_LABELS = {
  trabajador: "Trabajador",
  gerencia: "Gerencia / Administracion",
};

// Definicion de modulos, icono (lucide-react) y roles que pueden verlos.
export const MODULES = [
  { key: "ventas", label: "Ventas", icon: "Receipt", roles: ["trabajador", "gerencia"] },
  { key: "comisiones", label: "Comisiones", icon: "Percent", roles: ["trabajador", "gerencia"] },
  { key: "inventario", label: "Inventario", icon: "Package", roles: ["trabajador", "gerencia"] },
  { key: "cartera", label: "Cartera de Clientes", icon: "Users", roles: ["trabajador", "gerencia"] },
  { key: "galeria", label: "Fotos y Fichas", icon: "Images", roles: ["trabajador", "gerencia"] },
  { key: "comprasMMPP", label: "Compras MMPP", icon: "Fish", roles: ["gerencia"] },
  { key: "pagos", label: "Pagos", icon: "CreditCard", roles: ["gerencia"] },
  { key: "flujoCaja", label: "Flujo de Caja", icon: "TrendingUp", roles: ["gerencia"] },
  { key: "estadisticas", label: "Estadisticas", icon: "BarChart3", roles: ["gerencia"] },
];

export function modulesForRole(role) {
  return MODULES.filter((m) => m.roles.includes(role));
}
