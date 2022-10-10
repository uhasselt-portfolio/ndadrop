import { createRef, h } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import { SocketContext } from '../../pages/App';
import MemberList from '../../components/MemberList';
import PrivateChat from '../../components/PrivateChat';
import GlobalChat from '../../components/GlobalChat';

// Tailwind
// https://fuadnafiz98.hashnode.dev/configuring-preact-with-tailwind-css

const Home = () => {

	// Context
	const socket = useContext(SocketContext);

	// State
	const [message, setMessage] = useState<string>("");
	const [messages, setMessages] = useState<string[]>([]);
	const [isInPrivateChat, setIsInPrivateChat] = useState<boolean>(false);
	const [ownName, setOwnName] = useState<string>("");

	const [privateChatPeer, setPrivateChatPeer] = useState<string>("");
	const [privateChatIsCaller, setPrivateChatIsCaller] = useState<boolean>(false);

	// Constructor
	useEffect(() => {
		socket.emit('join');

		// Sockets
		handleOwnName();
		// sendJoinSignal();
		// handleChatSend()

		// WebRTC
		handlePermissionRequest();
	}, []);

	// Socket handlers
	const handleOwnName = () => {
		socket.on('name', (name : string) => {
			setOwnName(name);
		})
	}


	// const sendJoinSignal = () => {
	// 	socket.emit('join');
	// }

	// WebRTC Handlers
	const handlePermissionRequest = async () => {
		socket.on('RTCPermissionRequest', (msg : {peer : any, accept : boolean}) => {
			setIsInPrivateChat(true);
			setPrivateChatIsCaller(false);
			setPrivateChatPeer(msg.peer);
		});
	}

	// Events
	const onDirectChatInitiate = (member: any) => {
		setPrivateChatIsCaller(true);
		setPrivateChatPeer(member);
		setIsInPrivateChat(true);
	}

	// Render
	const renderHomeScreen = () => {
		return(
			<div class='flex gap-10 flex-col'>
				<div class='flex flex-col rounded-lg items-center'>
					<p>Your name : </p>
					{ownName}
				</div>
				<div class='flex flex-col bg-white p-7 w-[350px] rounded-lg'>
					<div class="flex text-xl justify-center mb-3">Friends who're online</div>
					<MemberList onDirectChatClick={onDirectChatInitiate} ownName={ownName} />
				</div>
				<div class='flex flex-col rounded-lg items-center'>
					<GlobalChat ownName={ownName}/>
				</div>
			</div>
		)
	}
	const renderPrivateChat = () => {
		return (
			<div class="flex flex-col w-full border gap-3 pt-3">
				<PrivateChat isCaller={privateChatIsCaller} chatModes={{video: true, text : true}} peer={privateChatPeer}/>
			</div>
		)
	}

	const render = () => {
		return(
			<div className="flex flex-col h-screen bg-slate-200 relative gap-4 p-7">
				<div class="text-gray-800 text-3xl flex justify-center">Not Messenger</div>
				<div class="flex items-center justify-center">
					{!isInPrivateChat && renderHomeScreen()}
					{isInPrivateChat && renderPrivateChat()}
				</div>
			</div>
		)
	}

	return render();
}

export default Home;