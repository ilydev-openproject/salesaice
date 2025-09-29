// src/pages/ProdukPage.jsx
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { Package, Plus, Trash2, TrendingUp, Wallet, Tag, Box, CheckCircle2, XCircle, Eye, EyeOff, Pencil, ArrowDownUp, Filter } from 'lucide-react';
import { db } from '../lib/firebase';

export default function ProdukPage() {
    const [produkList, setProdukList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingProdukId, setEditingProdukId] = useState(null);

    const [nama, setNama] = useState('');
    const [hargaPerBox, setHargaPerBox] = useState('');
    const [hargaJualPerPcs, setHargaJualPerPcs] = useState('');
    const [isiPerBox, setIsiPerBox] = useState('');
    const [available, setAvailable] = useState(true);
    const [foto, setFoto] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('nama'); // 'nama', 'hargaPcs', 'hargaBox', 'keuntungan'

    const SORT_OPTIONS = {
        nama: 'Nama A-Z',
        keuntungan: 'Untung Tertinggi',
        hargaPcs: 'Jual Tertinggi',
        hargaBox: 'Modal Tertinggi',
    };

    useEffect(() => {
        const loadProduk = async () => {
            try {
                // Order by createdAt to show newest first, or by nama for alphabetical
                const q = query(collection(db, 'produk'), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);
                const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setProdukList(list);
            } catch (error) {
                console.error('Error load produk:', error);
                alert('Gagal memuat produk. Cek koneksi internet.');
            } finally {
                setLoading(false);
            }
        };
        loadProduk();
    }, []);

    const toggleForm = () => {
        setShowForm(!showForm);
        setEditingProdukId(null); // Reset editing state
        if (!showForm) {
            setNama('');
            setHargaPerBox('');
            setHargaJualPerPcs('');
            setIsiPerBox('');
            setAvailable(true);
            setFoto('');
        }
    };

    const bukaFormEdit = (produk) => {
        setEditingProdukId(produk.id);
        setNama(produk.nama);
        setHargaPerBox(produk.hargaPerBox);
        setHargaJualPerPcs(produk.hargaJualPerPcs);
        setIsiPerBox(produk.isiPerBox);
        setAvailable(produk.available);
        setFoto(produk.foto || '');
        setShowForm(true);
    };

    const simpanProduk = async (e) => {
        e.preventDefault();
        if (!nama || !hargaPerBox || !hargaJualPerPcs || !isiPerBox) {
            alert('Semua field wajib diisi!');
            return;
        }

        const produkData = {
            nama: nama.trim(),
            available: available,
            hargaPerBox: parseFloat(hargaPerBox),
            hargaJualPerPcs: parseFloat(hargaJualPerPcs),
            isiPerBox: parseInt(isiPerBox),
            foto: foto.trim() || 'https://via.placeholder.com/100?text=Produk',
        };

        try {
            if (editingProdukId) {
                // Update
                const produkRef = doc(db, 'produk', editingProdukId);
                await updateDoc(produkRef, produkData);
            } else {
                // Create
                await addDoc(collection(db, 'produk'), {
                    ...produkData,
                    createdAt: serverTimestamp(), // Use server timestamp for new documents
                });
            }

            const snapshot = await getDocs(collection(db, 'produk'));
            const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setProdukList(list);
            toggleForm(); // Close and reset form
        } catch (error) {
            console.error('Error saving produk:', error);
            alert('Gagal menyimpan produk.');
        }
    };

    const toggleAvailable = async (produk) => {
        const newStatus = !produk.available;
        try {
            await updateDoc(doc(db, 'produk', produk.id), { available: newStatus });
            setProdukList(produkList.map((p) => (p.id === produk.id ? { ...p, available: newStatus } : p)));
        } catch (error) {
            console.error('Error update status:', error);
        }
    };

    const hapusProduk = async (id) => {
        if (!confirm('Hapus produk ini?')) return;
        try {
            await deleteDoc(doc(db, 'produk', id));
            setProdukList(produkList.filter((p) => p.id !== id));
        } catch (error) {
            console.error('Error hapus produk:', error);
            alert('Gagal menghapus produk.');
        }
    };

    const filteredProduk = produkList
        .filter((produk) => produk.nama.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            switch (sortBy) {
                case 'hargaPcs':
                    return (b.hargaJualPerPcs ?? 0) - (a.hargaJualPerPcs ?? 0); // Tertinggi ke terendah
                case 'hargaBox':
                    return (b.hargaPerBox ?? 0) - (a.hargaPerBox ?? 0); // Tertinggi ke terendah
                case 'keuntungan': {
                    const keuntunganA = (a.hargaJualPerPcs ?? 0) * (a.isiPerBox ?? 1) - (a.hargaPerBox ?? 0);
                    const keuntunganB = (b.hargaJualPerPcs ?? 0) * (b.isiPerBox ?? 1) - (b.hargaPerBox ?? 0);
                    return keuntunganB - keuntunganA; // Tertinggi ke terendah
                }
                case 'nama':
                default:
                    return a.nama.localeCompare(b.nama); // A-Z
            }
        });

    // ✅ Fallback untuk data yang mungkin undefined
    const safeRender = (produk) => {
        const hargaPerBox = produk.hargaPerBox ?? 0;
        const hargaJualPerPcs = produk.hargaJualPerPcs ?? 0;
        const isiPerBox = produk.isiPerBox ?? 1;

        const pendapatanToko = hargaJualPerPcs * isiPerBox;
        const keuntunganToko = pendapatanToko - hargaPerBox;
        const marginPersen = hargaPerBox > 0 ? ((keuntunganToko / hargaPerBox) * 100).toFixed(1) : 0;

        const isAvailable = produk.available;

        return (
            <div key={produk.id} className={`bg-white rounded-xl border border-gray-200 mb-3 transition-all hover:shadow-md hover:border-purple-200 overflow-hidden ${!isAvailable ? 'opacity-60' : ''}`}>
                <div className="flex-1">
                    {/* Header Card */}
                    <div className="p-2.5 flex items-center gap-3">
                        {/* Gambar */}
                        <div className="flex-shrink-0">
                            <img
                                src={produk.foto || 'https://via.placeholder.com/80?text=Produk'}
                                alt={produk.nama}
                                className={`w-14 h-14 object-cover rounded-lg border border-gray-200 ${!isAvailable ? 'grayscale' : ''}`}
                                onError={(e) => {
                                    e.target.src = 'https://via.placeholder.com/64?text=Produk';
                                }}
                            />
                        </div>

                        {/* Info Utama & Harga */}
                        <div className="flex-grow">
                            <h3 className={`font-bold text-slate-800 text-sm leading-tight ${!isAvailable ? 'line-through text-slate-500' : ''}`}>{produk.nama}</h3>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs mt-1 text-slate-600">
                                <span>
                                    Modal: <span className="font-semibold">Rp{hargaPerBox.toLocaleString('id-ID')}</span>
                                </span>
                                <span>
                                    Jual: <span className="font-semibold">Rp{hargaJualPerPcs.toLocaleString('id-ID')}</span>
                                </span>
                                <span>
                                    Isi: <span className="font-semibold">{isiPerBox}</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {isAvailable ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                    {isAvailable ? 'Tersedia' : 'Habis'}
                                </span>
                                <div className={`text-xs font-bold flex items-center gap-1 ${keuntunganToko >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                    <TrendingUp size={12} /> Untung:
                                    <span>Rp{keuntunganToko.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Tombol Aksi */}
                        <div className="flex flex-col gap-1 self-start">
                            <button onClick={() => toggleAvailable(produk)} className="p-1 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                                {isAvailable ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button onClick={() => bukaFormEdit(produk)} className="p-1 rounded-full hover:bg-blue-100 text-blue-500 transition-colors">
                                <Pencil size={14} />
                            </button>
                            <button onClick={() => hapusProduk(produk.id)} className="p-1 rounded-full hover:bg-red-100 text-red-500 transition-colors">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return <div className="p-5 text-center text-purple-700 min-h-[calc(100vh-120px)] flex items-center justify-center">Memuat katalog...</div>;
    }

    return (
        <div className="p-5 pb-20 max-w-md mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Package className="text-purple-600" />
                    Katalog Produk
                </h2>
                <button onClick={toggleForm} className="bg-purple-600 text-white px-4 py-2 rounded-full font-semibold flex items-center gap-2 hover:bg-purple-700 transition shadow-md hover:shadow-lg">
                    <Plus size={18} /> {showForm && !editingProdukId ? 'Batal' : 'Tambah'}
                </button>
            </div>

            {/* Search and Filter */}
            <div className="mb-4">
                <input type="text" placeholder="Cari produk..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 text-slate-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>

            <div className="mb-6">
                <h3 className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                    <Filter size={12} /> Urutkan Berdasarkan
                </h3>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-5 px-5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {Object.entries(SORT_OPTIONS).map(([key, label]) => (
                        <button key={key} onClick={() => setSortBy(key)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${sortBy === key ? 'bg-purple-600 text-white shadow' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            {/* Form Tambah Produk */}
            <div className={`fixed inset-0 z-50 transition-colors duration-300 ${showForm ? 'bg-black/40' : 'bg-transparent pointer-events-none'}`}>
                <div className={`absolute inset-y-0 left-0 w-full max-w-md bg-white shadow-2xl transition-transform duration-300 ease-in-out transform ${showForm ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="h-full flex flex-col">
                        <form onSubmit={simpanProduk} className="flex-1 flex flex-col p-5 overflow-y-auto">
                            <h3 className="font-bold text-purple-800 mb-4 text-lg">{editingProdukId ? 'Edit Produk' : 'Tambah Produk'}</h3>
                            <div className="flex-grow space-y-3">
                                <input type="text" placeholder="Nama Produk" value={nama} onChange={(e) => setNama(e.target.value)} className="w-full p-3 text-slate-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                                <input type="number" placeholder="Harga per Box ke Toko (Rp)" value={hargaPerBox} onChange={(e) => setHargaPerBox(e.target.value)} className="w-full p-3 text-slate-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                                <input type="number" placeholder="Harga Jual Toko per Pcs (Rp)" value={hargaJualPerPcs} onChange={(e) => setHargaJualPerPcs(e.target.value)} className="w-full p-3 text-slate-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                                <input type="number" placeholder="Isi per Box (pcs)" value={isiPerBox} onChange={(e) => setIsiPerBox(e.target.value)} className="w-full p-3 text-slate-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                                <label className="flex items-center cursor-pointer">
                                    <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} className="mr-2 h-4 w-4 text-purple-600 rounded focus:ring-purple-500" />
                                    <span className="text-gray-700">Tersedia untuk ditawarkan</span>
                                </label>
                                <input type="text" placeholder="URL Foto (opsional)" value={foto} onChange={(e) => setFoto(e.target.value)} className="w-full p-3 text-slate-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button type="button" onClick={toggleForm} className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition">
                                    Batal
                                </button>
                                <button type="submit" className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition">
                                    {editingProdukId ? 'Update' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Daftar Produk */}
            {loading ? (
                <div className="text-center py-10 text-purple-700">Memuat katalog...</div>
            ) : produkList.length === 0 ? (
                <div className="text-center py-10 text-gray-500 bg-slate-50 rounded-xl">
                    Belum ada produk. <br /> <span className="text-sm">Klik "Tambah" untuk membuat produk baru.</span>
                </div>
            ) : filteredProduk.length === 0 ? (
                <div className="text-center text-gray-500 py-10">Belum ada produk.</div>
            ) : (
                <div>
                    {filteredProduk.map((produk) => {
                        // ✅ Pastikan field wajib ada
                        if (produk.hargaPerBox == null || produk.hargaJualPerPcs == null || produk.isiPerBox == null) {
                            // Log error or handle gracefully if data is malformed
                            console.warn('Produk dengan data tidak lengkap:', produk);
                            return null; // Skip rendering malformed products
                        }
                        return safeRender(produk);
                    })}
                </div>
            )}
            {produkList.length > 0 && (
                <div className="mt-8 text-center text-xs text-slate-500">
                    <div className="flex items-center justify-center gap-1 mb-1">
                        <CheckCircle2 size={14} className="text-green-500" />
                        <span>Data disimpan di cloud</span>
                    </div>
                    <p>
                        Total: {filteredProduk.length} produk {searchTerm && `(dari ${produkList.length} total)`}
                    </p>
                </div>
            )}
        </div>
    );
}
