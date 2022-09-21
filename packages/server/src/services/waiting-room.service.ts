type Peer = {
    id: string;
}

class WaitingRoomService {

    private waiting: Peer[];

    constructor() {
        this.waiting = [];
    }

    // Add a peer to the waiting room
    public addPeer(peer: Peer) {

        // Check if the peer is already in the waiting room
        const isAlreadyInWaitingRoom = this.waiting.some((p) => p.id === peer.id);

        if (isAlreadyInWaitingRoom) return;

        this.waiting.push(peer);
    }

    // Remove a peer from the waiting room
    public removePeer(peer: Peer) {
        this.waiting = this.waiting.filter((p) => p.id !== peer.id);
    }

    // Get the waiting room
    public getWaiting() {
        return this.waiting;
    }
}

export default WaitingRoomService;