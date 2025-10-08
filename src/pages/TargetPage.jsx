// src/pages/TargetPage.jsx
import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, Target, Save, CheckCircle2, Wallet, Package, MapPin } from 'lucide-react';
import Loader from '../components/Loader';

export default function TargetPage({ setActivePage, targets, onTargetsUpdate }) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState('');

    const [targetBox, setTargetBox] = useState('');
    const [targetPendapatan, setTargetPendapatan] = useState('');

    useEffect(() => {
        if (targets) {
            setTargetBox(targets.TARGET_BOX_BULANAN || '');
            setTargetPendapatan(targets.TARGET_PENDAPATAN_BULANAN || '');
        }
    }, [targets]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setNotification('');

        const newTargets = {
            TARGET_BOX_BULANAN: Number(targetBox) || 0,
            TARGET_PENDAPATAN_BULANAN: Number(targetPendapatan) || 0,
        };

        try {
            const targetDocRef = doc(db, 'config', 'salesTarget');
            await setDoc(targetDocRef, newTargets, { merge: true });
            onTargetsUpdate(newTargets); // Update state di App.jsx
            setNotification('Target berhasil disimpan!');
            setTimeout(() => setNotification(''), 3000);
        } catch (error) {
            console.error('Error saving targets:', error);
            alert('Gagal menyimpan target.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <Loader text="Memuat pengaturan target..." />;
    }

    return (
        <div className="p-5 pb-20 max-w-md mx-auto animate-in fade-in duration-300">
            <div className="flex items-center mb-6 relative">
                <button onClick={() => setActivePage('home')} className="p-2 rounded-full hover:bg-slate-100 absolute left-0">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-slate-800 flex-grow text-center flex items-center justify-center gap-2">
                    <Target className="text-purple-600" />
                    Atur Target Bulanan
                </h1>
            </div>

            {notification && (
                <div className="bg-green-100 border border-green-300 text-green-800 text-sm font-semibold px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                    <CheckCircle2 size={18} />
                    {notification}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                        <Package size={16} className="text-blue-500" />
                        Target Total Box Terjual
                    </label>
                    <input type="number" value={targetBox} onChange={(e) => setTargetBox(e.target.value)} placeholder="Contoh: 1500" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                        <Wallet size={16} className="text-green-500" />
                        Target Total Pendapatan (Rp)
                    </label>
                    <input type="number" value={targetPendapatan} onChange={(e) => setTargetPendapatan(e.target.value)} placeholder="Contoh: 150000000" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                </div>

                <div className="pt-2">
                    <button type="submit" disabled={saving} className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                        {saving ? 'Menyimpan...' : 'Simpan Target'}
                        {!saving && <Save size={18} />}
                    </button>
                </div>
            </form>
        </div>
    );
}
