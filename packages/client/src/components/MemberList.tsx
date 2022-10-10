import { h } from 'preact';
import { useContext, useState } from "preact/hooks";
import { SocketContext } from '../pages/App';
import Button from './Button';

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
    const render = () => {

        socket.on('members', (members: string[]) => {
            setMembers(members);
        });

        // Everyone except yourself
        const filteredMembers = members.filter(member => member !== props.ownName);

        return filteredMembers.map((member) => {
            return <div class='flex flex-row gap-3' key={member}>
                <div>{member}</div>
                <Button size='sm' type='primary-dark-2' onClick={() => props.onDirectChatClick(member)}>Call</Button>
            </div>;
        });
    }

    return (
        <div class='flex flex-col gap-2'>
            {render()}
        </div>
    );
}

export default MemberList