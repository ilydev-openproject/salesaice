import { useState, useEffect } from 'react';
import { ArrowLeft, ClipboardCheck, Save, Star, Target, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function VariantWajibSettingsPage({ setActivePage, produkList, setProdukList, showNotification }) {
    const [saving, setSaving] = useState(false);

    // State untuk modal target
    const [showTargetModal, setShowTargetModal] = useState(false);
    const [currentTargetProduct, setCurrentTargetProduct] = useState(null);
    const [targetBox, setTargetBox] = useState('');

    // Inisialisasi state lokal saat komponen dimuat
    // State lokal untuk menampung perubahan sebelum disimpan
    const [localProdukList, setLocalProdukList] = useState([]);

    useEffect(() => {
        // Buat salinan deep copy untuk diedit secara lokal
        setLocalProdukList(JSON.parse(JSON.stringify(produkList)));
    }, [produkList]);

    const handleToggleWajib = (produk) => {
        const productId = produk.id;
        const localProduk = localProdukList.find((p) => p.id === productId);
        const isCurrentlyWajib = localProduk && (localProduk.targetWajib || 0) > 0;

        if (!isCurrentlyWajib) {
            // Jika akan diaktifkan, buka modal
            setCurrentTargetProduct(produk);
            setTargetBox(produk.targetWajib || ''); // Isi dengan target yang sudah ada jika ada
            setShowTargetModal(true);
        } else {
            // Jika akan dinonaktifkan, langsung set targetWajib ke 0 di state lokal
            const updatedList = localProdukList.map((p) => (p.id === productId ? { ...p, targetWajib: 0 } : p));
            setLocalProdukList(updatedList);
        }
    };

    const handleSetTarget = () => {
        if (!currentTargetProduct) return;
        const productId = currentTargetProduct.id;
        const newTarget = Number(targetBox) || 0;

        // Jika target diatur ke 0 atau kurang, anggap saja dinonaktifkan
        if (newTarget <= 0) {
            showNotification('Target harus lebih dari 0 untuk mengaktifkan variant wajib.', 'info');
        }

        // Update targetWajib di state lokal
        const updatedList = localProdukList.map((p) => (p.id === productId ? { ...p, targetWajib: newTarget } : p));
        setLocalProdukList(updatedList);

        setShowTargetModal(false);
        setCurrentTargetProduct(null);
        setTargetBox('');
    };

    const handleSave = async () => {
        setSaving(true);

        // Bandingkan state lokal dengan props asli untuk menemukan perubahan
        const updates = localProdukList
            .map((localProduk) => {
                const originalProduk = produkList.find((p) => p.id === localProduk.id);
                const newTarget = localProduk.targetWajib || 0;
                const oldTarget = originalProduk?.targetWajib || 0;
                if (newTarget !== oldTarget) {
                    // Perbaikan: Kembalikan sebuah promise `update` dari Supabase, bukan objek biasa.
                    return supabase.from('produk').update({ targetWajib: newTarget }).eq('id', localProduk.id);
                }
                return null;
            })
            .filter(Boolean); // Hapus item null dari array

        if (updates.length === 0) {
            showNotification('Tidak ada perubahan untuk disimpan.', 'info');
            setSaving(false);
            return;
        }
        try {
            // Jalankan semua promise update secara paralel
            const results = await Promise.all(updates);
            // Cek apakah ada error di salah satu hasil promise
            const errorResult = results.find((res) => res.error);
            if (errorResult) throw errorResult.error;

            setProdukList(localProdukList); // Perbaikan: Gunakan setProdukList untuk update state global
            showNotification('Pengaturan variant wajib berhasil disimpan.', 'success');
            setActivePage('variant-wajib'); // Kembali ke halaman display variant wajib
        } catch (error) {
            console.error('Gagal menyimpan variant wajib:', error);
            showNotification('Gagal menyimpan perubahan.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#f8f6fc] z-[400] animate-in fade-in duration-300">
            <div className="max-w-md mx-auto h-full flex flex-col">
                <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 p-5 pb-4 border-b border-slate-200">
                    <div className="flex items-center relative">
                        <button onClick={() => setActivePage('variant-wajib')} className="p-2 rounded-full hover:bg-slate-100 absolute left-0">
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className="text-lg font-bold text-slate-800 flex-grow text-center flex items-center justify-center gap-2">
                            <ClipboardCheck className="text-purple-600" />
                            Atur Variant Wajib
                        </h2>
                    </div>
                </div>

                <div className="p-5 space-y-2 pb-40 overflow-y-auto flex-grow">
                    {localProdukList
                        .sort((a, b) => a.nama.localeCompare(b.nama))
                        .map((produk) => {
                            const isWajib = (produk.targetWajib || 0) > 0;
                            return (
                                <div key={produk.id} onClick={() => handleToggleWajib(produk)} className={`bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm border transition-all duration-200 cursor-pointer ${isWajib ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200'}`}>
                                    <img src={produk.foto || 'https://via.placeholder.com/64?text=Produk'} alt={produk.nama} className="w-10 h-10 object-cover rounded-md border border-gray-200" />
                                    <div className="flex-grow">
                                        <p className="font-semibold text-slate-800 text-sm">{produk.nama}</p>
                                        {isWajib && <p className="text-xs text-yellow-700 font-semibold">Target: {produk.targetWajib || 0} box</p>}
                                    </div>
                                    <div className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${isWajib ? 'bg-yellow-400' : 'bg-slate-300'}`}>
                                        <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${isWajib ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                    </div>
                                </div>
                            );
                        })}
                </div>

                {/* Tombol Simpan Sticky */}
                <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-sm py-2 px-3 border-t border-slate-200">
                    <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 p-3 rounded-xl border border-purple-200/50 mb-3 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200/30 rounded-full -translate-y-10 translate-x-10"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-indigo-200/30 rounded-full translate-y-8 -translate-x-8"></div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-center text-sm font-bold text-purple-800">
                                <span className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                                    Total Variant Wajib
                                </span>
                                <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1.5 rounded-lg shadow-md transition-all duration-300">{localProdukList.filter((p) => (p.targetWajib || 0) > 0).length} Produk</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl focus-ring">
                        {saving ? (
                            'Menyimpan...'
                        ) : (
                            <>
                                Simpan Perubahan <Save size={16} />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Modal Set Target */}
            {showTargetModal && currentTargetProduct && (
                <div className="fixed inset-0 z-[400] bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 slide-in-from-bottom-5">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Target size={20} className="text-purple-600" />
                                Atur Target Box
                            </h3>
                            <button onClick={() => setShowTargetModal(false)} className="p-2 rounded-full hover:bg-slate-100">
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">
                            Masukkan target penjualan bulanan untuk produk <strong className="text-slate-700">{currentTargetProduct.nama}</strong>.
                        </p>
                        <div className="relative">
                            <input type="number" value={targetBox} onChange={(e) => setTargetBox(e.target.value)} placeholder="Contoh: 50" className="w-full p-4 pl-10 text-lg font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">Box</span>
                        </div>
                        <div className="mt-6">
                            <button onClick={handleSetTarget} className="w-full py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition">
                                Atur Target
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
