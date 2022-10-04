import { h } from 'preact';
import { useContext, useState } from "preact/hooks";
import { SocketContext } from './app';

interface Props {
    ownName: string;
    onDirectChatClick: (name: string) => void;
}

const MemberList = (props: Props) => {

    // Context
    const socket = useContext(SocketContext);

    // State
    const [members, setMembers] = useState<string[]>([]);

    // Render
    const renderMembers = () => {

        socket.on('members', (members: string[]) => {
            setMembers(members);
        });

        // Everyone except yourself
        const filteredMembers = members.filter(member => member !== props.ownName);

        return filteredMembers.map((member) => {
            return <li>
                <div>{member}</div>
                <button onClick={() => props.onDirectChatClick(member)}>Call</button>
            </li>;
        });
    }

    const render = () => {
        return (
            <div class="flex flex-col bg-white p-7 mx-32 my-8 rounded-lg">
                <div class="flex text-xl justify-center">Friends who're online</div>
                <ul>{renderMembers()}</ul>
            </div>
        );
    }

    return render();
}

export default MemberList