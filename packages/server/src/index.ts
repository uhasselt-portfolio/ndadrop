import cookieParser from "cookie-parser";
import cors from 'cors';
import express from "express";
import http from 'http';
import { Server } from "socket.io";
import { adjectives, animals, uniqueNamesGenerator } from 'unique-names-generator';
import { config } from "./config";
import RoomService from "./services/room.service";
import FingerprintUtil from "./utils/fingerprint.util";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cookieParser());
app.use(cors());
app.use(express.static('public'))


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
			socketId: socket.id
		});

		socket.join(room.getRoomId());
		io.to(room.getRoomId()).emit('members', room.getMembers());
		// send the assigned name of the client to the clinet
		socket.emit('name', shortName);
	});

	socket.on('chat', (msg) => {
		console.log("Received chat!");

		io.to(room.getRoomId()).emit('chat', msg);
	});

	socket.on('directChat', (msg) => {
		console.log("trying to send direct chat to: " + msg.to);
		console.log("from " + msg.from);

	});

	socket.on('askRTCPermission', (msg : {peer : any, msg : string}) => {
		const metadata = socket.handshake;
		const id = FingerprintUtil.scanSocket(metadata);
		const sender = room.getMember(id);
		console.log("member asking for a rtc connection from: " + sender?.name + " to: " + msg.peer + " with message: " + msg.msg);
		//TODO: check if the peer is in the room
	    //      check if the peer is not the same as the one asking
		//	    check if there isn't already a rtc connection between the two peers

		const receiver = room.getMemberByName(msg.peer);
		if(receiver){
			const receiverSocketId = receiver.socketId;
			socket.to(receiverSocketId).emit('RTCPermissionRequest', {peer : sender?.name, msg : msg.msg});
		}
	});

	socket.on('permissionAnswer', (msg : {peer : any, accept : boolean}) => {
		const metadata = socket.handshake;
		const id = FingerprintUtil.scanSocket(metadata);
		const sender = room.getMember(id);
		console.log("member aswering the rtc connection from: " + sender?.name + " to: " + msg.peer + " answer: " + msg.accept);

		const receiver = room.getMemberByName(msg.peer);
		if(receiver){
			const receiverSocketId = receiver.socketId;
			socket.to(receiverSocketId).emit('rtcPermissionAnswer', {peer : sender?.name, accept : msg.accept});
		}
	});

	socket.on('sdpOffer', (msg : {offer : any, peer : any}) => {
		const metadata = socket.handshake;
		const id = FingerprintUtil.scanSocket(metadata);
		const sender = room.getMember(id);
		console.log("member sending a sdp offer from: " + sender?.name + " to: " + msg.peer + " with offer: " + msg.offer);
		//TODO: check if the peer is in the room
	    //      check if the peer is not the same as the one asking
		//	    check if there isn't already a rtc connection between the two peers

		const receiver = room.getMemberByName(msg.peer);
		if(receiver){
			const receiverSocketId = receiver.socketId;
			socket.to(receiverSocketId).emit('sdpOffer', {peer : sender?.name, offer : msg.offer});
		}
	});

	socket.on('sdpAnswer', (msg : {answer : any, peer : any}) => {
		const metadata = socket.handshake;
		const id = FingerprintUtil.scanSocket(metadata);
		const sender = room.getMember(id);
		console.log("member sending a sdp answer from: " + sender?.name + " to: " + msg.peer + " with offer: " + msg.answer);
		//TODO: check if the peer is in the room
	    //      check if the peer is not the same as the one asking
		//	    check if there isn't already a rtc connection between the two peers

		const receiver = room.getMemberByName(msg.peer);
		if(receiver){
			const receiverSocketId = receiver.socketId;
			socket.to(receiverSocketId).emit('sdpAnswer', {peer : sender?.name, answer : msg.answer});
		}
	});

	socket.on('icecandidate', (msg : {iceCandidate: any, peer : any}) => {
		const metadata = socket.handshake;
		const id = FingerprintUtil.scanSocket(metadata);
		const sender = room.getMember(id);
		// console.log("member sending an ice candidate from: " + sender?.name + " to: " + msg.peer + " with offer: " + msg.newIceCandidate);
		//TODO: check if the peer is in the room
	    //      check if the peer is not the same as the one asking
		//	    check if there isn't already a rtc connection between the two peers

		const receiver = room.getMemberByName(msg.peer);
		if(receiver){
			const receiverSocketId = receiver.socketId;
			socket.to(receiverSocketId).emit('icecandidate', {peer : sender?.name, iceCandidate : msg.iceCandidate});
		}
	});

	socket.on('globalMessage', (msg : {message : any, sender : string}) => {
		const metadata = socket.handshake;
		const id = FingerprintUtil.scanSocket(metadata);
		const sender = room.getMember(id);
		console.log("member asking for a rtc connection from: " + msg.sender + " sending a global message : " + msg.message);
		//TODO: check if the peer is in the room
	    //      check if the peer is not the same as the one asking
		//	    check if there isn't already a rtc connection between the two peers

		io.to(room.getRoomId()).emit('globalMessage', {sender : msg.sender, message : msg.message});

	});

});

server.listen(config.port, () => {
    console.log(`Server started at http://localhost:${config.port}`);
});