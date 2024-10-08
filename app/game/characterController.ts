import 'phaser';
import { Client, MessageType, ConnectionManager } from '@/app/game/connectionManager';
import { Character, CharacterState } from '@/app/game/character';
import { SFXManager } from '@/app/game/sfxManager';

interface InputState {
    left: boolean;
    right: boolean;
    flap: boolean;
};

export enum NetRole {
    None,
    Authority,
    SimulatedProxy
}

export interface MovementReplicationData {
    transform: Phaser.Types.Math.Vector2Like;
    velocity: Phaser.Types.Math.Vector2Like;
    inputs: InputState;
    state: string;
}

export class CharacterController {
    private character!: Character;
    private isOnGround = false;
    private walkSpeed = 100;
    private flapAccelerationX = 230;
    private flapTime = 0;
    private flapRate = 150;
    private flapVelocityY = 170;
    private floor: Phaser.GameObjects.GameObject | null;
    private ceiling: Phaser.GameObjects.GameObject | null;
    private inputs!: {
        left: Phaser.Input.Keyboard.Key | boolean,
        right: Phaser.Input.Keyboard.Key | boolean,
        flap: Phaser.Input.Keyboard.Key | boolean
    };
    private peerTransform: Phaser.Types.Math.Vector2Like = { x: 0, y: 0 };
    private peerVelocity: Phaser.Types.Math.Vector2Like = { x: 0, y: 0 };
    private lastUpdateTime = 0;
    private replTime = 0;
    private replRate = 20;
    private sfxManager: SFXManager;

    constructor(
        private scene: Phaser.Scene,
        private connectionManager: ConnectionManager,
        private netRole = NetRole.None,
        private client?: Client,
        private movementReplicationData?: MovementReplicationData
    ) {
        this.floor = scene.children.getByName('floor');
        this.ceiling = scene.children.getByName('ceiling');

        if (client) {
            this.netRole = NetRole.SimulatedProxy;
            this.registerDataChannelEvents();
        }

        this.setupInputs();
        this.sfxManager = SFXManager.getInstance();
    }

    private registerDataChannelEvents() {
        if (!this.client?.dataChannel) return;

        this.client.dataChannel.addEventListener('message', event => {
            const data = JSON.parse(event.data);
            
            if (data.type !== MessageType.movement) return;

            const { transform, velocity, inputs } = data;
            this.updatePeerMovementInputState(transform, velocity, inputs);
        });
    }

    private setupInputs() {
        if (this.isLocallyControlled()) {
            this.inputs = {
                left: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
                right: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
                flap: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
            };
        } else {
            this.inputs = {
                left: false,
                right: false,
                flap: false
            };
        }
    }

    private handleFloorCollision() {
        if (!this.floor) return;

        this.isOnGround = false;

        this.scene.physics.collide(this.character, this.floor, () => {
            this.isOnGround = true;
        });
    }

    private handleCeilingCollision() {
        if (!this.ceiling) return;

        const balloon = this.character.getBalloon();
        const body = this.character.getBody();

        this.scene.physics.collide(balloon, this.ceiling, () => {
            body.setVelocityY(180);
            this.sfxManager.playSound('bump');
        });
    }

    private resetVelocityAcceleration() {
        const body = this.character.getBody();

        if (this.isOnGround) {
            body.setAcceleration(0).setVelocityX(0);
        } else {
            body.setAcceleration(0);
        }
    }

    private getTransform(): Phaser.Types.Math.Vector2Like {
        if (!this.character) return { x: 0, y: 0 };

        return { x: parseFloat(this.character.x.toFixed(2)), y: parseFloat(this.character.y.toFixed(2)) };
    }

    private getVelocity(): Phaser.Types.Math.Vector2Like {
        if (!this.character) return { x: 0, y: 0 };

        const body = this.character.getBody();
        return { x: parseFloat(body.velocity.x.toFixed(2)), y: parseFloat(body.velocity.y.toFixed(2)) }
    }

    private replicateMovement() {
        const transform = this.getTransform();
        const velocity = this.getVelocity();
        const inputs = this.getInputState();
        const state = this.character.state;
        const timestamp = performance.timeOrigin + performance.now();

        this.connectionManager.sendDataChannelMessageAll(
            JSON.stringify({ timestamp, type: MessageType.movement, transform, velocity, inputs, state })
        );
    }

