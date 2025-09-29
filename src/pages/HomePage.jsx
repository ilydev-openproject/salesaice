// src/pages/HomePage.jsx
import { MapPin, Package, Wallet, Plus, CalendarDays, ShoppingBag } from 'lucide-react';

export default function HomePage({ daftarToko, kunjunganList = [], produkList = [], setActivePage }) {
    // --- Hitung data HARI INI dari 'kunjunganList' ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const now = new Date();

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const kunjunganHariIni = kunjunganList.filter((kunjungan) => {
        if (!kunjungan.createdAt?.seconds) return false;
        const visitDate = new Date(kunjungan.createdAt.seconds * 1000);
        return visitDate >= todayStart && visitDate <= todayEnd;
    });

    const totalKunjungan = kunjunganHariIni.length;
    const totalPendapatan = kunjunganHariIni.reduce((sum, kunjungan) => sum + kunjungan.total, 0);
    const totalBoxTerjual = kunjunganHariIni.reduce((sum, kunjungan) => sum + kunjungan.items.reduce((qty, item) => qty + item.qtyBox, 0), 0);

    // --- Hitung data BULAN INI dari 'kunjunganList' ---
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const kunjunganBulanIni = kunjunganList.filter((kunjungan) => {
        if (!kunjungan.createdAt?.seconds) return false;
        const visitDate = new Date(kunjungan.createdAt.seconds * 1000);
        return visitDate >= monthStart && visitDate <= monthEnd;
    });
    const totalKunjunganBulanIni = kunjunganBulanIni.length;
    const totalBoxTerjualBulanIni = kunjunganBulanIni.reduce((sum, kunjungan) => sum + kunjungan.items.reduce((qty, item) => qty + item.qtyBox, 0), 0);

    // --- Hitung Produk Terlaris Bulan Ini (Top 5) ---
    const productSalesMap = new Map(); // Map: productId -> totalQtyBox

    kunjunganBulanIni.forEach((kunjungan) => {
        if (kunjungan.items) {
            kunjungan.items.forEach((item) => {
                const currentQty = productSalesMap.get(item.productId) || 0;
                productSalesMap.set(item.productId, currentQty + item.qtyBox);
            });
        }
    });

    const sortedProductSales = Array.from(productSalesMap.entries())
        .map(([productId, totalQtyBox]) => {
            const product = produkList.find((p) => p.id === productId);
            if (!product) return null; // Skip if product not found (e.g., deleted)
            return { ...product, totalQtyBox };
        })
        .filter(Boolean) // Remove null entries
        .sort((a, b) => b.totalQtyBox - a.totalQtyBox) // Sort descending by totalQtyBox
        .slice(0, 5); // Take top 5

    const salesPerson = { name: 'Sales App', initial: 'S' }; // Placeholder

    return (
        <div className="p-4 max-w-md mx-auto">
            {/* Header */}
            <header className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-xl font-bold text-purple-800">{salesPerson.name}</h1>
                    <p className="text-sm text-slate-500">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="w-12 h-12 flex items-center justify-center">
                    <img src="/logo.png" alt="Logo" className="h-full w-auto object-contain" />
                </div>
            </header>

            {/* Card Ringkasan Bulan Ini */}
            <div className="bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white p-4 rounded-xl shadow-lg mb-4">
                <h2 className="text-base font-semibold text-purple-100 mb-3">Performa Bulan Ini</h2>
                <div className="flex justify-around items-center">
                    <div className="text-center">
                        <p className="text-3xl font-bold">{totalKunjunganBulanIni}</p>
                        <p className="text-xs text-purple-200 mt-1">Total Kunjungan</p>
                    </div>
                    <div className="h-12 w-px bg-purple-400/50"></div> {/* Divider */}
                    <div className="text-center">
                        <p className="text-3xl font-bold">{totalBoxTerjualBulanIni}</p>
                        <p className="text-xs text-purple-200 mt-1">Total Box</p>
                    </div>
                </div>
            </div>

            {/* Ringkasan Hari Ini */}
            <div className="mb-4">
                <h2 className="text-base font-semibold text-slate-700 mb-2">Ringkasan Hari Ini</h2>
                <div className="grid grid-cols-3 gap-3">
                    {/* Total Kunjungan */}
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 text-center">
                        <MapPin className="mx-auto text-purple-500 mb-1" size={20} />
                        <p className="text-xl font-bold text-slate-800">{totalKunjungan}</p>
                        <p className="text-xs text-slate-500">Kunjungan</p>
                    </div>
                    {/* Total Box */}
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 text-center">
                        <Package className="mx-auto text-blue-500 mb-1" size={20} />
                        <p className="text-xl font-bold text-slate-800">{totalBoxTerjual}</p>
                        <p className="text-xs text-slate-500">Box Terjual</p>
                    </div>
                    {/* Total Pendapatan */}
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 text-center">
                        <Wallet className="mx-auto text-green-500 mb-1" size={20} />
                        <p className="text-xl font-bold text-slate-800">{(totalPendapatan / 1000).toFixed(1)}k</p>
                        <p className="text-xs text-slate-500">Pendapatan</p>
                    </div>
                </div>
            </div>
            {/* Tombol Aksi Utama */}
            <button onClick={() => setActivePage('visit')} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-base hover:bg-purple-700 transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg mb-4">
                <Plus size={20} />
                Tambah Kunjungan Baru
            </button>

            {/* Produk Terlaris */}
            <div className="mb-4">
                <h2 className="text-base font-semibold text-slate-700 mb-2">Produk Terlaris Bulan Ini (Top 5)</h2>
                {sortedProductSales.length === 0 ? (
                    <div className="bg-white rounded-lg p-4 text-center text-slate-500 shadow-sm">Belum ada penjualan produk.</div>
                ) : (
                    <div className="space-y-2">
                        {sortedProductSales.map((produk) => (
                            <div key={produk.id} className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm border border-gray-100">
                                <div className="flex-shrink-0">
                                    <img
                                        src={produk.foto || 'https://via.placeholder.com/64?text=Produk'}
                                        alt={produk.nama}
                                        className="w-10 h-10 object-cover rounded-md border border-gray-200"
                                        onError={(e) => {
                                            e.target.src = 'https://via.placeholder.com/64?text=Produk';
                                        }}
                                    />
                                </div>
                                <div className="flex-grow">
                                    <p className="font-semibold text-slate-800 text-sm">{produk.nama}</p>
                                    <p className="text-xs text-slate-500">Rp{(produk.hargaJualPerPcs || 0).toLocaleString('id-ID')} / pcs</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-purple-600">{produk.totalQtyBox} box</p>
                                    <p className="text-xs text-slate-500">terjual</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Kunjungan Terbaru */}
            <div>
                <h2 className="text-base font-semibold text-slate-700 mb-2">Kunjungan Terbaru</h2>
                {kunjunganList.length === 0 ? (
                    <div className="bg-white rounded-lg p-4 text-center text-slate-500 shadow-sm">Belum ada kunjungan.</div>
                ) : (
                    <div className="space-y-2">
                        {kunjunganList.slice(0, 5).map((kunjungan) => (
                            <div key={kunjungan.id} className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm border border-gray-100">
                                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">{kunjungan.tokoNama.charAt(0).toUpperCase()}</div>
                                <div className="flex-grow">
                                    <p className="font-semibold text-slate-800 text-sm">{kunjungan.tokoNama}</p>
                                    <p className="text-xs text-slate-500">{new Date(kunjungan.createdAt.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${kunjungan.total > 0 ? 'text-green-600' : 'text-slate-500'}`}>Rp{kunjungan.total.toLocaleString('id-ID')}</p>
                                    <p className="text-xs text-slate-500">{kunjungan.items.reduce((sum, item) => sum + item.qtyBox, 0)} box</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
