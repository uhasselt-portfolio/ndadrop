import { NextFunction, Request, Response } from "express";
import FingerprintUtil from "../utils/fingerprint.util";

const verifyMiddleware = (req: Request, res: Response, next: NextFunction) => {

    // 1. Get the fingerprint of the client
    // const fingerprint = FingerprintUtil.scan();

    // 2. Get the fingerprint of the cookie
    const cookie = req.cookies.auth;

    // 3. Compare the two fingerprints
    // if (fingerprint === cookie) {
        next();
    // } else {
        // res.status(401).send("Unauthorized");
    // }
}

export default verifyMiddleware;