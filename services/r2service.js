
import {
    S3Client,
    PutObjectCommand,
    HeadObjectCommand
} from '@aws-sdk/client-s3';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const requiredEnv = [
    'R2_ACCOUNT_ID',
    'R2_BUCKET_NAME',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_PUBLIC_BASE_URL'
];

for (const key of requiredEnv) {
    if (!process.env[key]) {
        console.warn(`Missing environment variable: ${key}`);
    }
}

const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

const BUCKET = process.env.R2_BUCKET_NAME;

export async function createUploadUrl(key, contentType) {
    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType
    });

    const uploadUrl = await getSignedUrl(s3, command, {
        expiresIn: 600
    });

    return {
        uploadUrl,
        key,
        publicUrl: `${process.env.R2_PUBLIC_BASE_URL}/${key}`
    };
}

export async function verifyUploadedFile(key) {
    const result = await s3.send(
        new HeadObjectCommand({
            Bucket: BUCKET,
            Key: key
        })
    );

    return {
        key,
        size: result.ContentLength,
        contentType: result.ContentType
    };
}
