import { cn } from "@/lib/utils";
import jsQR from "jsqr";
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
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera scanning isn't available in this browser. Enter the code manually.");
      return;
    }

    const Detector = (window as any).BarcodeDetector;
    let usable: string[] = [];
    if (Detector?.getSupportedFormats) {
      try {
        const supported: string[] = await Detector.getSupportedFormats();
        usable = formats.filter((format) => supported.includes(format));
      } catch {
        usable = [];
      }
    }
    const canJsQr = formats.includes("qr_code");
    if (usable.length === 0 && !canJsQr) {
      setError("This scanner is not supported on this device. Enter the code manually.");
      return;
    }

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setChosenFormats(usable);
      setStream(media);
      setOpen(true);
    } catch (e: any) {
      const name = String(e?.name || "");
      setError(name === "NotAllowedError" ? "Camera access was denied. Allow camera access and try again." : "Camera unavailable. Manual entry still works.");
    }
  }, [formats]);

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || open) return;
    if (!/Mobi|Android/i.test(navigator.userAgent)) return;
    autoStartedRef.current = true;
    void start();
  }, [autoStart, open, start]);

  useEffect(() => {
    if (!open || !stream || !videoRef.current) return;

    const Detector = (window as any).BarcodeDetector;
    const detector = Detector && chosenFormats.length > 0 ? new Detector({ formats: chosenFormats }) : null;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    video.srcObject = stream;
    video.setAttribute("playsinline", "true");
    video.muted = true;
    void video.play().catch(() => {});
    activeRef.current = true;
    let frame = 0;
    let busy = false;

    const tick = async () => {
      if (!activeRef.current) return;
      if (!busy && video.readyState >= 2) {
        busy = true;
        try {
          let value = "";
          if (detector) {
            const codes = await detector.detect(video);
            value = String(codes[0]?.rawValue || "").trim();
          } else if (ctx) {
            canvas.width = video.videoWidth || 0;
            canvas.height = video.videoHeight || 0;
            if (canvas.width > 0 && canvas.height > 0) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              value = String(jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" })?.data || "").trim();
            }
          }
          if (value) {
            activeRef.current = false;
            onScan(value);
            setOpen(false);
            return;
          }
        } catch {
          // keep scanning; transient camera frame errors are common on mobile
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
      video.pause();
      video.srcObject = null;
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
            <video ref={videoRef} className="w-full h-full object-cover" muted autoPlay playsInline />
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
