import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "bauin-media";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

/**
 * Upload a file to R2. For large files (video) use the multipart Upload class.
 * Returns the permanent public URL if R2_PUBLIC_URL is set, otherwise
 * a pre-signed URL valid for 1 hour.
 */
export async function uploadFile(options: {
  key: string;
  body: Buffer | Readable;
  contentType: string;
  size: number;
  /** Use multipart upload (required for files > 5 GB, recommended for > 100 MB) */
  multipart?: boolean;
}): Promise<UploadResult> {
  const client = getClient();
  const { key, body, contentType, size, multipart } = options;

  if (multipart) {
    const upload = new Upload({
      client,
      params: {
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
      },
      queueSize: 4,
      partSize: 1024 * 1024 * 10, // 10 MB parts
    });
    await upload.done();
  } else {
    const buf = body instanceof Buffer ? body : await streamToBuffer(body as Readable);
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buf,
        ContentType: contentType,
        ContentLength: size,
      })
    );
  }

  const url = R2_PUBLIC_URL
    ? `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`
    : await getSignedUrl(client, new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }), {
        expiresIn: 3600,
      });

  return { key, url, size, contentType };
}

export async function deleteFile(key: string): Promise<void> {
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = getClient();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }),
    { expiresIn }
  );
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
