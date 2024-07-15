import 'phaser';

export class Balloon extends Phaser.GameObjects.Arc {
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