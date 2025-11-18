import { useState, useMemo } from 'react';
import { ArrowLeft, TrendingUp, Calendar, ChevronDown } from 'lucide-react';
import { format, setMonth, getMonth, setYear, getYear, isSameDay, endOfMonth, addDays, isValid } from 'date-fns';
import { getSalesPeriod, normalizeDate } from '../lib/dateUtils'; // Impor fungsi getSalesPeriod dan normalizeDate
import { id } from 'date-fns/locale';
import { findProduct } from '../lib/utils'; // Impor helper baru

export default function ProdukTerlarisPage({ produkList, orderList, setActivePage }) {
    const [showAll, setShowAll] = useState(false);

    // --- PERBAIKAN LOGIKA: Samakan dengan HomePage ---
    // Jika hari ini adalah hari terakhir bulan, geser acuan tanggal ke bulan berikutnya.
    const todayCalendarDate = new Date();
    const isLastDayOfCalendarMonth = isSameDay(todayCalendarDate, endOfMonth(todayCalendarDate));
    const initialMonth = isLastDayOfCalendarMonth ? addDays(todayCalendarDate, 1) : todayCalendarDate;
    const [selectedMonth, setSelectedMonth] = useState(initialMonth);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [showMonthDropdown, setShowMonthDropdown] = useState(false);
    const [showYearDropdown, setShowYearDropdown] = useState(false);

    const filteredOrders = useMemo(() => {
        // Gunakan getSalesPeriod untuk mendapatkan rentang tanggal yang sesuai dengan logika H+1
        const { startDate: monthStart, endDate: monthEnd } = getSalesPeriod(selectedMonth);

        return orderList.filter((order) => {
            const orderDate = normalizeDate(order.createdAt);
            if (!orderDate || !isValid(orderDate)) return false;

            // Logika yang sama dengan HomePage untuk menangani hari terakhir bulan
            if (isLastDayOfCalendarMonth) {
                const nextMonthFirstDay = addDays(monthEnd, 1);
                return (orderDate >= monthStart && orderDate <= monthEnd) || isSameDay(orderDate, nextMonthFirstDay);
            }
            return orderDate >= monthStart && orderDate <= monthEnd;
        });
    }, [selectedMonth, orderList]);

    const sortedProductSales = useMemo(() => {
        const productSalesMap = new Map();
        filteredOrders.forEach((order) => {
            // Perbaikan: Asumsikan order.items sudah di-parse di App.jsx,
            // tapi tetap tangani jika null atau undefined.
            (order.items || []).forEach((item) => {
                const currentQty = productSalesMap.get(item.productId) || 0;
                productSalesMap.set(item.productId, currentQty + (item.qtyBox || 0));
            });
        });

        return Array.from(productSalesMap.entries())
            .map(([productId, totalQtyBox]) => {
                const product = findProduct(produkList, productId); // Gunakan helper findProduct
                return product ? { ...product, totalQtyBox } : null;
            })
            .filter(Boolean)
            .sort((a, b) => b.totalQtyBox - a.totalQtyBox);
    }, [filteredOrders, produkList]);

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

            {/* Filter Bulan dan Tahun */}
            <div className="relative mb-5">
                <button onClick={() => setShowMonthPicker(!showMonthPicker)} className="w-full p-3 text-left bg-white border border-slate-200 rounded-xl flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300 transition-all duration-200">
                    <span className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl">
                            <Calendar size={16} className="text-purple-600" />
                        </div>
                        <span className="text-slate-700 font-medium text-sm">{format(selectedMonth, 'MMMM yyyy', { locale: id })}</span>
                    </span>
                    <ChevronDown size={20} className={`text-slate-400 transition-all duration-300 ${showMonthPicker ? 'rotate-180 text-purple-600' : ''}`} />
                </button>
                {showMonthPicker && (
                    <div className="absolute top-full mt-2 z-20 w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/50 p-4 animate-slide-in-top" onMouseLeave={() => setShowMonthPicker(false)} onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-4" onClick={(e) => e.stopPropagation()}>
                            {/* Dropdown Bulan */}
                            <div className="flex-1">
                                <label className="text-xs font-semibold text-slate-600">Bulan</label>
                                <div className="relative mt-1">
                                    <button onClick={() => setShowMonthDropdown(!showMonthDropdown)} className="w-full p-2.5 text-left bg-white border border-slate-300 rounded-xl flex justify-between items-center text-sm">
                                        {format(selectedMonth, 'MMMM', { locale: id })}
                                        <ChevronDown size={16} className={`transition-transform ${showMonthDropdown ? 'rotate-180' : ''}`} />
                                    </button>
                                    {showMonthDropdown && (
                                        <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                            {Array.from({ length: 12 }).map((_, i) => (
                                                <li
                                                    key={i}
                                                    onClick={() => {
                                                        setSelectedMonth(setMonth(selectedMonth, i));
                                                        setShowMonthDropdown(false);
                                                    }}
                                                    className={`p-2 text-sm cursor-pointer hover:bg-purple-50 ${getMonth(selectedMonth) === i ? 'bg-purple-100 font-bold' : ''}`}
                                                >
                                                    {format(new Date(0, i), 'MMMM', { locale: id })}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                            {/* Dropdown Tahun */}
                            <div className="flex-1">
                                <label className="text-xs font-semibold text-slate-600">Tahun</label>
                                <div className="relative mt-1">
                                    <button onClick={() => setShowYearDropdown(!showYearDropdown)} className="w-full p-2.5 text-left bg-white border border-slate-300 rounded-xl flex justify-between items-center text-sm">
                                        {getYear(selectedMonth)}
                                        <ChevronDown size={16} className={`transition-transform ${showYearDropdown ? 'rotate-180' : ''}`} />
                                    </button>
                                    {showYearDropdown && (
                                        <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                            {Array.from({ length: new Date().getFullYear() - 2020 + 2 }).map((_, i) => {
                                                const year = 2020 + i;
                                                return (
                                                    <li
                                                        key={year}
                                                        onClick={() => {
                                                            setSelectedMonth(setYear(selectedMonth, year));
                                                            setShowYearDropdown(false);
                                                        }}
                                                        className={`p-2 text-sm cursor-pointer hover:bg-purple-50 ${getYear(selectedMonth) === year ? 'bg-purple-100 font-bold' : ''}`}
                                                    >
                                                        {year}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {sortedProductSales.length === 0 ? (
                <div className="bg-white rounded-lg p-6 text-center text-slate-500 shadow-sm">
                    <TrendingUp size={32} className="mx-auto text-slate-400 mb-3" />
                    <p className="font-semibold">Belum ada penjualan produk</p>
                    <p className="text-xs">untuk periode yang dipilih.</p>
                </div>
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
