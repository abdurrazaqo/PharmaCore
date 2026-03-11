import React, { useRef, useEffect, useState } from 'react';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Check if BarcodeDetector is available
      if ('BarcodeDetector' in window) {
        startBarcodeDetection();
      } else {
        // Fallback: show manual input
        setError('Barcode scanning not supported on this device. Please enter manually.');
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please check permissions or enter barcode manually.');
      setIsScanning(false);
    }
  };

  const startBarcodeDetection = async () => {
    try {
      // @ts-ignore - BarcodeDetector is experimental
      const barcodeDetector = new window.BarcodeDetector({
        formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code']
      });

      const detectBarcode = async () => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            
            if (barcodes.length > 0) {
              const barcode = barcodes[0].rawValue;
              onScan(barcode);
              stopCamera();
              onClose();
              return;
            }
          } catch (err) {
            console.error('Barcode detection error:', err);
          }
        }

        if (isScanning) {
          animationFrameRef.current = requestAnimationFrame(detectBarcode);
        }
      };

      detectBarcode();
    } catch (err) {
      console.error('BarcodeDetector initialization error:', err);
      setError('Barcode detection not supported. Please enter manually.');
    }
  };

  const stopCamera = () => {
    setIsScanning(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100001] bg-black/90 flex items-center justify-center p-4">
      <div className="relative z-[100002] bg-white dark:bg-surface-dark rounded-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">barcode_scanner</span>
            <h3 className="text-lg font-bold dark:text-white">Scan Barcode</h3>
          </div>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Camera View */}
        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          
          {/* Scanning Overlay */}
          {isScanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-48 border-4 border-primary rounded-lg relative">
                <div className="absolute inset-0 border-2 border-white/30 rounded-lg animate-pulse"></div>
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary animate-scan"></div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg text-center max-w-sm">
                <span className="material-symbols-outlined text-amber-500 text-4xl mb-2">warning</span>
                <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-xs text-center text-slate-600 dark:text-slate-400">
            {isScanning && !error 
              ? 'Position the barcode within the frame to scan'
              : 'Camera access required to scan barcodes'
            }
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-100%); }
          50% { transform: translateY(100%); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;
