import { createRef, h } from 'preact';
import { useState, useEffect, useContext } from 'preact/hooks';
import RtcConnection from '../api/RtcConnection';
import { SocketContext } from './app';
import FileUpload from './fileUpload';


// 1 player creates a groupchat room
//  => server creates a room with a unique id and only the creator is in the room
// the people in the room can add other people to the room from globalchat
//  => these people get request and if the accept the server adds them to the room 


const downloadFile = (message: Message) => {
	if (message.type != 'file') return;
	let url = message.fileData;
	let a = document.createElement('a');
	a.href = url;
	a.download = message.fileName;
	a.click();
}

type ChatModes = {
    text : boolean,
    video : boolean
}

type Message = {
	type : "text",
	payload: string
    own : boolean,
} | {
	type : "file",
	fileData: string,
	fileName: string,
	own : boolean,
}

interface Props {
	groupId : number,
	chatModes : ChatModes
}

enum AnswerCallStatus {
	PENDING,
	CONNECTED,
    REJECTED
}

/*
 * The page for a one-on-one chat with another user
 * Can be used to initiate a normal message char or a video chat
 * The caller goes to this page and the callee is redirected to this page accepting the call
 * @para chatModes : the mode to initiate the chat in
 * @para peer : the peer to initiate the chat with ( TODO : set correct type, but now any because I don't know if it will change)
 * @para isCaller : a boolean indicating if the user is the caller or the callee
 */
const GroupChat = (props: Props) => {
    // Context
    const socket = useContext(SocketContext);

    // state
	const [rtcCon, setRtcCon] = useState<RtcConnection>(new RtcConnection());
	const [localStream, setLocalStream] = useState<MediaStream>();
	const [remoteStream, setRemoteStream] = useState<MediaStream>();

    const [message, setMessage] = useState<string>("");
    const [messages, setMessages] = useState<Message[]>([]);
	const [choosingFile, setChoosingFile] = useState<boolean>(false);

	// const [answerCallStatus, setAnswerCallStatus] = useState<AnswerCallStatus>(props.isCaller ? AnswerCallStatus.ACCEPTED : AnswerCallStatus.PENDING);
    const [callStatus, setCallStatus] = useState<AnswerCallStatus>(AnswerCallStatus.PENDING);

    const videoLocal = createRef();
	const videoRemote = createRef();

    // functions
    const onChatSend = (e: any) => {
		e.preventDefault();
		rtcCon.sendMessageThroughDataChannel(message);
		setMessages(m => [...m, {type : "text", payload : message, own : true}]);
		setMessage("");
	}

	const onTyping = (e: any) => {
		e.preventDefault();
		const message = e.target.value;
		setMessage(message);
	}

	const onGetMessage = (name: string) => {
		setMessages(m => [...m, {
			type: "text",
			own: false,
			payload: name
		}])
	}

	const onGetFile = (fileData : string, fileName : string) => {

		setMessages(m => [...m, {
			type: "file",
			own: false,
			fileData: fileData,
			fileName: fileName
		}]);
	}

    const sendFile = (File : File) => {
		// Send the file through the data channel
		rtcCon.sendFileThroughDataChannel(File);

		return true
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
		if (messages.length === 0) {
			return (
				<li>
					Be the first one to say something!
				</li>
			);
		}

        const renderMessage = (message : Message) => {
			if (message.type === "file") return null;

			const isOwn = message.own;
			const style = isOwn ? "color:blue;" : "color:red;";

			return (
				<div style={style}>
					{message.payload}
				</div>
			)
        }

		const renderFile = (message : Message) => {
			if (message.type === "text") return null;

			const isOwn = message.own;
			const style = isOwn ? "color:blue;" : "color:red;";

			return (
				<div>
					<div style={style}>
						File: {message.fileName}
					</div>
					<button onClick={() => {downloadFile(message)}}>Download</button>
				</div>
			)
		}

		return messages.map((message: Message) => {
			return (
				<li>
					{message.type === "text" ? renderMessage(message) : renderFile(message)}
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

	const renderFilePicker = () => {
		return(
			<div>
				<FileUpload uploadFile={sendFile} />
				<button onClick={() => setChoosingFile(false)}>Cancel</button>
			</div>
		)
	}

	const renderMessaging = () => {
		return(
			<div>
				{! choosingFile &&
					<div>
						<input
						onChange={(e) => onTyping(e)}
						value={message}
						type="text"
						/>
						<button onClick={onChatSend}>Send</button>
						<button onClick={() => setChoosingFile(true)}>Send file</button>
					</div>
				}

				{choosingFile && renderFilePicker()}
				{renderMessages()}
			</div>
		)
	}

	useEffect(() => {
		rtcCon.onGetMessage = onGetMessage;
		rtcCon.onGetFile = onGetFile;

		// initiate a rtc connection with the server pertaining to the specific room
        // TODO
        // if this is the creator of the room, send a creation request to the server
        // else, send a join request to the server

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
		// handleLocalWebcamView(); // Don't do this in group chat => otherwise to much video streams when multiple people are in the room
		handleRemoteWebcamView();

	}, []);

	// Render
	const renderAnswerCall = () => {

		const onAccept = () => {
			setCallStatus(AnswerCallStatus.CONNECTED);
			// rtcCon.receivePermissionQuestion({peer : props.peer}, socket, true);
		}

		const onReject = () => {
			setCallStatus(AnswerCallStatus.REJECTED);
			// rtcCon.receivePermissionQuestion({peer : props.peer}, socket, false);
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
				{callStatus === AnswerCallStatus.PENDING && renderAnswerCall()}
				{callStatus === AnswerCallStatus.CONNECTED && renderPrivateChat()}
				{callStatus === AnswerCallStatus.REJECTED && renderRejectCall()}
			</div>
		)
	}


	// render
    return render();

}


export default GroupChat;