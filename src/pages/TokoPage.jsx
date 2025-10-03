// src/pages/TokoPage.jsx
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Loader from '../components/Loader';
import { Store, Plus, Trash2, Pencil, CheckCircle2, Calendar, Filter, ArrowLeft, Package, MapPin, AlertTriangle } from 'lucide-react';
import { MessageSquare } from 'lucide-react'; // Import MessageSquare
const HARI = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

const HARI_LABEL = {
    senin: 'Senin',
    selasa: 'Selasa',
    rabu: 'Rabu',
    kamis: 'Kamis',
    jumat: 'Jumat',
    sabtu: 'Sabtu',
};

export default function TokoPage() {
    const [tokoList, setTokoList] = useState([]);
    const [kunjunganList, setKunjunganList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [nama, setNama] = useState('');
    const [kode, setKode] = useState('');
    const [jadwalKunjungan, setJadwalKunjungan] = useState([]);
    const [kodeFreezer, setKodeFreezer] = useState(''); // New state for kodeFreezer
    const [searchTerm, setSearchTerm] = useState(''); // New state for search term
    const [nomorWa, setNomorWa] = useState('');
    const [filterHari, setFilterHari] = useState('semua');

    // State untuk modal konfirmasi hapus
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // Load data
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [tokoSnapshot, kunjunganSnapshot] = await Promise.all([getDocs(collection(db, 'toko')), getDocs(collection(db, 'kunjungan'))]);

                const tokoData = tokoSnapshot.docs.map((doc) => {
                    const data = doc.data();
                    // Ambil jadwalKunjungan, pastikan array
                    const jadwal = Array.isArray(data.jadwalKunjungan) ? data.jadwalKunjungan.filter((h) => HARI.includes(h)) : [];
                    return {
                        id: doc.id,
                        ...data,
                        kodeFreezer: data.kodeFreezer || '', // Ensure kodeFreezer exists
                        jadwalKunjungan: jadwal,
                    };
                });

                const kunjunganData = kunjunganSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

                setTokoList(tokoData);
                setKunjunganList(kunjunganData);
            } catch (error) {
                console.error('Error load data:', error);
                alert('Gagal memuat data toko.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const resetForm = () => {
        setNama('');
        setKode('');
        setJadwalKunjungan([]);
        setKodeFreezer(''); // Reset kodeFreezer
        setNomorWa('');
        setEditingId(null);
        setShowForm(false);
    };

    const toggleForm = () => {
        resetForm();
        setShowForm(!showForm);
    };

    const openEditForm = (toko) => {
        setEditingId(toko.id);
        setNama(toko.nama || '');
        setKode(toko.kode || '');
        setKodeFreezer(toko.kodeFreezer || ''); // Set kodeFreezer for editing
        setJadwalKunjungan(Array.isArray(toko.jadwalKunjungan) ? toko.jadwalKunjungan : []);
        setNomorWa(toko.nomorWa || '');
        setShowForm(true);
    };

    const toggleHari = (hari) => {
        setJadwalKunjungan((prev) => (prev.includes(hari) ? prev.filter((h) => h !== hari) : [...prev, hari]));
    };

    const handleNomorWaChange = (e) => {
        let value = e.target.value.replace(/[^0-9]/g, ''); // Hanya izinkan angka

        if (value.startsWith('08')) {
            value = '628' + value.substring(2);
        }
        setNomorWa(value);
    };

    const simpanToko = async (e) => {
        e.preventDefault();
        if (!nama.trim()) {
            alert('Nama toko wajib diisi!');
            return;
        }

        // Validasi: Cek duplikasi berdasarkan kombinasi nama dan kode toko
        const trimmedNama = nama.trim().toLowerCase();
        const trimmedKode = (kode.trim() || '-').toLowerCase();
        const isDuplicate = tokoList.some((toko) => toko.nama.toLowerCase() === trimmedNama && (toko.kode || '-').toLowerCase() === trimmedKode && toko.id !== editingId);

        if (isDuplicate) {
            alert('Kombinasi nama dan kode toko ini sudah ada. Mohon gunakan kombinasi lain.');
            return;
        }

        // Validasi: Cek duplikasi kode freezer (jika diisi)
        const trimmedKodeFreezer = kodeFreezer.trim();
        if (trimmedKodeFreezer) {
            const isFreezerDuplicate = tokoList.some((toko) => toko.kodeFreezer && toko.kodeFreezer.toLowerCase() === trimmedKodeFreezer.toLowerCase() && toko.id !== editingId);

            if (isFreezerDuplicate) {
                alert(`Kode freezer "${trimmedKodeFreezer}" sudah digunakan oleh toko lain. Mohon gunakan kode yang unik.`);
                return;
            }
        }

        const tokoData = {
            nama: nama.trim(),
            kode: kode.trim() || '-',
            jadwalKunjungan: jadwalKunjungan, // Ensure this is an array of strings
            kodeFreezer: kodeFreezer.trim(), // Include kodeFreezer
            nomorWa: nomorWa.trim(),
        };

        try {
            if (editingId) {
                // 🔧 Update
                await updateDoc(doc(db, 'toko', editingId), tokoData);
                // Perbarui state lokal tanpa refetch
                setTokoList((prevList) => prevList.map((toko) => (toko.id === editingId ? { ...toko, ...tokoData } : toko)));
            } else {
                // ➕ Create
                const docRef = await addDoc(collection(db, 'toko'), {
                    ...tokoData,
                    createdAt: serverTimestamp(), // Use serverTimestamp for new documents
                });
                // Tambahkan ke state lokal tanpa refetch
                // Kita gunakan new Date() untuk tampilan sementara, serverTimestamp akan update saat reload
                setTokoList((prevList) => [...prevList, { id: docRef.id, ...tokoData, createdAt: { seconds: Date.now() / 1000 } }]);
            }

            resetForm();
        } catch (error) {
            console.error('Error simpan toko:', error);
            alert('Gagal menyimpan toko.');
        }
    };

    const handleCopy = (textToCopy, fieldName) => {
        if (!textToCopy || textToCopy === '-') return;
        navigator.clipboard
            .writeText(textToCopy)
            .then(() => {
                alert(`${fieldName} "${textToCopy}" berhasil disalin.`);
            })
            .catch((err) => {
                console.error('Gagal menyalin teks: ', err);
                alert('Gagal menyalin teks.');
            });
    };

    const openDeleteConfirm = (toko) => {
        setItemToDelete(toko);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            await deleteDoc(doc(db, 'toko', itemToDelete.id));
            setTokoList(tokoList.filter((t) => t.id !== itemToDelete.id));
            setShowDeleteConfirm(false);
            setItemToDelete(null);
        } catch (error) {
            console.error('Error hapus toko:', error);
            alert('Gagal menghapus toko.'); //
        }
    };

    const formatHari = (hariList) => {
        if (hariList.length === 0) return 'Tidak ada jadwal';
        return hariList.map((h) => HARI_LABEL[h]).join(', ');
    };

    // Fungsi untuk menghitung statistik per toko
    const getTokoStats = (tokoId) => {
        const kunjunganToko = kunjunganList.filter((k) => k.tokoId === tokoId);
        const totalKunjungan = kunjunganToko.length;
        const totalBox = kunjunganToko.reduce((sum, kunjungan) => sum + (kunjungan.items?.reduce((itemSum, item) => itemSum + item.qtyBox, 0) || 0), 0);
        return { totalKunjungan, totalBox };
    };
    // Filtered list of stores based on search term
    const filteredToko = tokoList
        .filter((toko) => {
            // Filter by day
            if (filterHari === 'semua') {
                return true;
            }
            // Check if the store's schedule includes the selected day
            return toko.jadwalKunjungan && toko.jadwalKunjungan.includes(filterHari);
        })
        .filter((toko) => {
            // Filter by search term
            const term = searchTerm.toLowerCase();
            return toko.nama.toLowerCase().includes(term) || (toko.kode && toko.kode.toLowerCase().includes(term));
        });

    return (
        <div className="p-5 pb-20 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Store className="text-purple-600" size={20} />
                    <h1 className="text-2xl font-bold text-slate-800">Daftar Toko</h1>
                </div>
                <button onClick={toggleForm} className="bg-purple-600 text-white px-4 py-2 rounded-full font-semibold flex items-center gap-2 hover:bg-purple-700 transition shadow-md">
                    <Plus size={18} /> {showForm ? 'Batal' : 'Tambah'}
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
                <input type="text" placeholder="Cari nama atau kode toko..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>

            {/* Filter Hari (Listbox style) */}
            <div className="mb-6">
                <h3 className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                    <Filter size={12} /> Filter Jadwal
                </h3>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-5 px-5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {['semua', ...HARI].map((hari) => (
                        <button key={hari} onClick={() => setFilterHari(hari)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filterHari === hari ? 'bg-purple-600 text-white shadow' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}>
                            {hari === 'semua' ? 'Semua Hari' : HARI_LABEL[hari]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Form */}
            <div className={`fixed inset-0 z-50 transition-colors duration-300 ${showForm ? 'bg-black/40' : 'bg-transparent pointer-events-none'}`}>
                <div className={`absolute inset-y-0 left-0 w-full max-w-md bg-slate-50 shadow-2xl transition-transform duration-300 ease-in-out transform ${showForm ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between p-4 bg-white">
                            <button type="button" onClick={toggleForm} className="p-2 rounded-full hover:bg-slate-100">
                                <ArrowLeft size={20} />
                            </button>
                            <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Toko' : 'Tambah Toko Baru'}</h2>
                            <div className="w-10"></div> {/* Spacer */}
                        </div>

                        <form id="toko-form" onSubmit={simpanToko} className="flex-1 overflow-y-auto p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Toko *</label>
                                <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Contoh: Toko Jaya Abadi" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Kode Toko (Opsional)</label>
                                <input type="text" value={kode} onChange={(e) => setKode(e.target.value)} placeholder="Contoh: TJ001" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Kode Freezer (Opsional)</label>
                                <input type="text" value={kodeFreezer} onChange={(e) => setKodeFreezer(e.target.value)} placeholder="Contoh: FZ001" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nomor WhatsApp (Opsional)</label>
                                <input type="tel" value={nomorWa} onChange={handleNomorWaChange} placeholder="Contoh: 628123456789" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>

                            {/* Jadwal Kunjungan */}
                            <div className=" pt-4">
                                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                                    <Calendar size={16} className="text-purple-600" />
                                    Hari Kunjungan
                                </h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {HARI.map((hari) => (
                                        <label key={hari} className={`flex items-center justify-center p-2 rounded-lg cursor-pointer transition ${jadwalKunjungan.includes(hari) ? 'bg-purple-100 text-purple-700 border border-purple-300' : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'}`}>
                                            <input type="checkbox" checked={jadwalKunjungan.includes(hari)} onChange={() => toggleHari(hari)} className="sr-only" />
                                            <span className="font-medium">{HARI_LABEL[hari]}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </form>

                        <div className="bg-white/80 backdrop-blur-sm py-4 px-5 border-t border-gray-200">
                            <button type="submit" form="toko-form" className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition">
                                {editingId ? 'Update Toko' : 'Simpan Toko'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Daftar Toko */}
            {loading ? (
                <div className="py-10">
                    <div className="flex items-center justify-center">
                        <Loader text="Memuat daftar toko..." />
                    </div>
                </div>
            ) : tokoList.length === 0 ? (
                <div className="text-center py-10 text-gray-500 bg-slate-50 rounded-xl">
                    Belum ada toko.
                    <br />
                    <span className="text-sm">Klik "Tambah" untuk membuat toko baru.</span>
                </div>
            ) : filteredToko.length === 0 ? (
                <div className="text-center py-10 text-gray-500 bg-slate-50 rounded-xl">Tidak ada toko yang cocok dengan pencarian Anda.</div>
            ) : (
                <div className="space-y-4">
                    {filteredToko.map((toko) => (
                        <div key={toko.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div className="flex-grow">
                                    <h3 className="font-bold text-base text-slate-800 pr-4">{toko.nama}</h3>
                                    <p className="text-xs text-slate-600 mt-1">
                                        Kode:{' '}
                                        <span onClick={() => handleCopy(toko.kode, 'Kode Toko')} title="Klik untuk salin" className="font-mono bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer hover:bg-slate-200 active:bg-slate-300 transition-colors">
                                            {toko.kode}
                                        </span>
                                    </p>
                                    <p className="text-xs text-slate-600 mt-1">
                                        Freezer:{' '}
                                        <span onClick={() => handleCopy(toko.kodeFreezer, 'Kode Freezer')} title="Klik untuk salin" className="font-mono bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer hover:bg-slate-200 active:bg-slate-300 transition-colors">
                                            {toko.kodeFreezer || '-'}
                                        </span>
                                    </p>
                                    <div className="mt-3 space-y-2">
                                        {toko.nomorWa && (
                                            <a href={`https://wa.me/${toko.nomorWa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-green-700 hover:underline">
                                                <MessageSquare size={12} /> {toko.nomorWa}
                                            </a>
                                        )}
                                        <div className="flex items-center gap-1 text-xs text-purple-700">
                                            <Calendar size={12} className="text-purple-600" />
                                            <span>{formatHari(toko.jadwalKunjungan)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <button onClick={() => openEditForm(toko)} className="p-1 rounded-full hover:bg-blue-100 text-blue-500 transition-colors">
                                        <Pencil size={14} />
                                    </button>
                                    <button onClick={() => openDeleteConfirm(toko)} className="p-1 rounded-full hover:bg-red-100 text-red-500 transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            {/* Statistik Toko */}
                            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
                                <div>
                                    <p className="text-lg font-bold text-slate-700">{getTokoStats(toko.id).totalKunjungan}</p>
                                    <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                                        <MapPin size={12} /> Kunjungan
                                    </p>
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-slate-700">{getTokoStats(toko.id).totalBox}</p>
                                    <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                                        <Package size={12} /> Box Order
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-8 text-center text-xs text-slate-500">
                <div className="flex items-center justify-center gap-1 mb-1">
                    <CheckCircle2 size={14} className="text-green-500" />
                    <span>Data disimpan di cloud</span>
                </div>
                <p>
                    Total: {filteredToko.length} toko {(searchTerm || filterHari !== 'semua') && `(dari ${tokoList.length} total)`}
                </p>
            </div>

            {/* Modal Konfirmasi Hapus */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 slide-in-from-bottom-5">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto flex items-center justify-center bg-red-100 rounded-full">
                                <Trash2 size={32} className="text-red-600" />
                            </div>
                            <h3 className="mt-4 text-xl font-bold text-slate-800">Hapus Toko?</h3>
                            <p className="mt-2 text-sm text-slate-500">
                                Anda akan menghapus <strong className="text-slate-700">{itemToDelete?.nama}</strong>. Tindakan ini tidak dapat dibatalkan.
                            </p>
                        </div>
                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition">
                                Batal
                            </button>
                            <button onClick={handleConfirmDelete} className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition">
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
