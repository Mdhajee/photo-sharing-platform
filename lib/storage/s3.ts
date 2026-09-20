import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!region || !accessKeyId || !secretAccessKey) {
  throw new Error("AWS S3 environment variables are not configured.");
}

export const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export const s3Bucket = process.env.AWS_S3_BUCKET;

if (!s3Bucket) {
  throw new Error("AWS_S3_BUCKET is not configured.");
}