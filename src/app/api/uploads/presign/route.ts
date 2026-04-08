import {
  MAX_UPLOAD_SIZE,
  getDownloadPresignedUrl,
  getUploadPresignedUrl,
  validateUploadRequest,
} from "@/lib/s3";
import { type NextRequest, NextResponse } from "next/server";

/**
 * POST /api/uploads/presign
 * Body: { orgId, projectId, filename, contentType }
 * Returns: { url, key } — presigned PUT URL for direct upload to S3
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      orgId?: string;
      projectId?: string;
      filename?: string;
      contentType?: string;
    };

    const { orgId, projectId, filename, contentType } = body;

    if (!orgId || !projectId || !filename || !contentType) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: orgId, projectId, filename, contentType",
        },
        { status: 400 },
      );
    }

    const validation = validateUploadRequest({ filename, contentType });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { url, key } = await getUploadPresignedUrl({
      orgId,
      projectId,
      filename,
      contentType,
    });

    return NextResponse.json({
      url,
      key,
      maxSize: MAX_UPLOAD_SIZE,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate presigned URL" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/uploads/presign?key=...
 * Returns: { url } — presigned GET URL for downloading/viewing a file
 */
export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Missing required query param: key" },
        { status: 400 },
      );
    }

    const url = await getDownloadPresignedUrl(key);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 },
    );
  }
}
