/** @format */

"use client";

import { motion } from "framer-motion";
import { useEffect, useState, memo } from "react";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  direction: {
    x: number[];
    y: number[];
  };
  rotation: number[];
  scale: number[];
}

// Memoize the component to prevent re-renders
const FloatingStars = memo(function FloatingStars({
  starCount = 50,
  animationSpeed = 3,
  className = "",
}: {
  starCount?: number;
  animationSpeed?: number;
  className?: string;
}) {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const generateStars = () => {
      const newStars: Star[] = [];
      for (let i = 0; i < starCount; i++) {
        // Generate random movement pattern for each star
        const generateRandomPath = () => {
          const pathLength = 5;
          const path = [0]; // Start at 0
          const maxMovement = Math.random() * 60 + 20; // 20-80px movement range

          for (let j = 1; j < pathLength; j++) {
            // Random direction: positive or negative
            const direction = Math.random() > 0.5 ? 1 : -1;
            const movement = Math.random() * maxMovement * direction;
            path.push(movement);
          }
          return path;
        };

        newStars.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.8 + 0.2,
          duration: (Math.random() * 8 + 5) / animationSpeed,
          delay: (Math.random() * 2) / animationSpeed,
          direction: {
            x: generateRandomPath(),
            y: generateRandomPath(),
          },
          rotation: [
            0,
            Math.random() * 360 - 180,
            Math.random() * 360 - 180,
            0,
          ], // Random rotation
          scale: [1, Math.random() * 0.5 + 0.8, Math.random() * 0.5 + 1.2, 1], // Random scaling
        });
      }
      setStars(newStars);
    };

    generateStars();
  }, [starCount, animationSpeed]);

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden pointer-events-none ${className}`}
    >
      {stars.map((star) => {
        const isGold = Math.random() > 0.7; // 30% chance for gold
        return (
          <motion.div
            key={star.id}
            className={`absolute rounded-full ${
              isGold ? "bg-yellow-300" : "bg-white"
            }`}
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              boxShadow: isGold
                ? `0 0 ${star.size * 2}px rgba(255, 215, 0, 0.4)`
                : `0 0 ${star.size}px rgba(255, 255, 255, 0.3)`,
            }}
            animate={{
              y: star.direction.y,
              x: star.direction.x,
              rotate: star.rotation,
              scale: star.scale,
              opacity: [
                star.opacity,
                star.opacity * 0.6,
                star.opacity,
                star.opacity * 0.8,
                star.opacity,
              ],
            }}
            transition={{
              duration: star.duration,
              delay: star.delay,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
        );
      })}

      {/* Rest of your star animations... */}
    </div>
  );
});

export default FloatingStars;
