import cookieParser from "cookie-parser";
import express, { Request, Response } from "express";
import { config } from "./config";
import verifyMiddleware from "./middleware/verify.middleware";
import RoomService from "./services/room.service";
import CookieUtil from "./utils/cookie.util";
import FingerprintUtil from "./utils/fingerprint.util";
import cors from 'cors'

const app = express();

app.use(cookieParser());
app.use(cors());

// Instances
const room = new RoomService();

// This API will act like an airdrop alternative
// Requirement are:
// - Only people on the same network can communicate
// - When first connecting, the user will be added to a waiting room
// - Users on the same network will see each other in the waiting room
// - When a user is disconnected, the user will be removed from the waiting and chat room

app.get("/", (req: Request, res: Response) => {
	res.send("Hello World!");
});

// When a user connects, they will be added to the waiting room
app.post("/room/join", (req: Request, res: Response) => {

	// 1. Get the user's fingerprint
	const fingerprint = FingerprintUtil.scan(req);

	// 1. Add the user to the waiting room
	room.join({
		id: fingerprint
	});

	CookieUtil.addCookie(res, "auth", fingerprint);

	res.send("You have joined the waiting room!");
});

// Get the waiting room
app.get("/room/peers", verifyMiddleware, (req: Request, res: Response) => {
	res.send(room.getMembers());

	// room.chat()
});

// Send a chat message to everyone in the waiting room
app.get("/room/chat", verifyMiddleware, (req: Request, res: Response) => {

});

app.get("/room/leave", verifyMiddleware, (req: Request, res: Response) => {

	// 1. Get the user's fingerprint
	const fingerprint = FingerprintUtil.scan(req);

	// 2. Remove the user from the waiting room
	room.leave({
		id: fingerprint
	});

	res.send("You have left the waiting room!");
});

app.listen(config.port, () => {
    console.log(`Server started at http://localhost:${config.port}`);
});