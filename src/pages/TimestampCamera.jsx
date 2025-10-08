// src/components/TimestampCamera.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, SwitchCamera, MapPin, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const TimestampCamera = ({ onClose, visitData }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState('');
    const [facingMode, setFacingMode] = useState('environment'); // 'user' for front, 'environment' for back
    const [isProcessing, setIsProcessing] = useState(true); // Start with processing to get location

    const startCamera = useCallback(
        async (mode) => {
            try {
                // Hentikan stream lama jika ada
                if (stream) {
                    stream.getTracks().forEach((track) => track.stop());
                }
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: mode },
                });
                setStream(newStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = newStream;
                }
            } catch (err) {
                console.error('Error accessing camera:', err);
                alert('Tidak dapat mengakses kamera. Pastikan izin telah diberikan.');
                onClose();
            }
        },
        [stream, onClose],
    );

    useEffect(() => {
        // 1. Dapatkan Lokasi
        setIsProcessing(true);
        setLocationError('');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            },
            (error) => {
                setLocationError('Gagal mendapatkan lokasi.');
                console.error('Geolocation error:', error);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );

        // 2. Mulai Kamera
        startCamera(facingMode);

        // Cleanup function
        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [facingMode]); // Hanya dijalankan ulang saat facingMode berubah

    const handleSwitchCamera = () => {
        setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    };

    const handleCapture = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        setIsProcessing(true); // Show loader while processing image

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Sesuaikan ukuran canvas dengan video
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        canvas.width = videoWidth;
        canvas.height = videoHeight;

        // Gambar frame video ke canvas
        context.drawImage(video, 0, 0, videoWidth, videoHeight);

        // Siapkan teks timestamp
        const now = new Date();
        const timestampText = format(now, "d MMM yyyy, HH:mm:ss 'WIB'", { locale: id });
        const locationText = location ? `Lat: ${location.lat.toFixed(5)}, Lng: ${location.lng.toFixed(5)}` : locationError || 'Mencari lokasi...';
        const tokoText = `${visitData?.tokoNama || 'Nama Toko'} (${visitData?.kodeToko || 'Kode'})`;

        // Styling teks
        const fontSize = Math.max(24, videoWidth / 45); // Ukuran font responsif
        context.font = `bold ${fontSize}px Arial`;
        context.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Latar belakang semi-transparan
        const textBgHeight = fontSize * 3.8;
        context.fillRect(0, videoHeight - textBgHeight, videoWidth, textBgHeight);

        context.fillStyle = 'white';
        context.textAlign = 'left';
        const padding = 15;

        // Tulis teks ke canvas
        context.fillText(tokoText, padding, videoHeight - fontSize * 2.5 - padding / 2);
        context.fillText(timestampText, padding, videoHeight - fontSize * 1.5 - padding / 2);
        context.fillText(locationText, padding, videoHeight - fontSize * 0.5 - padding / 2);

        // Buat link download
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `visit_${visitData.tokoNama.replace(/\s/g, '_')}_${format(now, 'yyyyMMdd_HHmmss')}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setIsProcessing(false);
        alert('Foto berhasil disimpan ke perangkat Anda!');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in">
            <video ref={videoRef} autoPlay playsInline className="absolute top-0 left-0 w-full h-full object-cover"></video>
            <canvas ref={canvasRef} className="hidden"></canvas>

            {/* Overlay UI */}
            <div className="absolute inset-0 flex flex-col justify-between p-4">
                {/* Header */}
                <div className="flex justify-between items-center text-white">
                    <div className="bg-black/40 p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                        <MapPin size={14} className={location && !locationError ? 'text-green-400' : 'text-red-400'} />
                        {location ? 'GPS Terkunci' : locationError || 'Mencari GPS...'}
                    </div>
                    <button onClick={onClose} className="p-2 bg-black/40 rounded-full">
                        <X size={24} />
                    </button>
                </div>

                {/* Footer Controls */}
                <div className="flex justify-center items-center gap-10">
                    {/* Placeholder for gallery */}
                    <div className="w-16 h-16"></div>

                    {/* Capture Button */}
                    <button onClick={handleCapture} disabled={isProcessing || !!locationError} className="w-20 h-20 rounded-full border-4 border-white bg-white/30 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                        {isProcessing ? <Loader2 className="animate-spin text-white" size={32} /> : <Camera size={32} className="text-white" />}
                    </button>

                    {/* Switch Camera Button */}
                    <button onClick={handleSwitchCamera} className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center text-white">
                        <SwitchCamera size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TimestampCamera;
