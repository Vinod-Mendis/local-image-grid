"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface PhotoResponse {
  photos: string[];
  total: number;
}

export default function PhotoGrid() {
  const FETCH_INTERVAL = 3000; // Change this value (in milliseconds)

  const [photos, setPhotos] = useState<string[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const res = await fetch("/api/photos");
        const data: PhotoResponse = await res.json();

        setTotal(data.total);
        if (data.photos.length > 0) {
          setPhotos(data.photos);
        }
      } catch (error) {
        console.error("Error fetching photos:", error);
      }
    };

    fetchPhotos();
    const interval = setInterval(fetchPhotos, FETCH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  if (photos.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-24 h-24 mx-auto border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full blur-xl"></div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Waiting for Photos
            </h1>
            <p className="text-slate-400 text-lg">
              {total > 0 ? `${total} of 16 photos collected` : "No photos yet"}
            </p>
          </div>

          <div className="flex gap-2 justify-center mt-8">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i < total ? "bg-blue-500 scale-125" : "bg-slate-700"
                }`}
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              Event Gallery
            </h1>
            <div className="flex items-center gap-3 text-sm">
              <p className="text-slate-400">Random Selection</p>
              <span className="text-slate-600">•</span>
              <p className="text-blue-400 font-semibold">
                {total} total photos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50 backdrop-blur">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-slate-300 text-sm font-medium">Live</span>
          </div>
        </div>

        {/* Grid - Takes remaining space */}
        <div className="flex-1 min-h-0">
          <div className="h-full grid grid-cols-4 gap-3">
            <AnimatePresence mode="wait">
              {photos.map((photo, idx) => (
                <motion.div
                  key={photo}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: idx * 0.03,
                  }}
                  className="group relative aspect-square bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/20"
                >
                  <Image
                    src={photo}
                    alt={`Photo ${idx + 1}`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-3 left-3 text-white font-semibold text-sm">
                      #{idx + 1}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}
