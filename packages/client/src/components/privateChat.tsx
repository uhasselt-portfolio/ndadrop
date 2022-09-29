import { createRef, h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import RtcConnection from '../api/RtcConnection';

type ChatModes = {
    text : boolean,
    video : boolean
}

type Message = {
    message : string,
    own : boolean
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
	peer : any,
	socket : any
}


const PrivateChat = (props: Props) => {
    // state
	const [rtcCon, setRtcCon] = useState<RtcConnection>(new RtcConnection());
	const [localStream, setLocalStream] = useState<MediaStream>();
	const [remoteStream, setRemoteStream] = useState<MediaStream>();

    const [message, setMessage] = useState<string>("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [sendFiles, setSendFiles] = useState<File[]>([]);
    const [receivedFiles, setReceivedFiles] = useState<File[]>([]);

    const videoLocal = createRef();
	const videoRemote = createRef();

    // functions
    const onChatSend = (e: any) => {
		e.preventDefault();
		setMessage("");
		rtcCon.sendMessageThroughDataChannel(message);
	}

	const onTyping = (e: any) => {
		e.preventDefault();
		const message = e.target.value;
		setMessage(message);
	}

    const renderMessages = () => {

		if (messages.length === 0  && messages.length === 0) {
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

	}


    // callbacks
	rtcCon.onLocalStreamSet = (stream: MediaStream) => {
		setLocalStream(stream);
	}
	rtcCon.onRemoteStreamSet = (stream: MediaStream) => {
		setRemoteStream(stream);
	}


    // setup the rtc connection

	useEffect(() => {
		// incoming messages pertaining to the rtc connection
		// RTCPermissionRequest : an incoming request to start a rtc connection
		// RTCPermissionAndwer : the answer from a peer to a rtc connection request
		// sdpOffer : the sdpOffer information from a peer
		// sdpAnswer : the sdpAnswer information from a peer
		// iceCandidate : an iceCandidate from a peer
		props.socket.on('RTCPermissionRequest', (msg : {peer : any, accept : boolean}) => {
			rtcCon.receivePermissionQuestion(msg, props.socket);
		});

		props.socket.on('rtcPermissionAnswer', async (msg : {peer : any, accept : boolean}) => {
            if(msg.accept) {
                await rtcCon.SendSDP(props.socket, msg.peer);
            }
        });

		props.socket.on('sdpOffer', async(remoteOffer : {peer : any, offer : RTCSessionDescription}) => {
			rtcCon.sendSDPAnswer(props.socket, remoteOffer);
		});

		props.socket.on('sdpAnswer', (answer : {peer : any, answer : RTCSessionDescription}) => {
			rtcCon.handleSdpAnswer(props.socket, answer);
		})

		props.socket.on('icecandidate', async (message : {iceCandidate : RTCIceCandidate, peer : any}) => {
			rtcCon.receiveIceCandidate(message);
		});

	}, []);

	// the caller initiates the connection and sends a webrtcRequest 
	if (props.isCaller) {
		console.log("caller");
		rtcCon.askForPermission(props.peer, props.socket);
	} else {
		console.log("callee");
	}


	// render
    return (
		<div>
            <h1>Private Chat</h1>
			{props.chatModes.video && renderVideo()}
            {props.chatModes.text && renderMessaging()}
		</div>
	);

}


export default PrivateChat;