// src/pages/HomePage.jsx
import { useState, useEffect } from 'react';

export default function HomePage({ daftarToko, sales }) {
    // Hitung data hari ini
    const today = new Date().toLocaleDateString('id-ID');
    const todaySales = sales.filter((sale) => new Date(sale.date).toLocaleDateString('id-ID') === today);
    const totalKunjungan = todaySales.length;
    const totalPendapatan = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const totalBoxTerjual = todaySales.reduce((sum, sale) => sum + sale.items.reduce((qty, item) => qty + item.quantity, 0), 0);

    // Ambil toko pertama sebagai default
    const tokoAktif = daftarToko.length > 0 ? daftarToko[0] : null;

    const openModal = () => {
        alert('Fitur penambahan kunjungan akan dikembangkan segera!');
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
            {/* Header */}
            <header
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px',
                    paddingTop: '10px',
                }}
            >
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#402566' }}>{tokoAktif ? tokoAktif.nama : 'SalesApp'}</h1>
                    <p style={{ margin: '4px 0 0', color: '#6a4c93', fontSize: '14px' }}>{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#402566',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                    }}
                >
                    {tokoAktif ? tokoAktif.nama.charAt(0).toUpperCase() : 'SA'}
                </div>
            </header>

            {/* Summary */}
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    padding: '24px',
                    marginBottom: '24px',
                    textAlign: 'center',
                    boxShadow: '0 4px 16px rgba(64, 37, 102, 0.15)',
                    border: '1px solid #eee',
                }}
            >
                <p style={{ margin: 0, color: '#6a4c93', fontSize: '16px', fontWeight: '600' }}>Total Box Terjual Hari Ini</p>
                <p style={{ margin: '8px 0 0', fontSize: '36px', fontWeight: '800', color: '#402566' }}>{totalBoxTerjual}</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <div
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '16px',
                        flex: 1,
                        boxShadow: '0 2px 10px rgba(64, 37, 102, 0.1)',
                        border: '1px solid #f0e6f6',
                    }}
                >
                    <p style={{ margin: 0, color: '#6a4c93', fontSize: '13px' }}>Total Kunjungan</p>
                    <p style={{ margin: '6px 0 0', fontSize: '22px', fontWeight: '700', color: '#402566' }}>{totalKunjungan}</p>
                </div>
                <div
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '16px',
                        flex: 1,
                        boxShadow: '0 2px 10px rgba(64, 37, 102, 0.1)',
                        border: '1px solid #f0e6f6',
                    }}
                >
                    <p style={{ margin: 0, color: '#6a4c93', fontSize: '13px' }}>Pendapatan</p>
                    <p style={{ margin: '6px 0 0', fontSize: '22px', fontWeight: '700', color: '#27ae60' }}>Rp{totalPendapatan.toLocaleString('id-ID')}</p>
                </div>
            </div>

            <button
                onClick={openModal}
                style={{
                    width: '100%',
                    padding: '16px',
                    backgroundColor: '#402566',
                    color: 'white',
                    border: 'none',
                    borderRadius: '16px',
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '24px',
                    boxShadow: '0 4px 14px rgba(64, 37, 102, 0.3)',
                    cursor: 'pointer',
                }}
            >
                ➕ Tambah Kunjungan Baru
            </button>

            {/* Riwayat */}
            <div>
                <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#402566' }}>Kunjungan Terbaru</h2>
                {sales.length === 0 ? (
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '20px',
                            textAlign: 'center',
                            color: '#999',
                            boxShadow: '0 2px 8px rgba(64, 37, 102, 0.05)',
                            border: '1px solid #f0e6f6',
                        }}
                    >
                        Belum ada kunjungan.
                    </div>
                ) : (
                    <div>
                        {sales.slice(0, 3).map((sale) => (
                            <div
                                key={sale.id}
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: '16px',
                                    padding: '16px',
                                    marginBottom: '12px',
                                    boxShadow: '0 2px 8px rgba(64, 37, 102, 0.05)',
                                    border: '1px solid #f0e6f6',
                                    fontSize: '15px',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <strong>{sale.customer}</strong>
                                    <span style={{ color: '#27ae60', fontWeight: '600' }}>Rp{sale.total.toLocaleString('id-ID')}</span>
                                </div>
                                <div style={{ color: '#6a4c93', fontSize: '13px' }}>{sale.date}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
