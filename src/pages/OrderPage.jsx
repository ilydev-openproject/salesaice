// src/pages/OrderPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format } from 'date-fns';
import { toPng } from 'html-to-image';
import { db } from '../lib/firebase';
import { Store, Package, Plus, Minus, CheckCircle2, XCircle, ChevronDown, ArrowLeft, ShoppingCart, Calendar, Pencil, Trash2, Search, CalendarRange, Download, MoreVertical, Eye, X, AlertTriangle, ShoppingBag } from 'lucide-react';
import Loader from '../components/Loader';
import VisitReceipt from '../components/VisitReceipt'; // Re-using VisitReceipt for orders

export default function OrderPage({ setActivePage }) {
    const [orderList, setOrderList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [tokoList, setTokoList] = useState([]);
    const [produkList, setProdukList] = useState([]);
    const [selectedTokoId, setSelectedTokoId] = useState('');
    const [catatan, setCatatan] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [cart, setCart] = useState({}); // { productId: jumlahBox }
    const [isTokoDropdownOpen, setIsTokoDropdownOpen] = useState(false);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [tokoSearchTerm, setTokoSearchTerm] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [productSearchTerm, setProductSearchTerm] = useState('');

    // Date filter state
    const [filterType, setFilterType] = useState('today'); // 'today', 'custom'
    const [customDate, setCustomDate] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);

    // Receipt export state
    const [receiptOrder, setReceiptOrder] = useState(null);
    const receiptRef = useRef(null);

    // Receipt preview modal state
    const [showReceiptPreview, setShowReceiptPreview] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState('');
    const [previewImageFilename, setPreviewImageFilename] = useState('');
    const [receiptLoading, setReceiptLoading] = useState(false);

    // Notification state
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

    // Delete confirmation modal state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: 'success' });
        }, 3000);
    };

    const [openMenuId, setOpenMenuId] = useState(null);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            await Promise.all([fetchOrders(), loadTokoData()]);
            setLoading(false);
        };
        loadInitialData();
    }, []);

    const loadFormData = async () => {
        if (isDataLoaded) return;
        try {
            const produkSnap = await getDocs(collection(db, 'produk'));
            const produkData = produkSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.available === b.available ? a.nama.localeCompare(b.nama) : a.available ? -1 : 1));
            setProdukList(produkData);
            setIsDataLoaded(true);
        } catch (error) {
            console.error('Error loading form data:', error);
            showNotification('Gagal memuat data produk.', 'error');
        }
    };

    useEffect(() => {
        if (showForm && !isDataLoaded) {
            loadFormData();
        }
    }, [showForm, isDataLoaded]);

    const fetchOrders = async () => {
        try {
            const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setOrderList(list);
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    const loadTokoData = async () => {
        try {
            const tokoSnap = await getDocs(collection(db, 'toko'));
            const tokoData = tokoSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setTokoList(tokoData);
        } catch (error) {
            console.error('Error loading toko data:', error);
        }
    };

    const handleSelectToko = (tokoId) => {
        setSelectedTokoId(tokoId);
        setIsTokoDropdownOpen(false);
        setTokoSearchTerm('');
    };

    const updateQty = (productId, delta) => {
        setCart((prev) => {
            const current = prev[productId] || 0;
            const newQty = Math.max(0, current + delta);
            const newCart = { ...prev, [productId]: newQty };
            if (newQty === 0) delete newCart[productId];
            return newCart;
        });
    };

    const getTotalHarga = (produk) => (cart[produk.id] || 0) * (produk.hargaPerBox || 0);
    const getGrandTotal = () => produkList.reduce((sum, produk) => sum + getTotalHarga(produk), 0);
    const getTotalBoxes = () => Object.values(cart).reduce((sum, qty) => sum + qty, 0);

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

        const orderData = {
            tokoId: selectedTokoId,
            tokoNama: selectedToko?.nama || 'Toko Tidak Diketahui',
            kodeToko: selectedToko?.kode || '',
            items,
            catatan: catatan.trim(),
            total: getGrandTotal(),
        };

        setSubmitting(true);
        try {
            if (editingOrderId) {
                const orderRef = doc(db, 'orders', editingOrderId);
                await updateDoc(orderRef, orderData);
                showNotification('Order berhasil diperbarui.');
            } else {
                await addDoc(collection(db, 'orders'), {
                    ...orderData,
                    createdAt: serverTimestamp(),
                });
                showNotification('Order berhasil disimpan.');
            }
            resetForm();
            fetchOrders();
        } catch (error) {
            console.error('Error saving order:', error);
            showNotification('Gagal menyimpan order.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const openForm = async () => {
        await loadFormData();
        setShowForm(true);
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingOrderId(null);
        setCart({});
        setCatatan('');
        setSelectedTokoId('');
        setTokoSearchTerm('');
        setProductSearchTerm('');
    };

    const handleEdit = async (order) => {
        await loadFormData();
        setEditingOrderId(order.id);
        setSelectedTokoId(order.tokoId);
        setCatatan(order.catatan || '');
        const initialCart = order.items.reduce((acc, item) => {
            acc[item.productId] = item.qtyBox;
            return acc;
        }, {});
        setCart(initialCart);
        setShowForm(true);
    };

    const openDeleteConfirm = (order) => {
        setItemToDelete(order);
        setShowDeleteConfirm(true);
        closeMenu();
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteDoc(doc(db, 'orders', itemToDelete.id));
            showNotification('Order berhasil dihapus.');
            fetchOrders();
            setShowDeleteConfirm(false);
            setItemToDelete(null);
        } catch (error) {
            console.error('Error deleting order:', error);
            showNotification('Gagal menghapus order.', 'error');
        }
    };

    const filteredOrders = orderList
        .filter((order) => {
            if (!order.createdAt?.seconds) return false;
            const orderDate = new Date(order.createdAt.seconds * 1000);
            if (filterType === 'today') {
                const today = new Date();
                return orderDate.getDate() === today.getDate() && orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
            }
            if (filterType === 'custom') {
                return orderDate.getDate() === customDate.getDate() && orderDate.getMonth() === customDate.getMonth() && orderDate.getFullYear() === customDate.getFullYear();
            }
            return true;
        })
        .filter((order) => order.tokoNama.toLowerCase().includes(searchTerm.toLowerCase()) || (order.kodeToko && order.kodeToko.toLowerCase().includes(searchTerm.toLowerCase())));

    const handleDateSelect = (date) => {
        if (date) {
            setCustomDate(date);
            setFilterType('custom');
        }
        setShowCalendar(false);
    };

    const handlePreview = useCallback(async (order) => {
        setReceiptOrder(order);
        setReceiptLoading(true);
        setShowReceiptPreview(true);

        setTimeout(async () => {
            const node = document.getElementById(`receipt-${order.id}`);
            if (!node) {
                showNotification('Gagal menemukan elemen resi.', 'error');
                setReceiptOrder(null);
                setReceiptLoading(false);
                return;
            }

            try {
                const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 });
                setPreviewImageUrl(dataUrl);
                setPreviewImageFilename(`resi-${order.tokoNama.replace(/\s/g, '_')}-${format(new Date(), 'yyyyMMdd')}.png`);
            } catch (err) {
                console.error('Oops, something went wrong!', err);
                showNotification('Gagal membuat pratinjau resi.', 'error');
            } finally {
                setReceiptLoading(false);
                // Keep receiptOrder to show the component until modal is closed
            }
        }, 100);
    }, []);

    const closePreview = () => {
        setShowReceiptPreview(false);
        setPreviewImageUrl('');
        setReceiptOrder(null);
    };

    const handleMenuClick = (e, orderId) => {
        e.stopPropagation();
        setOpenMenuId(openMenuId === orderId ? null : orderId);
    };

    const closeMenu = () => setOpenMenuId(null);

    const handleDownloadFromPreview = () => {
        const link = document.createElement('a');
        link.download = previewImageFilename;
        link.href = previewImageUrl;
        link.click();
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <Loader text="Memuat data order..." />
            </div>
        );
    }

    return (
        <>
            {notification.show && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 transition-all duration-300 animate-in slide-in-from-top-5 fade-in">
                    <div className={`flex items-center gap-3 w-full p-3 rounded-xl shadow-2xl border ${notification.type === 'success' ? 'bg-green-500 border-green-600 text-white' : 'bg-red-500 border-red-600 text-white'}`}>
                        {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                        <p className="font-semibold text-sm flex-1">{notification.message}</p>
                        <button onClick={() => setNotification({ ...notification, show: false })} className="opacity-70 hover:opacity-100">
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            <div className="pb-20 max-w-md mx-auto" onClick={closeMenu}>
                <div className="p-5 pb-20 max-w-md mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <ShoppingBag className="text-purple-600" />
                            Order
                        </h2>
                        <button onClick={openForm} className="bg-purple-600 text-white px-4 py-2 rounded-full font-semibold flex items-center gap-2 hover:bg-purple-700 transition shadow-md hover:shadow-lg">
                            <Plus size={18} /> Tambah
                        </button>
                    </div>

                    <div className="relative mb-4">
                        <input type="text" placeholder="Cari nama atau kode toko..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 pl-10 text-slate-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    </div>

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
                                <DayPicker mode="single" selected={customDate} onSelect={handleDateSelect} captionLayout="dropdown-buttons" fromYear={2020} toYear={new Date().getFullYear() + 1} classNames={{ caption_label: 'text-lg font-bold', head_cell: 'font-semibold', day_selected: 'bg-purple-600 text-white rounded-full hover:bg-purple-700 focus:bg-purple-700', day_today: 'font-bold text-purple-600' }} />
                            </div>
                        )}
                    </div>

                    {filteredOrders.length === 0 ? (
                        <div className="text-center text-gray-500 py-10 bg-slate-50 rounded-lg">
                            <ShoppingCart size={40} className="mx-auto text-gray-400 mb-2" />
                            {searchTerm ? 'Order tidak ditemukan.' : 'Belum ada order yang tercatat.'}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredOrders.map((order) => {
                                const totalBoxes = order.items.reduce((sum, item) => sum + item.qtyBox, 0);
                                return (
                                    <div key={order.id} onClick={() => handleEdit(order)} className="bg-white rounded-xl shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md hover:border-purple-200 cursor-pointer relative">
                                        <div className="p-3 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-fuchsia-100 flex items-center justify-center text-purple-600 font-bold text-lg">{order.tokoNama.charAt(0).toUpperCase()}</div>
                                            <div className="flex-grow">
                                                <h3 className="font-bold text-slate-800 text-sm leading-tight">{order.tokoNama}</h3>
                                                <p className="text-xs text-gray-500">{order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Baru saja'}</p>
                                            </div>
                                            <div className="text-right pr-5">
                                                <p className={`font-bold text-sm ${order.total > 0 ? 'text-green-600' : 'text-slate-500'}`}>Rp{order.total.toLocaleString('id-ID')}</p>
                                                <p className="text-xs text-slate-500">{totalBoxes} box</p>
                                            </div>
                                        </div>
                                        <div className="absolute top-1/2 right-2 -translate-y-1/2">
                                            <button onClick={(e) => handleMenuClick(e, order.id)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>
                                        {openMenuId === order.id && (
                                            <div className="absolute top-10 right-5 z-20 w-48 bg-white rounded-lg shadow-xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
                                                <div className="py-1">
                                                    <button
                                                        onClick={() => {
                                                            handleEdit(order);
                                                            closeMenu();
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-3"
                                                    >
                                                        <Pencil size={16} /> Edit Order
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            handlePreview(order);
                                                            closeMenu();
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-3"
                                                    >
                                                        <Eye size={16} /> Lihat Resi
                                                    </button>
                                                    <div className="my-1 h-px bg-slate-100"></div>
                                                    <button
                                                        onClick={() => {
                                                            openDeleteConfirm(order);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                                                    >
                                                        <Trash2 size={16} /> Hapus Order
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

                <div className="fixed -left-[9999px] top-0">{receiptOrder && <VisitReceipt kunjungan={receiptOrder} ref={receiptRef} />}</div>

                <div className={`fixed inset-0 z-50 transition-colors duration-300 ${showForm ? 'bg-black/40' : 'bg-transparent pointer-events-none'}`}>
                    <div className={`absolute inset-y-0 left-0 w-full max-w-md bg-slate-50 shadow-2xl transition-transform duration-300 ease-in-out transform ${showForm ? 'translate-x-0' : '-translate-x-full'}`}>
                        <div className="h-full flex flex-col">
                            <div className="flex items-center justify-between p-4 bg-white">
                                <button type="button" onClick={resetForm} className="p-2 rounded-full hover:bg-slate-100" aria-label="Kembali">
                                    <ArrowLeft size={20} />
                                </button>
                                <h2 className="text-lg font-bold text-slate-800">{editingOrderId ? 'Edit Order' : 'Tambah Order'}</h2>
                                <div className="w-10"></div>
                            </div>

                            <form id="order-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Toko</label>
                                    <div className="relative" style={{ pointerEvents: editingOrderId ? 'none' : 'auto', opacity: editingOrderId ? 0.7 : 1 }}>
                                        <button type="button" onClick={() => setIsTokoDropdownOpen(!isTokoDropdownOpen)} className="w-full p-2.5 text-left bg-white border border-gray-300 rounded-lg flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-purple-500">
                                            <span className="flex items-center gap-2">
                                                <Store size={18} className="text-slate-500" />
                                                {tokoList.find((t) => t.id === selectedTokoId)?.nama || 'Pilih Toko'}
                                            </span>
                                            <ChevronDown size={20} className={`transition-transform ${isTokoDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isTokoDropdownOpen && (
                                            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col">
                                                <div className="p-2 border-b border-gray-200">
                                                    <input type="text" placeholder="Cari toko..." value={tokoSearchTerm} onChange={(e) => setTokoSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500" />
                                                </div>
                                                <div className="max-h-48 overflow-y-auto">
                                                    {tokoList
                                                        .filter((t) => t.nama.toLowerCase().includes(tokoSearchTerm.toLowerCase()) || (t.kode && t.kode.toLowerCase().includes(tokoSearchTerm.toLowerCase())))
                                                        .slice()
                                                        .sort((a, b) => a.nama.localeCompare(b.nama))
                                                        .map((toko) => (
                                                            <div key={toko.id} onClick={() => handleSelectToko(toko.id)} className={`p-2.5 cursor-pointer hover:bg-purple-50 flex justify-between items-center ${selectedTokoId === toko.id ? 'bg-purple-100 font-semibold' : ''}`}>
                                                                <span>
                                                                    {toko.nama}
                                                                    {toko.kode && <span className="text-xs text-slate-500 ml-2">({toko.kode})</span>}
                                                                </span>
                                                                {selectedTokoId === toko.id && <CheckCircle2 size={16} className="text-purple-600" />}
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Catatan (Opsional)</label>
                                    <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan untuk order..." className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" rows="3" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Package className="text-purple-600" size={18} />
                                        <h3 className="text-base font-semibold text-slate-800">Pilih Produk</h3>
                                    </div>
                                    <div className="relative mb-3">
                                        <input type="text" placeholder="Cari produk..." value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} className="w-full p-2.5 pl-10 text-slate-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    </div>
                                    {produkList.length === 0 ? (
                                        <div className="text-center py-2 text-gray-500 text-sm">Memuat produk...</div>
                                    ) : (
                                        <div className="space-y-3">
                                            {produkList
                                                .filter((p) => p.nama.toLowerCase().includes(productSearchTerm.toLowerCase()))
                                                .map((produk) => {
                                                    const qty = cart[produk.id] || 0;
                                                    const isAvailable = produk.available;
                                                    return (
                                                        <div key={produk.id} className={`rounded-xl p-2.5 border transition-all duration-300 ${qty > 0 ? 'bg-lime-400 border-lime-400' : 'bg-white border-gray-200'} ${!isAvailable ? 'bg-slate-100 border-slate-200' : ''}`}>
                                                            <div className="flex items-center gap-3">
                                                                <div className="relative w-14 h-14 flex-shrink-0">
                                                                    <img
                                                                        src={produk.foto || 'https://via.placeholder.com/100?text=Produk'}
                                                                        alt={produk.nama}
                                                                        className={`w-full h-full object-cover rounded-lg ${!isAvailable ? 'grayscale' : ''}`}
                                                                        onError={(e) => {
                                                                            e.target.src = 'https://via.placeholder.com/100?text=Produk';
                                                                        }}
                                                                    />
                                                                    {!isAvailable && (
                                                                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg text-center">
                                                                            <span className="text-xs font-bold text-red-600">Habis</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-grow">
                                                                    <h4 className={`font-bold text-xs text-slate-800 ${!isAvailable ? 'line-through text-slate-500' : ''}`}>{produk.nama}</h4>
                                                                    <p className="text-xs text-slate-600 mt-1">Rp{(produk.hargaPerBox || 0).toLocaleString('id-ID')} / box</p>
                                                                </div>
                                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                                    <button type="button" onClick={() => updateQty(produk.id, -1)} className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-300 disabled:opacity-50" disabled={qty === 0 || !isAvailable}>
                                                                        <Minus size={16} />
                                                                    </button>
                                                                    <span className="w-7 text-center font-bold text-base text-purple-700">{qty}</span>
                                                                    <button type="button" onClick={() => updateQty(produk.id, 1)} className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white hover:bg-purple-700 disabled:opacity-50 disabled:bg-slate-300" disabled={!isAvailable}>
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
                                <button type="submit" form="order-form" disabled={submitting || !selectedTokoId} className="w-full py-4 bg-purple-600 text-white rounded-lg font-bold text-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {submitting ? 'Menyimpan...' : 'Simpan Order'}
                                    <CheckCircle2 size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showReceiptPreview && (
                <div className="fixed inset-0 z-[60] bg-black/70 flex flex-col items-center justify-end p-4 transition-opacity duration-300" onClick={closePreview}>
                    <div className="relative w-full max-w-sm bg-slate-100 rounded-2xl shadow-2xl p-4 transition-transform duration-300 transform translate-y-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={closePreview} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-slate-600 hover:bg-slate-200 transition" aria-label="Tutup">
                            <X size={20} />
                        </button>
                        <div className="bg-white rounded-lg overflow-hidden shadow-inner min-h-[200px] flex items-center justify-center">{receiptLoading ? <Loader text="Membuat resi..." /> : <img src={previewImageUrl} alt="Pratinjau Resi" className="w-full h-auto" />}</div>
                        <div className="mt-4">
                            <button onClick={handleDownloadFromPreview} disabled={receiptLoading} className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold text-base hover:bg-purple-700 transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50">
                                <Download size={20} />
                                Download Gambar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 slide-in-from-bottom-5">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto flex items-center justify-center bg-red-100 rounded-full">
                                <Trash2 size={32} className="text-red-600" />
                            </div>
                            <h3 className="mt-4 text-xl font-bold text-slate-800">Hapus Order?</h3>
                            <p className="mt-2 text-sm text-slate-500">
                                Anda akan menghapus order untuk <strong className="text-slate-700">{itemToDelete?.tokoNama}</strong>. Tindakan ini tidak dapat dibatalkan.
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
        </>
    );
}
