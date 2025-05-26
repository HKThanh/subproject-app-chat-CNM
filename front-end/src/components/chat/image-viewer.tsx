"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  images: Array<{
    url: string;
    alt?: string;
    type?: "image" | "video";
  }>;
  initialIndex?: number;
}

export default function ImageViewer({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
}: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Reset to initial index when images change or dialog opens
  useEffect(() => {
    if (isOpen && images.length > 0) {
      setCurrentIndex((prevIndex) => (prevIndex >= images.length ? initialIndex : prevIndex));
    }
  }, [isOpen, initialIndex, images]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prevIndex => {
      const newIndex = prevIndex > 0 ? prevIndex - 1 : images.length - 1;
      return newIndex;
    });
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prevIndex => {
      const newIndex = prevIndex < images.length - 1 ? prevIndex + 1 : 0;
      return newIndex;
    });
  }, [images.length]);

  const handleDownload = useCallback(() => {
    const currentImage = images[currentIndex];
    if (!currentImage) return;
    
    const link = document.createElement("a");
    link.href = currentImage.url;
    link.download = currentImage.url.split("/").pop() || "image";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [images, currentIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case "ArrowLeft":
          handlePrevious();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrevious, handleNext]);

  if (!isOpen || images.length === 0) return null;

  const currentMedia = images[currentIndex];
  const isVideo = currentMedia.type === "video";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[90vw] h-[90vh] p-0 bg-black/90 border-none flex flex-col">
        <DialogTitle className="sr-only">Xem hình ảnh</DialogTitle>
        
        {/* Header */}
        <div className="flex justify-between items-center p-2 text-white">
          <div className="text-sm">
            {currentIndex + 1} / {images.length}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleDownload}
              className="text-white hover:bg-white/20"
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Media container - improved centering */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center">
            {isVideo ? (
              <video
                src={currentMedia.url}
                controls
                autoPlay
                className="max-h-[calc(90vh-80px)] max-w-[90vw] object-contain"
              />
            ) : (
              <Image
                src={currentMedia.url}
                alt={currentMedia.alt || "Image"}
                width={1200}
                height={800}
                className="max-h-[calc(90vh-80px)] max-w-[90vw] object-contain"
                priority
              />
            )}
          </div>
          {/* Navigation buttons */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 text-white hover:bg-white/20 rounded-full"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 text-white hover:bg-white/20 rounded-full"
                onClick={handleNext}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}