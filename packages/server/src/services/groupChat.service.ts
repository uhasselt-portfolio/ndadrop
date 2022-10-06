import GroupChat, {Member} from "./groupChat";

class GroupChatService {

    private groupChats: GroupChat[];

    constructor() {
        this.groupChats = [];
    }

    public createGroupChat(name : string) {
        const groupChat = new GroupChat(name);
        this.groupChats.push(groupChat);
        return groupChat.getId();
    }

    public joinGroupChat(groupID : string, member : Member) {
        const groupChat = this.groupChats.find((groupChat) => groupChat.getId() === groupID);
        if (groupChat) {
            groupChat.addMember(member);
            // TODO : setup webrtc
        }
    }

    public leaveGroupChat(groupID : string, member : Member) {
        // get group chat
        const groupChat = this.groupChats.find((groupChat) => groupChat.getId() === groupID);
        if (! groupChat) return;

        // TODO : remove webrtc

        // get members
        const members = groupChat.getMembers();

        // remove the sender from the list
        const remainingMembers = members.filter((member) => member.id !== member.id);

        // if there are no members left, delete the group chat
        if (remainingMembers.length === 0) {
            this.groupChats = this.groupChats.filter((groupChat) => groupChat.getId() !== groupID);
        }
    }

    public onGroupChatMessage(groupID : string, message : string, sender : Member) {
        // get group chat
        const groupChat = this.groupChats.find((groupChat) => groupChat.getId() === groupID);
        if (! groupChat) return;

        // get members
        const members = groupChat.getMembers();
        // remove the sender from the list
        const receivers = members.filter((member) => member.id !== sender.id);

        // send message to all members
        receivers.forEach((receiver) => {
            receiver.rtc.sendMessage(message);
        });
    }

    public onGroupChatFile(groupID : string, file : any, sender : Member) {
        // get group chat
        const groupChat = this.groupChats.find((groupChat) => groupChat.getId() === groupID);
        if (! groupChat) return;

        // get members
        const members = groupChat.getMembers();
        // remove the sender from the list
        const receivers = members.filter((member) => member.id !== sender.id);

        // send message to all members
        receivers.forEach((receiver) => {
            receiver.rtc.sendFile(file);
        });
    }

    public getGroupChat(groupName : string) {
        return this.groupChats.find((groupChat) => groupChat.getName() === groupName)?.getId();
    }
}

export default GroupChatService;