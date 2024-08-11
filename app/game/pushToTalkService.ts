import 'phaser';

export class PushToTalkService {
    static instance?: PushToTalkService;
    private scene?: Phaser.Scene;
    private localStream?: MediaStream;
    private isMuted = true;

    private constructor() { }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new PushToTalkService();
        }

        return this.instance;
    }

    private async getLocalStream() {
        if (this.localStream) {
            return this.localStream;
        }

        let stream: MediaStream | null = null;

        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: true } });
            this.localStream = stream;
        } catch (error) {
            // TODO: handle the error
        }

        return stream;
    }

    create(scene: Phaser.Scene) {
        if (this.scene) return;

        this.scene = scene;

        if (!this.scene.input.keyboard) return;

        const tKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);

        tKey.on('down', () => {
            this.mute(false);
        });

        tKey.on('up', () => {
            this.mute(true);
        });
    }

    async addLocalStreamAndTracks(peerConnection: RTCPeerConnection) {
        const localStream = await this.getLocalStream();

        if (!localStream) return;

        for (const track of localStream.getAudioTracks()) {
            track.enabled = !this.isMuted;
            peerConnection.addTrack(track, localStream);
        }
    }

    async handleTrackEvent(peerConnection: RTCPeerConnection) {
        peerConnection.addEventListener('track', ({ track, streams }) => {
            const audio = document.createElement('audio');

            audio.onloadedmetadata = () => {
                audio.play();
            };

            track.onunmute = () => {
                if (audio.srcObject) return;

                audio.srcObject = streams[0];
            };
        });
    }

    async mute(mute = true) {
        const localStream = await this.getLocalStream();

        if (!localStream) return;

        for (const track of localStream.getAudioTracks()) {
            track.enabled = mute ? false : true;
        }

        this.isMuted = mute;
    }

    getIsMuted() {
        return this.isMuted;
    }
};
