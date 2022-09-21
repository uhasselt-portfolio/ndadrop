import { Request } from "express";
import crypto from 'crypto';

// It will be used to identify users on the same network
class FingerprintUtil {

    private static hash(information: string): string {
        return crypto.createHash("md5").update(information).digest("hex");
    }

    /**
     * Fingerprint a request
     * @param req The request to fingerprint
     */
    public static scan(req: Request): string {
        // Get the user's IP address
        const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

        // Get the user's user-agent
        const userAgent = req.headers["user-agent"];

        return FingerprintUtil.hash(`${ip}${userAgent}`);
    }
}

export default FingerprintUtil;