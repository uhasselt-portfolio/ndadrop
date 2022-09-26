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
	const videos = createRef();

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

		socket.on('rtcPermissionAnswer', (msg : {peer : any, accept : boolean}) => {
            console.log("received permission answer : " + msg.accept);
            if(msg.accept) {
                rtcCon.SendSDP(socket, msg.peer);
            }
        });

		socket.on('sdpOffer', (remoteOffer : {peer : any, offer : RTCSessionDescription}) => {
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
		if (videos.current != null) {
			console.log("rendering video");
			videos.current.srcObject = rtcCon.mediaStream;
		}
		return (
				
			<video ref={videos} autoPlay></video>
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
