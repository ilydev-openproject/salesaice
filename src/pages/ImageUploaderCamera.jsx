import { useState, useRef, useEffect, useCallback } from 'react';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { X, Camera, SwitchCamera, Loader2 } from 'lucide-react';

const ImageUploaderCamera = ({ onClose, onCapture }) => {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [facingMode, setFacingMode] = useState('environment');
    const [isProcessing, setIsProcessing] = useState(false);

    const startCamera = useCallback(
        async (mode) => {
            try {
                if (stream) {
                    stream.getTracks().forEach((track) => track.stop());
                }
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
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
        startCamera(facingMode);
        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [facingMode]);

    const handleSwitchCamera = () => {
        setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    };

    const handleCapture = async () => {
        if (!videoRef.current) return;
        setIsProcessing(true);

        const canvas = document.createElement('canvas');
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // Kompresi gambar

        try {
            const storage = getStorage();
            const fileName = `toko_photos/${new Date().getTime()}.jpg`;
            const storageRef = ref(storage, fileName);

            // Unggah gambar
            const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
            // Dapatkan URL download
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Kembalikan URL ke parent component
            onCapture(downloadURL);
            onClose();
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Gagal mengunggah foto. Silakan coba lagi.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[500] bg-black flex flex-col items-center justify-center animate-in fade-in">
            <video ref={videoRef} autoPlay playsInline className="absolute top-0 left-0 w-full h-full object-cover"></video>

            {/* Overlay UI */}
            <div className="absolute inset-0 flex flex-col justify-between p-4">
                {/* Header */}
                <div className="flex justify-end items-center text-white">
                    <button onClick={onClose} className="p-2 bg-black/40 rounded-full">
                        <X size={24} />
                    </button>
                </div>

                {/* Footer Controls */}
                <div className="flex justify-center items-center gap-10">
                    <div className="w-16 h-16"></div>

                    <button onClick={handleCapture} disabled={isProcessing} className="w-20 h-20 rounded-full border-4 border-white bg-white/30 flex items-center justify-center disabled:opacity-50">
                        {isProcessing ? <Loader2 className="animate-spin text-white" size={32} /> : <Camera size={32} className="text-white" />}
                    </button>

                    <button onClick={handleSwitchCamera} className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center text-white">
                        <SwitchCamera size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageUploaderCamera;
