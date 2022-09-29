import { h } from 'preact';
import { Route, Router } from 'preact-router';

// Code-splitting is automated for `routes` directory
import Home from '../routes/home';
import PrivateChat from './privateChat';

const App = () => (
	<div id="app">
        <Router>
            <Route path="/" component={Home} />
            {/* <Route path="/privateChat" component={PrivateChat} /> */}   
        </Router>
    </div>
);

export default App;