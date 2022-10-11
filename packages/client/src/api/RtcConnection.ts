import io, { Socket } from 'socket.io-client';

type FileMessage = {
    data: string;
}

interface Props {
    ownName: string;
    onDirectChatClick: (name: string, video : boolean) => void;
}

class RtcConnection {

    pcConfig : RTCConfiguration = {"iceServers": [{urls: "stun:stun.l.google.com:19302"}]};
    pc : RTCPeerConnection = new RTCPeerConnection(this.pcConfig);

    private localStream : MediaStream | undefined;
    private remoteStream : MediaStream | undefined;

    public videoCall : boolean = false;
    private isCaller : boolean = false;

    private iceCandidates : RTCIceCandidate[] = [];

    // Handler
    public onLocalStreamSet = (stream : MediaStream) => {}
    public onRemoteStreamSet = (stream : MediaStream) => {}
    public onGetMessage = (name: string) => {}
    public onGetFile = (file: string, fileName : string) => {}
    public onCloseCall = () => {}

    // datachannels
    private dataChannel : RTCDataChannel | undefined;
    private textChannel : RTCDataChannel | undefined;

    // file exchange
    private sendingFile : boolean = false;
    private file : File | undefined;
    private maxChunkSize : number = 16384 * 9;
    private fileSize_received = 0;
    private fileName_received = "";
    private fileChunks_received : string[] = [];
    private waitingForFileSize : boolean = false;
    private waitingForFile : boolean = false;

    public constructor(isCaller : boolean) {
        this.isCaller = isCaller;
    }


    // datachannelfuntions
    sendMessageThroughDataChannel(msg : string) {
        console.log("this.textChannel", this.textChannel);
        this.textChannel?.send(msg);
    }
    onReadAsDataURL(event : ProgressEvent<FileReader> | null, text : any) {
        // we can't send the file directly, we have to split it into chunks
        // and send them one by one

        // steps:
        // 1. calculate the size of the file
        // 2. send the size of the file
        // 3. send the file in chunks
        // 4. when all chunks are sent, send a message that the file is sent
        // 5. receiver checks if all the chunks are received and sends a response
        if (! this.dataChannel)
            return;

        this.sendingFile = true;
        // this.file = file;

        let fileMessage : FileMessage = {data : ""}; // data object to transmit over data channel

        if (event && event.target) {
            text = event.target.result; // on first invocation
            // send setup data
            this.dataChannel.send('FileIncoming');
            let fileName = "temp";
            if (this.file)
                fileName = this.file.name;
            // this.dataChannel.send(fileName);
            let fileSize = text.length;
            // calculate the size of the file in bytes
            this.dataChannel.send(JSON.stringify({size : fileSize.toString(), name : fileName}));
        }


        if (text.length > this.maxChunkSize) {
            fileMessage.data = text.slice(0, this.maxChunkSize); // getting chunk using predefined chunk length
        } else {    // last chunk
            fileMessage.data = text;
            // data.last = true;
        }

        // using JSON.stringify for chrome!
        this.dataChannel?.send(JSON.stringify(fileMessage));

        var remainingDataURL = text.slice(fileMessage.data.length);
        if (remainingDataURL.length) {
            setTimeout(() => {
                this.onReadAsDataURL(null, remainingDataURL); // continue transmitting
            }, 500)
        } else {
            this.dataChannel.send('fileSent');
        }
    }

