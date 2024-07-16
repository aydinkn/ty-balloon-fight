import 'phaser';
import { Client, RTCManager } from '@/app/game/rtcManager';
import { Character, CharacterState } from '@/app/game/character';

interface Vector {
    x: number;
    y: number;
}

interface InputState {
    left: boolean;
    right: boolean;
    flap: boolean;
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
        this.character.setLeftFacing();
        const body = this.character.getBody();
        this.isOnGround ? body.setVelocityX(-this.walkSpeed) : body.setAccelerationX(-this.flapAccelerationX);
    }

    protected handleRightMovement() {
        this.character.setRightFacing();
        const body = this.character.getBody();
        this.isOnGround ? body.setVelocityX(this.walkSpeed) : body.setAccelerationX(this.flapAccelerationX);
    }

    protected handleFlapMovement(time: number) {
        this.flapTime = time + this.flapRate;
        this.character.setState(CharacterState.flapping);
        const body = this.character.getBody();
        body.setVelocityY(-this.flapVelocityY);
    }

    protected resetVelocityAcceleration() {
        const body = this.character.getBody();

        if (this.isOnGround) {
            body.setVelocityX(0).setAccelerationX(0);
        } else {
            body.setAcceleration(0, 0);
        }
    }

    protected handleIdlingWalkingState() {
        const body = this.character.getBody();
        const hasXVelocity = Math.abs(body.velocity.x) > 1;
        const hasYVelocity = Math.abs(body.velocity.y) > 1;

        if ((this.character.state !== CharacterState.idling)
            && this.isOnGround && !hasXVelocity && !hasYVelocity) {
            this.character.setState(CharacterState.idling);
        }

        if ((this.character.state !== CharacterState.walking)
            && this.isOnGround && hasXVelocity && !hasYVelocity) {
            this.character.setState(CharacterState.walking);
        }
    }

    abstract getInputState(): InputState;

    setCharacter(character: Character) {
        this.character = character;
    }

    isOnTheGround() {
        return this.isOnGround;
    }

    private handleMovement(time: number) {
        const { left, right, flap } = this.getInputState();

        if (left) {
            this.handleLeftMovement();
        }

        if (right) {
            this.handleRightMovement();
        }

        if (flap && time > this.flapTime) {
            this.handleFlapMovement(time);
        }
    }

    update(time: number, delta: number) {
        if (!this.character) return;

        this.handleFloorCollision();
        this.handleCeilingCollision();
        this.resetVelocityAcceleration();
        this.handleMovement(time);
        this.handleIdlingWalkingState();
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
        if (!this.character) return { left: false, right: false, flap: false };

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

        const { left, right, flap } = this.getInputState();

        if (this.leftReplToggle !== left) {
            this.leftReplToggle = left;
            this.replicateMovement();
        }

        if (this.rightReplToggle !== right) {
            this.rightReplToggle = right;
            this.replicateMovement();
        }

        if (this.flapReplToggle !== flap) {
            this.flapReplToggle = flap;
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

                this.left = data.input.left;
                this.right = data.input.right;
                this.flap = data.input.flap;

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
        if (!this.character) return { left: false, right: false, flap: false };

        return {
            left: this.left,
            right: this.right,
            flap: this.flap
        };
    }
}