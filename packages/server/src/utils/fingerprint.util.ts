import { Request } from "express";
import crypto from 'crypto';
import { Handshake } from "socket.io/dist/socket";

// It will be used to identify users on the same network
class FingerprintUtil {

    private static hash(information: string): string {
        return crypto.createHash("md5").update(information).digest("hex");
    }

    /**
     * Fingerprint a request
     * @param req The request to fingerprint
     */
    public static scan(ip?: string | string[], agent?: string): string {
        // Get the user's IP address
        return FingerprintUtil.hash(`${ip}${agent}`);
    }

    public static scanSocket(socket: Handshake): string {
        return FingerprintUtil.scan(socket.address, socket.headers['user-agent']);
    }

    public static scanHttpRequest(req: Request): string {
        const ip = req.headers['x-forwarded-for'];
        const agent = req.headers['user-agent'];

        return FingerprintUtil.scan(ip, agent);
    }
}

export default FingerprintUtil;