// src/pages/VisitPage.jsx
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format } from 'date-fns';
import { db } from '../lib/firebase';
import { Store, Package, Plus, Minus, CheckCircle2, XCircle, ChevronDown, MapPin, ArrowLeft, ShoppingCart, Calendar, Pencil, Trash2, Wallet, Search, CalendarRange } from 'lucide-react';

export default function VisitPage() {
    // State untuk daftar kunjungan
    const [kunjunganList, setKunjunganList] = useState([]);
    const [loading, setLoading] = useState(true);

    // State untuk form
    const [showForm, setShowForm] = useState(false);
    const [tokoList, setTokoList] = useState([]);
    const [produkList, setProdukList] = useState([]);
    const [selectedTokoId, setSelectedTokoId] = useState('');
    const [catatan, setCatatan] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [editingVisitId, setEditingVisitId] = useState(null);
    const [cart, setCart] = useState({}); // { productId: jumlahBox }
    const [isTokoDropdownOpen, setIsTokoDropdownOpen] = useState(false);
    const [isDataLoaded, setIsDataLoaded] = useState(false); // Untuk load data form sekali saja
    const [searchTerm, setSearchTerm] = useState('');
    // State untuk filter tanggal
    const [filterType, setFilterType] = useState('today'); // 'today', 'custom'
    const [customDate, setCustomDate] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);

    // Load daftar kunjungan
    useEffect(() => {
        fetchKunjungan();
    }, []);

    const loadFormData = async () => {
        if (isDataLoaded) return; // Jangan load ulang jika sudah ada
        try {
            const [tokoSnap, produkSnap] = await Promise.all([getDocs(collection(db, 'toko')), getDocs(collection(db, 'produk'))]);
            const tokoData = tokoSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            const produkData = produkSnap.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                // Urutkan: produk tersedia di atas, lalu berdasarkan nama
                .sort((a, b) => (a.available === b.available ? a.nama.localeCompare(b.nama) : a.available ? -1 : 1));

            setTokoList(tokoData);
            setProdukList(produkData);
            if (tokoData.length > 0 && !selectedTokoId) {
                setSelectedTokoId(tokoData[0].id);
            }
            setIsDataLoaded(true);
        } catch (error) {
            console.error('Error load data:', error);
            alert('Gagal memuat data toko/produk.');
        }
    };

    // Load data untuk form (toko & produk) saat form dibuka
    useEffect(() => {
        if (showForm && !isDataLoaded) {
            loadFormData();
        }
    }, [showForm, isDataLoaded]);

    const fetchKunjungan = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'kunjungan'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setKunjunganList(list);
        } catch (error) {
            console.error('Error fetching kunjungan:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectToko = (tokoId) => {
        setSelectedTokoId(tokoId);
        setIsTokoDropdownOpen(false);
    };

    const updateQty = (productId, delta) => {
        setCart((prev) => {
            const current = prev[productId] || 0;
            const newQty = Math.max(0, current + delta);
            const newCart = { ...prev, [productId]: newQty };
            if (newQty === 0) delete newCart[productId]; // Hapus dari cart jika qty 0
            return newCart;
        });
    };

    const getTotalHarga = (produk) => {
        const qty = cart[produk.id] || 0;
        return qty * (produk.hargaPerBox || 0);
    };

    const getGrandTotal = () => {
        return produkList.reduce((sum, produk) => {
            return sum + getTotalHarga(produk);
        }, 0);
    };

    const getTotalBoxes = () => {
        return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTokoId) {
            alert('Pilih toko terlebih dahulu!');
            return;
        }

        const items = produkList
            .filter((produk) => cart[produk.id] > 0)
            .map((produk) => ({
                productId: produk.id,
                nama: produk.nama,
                hargaPerBox: produk.hargaPerBox,
                isiPerBox: produk.isiPerBox,
                qtyBox: cart[produk.id],
                total: getTotalHarga(produk),
            }));

        const selectedToko = tokoList.find((t) => t.id === selectedTokoId);

        const kunjunganData = {
            tokoId: selectedTokoId,
            tokoNama: selectedToko?.nama || 'Toko Tidak Diketahui',
            kodeToko: selectedToko?.kode || '',
            items,
            catatan: catatan.trim(),
            total: getGrandTotal(),
            // createdAt tidak diupdate saat edit
        };

        setSubmitting(true);
        try {
            if (editingVisitId) {
                // Update
                const visitRef = doc(db, 'kunjungan', editingVisitId);
                await updateDoc(visitRef, kunjunganData);
                alert('Kunjungan berhasil diperbarui!');
            } else {
                // Create
                await addDoc(collection(db, 'kunjungan'), {
                    ...kunjunganData,
                    createdAt: serverTimestamp(),
                });
                alert('Kunjungan berhasil disimpan!');
            }

            // Reset
            resetForm();
            fetchKunjungan(); // Muat ulang daftar kunjungan
        } catch (error) {
            console.error('Error saving visit:', error);
            alert('Gagal menyimpan kunjungan.');
        } finally {
            setSubmitting(false);
        }
    };

    const openForm = async () => {
        // Pastikan data form sudah ada sebelum menampilkan
        await loadFormData();
        setShowForm(true);
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingVisitId(null);
        setCart({});
        setCatatan('');
        setSelectedTokoId(tokoList.length > 0 ? tokoList[0].id : '');
    };

    const handleEdit = async (kunjungan) => {
        // Pastikan data form (terutama tokoList) sudah dimuat sebelum mengisi state
        await loadFormData();
        setEditingVisitId(kunjungan.id);
        setSelectedTokoId(kunjungan.tokoId);
        setCatatan(kunjungan.catatan || '');

        // Buat ulang cart dari data kunjungan
        const initialCart = kunjungan.items.reduce((acc, item) => {
            acc[item.productId] = item.qtyBox;
            return acc;
        }, {});
        setCart(initialCart);

        setShowForm(true);
    };

    const handleDelete = async (visitId) => {
        if (!confirm('Apakah Anda yakin ingin menghapus kunjungan ini?')) {
            return;
        }
        try {
            await deleteDoc(doc(db, 'kunjungan', visitId));
            alert('Kunjungan berhasil dihapus.');
            fetchKunjungan(); // Muat ulang daftar
        } catch (error) {
            console.error('Error deleting visit:', error);
            alert('Gagal menghapus kunjungan.');
        }
    };

    const filteredKunjungan = kunjunganList
        .filter((kunjungan) => {
            if (!kunjungan.createdAt?.seconds) return false;
            const visitDate = new Date(kunjungan.createdAt.seconds * 1000);

            if (filterType === 'today') {
                const today = new Date();
                return visitDate.getDate() === today.getDate() && visitDate.getMonth() === today.getMonth() && visitDate.getFullYear() === today.getFullYear();
            }
            if (filterType === 'custom') {
                return visitDate.getDate() === customDate.getDate() && visitDate.getMonth() === customDate.getMonth() && visitDate.getFullYear() === customDate.getFullYear();
            }
            return true; // Should not happen if filterType is always 'today' or 'custom'
        })
        .filter((kunjungan) => kunjungan.tokoNama.toLowerCase().includes(searchTerm.toLowerCase()) || (kunjungan.kodeToko && kunjungan.kodeToko.toLowerCase().includes(searchTerm.toLowerCase())));

    const handleDateSelect = (date) => {
        if (date) {
            setCustomDate(date);
            setFilterType('custom');
        }
        setShowCalendar(false);
    };

    if (loading) {
        return <div className="p-5 text-center text-purple-700 min-h-[calc(100vh-120px)] flex items-center justify-center">Memuat data...</div>;
    }

    return (
        <>
            {/* Halaman Utama: Daftar Kunjungan */}
            <div className="p-5 pb-20 max-w-md mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <MapPin className="text-purple-600" />
                        Riwayat Kunjungan
                    </h2>
                    <button onClick={openForm} className="bg-purple-600 text-white px-4 py-2 rounded-full font-semibold flex items-center gap-2 hover:bg-purple-700 transition shadow-md hover:shadow-lg">
                        <Plus size={18} /> Tambah
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-4">
                    <input type="text" placeholder="Cari nama atau kode toko..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 pl-10 text-slate-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                </div>

                {/* Filter Tanggal */}
                <div className="relative mb-6 flex items-center gap-2">
                    <button onClick={() => setFilterType('today')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${filterType === 'today' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300'}`}>
                        <Calendar size={16} />
                        Hari Ini
                    </button>
                    <button onClick={() => setShowCalendar(!showCalendar)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${filterType === 'custom' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300'}`}>
                        <CalendarRange size={16} />
                        {filterType === 'custom' ? format(customDate, 'd MMM yyyy') : 'Pilih Tanggal'}
                    </button>

                    {showCalendar && (
                        <div className="absolute top-full mt-2 z-20 bg-white rounded-2xl shadow-2xl border p-2" onMouseLeave={() => setShowCalendar(false)}>
                            <DayPicker
                                mode="single"
                                selected={customDate}
                                onSelect={handleDateSelect}
                                captionLayout="dropdown-buttons"
                                fromYear={2020}
                                toYear={new Date().getFullYear() + 1}
                                classNames={{
                                    caption_label: 'text-lg font-bold',
                                    head_cell: 'font-semibold',
                                    day_selected: 'bg-purple-600 text-white rounded-full hover:bg-purple-700 focus:bg-purple-700',
                                    day_today: 'font-bold text-purple-600',
                                }}
                            />
                        </div>
                    )}
                </div>

                {filteredKunjungan.length === 0 ? (
                    <div className="text-center text-gray-500 py-10 bg-slate-50 rounded-lg">
                        <ShoppingCart size={40} className="mx-auto text-gray-400 mb-2" />
                        {searchTerm ? 'Kunjungan tidak ditemukan.' : 'Belum ada kunjungan yang tercatat.'}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredKunjungan.map((kunjungan) => {
                            const totalBoxes = kunjungan.items.reduce((sum, item) => sum + item.qtyBox, 0);
                            return (
                                <div key={kunjungan.id} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-purple-200">
                                    {/* Header Kartu */}
                                    <div className="p-4 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-xl shadow-inner">{kunjungan.tokoNama.charAt(0).toUpperCase()}</div>
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-slate-800 text-lg">{kunjungan.tokoNama}</h3>
                                                {kunjungan.kodeToko && <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">{kunjungan.kodeToko}</span>}
                                            </div>
                                            <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                                <Calendar size={12} />
                                                <span>{kunjungan.createdAt ? new Date(kunjungan.createdAt.seconds * 1000).toLocaleString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Baru saja'}</span>
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <button onClick={() => handleEdit(kunjungan)} className="p-2 rounded-full hover:bg-blue-100 text-blue-600 transition-colors">
                                                <Pencil size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(kunjungan.id)} className="p-2 rounded-full hover:bg-red-100 text-red-600 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Detail & Catatan */}
                                    <div className="px-4 pb-4 space-y-3">
                                        {kunjungan.catatan && <div className="text-sm italic bg-yellow-50 border-l-4 border-yellow-400 p-3 text-yellow-800 rounded-r-lg">"{kunjungan.catatan}"</div>}
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="bg-slate-100 p-3 rounded-lg flex items-center justify-between">
                                                <span className="text-slate-500 flex items-center gap-1.5">
                                                    <Package size={14} /> Order
                                                </span>
                                                <span className="font-bold text-slate-700">{totalBoxes} box</span>
                                            </div>
                                            <div className="bg-green-50 p-3 rounded-lg flex items-center justify-end gap-2">
                                                <span className="text-green-700 flex items-center gap-1.5">
                                                    <Wallet size={14} />
                                                </span>
                                                <span className="font-bold text-green-800">Rp{kunjungan.total.toLocaleString('id-ID')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Form Tambah Kunjungan (Slide-in) */}
            <div className={`fixed inset-0 z-50 transition-colors duration-300 ${showForm ? 'bg-black/40' : 'bg-transparent pointer-events-none'}`}>
                <div className={`absolute inset-y-0 left-0 w-full max-w-md bg-slate-50 shadow-2xl transition-transform duration-300 ease-in-out transform ${showForm ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between p-4 bg-white border-b">
                            <button type="button" onClick={resetForm} className="p-2 rounded-full hover:bg-slate-100">
                                <ArrowLeft size={20} />
                            </button>
                            <h2 className="text-lg font-bold text-slate-800">{editingVisitId ? 'Edit Kunjungan' : 'Tambah Kunjungan'}</h2>
                            <div className="w-10"></div> {/* Spacer */}
                        </div>

                        <form id="visit-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">
                            {/* Pilih Toko */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Toko yang Dikunjungi</label>
                                <div className="relative" style={{ pointerEvents: editingVisitId ? 'none' : 'auto', opacity: editingVisitId ? 0.7 : 1 }}>
                                    <button type="button" onClick={() => setIsTokoDropdownOpen(!isTokoDropdownOpen)} className="w-full p-3 text-left bg-white border border-gray-300 rounded-lg flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-purple-500">
                                        <span className="flex items-center gap-2">
                                            <Store size={18} className="text-slate-500" />
                                            {tokoList.find((t) => t.id === selectedTokoId)?.nama || 'Pilih Toko'}
                                        </span>
                                        <ChevronDown size={20} className={`transition-transform ${isTokoDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isTokoDropdownOpen && (
                                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {tokoList.map((toko) => (
                                                <div key={toko.id} onClick={() => handleSelectToko(toko.id)} className={`p-3 cursor-pointer hover:bg-purple-50 flex justify-between items-center ${selectedTokoId === toko.id ? 'bg-purple-100 font-semibold' : ''}`}>
                                                    <span>
                                                        {toko.nama}
                                                        {toko.kode && <span className="text-xs text-slate-500 ml-2">({toko.kode})</span>}
                                                    </span>
                                                    {selectedTokoId === toko.id && <CheckCircle2 size={16} className="text-purple-600" />}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Catatan */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Catatan (Opsional)</label>
                                <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan hasil kunjungan..." className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" rows="3" />
                            </div>

                            {/* Daftar Produk */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Package className="text-purple-600" size={18} />
                                    <h3 className="text-lg font-semibold text-slate-800">Pilih Produk</h3>
                                </div>

                                {produkList.length === 0 ? (
                                    <div className="text-center py-4 text-gray-500 bg-slate-100 rounded-lg">Memuat produk...</div>
                                ) : (
                                    <div className="space-y-3">
                                        {produkList.map((produk) => {
                                            const qty = cart[produk.id] || 0;
                                            const isAvailable = produk.available;
                                            return (
                                                <div key={produk.id} className={`rounded-xl p-3 border transition-all duration-300 ${qty > 0 ? 'bg-green-500 border-green-300' : 'bg-white border-gray-200'} ${!isAvailable ? 'bg-slate-100 border-slate-200' : ''}`}>
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative w-16 h-16 flex-shrink-0">
                                                            <img
                                                                src={produk.foto || 'https://via.placeholder.com/100?text=Produk'}
                                                                alt={produk.nama}
                                                                className={`w-full h-full object-contain rounded-lg ${!isAvailable ? 'grayscale' : ''}`}
                                                                onError={(e) => {
                                                                    e.target.src = 'https://via.placeholder.com/100?text=Produk';
                                                                }}
                                                            />
                                                            {!isAvailable && (
                                                                <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg">
                                                                    <span className="text-xs font-bold text-red-600">Habis</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-grow">
                                                            <h4 className={`font-bold text-slate-800 ${!isAvailable ? 'line-through text-slate-500' : ''}`}>{produk.nama}</h4>
                                                            <p className="text-sm text-slate-600 mt-1">Rp{(produk.hargaPerBox || 0).toLocaleString('id-ID')} / box</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <button type="button" onClick={() => updateQty(produk.id, -1)} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-300 disabled:opacity-50" disabled={qty === 0 || !isAvailable}>
                                                                <Minus size={16} />
                                                            </button>
                                                            <span className="w-8 text-center font-bold text-lg text-purple-700">{qty}</span>
                                                            <button type="button" onClick={() => updateQty(produk.id, 1)} className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white hover:bg-purple-700 disabled:opacity-50 disabled:bg-slate-300" disabled={!isAvailable}>
                                                                <Plus size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </form>

                        {/* Total & Submit (Sticky di bawah form) */}
                        <div className="bg-white/80 backdrop-blur-sm py-4 px-5 border-t border-gray-200">
                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 mb-4">
                                <div className="flex justify-between items-center text-sm font-medium text-purple-700 mb-2">
                                    <span>Total Box</span>
                                    <span>{getTotalBoxes()} box</span>
                                </div>
                                <div className="flex justify-between items-center text-lg font-bold text-purple-800">
                                    <span>Total Belanja</span>
                                    <span>Rp{getGrandTotal().toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                            <button type="submit" form="visit-form" disabled={submitting || !selectedTokoId} className="w-full py-4 bg-purple-600 text-white rounded-lg font-bold text-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                {submitting ? 'Menyimpan...' : 'Simpan Kunjungan'}
                                <CheckCircle2 size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
