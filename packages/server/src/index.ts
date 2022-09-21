import cookieParser from "cookie-parser";
import express, { Request, Response } from "express";
import { config } from "./config";
import verifyMiddleware from "./middleware/verify.middleware";
import RoomService from "./services/room.service";
import CookieUtil from "./utils/cookie.util";
import FingerprintUtil from "./utils/fingerprint.util";
import cors from 'cors'
import http from 'http'
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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

// Show members in room
// app.get("/room/members", (req: Request, res: Response) => {

// 	const id = FingerprintUtil.scanHttpRequest(req);

// 	const members = room.getMembers();

// 	// Filter out the id
// 	const filteredMembers = members.filter((member) => member.id !== id);

// 	res.send(members);
// });

io.on('connection', (socket) => {

	socket.on('disconnect', () => {
		const metadata = socket.handshake;
		const id = FingerprintUtil.scanSocket(metadata);

		room.leave({ id });

		io.to(room.getRoomId()).emit('members', room.getMembers());
	});

	socket.on('join', (msg) => {

		const metadata = socket.handshake;
		const id = FingerprintUtil.scanSocket(metadata);

		room.join({
			id,
		});

		socket.join(room.getRoomId());
		io.to(room.getRoomId()).emit('members', room.getMembers());
	});
});

server.listen(config.port, () => {
    console.log(`Server started at http://localhost:${config.port}`);
});