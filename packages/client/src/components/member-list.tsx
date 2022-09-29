import { h } from 'preact';
import { useContext, useState } from "preact/hooks";
import { Socket } from "socket.io-client";
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
            <div>
                <h1>Members</h1>
                <ul>{renderMembers()}</ul>
            </div>
        );
    }

    return render();
}

export default MemberList