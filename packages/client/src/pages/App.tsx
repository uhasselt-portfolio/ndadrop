import { createContext, h } from 'preact';
import { Route, Router } from 'preact-router';
import { io } from 'socket.io-client';

// Code-splitting is automated for `routes` directory
import Home from '../routes/home';

const connection = io('http://localhost:9005', {
    transports: ['websocket'],
});

// Context
const SocketContext = createContext(connection);

const App = () => (
	<div id="app">
        <SocketContext.Provider value={connection}>
            <Router>
                <Route path="/" component={Home} />
                {/* <Route path="/privateChat" component={PrivateChat} /> */}
            </Router>
        </SocketContext.Provider>
    </div>
);

export default App;
export {SocketContext}