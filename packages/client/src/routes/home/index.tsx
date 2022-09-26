import { createRef, h } from 'preact';
import { useEffect, useState, useRef } from 'preact/hooks';
import io from 'socket.io-client';
import RtcConnection from '../../api/RtcConnection';

const Home = () => {

	const socket = io('http://localhost:3000', {
		transports: ['websocket'],
	});

	const rtcCon : RtcConnection = new RtcConnection();

	// State
	const [members, setMembers] = useState<string[]>([]);
	const [message, setMessage] = useState<string>("");
	const [messages, setMessages] = useState<string[]>([]);
	const videoLocal = createRef();
	const videoRemote = createRef();

	useEffect(() => {
		socket.emit('join');

		socket.on('members', (members) => {
			setMembers(members);
		});

		socket.on('chat', (message: string) => {
			setMessages(m => [...m, message]);
		});

		// TODO : sdp should be exchanged now 
		//        => nu nog ICE candidates
		// ICE candidates are only done when connecting a media stream
		// for example without specifing a video stream it does not work, with a video stream like jori it does

		// incoming messages pertaining to the rtc connection
		// RTCPermissionRequest : an incoming request to start a rtc connection
		// RTCPermissionAndwer : the answer from a peer to a rtc connection request
		// sdpOffer : the sdpOffer information from a peer
		// sdpAnswer : the sdpAnswer information from a peer
		// iceCandidate : an iceCandidate from a peer
		socket.on('RTCPermissionRequest', (msg : {peer : any, accept : boolean}) => {
			console.log('receive rtc request');
			rtcCon.receivePermissionQuestion(msg, socket);
		});

		socket.on('rtcPermissionAnswer', async (msg : {peer : any, accept : boolean}) => {
            console.log("received permission answer : " + msg.accept);
            if(msg.accept) {
                await rtcCon.SendSDP(socket, msg.peer);
            }
        });

		socket.on('sdpOffer', async(remoteOffer : {peer : any, offer : RTCSessionDescription}) => {
			rtcCon.sendSDPAnswer(socket, remoteOffer);
		});

		socket.on('sdpAnswer', (answer : {peer : any, answer : RTCSessionDescription}) => {
			rtcCon.handleSdpAnswer(socket, answer);
		})

		socket.on('icecandidate', async (message : {iceCandidate : RTCIceCandidate, peer : any}) => {
			rtcCon.receiveIceCandidate(message);
		});

	}, []);

	// Events
	const onChatSend = (e: any) => {
		e.preventDefault();
		socket.emit('chat', message);
		setMessage("");
	}

	const onTyping = (e: any) => {
		e.preventDefault();
		const message = e.target.value;
		setMessage(message);
	}

	const onDirectChatInitiate = (member: any) => {
		rtcCon.askForPermission(member, socket);
	}

	// Render
	const renderMembers = () => {
		return members.map((member: any) => {
			return (
				<li>
					{member}
					<button onClick={() => onDirectChatInitiate(member)}>DirectChat</button>
				</li>
			);
		});
	}

	const renderMessages = () => {

		if (messages.length === 0) {
			return (
				<li>
					Be the first one to say something!
				</li>
			);
		}

		return messages.map((message: any) => {
			return (
				<li>
					{message}
				</li>
			);
		});
	}

	

	//testing
	const renderVideo = () => {
		console.log("videolocal : ", videoLocal);
		console.log("videolocal2 : ", videoLocal.current);
		// if (videoLocal.current != undefined) {
		// 	console.log("rendering video");
		// 	videoLocal.current.srcObject = rtcCon.localStream;
		// 	console.log(" localsteram ",rtcCon.localStream)
		// }
		// if (videoRemote.current != undefined) {
		// 	console.log("rendering video");
		// 	videoRemote.current.srcObject = rtcCon.remoteStream;
		// }

		console.log("localstream : ", rtcCon.localStream);
		console.log("remotestream : ", rtcCon.remoteStream);
		if (rtcCon.localStream) {
			console.log("rendering video");
			const video: HTMLVideoElement = document.getElementById("local-id") as HTMLVideoElement;
			video.srcObject = rtcCon.localStream
		}
		if (rtcCon.remoteStream) {
			const video: HTMLVideoElement = document.getElementById("remote-id") as HTMLVideoElement;
			video.srcObject = rtcCon.remoteStream
		}

		return (
			<div>
				local:
				<video ref={videoLocal} id={"local-id"} autoPlay></video>
				remote:
				<video ref={videoRemote} id={"remote-id"} autoPlay></video>
			</div>

		);
	}

	return (
		<div>
			<h1>Dropper</h1>
			<h3>Friends who're online:</h3>
			<p>{renderMembers()}</p>
			<h3>Chat with friends:</h3>
			<input
				onChange={(e) => onTyping(e)}
				value={message}
				type="text"
			/>
			<button onClick={onChatSend}>Send</button>
			<hr />
			{renderMessages()}
			{renderVideo()}
		</div>
	);
}

export default Home;
