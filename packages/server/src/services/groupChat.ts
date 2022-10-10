import { randomUUID } from "crypto";
import RtcConnection from "./RtcConnection";

type Member = {
    id: string;
    name: string;
    rtc?: any;
    socketId : any;
}

class GroupChat {

    private name : string;
    private members: Member[];
    private id: string;

    constructor(name : string) {
        this.members = [];
        this.id = randomUUID();
        this.name = name;
    }

    public addMember(member: Member) {
        this.members.push(member);
    }

    public getMembers() {
        return this.members;
    }

    public getId() {
        return this.id;
    }

    public getName() {
        return this.name;
    }
}

export default GroupChat;
export {Member};
