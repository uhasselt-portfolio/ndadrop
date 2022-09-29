import { createRef, h } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import { SocketContext } from '../../components/app';
import MemberList from '../../components/member-list';
import PrivateChat from '../../components/privateChat';

const Home = () => {

	// Context
	const socket = useContext(SocketContext);

	// State
	const [message, setMessage] = useState<string>("");
	const [messages, setMessages] = useState<string[]>([]);
	const [isInPrivateChat, setIsInPrivateChat] = useState<boolean>(false);

	const [privateChatPeer, setPrivateChatPeer] = useState<string>("");
	const [privateChatisCaller, setPrivateChatisCaller] = useState<boolean>(false);

	// Constructor
	useEffect(() => {

		socket.emit('join');

		// Sockets
		// sendJoinSignal();
		// handleChatSend()


		// WebRTC
		handlePermissionRequest();
	}, []);

	// Socket handlers
	// const sendJoinSignal = () => {
	// 	socket.emit('join');
	// }

	// WebRTC Handlers
	const handlePermissionRequest = async () => {
		socket.on('RTCPermissionRequest', (msg : {peer : any, accept : boolean}) => {
			setIsInPrivateChat(true);
			setPrivateChatisCaller(false);
			setPrivateChatPeer(msg.peer);
		});
	}

	// Events
	const onDirectChatInitiate = (member: any) => {
		setPrivateChatisCaller(true);
		setPrivateChatPeer(member);
		setIsInPrivateChat(true);
	}

	// Render
	const renderHomeScreen = () => {
		return(
			<div>
				<h1>Dropper</h1>
				<h3>Friends who're online:</h3>
				{/* <MemberList socket={socket} /> */}
				<MemberList />
			</div>
		)
	}
	const renderPrivateChat = () => {
		return (
			<div>
				<PrivateChat isCaller={privateChatisCaller} chatModes={{video: true, text : true}} peer={privateChatPeer}/>
			</div>
		)
	}


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