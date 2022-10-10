import clsx from 'clsx';
import { Phone, Send } from 'lucide-preact';
import { h } from 'preact';
import { useState, useContext, useEffect } from 'preact/hooks';
import { SocketContext } from '../pages/App';
import Button from './Button';

interface Props {
    ownName: string;
    onDirectChatClick: (name: string, video: boolean) => void;
}

type Message = {
	payload: string
    own : boolean,
    sender: string,
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

        if (message.length == 0) return;

        socket.emit('globalMessage', newMessage);
		setMessages(m => [...m, {payload : message, own : true, sender : props.ownName}]);
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
            setMessages(m => [...m, {payload : message, own : false, sender : sender}]);
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
            <div class='flex flex-col gap-2'>
                {messages.map((message, index) => {
                    const sender = message.own ? 'You' : message.sender;

                    const style = clsx("p-2 rounded-lg flex flex-row w-full",
                        message.own ? "bg-blue-200" : "bg-gray-200");

                    const button = message.own ? null : <Button size='sm' type='glow' onClick={() => props.onDirectChatClick(sender, false)}>
                        <Phone color="black" size={16}/>
                    </Button>;

                    return <div class={style} key={index}>
                        <div class='w-full'>
                            <div class='text-sm italic text-gray-500'>{sender}</div>
                            <div>{message.payload}</div>
                        </div>
                        <div class='flex items-center justify-end w-min'>
                            {button}
                        </div>
                    </div>;
                })}
            </div>
        )
    }

    const render = () => {

        return (
            <div class='flex flex-col gap-2 bg-white p-7 w-[350px] rounded-lg shadow-sm'>
                {renderMessage()}
                <div class='flex flex-row gap-2 w-full'>
                    <input
                    class=' p-2 bg-slate-100 rounded-lg w-full'
                    placeholder='Type a message'
                    onChange={(e) => onTyping(e)}
                    onKeyUp={(e) => e.key == 'Enter' && onChatSend(e)}
                    value={message}
                    type="text"
                    />
                    <button class='p-2 bg-black rounded-lg text-white' onClick={onChatSend}>
                        <Send color="white" size={16}/>
                    </button>
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

