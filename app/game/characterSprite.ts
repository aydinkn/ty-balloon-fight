import 'phaser';
import { CharacterType, CharacterState } from '@/app/game/character';

export class CharacterSprite extends Phaser.GameObjects.Sprite {
    private characterType: CharacterType;
    private animKeys: { [key: string]: string };

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string | Phaser.Textures.Texture, characterType: CharacterType) {
        super(scene, x, y, texture);

        this.characterType = characterType;
        this.animKeys = { idling: 'idle', walking: 'walk', flapping: 'flap', death: 'death' };
        this.setupAnimations();
        this.setState(CharacterState.idling);
    }

    private setupAnimations() {
        let idleFrames: Phaser.Types.Animations.GenerateFrameNumbers;
        let walkFrames: Phaser.Types.Animations.GenerateFrameNumbers;
        let flapFrames: Phaser.Types.Animations.GenerateFrameNumbers;
        let deathFrames: Phaser.Types.Animations.GenerateFrameNumbers;

        if (this.characterType === CharacterType.red) {
            idleFrames = { start: 0, end: 2 };
            walkFrames = { start: 3, end: 6 };
            flapFrames = { start: 7, end: 11 };
            deathFrames = { start: 12, end: 14 };
        } else {
            idleFrames = { start: 15, end: 17 };
            walkFrames = { start: 18, end: 21 };
            flapFrames = { start: 22, end: 26 };
            deathFrames = { start: 27, end: 29 };
        }

        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers(this.texture.key, idleFrames),
            frameRate: 5,
            repeat: -1
        });

        this.anims.create({
            key: 'walk',
            frames: this.anims.generateFrameNumbers(this.texture.key, walkFrames),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'flap',
            frames: this.anims.generateFrameNumbers(this.texture.key, flapFrames),
            frameRate: 15,
            repeat: 0
        });

        this.anims.create({
            key: 'death',
            frames: this.anims.generateFrameNumbers(this.texture.key, deathFrames),
            frameRate: 5,
            repeat: 0
        });
    }

    setState(value: string): this {
        super.setState(value);

        this.anims.play(this.animKeys[value]);

        console.log(`Character state: ${this.state}`);

        return this;
    }
}