import { createRef, h } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import { SocketContext } from '../../components/app';
import RtcConnection from '../../api/RtcConnection';
import MemberList from '../../components/member-list';

const Home = () => {

	// Context
	const socket = useContext(SocketContext);

	// Stream
	const [localStream, setLocalStream] = useState<MediaStream>();
	const [remoteStream, setRemoteStream] = useState<MediaStream>();


	const [rtcCon] = useState<RtcConnection>(new RtcConnection());

	// State
	const [message, setMessage] = useState<string>("");
	const [messages, setMessages] = useState<string[]>([]);

	// Refs
	const videoLocal = createRef();
	const videoRemote = createRef();

	// Constructor
	useEffect(() => {

		console.log("join");

		socket.emit('join');

		// Sockets
		// sendJoinSignal();
		// handleChatSend()

		// Webcam
		handleLocalWebcamView();
		handleRemoteWebcamView();

		// WebRTC
		// handlePermissionRequest();
		// handlePermissionAnswer();
		// handleSdpOffer();
		// handleSdpAnswer();
		// handleIceCandidate();
	}, []);

	// Socket handlers
	// const sendJoinSignal = () => {
	// 	socket.emit('join');
	// }

	// const handleChatSend = () => {
	// 	socket.on('chat', (message: string) => {
	// 		setMessages(m => [...m, message]);
	// 	});
	// }

	// WebRTC Handlers
	// const handleIceCandidate = () => {
	// 	socket.on('icecandidate', async (message : {iceCandidate : RTCIceCandidate, peer : any}) => {
	// 		rtcCon.receiveIceCandidate(message);
	// 	});
	// }

	// const handleSdpOffer = async () => {
	// 	socket.on('sdpOffer', async(remoteOffer : {peer : any, offer : RTCSessionDescription}) => {
	// 		rtcCon.sendSDPAnswer(socket, remoteOffer);
	// 	});
	// }

	// const handleSdpAnswer = async () => {
	// 	socket.on('sdpAnswer', (answer : {peer : any, answer : RTCSessionDescription}) => {
	// 		rtcCon.handleSdpAnswer(socket, answer);
	// 	})
	// }

	// const handlePermissionRequest = async () => {
	// 	socket.on('RTCPermissionRequest', (msg : {peer : any, accept : boolean}) => {
	// 		rtcCon.receivePermissionQuestion(msg, socket);
	// 	});
	// }

	// const handlePermissionAnswer = async () => {
	// 	socket.on('rtcPermissionAnswer', async (msg : {peer : any, accept : boolean}) => {
    //         if(msg.accept) {
    //             await rtcCon.SendSDP(socket, msg.peer);
    //         }
    //     });
	// }

	// Webcam
	const handleLocalWebcamView = () => {
		rtcCon.onLocalStreamSet = (stream: MediaStream) => {
			setLocalStream(stream);
		}
	}

	const handleRemoteWebcamView = () => {
		rtcCon.onRemoteStreamSet = (stream: MediaStream) => {
			setRemoteStream(stream);
		}
	}

	// Events
	const onChatSend = (e: any) => {
		e.preventDefault();
		// socket.emit('chat', message);
		setMessage("");
		// rtcCon.sendDataChannelMessage()
		rtcCon.sendMessageThroughDataChannel(message);
	}

	const onTyping = (e: any) => {
		e.preventDefault();
		const message = e.target.value;
		setMessage(message);
	}

	// Render

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
		if (localStream) {
			const video: HTMLVideoElement = document.getElementById("local-id") as HTMLVideoElement;
			video.srcObject = localStream
		}
		if (remoteStream) {
			const video: HTMLVideoElement = document.getElementById("remote-id") as HTMLVideoElement;
			video.srcObject = remoteStream
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

	const renderHomeScreen = () => {
		return(
			<div>
				<h1>Dropper</h1>
				<h3>Friends who're online:</h3>
				{/* <MemberList socket={socket} /> */}
				<MemberList />
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
		)
	}

	// const renderPrivateChat = () => {
	// 	return  <PrivateChat isCaller={} chatModes={} peer={} socket={} />;
	// }

	const render = () => {
		return(
			<div>
				{renderHomeScreen()}
			</div>
		)
	}

	return render();
}

export default Home;