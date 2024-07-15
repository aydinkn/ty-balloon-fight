import 'phaser';
import { Client, RTCManager } from '@/app/game/rtcManager';

export interface CharacterController {
    left: () => boolean;
    right: () => boolean;
    flap: () => boolean;
};

export class LocalPlayerController implements CharacterController {
    private inputs: {
        left: Phaser.Input.Keyboard.Key,
        right: Phaser.Input.Keyboard.Key,
        flap: Phaser.Input.Keyboard.Key
    };

    private lastFlap = false;
    private lastLeft = false;
    private lastRight = false;

    constructor(private rtcManager: RTCManager, private scene: Phaser.Scene) {
        this.inputs = {
            left: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            flap: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
        }
    }

    left() {
        const left = this.inputs.left.isDown;

        if (this.lastLeft !== left) {
            this.rtcManager.sendDataChannelMessageAll(JSON.stringify({ left }));
            this.lastLeft = left;
        }

        return left;
    }

    right() {
        const right = this.inputs.right.isDown;

        if (this.lastRight !== right) {
            this.rtcManager.sendDataChannelMessageAll(JSON.stringify({ right }));
            this.lastRight = right;
        }

        return right;
    }

    flap() {
        const flap = Phaser.Input.Keyboard.JustDown(this.inputs.flap);

        if (this.lastFlap !== flap) {
            this.rtcManager.sendDataChannelMessageAll(JSON.stringify({ flap }));
            this.lastFlap = flap;
        }

        return flap;
    }
}

export class RemotePlayerController implements CharacterController {
    private isFlapping = false;
    private isMovingLeft = false;
    private isMovingRight = false;

    constructor(private rtcManager: RTCManager, private client: Client) {
        if (client.dataChannel) {
            client.dataChannel.addEventListener('message', event => {
                const data = JSON.parse(event.data);
                console.log(`RemotePlayerController: received message event`, data);

                if (data.left !== undefined && data.left !== null) {
                    this.isMovingLeft = data.left;
                }

                if (data.right !== undefined && data.right !== null) {
                    this.isMovingRight = data.right;
                }

                if (data.flap !== undefined && data.flap !== null) {
                    this.isFlapping = data.flap;
                }
            });
        }
    }

    left() {
        return this.isMovingLeft;
    }

    right() {
        return this.isMovingRight;
    }

    flap() {
        if (this.isFlapping) {
            this.isFlapping = false;
            return true;
        }

        return this.isFlapping;
    }
}