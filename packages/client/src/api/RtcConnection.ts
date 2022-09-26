import io, { Socket } from 'socket.io-client';

class RtcConnection {

    pcConfig : RTCConfiguration = {"iceServers": [{urls: "stun:stun.l.google.com:19302"}]}
    pc : RTCPeerConnection = new RTCPeerConnection(this.pcConfig);
    localStream : MediaStream | undefined;
    remoteStream : MediaStream | undefined;

    async createPeerConnection(socket : Socket, peer : any) {
        this.pc = new RTCPeerConnection();
        this.remoteStream = new MediaStream();
        // add remote stream to video element

        if (!this.localStream) {
            this.localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:false})
            // add local stream to video element
        }

        this.localStream.getTracks().forEach((track) => {
            if (this.localStream)
                this.pc.addTrack(track, this.localStream)
        })

        this.pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                if (this.remoteStream)
                    this.remoteStream.addTrack(track)
            })
        }

        this.pc.onicecandidate = async (event) => {
            if(event.candidate){
                // send ice candidate to other peer
                console.log("sending ice candidate");
                console.log(event.candidate);
                if (event.candidate != null) {
                    socket.emit('icecandidate', {iceCandidate: event.candidate, peer : peer});
                }
            }
        }

    }

    // ask for permission to start a connection with the receiving peer via the server
    public async askForPermission(member : any, socket : any) {   //TODO : FIX any
        console.log("Asking for permission");
        // Make a http request to /room/askRTXPermission
        socket.emit('askRTCPermission', {peer : member, msg : 'content (mayby say the kind of connection it wants'});

    }

    // receive a permission request from another peer via the server
    public async receivePermissionQuestion(msg: any, socket : any) { //TODO : FIX any
        // check if we want to accept the connection
        const peer = msg.peer;

        const accept = true;
        // if yes, send a permission answer to the server
        socket.emit('permissionAnswer', {peer : peer, accept :true});

    }

    // Send SDP offer to the peer
    public async SendSDP(socket : any, peer : any) { //TODO : FIX any
        await this.createPeerConnection(socket, peer);

        let offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);

        // send offer to peer
        socket.emit('sdpOffer', {offer, peer});

        return
    }

    // Send SDP answer to the peer
    public async sendSDPAnswer(socket : any, remoteOffer : {peer : any, offer : RTCSessionDescription}) { //TODO : FIX any
        await this.createPeerConnection(socket, remoteOffer.peer);

        await this.pc.setRemoteDescription(remoteOffer.offer);

        let tempAnswer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(tempAnswer);

        // send answer to peer
        socket.emit('sdpAnswer', {answer : tempAnswer, peer : remoteOffer.peer});


        return
    }

    public async handleSdpAnswer(socket : any, msg : {peer : any, answer : RTCSessionDescription}) {
        console.log("handleSdpAnswer");
        if (! this.pc.currentRemoteDescription) {
            await this.pc.setRemoteDescription(msg.answer);
        }

        return
    }

    // receive an ice candidate from a peer
    public async receiveIceCandidate(msg : {iceCandidate : RTCIceCandidate, peer : any}) {
        console.log("receiveIceCandidate");
        console.log(msg)
        if (msg.iceCandidate) {
            try {
                await this.pc.addIceCandidate(msg.iceCandidate);
            } catch (e) {
                console.error('Error adding received ice candidate', e);
            }
        }
    }

    // close a connection with a peer
    public async closeConnection() {

    }

    public async sendMsg(msg: string) {

    }
}

export default RtcConnection;