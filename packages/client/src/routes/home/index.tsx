import { h } from 'preact';
import { useEffect, useState, useRef } from 'preact/hooks';
import io from 'socket.io-client';

const Home = () => {

	const socket = io('http://localhost:3000', {
		transports: ['websocket'],
	});

	// State
	const [members, setMembers] = useState<string[]>([]);
	const [message, setMessage] = useState<string>("");
	const [messages, setMessages] = useState<string[]>([]);

	useEffect(() => {
		socket.emit('join');

		socket.on('members', (members) => {
			setMembers(members);
		});

		socket.on('chat', (message: string) => {
			setMessages(m => [...m, message]);
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

	// Render
	const renderMembers = () => {
		return members.map((member: any) => {
			return (
				<li>
					{member.id}
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
		</div>
	);
}

export default Home;
