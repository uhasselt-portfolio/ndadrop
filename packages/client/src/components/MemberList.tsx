import { h } from 'preact';
import { useContext, useEffect, useState } from "preact/hooks";
import { MemberListContext, SocketContext } from '../pages/App';
import Button from './Button';
import { MessageSquare, Video } from 'lucide-preact';

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

    useEffect(() => {

        socket.on('members', (members: string[]) => {
            setMembers(members);
        });

        return function cleanup() {
            socket.off('mebmers');
        }

    },[]);

    // Render
    const render = () => {



        // Everyone except yourself
        const filteredMembers = members.filter(member => member !== props.ownName);

        return filteredMembers.map((member) => {
            return <div class='flex flex-row gap-3' key={member}>
                <div>{member}</div>
                <Button size='sm' type='primary-dark-2' onClick={() => props.onDirectChatClick(member, false)}>
                    <MessageSquare color="white" size={16}/>
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