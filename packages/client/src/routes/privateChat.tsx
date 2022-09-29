import { createRef, h } from 'preact';
import { useState } from 'preact/hooks';
import RtcConnection from '../api/RtcConnection';

type ChatModes = {
    text : boolean,
    video : boolean
}

type Message = {
    message : string,
    own : boolean
}

// TODO : how to give arguments to a component?

/*
 * The page for a one-on-one chat with another user
 * Can be used to initiate a normal message char or a video chat
 * @para chatModes : the mode to initiate the chat in
 * @para peer : the peer to initiate the chat with ( TODO : set correct type, but now any because I don't know if it will change)
 * @para socket : the socket to use for the chat
 */
interface Props {
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
				local:
				<video ref={videoLocal} id={"local-id"} autoPlay></video>
				remote:
				<video ref={videoRemote} id={"remote-id"} autoPlay></video>
			</div>

		);
	}


    // callbacks
	rtcCon.onLocalStreamSet = (stream: MediaStream) => {
		setLocalStream(stream);
	}
	rtcCon.onRemoteStreamSet = (stream: MediaStream) => {
		setRemoteStream(stream);
	}


    // setup the rtc connection
    return (
		<div>
            <h1>Private Chat</h1>
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


export default PrivateChat;