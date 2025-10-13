import { MapPin, Package, Wallet, Plus, TrendingUp, Target, Award, BarChart2, Gift, X, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';

export default function HomePage({ daftarToko, kunjunganList = [], produkList = [], orderList = [], setActivePage, targets }) {
    // --- Hitung data HARI INI dari 'kunjunganList' & 'orderList' ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const now = new Date();

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const filterToday = (item) => {
        if (!item.createdAt?.seconds) return false;
        const itemDate = new Date(item.createdAt.seconds * 1000);
        return itemDate >= todayStart && itemDate <= todayEnd;
    };

    const kunjunganHariIni = kunjunganList.filter(filterToday);
    const orderHariIni = orderList.filter(filterToday);

    const totalKunjungan = kunjunganHariIni.length;
    const totalPendapatan = [...kunjunganHariIni, ...orderHariIni].reduce((sum, item) => sum + item.total, 0);
    const totalBoxTerjual = [...kunjunganHariIni, ...orderHariIni].reduce((sum, item) => sum + (item.items?.reduce((qty, subItem) => qty + subItem.qtyBox, 0) || 0), 0);

    // --- Hitung data BULAN INI dari 'kunjunganList' & 'orderList' ---
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const filterThisMonth = (item) => {
        if (!item.createdAt?.seconds) return false;
        const itemDate = new Date(item.createdAt.seconds * 1000);
        return itemDate >= monthStart && itemDate <= monthEnd;
    };

    const kunjunganBulanIni = kunjunganList.filter((kunjungan) => {
        if (!kunjungan.createdAt?.seconds) return false;
        const visitDate = new Date(kunjungan.createdAt.seconds * 1000);
        return visitDate >= monthStart && visitDate <= monthEnd;
    });
    const orderBulanIni = orderList.filter((order) => {
        if (!order.createdAt?.seconds) return false;
        const orderDate = new Date(order.createdAt.seconds * 1000);
        return orderDate >= monthStart && orderDate <= monthEnd;
    });

    const totalKunjunganBulanIni = kunjunganBulanIni.length;
    const totalBoxTerjualBulanIni = [...kunjunganBulanIni, ...orderBulanIni].reduce((sum, item) => sum + (item.items?.reduce((qty, subItem) => qty + subItem.qtyBox, 0) || 0), 0);
    const totalPendapatanBulanIni = [...kunjunganBulanIni, ...orderBulanIni].reduce((sum, item) => sum + item.total, 0);

    // --- Target Penjualan (Contoh) ---
    const TARGET_BOX_BULANAN = targets.TARGET_BOX_BULANAN || 1000; // Gunakan target dari props, fallback ke 1000
    const progressPersen = Math.min((totalBoxTerjualBulanIni / TARGET_BOX_BULANAN) * 100, 100);
    const sisaTarget = Math.max(0, TARGET_BOX_BULANAN - totalBoxTerjualBulanIni);

    // --- Hitung sisa hari kerja & target harian ---
    const getSisaHariKerja = () => {
        const today = new Date();
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        let sisaHari = 0;
        for (let d = today.getDate(); d <= lastDayOfMonth; d++) {
            const currentDate = new Date(today.getFullYear(), today.getMonth(), d);
            if (currentDate.getDay() !== 0) {
                // 0 = Minggu, asumsikan libur
                sisaHari++;
            }
        }
        return sisaHari;
    };
    const sisaHariKerja = getSisaHariKerja();
    const targetHarian = sisaHariKerja > 0 ? Math.ceil(sisaTarget / sisaHariKerja) : 0;

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

    orderBulanIni.forEach((order) => {
        if (order.items) {
            order.items.forEach((item) => {
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

    // --- Logika Notifikasi Mystery Box ---
    const [showRewardNotification, setShowRewardNotification] = useState(true);

    const eligibleForLastMonthReward = useMemo(() => {
        const today = new Date();
        // Notifikasi hanya tampil sampai tanggal 15 bulan ini
        if (today.getDate() > 15) {
            return [];
        }

        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthYear = lastMonth.getFullYear();
        const lastMonthMonth = lastMonth.getMonth();
        const lastMonthKey = `${lastMonthYear}-${String(lastMonthMonth + 1).padStart(2, '0')}`;

        const eligibleToko = daftarToko
            .map((toko) => {
                const ordersLastMonth = orderList.filter((order) => {
                    if (!order.createdAt?.seconds) return false;
                    const orderDate = new Date(order.createdAt.seconds * 1000);
                    return order.tokoId === toko.id && orderDate.getFullYear() === lastMonthYear && orderDate.getMonth() === lastMonthMonth;
                });

                const totalBoxesLastMonth = ordersLastMonth.reduce((sum, order) => sum + (order.items?.reduce((itemSum, item) => itemSum + item.qtyBox, 0) || 0), 0);

                const eligibleRewards = Math.floor(totalBoxesLastMonth / 25);
                const claimedRewards = toko.monthlyRewardsClaimed?.[lastMonthKey] || 0;

                if (eligibleRewards > claimedRewards) {
                    return {
                        ...toko,
                        pendingRewards: eligibleRewards - claimedRewards,
                    };
                }
                return null;
            })
            .filter(Boolean);

        return eligibleToko;
    }, [daftarToko, orderList]);

    const salesPerson = { name: 'Sales App', initial: 'S' }; // Placeholder

    return (
        <div className="p-4 max-w-md mx-auto">
            {/* Notifikasi Mystery Box */}
            {showRewardNotification && eligibleForLastMonthReward.length > 0 && (
                <div className="bg-purple-100 border-l-4 border-purple-500 text-purple-700 p-4 rounded-r-lg mb-4 shadow-md animate-in fade-in duration-300" role="alert">
                    <div className="flex justify-between items-start">
                        <div className="flex">
                            <Gift className="mr-3 flex-shrink-0" />
                            <div>
                                <p className="font-bold">Ada Hadiah Mystery Box!</p>
                                <p className="text-sm">{eligibleForLastMonthReward.length} toko berhak mendapatkan hadiah untuk performa bulan lalu. Segera berikan di halaman Hadiah.</p>
                            </div>
                        </div>
                        <button onClick={() => setShowRewardNotification(false)} className="ml-2 -mt-1 -mr-1 p-1 rounded-full hover:bg-purple-200">
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

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

            {/* Kartu Target Kinerja */}
            <div className="mb-4">
                <h2 className="text-base font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Target size={18} className="text-purple-600" />
                    Target Bulan Ini
                </h2>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-slate-600">Target Box Terjual</span>
                        <span className="text-sm font-bold text-purple-700">{TARGET_BOX_BULANAN.toLocaleString('id-ID')} box</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2">
                        <div className="bg-gradient-to-r from-green-400 to-blue-500 h-2.5 rounded-full" style={{ width: `${progressPersen}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>
                            Tercapai: <span className="font-bold">{totalBoxTerjualBulanIni.toLocaleString('id-ID')}</span>
                        </span>
                        <span>
                            Sisa: <span className="font-bold">{sisaTarget.toLocaleString('id-ID')}</span>
                        </span>
                    </div>
                    {sisaTarget === 0 && (
                        <div className="mt-3 text-center bg-green-50 text-green-800 p-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                            <Award size={16} />
                            Selamat! Target bulan ini tercapai!
                        </div>
                    )}
                    {sisaTarget > 0 && targetHarian > 0 && (
                        <p className="text-center text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                            Perlu <strong className="text-purple-700">{targetHarian} box/hari</strong> untuk mencapai target ({sisaHariKerja} hari kerja tersisa).
                        </p>
                    )}
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

            {/* Menu Laporan */}
            <div className="mb-4">
                <h2 className="text-base font-semibold text-slate-700 mb-2">Menu Laporan</h2>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 grid grid-cols-5 gap-1 justify-items-center">
                    <button onClick={() => setActivePage('produk-terlaris')} className="flex flex-col items-center justify-center gap-1 p-2 rounded-md hover:bg-slate-50 transition-colors w-24">
                        <div className="w-10 h-10 flex items-center justify-center bg-purple-100 text-purple-600 rounded-lg">
                            <TrendingUp size={20} />
                        </div>
                        <span className="font-semibold text-[10px] text-slate-700 text-center">
                            Produk
                            <br />
                            Terlaris
                        </span>
                    </button>
                    <button onClick={() => setActivePage('target')} className="flex flex-col items-center justify-center gap-1 p-2 rounded-md hover:bg-slate-50 transition-colors w-24">
                        <div className="w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg">
                            <Target size={20} />
                        </div>
                        <span className="font-semibold text-[10px] text-slate-700 text-center">
                            Atur
                            <br />
                            Target
                        </span>
                    </button>
                    <button onClick={() => setActivePage('analisis-toko')} className="flex flex-col items-center justify-center gap-1 p-2 rounded-md hover:bg-slate-50 transition-colors w-24">
                        <div className="w-10 h-10 flex items-center justify-center bg-green-100 text-green-600 rounded-lg">
                            <BarChart2 size={20} />
                        </div>
                        <span className="font-semibold text-[10px] text-slate-700 text-center">
                            Analisis
                            <br />
                            Toko
                        </span>
                    </button>
                    <button onClick={() => setActivePage('mystery-box')} className="flex flex-col items-center justify-center gap-1 p-2 rounded-md hover:bg-slate-50 transition-colors w-24">
                        <div className="w-10 h-10 flex items-center justify-center bg-yellow-100 text-yellow-600 rounded-lg">
                            <Gift size={20} />
                        </div>
                        <span className="font-semibold text-[10px] text-slate-700 text-center">
                            Hadiah
                            <br />
                            (Box)
                        </span>
                    </button>
                    <button onClick={() => setActivePage('product-velocity')} className="flex flex-col items-center justify-center gap-1 p-2 rounded-md hover:bg-slate-50 transition-colors w-24">
                        <div className="w-10 h-10 flex items-center justify-center bg-cyan-100 text-cyan-600 rounded-lg">
                            <Zap size={20} />
                        </div>
                        <span className="font-semibold text-[10px] text-slate-700 text-center">
                            Kecepatan
                            <br />
                            Produk
                        </span>
                    </button>
                </div>
            </div>

            {/* Tombol Aksi Utama */}
            <button onClick={() => setActivePage('visit')} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-base hover:bg-purple-700 transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg mb-4">
                <Plus size={20} />
                Tambah Kunjungan Baru
            </button>

            {/* Kunjungan Terbaru */}
            <div>
                <h2 className="text-base font-semibold text-slate-700 mb-2">Kunjungan Terbaru</h2>
                {kunjunganList.length === 0 ? (
                    <div className="bg-white rounded-lg p-4 text-center text-slate-500 shadow-sm">Belum ada kunjungan.</div>
                ) : (
                    <div className="space-y-2">
                        {kunjunganList.slice(0, 5).map((kunjungan) => {
                            // Cari SEMUA order yang cocok berdasarkan tokoId dan tanggal yang sama
                            const visitDate = new Date(kunjungan.createdAt.seconds * 1000);
                            const relatedOrders = orderList.filter((order) => {
                                if (!order.createdAt?.seconds) return false;
                                const orderDate = new Date(order.createdAt.seconds * 1000);
                                return order.tokoId === kunjungan.tokoId && visitDate.toDateString() === orderDate.toDateString();
                            });

                            const displayTotal = relatedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
                            const totalBoxes = relatedOrders.reduce((sum, order) => sum + (order.items?.reduce((itemSum, item) => itemSum + item.qtyBox, 0) || 0), 0);

                            return (
                                <div key={kunjungan.id} className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm border border-gray-100">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">{kunjungan.tokoNama.charAt(0).toUpperCase()}</div>
                                    <div className="flex-grow">
                                        <p className="font-semibold text-slate-800 text-sm">{kunjungan.tokoNama}</p>
                                        <p className="text-xs text-slate-500">{new Date(kunjungan.createdAt.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold text-sm ${displayTotal > 0 ? 'text-green-600' : 'text-slate-500'}`}>Rp{displayTotal.toLocaleString('id-ID')}</p>
                                        <p className="text-xs text-slate-500">{totalBoxes} box</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
