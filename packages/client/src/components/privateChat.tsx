import { createRef, h } from 'preact';
import { useState, useEffect, useContext } from 'preact/hooks';
import RtcConnection from '../api/RtcConnection';
import { SocketContext } from './app';

type ChatModes = {
    text : boolean,
    video : boolean
}


type MessageType = {
	text : boolean,
	file : boolean
}

type Message = {
	type : MessageType,
    message : string,
    own : boolean,

}

/*
 * The page for a one-on-one chat with another user
 * Can be used to initiate a normal message char or a video chat
 * The caller goes to this page and the callee is redirected to this page accepting the call
 * @para chatModes : the mode to initiate the chat in
 * @para peer : the peer to initiate the chat with ( TODO : set correct type, but now any because I don't know if it will change)
 * @para socket : the socket to use for the chat
 */
interface Props {
	isCaller : boolean,
	chatModes : ChatModes,
	peer : any
}

enum AnswerCallStatus {
	PENDING,
	ACCEPTED,
	REJECTED
}

const PrivateChat = (props: Props) => {
    // Context
    const socket = useContext(SocketContext);

    // state
	const [rtcCon, setRtcCon] = useState<RtcConnection>(new RtcConnection());
	const [localStream, setLocalStream] = useState<MediaStream>();
	const [remoteStream, setRemoteStream] = useState<MediaStream>();

    const [message, setMessage] = useState<string>("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [sendFiles, setSendFiles] = useState<File[]>([]);
    const [receivedFiles, setReceivedFiles] = useState<File[]>([]);

	const [answerCallStatus, setAnswerCallStatus] = useState<AnswerCallStatus>(props.isCaller ? AnswerCallStatus.ACCEPTED : AnswerCallStatus.PENDING);

    const videoLocal = createRef();
	const videoRemote = createRef();

    // functions
    const onChatSend = (e: any) => {
		e.preventDefault();
		rtcCon.sendMessageThroughDataChannel(message);
		setMessages(m => [...m, {type: {text : true, file : false}, message : message, own : true}]);
		setMessage("");
		console.log("Sent message : " + message);
	}

	const onTyping = (e: any) => {
		e.preventDefault();
		const message = e.target.value;
		setMessage(message);
	}

	const onGetMessage = (name: string) => {
		console.log("Got message : " + name, messages);
		setMessages(m => [...m, {type: {text : true, file : false}, message : name, own : false}]);
	}

    const onGetFile = (name: string) => {
		
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

	const handlePermissionAnswer = async () => {
		socket.on('rtcPermissionAnswer', async (msg : {peer : any, accept : boolean}) => {
			if(msg.accept) {
				await rtcCon.SendSDP(socket, msg.peer);
			}
		});
	}

	// Render functions
    const renderMessages = () => {
		console.log(messages);

		if (messages.length === 0) {
			return (
				<li>
					Be the first one to say something!
				</li>
			);
		}

        const renderMessage = (message : Message) => {
            if (message.own)
                return (
                    <div style="color:blue;">
                        {message.message}
                    </div>
                )

            return (
                <div style="color:red;">
                    {message.message}
                </div>
            )
        }

		return messages.map((message: Message) => {
			return (
				<li>
					{renderMessage(message)}
				</li>
			);
		});
	}

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
				Yourself:
				<video ref={videoLocal} id={"local-id"} autoPlay></video>
				remote:
				<video ref={videoRemote} id={"remote-id"} autoPlay></video>
			</div>

		);
	}

	const renderMessaging = () => {
		return(
			<div>
				<input
				onChange={(e) => onTyping(e)}
				value={message}
				type="text"
				/>
				<button onClick={onChatSend}>Send</button>
				{renderMessages()}
			</div>
		)
	}

	const renderTransferedFiles = () => {
		return (
			<div>
				<h3>Received files</h3>
				{/* {renderReceivedFiles()} */}
				<h3>Sent files</h3>
				{/* {renderSendFiles()} */}
			</div>
		)
	}


    // setup the rtc connection

	useEffect(() => {
		rtcCon.onGetMessage = onGetMessage;
		rtcCon.onGetFile = onGetFile;

		// the caller initiates the connection and sends a webrtcRequest 
		if (props.isCaller) {
			console.log("caller", props);
			rtcCon.askForPermission(props.peer, socket);
		} else {
			// console.log("callee", props);
			// rtcCon.receivePermissionQuestion({peer : props.peer}, socket);
		}

		// incoming messages pertaining to the rtc connection
		// RTCPermissionAndwer : the answer from a peer to a rtc connection request
		// sdpOffer : the sdpOffer information from a peer
		// sdpAnswer : the sdpAnswer information from a peer
		// iceCandidate : an iceCandidate from a peer
		handlePermissionAnswer();
		handleSdpOffer();
		handleSdpAnswer();
		handleIceCandidate();

		// Webcam
		handleLocalWebcamView();
		handleRemoteWebcamView();

	}, []);

	// Render
	const renderAnswerCall = () => {

		const onAccept = () => {
			setAnswerCallStatus(AnswerCallStatus.ACCEPTED);
			rtcCon.receivePermissionQuestion({peer : props.peer}, socket, true);
		}

		const onReject = () => {
			setAnswerCallStatus(AnswerCallStatus.REJECTED);
			rtcCon.receivePermissionQuestion({peer : props.peer}, socket, false);
		}

		return (
			<div>
				<h3>You're getting an incoming call</h3>
				<button onClick={onAccept}>Accept</button>
				<button onClick={onReject}>Reject</button>
			</div>
		)
	}

	const renderRejectCall = () => {
		return (
			<div>
				<h3>You rejected the call</h3>
				<button>Go back to home</button>
			</div>
		)
	}

	const renderPrivateChat = () => {
		return (
			<div>
				<h1>Private Chat</h1>
				{props.chatModes.video && renderVideo()}
				{props.chatModes.text && renderMessaging()}
			</div>
		);
	}

	const render = () => {
		return (
			<div>
				{answerCallStatus === AnswerCallStatus.PENDING && renderAnswerCall()}
				{answerCallStatus === AnswerCallStatus.ACCEPTED && renderPrivateChat()}
				{answerCallStatus === AnswerCallStatus.REJECTED && renderRejectCall()}
			</div>
		)
	}


	// render
    return render();

}


export default PrivateChat;