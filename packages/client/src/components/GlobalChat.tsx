import { h } from 'preact';
import { useState, useContext } from 'preact/hooks';
import { SocketContext } from '../pages/App';

interface Props {
    // onDirectChatClick: (name: string) => void;
    ownName: string;
}

type Message = {
	payload: string
    own : boolean,
}

const GlobalChat = (props: Props) => {

    // Context
    const socket = useContext(SocketContext);

    // State
    const [messages, setMessages] = useState<Message[]>([]);
    const [message, setMessage] = useState<string>("");


    // Handlers
    const onChatSend = (e: any) => {
		e.preventDefault();
        const newMessage = {
            message : message,
            sender : props.ownName,
        }
        socket.emit('globalMessage', newMessage);
		setMessages(m => [...m, {payload : message, own : true}]);
		setMessage("");
	}

	const onTyping = (e: any) => {
		e.preventDefault();
		const message = e.target.value;
		setMessage(message);
	}

    const incomingMessage = (message : any, sender : string) => {
        if (props.ownName == sender) {
            return;
        }

        setMessages(m => [...m, {payload : message, own : false}]);

    }

    
    // render
    const renderMessage = () => {
        return (
            <div>
                {messages.map((message, index) => {
                    return <div key={index}>{message}</div>;
                })}
            </div>
        )
    }

    const render = () => {

        socket.on('globalMessage', (message : any, sender : any) => {
            console.log("incoming global message : ", message, "sender : ", sender);
            incomingMessage(message, sender);
        });

        return (
            <div>
                {renderMessage()}
                <div class='flex flex-col gap-2'>
                    <input
                    onChange={(e) => onTyping(e)}
                    value={message}
                    type="text"
                    />
                    <button onClick={onChatSend}>Send</button>
                </div>
            </div>
        )
    }

    return (
        <div>
            {render()}
        </div>
    )

};


export default GlobalChat;

