import { useMemo } from 'react';
import { ArrowLeft, ClipboardCheck, Settings, Star } from 'lucide-react';
import { getSalesPeriod } from '../lib/dateUtils';
import { addDays, isSameDay, endOfMonth } from 'date-fns';

export default function VariantWajibPage({ setActivePage, produkList, orderList }) {
    // --- Sales Calculation Logic ---
    const todayCalendarDate = new Date();
    const isLastDayOfCalendarMonth = isSameDay(todayCalendarDate, endOfMonth(todayCalendarDate));
    const nowForMonthlyInsights = isLastDayOfCalendarMonth ? addDays(todayCalendarDate, 1) : todayCalendarDate;
    const { startDate: monthStart, endDate: monthEnd } = getSalesPeriod(nowForMonthlyInsights);

    const orderBulanIni = useMemo(() => {
        return orderList.filter((order) => {
            if (!order.createdAt?.seconds) return false;
            const orderDate = new Date(order.createdAt.seconds * 1000);
            if (isLastDayOfCalendarMonth) {
                const nextMonthFirstDay = addDays(monthEnd, 1);
                return (orderDate >= monthStart && orderDate <= monthEnd) || isSameDay(orderDate, nextMonthFirstDay);
            }
            return orderDate >= monthStart && orderDate <= monthEnd;
        });
    }, [orderList, monthStart, monthEnd, isLastDayOfCalendarMonth]);

    const productSalesMap = useMemo(() => {
        const salesMap = new Map();
        orderBulanIni.forEach((order) => {
            order.items?.forEach((item) => {
                salesMap.set(item.productId, (salesMap.get(item.productId) || 0) + item.qtyBox);
            });
        });
        return salesMap;
    }, [orderBulanIni]);

    const wajibProdukList = useMemo(() => {
        return produkList
            .filter((p) => p.isWajib)
            .map((p) => {
                const terjual = productSalesMap.get(p.id) || 0;
                const target = p.targetWajib || 0;
                const progress = target > 0 ? Math.min((terjual / target) * 100, 100) : 0;
                return { ...p, terjual, progress };
            })
            .sort((a, b) => b.progress - a.progress);
    }, [produkList, productSalesMap]);

    return (
        <div className="p-5 pb-20 max-w-md mx-auto animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => setActivePage('home')} className="p-2 rounded-full hover:bg-slate-100">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-red-100 to-yellow-100 rounded-xl shadow-sm">
                            <ClipboardCheck className="text-red-600" size={20} />
                        </div>
                        <span className="gradient-text">Variant Wajib</span>
                    </h2>
                </div>
                <button onClick={() => setActivePage('variant-wajib-settings')} className="p-2 rounded-full bg-white shadow-sm border border-slate-200 hover:bg-slate-100 transition-all">
                    <Settings size={20} className="text-slate-600" />
                </button>
            </div>
            {wajibProdukList.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed">
                    <ClipboardCheck size={40} className="mx-auto text-slate-400 mb-3" />
                    <h4 className="font-bold text-slate-700">Belum Ada Variant Wajib</h4>
                    <p className="text-xs text-slate-500 mt-1 px-4">
                        Klik ikon <Settings size={14} className="inline-block -mt-1" /> di pojok kanan atas untuk mengatur produk mana yang menjadi variant wajib.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {wajibProdukList.map((produk) => (
                        <div key={produk.id} className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-4 transition-all hover:shadow-md hover:border-purple-200 relative overflow-hidden">
                            <div className="absolute -top-2 -left-2 bg-yellow-400 text-white p-1.5 rounded-full shadow-md z-10">
                                <Star size={12} className="fill-white" />
                            </div>
                            <div className="flex items-center gap-4">
                                <img src={produk.foto || 'https://via.placeholder.com/80?text=Produk'} alt={produk.nama} className="w-16 h-16 object-contain rounded-lg border border-slate-200" />
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800 text-sm">{produk.nama}</p>
                                    <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
                                        <span>
                                            Terjual: <span className="font-bold text-purple-700">{produk.terjual}</span>
                                        </span>
                                        <span>
                                            Target: <span className="font-bold text-slate-700">{produk.targetWajib}</span>
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2.5 mt-1.5">
                                        <div className="bg-gradient-to-r from-green-400 to-blue-500 h-2.5 rounded-full" style={{ width: `${produk.progress}%` }}></div>
                                    </div>
                                    <p className="text-right text-xs font-bold text-purple-700 mt-1">{produk.progress.toFixed(0)}%</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
