// src/pages/HomePage.jsx
import { MapPin, Package, Wallet, Plus } from 'lucide-react';

export default function HomePage({ daftarToko, kunjunganList = [], setActivePage }) {
    // --- Hitung data hari ini dari 'kunjunganList' ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

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

    const salesPerson = { name: 'Sales App', initial: 'S' }; // Placeholder

    return (
        <div className="p-4 max-w-md mx-auto">
            {/* Header */}
            <header className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-xl font-bold text-purple-800">{salesPerson.name}</h1>
                    <p className="text-sm text-slate-500">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-lg shadow-md">{salesPerson.initial}</div>
            </header>

            {/* Tombol Aksi Utama */}
            <button onClick={() => setActivePage('visit')} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-base hover:bg-purple-700 transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg mb-4">
                <Plus size={20} />
                Tambah Kunjungan Baru
            </button>

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
