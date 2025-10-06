// src/pages/OrderDetailPage.jsx
import { useState } from 'react';
import { ArrowLeft, Package, Calendar, ChevronDown, Wallet, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function OrderDetailPage({ toko, orderList, onBack }) {
    // State untuk melacak order mana yang sedang dibuka
    const [expandedOrderId, setExpandedOrderId] = useState(null);

    const orderToko = orderList.filter((o) => o.tokoId === toko.id).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    // --- Hitung Statistik Ringkasan ---
    const totalOrders = orderToko.length;
    const totalRevenue = orderToko.reduce((sum, order) => sum + order.total, 0);
    const totalBoxes = orderToko.reduce((sum, order) => sum + (order.items?.reduce((itemSum, item) => itemSum + item.qtyBox, 0) || 0), 0);

    const toggleExpand = (orderId) => setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
    return (
        <div className="p-5 pb-20 max-w-md mx-auto animate-in fade-in slide-in-from-right-5 duration-300">
            <div className="flex items-center mb-6 relative">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 absolute left-0">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-grow text-center">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center justify-center gap-2">
                        <Package className="text-purple-600" />
                        Riwayat Order
                    </h2>
                    <p className="text-sm text-slate-500 font-semibold">{toko.nama}</p>
                </div>
            </div>

            {/* Kartu Ringkasan */}
            <div className="grid grid-cols-3 gap-3 mb-6 text-center">
                <div className="bg-purple-50 p-3 rounded-lg shadow-sm border border-purple-100">
                    <ShoppingBag className="mx-auto text-purple-500 mb-1" size={20} />
                    <p className="text-xl font-bold text-slate-800">{totalOrders}</p>
                    <p className="text-xs text-slate-500">Total Order</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg shadow-sm border border-purple-100">
                    <Package className="mx-auto text-blue-500 mb-1" size={20} />
                    <p className="text-xl font-bold text-slate-800">{totalBoxes}</p>
                    <p className="text-xs text-slate-500">Total Box</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg shadow-sm border border-purple-100">
                    <Wallet className="mx-auto text-green-500 mb-1" size={20} />
                    <p className="text-xl font-bold text-slate-800">{(totalRevenue / 1000).toFixed(1)}k</p>
                    <p className="text-xs text-slate-500">Pendapatan</p>
                </div>
            </div>

            {orderToko.length === 0 ? (
                <div className="text-center text-gray-500 py-10 bg-slate-50 rounded-lg">
                    <Package size={40} className="mx-auto text-gray-400 mb-2" />
                    Belum ada riwayat order dari toko ini.
                </div>
            ) : (
                <div className="space-y-4">
                    {orderToko.map((order) => {
                        const isExpanded = expandedOrderId === order.id;
                        return (
                            <div key={order.id} onClick={() => toggleExpand(order.id)} className="bg-purple-50 rounded-xl p-4 border border-purple-100 shadow-sm cursor-pointer transition-all hover:border-purple-300">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                        <Calendar size={14} className="text-purple-600" />
                                        <span>{order.createdAt?.seconds ? format(new Date(order.createdAt.seconds * 1000), 'EEE, d MMM yyyy, HH:mm', { locale: id }) : 'N/A'}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-lg text-green-600">Rp{order.total.toLocaleString('id-ID')}</p>
                                        <p className="text-xs text-slate-500">{order.items.reduce((sum, item) => sum + item.qtyBox, 0)} box</p>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="space-y-2 text-sm border-t border-slate-100 pt-3 mt-3 animate-in fade-in duration-300">
                                        {order.items.map((item) => (
                                            <div key={item.productId} className="flex justify-between">
                                                <div className="flex-grow pr-2">
                                                    <p className="font-semibold text-slate-800">{item.nama}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {item.qtyBox} box @ Rp{item.hargaPerBox.toLocaleString('id-ID')}
                                                    </p>
                                                </div>
                                                <p className="font-semibold text-slate-800">Rp{item.total.toLocaleString('id-ID')}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="text-center mt-2 text-slate-400">
                                    <ChevronDown size={16} className={`mx-auto transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
