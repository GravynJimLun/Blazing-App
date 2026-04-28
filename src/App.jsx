import { useEffect, useState, useMemo } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// ── Utils ──────────────────────────────────────────────────────────────────
function generarLink(nombre) {
  return "https://yugipedia.com/wiki/" +
    nombre.replace(/"/g, "").replace(/\//g, "_").replace(/ /g, "_");
}

function generarImagen(nombre) {
  const limpio = nombre.replace(/[^a-zA-Z0-9]/g, "");
  return `https://yugipedia.com/wiki/Special:FilePath/${limpio}-BLZD-JP-C.png`;
}

const RAREZA = {
  "Common":         { badge: "bg-gray-500 text-white",   glow: "",                              tier: 0 },
  "Super Rare":     { badge: "bg-blue-600 text-white",   glow: "hover:shadow-blue-500/50",      tier: 1 },
  "Ultra Rare":     { badge: "bg-purple-600 text-white", glow: "hover:shadow-purple-500/50",    tier: 2 },
  "Secret Rare":    { badge: "bg-yellow-400 text-black", glow: "hover:shadow-yellow-400/50",    tier: 3 },
  "Starlight Rare": { badge: "bg-gradient-to-r from-pink-500 via-yellow-300 to-purple-500 text-black", glow: "hover:shadow-pink-400/60", tier: 4 },
};

const RAREZAS = ["Common", "Super Rare", "Ultra Rare", "Secret Rare", "Starlight Rare"];

function parsePrecio(val) {
  if (typeof val === "number") return val;
  return parseFloat(String(val).replace(/,/g, "")) || 0;
}

function formatPrecio(val) {
  const n = parsePrecio(val);
  return `₡${n.toLocaleString("es-CR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function loadStorage(key) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : []; }
  catch { return []; }
}

// ── Toast ──────────────────────────────────────────────────────────────────
function Toasts({ items }) {
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 pointer-events-none">
      {items.map(t => (
        <div key={t.id} className="toast-enter bg-[#111118] border border-white/10 shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3 min-w-[260px] max-w-xs">
          <span className="text-2xl flex-shrink-0">{t.tipo === "tengo" ? "✅" : "⭐"}</span>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-xs uppercase tracking-wide ${t.tipo === "tengo" ? "text-green-400" : "text-orange-400"}`}>
              {t.tipo === "tengo" ? "Marcada como Tengo" : "Agregada a la Wishlist"}
            </p>
            <p className="text-white text-sm font-semibold leading-snug mt-0.5 truncate">{t.nombre}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold inline-block mt-1 ${(RAREZA[t.rareza] ?? RAREZA["Common"]).badge}`}>
              {t.rareza}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Drawer item ────────────────────────────────────────────────────────────
function DrawerItem({ c, onQuitar }) {
  const r = RAREZA[c.rareza] ?? RAREZA["Common"];
  return (
    <div className="bg-white/5 border border-white/8 rounded-2xl p-3 flex items-start gap-3 hover:bg-white/8 transition">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-500 font-mono">{c.id}</p>
        <p className="text-sm font-bold text-white leading-tight mt-0.5 truncate">{c.nombre}</p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block mt-1 ${r.badge}`}>{c.rareza}</span>
        <div className="flex gap-4 mt-2 text-xs">
          <span><span className="text-gray-500">Preventa </span><span className="text-green-400 font-bold">{formatPrecio(c.preventa)}</span></span>
          <span><span className="text-gray-500">Omega </span><span className="text-blue-400 font-bold">{formatPrecio(c.omega)}</span></span>
        </div>
      </div>
      <button onClick={() => onQuitar(c.id)} className="text-gray-600 hover:text-red-400 transition text-xl leading-none mt-0.5 flex-shrink-0">×</button>
    </div>
  );
}

