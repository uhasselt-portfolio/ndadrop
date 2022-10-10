import { createContext, h } from 'preact';
import { Route, Router } from 'preact-router';
import { io } from 'socket.io-client';
import { useState } from "preact/hooks";

// Code-splitting is automated for `routes` directory
import Home from '../routes/home';

const connection = io('http://localhost:9005', {
    transports: ['websocket'],
});
const [members, setMembers] = useState<string[]>([]);

// Context
const SocketContext = createContext(connection);
const MemberListContext = createContext({members, setMembers});

const App = () => (
	<div id="app">
        <SocketContext.Provider value={connection}>
            <MemberListContext.Provider value={{members, setMembers}}>
                <Router>
                    <Route path="/" component={Home} />
                    {/* <Route path="/privateChat" component={PrivateChat} /> */}
                </Router>
            </MemberListContext.Provider>
        </SocketContext.Provider>
    </div>
);

export default App;
export {SocketContext, MemberListContext}