    private handleMovement(time: number, delta: number) {
        const { left, right, flap } = this.getInputState();
        const body = this.character.getBody();

        if (left) {
            this.character.setLeftFacing();
            this.isOnGround ? body.setVelocityX(-this.walkSpeed) : body.setAccelerationX(-this.flapAccelerationX);
        }

        if (right) {
            this.character.setRightFacing();
            this.isOnGround ? body.setVelocityX(this.walkSpeed) : body.setAccelerationX(this.flapAccelerationX);
        }

        this.flapTime += delta;

        if (flap && this.flapTime > this.flapRate) {
            this.flapTime = 0;
            this.character.setState(CharacterState.flapping);

            if (this.isLocallyControlled()) {
                this.sfxManager.playSound('flap');
            }

            const newVelocityY = body.velocity.y <= 0 ? this.flapVelocityY
                : this.flapVelocityY - body.velocity.y;

            body.setVelocityY(-newVelocityY);
        }

        if (this.isLocallyControlled()) {
            this.replTime += delta;
    
            if (this.replTime > this.replRate) {
                this.replTime = 0;
                this.replicateMovement();
            }
        }

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

    private updatePeerMovementInputState(
        transform: Phaser.Types.Math.Vector2Like,
        velocity: Phaser.Types.Math.Vector2Like,
        inputs: InputState,
        characterState?: string
    ) {
        this.peerTransform = transform;
        this.peerVelocity = velocity;
        this.inputs = inputs;

        if (characterState) {
            this.character.setState(characterState);
        }

        this.lastUpdateTime = performance.timeOrigin + performance.now();
    }

    private interpolate() {
        const timestamp = performance.timeOrigin + performance.now();
        const delta = (timestamp - this.lastUpdateTime) / 1000;
        const gravityY = this.scene.physics.world.gravity.y;
        const predictedVelocityX = this.peerVelocity.x;
        const predictedVelocityY = this.peerVelocity.y + gravityY * delta;

        const predictedTransformX = this.peerTransform.x + this.peerVelocity.x * delta;
        let predictedTransformY = this.peerTransform.y + this.peerVelocity.y * delta;

        if (this.character.state === CharacterState.flapping) {
            predictedTransformY += .5 * gravityY * Math.pow(delta, 2);
        }

        const body = this.character.getBody();
        body.setVelocity(predictedVelocityX, predictedVelocityY);

        const distance = Phaser.Math.Difference(this.character.x, predictedTransformX);

        if (distance >= body.world.bounds.width - body.width) {
            this.character.x = predictedTransformX;
        } else {
            this.character.x = Phaser.Math.Interpolation.Linear([this.character.x, predictedTransformX], .1);
        }

        this.character.y = Phaser.Math.Interpolation.Linear([this.character.y, predictedTransformY], .1);
    }

    private processCallback: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (object1, object2) => {
        const character1 = object1 as Character;
        const character2 = object2 as Character;

        if (!character1 || !character2) return false;

        return character1.state !== CharacterState.death && character2.state !== CharacterState.death;
    }

    isLocallyControlled() {
        return this.netRole === NetRole.Authority;
    }

    getInputState(): InputState {
        if (!this.character) return { left: false, right: false, flap: false };

        return this.isLocallyControlled() ? {
            left: (this.inputs.left as Phaser.Input.Keyboard.Key).isDown,
            right: (this.inputs.right as Phaser.Input.Keyboard.Key).isDown,
            flap: (this.inputs.flap as Phaser.Input.Keyboard.Key).isDown
        } : {
            left: !!this.inputs.left,
            right: !!this.inputs.right,
            flap: !!this.inputs.flap
        };
    }

    setCharacter(character: Character) {
        this.character = character;

        if (this.movementReplicationData) {
            const { transform, velocity, inputs, state } = this.movementReplicationData;
            this.updatePeerMovementInputState(transform, velocity, inputs, state);
        }
    }

    update(time: number, delta: number) {
        if (!this.character) return;

        if (this.character.state !== CharacterState.death) {
            if (!this.isLocallyControlled()) {
                this.interpolate();
            }

            this.handleFloorCollision();
            this.handleCeilingCollision();
            this.resetVelocityAcceleration();
            this.handleMovement(time, delta);
        }
    }

    addCharacterCollisionOverlap(locallyControlledCharacter: Character) {
        if (this.isLocallyControlled() || !this.character) return;

        const collider = this.scene.physics.add.collider(locallyControlledCharacter, this.character, () => {
            this.sfxManager.playSound('bump', true);
        }, this.processCallback);

        const overlap = this.scene.physics.add.overlap(locallyControlledCharacter, this.character.getBalloon(), () => {
            overlap.destroy();
            collider.destroy();
            const timestamp = performance.timeOrigin + performance.now();

            this.connectionManager.sendDataChannelMessageAll(
                JSON.stringify({ timestamp, type: MessageType.death, clientId: this.client?.id })
            );

            this.death();
        }, this.processCallback);
    }

    death() {
        this.character.setState(CharacterState.death);
        this.sfxManager.playSound('balloonBurst');
        this.sfxManager.playSound('death', false, 1);
        this.character.getBody().setVelocity(0).setAllowGravity(false);

        const destroyTimerEvent = this.scene.time.delayedCall(1500, () => {
            destroyTimerEvent.destroy();
            this.character?.destroy();
        }, [], this);
    }
};
