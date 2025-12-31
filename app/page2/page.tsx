"use client";

import { useEffect, useState, useRef } from "react";
import FloatingStars from "../components/FloatingStars";

interface PhotoResponse {
  photos: string[];
  total: number;
}

interface NumberedPhoto {
  url: string;
  number: number;
  timestamp: number;
}

export default function PhotoCenterLoop() {
  const PHOTO_DURATION = 8000; // 8 seconds per photo
  const PHOTOS_PER_BATCH =
    Number(process.env.NEXT_PUBLIC_PHOTOS_PER_BATCH) || 10; // !<-- Changed the grid when this number changes
  const FETCH_INTERVAL = PHOTOS_PER_BATCH * PHOTO_DURATION; // Fetch before current batch ends

  const [photos, setPhotos] = useState<NumberedPhoto[]>([]);
  const [nextPhotos, setNextPhotos] = useState<NumberedPhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preloadingImages, setPreloadingImages] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [gridPhotos, setGridPhotos] = useState<NumberedPhoto[]>([]);

  const photosRef = useRef<NumberedPhoto[]>([]);
  const photoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const batchNumberRef = useRef(1);
  const offsetRef = useRef(0);

  // Update refs when photos change
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  // Preload images utility
  const preloadImages = async (numberedPhotos: NumberedPhoto[]) => {
    const promises = numberedPhotos.map((photo) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = photo.url;
      });
    });

    try {
      await Promise.all(promises);
      console.log(`Successfully preloaded ${numberedPhotos.length} images`);
    } catch (error) {
      console.warn("Some images failed to preload:", error);
    }
  };

  // Fetch photos from API
  const fetchPhotos = async (offset: number = 0) => {
    try {
      const res = await fetch(`/api/photos-order?offset=${offset}`);
      const data: PhotoResponse = await res.json();

      setTotal(data.total);
      if (data.photos.length > 0) {
        // Add timestamp-based numbering to each photo URL
        const numberedPhotos = data.photos.map((url, index) => ({
          url,
          number: offset + index + 1,
          timestamp: Date.now() + index,
        }));
        return numberedPhotos;
      }
      return [];
    } catch (error) {
      console.error("Error fetching photos:", error);
      return [];
    }
  };

  // Prefetch next batch of photos
  const prefetchNextBatch = async () => {
    console.log("Prefetching next batch...");
    const nextOffset = offsetRef.current + PHOTOS_PER_BATCH;
    const fetchedPhotos = await fetchPhotos(nextOffset);

    if (fetchedPhotos.length > 0) {
      await preloadImages(fetchedPhotos);
      setNextPhotos(fetchedPhotos);
      console.log(
        `Next batch of ${fetchedPhotos.length} photos ready (offset: ${nextOffset})`
      );
    }
  };

  // Transition to next batch
  const transitionToNextBatch = () => {
    if (nextPhotos.length > 0) {
      console.log("Transitioning to next batch");
      setIsTransitioning(true);

      setTimeout(() => {
        setPhotos(nextPhotos);
        setNextPhotos([]);
        setCurrentPhotoIndex(0);
        setIsTransitioning(false);
        batchNumberRef.current += 1;
        offsetRef.current += PHOTOS_PER_BATCH; // Increment offset for next fetch
      }, 500); // Brief transition delay
    }
  };

  // Simple photo loop - advance to next photo
  const startPhotoLoop = () => {
    if (photos.length === 0) return;

    if (photoTimerRef.current) clearTimeout(photoTimerRef.current);

    photoTimerRef.current = setTimeout(() => {
      // Check if we are at the end of the batch
      if (currentPhotoIndex >= photos.length - 1) {
        if (nextPhotos.length > 0) {
          // Use React 18's automatic batching with flushSync alternative
          // Update everything in a single render cycle
          const newPhotos = nextPhotos;
          setPhotos(newPhotos);
          setNextPhotos([]);
          setCurrentPhotoIndex(0);
          batchNumberRef.current += 1;
          offsetRef.current += 8;
        } else {
          // Fallback: Loop current batch if next isn't ready
          setCurrentPhotoIndex(0);
        }
      } else {
        // Normal progression
        const nextIndex = currentPhotoIndex + 1;

        // Trigger background grid swap early (when moving to the last photo)
        if (nextIndex === photos.length - 1) {
          swapGridToNextBatch();
        }

        setCurrentPhotoIndex(nextIndex);
      }
    }, PHOTO_DURATION);
  };
  // Schedule next batch fetch
  const scheduleNextBatchFetch = () => {
    if (fetchTimerRef.current) {
      clearTimeout(fetchTimerRef.current);
    }

    // Fetch next batch 16 seconds before current batch ends (2 photos before end)
    const fetchTiming = FETCH_INTERVAL - PHOTO_DURATION * 2;

    fetchTimerRef.current = setTimeout(() => {
      prefetchNextBatch();
      scheduleNextBatchFetch(); // Schedule next fetch
    }, fetchTiming);

    console.log(`Next batch will be fetched in ${fetchTiming / 1000} seconds`);
  };

  // Handle photo transitions
  useEffect(() => {
    if (
      photos.length > 0 &&
      !loading &&
      !preloadingImages &&
      !isTransitioning
    ) {
      startPhotoLoop();
    }

    return () => {
      if (photoTimerRef.current) {
        clearTimeout(photoTimerRef.current);
      }
    };
  }, [
    currentPhotoIndex,
    photos.length,
    loading,
    preloadingImages,
    isTransitioning,
  ]);

  // Initial fetch
  useEffect(() => {
    const initialFetch = async () => {
      try {
        setPreloadingImages(true);
        const fetchedPhotos = await fetchPhotos(0);

        if (fetchedPhotos.length > 0) {
          await preloadImages(fetchedPhotos);
          setPhotos(fetchedPhotos);
          setGridPhotos(fetchedPhotos); // Set initial grid
          setCurrentPhotoIndex(0);
          offsetRef.current = 0;
          scheduleNextBatchFetch();
        }
      } finally {
        setPreloadingImages(false);
        setLoading(false);
      }
    };

    initialFetch();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (photoTimerRef.current) clearTimeout(photoTimerRef.current);
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    };
  }, []);

  // function to swap the grid early
  const swapGridToNextBatch = () => {
    if (nextPhotos.length > 0) {
      setIsTransitioning(true); // Start fade out
      setTimeout(() => {
        setGridPhotos(nextPhotos); // Swap the background only
        setIsTransitioning(false); // Fade back in
      }, 500);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0  flex items-center justify-center">
        <FloatingStars starCount={100} animationSpeed={1} />
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url("/bg.webp")', // Path to your file in /public
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(0.3) blur(10px)", // Darken and blur so grid is visible
            transform: "scale(1.1)", // Prevents white edges from the blur
          }}
        />
        <div className="text-center space-y-6 relative z-10">
          <div className="relative">
            <div className="w-24 h-24 mx-auto border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full blur-xl"></div>
            </div>
          </div>
          {/* <h1 className="text-4xl font-bold text-white tracking-tight">
            Loading photos...
          </h1> */}
        </div>
      </div>
    );
  }

  if (preloadingImages) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <FloatingStars starCount={100} animationSpeed={1} />
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url("/bg.webp")', // Path to your file in /public
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(0.3) blur(10px)", // Darken and blur so grid is visible
            transform: "scale(1.1)", // Prevents white edges from the blur
          }}
        />
        <div className="text-center space-y-6 relative z-10">
          <div className="relative">
            <div className="w-24 h-24 mx-auto border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full blur-xl"></div>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Preparing images...
          </h1>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <FloatingStars starCount={100} animationSpeed={1} />
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url("/bg.webp")', // Path to your file in /public
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(0.3) blur(10px)", // Darken and blur so grid is visible
            transform: "scale(1.1)", // Prevents white edges from the blur
          }}
        />
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Waiting for Photos
          </h1>
          <p className="text-slate-400 text-lg">
            {total > 0 ? `${total} of 8 photos collected` : "No photos yet"}
          </p>
          <div className="flex gap-2 justify-center mt-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i < total ? "bg-blue-500 scale-125" : "bg-slate-700"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentPhoto = photos[currentPhotoIndex];

  return (
    <div className="fixed inset-0  overflow-hidden">
      <FloatingStars starCount={100} animationSpeed={1} />
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("/bg.webp")', // Path to your file in /public
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.3) blur(10px)", // Darken and blur so grid is visible
          transform: "scale(1.1)", // Prevents white edges from the blur
        }}
      />
      {/* Background blur effect with smooth transition */}
      <div
        className={`absolute inset-0 p-4  opacity-30 z-0 transition-opacity duration-500 ${
          isTransitioning ? "opacity-0" : "opacity-50"
        }`}
      >
        <div className="h-full grid grid-cols-5 gap-3 grid-container py-4">
          {gridPhotos.map((photo, idx) => (
            <div
              key={photo.url}
              className="relative aspect-[3/4] bg-slate-800/50 rounded-2xl overflow-hidden"
            >
              <img
                src={photo.url}
                alt={`Background ${idx + 1}`}
                className="w-full h-full object-cover grid-image"
              />
              {/* Image number overlay */}
              {/* <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold">
                #{photo.number}
              </div> */}
            </div>
          ))}
        </div>
      </div>

      {/* Photo Container with smooth animation */}
      <div className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden">
        <div
          key={`${batchNumberRef.current}-${currentPhotoIndex}`}
          className="relative max-w-[48vh]  aspect-3/4 w-full  flex items-center justify-center overflow-hidden"
          style={{
            animation: `photoReveal ${PHOTO_DURATION}ms ease-in-out forwards`,
          }}
        >
          <img
            src={currentPhoto.url}
            alt={`Photo ${currentPhotoIndex + 1}`}
            className="w-full h-full object-cover rounded-3xl border-4 border-blue-500/50"
            style={{
              // filter: "drop-shadow(0 0 30px rgba(59, 130, 246, 0.5))",
            }}
          />
          {/* Large image number overlay */}
          {/* <div className="absolute top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-full text-2xl font-bold border-2 border-blue-500">
            #{currentPhoto.number}
          </div>
          <div className="absolute text-center bottom-0 left-1/2 -translate-x-1/2 z-10 flex flex-col justify-end pb-10 h-32 bg-gradient-to-t from-violet-900/80 to-transparent w-full rounded-b-3xl">
            <span className="text-5xl font-bold drop-shadow-lg text-white">
              Image #{currentPhoto.number}
            </span>
            <span className="text-xl opacity-90 drop-shadow-lg text-white mt-2">
              {currentPhotoIndex + 1} of {photos.length} | Batch #
              {batchNumberRef.current}
            </span>
          </div> */}
        </div>
      </div>

      {/* Header Info */}
      {/* <div className="fixed top-4 right-4 z-50 bg-slate-900/80 text-white p-3 rounded-lg backdrop-blur-sm border border-slate-700">
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>
              Photo {currentPhotoIndex + 1}/{photos.length}
            </span>
          </div>
          {nextPhotos.length > 0 && (
            <div className="flex items-center space-x-2 text-blue-400">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Next batch ready ({nextPhotos.length})</span>
            </div>
          )}
          <span className="text-slate-400">Total: {total}</span>
        </div>
      </div> */}

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes photoReveal {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          15% {
            opacity: 1;
            transform: scale(1);
          }
          85% {
            opacity: 1;
            transform: scale(1.2);
          }
          100% {
            opacity: 0;
            transform: scale(1.3);
          }
        }

        /* Add the new classes here */
        .grid-image {
          transition: transform 8s ease-in-out;
        }

        /* This creates a slow "breathing" effect for the background */
        .grid-container:hover .grid-image {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}
