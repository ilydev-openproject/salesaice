// src/pages/VisitPage.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { collection, getDocs, addDoc, query, orderBy, doc, updateDoc, deleteDoc, writeBatch, where } from 'firebase/firestore';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay, isSameMonth, startOfMonth, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { toPng } from 'html-to-image';
import 'react-day-picker/dist/style.css';
import { db } from '../lib/firebase'; //
import { Store, Package, Plus, Minus, CheckCircle2, XCircle, ChevronDown, MapPin, ArrowLeft, ShoppingCart, Calendar, Pencil, Trash2, Wallet, Search, CalendarRange, Download, MoreVertical, Eye, X, MessageSquare, AlertTriangle, Camera, Star } from 'lucide-react';
import Loader from '../components/Loader';
import VisitReceipt from '../components/VisitReceipt';
import TimestampCamera from './TimestampCamera'; // Impor komponen kamera

// Komponen MiniLoader kita definisikan di sini untuk memperbaiki error
export function MiniLoader({ text = 'Memuat...' }) {
    return (
        <div className="flex items-center justify-center gap-3 text-xs text-slate-600 py-3">
            <div className="relative">
                <div className="w-5 h-5 border-2 border-purple-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-5 h-5 border-2 border-purple-600 rounded-full animate-spin border-t-transparent"></div>
            </div>
            <span className="font-medium">{text}</span>
        </div>
    );
}

