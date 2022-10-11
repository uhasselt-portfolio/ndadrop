import { createRef, h } from 'preact';
import { useState, useEffect, useContext } from 'preact/hooks';
import RtcConnection from '../api/RtcConnection';
import { SocketContext } from '../pages/App';
import Button from './Button';
import FileUpload from './FileUpload';
import { Check, X } from 'lucide-preact';

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
	isCaller : boolean,
	chatModes : ChatModes,
	peer : any,
	updateIsInPrivateChat : (value : boolean) => void
}

enum AnswerCallStatus {
	PENDING, // Callee waiting to accept
	WAITING, // Caller waiting for callee to accept
	ACCEPTED,
	REJECTED
}

// TODO : video for callee aanzetten

/*
 * The page for a one-on-one chat with another user
 * Can be used to initiate a normal message char or a video chat
 * The caller goes to this page and the callee is redirected to this page accepting the call
 * @para chatModes : the mode to initiate the chat in
 * @para peer : the peer to initiate the chat with ( TODO : set correct type, but now any because I don't know if it will change)
 * @para isCaller : a boolean indicating if the user is the caller or the callee
 */
const PrivateChat = (props: Props) => {
    // Context
    const socket = useContext(SocketContext);

    // state
	const [rtcCon, setRtcCon] = useState<RtcConnection>(new RtcConnection());
	const [localStream, setLocalStream] = useState<MediaStream>();
	const [remoteStream, setRemoteStream] = useState<MediaStream>();

    const [message, setMessage] = useState<string>("");
    const [messages, setMessages] = useState<Message[]>([]);
	const [choosingFile, setChoosingFile] = useState<boolean>(false);

	const [answerCallStatus, setAnswerCallStatus] = useState<AnswerCallStatus>(props.isCaller ? AnswerCallStatus.WAITING : AnswerCallStatus.PENDING);

	const [callingPeer, setCallingPeer] = useState<string>('');

	const videoLocal = createRef();
	const videoRemote = createRef();

    // Handlers
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
		console.log("got file", fileData, fileName);
		setMessages(m => [...m, {
			type: "file",
			own: false,
			fileData: fileData,
			fileName: fileName
		}]);
	}

	// Helpers
	const downloadFile = (message: Message) => {
		console.log("downloading file ", message);
		if (message.type != 'file') return;
		let url = message.fileData;
		let a = document.createElement('a');
		a.href = url;
		a.download = message.fileName;
		a.click();
	}

    const sendFile = (File : File) => {
		rtcCon.sendFileThroughDataChannel(File);
		return true
	}

	const leaveCall = () => {

		// send via socket that I leave the call
		socket.emit('leave-private-chat', {peer : props.peer});

		rtcCon.handleCloseCall();

		props.updateIsInPrivateChat(false);
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
				setAnswerCallStatus(AnswerCallStatus.ACCEPTED);
				setCallingPeer(msg.peer);
				// await rtcCon.SendSDP(socket, msg.peer);
			} else {
				setAnswerCallStatus(AnswerCallStatus.REJECTED);
			}
		});
	}

	const handleCloseCall = async () => {
		socket.on('leave-private-chat', (msg : {peer : any}) => {
			props.updateIsInPrivateChat(false);
			rtcCon.handleCloseCall();
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
				{/* <button onClick={() => setChoosingFile(false)}>Cancel</button> */}
			</div>
		)
	}

	const renderMessaging = () => {
		return(
			<div>
				{//! choosingFile &&
					<div>
						<input
						onChange={(e) => onTyping(e)}
						value={message}
						type="text"
						/>
						<button onClick={onChatSend}>Send</button>
						{/* <button onClick={() => setChoosingFile(true)}>Send file</button> */}
					</div>
				}

				{/* {choosingFile && renderFilePicker()} */}
				{renderFilePicker()}
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
		rtcCon.onCloseCall = handleCloseCall;
		rtcCon.videoCall = props.chatModes.video;

		// the caller initiates the connection and sends a webrtcRequest
		if (props.isCaller) {
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
		handleCloseCall();

		// Webcam
		handleLocalWebcamView();
		handleRemoteWebcamView();

	}, []);

	useEffect(() => {
		if (answerCallStatus === AnswerCallStatus.ACCEPTED && callingPeer !== "") {
			rtcCon.SendSDP(socket, callingPeer);
		}
	}, [answerCallStatus, callingPeer]);

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
			<div class='flex flex-col bg-white p-7 w-[350px] rounded-lg items-center gap-3'>
				<div class='italic text-gray-700'>You're getting an incoming call...</div>
				<div class='flex flex-row gap-10'>
					<Button size='sm' type='primary-dark-2' onClick={onAccept}>
						<Check color="white" size={16}/>
						<span>Accept</span>
					</Button>
					<Button size='sm' type='danger' onClick={onReject}>
						<X color="red" size={16}/>
						<span>Reject</span>
					</Button>
				</div>
			</div>
		)
	}

	const renderWaitingForAnswer = () => {
		return (
			<div class='flex flex-col bg-white p-7 w-[350px] rounded-lg items-center gap-3'>
				<div class='italic text-gray-700'>Waiting for answer...</div>
			</div>
		)
	}

	const renderRejectCall = () => {
		props.updateIsInPrivateChat(false);
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
				{<button onClick={leaveCall}>Leave call</button>}
			</div>
		);
	}

	const render = () => {
		return (
			<div class='flex justify-center'>
				{answerCallStatus === AnswerCallStatus.WAITING && renderWaitingForAnswer()}
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
