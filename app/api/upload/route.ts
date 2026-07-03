import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireCurrentSpace, handleApiError, ApiError } from "@/lib/auth";
import { uploadDir } from "@/lib/upload";

/*
 * 菜品图片上传。之前图片是 base64 直接塞进数据库的 image_url 字段，
 * 菜一多每次拉菜单就是好几 MB——商用规模下必须落盘。
 * 现在：客户端压缩(≤800px jpeg) → 上传 → 存到 UPLOAD_DIR → 返回 /api/uploads/xxx.jpg。
 * 部署时把 UPLOAD_DIR 挂成持久卷；以后用户量大了再迁 OSS/COS，只用改这一个文件。
 */

const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    await requireCurrentSpace();
    const { dataUrl } = (await req.json()) as { dataUrl?: string };
    if (!dataUrl?.startsWith("data:image/jpeg;base64,")) {
      throw new ApiError(400, "图片格式不对");
    }
    const base64 = dataUrl.slice("data:image/jpeg;base64,".length);
    const buf = Buffer.from(base64, "base64");
    if (buf.length === 0 || buf.length > MAX_BYTES) throw new ApiError(400, "图片太大了（最大 2MB）");
    // JPEG magic number 校验，防止伪装成图片的任意文件落盘
    if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new ApiError(400, "图片格式不对");

    const dir = uploadDir();
    await mkdir(dir, { recursive: true });
    const name = `${randomUUID()}.jpg`;
    await writeFile(path.join(dir, name), buf);

    return NextResponse.json({ url: `/api/uploads/${name}` });
  } catch (e) {
    return handleApiError(e);
  }
}
