// src/pages/TokoPage.jsx
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Store, Plus, Trash2, Pencil, CheckCircle2, Calendar, Filter, ArrowLeft } from 'lucide-react';
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
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [nama, setNama] = useState('');
    const [kode, setKode] = useState('');
    const [jadwalKunjungan, setJadwalKunjungan] = useState([]);
    const [searchTerm, setSearchTerm] = useState(''); // New state for search term
    const [nomorWa, setNomorWa] = useState('');
    const [filterHari, setFilterHari] = useState('semua');

    // Load data
    useEffect(() => {
        const loadToko = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'toko'));
                const list = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    // Ambil jadwalKunjungan, pastikan array
                    const jadwal = Array.isArray(data.jadwalKunjungan) ? data.jadwalKunjungan.filter((h) => HARI.includes(h)) : [];
                    return {
                        id: doc.id,
                        ...data,
                        jadwalKunjungan: jadwal,
                    };
                });
                setTokoList(list);
            } catch (error) {
                console.error('Error load toko:', error);
                alert('Gagal memuat data toko.');
            } finally {
                setLoading(false);
            }
        };
        loadToko();
    }, []);

    const resetForm = () => {
        setNama('');
        setKode('');
        setJadwalKunjungan([]);
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

        const tokoData = {
            nama: nama.trim(),
            kode: kode.trim() || '-',
            jadwalKunjungan: jadwalKunjungan, // Ensure this is an array of strings
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

    const hapusToko = async (id) => {
        if (!confirm('Hapus toko ini?')) return;
        try {
            await deleteDoc(doc(db, 'toko', id));
            setTokoList(tokoList.filter((t) => t.id !== id));
        } catch (error) {
            console.error('Error hapus toko:', error);
            alert('Gagal menghapus toko.');
        }
    };

    const formatHari = (hariList) => {
        if (hariList.length === 0) return 'Tidak ada jadwal';
        return hariList.map((h) => HARI_LABEL[h]).join(', ');
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
                <div className="text-center py-10 text-purple-700">Memuat toko...</div>
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
                        <div key={toko.id} className="bg-white rounded-xl p-4 border border-gray-200">
                            <div className="flex justify-between">
                                <div>
                                    <h3 className="font-bold text-base text-slate-800">{toko.nama}</h3>
                                    <p className="text-xs text-slate-600 mt-1">
                                        Kode: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{toko.kode}</span>
                                    </p>
                                    {toko.nomorWa && (
                                        <a href={`https://wa.me/${toko.nomorWa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-green-700 mt-2 hover:underline">
                                            <MessageSquare size={12} /> {toko.nomorWa}
                                        </a>
                                    )}
                                    <div className="mt-2 flex bg-purple-100 w-fit px-1.5 py-0.5 rounded-lg items-center gap-1 text-xs text-purple-700">
                                        <Calendar size={12} className="text-purple-600" />
                                        <span>{formatHari(toko.jadwalKunjungan)}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Dibuat: {toko.createdAt && toko.createdAt.seconds ? new Date(toko.createdAt.seconds * 1000).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openEditForm(toko)} className="p-1 rounded-full hover:bg-blue-100 text-blue-500 transition-colors">
                                        <Pencil size={14} />
                                    </button>
                                    <button onClick={() => hapusToko(toko.id)} className="p-1 rounded-full hover:bg-red-100 text-red-500 transition-colors">
                                        <Trash2 size={14} />
                                    </button>
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
        </div>
    );
}
