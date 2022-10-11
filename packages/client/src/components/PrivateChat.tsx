import { createRef, h } from 'preact';
import { useState, useEffect, useContext } from 'preact/hooks';
import RtcConnection from '../api/RtcConnection';
import { SocketContext } from '../pages/App';
import Button from './Button';
import FileUpload from './FileUpload';
import { Check, X, PhoneOff, Send, Upload, Download } from 'lucide-preact';
import clsx from 'clsx';

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
	const [chosenFile, setChosenFile] = useState<File | null>(null);

	const [answerCallStatus, setAnswerCallStatus] = useState<AnswerCallStatus>(props.isCaller ? AnswerCallStatus.WAITING : AnswerCallStatus.PENDING);

	const [callingPeer, setCallingPeer] = useState<string>('');

	const videoLocal = createRef();
	const videoRemote = createRef();

    // Handlers
    const onChatSend = (e: any) => {
		e.preventDefault();

		if (chosenFile) {
			sendFile(chosenFile);
			setChosenFile(null);
		} else {
			rtcCon.sendMessageThroughDataChannel(message);
			setMessages(m => [...m, {type : "text", payload : message, own : true}]);
			setMessage("");
		}
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

		// add own message
		

		return true
	}

	const fileSelected = (file : File) => {
		setChosenFile(file);
	}

	const leaveCall = () => {

		// send via socket that I leave the call
		socket.emit('leavePrivateChat', {peer : props.peer});

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
		socket.on('leavePrivateChat', (msg : {peer : any}) => {
			props.updateIsInPrivateChat(false);
			rtcCon.handleCloseCall();
		});
	}

	// Render functions
    const renderMessages = () => {
		if (messages.length === 0) {
			return (
				<div class='italic text-gray-600 py-2'>
					Be the first one to say something!
				</div>
			);
		}

        const renderMessage = (message : Message, index: number) => {
			if (message.type === "file") return null;

			const isOwn = message.own;
			const sender = message.own ? 'You' : props.peer;
			const style = clsx(
				"p-2 rounded-lg flex flex-col w-full",
				isOwn ? "bg-blue-200" : "bg-gray-200"
			);

			return (
				<div class={style} key={index}>
					<div class='text-sm italic text-gray-500'>{sender}</div>
					<div>{message.payload}</div>
				</div>
			)
        }

		const renderFile = (message : Message, index: number) => {
			if (message.type === "text") return null;

			const isOwn = message.own;
			const sender = message.own ? 'You' : props.peer;
			const style = clsx(
				"p-2 rounded-lg flex flex-row w-full",
				isOwn ? "bg-blue-200" : "bg-gray-200"
			);

			const download = isOwn ? null : <Download onClick={() => downloadFile(message)} size={16} />

			return (
				<div class='flex flex-row w-full'>
					<div class={style} key={index}>
						<div class='flex flex-col w-full'>
							<div class='text-sm italic text-gray-500 w-full'>{sender}</div>
							<div>{message.fileName}</div>
						</div>
						<div class='flex items-center justify-end cursor-pointer hover:text-blue-500'>
							{download}
						</div>
					</div>
				</div>
			)
		}

		const texts =  messages.map((message: Message, index: number) => {
			return (
				<div class='flex flex-col'>
					{message.type === "text" ? renderMessage(message, index) : renderFile(message, index)}
				</div>
			);
		});

		return <div class='flex flex-col w-full gap-2 overflow-auto max-h-[230px]'>
			{texts}
		</div>
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
			<div class='flex flex-row'>
				<div class='flex flex-col gap-3'>
					<span class='flex justify-center text-lg italic'>You</span>
					<video class='flex w-auto h-[200px]' ref={videoLocal} id={"local-id"} autoPlay></video>
				</div>
				<div class='flex flex-col gap-3'>
					<span class='flex justify-center text-lg italic'>{props.peer}</span>
					<video class='flex w-auto h-[200px]' ref={videoRemote} id={"remote-id"} autoPlay></video>
				</div>
			</div>

		);
	}

	const renderMessaging = () => {

		const dynamicFileUploadStyling = clsx(
			"rounded-lg p-2",
			chosenFile === null && " bg-black text-white cursor-pointer",
			chosenFile !== null && " bg-gray-200 text-black cursor-not-allowed"
		);

		return(
			<div class='flex flex-col gap-2 bg-white p-3 w-[450px] rounded-lg shadow-sm border'>
				<div class='overflow-auto max-h-[250px]'>
					{renderMessages()}
				</div>
				<div class='flex flex-row gap-2 w-full'>
					<input
						class=' p-2 bg-slate-100 rounded-lg w-full'
						placeholder={chosenFile ? chosenFile.name : 'Type a message...'}
						disabled={chosenFile !== null}
						onChange={(e) => onTyping(e)}
						onKeyUp={(e) => e.key == 'Enter' && onChatSend(e)}
						value={message}
						type="text"
					/>
					<button class='p-2 bg-black rounded-lg text-white' onClick={onChatSend}>
						<Send color="white" size={16}/>
					</button>
					<button class={dynamicFileUploadStyling}>
						<FileUpload uploadFile={sendFile} fileSelected={fileSelected} />
					</button>
				</div>
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
		// if (socket._callbacks.$rtcPermissionAnswer === undefined) 
			handlePermissionAnswer();
		// if (socket._callbacks.$sdpOffer === undefined) 
			handleSdpOffer();
		// if (socket._callbacks.$sdpAnswer === undefined) 
			handleSdpAnswer();
		// if (socket._callbacks.$icecandidate === undefined) 
			handleIceCandidate();
		// if (socket._callbacks.$leavePrivateChat === undefined) 
			handleCloseCall();

		// Webcam
		handleLocalWebcamView();
		handleRemoteWebcamView();

		return function cleanup() {
			// remove the socket.on event listeners
			socket.off("rtcPermissionAnswer");
			socket.off("sdpOffer");
			socket.off("sdpAnswer");
			socket.off("icecandidate");
			socket.off("leavePrivateChat");

			// this is copilot => is this needed.
			// videoLocal.current?.remove();
			// videoRemote.current?.remove();
		}

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
			<div class='flex flex-col gap-4 bg-white p-7 w-[750px] rounded-lg shadow-sm items-center'>
				<span class='flex justify-center text-3xl p-5 font-bold'>Private Chat</span>
				{props.chatModes.video && renderVideo()}
				{props.chatModes.text && renderMessaging()}
				{<div class='flex flex-row items-center justify-center bg-red-400 text-white rounded-lg p-2 font-bold cursor-pointer gap-3 w-full' onClick={leaveCall}>
					<PhoneOff size={16}/>
					<span>Leave call</span>
				</div>}
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
