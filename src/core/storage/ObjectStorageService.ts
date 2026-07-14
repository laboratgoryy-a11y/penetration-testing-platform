import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { config } from '../../config';

interface PutObjectInput {
  body: Buffer | Uint8Array | string;
  contentType: string;
  fileName: string;
  objectKey?: string;
  prefix?: string;
  sizeBytes?: number;
  metadata?: Record<string, string>;
}

interface StoredObjectDescriptor {
  objectKey: string;
  contentType: string;
  sizeBytes: number;
}

interface StoredObjectStream {
  stream: Readable;
  contentType: string;
  sizeBytes?: number;
}

function sanitizeFileName(fileName: string): string {
  const normalized = fileName.trim().replace(/\\/g, '/');
  const lastSegment = normalized.split('/').pop() || '';
  const sanitized = lastSegment.replace(/[^a-zA-Z0-9._-]+/g, '-');
  return sanitized || `artifact-${randomUUID()}`;
}

function buildS3Client(): S3Client {
  const credentials =
    config.objectStorage.accessKeyId && config.objectStorage.secretAccessKey
      ? {
          accessKeyId: config.objectStorage.accessKeyId,
          secretAccessKey: config.objectStorage.secretAccessKey,
        }
      : undefined;

  return new S3Client({
    region: config.objectStorage.region,
    endpoint: config.objectStorage.endpoint || undefined,
    forcePathStyle: config.objectStorage.forcePathStyle,
    credentials,
  });
}

async function bodyToReadable(body: unknown): Promise<Readable> {
  if (body instanceof Readable) {
    return body;
  }

  if (Buffer.isBuffer(body) || body instanceof Uint8Array) {
    return Readable.from(body);
  }

  if (typeof body === 'string') {
    return Readable.from([body]);
  }

  if (
    body &&
    typeof body === 'object' &&
    'transformToWebStream' in body &&
    typeof (body as { transformToWebStream: () => ReadableStream }).transformToWebStream ===
      'function'
  ) {
    const webStream = (body as { transformToWebStream: () => ReadableStream }).transformToWebStream();
    return Readable.fromWeb(webStream);
  }

  if (
    body &&
    typeof body === 'object' &&
    'transformToByteArray' in body &&
    typeof (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray ===
      'function'
  ) {
    const bytes = await (
      body as { transformToByteArray: () => Promise<Uint8Array> }
    ).transformToByteArray();
    return Readable.from(bytes);
  }

  throw new Error('Unsupported object storage body type');
}

export class ObjectStorageService {
  private readonly client: S3Client | null;
  private readonly useLocalStorage: boolean;
  private readonly localRoot: string;

  constructor() {
    this.useLocalStorage =
      config.nodeEnv === 'development' &&
      !config.objectStorage.endpoint &&
      !config.objectStorage.accessKeyId &&
      !config.objectStorage.secretAccessKey;
    this.client = this.useLocalStorage ? null : buildS3Client();
    this.localRoot = path.resolve(process.cwd(), 'data', 'artifacts');
  }

  async putObject(input: PutObjectInput): Promise<StoredObjectDescriptor> {
    const fileName = sanitizeFileName(input.fileName);
    const objectKey =
      input.objectKey ||
      [
        (input.prefix || 'artifacts').replace(/^\/+|\/+$/g, ''),
        `${randomUUID()}-${fileName}`,
      ].join('/');

    if (this.useLocalStorage) {
      const targetPath = path.join(this.localRoot, objectKey);
      await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.promises.writeFile(targetPath, input.body);

      return {
        objectKey,
        contentType: input.contentType,
        sizeBytes:
          input.sizeBytes ??
          (typeof input.body === 'string'
            ? Buffer.byteLength(input.body)
            : input.body.byteLength),
      };
    }

    await this.client!.send(
      new PutObjectCommand({
        Bucket: config.objectStorage.bucket,
        Key: objectKey,
        Body: input.body,
        ContentType: input.contentType,
        Metadata: input.metadata,
      })
    );

    return {
      objectKey,
      contentType: input.contentType,
      sizeBytes:
        input.sizeBytes ??
        (typeof input.body === 'string'
          ? Buffer.byteLength(input.body)
          : input.body.byteLength),
    };
  }

  async getObjectStream(objectKey: string): Promise<StoredObjectStream> {
    if (this.useLocalStorage) {
      const targetPath = path.join(this.localRoot, objectKey);
      const stat = await fs.promises.stat(targetPath);
      return {
        stream: fs.createReadStream(targetPath),
        contentType: 'application/octet-stream',
        sizeBytes: stat.size,
      };
    }

    const response = await this.client!.send(
      new GetObjectCommand({
        Bucket: config.objectStorage.bucket,
        Key: objectKey,
      })
    );

    return {
      stream: await bodyToReadable(response.Body),
      contentType: response.ContentType || 'application/octet-stream',
      sizeBytes:
        typeof response.ContentLength === 'number'
          ? response.ContentLength
          : undefined,
    };
  }
}
