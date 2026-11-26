import { cn } from "@/lib/utils";
import { Camera, ScanLine, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface MobileQrScannerProps {
  onScan: (value: string) => void;
  formats?: string[];
  label?: string;
  autoStart?: boolean;
  className?: string;
}

export const MobileQrScanner: React.FC<MobileQrScannerProps> = ({
  onScan,
  formats = ["qr_code", "code_128", "code_39"],
  label = "Scan",
  autoStart = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [chosenFormats, setChosenFormats] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeRef = useRef(false);
  const autoStartedRef = useRef(false);

  const close = useCallback(() => {
    activeRef.current = false;
    setOpen(false);
  }, []);

  const start = useCallback(async () => {
    setError("");
    const Detector = (window as any).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setError("Camera scanning isn't available in this browser. Enter the code manually.");
      return;
    }

    const supported: string[] = (await Detector.getSupportedFormats?.()) || [];
    const usable = formats.filter((format) => supported.includes(format));
    if (usable.length === 0) {
      setError("This code format isn't supported on this device. Enter the code manually.");
      return;
    }

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setChosenFormats(usable);
      setStream(media);
      setOpen(true);
    } catch {
      setError("Camera access was denied. Manual entry still works.");
    }
  }, [formats, open]);

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || open) return;
    if (!/Mobi|Android/i.test(navigator.userAgent)) return;
    autoStartedRef.current = true;
    void start();
  }, [autoStart, open, start]);

  useEffect(() => {
    if (!open || !stream || !videoRef.current) return;

    const Detector = (window as any).BarcodeDetector;
    const detector = new Detector({ formats: chosenFormats });
    const video = videoRef.current;
    video.srcObject = stream;
    void video.play();
    activeRef.current = true;
    let frame = 0;
    let busy = false;

    const tick = async () => {
      if (!activeRef.current) return;
      if (!busy && video.readyState >= 2) {
        busy = true;
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0) {
            const value = String(codes[0].rawValue || "").trim();
            if (value) {
              activeRef.current = false;
              onScan(value);
              setOpen(false);
              return;
            }
          }
        } catch {
          activeRef.current = false;
          setError("Could not read that code. Try again or enter it manually.");
          setOpen(false);
          return;
        } finally {
          busy = false;
        }
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      activeRef.current = false;
      cancelAnimationFrame(frame);
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    };
  }, [open, stream, chosenFormats, onScan]);

  return (
    <div className="w-full sm:w-auto min-w-0 flex flex-col gap-1.5">
      <button
        type="button"
        onClick={start}
        className="w-full sm:w-auto h-11 px-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-brand)]/40 text-[var(--color-brand)] hover:bg-[var(--color-brand)]/10 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
      >
        <Camera className="w-4 h-4" /> {label}
      </button>
      {error && <span className="w-full max-w-full text-[10px] leading-snug text-[var(--color-danger)]">{error}</span>}

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-lg aspect-[3/4] rounded-3xl overflow-hidden border border-white/20 bg-black">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 border-2 border-[var(--color-success)]/60 rounded-3xl pointer-events-none m-6" />
            <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-white/60" />
          </div>
          <p className="text-white text-xs font-semibold mt-4 text-center">
            Hold the code steady inside the frame. It submits automatically.
          </p>
          <button
            type="button"
            onClick={close}
            className="mt-4 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" /> Close Camera
          </button>
        </div>
      )}
    </div>
  );
};
