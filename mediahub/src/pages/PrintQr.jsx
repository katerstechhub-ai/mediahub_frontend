import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";

const TARGET_URL = "https://mediahub-frontend-4tdp.vercel.app/";

export default function PrintQr() {
  const qrRef = useRef(null);

  const handleDownload = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "mediahub-qr.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#efeae0",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 20,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: "40px 48px",
          textAlign: "center",
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 13,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#6b6a63",
            fontWeight: 600,
          }}
        >
          MediaHub
        </p>
        <h1
          style={{
            margin: "8px 0 6px",
            fontSize: 26,
            fontWeight: 700,
            color: "#1f1f1f",
          }}
        >
          Share your photos 📸
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "#6b6a63" }}>
          Scan the QR code with your phone camera to upload your pictures.
        </p>

        <div
          ref={qrRef}
          style={{
            display: "inline-block",
            padding: 20,
            background: "#f6f2e8",
            borderRadius: 20,
          }}
        >
          <QRCodeCanvas
            value={TARGET_URL}
            size={260}
            bgColor="#f6f2e8"
            fgColor="#1f1f1f"
            level="M"
            includeMargin={false}
          />
        </div>

        <p
          style={{
            marginTop: 18,
            fontSize: 12,
            color: "#6b6a63",
            wordBreak: "break-all",
          }}
        >
          {TARGET_URL}
        </p>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={handleDownload}
          style={{
            padding: "12px 24px",
            borderRadius: 999,
            border: "none",
            background: "#141414",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Download PNG
        </button>
        <button
          onClick={() => window.print()}
          style={{
            padding: "12px 24px",
            borderRadius: 999,
            border: "none",
            background: "#f5c518",
            color: "#1f1f1f",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Print
        </button>
      </div>
    </div>
  );
}