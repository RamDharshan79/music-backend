
import express from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { adminAuth } from '../middleware/adminAuth.js';
import {
    createUploadUrl,
    verifyUploadedFile
} from '../services/r2service.js';

const router = express.Router();

function createToken() {
    const payload = Buffer.from(JSON.stringify({
        role: 'admin',
        exp: Date.now() + (8 * 60 * 60 * 1000)
    })).toString('base64url');

    const signature = crypto
        .createHmac('sha256', process.env.ADMIN_TOKEN_SECRET)
        .update(payload)
        .digest('base64url');

    return `${payload}.${signature}`;
}

// ADMIN LOGIN
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (
        !process.env.ADMIN_USERNAME ||
        !process.env.ADMIN_PASSWORD ||
        !process.env.ADMIN_TOKEN_SECRET
    ) {
        return res.status(500).json({
            error: 'Admin authentication is not configured'
        });
    }

    const validUsername = username === process.env.ADMIN_USERNAME;
    const validPassword = password === process.env.ADMIN_PASSWORD;

    if (!validUsername || !validPassword) {
        return res.status(401).json({
            error: 'Invalid username or password'
        });
    }

    res.json({
        token: createToken(),
        expiresIn: 28800
    });
});

// GENERATE R2 UPLOAD URLS
router.post('/uploads/presign', adminAuth, async (req, res) => {
    try {
        const { files } = req.body;

        if (!Array.isArray(files) || files.length === 0 || files.length > 2) {
            return res.status(400).json({
                error: 'Provide one or two files'
            });
        }

        const allowedTypes = [
            'audio/mpeg',
            'audio/mp4',
            'audio/aac',
            'audio/wav',
            'audio/x-wav',
            'audio/flac',
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        const uploads = [];

        for (const file of files) {
            if (
                !file ||
                typeof file.contentType !== 'string' ||
                !allowedTypes.includes(file.contentType)
            ) {
                return res.status(400).json({
                    error: 'Unsupported file type'
                });
            }

            const isAudio = file.contentType.startsWith('audio/');
            const extension = isAudio ? 'audio' : 'image';

            const key = `${extension}/${crypto.randomUUID()}`;

            const upload = await createUploadUrl(
                key,
                file.contentType
            );

            uploads.push({
                ...upload,
                contentType: file.contentType
            });
        }

        res.json({ uploads });

    } catch (error) {
        console.error('R2 presign error:', error);
        res.status(500).json({
            error: 'Failed to create upload URLs'
        });
    }
});

// VERIFY UPLOADS
router.post('/uploads/verify', adminAuth, async (req, res) => {
    try {
        const { keys } = req.body;

        if (!Array.isArray(keys) || keys.length === 0 || keys.length > 2) {
            return res.status(400).json({
                error: 'Provide one or two upload keys'
            });
        }

        const results = [];

        for (const key of keys) {
            if (
                typeof key !== 'string' ||
                !(key.startsWith('audio/') || key.startsWith('image/'))
            ) {
                return res.status(400).json({
                    error: 'Invalid upload key'
                });
            }

            results.push(await verifyUploadedFile(key));
        }

        res.json({ verified: results });

    } catch (error) {
        console.error('R2 verification error:', error);
        res.status(400).json({
            error: 'Upload verification failed'
        });
    }
});

router.post('/songs', adminAuth, async (req, res) => {
    try {
        const {
            title,
            artist,
            album,
            duration,
            audioKey,
            artworkKey
        } = req.body;

        if (
            !title?.trim() ||
            !artist?.trim() ||
            !audioKey?.startsWith('audio/')
        ) {
            return res.status(400).json({
                error: 'Title, artist and valid audioKey are required'
            });
        }

        if (artworkKey && !artworkKey.startsWith('image/')) {
            return res.status(400).json({
                error: 'Invalid artworkKey'
            });
        }

        const audio = await verifyUploadedFile(audioKey);

        if (!audio.contentType?.startsWith('audio/')) {
            return res.status(400).json({
                error: 'Uploaded audio file is invalid'
            });
        }

        let artworkUrl = null;

        if (artworkKey) {
            const artwork = await verifyUploadedFile(artworkKey);

            if (!artwork.contentType?.startsWith('image/')) {
                return res.status(400).json({
                    error: 'Uploaded artwork file is invalid'
                });
            }

            artworkUrl =
                `${process.env.R2_PUBLIC_BASE_URL}/${artworkKey}`;
        }

        const audioUrl =
            `${process.env.R2_PUBLIC_BASE_URL}/${audioKey}`;

        const [result] = await db.query(
            `INSERT INTO songs
            (title, artist, album, audioUrl, artworkUrl, duration)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                artist.trim(),
                album || null,
                audioUrl,
                artworkUrl,
                Number(duration) || null
            ]
        );

        res.status(201).json({
            success: true,
            id: result.insertId,
            title,
            artist,
            audioUrl,
            artworkUrl
        });

    } catch (error) {
        console.error('Admin song creation error:', error);
        res.status(500).json({
            error: 'Failed to save song'
        });
    }
});


export default router;