    async sendFileThroughDataChannel(file : File) {
        if (! this.dataChannel)
            return;

        this.file = file;
        let reader = new window.FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event : ProgressEvent<FileReader> | null) => {this.onReadAsDataURL(event, "")};
    }

    receiveThroughDataChannel(event : MessageEvent) {
        // check if we are sending a file
        // we could be sending and receiving at the same time, so we have to check
        if (this.sendingFile) {
            // if we are sending a file, we have to check if the message is the indicator that the file is sent
            if (event.data == 'allChunksReceived') {
                // we can stop sending the file
                this.sendingFile = false;
                this.file = undefined;
            } else if (event.data == 'dataerror') {
                console.log("non correct data received");
                // if we get a dataerror, we have to resend the file
                // this.sendFileThroughDataChannel(this.file!);
            }
        }

        // check if it is the endindicator of a file
        if (event.data == 'fileSent') {
            // recreate the file
            let temp : string = this.fileChunks_received.join('');

            // check if the complete file is received
            if (this.fileChunks_received.length * this.maxChunkSize >= this.fileSize_received) {
                // send a message to the other peer that all chunks are received
                this.dataChannel?.send('allChunksReceived');
                this.waitingForFile = false;
                this.onGetFile(temp, this.fileName_received);
                this.fileChunks_received = [];
            } else {
                // if not, send a message that there was a dataerror
                this.dataChannel?.send('dataerror');
                this.fileChunks_received = [];
            }
            return;
        }

        // check if the other party is willing to send a file
        if (event.data == 'FileIncoming') {
            this.waitingForFileSize = true;
            return;
        }

        // if we are waiting for the filesize, we have to check if the message is a number
        if (this.waitingForFileSize) {
            let temp = JSON.parse(event.data);
            this.fileSize_received = temp.size;
            this.fileName_received = temp.name;
            this.waitingForFileSize = false;
            this.waitingForFile = true;
            return;
        }

        // if we are waiting for a file, receive it
        if (this.waitingForFile) {
            let chunk : FileMessage = JSON.parse(event.data);
            // add received chunk to the array
            this.fileChunks_received.push(chunk.data);
            return;
        }
    }

    async createPeerConnection(socket : Socket, peer : any, hascameraacces : boolean = true) {
        console.log("creating peer connction\n");
        this.pc = new RTCPeerConnection(this.pcConfig);
        this.remoteStream = new MediaStream();
        this.onRemoteStreamSet(this.remoteStream);
        // add remote stream to video element

        this.pc.addEventListener('connectionstatechange', (event) => {
            console.log('connection connectionstatechange event: ', this.pc.connectionState);

        });

        // add local stream related stuff, when it's a video chat
        if (this.videoCall) {
            console.log("creating video", hascameraacces)
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
                console.log("pc ontrack")
                this.remoteStream = event.streams[0];
                this.onRemoteStreamSet(this.remoteStream);
                // event.streams[0].getTracks().forEach((track) => {
                //     if (this.remoteStream)
                //         this.remoteStream.addTrack(track)
                // })
            }
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
        if (this.isCaller) {
            console.log("creating data channels");
            this.dataChannel = this.pc.createDataChannel("datachannel");
            this.dataChannel.binaryType = "arraybuffer";
            this.textChannel = this.pc.createDataChannel("textchannel");
            // when these are not array functions, but member functions of rtcConnection, they don't work
            // in the browser, when running the this object inside the member functions is a RTCChannel object,
            // but when writing and compiling the code it thinks it is a rtcConnection object
            this.dataChannel.onmessage = (event :  MessageEvent<any>) => {
                this.receiveThroughDataChannel(event);
            }
            this.textChannel.onmessage = (event :  MessageEvent<any>) => {
                this.onGetMessage(event.data);
            }
            this.textChannel.onopen = () => {
                console.log("textchannel open")
            }
          } else {
            this.pc.ondatachannel = (event : RTCDataChannelEvent) => {
                if (event.channel.label === "datachannel") {
                    this.dataChannel = event.channel;
                    this.dataChannel.binaryType = "arraybuffer";
                    this.dataChannel.onmessage = (event :  MessageEvent<any>) => {
                        this.receiveThroughDataChannel(event);
                    };
                } else if (event.channel.label === "textchannel") {
                    console.log("event", event);

                    this.textChannel = event.channel;
                    this.textChannel.onmessage = (event :  MessageEvent<any>) => {
                        this.onGetMessage(event.data);
                    };
                }
            }
          }
    }

    // ask for permission to start a connection with the receiving peer via the server
    public async askForPermission(member : any, socket : any) {   //TODO : FIX any
        socket.emit('askRTCPermission', {peer : member, msg : 'content (mayby say the kind of connection it wants', videoCall : this.videoCall});
    }

    // receive a permission request from another peer via the server
    public async receivePermissionQuestion(msg: any, socket : any, accept: boolean) { //TODO : FIX any
        // check if we want to accept the connection
        const peer = msg.peer;

        // if yes, send a permission answer to the server
        socket.emit('permissionAnswer', {peer : peer, accept : accept});
    }

    // Send SDP offer to the peer
    public async SendSDP(socket : any, peer : any) { //TODO : FIX any
        await this.createPeerConnection(socket, peer);


        let offer = await this.pc.createOffer();
        try {
            await this.pc.setLocalDescription(offer);
        } catch (e) {
            console.log("Couldn't set Local Description", e);
        }
        
        // send offer to peer
        console.log("##1 sending offer", offer);
        socket.emit('sdpOffer', {offer, peer});

        return
    }

    // Send SDP answer to the peer
    public async sendSDPAnswer(socket : any, remoteOffer : {peer : any, offer : RTCSessionDescription}) { //TODO : FIX any
        await this.createPeerConnection(socket, remoteOffer.peer);

        console.log(" before sending sdp answer", remoteOffer.offer)
        try {
            await this.pc.setRemoteDescription(remoteOffer.offer);
            // add all the saved ice candidates
            for (let candidate of this.iceCandidates) {
                await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (e) {
            console.log("Couldn't set remote Description", e);
        }

        console.log("hey",this.pc.remoteDescription);
        
        let tempAnswer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(tempAnswer);

        console.log("##2 sending answer", tempAnswer)

        // send answer to peer
        socket.emit('sdpAnswer', {answer : tempAnswer, peer : remoteOffer.peer});

        return
    }

    public async handleSdpAnswer(socket : any, msg : {peer : any, answer : RTCSessionDescription}) {
        console.log("##3 handleSdpAnswer", msg)
        if (! this.pc.currentRemoteDescription) {
            await this.pc.setRemoteDescription(msg.answer);
            // add all the saved ice candidates
            for (let candidate of this.iceCandidates) {
                await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        }

        return
    }

    // receive an ice candidate from a peer
    public async receiveIceCandidate(msg : {iceCandidate : RTCIceCandidate, peer : any}) {
        console.log("##1.5 receiveIceCandidate", msg, this.pc.remoteDescription);
        if (!this.pc.remoteDescription) {
            console.log("saving ice candidate")
            this.iceCandidates.push(msg.iceCandidate);
        } else {
            if (msg.iceCandidate) {
                try {
                    await this.pc.addIceCandidate(msg.iceCandidate);
                } catch (e) {
                    console.error('Error adding received ice candidate', e);
                }
            }
        }
    }

    public async handleCloseCall() {
        this.localStream?.getTracks().forEach(function(track) {
            track.stop();
          });
    }

    // close a connection with a peer
    public async closeConnection() {
        //TODO
        this.localStream?.getTracks().forEach(function(track) {
            track.stop();
          });
    }

}

export default RtcConnection;