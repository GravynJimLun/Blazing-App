import { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// 🔗 Link a Yugipedia
function generarLink(nombre) {
  return "https://yugipedia.com/wiki/" +
    nombre.replace(/"/g, "").replace(/\//g, "_").replace(/ /g, "_");
}

// 🖼️ Imagen (Yugipedia con fallback)
function generarImagen(nombre) {
  const limpio = nombre.replace(/[^a-zA-Z0-9]/g, "");
  return `https://yugipedia.com/wiki/Special:FilePath/${limpio}-BLZD-JP-C.png`;
}

export default function App() {

  const [cartas, setCartas] = useState([]);

  // ⭐ Wishlist con carga segura
  const [wishlist, setWishlist] = useState(() => {
    try {
      const guardado = localStorage.getItem("wishlist");
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });

  const [busqueda, setBusqueda] = useState("");

  // 📦 Cargar cartas desde JSON (Vercel compatible)
useEffect(() => {
  fetch("/cartas.json")
    .then(res => {
      console.log("STATUS:", res.status);
      return res.json();
    })
    .then(data => {
      console.log("DATA:", data);
      setCartas(data);
    })
    .catch(err => console.error("ERROR:", err));
}, []);

  // 💾 Guardar wishlist
  useEffect(() => {
    localStorage.setItem("wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  // 🔍 Filtro
const cartasFiltradas = cartas
  .filter(c => c && c.nombre)
  .filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // ⭐ Agregar
  const agregarWishlist = (carta) => {
    if (wishlist.some(c => c.id === carta.id)) return;
    setWishlist([...wishlist, carta]);
  };

  // ❌ Quitar
  const quitarWishlist = (id) => {
    setWishlist(wishlist.filter(c => c.id !== id));
  };

  // 📥 Exportar Excel
  const exportarExcel = async () => {
    if (wishlist.length === 0) {
      alert("No hay cartas");
      return;
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Wishlist");

    ws.columns = [
      { header: "Carta", key: "nombre", width: 40 }
    ];

    wishlist.forEach(c => ws.addRow({ nombre: c.nombre }));

    const buffer = await wb.xlsx.writeBuffer();

    saveAs(
      new Blob([buffer]),
      "wishlist_blazing_dominion.xlsx"
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-800 min-h-screen text-white p-6">

      <h1 className="text-5xl font-extrabold text-center mb-6">
        🔥 Blazing Dominion
      </h1>

      {/* 🔍 Buscador */}
      <input
        type="text"
        placeholder="Buscar carta..."
        className="w-full p-3 rounded-xl mb-6 text-black shadow-lg"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {/* 📥 Exportar */}
      <div className="text-center mb-6">
        <button
          onClick={exportarExcel}
          className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded-lg"
        >
          📥 Exportar Wishlist
        </button>
      </div>

      {/* 🧱 GRID CARTAS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">

        {cartasFiltradas.map(carta => (
          <div
            key={carta.id}
            className="bg-gray-800 rounded-xl p-4 shadow-lg hover:shadow-2xl hover:scale-105 transition duration-300"
          >

            <img
              src={generarImagen(carta.nombre)}
              alt={carta.nombre}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://images.ygoprodeck.com/images/cards/back.jpg";
              }}
              className="w-full h-64 object-contain bg-black rounded-lg mb-3"
            />

            <h2 className="font-bold text-sm line-clamp-2">
              {carta.nombre}
            </h2>

            <a
              href={generarLink(carta.nombre)}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline block mt-2 text-sm"
            >
              Ver detalle
            </a>

            <button
              onClick={() => agregarWishlist(carta)}
              className="bg-orange-500 hover:bg-orange-600 mt-3 px-4 py-2 rounded-lg w-full text-sm"
            >
              ⭐ Quiero
            </button>
          </div>
        ))}

      </div>

      {/* ⭐ WISHLIST */}
      <div className="mt-12">
        <h2 className="text-3xl font-bold mb-4">⭐ Mi Wishlist</h2>

        {wishlist.length === 0 ? (
          <p className="text-gray-400">No has agregado cartas</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {wishlist.map(c => (
                <div
                  key={c.id}
                  className="bg-gray-800 rounded-lg p-3 shadow-md"
                >
                  <p className="text-sm font-semibold">{c.nombre}</p>

                  <button
                    onClick={() => quitarWishlist(c.id)}
                    className="mt-2 text-red-400 text-xs"
                  >
                    ❌ Quitar
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setWishlist([])}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg mt-4"
            >
              🗑️ Limpiar Wishlist
            </button>
          </>
        )}
      </div>

    </div>
  );
}