// src/pages/TokoPage.jsx
import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Loader from '../components/Loader'; //
import { Store, Plus, Trash2, Pencil, CheckCircle2, Calendar, Filter, ArrowLeft, Package, MapPin, AlertTriangle, ArrowDownUp, FileUp, FileDown, Send, LocateFixed, Loader2 } from 'lucide-react';
import { MessageSquare } from 'lucide-react'; // Import MessageSquare
import * as XLSX from 'xlsx'; // Import xlsx library

import VisitDetailPage from './VisitDetailPage'; // Import halaman detail kunjungan
import OrderDetailPage from './OrderDetailPage'; // Import halaman detail order
const HARI = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

const HARI_LABEL = {
    senin: 'Senin',
    selasa: 'Selasa',
    rabu: 'Rabu',
    kamis: 'Kamis',
    jumat: 'Jumat',
    sabtu: 'Sabtu',
};

export default function TokoPage({ orderList = [], kunjunganList = [] }) {
    const [tokoList, setTokoList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [isImporting, setIsImporting] = useState(false); // State untuk proses impor
    const [editingId, setEditingId] = useState(null);

    const [nama, setNama] = useState('');
    const [kode, setKode] = useState('');
    const [jadwalKunjungan, setJadwalKunjungan] = useState([]);
    const [kodeFreezer, setKodeFreezer] = useState(''); // New state for kodeFreezer
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [searchTerm, setSearchTerm] = useState(''); // New state for search term
    const [nomorWa, setNomorWa] = useState('');
    const [filterHari, setFilterHari] = useState('semua');
    const [sortBy, setSortBy] = useState('nama-asc'); // State untuk sorting

    // State untuk modal konfirmasi hapus
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // State untuk modal konfirmasi update dari import
    const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
    const [storesToUpdate, setStoresToUpdate] = useState([]);
    const [storesToAdd, setStoresToAdd] = useState([]);

    // State untuk modal broadcast WA
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [broadcastList, setBroadcastList] = useState([]);
    const [broadcastMessage, setBroadcastMessage] = useState('Halo Toko {nama_toko}, kami informasikan akan ada kunjungan besok. Mohon persiapannya, terima kasih.');

    // State untuk menampilkan halaman detail
    const [viewingDetail, setViewingDetail] = useState({ type: null, toko: null });

    // Ref untuk file input
    const fileInputRef = useRef(null);

    // Load data
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const tokoSnapshot = await getDocs(collection(db, 'toko'));
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

                setTokoList(tokoData);
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
        setLatitude('');
        setLongitude('');
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
        setLatitude(toko.latitude || '');
        setLongitude(toko.longitude || '');
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
            latitude: latitude,
            longitude: longitude,
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

    const fetchCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation tidak didukung oleh browser Anda.');
            return;
        }
        setIsFetchingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitude(position.coords.latitude.toFixed(7));
                setLongitude(position.coords.longitude.toFixed(7));
                setIsFetchingLocation(false);
            },
            (error) => {
                alert(`Gagal mendapatkan lokasi: ${error.message}`);
                setIsFetchingLocation(false);
            },
            { enableHighAccuracy: true },
        );
    };

    const handleBroadcastWA = () => {
        if (filterHari === 'semua') {
            alert('Pilih hari spesifik untuk broadcast.');
            return;
        }

        const list = tokoList.filter((toko) => toko.jadwalKunjungan && toko.jadwalKunjungan.includes(filterHari) && toko.nomorWa);

        if (list.length === 0) {
            alert(`Tidak ada toko dengan jadwal hari ${HARI_LABEL[filterHari]} yang memiliki nomor WhatsApp.`);
            return;
        }

        setBroadcastList(list);
        setShowBroadcastModal(true);
    };
    const handleConfirmUpdate = async () => {
        const batch = writeBatch(db);
        let updatedCount = 0;
        let addedCount = 0;

        // Proses update data yang sudah ada
        storesToUpdate.forEach((toko) => {
            const { id, ...tokoData } = toko;
            const tokoRef = doc(db, 'toko', id);
            batch.update(tokoRef, tokoData);
            updatedCount++;
        });

        // Proses tambah data baru
        storesToAdd.forEach((tokoData) => {
            const newTokoRef = doc(collection(db, 'toko'));
            batch.set(newTokoRef, tokoData);
            addedCount++;
        });

        try {
            await batch.commit();
            alert(`Proses selesai: ${updatedCount} toko diperbarui, ${addedCount} toko baru ditambahkan.`);
            window.location.reload(); // Reload untuk sinkronisasi data
        } catch (error) {
            console.error('Error updating/adding stores:', error);
            alert('Gagal memproses data.');
        } finally {
            setShowUpdateConfirm(false);
            setStoresToUpdate([]);
            setStoresToAdd([]);
        }
    };
    const handleFileImport = async (event) => {
        // Fungsi untuk membersihkan dan menormalkan string (nama atau kode)
        const normalizeString = (str) =>
            str
                .toLowerCase()
                .replace(/kh/g, 'h')
                .replace(/[\s().,-]/g, '');

        const file = event.target.files[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length <= 1) {
                alert('File Excel kosong.');
                return;
            }

            const newStores = []; // Untuk data yang benar-benar baru
            const updatedStores = []; // Untuk data yang sudah ada dan akan diupdate
            const processedIdentifiers = new Set(); // Untuk cek duplikasi dalam file Excel

            // Mulai dari baris kedua jika ada header, atau baris pertama jika tidak
            const startRow = typeof jsonData[0][0] === 'string' && jsonData[0][0].toLowerCase() === 'nama' ? 1 : 0;

            for (let i = startRow; i < jsonData.length; i++) {
                const row = jsonData[i];
                const namaToko = row[0]?.trim();

                if (!namaToko) continue; // Lewati baris jika nama toko kosong

                const kodeToko = row[1]?.toString().trim() || '-';
                const kodeFreezerToko = row[2]?.toString().trim() || '';
                const nomorWaToko = row[3]?.toString().trim() || '';
                const jadwalStr = row[4]?.toString().toLowerCase().trim() || '';

                // Proses jadwal
                const jadwalToko = jadwalStr
                    .split(',')
                    .map((h) => h.trim())
                    .filter((h) => HARI.includes(h));

                // Identifier unik untuk setiap toko (nama + kode)
                const identifier = `${normalizeString(namaToko)}|${normalizeString(kodeToko)}`;
                if (processedIdentifiers.has(identifier)) continue; // Lewati jika duplikat di dalam file
                processedIdentifiers.add(identifier);

                const existingToko = tokoList.find((t) => normalizeString(t.nama) === normalizeString(namaToko) && normalizeString(t.kode || '-') === normalizeString(kodeToko));

                const tokoData = {
                    nama: namaToko,
                    kode: kodeToko,
                    kodeFreezer: kodeFreezerToko,
                    nomorWa: nomorWaToko,
                    jadwalKunjungan: jadwalToko,
                };

                if (existingToko) {
                    // Toko sudah ada, siapkan untuk update
                    updatedStores.push({ id: existingToko.id, ...tokoData });
                } else {
                    // Toko baru, siapkan untuk ditambah
                    newStores.push({ ...tokoData, createdAt: serverTimestamp() });
                }
            }

            if (updatedStores.length > 0) {
                // Jika ada data yang sama, tampilkan modal konfirmasi
                setStoresToUpdate(updatedStores);
                setStoresToAdd(newStores); // Simpan juga data baru untuk diproses bersamaan
                setShowUpdateConfirm(true);
            } else if (newStores.length > 0) {
                // Jika hanya ada data baru, langsung proses
                const batch = writeBatch(db);
                newStores.forEach((tokoData) => {
                    const newTokoRef = doc(collection(db, 'toko'));
                    batch.set(newTokoRef, tokoData);
                });
                await batch.commit();
                alert(`${newStores.length} toko baru berhasil diimpor!`);
                window.location.reload();
            } else {
                alert('Tidak ada data baru atau data untuk diperbarui. Semua data mungkin sudah ada dan identik.');
            }
        } catch (error) {
            console.error('Error importing from Excel:', error);
            alert('Gagal mengimpor file. Pastikan format file dan data sudah benar.');
        } finally {
            setIsImporting(false);
            event.target.value = null; // Reset file input
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
        const orderToko = orderList.filter((o) => o.tokoId === tokoId);

        const totalKunjungan = kunjunganToko.length;
        const totalBox = orderToko.reduce((sum, order) => sum + (order.items?.reduce((itemSum, item) => itemSum + item.qtyBox, 0) || 0), 0);

        return { totalKunjungan, totalBox };
    };
    // Filtered and sorted list of stores
    const filteredAndSortedToko = tokoList
        .map((toko) => ({
            ...toko,
            stats: getTokoStats(toko.id), // Pre-calculate stats for sorting
        }))
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
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'nama-desc':
                    return b.nama.localeCompare(a.nama);
                case 'terbaru':
                    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                case 'terlama':
                    return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
                case 'kunjungan-terbanyak':
                    return b.stats.totalKunjungan - a.stats.totalKunjungan;
                case 'box-terbanyak':
                    return b.stats.totalBox - a.stats.totalBox;
                case 'nama-asc':
                default:
                    return a.nama.localeCompare(b.nama);
            }
        });

    if (viewingDetail.type) {
        if (viewingDetail.type === 'kunjungan') {
            return <VisitDetailPage toko={viewingDetail.toko} kunjunganList={kunjunganList} orderList={orderList} onBack={() => setViewingDetail({ type: null, toko: null })} />;
        }
        if (viewingDetail.type === 'order') {
            return <OrderDetailPage toko={viewingDetail.toko} orderList={orderList} onBack={() => setViewingDetail({ type: null, toko: null })} />;
        }
    }

    return (
        <div className="animate-in fade-in duration-300">
            <div className="p-5 pb-20 max-w-md mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Store className="text-purple-600" size={20} />
                        <h1 className="text-2xl font-bold text-slate-800">Daftar Toko</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx, .xls" className="hidden" />
                        <button onClick={() => fileInputRef.current.click()} disabled={isImporting} className="bg-green-600 text-white px-3 py-2 rounded-full font-semibold flex items-center gap-2 hover:bg-green-700 transition shadow-md disabled:opacity-50">
                            <FileUp size={16} />
                            {isImporting ? 'Mengimpor...' : ''}
                        </button>
                        <button onClick={toggleForm} className="bg-purple-600 text-white px-4 py-2 rounded-full font-semibold flex items-center gap-2 hover:bg-purple-700 transition shadow-md">
                            <Plus size={18} /> {showForm ? 'Batal' : 'Tambah'}
                        </button>
                    </div>
                </div>
                <p className="text-xs text-slate-500 -mt-4 mb-4">Format Excel: Kolom A (Nama), B (Kode), C (Kode Freezer), D (WA), E (Hari, pisahkan dengan koma)</p>

                {/* Search Bar */}
                <div className="mb-4 flex items-center gap-2">
                    <input type="text" placeholder="Cari nama atau kode toko..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <div className="relative">
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none w-full bg-white border border-gray-300 rounded-lg p-3 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                            <option value="nama-asc">Nama A-Z</option>
                            <option value="nama-desc">Nama Z-A</option>
                            <option value="terbaru">Terbaru</option>
                            <option value="terlama">Terlama</option>
                            <option value="kunjungan-terbanyak">Kunjungan Terbanyak</option>
                            <option value="box-terbanyak">Box Terbanyak</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            <ArrowDownUp size={16} />
                        </div>
                    </div>
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
                        {/* Tombol Broadcast WA */}
                        <div className="ml-auto pl-2">
                            <button onClick={handleBroadcastWA} disabled={filterHari === 'semua'} className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-200 hover:bg-green-200 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200">
                                <MessageSquare size={14} /> Broadcast WA
                            </button>
                        </div>
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

                                {/* Lokasi GPS */}
                                <div className="pt-4">
                                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                                        <MapPin size={16} className="text-purple-600" />
                                        Lokasi GPS (Opsional)
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Latitude" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                        <input type="text" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Longitude" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                    </div>
                                    <button type="button" onClick={fetchCurrentLocation} disabled={isFetchingLocation} className="mt-2 w-full flex items-center justify-center gap-2 text-sm font-semibold text-purple-700 bg-purple-100 p-2 rounded-lg hover:bg-purple-200 transition disabled:opacity-70">
                                        {isFetchingLocation ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
                                        {isFetchingLocation ? 'Mencari Lokasi...' : 'Gunakan Lokasi Saat Ini'}
                                    </button>
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
                ) : filteredAndSortedToko.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 bg-slate-50 rounded-xl">Tidak ada toko yang cocok dengan pencarian Anda.</div>
                ) : (
                    <div className="space-y-4">
                        {filteredAndSortedToko.map((toko) => (
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
                                            {toko.latitude && toko.longitude && (
                                                <div className="flex items-center gap-1 text-xs text-blue-700">
                                                    <MapPin size={12} className="text-blue-600" />
                                                    <span>GPS Tersimpan</span>
                                                </div>
                                            )}
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
                                    <div onClick={() => setViewingDetail({ type: 'kunjungan', toko })} className="p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                                        <p className="text-lg font-bold text-slate-700">{toko.stats.totalKunjungan}</p>
                                        <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                                            <MapPin size={12} /> Kunjungan
                                        </p>
                                    </div>
                                    <div onClick={() => setViewingDetail({ type: 'order', toko })} className="p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                                        <p className="text-lg font-bold text-slate-700">{toko.stats.totalBox}</p>
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
                        Total: {filteredAndSortedToko.length} toko {(searchTerm || filterHari !== 'semua') && `(dari ${tokoList.length} total)`}
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

                {/* Modal Konfirmasi Update dari Impor */}
                {showUpdateConfirm && (
                    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
                        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 slide-in-from-bottom-5">
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto flex items-center justify-center bg-blue-100 rounded-full">
                                    <FileUp size={32} className="text-blue-600" />
                                </div>
                                <h3 className="mt-4 text-xl font-bold text-slate-800">Konfirmasi Impor</h3>
                                <p className="mt-2 text-sm text-slate-500">
                                    Ditemukan <strong className="text-slate-700">{storesToUpdate.length} data</strong> yang sudah ada di database dan <strong className="text-slate-700">{storesToAdd.length} data baru</strong>.
                                </p>
                                <p className="mt-1 text-sm text-slate-500">Apakah Anda ingin memperbarui data yang sudah ada dan menambahkan data baru?</p>
                            </div>
                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <button onClick={() => setShowUpdateConfirm(false)} className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition">
                                    Batal
                                </button>
                                <button onClick={handleConfirmUpdate} className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
                                    Ya, Proses
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Broadcast WA */}
                {showBroadcastModal && (
                    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
                        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-5 flex flex-col max-h-[90vh]">
                            <div className="text-center mb-4">
                                <div className="w-16 h-16 mx-auto flex items-center justify-center bg-green-100 rounded-full">
                                    <MessageSquare size={32} className="text-green-600" />
                                </div>
                                <h3 className="mt-4 text-xl font-bold text-slate-800">Broadcast Kunjungan</h3>
                                <p className="text-sm text-slate-500">
                                    Kirim pengingat ke <strong className="text-slate-700">{broadcastList.length} toko</strong> untuk hari <strong className="text-slate-700">{HARI_LABEL[filterHari]}</strong>.
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-medium text-slate-600 mb-1">Template Pesan:</label>
                                <textarea value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" rows="3"></textarea>
                                <p className="text-xs text-slate-400 mt-1">Gunakan `&#123;nama_toko&#125;` untuk nama toko otomatis.</p>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-2 -mr-2">
                                {broadcastList.map((toko) => {
                                    const message = broadcastMessage.replace(/\{nama_toko\}/g, toko.nama);
                                    const waUrl = `https://wa.me/${toko.nomorWa}?text=${encodeURIComponent(message)}`;
                                    return (
                                        <div key={toko.id} className="bg-slate-50 p-2.5 rounded-lg flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-sm text-slate-800">{toko.nama}</p>
                                                <p className="text-xs text-slate-500">{toko.nomorWa}</p>
                                            </div>
                                            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 hover:bg-green-600 transition">
                                                <Send size={12} /> Kirim
                                            </a>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-6">
                                <button onClick={() => setShowBroadcastModal(false)} className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition">
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
