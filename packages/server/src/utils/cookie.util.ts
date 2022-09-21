import { CookieOptions, Response } from "express";

class CookieUtil {

    // A function that adds a cookie to the response
    static addCookie(res: Response, name: string, value: string, options: CookieOptions = {}) {
        res.cookie(name, value, options);
    }

    // A function that removes a cookie from the response
    static removeCookie(res: Response, name: string) {
        res.clearCookie(name);
    }
}

export default CookieUtil;