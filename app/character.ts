import 'phaser';

export const CharacterType = {
    'red': 0,
    'blue': 1
}

interface CharacterInput {
    'left': Phaser.Input.Keyboard.Key;
    'right': Phaser.Input.Keyboard.Key;
    'flap': Phaser.Input.Keyboard.Key;
};

const CharacterState = {
    'idling': 'idling',
    'walking': 'walking',
    'flapping': 'flapping'
};

class Balloon extends Phaser.GameObjects.Arc {
    private offsetX: number;
    private offsetY: number;

    constructor(scene: Phaser.Scene, x: number, y: number, radius: number, offsetX: number, offsetY: number) {
        super(scene, x, y, radius);

        scene.add.existing(this);

        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.setupPhysics();
    }

    private setupPhysics() {
        this.scene.physics.add.existing(this, false);
        const body = this.getBody();
        body.setCircle(this.radius, this.offsetX, this.offsetY);
        body.setAllowGravity(false);
    }

    getBody() {
        return this.body as Phaser.Physics.Arcade.Body;
    }
}

export class Character extends Phaser.GameObjects.Container {
    private scaleFactor = 3;
    private walkSpeed = 100;
    private flapVelocityY = 150;
    private flapAccelerationX = 150;
    private flapTime = 0;
    private flapRate = 300;
    private characterSprite!: CharacterSprite;
    private balloon!: Balloon;
    private inputs!: CharacterInput;
    private nickNameText!: Phaser.GameObjects.Text;
    private ceiling: Phaser.GameObjects.GameObject | null;
    private floor: Phaser.GameObjects.GameObject | null;
    private isOnGround = false;
    private characterType: number;

    constructor(scene: Phaser.Scene, x: number, y: number, characterType: number) {
        super(scene, x, y);

        this.characterType = characterType;
        this.onSceneUpdate = this.onSceneUpdate.bind(this);
        this.floor = scene.children.getByName('floor');
        this.ceiling = scene.children.getByName('ceiling');

        scene.add.existing(this);

        this.setSize((24 - 8) * this.scaleFactor, 13 * this.scaleFactor);
        this.setupNickNameText();
        this.setupCharacterSprite();
        this.setupBalloon();
        this.setupInputs();
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

    private setupInputs() {
        this.inputs = {
            left: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            flap: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
        };
    }

    private setupPhysics() {
        this.scene.physics.add.existing(this, false);
        const body = this.getBody();
        body.offset.y = 6 * this.scaleFactor;
        body.setMaxVelocityX(250);
    }

    private onSceneUpdate(time: number, delta: number) {
        this.handleFloorCollision();
        this.handleCeilingCollision();
        this.handleMovement(time, delta);
    }

    private handleFloorCollision() {
        this.isOnGround = false;

        if (this.floor) {
            this.scene.physics.collide(this, this.floor, () => {
                this.isOnGround = true;
            });
        }
    }

    private handleCeilingCollision() {
        if (this.ceiling) {
            this.scene.physics.collide(this.balloon, this.ceiling, () => {
                this.getBody().setVelocityY(120);
            });
        }
    }

    private handleMovement(time: number, delta: number) {
        this.scene.physics.world.wrap(this, 5);

        const body = this.getBody();

        if (this.isOnGround) {
            body.setVelocityX(0).setAccelerationX(0);
        } else {
            body.setAcceleration(0, 0);
        }

        if (this.inputs.right.isDown) {
            this.isOnGround ? body.setVelocityX(this.walkSpeed) : body.setAccelerationX(this.flapAccelerationX);
        }

        if (this.inputs.left.isDown) {
            this.isOnGround ? body.setVelocityX(-this.walkSpeed) : body.setAccelerationX(-this.flapAccelerationX);
        }

        const hasXVelocity = Math.abs(body.velocity.x) > 1;
        const hasYVelocity = Math.abs(body.velocity.y) > 1;

        // Idling
        if ((this.characterSprite.state !== CharacterState.idling)
            && this.isOnGround && !hasXVelocity && !hasYVelocity) {
            this.characterSprite.setState(CharacterState.idling);
        }

        // Walking
        if ((this.characterSprite.state !== CharacterState.walking)
            && this.isOnGround && hasXVelocity && !hasYVelocity) {
            this.characterSprite.setState(CharacterState.walking);
        }

        // Flapping
        if (time > this.flapTime && Phaser.Input.Keyboard.JustDown(this.inputs.flap)) {
            this.flapTime = time + this.flapRate;
            this.characterSprite.setState(CharacterState.flapping);
            body.setVelocityY(-this.flapVelocityY);
        }

        if (body.velocity.x < 0) {
            this.characterSprite.setFlipX(false);
        }

        if (body.velocity.x > 0) {
            this.characterSprite.setFlipX(true);
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
}

class CharacterSprite extends Phaser.GameObjects.Sprite {
    private characterType: number;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string | Phaser.Textures.Texture, characterType: number) {
        super(scene, x, y, texture);

        this.characterType = characterType;
        this.setupAnimations();
        this.setState(CharacterState.idling);
    }

    setState(value: string | number): this {
        super.setState(value);

        const animKeys: { [key: string | number]: string } = { 'idling': 'idle', 'walking': 'walk', 'flapping': 'flap', 'death': 'death' };
        this.anims.play(animKeys[value]);

        console.log(`Character state: ${this.state}`);

        return this;
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
}