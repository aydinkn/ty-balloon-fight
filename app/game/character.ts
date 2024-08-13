import 'phaser';
import { Balloon } from '@/app/game/balloon';
import { CharacterSprite } from '@/app/game/characterSprite';
import { CharacterController } from '@/app/game/characterController';

export enum CharacterType {
    red = 'red',
    blue = 'blue'
}

export const CharacterState = {
    'idling': 'idling',
    'walking': 'walking',
    'flapping': 'flapping',
    'death': 'death'
};

export class Character extends Phaser.GameObjects.Container {
    private maxVelocity = 300;
    private dragX = 50;
    private scaleFactor = 3;
    private characterSprite!: CharacterSprite;
    private balloon!: Balloon;
    private nickNameText!: Phaser.GameObjects.Text;
    private characterType: CharacterType;
    private controller?: CharacterController;

    constructor(scene: Phaser.Scene, x: number, y: number, characterType: CharacterType) {
        super(scene, x, y);

        this.characterType = characterType;
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
        this.setState(CharacterState.idling);
    }

    private setupBalloon() {
        this.balloon = new Balloon(this.scene, 0, 0, 6 * this.scaleFactor, 0, -7 * this.scaleFactor);
        this.add(this.balloon);
    }

    private setupPhysics() {
        this.scene.physics.add.existing(this, false);
        const body = this.getBody();
        body.offset.y = 6 * this.scaleFactor;
        body.setMaxVelocity(this.maxVelocity);
        body.setDragX(this.dragX);
    }

    private onSceneUpdate(time: number, delta: number) {
        if (!this.scene) return;

        this.scene.physics.world.wrap(this, 5);
        this.controller?.update(time, delta);
    }

    setController(controller: CharacterController) {
        this.controller = controller;
        this.controller.setCharacter(this);
    }

    getController() {
        return this.controller;
    }

    destroy(fromScene?: boolean | undefined): void {
        this.scene.events.off('update', this.onSceneUpdate);
        this.balloon.destroy(fromScene);
        this.nickNameText.destroy(fromScene);
        this.characterSprite.destroy(fromScene);

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

    setState(value: number | string): this {
        super.setState(value);
        this.characterSprite.setState(`${value}`);

        return this;
    }

    setLeftFacing() {
        this.characterSprite.setFlipX(false);
    }

    setRightFacing() {
        this.characterSprite.setFlipX(true);
    }
}
