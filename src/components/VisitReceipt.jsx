// src/components/VisitReceipt.jsx
import React from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import logoImg from '/logo.png'; // 1. Impor gambar logo di sini

const VisitReceipt = React.forwardRef(({ kunjungan }, ref) => {
    if (!kunjungan) return null;

    const grandTotal = kunjungan.total || 0;
    const visitDate = kunjungan.createdAt?.seconds ? new Date(kunjungan.createdAt.seconds * 1000) : new Date();
    const totalBoxes = kunjungan.items?.reduce((sum, item) => sum + item.qtyBox, 0) || 0;
    const hasOrder = kunjungan.items && kunjungan.items.length > 0;

    return (
        <div ref={ref} id={`receipt-${kunjungan.id}`} className="w-[380px] bg-white p-6 font-sans text-slate-800 shadow-lg">
            {/* Header */}
            <div className="text-center mb-5">
                <img src={logoImg} alt="Logo" className="h-14 w-auto mx-auto mb-3" /> {/* 2. Gunakan logo yang sudah diimpor */}
                <h1 className="text-2xl font-bold text-purple-800 tracking-tight">BUKTI PEMESANAN</h1>
                <p className="text-sm text-slate-500 mt-1">{format(visitDate, "d MMMM yyyy, HH:mm 'WIB'", { locale: id })}</p>
            </div>

            {/* Info Kunjungan */}
            <div className="border-t-2 border-b-2 border-dashed border-slate-300 py-4 my-4 space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-slate-500">Nama Toko</span>
                    <span className="font-semibold text-right">{kunjungan.tokoNama}</span>
                </div>
                {kunjungan.kodeToko && (
                    <div className="flex justify-between">
                        <span className="text-slate-500">Kode Toko</span>
                        <span className="font-semibold text-right">{kunjungan.kodeToko}</span>
                    </div>
                )}
            </div>

            {/* Detail Item */}
            <div>
                <h3 className="font-semibold mb-3 text-base">Detail Order:</h3>
                {hasOrder ? (
                    <div className="space-y-2 text-sm">
                        {kunjungan.items.map((item) => (
                            <div key={item.productId} className="flex justify-between">
                                <div className="flex-grow pr-2">
                                    <p className="font-semibold">{item.nama}</p>
                                    <p className="text-sm text-slate-500">
                                        {item.qtyBox} box @ Rp{item.hargaPerBox.toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <p className="font-bold text-base">Rp{item.total.toLocaleString('id-ID')}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 italic text-center py-2">Tidak ada transaksi.</p>
                )}
            </div>

            {/* Total */}
            {hasOrder && (
                <div className="border-t border-dashed border-slate-300 mt-5 pt-4">
                    <div className="flex justify-between font-bold text-xl">
                        <span>TOTAL</span>
                        <span>Rp{grandTotal.toLocaleString('id-ID')}</span>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="text-center mt-6 text-xs text-slate-400">
                <p>
                    Asset ini sepenuhnya ditanggung <strong>Ilyasmaazib</strong>.
                </p>
                <p>Created by ilysmzb</p>
            </div>
        </div>
    );
});

export default VisitReceipt;
