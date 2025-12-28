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
          birthtime: stats.birthtime.getTime(),
          url: `/photos/${file}`,
        };
      })
    );

    // Filter nulls and sort by creation time
    const validPhotos = photoData
      .filter((p) => p !== null)
      .sort((a, b) => a.birthtime - b.birthtime);

    const totalPhotos = validPhotos.length;

    // Calculate current batch
    // 0-15 photos: no batch
    // 16-31 photos: batch 0 (photos 1-16)
    // 32-47 photos: batch 1 (photos 17-32)
    // 48-63 photos: batch 2 (photos 33-48)
    if (totalPhotos < 16) {
      return NextResponse.json({
        batch: null,
        photos: [],
        total: totalPhotos,
      });
    }

    const currentBatch = Math.floor(totalPhotos / 16) - 1;
    const startIdx = currentBatch * 16;
    const endIdx = startIdx + 16;

    const batchPhotos = validPhotos.slice(startIdx, endIdx).map((p) => p.url);

    return NextResponse.json({
      batch: currentBatch,
      photos: batchPhotos,
      total: totalPhotos,
    });
  } catch (error) {
    console.error("Error reading photos:", error);
    return NextResponse.json({
      batch: null,
      photos: [],
      total: 0,
    });
  }
}
