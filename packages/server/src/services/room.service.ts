type Member = {
    id: string;
    rtc?: any;
}

class RoomService {

    private members: Member[];

    constructor() {
        this.members = [];
    }

    // Add a peer to the waiting room
    public join(peer: Member) {

        // Check if the peer is already in the waiting room
        const isAlreadyInWaitingRoom = this.members.some((p) => p.id === peer.id);

        console.log(`Peer ${peer.id} is already in the waiting room: ${isAlreadyInWaitingRoom}`);


        if (isAlreadyInWaitingRoom) return;

        this.members.push(peer);
    }

    // Remove a peer from the waiting room
    public leave(peer: Member) {
        this.members = this.members.filter((p) => p.id !== peer.id);
    }

    // Get the waiting room
    public getMembers() {
        return this.members;
    }

    public shout(message: string) {
        // Send message via webRTC data channel to all members in the room
        for (const member of this.members) {
            // Send message to member
        }
    }
}

export default RoomService;