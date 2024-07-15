import { socket } from "@/socket.mjs";

export interface RTCManagerConfigs {
    roomName: string;
};

export interface Client {
    id: string;
    peerConnection: RTCPeerConnection;
    dataChannel?: RTCDataChannel;
};

export class RTCManager extends EventTarget {
    private configs: RTCManagerConfigs;
    private clients: { [id: string]: Client } = {};

    constructor(configs: RTCManagerConfigs) {
        super();

        this.configs = configs;

        this.getClientsInRoomResult = this.getClientsInRoomResult.bind(this);
        this.answer = this.answer.bind(this);
        this.offer = this.offer.bind(this);
        this.iceCandidate = this.iceCandidate.bind(this);

        socket.on('getClientsInRoomResult', this.getClientsInRoomResult);
        socket.on('answer', this.answer);
        socket.on('offer', this.offer);
        socket.on('iceCandidate', this.iceCandidate);

        socket.emit('getClientsInRoom', { roomName: this.configs.roomName });
    }

    private createRTCPeerConnection() {
        return new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    }

    private async createOfferForLocalDescription(peerConnection: RTCPeerConnection) {
        const offer = await peerConnection.createOffer({ offerToReceiveAudio: true });
        await peerConnection.setLocalDescription(offer);

        return offer;
    }

    private async createAnswerForLocalDescription(peerConnection: RTCPeerConnection) {
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        return answer;
    }

    private setDataChannelForClient(clientId: string, dataChannel?: RTCDataChannel) {
        const client = this.clients[clientId];

        if (!client || client.dataChannel) return;

        const newDataChannel = dataChannel ?? client.peerConnection.createDataChannel('controller');
        client.dataChannel = newDataChannel;
        this.registerDataChannelEventsForClient(clientId);
    }

    private registerDataChannelEventsForClient(clientId: string) {
        const client = this.clients[clientId];

        if (!client || !client.dataChannel) return;

        client.dataChannel.addEventListener('open', event => {
            console.log(`WebRTC: data channel opened for client ${clientId}`);

            this.dispatchEvent(new CustomEvent('dataChannelOpen', { detail: { clientId } }));
        });

        client.dataChannel.addEventListener('message', event => {
            console.log(`WebRTC: data channel message for client ${clientId}, message: ${event.data}`);
        });

        client.dataChannel.addEventListener('closing', event => {
            console.log(`WebRTC: data channel closing for client ${clientId}`);
        });

        client.dataChannel.addEventListener('error', event => {
            console.log(`WebRTC: data channel error for client ${clientId}`);
        });
    }

    private async getClientsInRoomResult(clients: { id: string, data: any }[]) {
        for (const client of clients) {
            if (this.clients[client.id]) continue;

            const peerConnection = this.createRTCPeerConnection();
            this.clients[client.id] = { id: client.id, peerConnection };
            this.setDataChannelForClient(client.id);

            this.registerPeerConnectionEventsForClient(client.id, peerConnection);
            const offer = await this.createOfferForLocalDescription(peerConnection);
            socket.emit('offer', { clientId: client.id, offer });
        }
    }

    private async answer({ clientId, answer }: { clientId: string, answer: RTCSessionDescriptionInit }) {
        if (!this.clients[clientId]) return;

        const remoteDesc = new RTCSessionDescription(answer);
        await this.clients[clientId].peerConnection.setRemoteDescription(remoteDesc);
    }

    private async offer({ clientId, offer }: { clientId: string, offer: RTCSessionDescriptionInit }) {
        if (this.clients[clientId]) {
            this.clients[clientId].peerConnection.close();
        }

        const peerConnection = this.createRTCPeerConnection();
        this.clients[clientId] = { id: clientId, peerConnection };
        this.registerPeerConnectionEventsForClient(clientId, peerConnection);
        await peerConnection.setRemoteDescription(offer);
        const answer = await this.createAnswerForLocalDescription(peerConnection);
        socket.emit('answer', { clientId, answer });
    }

    private async iceCandidate({ clientId, candidate }: { clientId: string, candidate: RTCIceCandidate }) {
        const rtcClient = this.clients[clientId];

        if (!rtcClient) {
            return;
        }

        await rtcClient.peerConnection.addIceCandidate(candidate);
    };

    private registerPeerConnectionEventsForClient(clientId: string, peerConnection: RTCPeerConnection) {
        const client = this.clients[clientId];

        peerConnection.addEventListener('icecandidate', event => {
            if (!event.candidate) return;

            socket.emit('iceCandidate', { clientId, candidate: event.candidate });
        });

        peerConnection.addEventListener('datachannel', event => {
            if (!event.channel) return;

            this.setDataChannelForClient(clientId, event.channel);
        });

        peerConnection.addEventListener('connectionstatechange', event => {
            console.log(`WebRTC: connection state changed for client: ${clientId}, new state: ${peerConnection.connectionState}`);
        });
    }

    getClient(id: string) {
        return this.clients[id];
    }

    sendDataChannelMessageAll(message: any) {
        for (const clientId of Object.keys(this.clients)) {
            const client = this.clients[clientId];

            if (!client.dataChannel) continue;

            client.dataChannel.send(message);
        }
    }
}
