import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, X } from "lucide-react";
import { fetchFromSheet } from "../api/appsScript";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../components/UI";

export default function Galeria() {
  const [data, setData] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [categoria, setCategoria] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState(null);

  function load() {
    setStatus("loading");
    fetchFromSheet("galeria")
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

  const categorias = useMemo(
    () => [...new Set(data.map((d) => d.categoria).filter(Boolean))],
    [data]
  );

  useEffect(() => {
    if (!categoria && categorias.length) setCategoria(categorias[0]);
  }, [categorias, categoria]);

  const visibles = useMemo(
    () => data.filter((d) => d.categoria === categoria),
    [data, categoria]
  );

  const imagenes = visibles.filter((d) => d.tipo === "imagen");
  const documentos = visibles.filter((d) => d.tipo === "pdf");

  useEffect(() => {
    function onKey(e) {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight") setLightboxIndex((i) => Math.min(i + 1, imagenes.length - 1));
      if (e.key === "ArrowLeft") setLightboxIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, imagenes.length]);

  if (status === "loading") return <LoadingState label="Cargando galeria..." />;
  if (status === "error") return <ErrorState message={errorMsg} onRetry={load} />;

  if (data.length === 0) {
    return (
      <div>
        <PageHeader title="Fotos y Fichas" description="Presentacion, fichas tecnicas y fotos de productos" />
        <EmptyState label="Aun no hay archivos conectados. Crea una carpeta en Google Drive con subcarpetas (ej. 'Fotos Productos', 'Fichas Tecnicas') y pega su ID en CONFIG.GALERIA_FOLDER_ID dentro de Code.gs." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Fotos y Fichas" description="Presentacion, fichas tecnicas y fotos de productos" />

      <div className="mb-5 flex flex-wrap gap-2">
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoria(cat)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              categoria === cat ? "bg-coral text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {documentos.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documentos.map((doc, i) => (
            <a
              key={i}
              href={doc.urlPreview}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-panel transition hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coral-soft">
                <FileText className="h-5 w-5 text-coral" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-700">{doc.nombre}</p>
                <p className="text-xs text-slate-400">Ver PDF</p>
              </div>
            </a>
          ))}
        </div>
      )}

      {imagenes.length === 0 && documentos.length === 0 ? (
        <EmptyState label="No hay archivos en esta categoria todavia." />
      ) : (
        imagenes.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {imagenes.map((img, i) => (
              <button
                key={i}
                onClick={() => setLightboxIndex(i)}
                className="group aspect-square overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 shadow-panel"
              >
                <img
                  src={img.miniatura}
                  alt={img.nombre}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        )
      )}

      {lightboxIndex !== null && imagenes[lightboxIndex] && (
        <div className="fixed inset-0 z-50 flex flex-col bg-navy-dark/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <p className="truncate text-sm">{imagenes[lightboxIndex].nombre}</p>
            <div className="flex items-center gap-2">
              <a
                href={imagenes[lightboxIndex].urlDescarga}
                className="rounded-full p-2 hover:bg-white/10"
                title="Descargar"
              >
                <Download className="h-5 w-5" />
              </a>
              <button onClick={() => setLightboxIndex(null)} className="rounded-full p-2 hover:bg-white/10" aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center px-4 pb-4">
            {lightboxIndex > 0 && (
              <button
                onClick={() => setLightboxIndex((i) => i - 1)}
                className="absolute left-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:left-4"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            <img
              src={imagenes[lightboxIndex].urlCompleta}
              alt={imagenes[lightboxIndex].nombre}
              className="max-h-full max-w-full rounded-xl object-contain"
            />
            {lightboxIndex < imagenes.length - 1 && (
              <button
                onClick={() => setLightboxIndex((i) => i + 1)}
                className="absolute right-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-4"
                aria-label="Siguiente"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
