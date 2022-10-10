import { h } from 'preact';
import { useState, useContext, useEffect } from 'preact/hooks';
import { SocketContext } from '../pages/App';

interface Props {
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

    const incomingMessage = (message : string, sender : string, receiver : string) => {
        if (receiver == sender) {
            return;
        } else {
            setMessages(m => [...m, {payload : message, own : false}]);
        }
    }

    useEffect(() => {
        if (props.ownName != "") {
            socket.on('globalBroadcast', (msg : {message : string, sender : string}) => {
                incomingMessage(msg.message, msg.sender, props.ownName);
            });
        }
    }, [props.ownName]);

    
    // render
    const renderMessage = () => {
        return (
            <div>
                {messages.map((message, index) => {
                    return <div key={index}>{message.payload}</div>;
                })}
            </div>
        )
    }

    const render = () => {

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

