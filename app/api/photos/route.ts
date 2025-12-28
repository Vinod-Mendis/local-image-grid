import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const PHOTOS_PATH = path.join(process.cwd(), "public", "photos");
const VALID_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export async function GET() {
  try {
    const files = await fs.readdir(PHOTOS_PATH);

    // Get file stats and filter valid images
    const photoData = await Promise.all(
      files.map(async (file) => {
        const ext = path.extname(file).toLowerCase();
        if (!VALID_EXTENSIONS.includes(ext)) return null;

        const filePath = path.join(PHOTOS_PATH, file);
        const stats = await fs.stat(filePath);

        // Ignore files modified less than 2 seconds ago (incomplete writes)
        const age = Date.now() - stats.mtime.getTime();
        if (age < 2000) return null;

        return {
          name: file,
          url: `/photos/${file}`,
        };
      })
    );

    // Filter nulls
    const validPhotos = photoData.filter((p) => p !== null);
    const totalPhotos = validPhotos.length;

    // Return empty if less than 16 photos
    if (totalPhotos < 16) {
      return NextResponse.json({
        photos: [],
        total: totalPhotos,
      });
    }

    // Shuffle array using Fisher-Yates algorithm
    const shuffled = [...validPhotos];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Take first 16 from shuffled array
    const randomPhotos = shuffled.slice(0, 16).map((p) => p.url);

    return NextResponse.json({
      photos: randomPhotos,
      total: totalPhotos,
    });
  } catch (error) {
    console.error("Error reading photos:", error);
    return NextResponse.json({
      photos: [],
      total: 0,
    });
  }
}
