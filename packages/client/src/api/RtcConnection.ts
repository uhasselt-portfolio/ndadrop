import io, { Socket } from 'socket.io-client';

class RtcConnection {

    pcConfig : RTCConfiguration = {"iceServers": [{urls: "stun:stun.l.google.com:19302"}]}
    pc : RTCPeerConnection = new RTCPeerConnection(this.pcConfig);

    private localStream : MediaStream | undefined;
    private remoteStream : MediaStream | undefined;

    // constructor(messagesHandler : (name: string) => void, fileHandler :(name: string) => void) {
    //     this.onGetMessage = messagesHandler;
    //     this.onGetFile = fileHandler;
    // }

    // Handler
    public onLocalStreamSet = (stream : MediaStream) => {}
    public onRemoteStreamSet = (stream : MediaStream) => {}
    public onGetMessage = (name: string) => {}
    public onGetFile = (name: string) => {}

    // datachannels
    private dataChannel : RTCDataChannel | undefined;


    // datachannelfuntions
    sendMessageThroughDataChannel(msg : string) {
        this.dataChannel?.send(msg);
    }

    async createPeerConnection(socket : Socket, peer : any, hascameraacces : boolean = true) {
        this.pc = new RTCPeerConnection(this.pcConfig);
        this.remoteStream = new MediaStream();
        this.onRemoteStreamSet(this.remoteStream);
        // add remote stream to video element

        if (!this.localStream) {
            if (hascameraacces) {
                this.localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:true})
                this.onLocalStreamSet(this.localStream);
            }
        }

        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => {
                if (this.localStream) {
                    this.pc.addTrack(track, this.localStream)
                }
            })
        }

        this.pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                if (this.remoteStream)
                    this.remoteStream.addTrack(track)
            })
        }

        this.pc.onicecandidate = async (event) => {
            if(event.candidate){
                // send ice candidate to other peer
                if (event.candidate != null) {
                    socket.emit('icecandidate', {iceCandidate: event.candidate, peer : peer});
                }
            }
        }

        // test datachannel
        // for testing we use cameraccess
        let isCaller = hascameraacces;
        if (isCaller) {
            this.dataChannel = this.pc.createDataChannel("testChannel");
            // when these are not array functions, but member functions of rtcConnection, they don't work
            // in the browser, when running the this object inside the member functions is a RTCChannel object, 
            // but when writing and compiling the code it thinks it is a rtcConnection object
            this.dataChannel.onmessage = (event :  MessageEvent<any>) => {
                this.onGetMessage(event.data);
            }
            // this.dataChannel.onopen = this.handleDataChannelStatusChange;
            this.dataChannel.onopen = (event :  Event) => {
                if (this.dataChannel) {
            
                    var state = this.dataChannel.readyState;
                
                    if (state === "open") {
                        console.log("dataChannel open");
                    } else {
                        console.log("dataChannel closed");
                    }
                }
            }
            this.dataChannel.onclose = (event :  Event) => {
                if (this.dataChannel) {
            
                    var state = this.dataChannel.readyState;
                
                    if (state === "open") {
                        console.log("dataChannel open");
                    } else {
                        console.log("dataChannel closed");
                    }
                }
            };
          } else {
            this.pc.ondatachannel = (event : RTCDataChannelEvent) => {
                this.dataChannel = event.channel;
                this.dataChannel.onmessage = (event :  MessageEvent<any>) => {
                    this.onGetMessage(event.data);
                };
                this.dataChannel.onopen = (event :  Event) => {
                    if (this.dataChannel) {
                
                        var state = this.dataChannel.readyState;
                    
                        if (state === "open") {
                            console.log("dataChannel open");
                        } else {
                            console.log("dataChannel closed");
                        }
                    }
                };
                this.dataChannel.onclose = (event :  Event) => {
                    if (this.dataChannel) {
                
                        var state = this.dataChannel.readyState;
                    
                        if (state === "open") {
                            console.log("dataChannel open");
                        } else {
                            console.log("dataChannel closed");
                        }
                    }
                };
            }
          }

    }

    // ask for permission to start a connection with the receiving peer via the server
    public async askForPermission(member : any, socket : any) {   //TODO : FIX any
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
        await this.createPeerConnection(socket, remoteOffer.peer, false);


        await this.pc.setRemoteDescription(remoteOffer.offer);

        let tempAnswer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(tempAnswer);

        // send answer to peer
        socket.emit('sdpAnswer', {answer : tempAnswer, peer : remoteOffer.peer});


        return
    }

    public async handleSdpAnswer(socket : any, msg : {peer : any, answer : RTCSessionDescription}) {
        if (! this.pc.currentRemoteDescription) {
            await this.pc.setRemoteDescription(msg.answer);
        }

        return
    }

    // receive an ice candidate from a peer
    public async receiveIceCandidate(msg : {iceCandidate : RTCIceCandidate, peer : any}) {
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
        //TODO
    }

}

export default RtcConnection;