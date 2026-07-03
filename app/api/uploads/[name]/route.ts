import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { uploadDir } from "@/lib/upload";

// 文件名是随机 UUID，天然不可枚举；生产环境可让 Nginx 直接 alias 这个目录提速
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[0-9a-f-]{36}\.jpg$/.test(name)) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const buf = await readFile(path.join(uploadDir(), name));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
