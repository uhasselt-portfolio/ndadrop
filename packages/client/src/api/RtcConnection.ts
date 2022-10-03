import io, { Socket } from 'socket.io-client';

const blobToBase64 = (blob : any) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = function () {
        resolve(reader.result);
      };
    });
  };

type FileMessage = {
    data: string;
}

// TODO: FILETRANSFER
// it looks like all the chunks are being transfered, but the file is not being reconstructed
// a text file is empty and a jpg file is corrupted. Not sure if it's not transferring correctly (although if i print the data is looks identical to the original)
// So i think it's not being reconstructed correctly

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
    public onGetFile = (file: File) => {}

    // datachannels
    private dataChannel : RTCDataChannel | undefined;
    private textChannel : RTCDataChannel | undefined;

    // file exchange
    private sendingFile : boolean = false;
    private file : File | undefined;
    private maxChunkSize : number = 16384;
    private fileSize_received = 0;
    private fileName_received = "";
    private fileChunks_received : string[] = [];
    private waitingForFileSize : boolean = false;
    private waitingForFile : boolean = false;


    // datachannelfuntions
    sendMessageThroughDataChannel(msg : string) {
        this.textChannel?.send(msg);
    }
    onReadAsDataURL(event : ProgressEvent<FileReader> | null, text : any) {
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
            console.log("sending file", event);
            // this.dataChannel.send(fileName);
            let fileSize = text.length;
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
        return

        this.sendingFile = true;
        this.file = file;

        console.log("sending file", file);

        // we can't send the file directly, we have to split it into chunks
        // and send them one by one

        // steps:
        // 1. calculate the size of the file
        // 2. send the size of the file
        // 3. send the file in chunks
        // 4. when all chunks are sent, send a message that the file is sent
        // 5. receiver checks if all the chunks are received and sends a response

        let fileSize = file.size;

        // send a message to the receiver that we are sending a file
        this.dataChannel?.send('FileIncoming');
        
        this.dataChannel?.send(fileSize.toString());

        let curChunk = 0;
        while ((curChunk * this.maxChunkSize) < fileSize) {
            console.log("sending chunk", curChunk);
            let chunk = file.slice(curChunk * this.maxChunkSize, (curChunk + 1) * this.maxChunkSize);
            console.log("chunk", chunk);
            const b64 = await blobToBase64(chunk);
            const jsonData = JSON.stringify({blob: b64}); 
            // let jsonData = JSON.stringify(chunk);
            console.log("sending chunk", jsonData);
            this.dataChannel?.send(jsonData); 
            curChunk++;
        }

        this.dataChannel?.send('fileSent');

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

            // determine filetype from filename
            let fileType = this.fileName_received.split('.').pop();
            
            const arrayBuffer : ArrayBuffer = new ArrayBuffer(this.fileSize_received);
            const blob = new Blob( [ arrayBuffer ]);	
            const objectURL = URL.createObjectURL( blob );
            console.log("completed", blob, objectURL);

            // create a file from the blob
            // TODO
            let file = new File([blob], this.fileName_received, {lastModified: Date.now()});

            // let file = new File(this.fileChunks_received, "newFile");
            console.log("file received", file);

            // check if the complete file is received
            if (this.fileChunks_received.length * this.maxChunkSize >= this.fileSize_received) {
                // send a message to the other peer that all chunks are received
                this.dataChannel?.send('allChunksReceived');
                this.waitingForFile = false;
                this.onGetFile(file);
            } else {
                // if not, send a message that there was a dataerror
                this.dataChannel?.send('dataerror');
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
            console.log(event.data)
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
            // this.dataChannel.onopen = this.handleDataChannelStatusChange;
            // this.dataChannel.onopen = (event :  Event) => {
            //     if (this.dataChannel) {

            //         var state = this.dataChannel.readyState;

            //         if (state === "open") {
            //             console.log("dataChannel open");
            //         } else {
            //             console.log("dataChannel closed");
            //         }
            //     }
            // }
            // this.dataChannel.onclose = (event :  Event) => {
            //     if (this.dataChannel) {

            //         var state = this.dataChannel.readyState;

            //         if (state === "open") {
            //             console.log("dataChannel open");
            //         } else {
            //             console.log("dataChannel closed");
            //         }
            //     }
            // };
          } else {
            this.pc.ondatachannel = (event : RTCDataChannelEvent) => {
                if (event.channel.label === "datachannel") {
                    this.dataChannel = event.channel;
                    this.dataChannel.binaryType = "arraybuffer";
                    this.dataChannel.onmessage = (event :  MessageEvent<any>) => {
                        this.receiveThroughDataChannel(event);
                    };
                } else if (event.channel.label === "textchannel") {
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
        // Make a http request to /room/askRTXPermission
        socket.emit('askRTCPermission', {peer : member, msg : 'content (mayby say the kind of connection it wants'});
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