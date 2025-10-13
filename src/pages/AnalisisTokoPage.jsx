// src/pages/AnalisisTokoPage.jsx
import { useState, useMemo } from 'react';
import { ArrowLeft, BarChart2, ArrowDownUp, TrendingDown, TrendingUp, Star, AlertCircle, Package, Calendar } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function AnalisisTokoPage({ tokoList, orderList, kunjunganList, setActivePage }) {
    const [sortBy, setSortBy] = useState('totalRevenue'); // Default sort

    const analisisData = useMemo(() => {
        if (!tokoList.length) return [];

        return tokoList
            .map((toko) => {
                const ordersForToko = orderList.filter((o) => o.tokoId === toko.id);
                const visitsForToko = kunjunganList.filter((k) => k.tokoId === toko.id);

                const totalRevenue = ordersForToko.reduce((sum, o) => sum + o.total, 0);
                const totalOrders = ordersForToko.length;
                const totalBox = ordersForToko.reduce((sum, order) => sum + (order.items?.reduce((itemSum, item) => itemSum + (item.qtyBox || 0), 0) || 0), 0);
                const totalVisits = visitsForToko.length;

                const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
                const conversionRate = totalVisits > 0 ? (totalOrders / totalVisits) * 100 : 0;

                const lastOrder = ordersForToko.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds)[0];
                const lastOrderDate = lastOrder ? new Date(lastOrder.createdAt.seconds * 1000) : null;
                const daysSinceLastOrder = lastOrderDate ? differenceInDays(new Date(), lastOrderDate) : Infinity;

                return {
                    ...toko,
                    totalRevenue,
                    totalOrders,
                    totalBox,
                    averageOrderValue,
                    conversionRate,
                    lastOrderDate,
                    daysSinceLastOrder,
                };
            })
            .sort((a, b) => {
                if (sortBy === 'lastOrderDate') {
                    return a.daysSinceLastOrder - b.daysSinceLastOrder; // Urutkan dari yang paling baru
                }
                if (sortBy === 'nama') {
                    return a.nama.localeCompare(b.nama);
                }
                // Untuk metrik lain, urutkan dari tertinggi ke terendah
                return b[sortBy] - a[sortBy];
            });
    }, [tokoList, orderList, kunjunganList, sortBy]);

    const getLapsedStatus = (days) => {
        if (days === Infinity) return { text: 'Belum ada', color: 'bg-slate-100 text-slate-500' };
        if (days > 90) return { text: '>90 hari lalu', color: 'bg-red-100 text-red-800' };
        if (days > 60) return { text: '>60 hari lalu', color: 'bg-orange-100 text-orange-800' };
        if (days > 30) return { text: '>30 hari lalu', color: 'bg-yellow-100 text-yellow-800' };
        if (days <= 30) return { text: '<30 hari lalu', color: 'bg-green-100 text-green-800' };
        return { text: 'Belum ada', color: 'bg-slate-100 text-slate-500' };
    };

    return (
        <div className="p-5 pb-20 max-w-md mx-auto animate-in fade-in duration-300">
            <div className="flex items-center mb-6 relative">
                <button onClick={() => setActivePage('home')} className="p-2 rounded-full hover:bg-slate-100 absolute left-0">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-xl font-bold text-slate-800 flex-grow text-center flex items-center justify-center gap-2">
                    <BarChart2 className="text-purple-600" />
                    Analisis Toko
                </h2>
            </div>

            {/* Filter & Sort */}
            <div className="mb-4 flex items-center gap-2">
                <p className="text-sm font-medium text-slate-600">Urutkan berdasarkan:</p>
                <div className="relative flex-grow">
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none w-full bg-white border border-gray-300 rounded-lg p-2 pr-8 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-semibold">
                        <option value="totalRevenue">Pendapatan Tertinggi</option>
                        <option value="totalOrders">Order Terbanyak</option>
                        <option value="totalBox">Box Terbanyak</option>
                        <option value="averageOrderValue">Rata-rata Order Tertinggi</option>
                        <option value="conversionRate">Konversi Tertinggi</option>
                        <option value="lastOrderDate">Order Terbaru</option>
                        <option value="nama">Nama A-Z</option>
                    </select>
                    <ArrowDownUp size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {analisisData.length === 0 ? (
                <div className="bg-white rounded-lg p-4 text-center text-slate-500 shadow-sm">Tidak ada data untuk dianalisis.</div>
            ) : (
                <div className="space-y-3">
                    {analisisData.map((toko, index) => {
                        const status = getLapsedStatus(toko.daysSinceLastOrder);
                        const rank = index + 1;
                        let rankIcon = null;
                        if (rank === 1) rankIcon = <Star size={16} className="text-yellow-500 fill-yellow-400" />;
                        if (rank === 2) rankIcon = <Star size={16} className="text-slate-400 fill-slate-300" />;
                        if (rank === 3) rankIcon = <Star size={16} className="text-orange-400 fill-orange-300" />;

                        return (
                            <div key={toko.id} className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="text-center font-bold text-slate-400 w-8 flex-shrink-0">
                                        <span className="text-lg">{rank}</span>
                                        <div className="flex justify-center mt-1">{rankIcon}</div>
                                    </div>
                                    <div className="flex-grow">
                                        <h3 className="font-bold text-slate-800 text-sm">{toko.nama}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.color}`}>{status.text}</span>
                                            {toko.daysSinceLastOrder > 30 && toko.daysSinceLastOrder !== Infinity && <AlertCircle size={14} className="text-yellow-600" title="Perlu di-follow up" />}
                                        </div>
                                        {toko.lastOrderDate && (
                                            <div className="flex items-center gap-1 text-slate-500 text-[11px] mt-1">
                                                <Calendar size={12} />
                                                <span>{format(toko.lastOrderDate, 'd MMM yyyy', { locale: id })}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Total Pendapatan</span>
                                        <span className="font-bold text-green-600">Rp{toko.totalRevenue.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Total Box</span>
                                        <span className="font-bold text-blue-600">{toko.totalBox} box</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Total Order</span>
                                        <span className="font-bold text-slate-700">{toko.totalOrders} kali</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Avg. Order Value</span>
                                        <span className="font-bold text-slate-700">Rp{Math.round(toko.averageOrderValue).toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Konversi Kunjungan</span>
                                        <span className="font-bold text-purple-600">{toko.conversionRate.toFixed(0)}%</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
