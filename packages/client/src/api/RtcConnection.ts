import io, { Socket } from 'socket.io-client';

type Message = {
    type : string,
    candidate: string | null,
    sdpMid : string | null,
    sdpMLineIndex : number | null
}

class RtcConnection {

    pcConfig : RTCConfiguration = {"iceServers": [{urls: "stun:stun.l.google.com:19302"}]}
    pc : any;

    createPeerConnection() {
        this.pc = new RTCPeerConnection();
        this.pc.onicecandidate = (event : RTCPeerConnectionIceEvent) => {
            console.log("ice candidate");
            console.log(event);
            const message : Message = {
                type: 'candidate',
                candidate: '',
                sdpMid: '',
                sdpMLineIndex: 0,
            };
            if (event.candidate) {
                message.candidate = event.candidate.candidate;
                message.sdpMid = event.candidate.sdpMid;
                message.sdpMLineIndex = event.candidate.sdpMLineIndex;
            }

            // signaling.postMessage(message)   => komt er op neer, we zenden gewoon ice informatie naar peer
        };
        this.pc.ontrack = (event : RTCTrackEvent) => {
            //TODO setup tracking gedoe 
        }
        // pc.ontrack = e => remoteVideo.srcObject = e.streams[0];
        // localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    // for testing
    mediaStream : any = new MediaStream();

    public async setupIceListener(socket : any, peer : any) {
        // Listen for local ICE candidates on the local RTCPeerConnection
        // this.pc.addEventListener('icecandidate', (event : any) => {
        //     console.log("sending ice candidate");
        //     if (event.candidate) {
        //         socket.send('icecandidate', {newIceCandidate: event.candidate, peer : peer});
        //     }
        // });
        this.pc.onicecandidate = (event : RTCPeerConnectionIceEvent) => {
            console.log("sending ice candidate");
            console.log(event.candidate);
            if (event.candidate != null) {
                socket.emit('icecandidate', {newIceCandidate: event.candidate, peer : peer});
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

        this.pc = new RTCPeerConnection(this.pcConfig);

        // this.mediaStream = null;

        this.pc.ontrack = (obj : any) => {
    
            console.log("ontack");
            console.log(obj);

            // this.video = document.createElement('video');
            console.log(this.mediaStream);
            if (this.mediaStream == null)
            {
                console.log("creating media stream");
                this.mediaStream = new MediaStream();
                    // this.video.srcObject = mediaStream;
                    // this.video.play();
            }
    
            this.mediaStream.addTrack(obj.track);
        }

        this.setupIceListener(socket, peer);
        // Listen for connectionstatechange on the local RTCPeerConnection
        this.pc.addEventListener('connectionstatechange', (event : any) => {
            if (this.pc.connectionState === 'connected') {
                console.log('connected');
            }
        });
    }

    // Send SDP offer to the peer
    public async SendSDP(socket : any, peer : any) { //TODO : FIX any
        this.pc = new RTCPeerConnection(this.pcConfig);

        this.setupIceListener(socket, peer);
        // Listen for connectionstatechange on the local RTCPeerConnection
        this.pc.addEventListener('connectionstatechange', (event : any) => {
            if (this.pc.connectionState === 'connected') {
                console.log('connected');
            }
        });

        // video from jori's code
        navigator.mediaDevices.getUserMedia({video: true, audio: false}).then((stream) => {
            console.log("Got stream");
            console.log(stream);
    
            // Stream this!
            this.pc.addStream(stream);
    
            this.pc.createOffer().then((offer : any) => {
            
                this.pc.setLocalDescription(offer).then(() => {
                
                    // document.getElementById("offer").value = offer.sdp;
                    console.log("offer: ", offer);
                    socket.emit('sdpOffer', {offer, peer});
    
                }).catch((error : any) => {
                    console.log("Error in setLocalDescription: " + error);
                });
            }).catch((error : any) => {
                console.log("Error in createOffer: " + error);
            });
    
        }).catch((error) => {
    
            console.log("Error in getUserMedia: " + error);
        });

        // const channel = this.pc.createDataChannel("chat");
        // channel.onopen = (event : any) => {
        //     channel.send('Hi you!');
        //     }
        // channel.onmessage = (event : any) => {
        //     console.log(event.data);
        // }

        // let offer : RTCSessionDescription  = await this.pc.createOffer();
        // console.log("offer : ", offer);
        // await this.pc.setLocalDescription(offer);
        // socket.emit('sdpOffer', {offer, peer});
    }

    // Send SDP answer to the peer
    public async sendSDPAnswer(socket : any, remoteOffer : {peer : any, offer : RTCSessionDescription}) { //TODO : FIX any
        this.pc.setRemoteDescription(remoteOffer.offer);

        this.pc.ondatachannel = (event : any) => {
            const channel = event.channel;
                channel.onopen = (event : any) => {
                channel.send('Hi back!');
            }
            channel.onmessage = (event : any) => {
                console.log(event.data);
            }
        }

        let answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        socket.emit('sdpAnswer', {answer : answer, peer: remoteOffer.peer});
    }

    public async handleSdpAnswer(socket : any, msg : {peer : any, answer : RTCSessionDescription}) {
        console.log("handleSdpAnswer");
        const remoteDesc = new RTCSessionDescription(msg.answer);
        await this.pc.setRemoteDescription(remoteDesc);
    }

    // receive an ice candidate from a peer
    public async receiveIceCandidate(msg : {iceCandidate : RTCIceCandidate, peer : any}) {
        console.log("receiveIceCandidate");
        console.log(msg)
        if (msg.iceCandidate) {
            try {
                await this.pc.addIceCandidate(msg.iceCandidate.candidate);
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