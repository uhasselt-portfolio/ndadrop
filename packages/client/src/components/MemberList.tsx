import { h } from 'preact';
import { useContext, useState } from "preact/hooks";
import { MemberListContext, SocketContext } from '../pages/App';
import Button from './Button';
import { Phone, Video } from 'lucide-preact';

interface Props {
    ownName: string;
    onDirectChatClick: (name: string, video : boolean) => void;
}

const MemberList = (props: Props) => {

    // Context
    const socket = useContext(SocketContext);
    const { members, setMembers } = useContext(MemberListContext);

    // State
    // const [members, setMembers] = useState<string[]>([]);

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
                <Button size='sm' type='primary-dark-2' onClick={() => props.onDirectChatClick(member, false)}>
                    <Phone color="white" size={16}/>
                </Button>
                <Button size='sm' type='primary-dark-2' onClick={() => props.onDirectChatClick(member, true)}>
                    <Video color="white" size={16}/>
                </Button>
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