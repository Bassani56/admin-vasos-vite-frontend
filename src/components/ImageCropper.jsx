import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import "./ImageCropper.css";

const ASPECT_OPTIONS = [
  { label: "Livre", value: null },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "16:9", value: 16 / 9 },
];

export default function ImageCropper({ imageUrl, onCropDone, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [aspectIdx, setAspectIdx] = useState(1); // default 1:1
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageUrl, croppedAreaPixels, rotation);
      onCropDone(croppedBlob);
    } catch (err) {
      console.error("Erro ao recortar:", err);
    } finally {
      setProcessing(false);
    }
  }

  const currentAspect = ASPECT_OPTIONS[aspectIdx].value;

  return (
    <div className="crop-modal-overlay">
      <div className="crop-modal">
        {/* Header */}
        <div className="crop-header">
          <h3>Recortar Imagem</h3>
          <button className="crop-close" onClick={onCancel}>×</button>
        </div>

        {/* Crop Area */}
        <div className="crop-area">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={currentAspect}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            showGrid
          />
        </div>

        {/* Controls */}
        <div className="crop-controls">
          {/* Aspect Ratio */}
          <div className="crop-control-group">
            <label>Proporção</label>
            <div className="crop-aspect-buttons">
              {ASPECT_OPTIONS.map((opt, idx) => (
                <button
                  key={opt.label}
                  className={`crop-aspect-btn${aspectIdx === idx ? " active" : ""}`}
                  onClick={() => setAspectIdx(idx)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Zoom */}
          <div className="crop-control-group">
            <label>Zoom: {zoom.toFixed(1)}x</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="crop-slider"
            />
          </div>

          {/* Rotation */}
          <div className="crop-control-group">
            <label>Rotação: {rotation}°</label>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="crop-slider"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="crop-actions">
          <button className="crop-btn-cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className="crop-btn-confirm"
            onClick={handleConfirm}
            disabled={processing}
          >
            {processing ? "Processando..." : "Aplicar Recorte"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Utility: Crop image using Canvas ─────────────────── */

/**
 * Loads an image from a blob URL (already local, no CORS issues).
 */
async function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
}

function getRadianAngle(degreeValue) {
  return (degreeValue * Math.PI) / 180;
}

async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const rotRad = getRadianAngle(rotation);

  // Calculate bounding box of the rotated image
  const sin = Math.abs(Math.sin(rotRad));
  const cos = Math.abs(Math.cos(rotRad));
  const bBoxWidth = image.width * cos + image.height * sin;
  const bBoxHeight = image.width * sin + image.height * cos;

  // Set canvas size to bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Translate and rotate
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  // Draw rotated image
  ctx.drawImage(image, 0, 0);

  // Extract the cropped area
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // Set canvas to final crop size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Put cropped data
  ctx.putImageData(data, 0, 0);

  // Convert to blob
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      "image/webp",
      0.92
    );
  });
}
