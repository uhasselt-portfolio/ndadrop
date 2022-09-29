import { h } from 'preact';
import { useContext, useState } from "preact/hooks";
import { Socket } from "socket.io-client";
import { SocketContext } from './app';

const MemberList = () => {

    // Context
    const socket = useContext(SocketContext);

    // State
    const [members, setMembers] = useState<string[]>([]);

    // Render
    const renderMembers = () => {

        socket.on('members', (members: string[]) => {
            setMembers(members);
        });

        return members.map((member) => {
            return <li>{member}</li>;
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