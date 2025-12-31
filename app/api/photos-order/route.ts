import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const PHOTOS_PATH = path.join(process.cwd(), "public", "photos");
const VALID_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export async function GET(request: Request) {
  try {
    // Get offset from query params
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get("offset") || "0");

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
          mtime: stats.mtime.getTime(),
        };
      })
    );

    // Filter nulls
    const validPhotos = photoData.filter((p) => p !== null);
    const totalPhotos = validPhotos.length;

    // Return empty if less than 8 photos
    if (totalPhotos < 8) {
      return NextResponse.json({
        photos: [],
        total: totalPhotos,
      });
    }

    // Sort by creation time (newest first)
    const sortedPhotos = [...validPhotos].sort((a, b) => {
      return b.mtime - a.mtime;
    });

    // Take 8 photos starting from offset, wrapping around if needed
    const selectedPhotos = [];
    for (let i = 0; i < 8; i++) {
      const index = (offset + i) % sortedPhotos.length;
      selectedPhotos.push(sortedPhotos[index].url);
    }

    return NextResponse.json({
      photos: selectedPhotos,
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
