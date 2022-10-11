import { createContext, h } from 'preact';
import { Route, Router } from 'preact-router';
import { useState } from 'preact/hooks';
import { io } from 'socket.io-client';

// Code-splitting is automated for `routes` directory
import Home from '../routes/home';

type MemberListState = {
    members: string[];
    setMembers: (members: string[]) => void;
}

const connection = io('https://webtech.edm.uhasselt.be:8105', {
// const connection = io('http://localhost:9005', {
    transports: ['websocket'],
});


// Context
const SocketContext = createContext(connection);
const MemberListContext = createContext<MemberListState>({
    members: [],
    setMembers: () => {}
});

const App = () => {

    // State
    const [members, setMembers] = useState<string[]>([]);

	return (
        <div id="app ">
        <SocketContext.Provider value={connection}>
            <MemberListContext.Provider value={{members, setMembers}}>
                <Router>
                    <Route path="/" component={Home} />
                    {/* <Route path="/privateChat" component={PrivateChat} /> */}
                </Router>
            </MemberListContext.Provider>
        </SocketContext.Provider>
    </div>
    )
};

export default App;
export {SocketContext, MemberListContext};
