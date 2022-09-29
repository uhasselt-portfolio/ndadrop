import { createRef, h } from 'preact';
import { useEffect, useState, useRef } from 'preact/hooks';
import io from 'socket.io-client';
import RtcConnection from '../../api/RtcConnection';
const Home = () => {

	const socket = io('http://localhost:3000', {
		transports: ['websocket'],
	});

	// Stream
	const [localStream, setLocalStream] = useState<MediaStream>();
	const [remoteStream, setRemoteStream] = useState<MediaStream>();


	const [rtcCon] = useState<RtcConnection>(new RtcConnection());

	// State
	const [members, setMembers] = useState<string[]>([]);
	const [message, setMessage] = useState<string>("");
	const [messages, setMessages] = useState<string[]>([]);
	const [isInPrivateChat, setIsInPrivateChat] = useState<boolean>(false);

	// Refs
	const videoLocal = createRef();
	const videoRemote = createRef();

	// Constructor
	useEffect(() => {

		// Sockets
		sendJoinSignal();
		handleMembersChange();
		handleChatSend()

		// Webcam
		handleLocalWebcamView();
		handleRemoteWebcamView();

		// WebRTC
		handlePermissionRequest();
		handlePermissionAnswer();
		handleSdpOffer();
		handleSdpAnswer();
		handleIceCandidate();
	}, []);

	// Socket handlers
	const sendJoinSignal = () => {
		socket.emit('join');
	}

	const handleMembersChange = () => {
		socket.on('members', (members) => {
			setMembers(members);
		});

	}

	const handleChatSend = () => {
		socket.on('chat', (message: string) => {
			setMessages(m => [...m, message]);
		});
	}

	// WebRTC Handlers
	const handleIceCandidate = () => {
		socket.on('icecandidate', async (message : {iceCandidate : RTCIceCandidate, peer : any}) => {
			rtcCon.receiveIceCandidate(message);
		});
	}

	const handleSdpOffer = async () => {
		socket.on('sdpOffer', async(remoteOffer : {peer : any, offer : RTCSessionDescription}) => {
			rtcCon.sendSDPAnswer(socket, remoteOffer);
		});
	}

	const handleSdpAnswer = async () => {
		socket.on('sdpAnswer', (answer : {peer : any, answer : RTCSessionDescription}) => {
			rtcCon.handleSdpAnswer(socket, answer);
		})
	}

	const handlePermissionRequest = async () => {
		socket.on('RTCPermissionRequest', (msg : {peer : any, accept : boolean}) => {
			rtcCon.receivePermissionQuestion(msg, socket);
		});
	}

	const handlePermissionAnswer = async () => {
		socket.on('rtcPermissionAnswer', async (msg : {peer : any, accept : boolean}) => {
            if(msg.accept) {
                await rtcCon.SendSDP(socket, msg.peer);
            }
        });
	}

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
