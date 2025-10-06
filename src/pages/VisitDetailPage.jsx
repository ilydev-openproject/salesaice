// src/pages/VisitDetailPage.jsx
import { ArrowLeft, MapPin, Calendar, FileText, Package, Wallet } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';

export default function VisitDetailPage({ toko, kunjunganList, orderList, onBack }) {
    const kunjunganToko = kunjunganList.filter((k) => k.tokoId === toko.id).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    return (
        <div className="p-5 pb-20 max-w-md mx-auto animate-in fade-in slide-in-from-right-5 duration-300">
            <div className="flex items-center mb-6 relative">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 absolute left-0">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-grow text-center">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center justify-center gap-2">
                        <MapPin className="text-purple-600" />
                        Riwayat Kunjungan
                    </h2>
                    <p className="text-sm text-slate-500 font-semibold">{toko.nama}</p>
                </div>
            </div>

            {kunjunganToko.length === 0 ? (
                <div className="text-center text-gray-500 py-10 bg-slate-50 rounded-lg">
                    <MapPin size={40} className="mx-auto text-gray-400 mb-2" />
                    Belum ada riwayat kunjungan ke toko ini.
                </div>
            ) : (
                <div className="space-y-4">
                    {kunjunganToko.map((kunjungan) => {
                        if (!kunjungan.createdAt?.seconds) return null;

                        const visitDate = new Date(kunjungan.createdAt.seconds * 1000);

                        // Cari semua order yang terkait dengan kunjungan ini (toko yang sama, hari yang sama)
                        const relatedOrders = orderList.filter((order) => {
                            if (!order.createdAt?.seconds) return false;
                            const orderDate = new Date(order.createdAt.seconds * 1000);
                            return order.tokoId === kunjungan.tokoId && isSameDay(orderDate, visitDate);
                        });

                        // Hitung total dari order-order terkait
                        const totalAmount = relatedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
                        const totalBoxes = relatedOrders.reduce((sum, order) => sum + (order.items?.reduce((itemSum, item) => itemSum + item.qtyBox, 0) || 0), 0);

                        return (
                            <div key={kunjungan.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                                    <Calendar size={14} className="text-purple-600" />
                                    <span>{format(visitDate, 'EEE, d MMMM yyyy, HH:mm', { locale: id })}</span>
                                </div>

                                {totalAmount > 0 && (
                                    <div className="grid grid-cols-2 gap-3 mb-3 text-center">
                                        <div className="bg-blue-50 p-2 rounded-lg">
                                            <p className="font-bold text-blue-700">{totalBoxes}</p>
                                            <p className="text-xs text-blue-600 flex items-center justify-center gap-1">
                                                <Package size={12} /> Box
                                            </p>
                                        </div>
                                        <div className="bg-green-50 p-2 rounded-lg">
                                            <p className="font-bold text-green-700">Rp{totalAmount.toLocaleString('id-ID')}</p>
                                            <p className="text-xs text-green-600 flex items-center justify-center gap-1">
                                                <Wallet size={12} /> Order
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {kunjungan.catatan && (
                                    <div className="mt-2 pt-2 border-t border-slate-100 text-sm text-slate-600 flex items-start gap-2">
                                        <FileText size={14} className="flex-shrink-0 mt-0.5 text-slate-400" />
                                        <p className="italic">"{kunjungan.catatan}"</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
