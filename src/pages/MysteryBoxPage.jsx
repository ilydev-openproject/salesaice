// src/pages/MysteryBoxPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Gift, Check, Loader2, Undo2, AlertTriangle, X } from 'lucide-react';
import Loader from '../components/Loader';

export default function MysteryBoxPage() {
    const [tokoList, setTokoList] = useState([]);
    const [orderList, setOrderList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [showUndoConfirm, setShowUndoConfirm] = useState(false);
    const [itemToUndo, setItemToUndo] = useState(null);

    const MYSTERY_BOX_THRESHOLD = 25;

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tokoSnapshot, orderSnapshot] = await Promise.all([getDocs(collection(db, 'toko')), getDocs(collection(db, 'orders'))]);
            setTokoList(tokoSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
            setOrderList(orderSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error fetching toko data:', error);
            alert('Gagal memuat data toko.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleGiveReward = async (toko, monthKey) => {
        if (updatingId) return; // Prevent multiple clicks

        if (toko.pendingRewards <= 0) {
            alert('Toko ini tidak berhak mendapat hadiah untuk periode ini.');
            return;
        }

        setUpdatingId(`${toko.id}-${monthKey}`);
        try {
            const tokoRef = doc(db, 'toko', toko.id);
            const currentClaimed = toko.monthlyRewardsClaimed?.[monthKey] || 0;
            const newClaimedTotal = currentClaimed + toko.pendingRewards;

            await updateDoc(tokoRef, {
                [`monthlyRewardsClaimed.${monthKey}`]: newClaimedTotal,
            });

            // Update state locally to reflect the change immediately
            setTokoList((prevList) => prevList.map((t) => (t.id === toko.id ? { ...t, monthlyRewardsClaimed: { ...(t.monthlyRewardsClaimed || {}), [monthKey]: newClaimedTotal } } : t)));
        } catch (error) {
            console.error('Error giving reward:', error);
            alert('Gagal memberikan hadiah.');
        } finally {
            setUpdatingId(null);
        }
    };

    const openUndoConfirm = (toko, monthKey) => {
        setItemToUndo({ toko, monthKey });
        setShowUndoConfirm(true);
    };

    const handleConfirmUndo = async () => {
        if (!itemToUndo) return;
        const { toko, monthKey } = itemToUndo;

        if (updatingId) return; // Mencegah klik ganda

        setUpdatingId(`${toko.id}-${monthKey}`);
        try {
            const tokoRef = doc(db, 'toko', toko.id);

            // Set jumlah yang diklaim menjadi 0 untuk bulan tersebut
            await updateDoc(tokoRef, {
                [`monthlyRewardsClaimed.${monthKey}`]: 0,
            });

            // Update state lokal untuk merefleksikan perubahan
            setTokoList((prevList) => prevList.map((t) => (t.id === toko.id ? { ...t, monthlyRewardsClaimed: { ...(t.monthlyRewardsClaimed || {}), [monthKey]: 0 } } : t)));
        } catch (error) {
            console.error('Error undoing reward:', error);
            alert('Gagal membatalkan hadiah.');
        } finally {
            setUpdatingId(null);
            setShowUndoConfirm(false);
            setItemToUndo(null);
        }
    };

    const rewardStatus = useMemo(() => {
        if (loading) return { eligible: [], claimed: [] };

        const today = new Date();
        const currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);

        const periods = [{ name: 'Bulan Ini', date: currentMonthDate, key: `${currentMonthDate.getFullYear()}-${String(currentMonthDate.getMonth() + 1).padStart(2, '0')}` }];

        // Hanya tambahkan bulan lalu jika belum lewat tanggal 15
        if (today.getDate() <= 15) {
            periods.push({ name: 'Bulan Lalu', date: lastMonthDate, key: `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}` });
        }

        const eligibleList = [];
        const claimedList = [];

        periods.forEach((period) => {
            tokoList.forEach((toko) => {
                const ordersInMonth = orderList.filter((order) => {
                    if (!order.createdAt?.seconds) return false;
                    const orderDate = new Date(order.createdAt.seconds * 1000);
                    return order.tokoId === toko.id && orderDate.getFullYear() === period.date.getFullYear() && orderDate.getMonth() === period.date.getMonth();
                });

                const totalBoxes = ordersInMonth.reduce((sum, order) => sum + (order.items?.reduce((itemSum, item) => itemSum + item.qtyBox, 0) || 0), 0);
                const eligibleCount = Math.floor(totalBoxes / MYSTERY_BOX_THRESHOLD);
                const claimedCount = toko.monthlyRewardsClaimed?.[period.key] || 0;
                const pendingRewards = eligibleCount - claimedCount;

                if (pendingRewards > 0) {
                    eligibleList.push({ ...toko, pendingRewards, totalBoxes, periodName: period.name, monthKey: period.key });
                } else if (eligibleCount > 0) {
                    // Pernah berhak, tapi sudah diklaim semua
                    claimedList.push({ ...toko, claimedRewards: eligibleCount, totalBoxes, periodName: period.name, monthKey: period.key });
                }
            });
        });

        return {
            eligible: eligibleList.sort((a, b) => b.pendingRewards - a.pendingRewards || b.totalBoxes - a.totalBoxes),
            claimed: claimedList.sort((a, b) => new Date(b.monthKey) - new Date(a.monthKey) || b.totalBoxes - a.totalBoxes),
        };
    }, [tokoList, orderList, loading]);

    const { eligible: eligibleToko, claimed: claimedToko } = rewardStatus;

    if (loading) {
        return <Loader text="Mencari toko yang berhak..." />;
    }

    return (
        <div className="p-5 pb-20 max-w-md mx-auto animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Gift className="text-purple-600" size={20} />
                    <h1 className="text-2xl font-bold text-slate-800">Mystery Box</h1>
                </div>
            </div>

            {eligibleToko.length === 0 && claimedToko.length === 0 ? (
                <div className="text-center py-10 text-gray-500 bg-slate-50 rounded-xl">
                    <Gift size={40} className="mx-auto text-gray-400 mb-2" />
                    Belum ada toko yang berhak mendapatkan Mystery Box.
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Bagian Toko yang Berhak */}
                    {eligibleToko.length > 0 && (
                        <div>
                            <h2 className="text-base font-bold text-slate-700 mb-3">Berhak Mendapat Hadiah</h2>
                            <div className="space-y-3">
                                {eligibleToko.map((toko) => (
                                    <div key={`${toko.id}-${toko.monthKey}`} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold text-base text-slate-800">{toko.nama}</h3>
                                            <p className="text-xs font-semibold text-purple-600">{toko.periodName}</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Total Order: <span className="font-semibold">{toko.totalBoxes} box</span>
                                            </p>
                                            <p className="text-sm font-bold text-green-600 mt-1">Berhak mendapat: {toko.pendingRewards} Hadiah</p>
                                        </div>
                                        <button onClick={() => handleGiveReward(toko, toko.monthKey)} disabled={updatingId === `${toko.id}-${toko.monthKey}`} className="bg-green-600 text-white px-4 py-2 rounded-full font-semibold flex items-center gap-2 hover:bg-green-700 transition shadow-md disabled:opacity-50">
                                            {updatingId === `${toko.id}-${toko.monthKey}` ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                            Berikan
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bagian Toko yang Sudah Diberi */}
                    {claimedToko.length > 0 && (
                        <div>
                            <h2 className="text-base font-bold text-slate-700 mb-3">Riwayat Pemberian Hadiah</h2>
                            <div className="space-y-3">
                                {claimedToko.map((toko) => (
                                    <div key={`${toko.id}-${toko.monthKey}`} className="bg-slate-50 rounded-xl p-4 border border-gray-200 flex items-center justify-between opacity-70">
                                        <div>
                                            <h3 className="font-bold text-base text-slate-600">{toko.nama}</h3>
                                            <p className="text-xs font-semibold text-slate-500">{toko.periodName}</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Total Order: <span className="font-semibold">{toko.totalBoxes} box</span>
                                            </p>
                                            <p className="text-sm font-bold text-slate-600 mt-1">Diberikan: {toko.claimedRewards} Hadiah</p>
                                        </div>
                                        <button onClick={() => openUndoConfirm(toko, toko.monthKey)} disabled={updatingId === `${toko.id}-${toko.monthKey}`} className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-semibold flex items-center gap-2 text-sm hover:bg-yellow-200 transition disabled:opacity-50">
                                            {updatingId === `${toko.id}-${toko.monthKey}` ? <Loader2 size={18} className="animate-spin" /> : <Undo2 size={18} />}
                                            Batalkan
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Konfirmasi Pembatalan */}
            {showUndoConfirm && itemToUndo && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 slide-in-from-bottom-5">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto flex items-center justify-center bg-yellow-100 rounded-full">
                                <AlertTriangle size={32} className="text-yellow-600" />
                            </div>
                            <h3 className="mt-4 text-xl font-bold text-slate-800">Batalkan Hadiah?</h3>
                            <p className="mt-2 text-sm text-slate-500">
                                Anda akan membatalkan <strong className="text-slate-700">{itemToUndo.toko.claimedRewards} hadiah</strong> yang telah diberikan kepada <strong className="text-slate-700">{itemToUndo.toko.nama}</strong> untuk periode <strong className="text-slate-700">{itemToUndo.toko.periodName}</strong>.
                            </p>
                            <p className="mt-1 text-sm text-slate-500">Tindakan ini akan mengembalikan toko ke daftar "Berhak Mendapat Hadiah".</p>
                        </div>
                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button onClick={() => setShowUndoConfirm(false)} className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition">
                                Tutup
                            </button>
                            <button onClick={handleConfirmUndo} className="w-full py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition">
                                Ya, Batalkan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
