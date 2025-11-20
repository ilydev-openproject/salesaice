import { MapPin, Package, Wallet, Plus, TrendingUp, Target, Award, BarChart2, Gift, X, Zap, ChevronsRight, Info, Users, ClipboardCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

import { findProduct } from '../lib/utils'; // Impor helper findProduct
import { getSalesPeriod } from '../lib/dateUtils'; // Impor fungsi getSalesPeriod
import { isWithinInterval, addDays, isSameDay, startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export default function HomePage({ daftarToko, kunjunganList = [], orderList = [], produkList = [], setActivePage, targets }) {
    // --- Hitung data HARI INI dari 'kunjunganList' & 'orderList' ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const kunjunganHariIni = kunjunganList.filter((kunjungan) => {
        if (!kunjungan.createdAt) return false;
        const visitDate = new Date(kunjungan.createdAt);
        // Kunjungan hari ini dihitung berdasarkan tanggal kalender HARI INI
        return isSameDay(visitDate, new Date());
    });

    const orderHariIni = orderList.filter((order) => {
        if (!order.createdAt) return false;
        const orderDate = new Date(order.createdAt);
        // Order hari ini dihitung berdasarkan tanggal kalender BESOK (karena H+1)
        return isSameDay(orderDate, addDays(new Date(), 1));
    });

    // --- LOGIKA FINAL UNTUK KUNJUNGAN HARI INI ---
    // "Kunjungan" dihitung dari setiap entri di `kunjunganList` yang dibuat hari ini.
    // Ini mencerminkan berapa kali tombol "Simpan Kunjungan" ditekan.
    const totalKunjungan = kunjunganHariIni.length;

    // --- PERBAIKAN LOGIKA PENDAPATAN HARI INI ---
    // "Box Terjual" dan "Pendapatan" hari ini hanya dihitung dari `orderHariIni`
    // karena `kunjunganHariIni` tidak berisi data item/total.
    const totalPendapatan = orderHariIni.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const totalBoxTerjual = orderHariIni.reduce((sum, item) => sum + (item.items?.reduce((qty, subItem) => qty + subItem.qtyBox, 0) || 0), 0);

    // --- Hitung data BULAN INI dari 'kunjunganList' & 'orderList' ---
    // Jika hari ini adalah hari terakhir bulan, geser acuan tanggal ke bulan berikutnya untuk insight bulanan.
    const todayCalendarDate = new Date();
    const isLastDayOfCalendarMonth = isSameDay(todayCalendarDate, endOfMonth(todayCalendarDate));
    const nowForMonthlyInsights = isLastDayOfCalendarMonth ? addDays(todayCalendarDate, 1) : todayCalendarDate;
    const { startDate: monthStart, endDate: monthEnd } = getSalesPeriod(nowForMonthlyInsights);

    const kunjunganBulanIni = kunjunganList.filter((kunjungan) => {
        if (!kunjungan.createdAt) return false;
        const visitDate = new Date(kunjungan.createdAt);
        // Kunjungan (Hari H) dihitung berdasarkan periode penjualan yang sudah disesuaikan.
        // `getSalesPeriod` sudah menangani logika H+1, jadi kita hanya perlu membandingkan.
        // Contoh: Untuk Oktober, periode adalah 30 Sep - 30 Okt. Kunjungan pada 31 Okt tidak masuk.
        // Ini BENAR, karena kunjungan 31 Okt omzetnya masuk November.
        return visitDate >= monthStart && visitDate <= monthEnd;
    });

    const orderBulanIni = orderList.filter((order) => {
        if (!order.createdAt) return false;
        const orderDate = new Date(order.createdAt);
        // Order (Hari H+1) dihitung berdasarkan periode penjualan yang sudah disesuaikan.
        // Jika hari ini 31 Okt, `nowForMonthlyInsights` menjadi 1 Nov, `monthStart` menjadi 31 Okt.
        // Order yang dibuat pada 30 Okt (dicatat 31 Okt) akan masuk.
        // Order yang dibuat pada 31 Okt (dicatat 1 Nov) juga akan masuk karena `isLastDayOfCalendarMonth`
        if (isLastDayOfCalendarMonth) {
            const nextMonthFirstDay = addDays(monthEnd, 1);
            return (orderDate >= monthStart && orderDate <= monthEnd) || isSameDay(orderDate, nextMonthFirstDay);
        } // Untuk hari biasa, periode adalah dari startDate hingga endDate.
        return orderDate >= monthStart && orderDate <= monthEnd;
    });

    // Kalkulasi bulanan berdasarkan gabungan `kunjunganBulanIni` dan `orderBulanIni` karena keduanya sekarang mengikuti logika H+1.
    const totalKunjunganBulanIni = kunjunganBulanIni.length;

    // Data penjualan (box & pendapatan) bulanan dihitung dari `orderBulanIni`
    // karena `kunjunganBulanIni` tidak berisi data item/total.
    const totalBoxTerjualBulanIni = orderBulanIni.reduce((sum, item) => sum + (item.items?.reduce((qty, subItem) => qty + subItem.qtyBox, 0) || 0), 0);
    const totalPendapatanBulanIni = orderBulanIni.reduce((sum, item) => sum + Number(item.total || 0), 0);

    // --- Target Penjualan (Contoh) ---
    const TARGET_BOX_BULANAN = targets.TARGET_BOX_BULANAN || 1000; // Gunakan target dari props, fallback ke 1000
    const progressPersen = Math.min((totalBoxTerjualBulanIni / TARGET_BOX_BULANAN) * 100, 100);
    const sisaTarget = Math.max(0, TARGET_BOX_BULANAN - totalBoxTerjualBulanIni);

    // --- Hitung sisa hari kerja & target harian ---
    const getSisaHariKerja = () => {
        const currentDate = new Date();
        // Batas akhir hari kerja efektif adalah `endDate` dari `getSalesPeriod`.
        const lastWorkingDayOfSalesPeriod = monthEnd;

        if (currentDate > lastWorkingDayOfSalesPeriod) return 0;

        let sisaHari = 0;
        const tomorrow = addDays(currentDate, 1);
        // Loop dari BESOK hingga hari kerja efektif terakhir dalam periode penjualan.
        for (let d = new Date(tomorrow.getTime()); d <= lastWorkingDayOfSalesPeriod; d.setDate(d.getDate() + 1)) {
            if (d.getDay() !== 0) {
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

    // Produk terlaris juga dihitung HANYA dari `orderBulanIni`.
    orderBulanIni.forEach((order) => {
        order.items.forEach((item) => {
            const product = findProduct(produkList, item.productId);
            if (!product) return; // Skip if product not found
            const currentQty = productSalesMap.get(product.id) || 0;
            productSalesMap.set(product.id, currentQty + (item.qtyBox || 0));
        });
    });

    // --- Logika Notifikasi Mystery Box ---
    const [showRewardNotification, setShowRewardNotification] = useState(true);

    const eligibleForLastMonthReward = useMemo(() => {
        // Notifikasi hanya tampil sampai tanggal 15 bulan ini
        if (todayCalendarDate.getDate() > 15) {
            return [];
        }

        // Dapatkan periode penjualan bulan lalu menggunakan logika baru
        // Acuannya adalah `nowForMonthlyInsights` agar konsisten di hari terakhir bulan.
        const lastMonthDateRef = subMonths(nowForMonthlyInsights, 1);
        // Periode omzet bulan lalu adalah dari tanggal 1 hingga akhir bulan kalender.
        const lastMonthStart = startOfMonth(lastMonthDateRef);
        const lastMonthEnd = endOfMonth(lastMonthDateRef);
        const lastMonthKey = `${lastMonthStart.getFullYear()}-${String(lastMonthStart.getMonth() + 1).padStart(2, '0')}`;

        const eligibleToko = daftarToko
            .map((toko) => {
                const ordersLastMonth = orderList.filter((order) => {
                    if (!order.createdAt) return false;
                    // Filter order (Hari H+1) berdasarkan rentang bulan lalu.
                    const orderDate = new Date(order.createdAt);
                    return order.tokoId === toko.id && isWithinInterval(orderDate, { start: lastMonthStart, end: lastMonthEnd });
                });

                const totalBoxesLastMonth = ordersLastMonth.reduce((sum, order) => sum + (order.items?.reduce((itemSum, item) => itemSum + item.qtyBox, 0) || 0), 0);

                const eligibleRewards = Math.floor(totalBoxesLastMonth / (targets.MYSTERY_BOX_THRESHOLD || 25));
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
    }, [daftarToko, orderList, nowForMonthlyInsights, todayCalendarDate]); // Tambahkan nowForMonthlyInsights sebagai dependensi

    // --- Insight Bulan Lalu ---
    const lastMonthInsights = useMemo(() => {
        // Acuannya adalah `nowForMonthlyInsights` agar konsisten di hari terakhir bulan.
        const lastMonthDateRef = subMonths(nowForMonthlyInsights, 1);
        // Periode omzet bulan lalu adalah dari tanggal 1 hingga akhir bulan kalender.
        const lastMonthStart = startOfMonth(lastMonthDateRef);
        const lastMonthEnd = endOfMonth(lastMonthDateRef);

        const ordersLastMonth = orderList.filter((order) => {
            if (!order.createdAt) return false;
            // Filter order (Hari H+1) berdasarkan rentang bulan lalu.
            const orderDate = new Date(order.createdAt);
            return isWithinInterval(orderDate, { start: lastMonthStart, end: lastMonthEnd });
        });

        const visitsLastMonth = kunjunganList.filter((visit) => {
            if (!visit.createdAt) return false;
            // Filter kunjungan (Hari H) berdasarkan rentang bulan lalu.
            const visitDate = new Date(visit.createdAt);
            return isWithinInterval(visitDate, { start: lastMonthStart, end: lastMonthEnd });
        });

        const totalBox = ordersLastMonth.reduce((sum, order) => sum + (order.items?.reduce((itemSum, item) => itemSum + item.qtyBox, 0) || 0), 0);
        const totalRevenue = ordersLastMonth.reduce((sum, order) => sum + Number(order.total || 0), 0);
        const totalVisits = visitsLastMonth.length;

        return { totalBox, totalRevenue, totalVisits, monthName: format(lastMonthStart, 'MMMM') };
    }, [orderList, kunjunganList, nowForMonthlyInsights]); // Tambahkan nowForMonthlyInsights sebagai dependensi

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

            {/* Insight Bulan Lalu */}
            <div className="mb-4">
                <h2 className="text-base font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Info size={18} className="text-blue-600" />
                    Insight Bulan {lastMonthInsights.monthName}
                </h2>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                    {/* Ringkasan Performa */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-purple-50 p-2 rounded-lg border border-purple-100">
                            <p className="text-xl font-bold text-purple-700">{lastMonthInsights.totalVisits.toLocaleString('id-ID')}</p>
                            <p className="text-xs text-purple-600 flex items-center justify-center gap-1">
                                <Users size={12} /> Kunjungan
                            </p>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                            <p className="text-xl font-bold text-blue-700">{lastMonthInsights.totalBox.toLocaleString('id-ID')}</p>
                            <p className="text-xs text-blue-600 flex items-center justify-center gap-1">
                                <Package size={12} /> Box Terjual
                            </p>
                        </div>
                        <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                            <p className="text-xl font-bold text-green-700">{(lastMonthInsights.totalRevenue / 1000000).toFixed(1)} jt</p>
                            <p className="text-xs text-green-600 flex items-center justify-center gap-1">
                                <Wallet size={12} /> Pendapatan
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card Ringkasan Bulan Ini */}
            <div className="bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white p-4 rounded-xl shadow-lg mb-4">
                <h2 className="text-base font-semibold text-purple-100 mb-3">Performa Bulan Ini</h2>
                <div className="grid grid-cols-3 gap-2 items-center text-center">
                    <div className="text-center">
                        <p className="text-2xl font-bold">{totalKunjunganBulanIni}</p>
                        <p className="text-xs text-purple-200 mt-1">Total Kunjungan</p>
                    </div>
                    <div className="h-12 w-px bg-purple-400/50"></div> {/* Divider */}
                    <div className="text-center">
                        <p className="text-2xl font-bold">{totalBoxTerjualBulanIni}</p>
                        <p className="text-xs text-purple-200 mt-1">Total Box</p>
                    </div>
                </div>
                <div className="mt-4 pt-3 border-t border-purple-400/30 text-center">
                    <p className="text-xs text-purple-200">Total Pendapatan</p>
                    <p className="text-2xl font-bold mt-1">Rp{totalPendapatanBulanIni.toLocaleString('id-ID')}</p>
                </div>
            </div>

            {/* Notifikasi Mystery Box (Dipindahkan ke sini) */}
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

            {/* Hadiah Belum Diberikan (Dipindahkan ke sini) */}
            {eligibleForLastMonthReward.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-xs font-semibold text-yellow-800 mb-1">Hadiah Belum Diberikan:</p>
                    <ul className="text-xs text-yellow-900 list-disc list-inside space-y-1">
                        {eligibleForLastMonthReward.slice(0, 2).map((toko) => (
                            <li key={toko.id}>
                                {toko.nama} ({toko.pendingRewards} hadiah)
                            </li>
                        ))}
                    </ul>
                    {eligibleForLastMonthReward.length > 2 && (
                        <button onClick={() => setActivePage('mystery-box')} className="text-xs font-bold text-yellow-900 mt-2 flex items-center gap-1 hover:underline">
                            Lihat Semua <ChevronsRight size={14} />
                        </button>
                    )}
                </div>
            )}

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
                        <p className="text-xl font-bold text-slate-800">Rp{(totalPendapatan || 0).toLocaleString('id-ID')}</p>
                        <p className="text-xs text-slate-500">Pendapatan</p>
                    </div>
                </div>
            </div>

            {/* Menu Laporan */}
            <div className="mb-4">
                <h2 className="text-base font-semibold text-slate-700 mb-2">Menu Laporan</h2>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 grid grid-cols-4 gap-1 justify-items-center">
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
                    <button onClick={() => setActivePage('analisis-grade-toko')} className="flex flex-col items-center justify-center gap-1 p-2 rounded-md hover:bg-slate-50 transition-colors w-24">
                        <div className="w-10 h-10 flex items-center justify-center bg-orange-100 text-orange-600 rounded-lg">
                            <Award size={20} />
                        </div>
                        <span className="font-semibold text-[10px] text-slate-700 text-center">
                            Grade
                            <br />
                            Toko
                        </span>
                    </button>
                    <button onClick={() => setActivePage('variant-wajib')} className="flex flex-col items-center justify-center gap-1 p-2 rounded-md hover:bg-slate-50 transition-colors w-24">
                        <div className="w-10 h-10 flex items-center justify-center bg-red-100 text-red-600 rounded-lg">
                            <ClipboardCheck size={20} />
                        </div>
                        <span className="font-semibold text-[10px] text-slate-700 text-center">
                            Variant
                            <br />
                            Wajib
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
                            const visitDate = new Date(kunjungan.createdAt); // Tanggal Kunjungan (Hari H)
                            const orderEffectiveDate = addDays(visitDate, 1); // Tanggal Order terkait adalah H+1

                            const relatedOrders = orderList.filter((order) => order.createdAt && order.tokoId === kunjungan.tokoId && isSameDay(new Date(order.createdAt), orderEffectiveDate));

                            const displayTotal = relatedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
                            const totalBoxes = relatedOrders.reduce((sum, order) => sum + (order.items?.reduce((itemSum, item) => itemSum + item.qtyBox, 0) || 0), 0);

                            return (
                                <div key={kunjungan.id} className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm border border-gray-100">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">{kunjungan.tokoNama.charAt(0).toUpperCase()}</div>
                                    <div className="flex-grow">
                                        <p className="font-semibold text-slate-800 text-sm">{kunjungan.tokoNama}</p>
                                        <p className="text-xs text-slate-500">{new Date(kunjungan.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
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
