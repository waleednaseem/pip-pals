import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/mongo";
import {
  ALLOWED_BLOB_CONTENT_TYPES,
  MAX_FILE_BYTES,
} from "@/lib/fileLimits";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const db = await getDb();
        const user = await currentUser(db, request);
        return {
          allowedContentTypes: [...ALLOWED_BLOB_CONTENT_TYPES],
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: user?._id ? String(user._id) : null,
            username: user?.username ? String(user.username) : null,
            pathname,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          const db = await getDb();
          const payload = tokenPayload
            ? (JSON.parse(tokenPayload) as {
                userId?: string | null;
                username?: string | null;
              })
            : {};
          await db.collection("uploads").insertOne({
            url: blob.url,
            pathname: blob.pathname,
            contentType: blob.contentType,
            size: blob.size ?? null,
            userId: payload.userId || null,
            username: payload.username || null,
            createdAt: new Date(),
          });
        } catch (error) {
          console.error("Failed to record blob upload metadata", error);
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
