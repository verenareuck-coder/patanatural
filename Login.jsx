import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { PIN_ROLES } from "../utils/constants";

export default function Login({ onLogin }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pin.length < 4) return;
    const role = PIN_ROLES[pin];
    if (role) {
      onLogin(role);
    } else {
      setError(true);
      const t = setTimeout(() => {
        setError(false);
        setPin("");
      }, 500);
      return () => clearTimeout(t);
    }
  }, [pin, onLogin]);

  function press(digit) {
    if (pin.length >= 4) return;
    setError(false);
    setPin((p) => p + digit);
  }

  function backspace() {
    setError(false);
    setPin((p) => p.slice(0, -1));
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy px-6">
      {/* Resplandor sutil de marca detras del logo, sin salir de la paleta navy/coral */}
      <div className="pointer-events-none absolute left-1/2 top-[18%] h-72 w-72 -translate-x-1/2 rounded-full bg-coral/25 blur-[90px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className="relative w-full max-w-xs">
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src="/logo-mark.png"
            alt="Patagonia Natural"
            className="mb-4 h-24 w-24 object-contain drop-shadow-[0_8px_24px_rgba(232,115,74,0.25)]"
          />
          <h1 className="font-display text-xl font-bold text-white">Patagonia Natural</h1>
          <p className="mt-1 text-sm text-white/50">Ingresa tu PIN de 4 digitos</p>
        </div>

        <div className={`mb-8 flex justify-center gap-3 ${error ? "animate-shake" : ""}`}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-full border-2 transition-colors ${
                i < pin.length
                  ? error
                    ? "border-red-400 bg-red-400"
                    : "border-coral bg-coral"
                  : "border-white/25 bg-transparent"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="mb-4 flex items-center justify-center gap-1.5 text-center text-xs text-red-300">
            <Lock className="h-3 w-3" /> PIN incorrecto, intenta de nuevo
          </p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              onClick={() => press(d)}
              className="rounded-2xl bg-white/5 py-4 font-display text-lg font-semibold text-white transition active:scale-95 active:bg-white/15"
            >
              {d}
            </button>
          ))}
          <div />
          <button
            onClick={() => press("0")}
            className="rounded-2xl bg-white/5 py-4 font-display text-lg font-semibold text-white transition active:scale-95 active:bg-white/15"
          >
            0
          </button>
          <button
            onClick={backspace}
            className="rounded-2xl bg-white/5 py-4 text-lg font-semibold text-white/70 transition active:scale-95 active:bg-white/15"
            aria-label="Borrar"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
