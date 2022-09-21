import { h } from 'preact';
import { useEffect } from 'preact/hooks';
import API from '../../api';

const Home = () => {

	useEffect(() => {
		console.log("Welcome");
		API.room().join();
	}, []);

	return (
		<div>
			<h1>Home</h1>
			<p>This is the Home component.</p>
		</div>
	);
}

export default Home;
