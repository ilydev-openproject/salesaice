// src/pages/ProdukTerlarisPage.jsx
import { useState } from 'react';
import { ArrowLeft, TrendingUp } from 'lucide-react';

export default function ProdukTerlarisPage({ produkList, kunjunganList, orderList, setActivePage }) {
    const [showAll, setShowAll] = useState(false);

    // --- Hitung Produk Terlaris (Semua Waktu) ---
    const productSalesMap = new Map(); // Map: productId -> totalQtyBox

    // Gabungkan kunjungan dan order
    const allTransactions = [...kunjunganList, ...orderList];

    allTransactions.forEach((transaction) => {
        if (transaction.items) {
            transaction.items.forEach((item) => {
                const currentQty = productSalesMap.get(item.productId) || 0;
                productSalesMap.set(item.productId, currentQty + (item.qtyBox || 0));
            });
        }
    });

    const sortedProductSales = Array.from(productSalesMap.entries())
        .map(([productId, totalQtyBox]) => {
            const product = produkList.find((p) => p.id === productId);
            if (!product) return null; // Lewati jika produk tidak ditemukan (misal: sudah dihapus)
            return { ...product, totalQtyBox };
        })
        .filter(Boolean) // Hapus entri null
        .sort((a, b) => b.totalQtyBox - a.totalQtyBox); // Urutkan dari terlaris

    const displayedProducts = showAll ? sortedProductSales : sortedProductSales.slice(0, 20);

    return (
        <div className="p-5 pb-20 max-w-md mx-auto">
            <div className="flex items-center mb-6 relative">
                <button onClick={() => setActivePage('home')} className="p-2 rounded-full hover:bg-slate-100 absolute left-0">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-xl font-bold text-slate-800 flex-grow text-center flex items-center justify-center gap-2">
                    <TrendingUp className="text-purple-600" />
                    Produk Terlaris
                </h2>
            </div>

            {sortedProductSales.length === 0 ? (
                <div className="bg-white rounded-lg p-4 text-center text-slate-500 shadow-sm">Belum ada penjualan produk.</div>
            ) : (
                <div className="space-y-2">
                    {displayedProducts.map((produk, index) => (
                        <div key={produk.id} className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm border border-gray-100">
                            <div className="flex-shrink-0 font-bold text-slate-400 w-6 text-center">{index + 1}.</div>
                            <div className="flex-shrink-0">
                                <img src={produk.foto || 'https://via.placeholder.com/64?text=Produk'} alt={produk.nama} className="w-10 h-10 object-cover rounded-md border border-gray-200" onError={(e) => (e.target.src = 'https://via.placeholder.com/64?text=Produk')} />
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

            {!showAll && sortedProductSales.length > 20 && (
                <div className="mt-6 text-center">
                    <button onClick={() => setShowAll(true)} className="bg-purple-100 text-purple-700 font-semibold px-6 py-2 rounded-full hover:bg-purple-200 transition">
                        Tampilkan Semua
                    </button>
                </div>
            )}
        </div>
    );
}
