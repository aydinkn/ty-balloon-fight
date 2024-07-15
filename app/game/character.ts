import 'phaser';
import { Balloon } from '@/app/game/balloon';
import { CharacterSprite } from '@/app/game/characterSprite';
import { CharacterController } from '@/app/game/characterController';

export enum CharacterType {
    red,
    blue
}

export enum CharacterNetRole {
    Authority,
    SimulatedProxy
};

export const CharacterState = {
    'idling': 'idling',
    'walking': 'walking',
    'flapping': 'flapping'
};

export class Character extends Phaser.GameObjects.Container {
    private scaleFactor = 3;
    private characterSprite!: CharacterSprite;
    private balloon!: Balloon;
    private nickNameText!: Phaser.GameObjects.Text;
    private characterType: number;
    private controller: CharacterController;

    constructor(scene: Phaser.Scene, x: number, y: number, characterType: CharacterType, controller: CharacterController) {
        super(scene, x, y);

        this.characterType = characterType;
        this.controller = controller;
        this.controller.setCharacter(this);
        this.onSceneUpdate = this.onSceneUpdate.bind(this);

        scene.add.existing(this);

        this.setSize((24 - 8) * this.scaleFactor, 13 * this.scaleFactor);
        this.setupNickNameText();
        this.setupCharacterSprite();
        this.setupBalloon();
        this.setupPhysics();

        scene.events.on('update', this.onSceneUpdate);
    }

    private setupNickNameText() {
        this.nickNameText = this.scene.add.text(0, -15 * this.scaleFactor, '').setOrigin(.5, .5);
        this.add(this.nickNameText);
    }

    private setupCharacterSprite() {
        this.characterSprite = this.scene.add.existing(new CharacterSprite(this.scene, 0, 0, 'character', this.characterType));
        this.characterSprite.setScale(this.scaleFactor);
        this.add(this.characterSprite);
    }

    private setupBalloon() {
        this.balloon = new Balloon(this.scene, 0, 0, 6 * this.scaleFactor, 0, -7 * this.scaleFactor);
        this.add(this.balloon);
    }

    private setupPhysics() {
        this.scene.physics.add.existing(this, false);
        const body = this.getBody();
        body.offset.y = 6 * this.scaleFactor;
        body.setMaxVelocityX(250);
    }

    private onSceneUpdate(time: number, delta: number) {
        this.scene.physics.world.wrap(this, 5);
        this.handleMovement(time, delta);
    }

    private handleMovement(time: number, delta: number) {
        this.controller.update(time, delta);

        const body = this.getBody();
        const isOnGround = this.controller.isOnTheGround();

        const hasXVelocity = Math.abs(body.velocity.x) > 1;
        const hasYVelocity = Math.abs(body.velocity.y) > 1;

        // Idling
        if ((this.characterSprite.state !== CharacterState.idling)
            && isOnGround && !hasXVelocity && !hasYVelocity) {
            this.characterSprite.setState(CharacterState.idling);
        }

        // Walking
        if ((this.characterSprite.state !== CharacterState.walking)
            && isOnGround && hasXVelocity && !hasYVelocity) {
            this.characterSprite.setState(CharacterState.walking);
        }

        const inputState = this.controller.getInputState();

        if (inputState.left) {
            this.characterSprite.setFlipX(false);
        }

        if (inputState.right) {
            this.characterSprite.setFlipX(true);
        }

        if (inputState.flap) {
            this.characterSprite.setState(CharacterState.flapping);
        }
    }

    destroy(fromScene?: boolean | undefined): void {
        this.scene.events.off('update', this.onSceneUpdate);

        super.destroy(fromScene);
    }

    getBody() {
        return this.body as Phaser.Physics.Arcade.Body;
    }

    setNickName(nickName: string) {
        this.nickNameText.setText(nickName);
    }

    getBalloon() {
        return this.balloon;
    }

    getCharacterSprite() {
        return this.characterSprite;
    }
}
