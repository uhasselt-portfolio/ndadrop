import cookieParser from "cookie-parser";
import cors from 'cors';
import express from "express";
import http from 'http';
import { Server } from "socket.io";
import { adjectives, animals, uniqueNamesGenerator } from 'unique-names-generator';
import { config } from "./config";
import RoomService, {Member} from "./services/room.service";
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
		const id = socket.id;

		room.leave(id);

		io.to(room.getRoomId()).emit('members', room.getMembers());
	});

	socket.on('join', (msg) => {

		const id = socket.id;
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
		io.to(room.getRoomId()).emit('chat', msg);
	});

	socket.on('directChat', (msg) => {

	});

	socket.on('askRTCPermission', (msg : {peer : any, msg : string, videoCall : boolean}) => {
		const id = socket.id;
		const sender = room.getMember(id);
		// console.log("member asking for a rtc connection from: " + sender?.name + " to: " + msg.peer + " with message: " + msg.msg + " videoCall: " + msg.videoCall);
		//TODO: check if the peer is in the room
	    //      check if the peer is not the same as the one asking
		//	    check if there isn't already a rtc connection between the two peers

		const receiver = room.getMemberByName(msg.peer);
		if(receiver){
			const receiverSocketId = receiver.socketId;
			socket.to(receiverSocketId).emit('RTCPermissionRequest', {peer : sender?.name, msg : msg.msg, videoCall : msg.videoCall});
		}
	});

	socket.on('permissionAnswer', (msg : {peer : any, accept : boolean}) => {
		const id = socket.id;
		const sender = room.getMember(id);
		// console.log("member aswering the rtc connection from: " + sender?.name + " to: " + msg.peer + " answer: " + msg.accept);

		const receiver = room.getMemberByName(msg.peer);
		if(receiver){
			const receiverSocketId = receiver.socketId;
			socket.to(receiverSocketId).emit('rtcPermissionAnswer', {peer : sender?.name, accept : msg.accept});
		}
	});

	socket.on('sdpOffer', (msg : {offer : any, peer : any}) => {
		const id = socket.id;
		const sender = room.getMember(id);
		// console.log("member sending a sdp offer from: " + sender?.name + " to: " + msg.peer + " with offer: " + msg.offer);
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
		const id = socket.id;
		const sender = room.getMember(id);
		// console.log("member sending a sdp answer from: " + sender?.name + " to: " + msg.peer + " with offer: " + msg.answer);
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
		const id = socket.id;
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

	socket.on('leavePrivateChat', (msg : {peer : any}) => {
		console.log("leaving private chat with: " + msg.peer);
		const id = socket.id;
		const sender = room.getMember(id);

		const receiver = room.getMemberByName(msg.peer);
		if(receiver){
			console.log("leaving private chat with member: " + receiver.name);
			const receiverSocketId = receiver.socketId;
			socket.to(receiverSocketId).emit('leavePrivateChat', {peer : sender?.name});
		}
	});

	socket.on('globalMessage', (msg : {message : string, sender : string}) => {
		const id = socket.id;
		const sender = room.getMember(id);
		io.to(room.getRoomId()).emit('globalBroadcast', {message : msg.message, sender : msg.sender });

		// send to all clients in the room except the one that sent the message

		// get all members of the room
		// const members = room.getMembers();
		// for (let member of members) {
		// 	const m : Member | undefined = room.getMemberByName(member);
		// 	console.log("sending global message to peer: " + member);
		// 	if (m) {
		// 		const memberSocketId = m.socketId;
		// 		if (memberSocketId !== socket.id) {
		// 			socket.to(memberSocketId).emit('globalBroadcast', {message : msg.message, sender : msg.sender });
		// 		}
		// 	}
		// }
	});

});

server.listen(config.port, () => {
    console.log(`Server started at http://localhost:${config.port}`);
});