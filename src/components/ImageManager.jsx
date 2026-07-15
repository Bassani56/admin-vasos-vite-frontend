import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { API_BASE_URL } from "../config";
import { toast } from "react-toastify";
import ImageCropper from "./ImageCropper.jsx";
import "./ImageManager.css";

export default function ImageManager({ images, onChange, bucketName }) {
  const [uploading, setUploading] = useState(false);
  const [dragOverlay, setDragOverlay] = useState(false);
  const [cropIndex, setCropIndex] = useState(null); // index of image being cropped
  const [cropBlobUrl, setCropBlobUrl] = useState(null); // local blob URL for cropper

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((_, i) => `img-${i}` === active.id);
    const newIndex = images.findIndex((_, i) => `img-${i}` === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      onChange(arrayMove(images, oldIndex, newIndex));
    }
  }

  function handleRemove(index) {
    onChange(images.filter((_, i) => i !== index));
  }

  function setCover(index) {
    if (index === 0) return;
    const newImages = [...images];
    const [item] = newImages.splice(index, 1);
    newImages.unshift(item);
    onChange(newImages);
    toast.success("Imagem definida como capa!");
  }

  async function handleFileUpload(files) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("images", file));
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      const uploadedImages = Array.isArray(data.images)
        ? data.images.map((img) => ({ url: img.url, filename: img.fileName }))
        : [];
      if (uploadedImages.length > 0) {
        onChange([...images, ...uploadedImages]);
        toast.success(`${uploadedImages.length} imagem(ns) enviada(s)!`);
      }
    } catch (err) {
      toast.error("Erro ao enviar imagens");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOverlay(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragOverlay(true);
  }

  function handleDragLeave() {
    setDragOverlay(false);
  }

  // Open crop: fetch image via proxy to get a local blob URL (avoids CORS)
  async function openCrop(index) {
    const imageUrl = images[index]?.url;
    if (!imageUrl) return;

    setUploading(true);
    try {
      let blobUrl;
      if (imageUrl.startsWith("http")) {
        const proxyUrl = `${API_BASE_URL}/proxy-image?url=${encodeURIComponent(imageUrl)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Proxy error");
        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);
      } else {
        blobUrl = imageUrl;
      }
      setCropBlobUrl(blobUrl);
      setCropIndex(index);
    } catch (err) {
      toast.error("Erro ao carregar imagem para recorte");
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  function closeCrop() {
    if (cropBlobUrl) URL.revokeObjectURL(cropBlobUrl);
    setCropBlobUrl(null);
    setCropIndex(null);
  }

  // Crop: upload cropped blob replacing the image at cropIndex
  async function handleCropDone(blob) {
    if (cropIndex === null) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("images", blob, `cropped-${Date.now()}.webp`);
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      const uploadedImages = Array.isArray(data.images)
        ? data.images.map((img) => ({ url: img.url, filename: img.fileName }))
        : [];
      if (uploadedImages.length > 0) {
        const newImages = [...images];
        newImages[cropIndex] = uploadedImages[0];
        onChange(newImages);
        toast.success("Imagem recortada e salva!");
      }
    } catch (err) {
      toast.error("Erro ao salvar imagem recortada");
    } finally {
      setUploading(false);
      if (cropBlobUrl) URL.revokeObjectURL(cropBlobUrl);
      setCropBlobUrl(null);
      setCropIndex(null);
    }
  }

  return (
    <div className="im-container">
      {/* Sortable Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={images.map((_, i) => `img-${i}`)}
          strategy={rectSortingStrategy}
        >
          <div className="im-grid">
            {images.map((image, index) => (
              <SortableImage
                key={`${image.url}-${index}`}
                id={`img-${index}`}
                image={image}
                index={index}
                isCover={index === 0}
                onRemove={() => handleRemove(index)}
                onSetCover={() => setCover(index)}
                onCrop={() => openCrop(index)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Upload Area */}
      <div
        className={`im-upload-area${dragOverlay ? " drag-over" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {uploading ? (
          <span className="im-uploading">Enviando...</span>
        ) : (
          <>
            <span className="im-upload-icon">📷</span>
            <span className="im-upload-text">
              Arraste imagens aqui ou{" "}
              <label className="im-upload-label">
                clique para selecionar
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    handleFileUpload(e.target.files);
                    e.target.value = "";
                  }}
                  style={{ display: "none" }}
                />
              </label>
            </span>
          </>
        )}
      </div>

      {/* Crop Modal */}
      {cropIndex !== null && cropBlobUrl && (
        <ImageCropper
          imageUrl={cropBlobUrl}
          onCropDone={handleCropDone}
          onCancel={closeCrop}
        />
      )}
    </div>
  );
}

/* ─── Sortable Image Item ──────────────────────────────── */
function SortableImage({ id, image, index, isCover, onRemove, onSetCover, onCrop }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`im-item${isCover ? " cover" : ""}`}
      {...attributes}
      {...listeners}
    >
      <img src={image.url} alt={`Imagem ${index + 1}`} draggable={false} />

      {isCover && <span className="im-cover-badge">Capa</span>}

      <div className="im-item-actions">
        <button
          className="im-btn-crop"
          onClick={(e) => {
            e.stopPropagation();
            onCrop();
          }}
          title="Recortar imagem"
        >
          ✂️
        </button>
        {!isCover && (
          <button
            className="im-btn-cover"
            onClick={(e) => {
              e.stopPropagation();
              onSetCover();
            }}
            title="Definir como capa"
          >
            ⭐
          </button>
        )}
        <button
          className="im-btn-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Remover imagem"
        >
          ×
        </button>
      </div>

      <div className="im-drag-hint">⠿</div>
    </div>
  );
}
