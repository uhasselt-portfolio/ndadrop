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

	socket.on('chat', (msg) => {
		console.log("Received chat!");

		io.to(room.getRoomId()).emit('chat', msg);
	});
});

server.listen(config.port, () => {
    console.log(`Server started at http://localhost:${config.port}`);
});