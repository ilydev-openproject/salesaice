// src/pages/TokoPage.jsx
import { useState } from 'react';

export default function TokoPage({ daftarToko, onTambahToko, onHapusToko }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [namaTokoBaru, setNamaTokoBaru] = useState('');
    const [kodeTokoBaru, setKodeTokoBaru] = useState('');

    const bukaModal = () => {
        setNamaTokoBaru('');
        setKodeTokoBaru('');
        setIsModalOpen(true);
    };

    const simpanTokoBaru = () => {
        if (!namaTokoBaru.trim()) {
            alert('Nama toko tidak boleh kosong!');
            return;
        }
        const tokoBaru = {
            id: Date.now(),
            nama: namaTokoBaru.trim(),
            kode: kodeTokoBaru.trim() || '-',
            createdAt: new Date().toLocaleString('id-ID'),
        };
        onTambahToko(tokoBaru);
        setIsModalOpen(false);
    };

    return (
        <div
            style={{
                padding: '20px',
                paddingBottom: '80px',
                maxWidth: '500px',
                margin: '0 auto',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: '#402566', fontSize: '22px' }}>🏪 Daftar Toko</h2>
                <button
                    onClick={bukaModal}
                    style={{
                        backgroundColor: '#402566',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '8px 16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}
                >
                    ➕ Tambah
                </button>
            </div>

            {daftarToko.length === 0 ? (
                <div
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '30px',
                        textAlign: 'center',
                        color: '#999',
                        boxShadow: '0 2px 8px rgba(64, 37, 102, 0.05)',
                        border: '1px solid #f0e6f6',
                    }}
                >
                    Belum ada toko.
                    <br />
                    <span style={{ fontSize: '14px' }}>Klik "Tambah" untuk membuat toko baru.</span>
                </div>
            ) : (
                <div>
                    {daftarToko.map((toko) => (
                        <div
                            key={toko.id}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                padding: '16px',
                                marginBottom: '12px',
                                boxShadow: '0 2px 8px rgba(64, 37, 102, 0.05)',
                                border: '1px solid #f0e6f6',
                                position: 'relative',
                            }}
                        >
                            <strong style={{ color: '#402566', fontSize: '16px' }}>{toko.nama}</strong>
                            <div style={{ color: '#6a4c93', fontSize: '14px', marginTop: '6px' }}>
                                Kode: <strong>{toko.kode}</strong>
                            </div>
                            <div style={{ color: '#999', fontSize: '12px', marginTop: '6px' }}>Ditambahkan: {toko.createdAt}</div>
                            <button
                                onClick={() => onHapusToko(toko.id)}
                                style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    background: 'none',
                                    border: 'none',
                                    color: '#e74c3c',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Tambah Toko */}
            {isModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000,
                    }}
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '20px',
                            width: '90%',
                            maxWidth: '450px',
                            padding: '24px',
                            position: 'relative',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ margin: '0 0 20px', color: '#402566', fontSize: '20px' }}>Tambah Toko Baru</h3>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#402566', fontWeight: '600' }}>Nama Toko *</label>
                            <input
                                type="text"
                                value={namaTokoBaru}
                                onChange={(e) => setNamaTokoBaru(e.target.value)}
                                placeholder="Contoh: Toko Jaya Abadi"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '12px',
                                    fontSize: '16px',
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#402566', fontWeight: '600' }}>Kode Toko (Opsional)</label>
                            <input
                                type="text"
                                value={kodeTokoBaru}
                                onChange={(e) => setKodeTokoBaru(e.target.value)}
                                placeholder="Contoh: TJ001"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '12px',
                                    fontSize: '16px',
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    border: '1px solid #402566',
                                    color: '#402566',
                                    borderRadius: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={simpanTokoBaru}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    backgroundColor: '#402566',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                }}
                            >
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
