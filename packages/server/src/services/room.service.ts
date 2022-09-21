import { randomUUID } from "crypto";

type Member = {
    id: string;
    name: string;
    rtc?: any;
}

class RoomService {

    private members: Member[];
    private roomId: string;

    constructor() {
        this.members = [];
        this.roomId = randomUUID();
    }

    // Add a peer to the waiting room
    public join(member: Member) {

        // Check if the peer is already in the waiting room
        const isAlreadyInWaitingRoom = this.members.some((p) => p.id === member.id);

        if (isAlreadyInWaitingRoom) return;

        console.log("Peer joined the room");

        this.members.push(member);
    }

    public leave(memberId: Member['id']) {
        console.log("Peer left the room");
        this.members = this.members.filter((p) => p.id !== memberId);
    }

    // Get a list of member names
    public getMembers() {
        return this.members.map((p) => p.name);
    }

    public getRoomId() {
        return this.roomId;
    }
}

export default RoomService;