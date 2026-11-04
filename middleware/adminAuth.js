
import crypto from 'node:crypto';

export function adminAuth(req, res, next) {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ')
        ? authorization.slice(7)
        : '';

    const secret = process.env.ADMIN_TOKEN_SECRET;

    if (!secret || !token) {
        return res.status(401).json({
            error: 'Authentication required'
        });
    }

    const [payload, signature] = token.split('.');

    if (!payload || !signature) {
        return res.status(401).json({
            error: 'Invalid token'
        });
    }

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64url');

    const actual = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (
        actual.length !== expected.length ||
        !crypto.timingSafeEqual(actual, expected)
    ) {
        return res.status(401).json({
            error: 'Invalid token'
        });
    }

    try {
        const decoded = JSON.parse(
            Buffer.from(payload, 'base64url').toString()
        );

        if (
            decoded.exp < Date.now() ||
            decoded.role !== 'admin'
        ) {
            return res.status(401).json({
                error: 'Token expired or invalid'
            });
        }

        req.admin = decoded;
        next();
    } catch {
        return res.status(401).json({
            error: 'Invalid token'
        });
    }
}
