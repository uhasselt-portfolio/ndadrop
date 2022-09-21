import { randomUUID } from "crypto";

type Member = {
    id: string;
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
    public join(peer: Member) {

        // Check if the peer is already in the waiting room
        const isAlreadyInWaitingRoom = this.members.some((p) => p.id === peer.id);

        if (isAlreadyInWaitingRoom) return;

        console.log("Peer joined the room");

        this.members.push(peer);
    }

    // Remove a peer from the waiting room
    public leave(peer: Member) {
        console.log("Peer left the room");
        this.members = this.members.filter((p) => p.id !== peer.id);
    }

    // Get the waiting room
    public getMembers() {
        return this.members;
    }

    public getRoomId() {
        return this.roomId;
    }
}

export default RoomService;