// ── Wishlist Drawer ────────────────────────────────────────────────────────
function WishlistDrawer({ wishlist, tengo, open, onClose, onQuitarWishlist, onQuitarTengo, onLimpiarWishlist, onLimpiarTengo, onExportar }) {
  const [tab, setTab] = useState("wishlist");

  const lista     = tab === "wishlist" ? wishlist : tengo;
  const onQuitar  = tab === "wishlist" ? onQuitarWishlist : onQuitarTengo;
  const onLimpiar = tab === "wishlist" ? onLimpiarWishlist : onLimpiarTengo;
  const total     = lista.reduce((a, c) => ({ p: a.p + parsePrecio(c.preventa), o: a.o + parsePrecio(c.omega) }), { p: 0, o: 0 });

  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} />
      <aside className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-[#0f0f13] border-l border-white/10 z-50 flex flex-col transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}>

        {/* Header + tabs */}
        <div className="px-5 pt-5 pb-0 border-b border-white/10 bg-black/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold">Mis Cartas</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition text-xl font-bold">×</button>
          </div>
          <div className="flex">
            <button
              onClick={() => setTab("wishlist")}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition ${tab === "wishlist" ? "text-orange-400 border-orange-400" : "text-gray-500 border-transparent hover:text-gray-300"}`}
            >
              ⭐ Wishlist <span className="opacity-50">({wishlist.length})</span>
            </button>
            <button
              onClick={() => setTab("tengo")}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition ${tab === "tengo" ? "text-green-400 border-green-400" : "text-gray-500 border-transparent hover:text-gray-300"}`}
            >
              ✅ Tengo <span className="opacity-50">({tengo.length})</span>
            </button>
          </div>
        </div>

        {/* Totales */}
        {lista.length > 0 && (
          <div className="mx-4 mt-4 rounded-2xl bg-white/5 border border-white/10 p-4 grid grid-cols-2 gap-3 flex-shrink-0">
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Total Preventa</p>
              <p className="text-green-400 font-extrabold text-base">{formatPrecio(total.p)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Total Omega</p>
              <p className="text-blue-400 font-extrabold text-base">{formatPrecio(total.o)}</p>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {lista.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 pb-10">
              <div className="text-6xl opacity-20">{tab === "wishlist" ? "🃏" : "📦"}</div>
              <p className="text-gray-400 font-semibold">{tab === "wishlist" ? "Tu wishlist está vacía" : "No marcaste cartas como Tengo"}</p>
              <p className="text-gray-600 text-sm">Agrega cartas desde el catálogo</p>
            </div>
          ) : (
            lista.map(c => <DrawerItem key={c.id} c={c} onQuitar={onQuitar} />)
          )}
        </div>

        {/* Footer */}
        {(wishlist.length > 0 || tengo.length > 0) && (
          <div className="px-4 py-4 border-t border-white/10 space-y-2 flex-shrink-0">
            <button onClick={onExportar} className="w-full bg-green-500 hover:bg-green-400 text-white py-3 rounded-xl font-bold text-sm transition shadow-lg shadow-green-500/20">
              📥 Exportar a Excel (ambas listas)
            </button>
            {lista.length > 0 && (
              <button onClick={onLimpiar} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2.5 rounded-xl font-semibold text-sm transition border border-red-500/20">
                🗑️ Limpiar {tab === "wishlist" ? "wishlist" : "lista Tengo"}
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

// ── Card (grid) ────────────────────────────────────────────────────────────
function CartaGrid({ carta, enWishlist, enTengo, onAgregar, onTengo }) {
  const r = RAREZA[carta.rareza] ?? RAREZA["Common"];
  const ocupada = enWishlist || enTengo;

  return (
    <div className={`bg-gray-800/60 border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-lg hover:shadow-2xl ${r.glow} hover:-translate-y-1 transition-all duration-300`}>
      <div className="relative bg-black/60 group">
        <img
          src={generarImagen(carta.nombre)}
          alt={carta.nombre}
          onError={e => { e.target.onerror = null; e.target.src = "https://images.ygoprodeck.com/images/cards/back.jpg"; }}
          className="w-full h-52 object-contain"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <span className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-bold shadow-md ${r.badge}`}>{carta.rareza}</span>
        {enWishlist && <span className="absolute top-2 right-2 text-base drop-shadow-lg">⭐</span>}
        {enTengo   && <span className="absolute top-2 right-2 text-base drop-shadow-lg">✅</span>}
      </div>

      <div className="p-3 flex flex-col flex-1 gap-1">
        <p className="text-[10px] text-gray-600 font-mono">{carta.id}</p>
        <h2 className="text-sm font-bold text-white leading-tight line-clamp-2 flex-1">{carta.nombre}</h2>

        <div className="bg-black/40 rounded-xl px-3 py-2 mt-1 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Preventa</span>
            <span className="text-green-400 font-bold">{formatPrecio(carta.preventa)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Omega</span>
            <span className="text-blue-400 font-bold">{formatPrecio(carta.omega)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-2">
          <a href={generarLink(carta.nombre)} target="_blank" rel="noreferrer"
            className="text-[11px] text-blue-400 hover:text-blue-300 underline underline-offset-2 transition flex-shrink-0">Wiki ↗</a>
          <button
            onClick={() => onAgregar(carta)}
            disabled={ocupada}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
              enWishlist ? "bg-orange-500/25 text-orange-300 cursor-default" :
              enTengo    ? "bg-white/5 text-gray-600 cursor-default" :
                           "bg-orange-500 hover:bg-orange-400 text-white shadow-md shadow-orange-500/20"
            }`}
          >{enWishlist ? "⭐ Quiero" : "⭐ Quiero"}</button>
          <button
            onClick={() => onTengo(carta)}
            disabled={ocupada}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
              enTengo    ? "bg-green-500/25 text-green-300 cursor-default" :
              enWishlist ? "bg-white/5 text-gray-600 cursor-default" :
                           "bg-green-700 hover:bg-green-600 text-white"
            }`}
          >{enTengo ? "✅ Tengo" : "✓ Tengo"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Card (list row) ────────────────────────────────────────────────────────
function CartaFila({ carta, enWishlist, enTengo, onAgregar, onTengo }) {
  const r      = RAREZA[carta.rareza] ?? RAREZA["Common"];
  const ocupada = enWishlist || enTengo;

  return (
    <div className="bg-gray-800/40 border border-white/5 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-gray-800/70 transition">
      <p className="text-[10px] text-gray-600 font-mono w-24 flex-shrink-0 hidden sm:block">{carta.id}</p>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{carta.nombre}</p>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 hidden md:inline ${r.badge}`}>{carta.rareza}</span>
      <p className="text-green-400 font-bold text-xs w-24 text-right flex-shrink-0 hidden lg:block">{formatPrecio(carta.preventa)}</p>
      <p className="text-blue-400 font-bold text-xs w-24 text-right flex-shrink-0 hidden xl:block">{formatPrecio(carta.omega)}</p>
      <div className="flex gap-1.5 flex-shrink-0">
        <button
          onClick={() => onAgregar(carta)} disabled={ocupada}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            enWishlist ? "bg-orange-500/25 text-orange-300 cursor-default" :
            enTengo    ? "bg-white/5 text-gray-600 cursor-default" :
                         "bg-orange-500 hover:bg-orange-400 text-white"
          }`}
        >⭐</button>
        <button
          onClick={() => onTengo(carta)} disabled={ocupada}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            enTengo    ? "bg-green-500/25 text-green-300 cursor-default" :
            enWishlist ? "bg-white/5 text-gray-600 cursor-default" :
                         "bg-green-700 hover:bg-green-600 text-white"
          }`}
        >✓</button>
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [cartas,   setCartas]   = useState([]);
  const [wishlist, setWishlist] = useState(() => loadStorage("wishlist"));
  const [tengo,    setTengo]    = useState(() => loadStorage("tengo"));
  const [busqueda, setBusqueda] = useState("");
  const [rareza,   setRareza]   = useState("Todas");
  const [orden,    setOrden]    = useState("id-asc");
  const [vista,    setVista]    = useState("grid");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toasts,   setToasts]   = useState([]);

  useEffect(() => {
    fetch("/cartas.json").then(r => r.json()).then(setCartas).catch(console.error);
  }, []);

  useEffect(() => { localStorage.setItem("wishlist", JSON.stringify(wishlist)); }, [wishlist]);
  useEffect(() => { localStorage.setItem("tengo",    JSON.stringify(tengo));    }, [tengo]);

  const cartasFiltradas = useMemo(() => {
    let res = cartas.filter(c => c?.nombre);

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      res = res.filter(c => c.nombre.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
    }

    if (rareza !== "Todas") res = res.filter(c => c.rareza === rareza);

    return [...res].sort((a, b) => {
      switch (orden) {
        case "precio-asc":  return parsePrecio(a.preventa) - parsePrecio(b.preventa);
        case "precio-desc": return parsePrecio(b.preventa) - parsePrecio(a.preventa);
        case "rareza":      return (RAREZA[a.rareza]?.tier ?? 0) - (RAREZA[b.rareza]?.tier ?? 0);
        case "nombre-az":   return a.nombre.localeCompare(b.nombre);
        default:            return a.id.localeCompare(b.id);
      }
    });
  }, [cartas, busqueda, rareza, orden]);

  const mostrarToast = (carta, tipo) => {
    const id = Date.now();
    setToasts(p => [...p, { id, nombre: carta.nombre, rareza: carta.rareza, tipo }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  };

  const ocupada = (carta) => wishlist.some(c => c.id === carta.id) || tengo.some(c => c.id === carta.id);

  const agregarWishlist = (carta) => {
    if (ocupada(carta)) return;
    setWishlist(p => [...p, carta]);
    mostrarToast(carta, "wishlist");
  };

  const agregarTengo = (carta) => {
    if (ocupada(carta)) return;
    setTengo(p => [...p, carta]);
    mostrarToast(carta, "tengo");
  };

  const exportarExcel = async () => {
    if (!wishlist.length && !tengo.length) { alert("No hay cartas en ninguna lista"); return; }
    const wb = new ExcelJS.Workbook();
    const cols = [
      { header: "ID",       key: "id",       width: 15 },
      { header: "Carta",    key: "nombre",   width: 40 },
      { header: "Rareza",   key: "rareza",   width: 18 },
      { header: "Preventa", key: "preventa", width: 15 },
      { header: "Omega",    key: "omega",    width: 15 },
    ];
    const addSheet = (nombre, lista) => {
      if (!lista.length) return;
      const ws = wb.addWorksheet(nombre);
      ws.columns = cols;
      lista.forEach(c => ws.addRow({ id: c.id, nombre: c.nombre, rareza: c.rareza, preventa: c.preventa, omega: c.omega }));
    };
    addSheet("Wishlist", wishlist);
    addSheet("Tengo",    tengo);
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "blazing_dominion.xlsx");
  };

  const totalPreventa = wishlist.reduce((a, c) => a + parsePrecio(c.preventa), 0);

  return (
    <div className="bg-[#0a0a0f] min-h-screen text-white">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/8">

        {/* Top row */}
        <div className="max-w-screen-xl mx-auto px-5 py-3 flex items-center gap-3">
          <div className="flex-shrink-0">
            <h1 className="text-lg font-black bg-gradient-to-r from-orange-400 via-red-400 to-yellow-300 bg-clip-text text-transparent tracking-tight">
              🔥 Blazing Dominion
            </h1>
            <p className="text-[10px] text-gray-600 font-mono">BLZD-EN · {cartas.length} cartas</p>
          </div>

          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">🔍</span>
            <input
              type="text"
              placeholder="Buscar por nombre o ID  (ej: BLZD-EN021)…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/60 transition"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>

          <button
            onClick={() => setDrawerOpen(true)}
            className="relative flex items-center gap-2 bg-orange-500 hover:bg-orange-400 px-4 py-2.5 rounded-xl font-bold text-sm transition shadow-lg shadow-orange-500/25 flex-shrink-0"
          >
            <span>⭐</span>
            <span className="hidden sm:inline">Wishlist</span>
            {wishlist.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-md">
                {wishlist.length}
              </span>
            )}
          </button>
        </div>

        {/* Filter bar */}
        <div className="max-w-screen-xl mx-auto px-5 pb-3 flex items-center gap-2 overflow-x-auto">
          {/* Rareza chips */}
          {["Todas", ...RAREZAS].map(r => (
            <button
              key={r}
              onClick={() => setRareza(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition flex-shrink-0 ${
                rareza === r
                  ? r === "Todas" ? "bg-white text-black" : (RAREZA[r]?.badge ?? "bg-white text-black")
                  : "bg-white/8 text-gray-400 hover:bg-white/12 hover:text-white"
              }`}
            >{r === "Todas" ? "✦ Todas" : r}</button>
          ))}

          <div className="w-px h-4 bg-white/15 flex-shrink-0 mx-1" />

          {/* Sort */}
          <select
            value={orden}
            onChange={e => setOrden(e.target.value)}
            className="bg-white/8 border border-white/10 text-black text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500/60 flex-shrink-0 cursor-pointer"
          >
            <option value="id-asc">↑ ID</option>
            <option value="rareza">Rareza</option>
            <option value="nombre-az">A – Z</option>
            <option value="precio-asc">Precio ↑</option>
            <option value="precio-desc">Precio ↓</option>
          </select>

          <div className="w-px h-4 bg-white/15 flex-shrink-0 mx-1" />

          {/* Vista toggle */}
          <div className="flex bg-white/8 rounded-lg p-0.5 flex-shrink-0">
            <button onClick={() => setVista("grid")} className={`px-2.5 py-1 rounded-md text-sm transition ${vista === "grid" ? "bg-white/20 text-white" : "text-gray-500 hover:text-gray-300"}`}>⊞</button>
            <button onClick={() => setVista("lista")} className={`px-2.5 py-1 rounded-md text-sm transition ${vista === "lista" ? "bg-white/20 text-white" : "text-gray-500 hover:text-gray-300"}`}>☰</button>
          </div>

          <span className="text-xs text-gray-600 ml-auto flex-shrink-0 hidden md:block">
            {cartasFiltradas.length} resultado{cartasFiltradas.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="max-w-screen-xl mx-auto px-5 py-6 pb-28">
        {vista === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {cartasFiltradas.map(carta => (
              <CartaGrid
                key={carta.id}
                carta={carta}
                enWishlist={wishlist.some(c => c.id === carta.id)}
                enTengo={tengo.some(c => c.id === carta.id)}
                onAgregar={agregarWishlist}
                onTengo={agregarTengo}
              />
            ))}
          </div>
        ) : (
          <div>
            <div className="hidden md:grid grid-cols-[96px_1fr_160px_100px_100px_88px] gap-3 px-4 pb-2 text-[10px] text-gray-600 uppercase tracking-widest font-bold">
              <span>ID</span><span>Nombre</span><span>Rareza</span>
              <span className="text-right">Preventa</span>
              <span className="text-right hidden xl:block">Omega</span>
              <span className="text-right">Acción</span>
            </div>
            <div className="space-y-1.5">
              {cartasFiltradas.map(carta => (
                <CartaFila
                  key={carta.id}
                  carta={carta}
                  enWishlist={wishlist.some(c => c.id === carta.id)}
                  enTengo={tengo.some(c => c.id === carta.id)}
                  onAgregar={agregarWishlist}
                  onTengo={agregarTengo}
                />
              ))}
            </div>
          </div>
        )}

        {cartasFiltradas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <div className="text-5xl opacity-20">🔍</div>
            <p className="text-gray-400 font-semibold">No se encontraron cartas</p>
            <button onClick={() => { setBusqueda(""); setRareza("Todas"); }} className="text-orange-400 text-sm underline">Limpiar filtros</button>
          </div>
        )}
      </main>

      {/* ── FLOATING TOTAL ── */}
      {wishlist.length > 0 && !drawerOpen && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-orange-500 hover:bg-orange-400 text-white px-6 py-3 rounded-2xl shadow-2xl shadow-orange-500/30 font-bold text-sm flex items-center gap-2 transition whitespace-nowrap"
        >
          <span>⭐ {wishlist.length} en wishlist</span>
          <span className="opacity-50">·</span>
          <span>{formatPrecio(totalPreventa)}</span>
        </button>
      )}

      {/* ── DRAWER ── */}
      <WishlistDrawer
        wishlist={wishlist}
        tengo={tengo}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onQuitarWishlist={id => setWishlist(p => p.filter(c => c.id !== id))}
        onQuitarTengo={id =>    setTengo(p => p.filter(c => c.id !== id))}
        onLimpiarWishlist={() => setWishlist([])}
        onLimpiarTengo={() =>    setTengo([])}
        onExportar={exportarExcel}
      />

      {/* ── TOASTS ── */}
      <Toasts items={toasts} />
    </div>
  );
}
