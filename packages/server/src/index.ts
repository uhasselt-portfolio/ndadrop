import cookieParser from "cookie-parser";
import cors from 'cors';
import express from "express";
import http from 'http';
import { Server } from "socket.io";
import { config } from "./config";
import RoomService from "./services/room.service";
import FingerprintUtil from "./utils/fingerprint.util";
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator'

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

		room.leave(id);

		io.to(room.getRoomId()).emit('members', room.getMembers());
	});

	socket.on('join', (msg) => {

		const metadata = socket.handshake;
		const id = FingerprintUtil.scanSocket(metadata);
        const shortName = uniqueNamesGenerator({
            dictionaries: [adjectives, animals],
            separator: " ",
			style: "capital",
			length: 2,
        });

		room.join({
			id,
			name: shortName,
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