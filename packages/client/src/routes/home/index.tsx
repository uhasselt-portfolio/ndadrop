import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import io from 'socket.io-client';

const Home = () => {

	const [members, setMembers] = useState([]);

	useEffect(() => {
		const socket = io('http://localhost:3000', {
			transports: ['websocket'],
		});

		socket.emit('join');

		socket.on('members', (members) => {
			console.log("members", members);
			setMembers(members);
		});
	}, []);

	const renderMembers = () => {
		return members.map((member: any) => {
			return (
				<li>
					{member.id}
				</li>
			);
		});
	}

	return (
		<div>
			<h1>List</h1>
			<p>{renderMembers()}</p>
		</div>
	);
}

export default Home;