export default function VisitPage({ setActivePage, orderList = [], kunjunganList, setKunjunganList, tokoList, produkList, onModalChange, showNotification }) {
    // State untuk daftar kunjungan
    const [loading, setLoading] = useState(true);

    // State untuk form
    const [showForm, setShowForm] = useState(false);
    const [selectedTokoId, setSelectedTokoId] = useState('');
    const [catatan, setCatatan] = useState('');
    const [visitDate, setVisitDate] = useState(new Date()); // State untuk tanggal di form
    const [submitting, setSubmitting] = useState(false);
    const [editingVisitId, setEditingVisitId] = useState(null);
    const [cart, setCart] = useState({}); // { productId: jumlahBox }
    const [isTokoDropdownOpen, setIsTokoDropdownOpen] = useState(false);
    const [isDataLoaded, setIsDataLoaded] = useState(false); // Untuk load data form sekali saja
    const [tokoSearchTerm, setTokoSearchTerm] = useState(''); // State untuk pencarian di dropdown toko
    const [showFormCalendar, setShowFormCalendar] = useState(false); // State untuk kalender di form
    const [searchTerm, setSearchTerm] = useState('');
    const [productSearchTerm, setProductSearchTerm] = useState(''); // State untuk filter produk di form
    const [productSortBy, setProductSortBy] = useState('terlaris'); // 'terlaris', 'abjad', 'tersedia'
    const [justAddedProductId, setJustAddedProductId] = useState(null); // State untuk animasi
    // State untuk filter tanggal
    const [filterType, setFilterType] = useState('today'); // 'today', 'custom'
    const [customDate, setCustomDate] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);

    // State untuk fitur kamera
    const [showCamera, setShowCamera] = useState(false); // Hanya untuk membuka/menutup kamera
    const [cameraVisitData, setCameraVisitData] = useState(null); // Untuk menyimpan data kunjungan yang akan difoto
    // State dan Ref untuk ekspor resi
    const [receiptKunjungan, setReceiptKunjungan] = useState(null);
    const receiptRef = useRef(null);
    // State untuk modal preview resi
    const [showReceiptPreview, setShowReceiptPreview] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState('');
    const [previewImageFilename, setPreviewImageFilename] = useState('');
    const [receiptLoading, setReceiptLoading] = useState(false); // State for receipt generation loading

    // State untuk notifikasi modern
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

    // State untuk modal konfirmasi hapus
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // State untuk rekomendasi produk
    const [productRecommendations, setProductRecommendations] = useState([]);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);

    const [openMenuId, setOpenMenuId] = useState(null); // State untuk menu titik tiga

    // Efek untuk memberitahu App.jsx jika ada modal yang terbuka
    useEffect(() => {
        const isAnyModalOpen = showForm || showReceiptPreview || showDeleteConfirm || showCamera;
        onModalChange(isAnyModalOpen);

        const handlePopState = (event) => {
            if (isAnyModalOpen) {
                event.preventDefault();
                // Tutup modal yang paling atas
                if (showForm) setShowForm(false);
                else if (showReceiptPreview) closePreview();
                else if (showDeleteConfirm) setShowDeleteConfirm(false);
                else if (showCamera) setShowCamera(false);
                setCameraVisitData(null);
            }
        };

        if (isAnyModalOpen) window.history.pushState({ modal: 'visit' }, '');
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [showForm, showReceiptPreview, showDeleteConfirm, showCamera, onModalChange]);

    // Load daftar kunjungan
    useEffect(() => {
        // Data sudah dimuat dari App.jsx, jadi kita hanya perlu set loading ke false
        if (kunjunganList && tokoList && produkList) {
            setLoading(false);
            setIsDataLoaded(true); // Tandai data sudah siap
        }
    }, []);

    const loadFormData = async () => {
        if (isDataLoaded) return; // Jangan load ulang jika sudah ada
        // Fungsi ini tidak lagi melakukan fetch, hanya memastikan data siap
        setIsDataLoaded(true);
    };

    // Load data untuk form (toko & produk) saat form dibuka
    useEffect(() => {
        if (showForm && !isDataLoaded) {
            loadFormData();
        }
    }, [showForm, isDataLoaded]);

    // Efek untuk memuat rekomendasi produk saat toko dipilih
    useEffect(() => {
        if (selectedTokoId && produkList.length > 0 && orderList.length > 0) {
            setLoadingRecommendations(true);
            // Beri sedikit delay agar tidak terasa lag saat memilih toko
            const timer = setTimeout(() => {
                // 1. Cari produk yang sering dibeli toko ini
                const purchaseHistory = new Map();
                orderList
                    .filter((o) => o.tokoId === selectedTokoId)
                    .forEach((order) => {
                        order.items?.forEach((item) => {
                            purchaseHistory.set(item.productId, (purchaseHistory.get(item.productId) || 0) + 1); // Hitung frekuensi order
                        });
                    });

                // Urutkan berdasarkan frekuensi pembelian
                const frequentProductIds = [...purchaseHistory.entries()].sort((a, b) => b[1] - a[1]).map((entry) => entry[0]);

                // 2. Cari produk terlaris global yang belum pernah dibeli toko ini
                const globalBestSellers = [...productSales.entries()].sort((a, b) => b[1] - a[1]).map((entry) => entry[0]);

                const unboughtBestSellers = globalBestSellers.filter((productId) => !purchaseHistory.has(productId));

                // 3. Gabungkan dan ambil 5 teratas
                const recommendationIds = [...new Set([...frequentProductIds, ...unboughtBestSellers])].slice(0, 5);

                const recommendations = recommendationIds.map((id) => produkList.find((p) => p.id === id)).filter(Boolean); // Filter jika produk sudah dihapus

                setProductRecommendations(recommendations);
                setLoadingRecommendations(false);
            }, 300);

            return () => clearTimeout(timer);
        } else {
            setProductRecommendations([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTokoId, produkList, orderList]); // productSales sudah di-memoize, jadi aman

    const fetchKunjungan = async () => {
        try {
            const q = query(collection(db, 'kunjungan'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q); //
            const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })); //
            setKunjunganList(list); // Update state di App.jsx
        } catch (error) {
            console.error('Error fetching kunjungan:', error);
            showNotification('Gagal memuat ulang data kunjungan.', 'error');
        }
    };

    const handleSelectToko = (tokoId) => {
        setSelectedTokoId(tokoId);
        setIsTokoDropdownOpen(false);
        setTokoSearchTerm(''); // Reset pencarian saat toko dipilih
    };

    const updateQty = (productId, delta) => {
        setCart((prev) => {
            const current = prev[productId] || 0;
            const newQty = Math.max(0, current + delta);
            const newCart = { ...prev, [productId]: newQty };
            if (newQty === 0) delete newCart[productId]; // Hapus dari cart jika qty 0
            return newCart;
        });

        // Memicu animasi hanya saat menambah item
        if (delta > 0) {
            setJustAddedProductId(productId);
            // Hapus state setelah animasi selesai agar bisa di-trigger lagi
            setTimeout(() => {
                setJustAddedProductId(null);
            }, 400); // Durasi harus sama dengan durasi animasi di CSS
        }
    };

    // Fungsi baru untuk menghapus item dari keranjang
    const removeFromCart = (productId) => {
        setCart((prev) => {
            const newCart = { ...prev };
            delete newCart[productId];
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
            showNotification('Pilih toko terlebih dahulu!', 'error');
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

        const hasOrder = items.length > 0;

        setSubmitting(true);
        try {
            if (editingVisitId) {
                // Update
                const batch = writeBatch(db);
                const visitRef = doc(db, 'kunjungan', editingVisitId);

                // 1. Update data kunjungan (tanpa item)
                batch.update(visitRef, {
                    tokoId: kunjunganData.tokoId,
                    tokoNama: kunjunganData.tokoNama,
                    kodeToko: kunjunganData.kodeToko,
                    catatan: kunjunganData.catatan,
                    createdAt: visitDate, // Gunakan tanggal dari form saat edit
                });

                // 2. Cari dan update order terkait
                const originalVisit = kunjunganList.find((v) => v.id === editingVisitId);
                const originalVisitDate = new Date(originalVisit.createdAt.seconds * 1000);

                // Buat salinan tanggal agar tidak mengubah state asli
                const startOfDay = new Date(originalVisitDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(originalVisitDate);
                endOfDay.setHours(23, 59, 59, 999);

                // --- PERUBAHAN LOGIKA ---
                // Ambil semua order yang relevan dari state (orderList) yang sudah di-fetch sebelumnya.
                // Ini menghindari query kompleks ke Firestore yang butuh index.
                const relatedOrders = orderList.filter((order) => {
                    if (!order.createdAt?.seconds) return false;
                    const orderDate = new Date(order.createdAt.seconds * 1000);
                    return order.tokoId === originalVisit.tokoId && orderDate >= startOfDay && orderDate <= endOfDay;
                });

                if (relatedOrders.length > 0) {
                    // Jika ada order terkait
                    const orderToUpdateRef = doc(db, 'orders', relatedOrders[0].id);
                    if (hasOrder) {
                        // Jika sekarang ada item, update order tersebut
                        batch.update(orderToUpdateRef, {
                            tokoId: kunjunganData.tokoId,
                            tokoNama: kunjunganData.tokoNama,
                            items: kunjunganData.items,
                            total: kunjunganData.total,
                            catatan: `Order dari kunjungan: ${kunjunganData.catatan}`,
                            createdAt: visitDate, // Update tanggal order juga
                        });
                    } else {
                        // Jika sekarang tidak ada item, hapus order tersebut
                        batch.delete(orderToUpdateRef);
                    }
                } else if (hasOrder) {
                    // Jika tidak ada order terkait tapi sekarang ada item, buat order baru
                    const newOrderRef = doc(collection(db, 'orders'));
                    batch.set(newOrderRef, { ...kunjunganData, createdAt: visitDate }); // Gunakan tanggal dari form
                }

                await batch.commit();
                showNotification('Kunjungan berhasil diperbarui.');
            } else {
                // Create Kunjungan baru (tanpa item dan total)
                await addDoc(collection(db, 'kunjungan'), {
                    tokoId: kunjunganData.tokoId,
                    tokoNama: kunjunganData.tokoNama,
                    kodeToko: kunjunganData.kodeToko,
                    catatan: kunjunganData.catatan,
                    items: [],
                    total: 0,
                    createdAt: visitDate, // Gunakan tanggal dari form
                });
                showNotification('Kunjungan berhasil dicatat.');

                // Jika ada order, buat entri terpisah di koleksi 'orders'
                if (hasOrder) {
                    await addDoc(collection(db, 'orders'), {
                        tokoId: kunjunganData.tokoId,
                        tokoNama: kunjunganData.tokoNama,
                        kodeToko: kunjunganData.kodeToko,
                        items: kunjunganData.items,
                        catatan: `Order dari kunjungan: ${kunjunganData.catatan}`,
                        total: kunjunganData.total,
                        createdAt: visitDate, // Gunakan tanggal yang sama dengan kunjungan
                    });
                    showNotification('Order dari kunjungan berhasil disimpan.', 'success');
                }
            }

            // Reset
            resetForm();
            fetchKunjungan(); // Muat ulang daftar kunjungan
        } catch (error) {
            console.error('Error saving visit:', error);
            showNotification('Gagal menyimpan kunjungan.', 'error');
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
        setSelectedTokoId('');
        setVisitDate(new Date()); // Reset tanggal ke hari ini
        setTokoSearchTerm('');
        setProductSearchTerm(''); // Reset filter produk saat form ditutup
    };

    const handleEdit = async (kunjungan) => {
        // Pastikan data form (terutama tokoList) sudah dimuat sebelum mengisi state
        await loadFormData();
        setEditingVisitId(kunjungan.id);
        setSelectedTokoId(kunjungan.tokoId);
        setCatatan(kunjungan.catatan || '');
        setVisitDate(kunjungan.createdAt?.seconds ? new Date(kunjungan.createdAt.seconds * 1000) : new Date());

        // Saat edit, cart diisi dari data 'order' yang terkait, bukan dari 'kunjungan'
        const visitDate = new Date(kunjungan.createdAt.seconds * 1000);
        const relatedOrder = orderList.find((order) => {
            if (!order.createdAt?.seconds) return false;
            const orderDate = new Date(order.createdAt.seconds * 1000);
            return order.tokoId === kunjungan.tokoId && isSameDay(orderDate, visitDate);
        });

        let initialCart = {};
        if (relatedOrder && relatedOrder.items) {
            initialCart = relatedOrder.items.reduce((acc, item) => {
                acc[item.productId] = item.qtyBox;
                return acc;
            }, {});
        }
        setCart(initialCart);

        setShowForm(true);
    };

    const openDeleteConfirm = (kunjungan) => {
        setItemToDelete(kunjungan);
        setShowDeleteConfirm(true);
        closeMenu();
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            await deleteDoc(doc(db, 'kunjungan', itemToDelete.id));
            showNotification('Kunjungan berhasil dihapus.');
            fetchKunjungan(); // Muat ulang daftar
            setShowDeleteConfirm(false);
            setItemToDelete(null);
        } catch (error) {
            console.error('Error deleting visit:', error); //
            showNotification('Gagal menghapus kunjungan.', 'error');
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

    const handlePreview = useCallback(
        async (kunjungan) => {
            // Cari SEMUA order yang terkait dengan kunjungan pada hari yang sama
            const visitDate = new Date(kunjungan.createdAt.seconds * 1000);
            const relatedOrders = orderList.filter((order) => {
                if (!order.createdAt?.seconds) return false;
                const orderDate = new Date(order.createdAt.seconds * 1000);
                return order.tokoId === kunjungan.tokoId && isSameDay(orderDate, visitDate);
            });

            // Gabungkan data kunjungan dengan data order untuk resi
            const receiptData = {
                ...kunjungan, // Ambil id, tokoNama, kodeToko, createdAt dari kunjungan
                items: relatedOrders.flatMap((order) => order.items || []), // Gabungkan semua item dari order terkait
                total: relatedOrders.reduce((sum, order) => sum + (order.total || 0), 0), // Jumlahkan semua total dari order terkait
            };

            setReceiptKunjungan(receiptData);

            // Lanjutkan proses seperti biasa
            setReceiptLoading(true); // Start loading
            setShowReceiptPreview(true); // Show modal with loader

            // Tunggu DOM update dan render komponen resi
            setTimeout(async () => {
                const node = document.getElementById(`receipt-${kunjungan.id}`);
                if (!node) {
                    showNotification('Gagal menemukan elemen resi.', 'error');
                    setReceiptLoading(false);
                    setReceiptKunjungan(null);
                    return;
                }

                // Fungsi untuk memastikan semua gambar di dalam node sudah termuat
                const waitForImages = async (nodeElement) => {
                    const images = Array.from(nodeElement.getElementsByTagName('img'));
                    const promises = images.map((img) => {
                        if (img.complete) {
                            return Promise.resolve();
                        }
                        return new Promise((resolve, reject) => {
                            img.onload = resolve;
                            img.onerror = reject;
                        });
                    });
                    await Promise.all(promises);
                };

                try {
                    await waitForImages(node); // Tunggu gambar selesai dimuat
                    const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 });
                    setPreviewImageUrl(dataUrl);
                    setPreviewImageFilename(`resi-${kunjungan.tokoNama.replace(/\s/g, '_')}-${format(new Date(), 'yyyyMMdd')}.png`);
                } catch (err) {
                    console.error('oops, something went wrong!', err);
                    showNotification('Gagal membuat pratinjau resi.', 'error');
                } finally {
                    setReceiptLoading(false); // Stop loading
                    // Keep receiptKunjungan to show the component until modal is closed
                }
            }, 100); // Timeout untuk memastikan DOM siap
        },
        [orderList],
    ); // Tambahkan orderList sebagai dependensi

    const closePreview = () => {
        setShowReceiptPreview(false);
        setPreviewImageUrl('');
        setReceiptKunjungan(null); // Hide receipt component when modal closes
    };

    const handleMenuClick = (e, visitId) => {
        e.stopPropagation();
        setOpenMenuId(openMenuId === visitId ? null : visitId);
    };

    const closeMenu = () => setOpenMenuId(null);

    const handleDownloadFromPreview = () => {
        const link = document.createElement('a');
        link.download = previewImageFilename;
        link.href = previewImageUrl;
        link.click();
    };

    const handleWhatsAppShare = (kunjungan) => {
        console.log('--- handleWhatsAppShare called ---');
        console.log('Kunjungan being shared:', kunjungan);

        const toko = tokoList.find((t) => t.id === kunjungan.tokoId);
        // Handle case where createdAt is not yet populated by the server
        const visitDate = kunjungan.createdAt?.seconds ? new Date(kunjungan.createdAt.seconds * 1000) : new Date(); // Fallback to now() if createdAt is null

        if (!toko || !visitDate) {
            showNotification('Data toko tidak ditemukan untuk membuat laporan.', 'error');
            console.error('Toko not found for tokoId:', kunjungan.tokoId);
            return;
        }
        console.log('Found Toko:', toko);

        console.log('Visit Date (from kunjungan.createdAt or fallback):', visitDate);

        // 1. No Urut Kunjungan Hari Ini
        const visitsToday = kunjunganList
            .filter((v) => {
                if (!v.createdAt?.seconds || typeof v.createdAt.seconds !== 'number') {
                    console.warn('Skipping visit due to invalid createdAt for daily stats:', v.id, v.createdAt);
                    return false;
                }
                const d = new Date(v.createdAt.seconds * 1000);
                return isSameDay(d, visitDate); // Use isSameDay from date-fns
            })
            .sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);
        const visitOrderToday = visitsToday.findIndex((v) => v.id === kunjungan.id) + 1;
        console.log(
            'Visits Today (for ordering):',
            visitsToday.map((v) => ({ id: v.id, tokoNama: v.tokoNama, createdAt: new Date(v.createdAt.seconds * 1000) })),
        );
        console.log('Visit Order Today:', visitOrderToday);

        // 2. Statistik Bulan Ini
        const currentMonthStart = startOfMonth(visitDate);
        const currentMonthEnd = endOfMonth(visitDate);
        console.log('Start of Month:', currentMonthStart);
        console.log('End of Month:', currentMonthEnd);

        // Gunakan orderList untuk statistik bulanan yang lebih akurat
        const ordersThisMonthForToko = orderList.filter((o) => {
            if (!o.createdAt?.seconds || typeof o.createdAt.seconds !== 'number') {
                console.warn('Skipping order for month stats due to invalid createdAt:', o.id, o.createdAt);
                return false;
            }
            const d = new Date(o.createdAt.seconds * 1000);
            const isSameToko = o.tokoId === kunjungan.tokoId;
            const isInMonth = isSameMonth(d, visitDate);
            return isSameToko && isInMonth;
        });

        // Hitung total kunjungan unik pada bulan ini
        const uniqueVisitDaysThisMonth = new Set(kunjunganList.filter((v) => v.tokoId === kunjungan.tokoId && isSameMonth(new Date(v.createdAt.seconds * 1000), visitDate)).map((v) => format(new Date(v.createdAt.seconds * 1000), 'yyyy-MM-dd')));
        const totalVisitsThisMonth = uniqueVisitDaysThisMonth.size;
        const totalBoxesThisMonth = ordersThisMonthForToko.reduce((sum, o) => sum + (o.items?.reduce((itemSum, item) => itemSum + item.qtyBox, 0) || 0), 0);
        console.log('Total Boxes This Month (for this toko):', totalBoxesThisMonth);

        // Hitung total box dari semua order pada hari kunjungan
        const relatedOrdersToday = orderList.filter((order) => {
            if (!order.createdAt?.seconds) return false;
            const orderDate = new Date(order.createdAt.seconds * 1000);
            return order.tokoId === kunjungan.tokoId && isSameDay(orderDate, visitDate);
        });
        const totalOrderBox = relatedOrdersToday.reduce((sum, order) => sum + (order.items?.reduce((itemSum, item) => itemSum + item.qtyBox, 0) || 0), 0);

        console.log('Total Order Box (current visit):', totalOrderBox);

        const padRight = (str, len) => str.padEnd(len, ' ');

        const message = `LAPORAN KUNJUNGAN 

${padRight('No Urut', 15)}: ${visitOrderToday}
${padRight('Nama Toko', 15)}: ${kunjungan.tokoNama}
${padRight('Kode Toko', 15)}: ${kunjungan.kodeToko || '-'}

${padRight('Kunjungan ke', 15)}: ${totalVisitsThisMonth} (bln ini)
${padRight('Total order', 15)}: ${totalOrderBox} box
${padRight('Total bln ini', 15)}: ${totalBoxesThisMonth} box

${padRight('No HP', 15)}: ${toko.nomorWa || '-'}

`
            .trim() // Trim leading/trailing whitespace from the whole string
            .split('\n') // Split into lines
            .map((line) => line.trimEnd()) // Trim trailing spaces from each line
            .join('\n');

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        closeMenu();
    };

    // Memoized product sales calculation
    const productSales = useMemo(() => {
        const salesMap = new Map();
        orderList.forEach((order) => {
            order.items?.forEach((item) => {
                salesMap.set(item.productId, (salesMap.get(item.productId) || 0) + item.qtyBox);
            });
        });
        return salesMap;
    }, [orderList]);

    // Memoized sorted product list
    const sortedProdukList = useMemo(() => {
        return [...produkList]
            .filter((p) => p.nama.toLowerCase().includes(productSearchTerm.toLowerCase()))
            .sort((a, b) => {
                if (productSortBy === 'terlaris') {
                    return (productSales.get(b.id) || 0) - (productSales.get(a.id) || 0);
                }
                if (productSortBy === 'abjad') {
                    return a.nama.localeCompare(b.nama);
                }
                // Default to 'tersedia'
                return a.available === b.available ? a.nama.localeCompare(b.nama) : a.available ? -1 : 1;
            });
    }, [produkList, productSearchTerm, productSortBy, productSales]);

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <Loader text="Memuat data kunjungan..." />
            </div>
        );
    }

    return (
        <>
            {/* Render Komponen Kamera */}
            {showCamera && cameraVisitData && (
                <TimestampCamera
                    onClose={() => {
                        setShowCamera(false);
                        setCameraVisitData(null);
                    }}
                    visitData={cameraVisitData}
                />
            )}

            {/* Halaman Utama: Daftar Kunjungan */}
            <div className=" pb-20 max-w-md mx-auto" onClick={closeMenu}>
                <div className="p-5 pb-20">
                    <div className="flex justify-between items-center mb-5">
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl shadow-sm">
                                <MapPin className="text-purple-600" size={20} />
                            </div>
                            <span className="gradient-text">Kunjungan</span>
                        </h2>
                        <button onClick={openForm} className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:from-purple-700 hover:via-purple-800 hover:to-indigo-800 transition-all duration-300 shadow-lg hover:shadow-xl hover-lift hover-glow focus-ring group">
                            <Plus size={16} className="group-hover:scale-110 transition-transform" />
                            <span>Tambah</span>
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-3 group">
                        <input type="text" placeholder="Cari nama atau kode toko..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 pl-12 text-sm text-slate-700 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300 hover:bg-white hover:shadow-md transition-all duration-200 focus-ring" />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                            <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl group-hover:scale-110 transition-transform">
                                <Search className="text-purple-600" size={18} />
                            </div>
                        </div>
                    </div>

                    {/* Filter Tanggal */}
                    <div className="relative mb-4 flex items-center gap-2">
                        <button onClick={() => setFilterType('today')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-200 hover-lift focus-ring ${filterType === 'today' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'bg-white/80 backdrop-blur-sm text-slate-600 border border-slate-200 hover:bg-white hover:shadow-md'}`}>
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <Calendar size={16} />
                            </div>
                            Hari Ini
                        </button>
                        <button onClick={() => setShowCalendar(!showCalendar)} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-200 hover-lift focus-ring text-nowrap ${filterType === 'custom' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'bg-white/80 backdrop-blur-sm text-slate-600 border border-slate-200 hover:bg-white hover:shadow-md'}`}>
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <CalendarRange size={16} />
                            </div>
                            {filterType === 'custom' ? format(customDate, 'd MMM yy', { locale: id }) : 'Pilih Tanggal'}
                        </button>

                        {showCalendar && (
                            <div className="absolute top-full mt-3 z-20 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/50 p-4 animate-slide-in-top" onMouseLeave={() => setShowCalendar(false)}>
                                <DayPicker
                                    mode="single"
                                    selected={customDate}
                                    onSelect={handleDateSelect}
                                    captionLayout="dropdown-buttons"
                                    fromYear={2020}
                                    toYear={new Date().getFullYear() + 1}
                                    classNames={{
                                        caption_label: 'text-sm font-bold text-purple-800',
                                        head_cell: 'font-semibold text-xs text-slate-600',
                                        day_selected: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-lg',
                                        day_today: 'font-bold text-purple-600 ring-2 ring-purple-200 rounded-full',
                                        day: 'hover:bg-purple-50 rounded-full transition-colors',
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {filteredKunjungan.length === 0 && !loading ? (
                        <div className="text-center text-slate-500 py-12 bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/30 rounded-2xl border border-slate-200/50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/20 rounded-full -translate-y-16 translate-x-16"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-200/20 rounded-full translate-y-12 -translate-x-12"></div>
                            <div className="relative z-10">
                                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center animate-float">
                                    <MapPin size={40} className="text-purple-600" />
                                </div>
                                <h3 className="text-sm font-semibold text-slate-700 mb-2">{searchTerm ? 'Kunjungan tidak ditemukan' : 'Belum ada kunjungan'}</h3>
                                <p className="text-xs text-slate-500">{searchTerm ? 'Coba gunakan kata kunci yang berbeda' : 'Mulai dengan menambahkan kunjungan pertama Anda'}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredKunjungan.map((kunjungan) => {
                                // Cari SEMUA order yang cocok berdasarkan tokoId dan tanggal yang sama
                                const visitDate = new Date(kunjungan.createdAt.seconds * 1000);
                                const relatedOrders = orderList.filter((order) => {
                                    if (!order.createdAt?.seconds) return false;
                                    const orderDate = new Date(order.createdAt.seconds * 1000);
                                    return order.tokoId === kunjungan.tokoId && isSameDay(orderDate, visitDate);
                                });

                                // Akumulasi total dari semua order terkait
                                const displayTotal = relatedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
                                const totalBoxes = relatedOrders.reduce((sum, order) => sum + (order.items?.reduce((itemSum, item) => itemSum + item.qtyBox, 0) || 0), 0);

                                return (
                                    <div key={kunjungan.id} onClick={() => handleEdit(kunjungan)} className={`bg-gradient-to-r from-white via-slate-50/50 to-purple-50/30 rounded-2xl shadow-sm border border-slate-200/50 transition-all duration-300 hover:shadow-lg hover:border-purple-300 cursor-pointer relative hover-lift focus-ring group backdrop-blur-sm ${openMenuId === kunjungan.id ? 'z-20' : 'z-10'}`}>
                                        <div className="p-3 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-fuchsia-100 flex items-center justify-center text-purple-600 font-bold text-sm shadow-sm group-hover:scale-110 transition-transform">{kunjungan.tokoNama.charAt(0).toUpperCase()}</div>
                                            <div className="flex-grow min-w-0">
                                                <h3 className="font-bold text-slate-800 text-xs leading-tight truncate">{kunjungan.tokoNama}</h3>
                                                <p className="text-[10px] text-slate-500 mt-0.5">{kunjungan.createdAt ? new Date(kunjungan.createdAt.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Baru saja'}</p>
                                            </div>
                                            <div className="text-right pr-5">
                                                <p className={`font-bold text-xs ${displayTotal > 0 ? 'text-green-600' : 'text-slate-500'}`}>Rp{displayTotal.toLocaleString('id-ID')}</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5">{totalBoxes} box</p>
                                            </div>
                                        </div>
                                        {/* Tombol Titik Tiga */}
                                        <div className="absolute top-1/2 right-2 -translate-y-1/2">
                                            <button onClick={(e) => handleMenuClick(e, kunjungan.id)} className="p-2 rounded-full hover:bg-gradient-to-r hover:from-purple-100 hover:to-indigo-100 text-slate-500 hover:text-purple-600 transition-all duration-200 hover-scale focus-ring">
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>

                                        {/* Menu Dropdown */}
                                        {openMenuId === kunjungan.id && (
                                            <div className="absolute top-10 right-5 z-30 w-48 bg-gradient-to-br from-white via-slate-50/50 to-purple-50/30 rounded-2xl shadow-2xl border border-slate-200/50 backdrop-blur-md animate-slide-in-top" onClick={(e) => e.stopPropagation()}>
                                                <div className="py-2">
                                                    <button
                                                        onClick={() => {
                                                            handleEdit(kunjungan);
                                                            closeMenu();
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 flex items-center gap-2 transition-all duration-200 hover-lift rounded-lg mx-1"
                                                    >
                                                        <div className="p-1 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-md">
                                                            <Pencil size={14} className="text-blue-600" />
                                                        </div>{' '}
                                                        Edit Kunjungan
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            handlePreview(kunjungan);
                                                            closeMenu();
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 flex items-center gap-2 transition-all duration-200 hover-lift rounded-lg mx-1"
                                                    >
                                                        <div className="p-1 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-md">
                                                            <Eye size={14} className="text-emerald-600" />
                                                        </div>{' '}
                                                        Lihat Resi
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setCameraVisitData(kunjungan);
                                                            setShowCamera(true);
                                                            closeMenu();
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 flex items-center gap-2 transition-all duration-200 hover-lift rounded-lg mx-1"
                                                    >
                                                        <div className="p-1 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-md">
                                                            <Camera size={14} className="text-yellow-600" />
                                                        </div>{' '}
                                                        Ambil Foto
                                                    </button>
                                                    <button onClick={() => handleWhatsAppShare(kunjungan)} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-teal-50 flex items-center gap-2 transition-all duration-200 hover-lift rounded-lg mx-1">
                                                        <div className="p-1 bg-gradient-to-br from-green-100 to-teal-100 rounded-md">
                                                            <MessageSquare size={14} className="text-green-600" />
                                                        </div>{' '}
                                                        Kirim via WA
                                                    </button>
                                                    <div className="my-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mx-2"></div>
                                                    <button
                                                        onClick={() => {
                                                            openDeleteConfirm(kunjungan);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 flex items-center gap-2 transition-all duration-200 hover-lift rounded-lg mx-1"
                                                    >
                                                        <div className="p-1 bg-gradient-to-br from-red-100 to-orange-100 rounded-md">
                                                            <Trash2 size={14} className="text-red-600" />
                                                        </div>{' '}
                                                        Hapus Kunjungan
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Hidden container for rendering receipt to image */}
                <div className="fixed -left-[9999px] top-0">{receiptKunjungan && <VisitReceipt kunjungan={receiptKunjungan} ref={receiptRef} />}</div>

                {/* Form Tambah Kunjungan (Slide-in) */}
                <div className={`fixed inset-0 z-[400] transition-all duration-500 ${showForm ? 'bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 backdrop-blur-sm' : 'bg-transparent pointer-events-none'}`}>
                    <div className={`absolute inset-y-0 left-0 w-full max-w-md bg-gradient-to-br from-white via-slate-50 to-purple-50/30 shadow-2xl transition-all duration-500 ease-out transform ${showForm ? 'translate-x-0 scale-100 opacity-100 animate-slide-in-left' : '-translate-x-full scale-95 opacity-0'}`}>
                        <div className="h-full flex flex-col">
                            <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200">
                                <button type="button" onClick={resetForm} className="p-2 rounded-full" aria-label="Kembali">
                                    <ArrowLeft size={20} />
                                </button>
                                <h2 className="text-sm font-bold text-slate-800">{editingVisitId ? 'Edit Kunjungan' : 'Tambah Kunjungan'}</h2>
                                <div className="w-10"></div> {/* Spacer */}
                            </div>

                            <form id="visit-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 pb-40">
                                <div className="space-y-3">
                                    <label className="flex text-xs font-semibold text-slate-800 mb-2 items-center gap-2">
                                        <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"></div>
                                        Tanggal Kunjungan *
                                    </label>
                                    <div className="relative">
                                        <button type="button" onClick={() => setShowFormCalendar(!showFormCalendar)} className="w-full p-3 text-left bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300 transition-all duration-200">
                                            <span className="flex items-center gap-3">
                                                <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl">
                                                    <Calendar size={16} className="text-purple-600" />
                                                </div>
                                                <span className="text-slate-700 font-medium text-xs">{format(visitDate, 'EEEE, d MMMM yyyy', { locale: id })}</span>
                                            </span>
                                            <ChevronDown size={20} className={`text-slate-400 transition-all duration-300 ${showFormCalendar ? 'rotate-180 text-purple-600' : ''}`} />
                                        </button>
                                        {showFormCalendar && (
                                            <div className="absolute top-full mt-3 z-30 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/50 p-4 animate-in slide-in-from-top-2 fade-in" onMouseLeave={() => setShowFormCalendar(false)}>
                                                <DayPicker
                                                    mode="single"
                                                    selected={visitDate}
                                                    onSelect={(date) => {
                                                        if (date) setVisitDate(date);
                                                        setShowFormCalendar(false);
                                                    }}
                                                    defaultMonth={visitDate}
                                                    classNames={{
                                                        day_selected: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-lg',
                                                        day_today: 'font-bold text-purple-600 ring-2 ring-purple-200 rounded-full',
                                                        day: 'hover:bg-purple-50 rounded-full transition-colors',
                                                    }}
                                                    required
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Pilih Toko */}
                                <div className="space-y-3">
                                    <label className="flex text-xs font-semibold text-slate-800 mb-2 items-center gap-2">
                                        <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                                        Toko yang Dikunjungi
                                    </label>
                                    <div className="relative" style={{ pointerEvents: editingVisitId ? 'none' : 'auto', opacity: editingVisitId ? 0.7 : 1 }}>
                                        <button type="button" onClick={() => setIsTokoDropdownOpen(!isTokoDropdownOpen)} className="w-full p-3 text-left bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-300 transition-all duration-200">
                                            <span className="flex items-center gap-3">
                                                <div className="p-2 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl">
                                                    <Store size={16} className="text-emerald-600" />
                                                </div>
                                                <span className="text-slate-700 font-medium text-xs">{tokoList.find((t) => t.id === selectedTokoId)?.nama || 'Pilih Toko'}</span>
                                            </span>
                                            <ChevronDown size={20} className={`text-slate-400 transition-all duration-300 ${isTokoDropdownOpen ? 'rotate-180 text-emerald-600' : ''}`} />
                                        </button>

                                        {isTokoDropdownOpen && (
                                            <div className="absolute z-10 mt-3 w-full bg-white/95 backdrop-blur-md border border-slate-200/50 rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-top-2 fade-in">
                                                <div className="p-3 border-b border-slate-200/50">
                                                    <div className="relative">
                                                        <input type="text" placeholder="Cari toko..." value={tokoSearchTerm} onChange={(e) => setTokoSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full p-2 pl-8 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-300 transition-all" />
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                    </div>
                                                </div>
                                                <div className="max-h-40 overflow-y-auto p-2">
                                                    {tokoList
                                                        .filter((t) => t.nama.toLowerCase().includes(tokoSearchTerm.toLowerCase()) || (t.kode && t.kode.toLowerCase().includes(tokoSearchTerm.toLowerCase())))
                                                        .slice() // Buat salinan agar tidak mengubah state asli
                                                        .sort((a, b) => {
                                                            if (a.id === selectedTokoId) return -1; // a (selected) comes first
                                                            if (b.id === selectedTokoId) return 1; // b (selected) comes first
                                                            return a.nama.localeCompare(b.nama); // Urutkan sisanya berdasarkan abjad
                                                        })
                                                        .map((toko) => (
                                                            <div key={toko.id} onClick={() => handleSelectToko(toko.id)} className={`p-2 cursor-pointer rounded-lg transition-all duration-200 flex justify-between items-center group ${selectedTokoId === toko.id ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 shadow-sm' : ''}`}>
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedTokoId === toko.id ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{toko.nama.charAt(0).toUpperCase()}</div>
                                                                    <div>
                                                                        <span className="font-medium text-slate-700 text-xs">{toko.nama}</span>
                                                                        {toko.kode && <span className="text-[10px] text-slate-500 ml-2">({toko.kode})</span>}
                                                                    </div>
                                                                </div>
                                                                {selectedTokoId === toko.id && <CheckCircle2 size={16} className="text-emerald-600" />}
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Rekomendasi Produk */}
                                {selectedTokoId && productRecommendations.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
                                            <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                                                <div className="p-1 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-md">
                                                    <Star size={14} className="text-yellow-600 fill-current" />
                                                </div>
                                                <span>Rekomendasi Untuk Toko Ini</span>
                                            </h3>
                                        </div>
                                        {loadingRecommendations ? (
                                            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-3 border border-yellow-200">
                                                <MiniLoader text="Menganalisis..." />
                                            </div>
                                        ) : (
                                            <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                                {productRecommendations.map((produk) => (
                                                    <button type="button" key={produk.id} onClick={() => updateQty(produk.id, 1)} disabled={!produk.available} className={`flex-shrink-0 w-24 text-center p-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl transition-all duration-200 disabled:opacity-50 group focus-ring ${justAddedProductId === produk.id ? 'animate-pop' : ''}`}>
                                                        <div className="relative">
                                                            <img src={produk.foto || 'https://via.placeholder.com/100?text=Produk'} alt={produk.nama} className="w-12 h-12 mx-auto object-contain rounded-lg shadow-sm group-hover:scale-105 transition-transform" />
                                                            {cart[produk.id] > 0 && (
                                                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center animate-bounce shadow-lg">
                                                                    <span className="text-[10px] font-bold text-white">{cart[produk.id]}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] font-medium text-slate-700 mt-1.5 truncate h-7">{produk.nama}</p>
                                                        {cart[produk.id] > 0 && <span className="text-[10px] font-bold text-green-600 mt-1 animate-pulse">({cart[produk.id]} box)</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* Catatan */}
                                <div className="space-y-3">
                                    <label className="flex text-xs font-semibold text-slate-800 mb-2 items-center gap-2">
                                        <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                                        Catatan (Opsional)
                                    </label>
                                    <div className="relative group">
                                        <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan untuk order..." className="w-full p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 transition-all duration-200 resize-none text-xs" rows="3" />
                                        <div className="absolute top-3 left-3 pointer-events-none">
                                            <div className="p-1.5 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg">
                                                <Pencil size={16} className="text-blue-600" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Daftar Produk */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                                                <Package className="text-purple-600" size={16} />
                                            </div>
                                            <h3 className="text-sm font-semibold text-slate-800">Pilih Produk (jika ada order)</h3>
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <input type="text" placeholder="Cari produk..." value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} className="w-full p-3 pl-12 text-xs text-slate-700 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300 transition-all duration-200" />
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                            <div className="p-1.5 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                                                <Search className="text-purple-600" size={16} />
                                            </div>
                                        </div>
                                    </div>
                                    {produkList.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500">
                                            <div className="w-16 h-16 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                                                <Package size={24} className="text-slate-400" />
                                            </div>
                                            <p className="text-xs font-medium">Memuat produk...</p>
                                        </div>
                                    ) : sortedProdukList.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500">
                                            <div className="w-16 h-16 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                                                <Search size={24} className="text-slate-400" />
                                            </div>
                                            <p className="text-xs font-medium">Produk tidak ditemukan</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Filter Produk */}
                                            <div className="flex items-center gap-2 p-1 bg-gradient-to-r from-slate-100 to-slate-200 rounded-2xl">
                                                {['terlaris', 'abjad', 'tersedia'].map((filter) => (
                                                    <button key={filter} type="button" onClick={() => setProductSortBy(filter)} className={`flex-1 capitalize text-[10px] font-semibold py-2 rounded-xl transition-all duration-300 ${productSortBy === filter ? 'bg-white text-purple-700 shadow-md' : 'bg-transparent text-slate-500'}`}>
                                                        {filter === 'abjad' ? 'A-Z' : filter}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                {sortedProdukList.map((produk) => {
                                                    const qty = cart[produk.id] || 0;
                                                    const isAvailable = produk.available;
                                                    return (
                                                        // This was returning two divs, now wrapped in a fragment
                                                        <div key={produk.id} onClick={() => isAvailable && updateQty(produk.id, 1)} className={`relative flex flex-col items-center justify-center p-2 border rounded-2xl transition-all duration-200 group cursor-pointer ${qty > 0 ? 'bg-green-50 border-green-300 shadow-md' : 'bg-white/80 backdrop-blur-sm border-slate-200 hover:border-purple-300 hover:shadow-lg'} ${!isAvailable ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed' : ''}`}>
                                                            {qty > 0 && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            removeFromCart(produk.id);
                                                                        }}
                                                                        className="absolute top-1 right-1 z-10 p-1 bg-red-100/80 text-red-600 rounded-full hover:bg-red-200 transition-all"
                                                                    >
                                                                        <Trash2 size={10} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            updateQty(produk.id, -1);
                                                                        }}
                                                                        className="absolute top-1 left-1 z-10 p-1 bg-slate-200/80 text-slate-700 rounded-full hover:bg-slate-300 transition-all"
                                                                    >
                                                                        <Minus size={10} />
                                                                    </button>
                                                                </>
                                                            )}
                                                            <div className="relative w-16 h-16">
                                                                <img src={produk.foto || 'https://via.placeholder.com/100?text=Produk'} alt={produk.nama} className={`w-full h-full object-contain transition-transform group-hover:scale-105 ${!isAvailable ? 'grayscale' : ''}`} onError={(e) => (e.target.src = 'https://via.placeholder.com/100?text=Produk')} />
                                                                {!isAvailable && (
                                                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
                                                                        <span className="text-[8px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">Habis</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] font-semibold text-slate-700 text-center mt-1.5 h-7 line-clamp-2">{produk.nama}</p>
                                                            <div className="mt-2 h-6 flex items-center justify-center">
                                                                {qty > 0 && (
                                                                    <div className="px-2 py-0.5 bg-green-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-lg">
                                                                        {qty} <span className="ml-0.5">box</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </form>

                            {/* Total & Submit (Sticky di bawah form) */}
                            <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm py-2 px-3 border-t border-gray-200">
                                <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 p-3 rounded-xl border border-purple-200/50 mb-3 shadow-sm relative overflow-hidden">
                                    {/* Decorative background elements */}
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200/30 rounded-full -translate-y-10 translate-x-10"></div>
                                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-indigo-200/30 rounded-full translate-y-8 -translate-x-8"></div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-center text-xs font-semibold text-purple-700 mb-2">
                                            <span className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                                                Total Box
                                            </span>
                                            <span className="bg-purple-100 px-2 py-0.5 rounded-full font-bold animate-bounce">{getTotalBoxes()} box</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm font-bold text-purple-800">
                                            <span className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                                                Total Belanja
                                            </span>
                                            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1.5 rounded-lg shadow-md transition-all duration-300">Rp{getGrandTotal().toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" form="visit-form" disabled={submitting || !selectedTokoId} className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg focus-ring group">
                                    {submitting ? (
                                        'Menyimpan...'
                                    ) : (
                                        <>
                                            Simpan Kunjungan <CheckCircle2 size={16} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Preview Resi */}
            {showReceiptPreview && (
                <div className="fixed inset-0 z-[400] bg-gradient-to-br from-blue-900/20 via-indigo-900/20 to-purple-900/20 backdrop-blur-sm flex flex-col items-center justify-end p-4 transition-opacity duration-300 animate-fade-in" onClick={closePreview}>
                    <div className="relative w-full max-w-sm bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 rounded-3xl shadow-2xl p-4 transition-transform duration-300 transform translate-y-0 animate-scale-in border border-blue-200/50" onClick={(e) => e.stopPropagation()}>
                        <button onClick={closePreview} className="absolute -top-3 -right-3 w-7 h-7 bg-gradient-to-r from-white to-slate-100 rounded-full flex items-center justify-center shadow-lg text-slate-600 hover:from-slate-100 hover:to-slate-200 transition-all duration-200 hover-scale focus-ring" aria-label="Tutup">
                            <X size={20} />
                        </button>
                        <div className="bg-white rounded-2xl overflow-hidden shadow-inner min-h-[200px] flex items-center justify-center border border-slate-200">{receiptLoading ? <Loader text="Membuat resi..." /> : <img src={previewImageUrl} alt="Pratinjau Resi" className="w-full h-auto rounded-xl" />}</div>
                        <div className="mt-4">
                            <button onClick={handleDownloadFromPreview} disabled={receiptLoading} className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover-lift hover-glow focus-ring disabled:opacity-50">
                                <Download size={20} />
                                Download Gambar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Konfirmasi Hapus */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[400] bg-gradient-to-br from-red-900/20 via-orange-900/20 to-yellow-900/20 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-gradient-to-br from-white via-red-50/30 to-orange-50/30 rounded-3xl shadow-2xl p-6 w-full max-w-sm animate-scale-in border border-red-200/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-red-200/20 rounded-full -translate-y-12 translate-x-12"></div>
                        <div className="absolute bottom-0 left-0 w-20 h-20 bg-orange-200/20 rounded-full translate-y-10 -translate-x-10"></div>
                        <div className="text-center relative z-10">
                            <div className="w-16 h-16 mx-auto flex items-center justify-center bg-gradient-to-br from-red-100 to-orange-100 rounded-full shadow-lg animate-bounce">
                                <Trash2 size={32} className="text-red-600" />
                            </div>
                            <h3 className="mt-4 text-base font-bold text-slate-800 gradient-text">Hapus Kunjungan?</h3>
                            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                                Anda akan menghapus kunjungan ke <strong className="text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">{itemToDelete?.tokoNama}</strong>. Tindakan ini tidak dapat dibatalkan.
                            </p>
                        </div>
                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-2.5 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:from-slate-200 hover:to-slate-300 transition-all duration-200 hover-lift focus-ring">
                                Batal
                            </button>
                            <button onClick={handleConfirmDelete} className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold text-sm hover:from-red-700 hover:to-red-800 transition-all duration-200 hover-lift hover-glow focus-ring shadow-lg">
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
