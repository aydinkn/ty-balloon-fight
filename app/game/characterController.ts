import 'phaser';
import { Client, RTCManager } from '@/app/game/rtcManager';
import { Character, CharacterState } from '@/app/game/character';

interface Vector {
    x: number;
    y: number;
}

interface InputState {
    left?: boolean;
    right?: boolean;
    flap?: boolean;
};

export abstract class CharacterController {
    protected character!: Character;
    protected isOnGround = false;
    protected walkSpeed = 100;
    protected flapAccelerationX = 150;
    protected flapTime = 0;
    protected flapRate = 300;
    protected flapVelocityY = 150;
    protected ceiling: Phaser.GameObjects.GameObject | null;
    protected floor: Phaser.GameObjects.GameObject | null;

    constructor(protected scene: Phaser.Scene) {
        this.floor = scene.children.getByName('floor');
        this.ceiling = scene.children.getByName('ceiling');
    }

    setCharacter(character: Character) {
        this.character = character;
    }

    isOnTheGround() {
        return this.isOnGround;
    }

    protected handleFloorCollision() {
        if (!this.floor) return;

        this.isOnGround = false;

        this.scene.physics.collide(this.character, this.floor, () => {
            this.isOnGround = true;
        });
    }

    protected handleCeilingCollision() {
        if (!this.ceiling) return;

        const balloon = this.character.getBalloon();

        if (!balloon) return;

        const body = this.character.getBody();

        this.scene.physics.collide(balloon, this.ceiling, () => {
            body.setVelocityY(120);
        });
    }

    protected handleLeftMovement() {
        const body = this.character.getBody();
        this.isOnGround ? body.setVelocityX(-this.walkSpeed) : body.setAccelerationX(-this.flapAccelerationX);
    }

    protected handleRightMovement() {
        const body = this.character.getBody();
        this.isOnGround ? body.setVelocityX(this.walkSpeed) : body.setAccelerationX(this.flapAccelerationX);
    }

    protected handleFlapMovement(time: number) {
        const body = this.character.getBody();
        this.flapTime = time + this.flapRate;
        // this.character.getCharacterSprite().setState(CharacterState.flapping);
        body.setVelocityY(-this.flapVelocityY);
    }

    abstract getInputState(): InputState;

    update(time: number, delta: number) {
        if (!this.character) return;

        this.handleFloorCollision();
        this.handleCeilingCollision();

        const body = this.character.getBody();

        // Reset velocity & acceleration
        if (this.isOnGround) {
            body.setVelocityX(0).setAccelerationX(0);
        } else {
            body.setAcceleration(0, 0);
        }
    }
};

export class AuthorityController extends CharacterController {
    private inputs: {
        leftKey: Phaser.Input.Keyboard.Key,
        rightKey: Phaser.Input.Keyboard.Key,
        flapKey: Phaser.Input.Keyboard.Key
    };

    // Replication toggles
    private leftReplToggle = false;
    private rightReplToggle = false;
    private flapReplToggle = false;

    constructor(private rtcManager: RTCManager, scene: Phaser.Scene) {
        super(scene);

        this.inputs = {
            leftKey: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            rightKey: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            flapKey: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
        }
    }

    getInputState(): InputState {
        if (!this.character) return {};

        return {
            left: this.inputs.leftKey.isDown,
            right: this.inputs.rightKey.isDown,
            flap: this.inputs.flapKey.isDown
        };
    }

    private getTransform(): Vector {
        if (!this.character) return { x: 0, y: 0 };

        return { x: parseFloat(this.character.x.toFixed(2)), y: parseFloat(this.character.y.toFixed(2)) };
    }

    private getVelocity(): Vector {
        if (!this.character) return { x: 0, y: 0 };

        const body = this.character.getBody();
        return { x: parseFloat(body.velocity.x.toFixed(2)), y: parseFloat(body.velocity.y.toFixed(2)) }
    }

    private replicateMovement() {
        const transform = this.getTransform();
        const velocity = this.getVelocity();
        const input = this.getInputState();
        const timestamp = performance.timeOrigin + performance.now();
        this.rtcManager.sendDataChannelMessageAll(JSON.stringify({ timestamp, transform, velocity, input }));
    }

    update(time: number, delta: number) {
        super.update(time, delta);

        if (!this.character) return;

        // Left movement
        const isLeftDown = this.inputs.leftKey.isDown;

        if (isLeftDown) {
            this.handleLeftMovement();
        }

        // Left replication
        if (this.leftReplToggle !== isLeftDown) {
            this.leftReplToggle = isLeftDown;
            this.replicateMovement();
        }

        // Right movement
        const isRightDown = this.inputs.rightKey.isDown;

        if (isRightDown) {
            this.handleRightMovement();
        }

        // Right replication
        if (this.rightReplToggle !== isRightDown) {
            this.rightReplToggle = isRightDown;
            this.replicateMovement();
        }

        // Flap movement
        const isFlapDown = this.inputs.flapKey.isDown;

        if (isFlapDown && time > this.flapTime) {
            this.handleFlapMovement(time);
        }

        // Flap replication
        if (this.flapReplToggle !== isFlapDown) {
            this.flapReplToggle = isFlapDown;
            this.replicateMovement();
        }
    }
}

export class SimulatedProxyController extends CharacterController {
    private flap = false;
    private left = false;
    private right = false;
    private lastUpdateTime = 0;

    constructor(private rtcManager: RTCManager, scene: Phaser.Scene, private client: Client) {
        super(scene);

        if (client.dataChannel) {
            client.dataChannel.addEventListener('message', event => {
                const data = JSON.parse(event.data);
                const timestamp = performance.timeOrigin + performance.now();
                const latency = timestamp - data.timestamp;
                console.log(`RemotePlayerController: received message event`, latency, data);

                if (data.input.left !== undefined && data.input.left !== null) {
                    this.left = data.input.left;
                }

                if (data.input.right !== undefined && data.input.right !== null) {
                    this.right = data.input.right;
                }

                if (data.input.flap !== undefined && data.input.flap !== null) {
                    this.flap = data.input.flap;
                }

                // this.correctPosition(data.transform);
                // this.correctPhysics(data.velocity);
                this.lastUpdateTime = timestamp;
            });
        }
    }

    private correctPosition(newPosition: Vector) {
        if (!this.character) return;

        this.character.setPosition(newPosition.x, newPosition.y);
    }

    private correctPhysics(newVelocity: Vector) {
        if (!this.character) return;

        const body = this.character.getBody();
        body.setVelocity(newVelocity.x, newVelocity.y);
    }

    getInputState(): InputState {
        if (!this.character) return {};

        return {
            left: this.left,
            right: this.right,
            flap: this.flap
        };
    }

    update(time: number, delta: number) {
        super.update(time, delta);

        if (!this.character) return;
        // Left movement
        const isLeftDown = this.left;

        if (isLeftDown) {
            this.handleLeftMovement();
        }

        // Right movement
        const isRightDown = this.right;

        if (isRightDown) {
            this.handleRightMovement();
        }

        // Flap movement
        const isFlapDown = this.flap;

        if (isFlapDown && time > this.flapTime) {
            this.handleFlapMovement(time);
        }
    }
}