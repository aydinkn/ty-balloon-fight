import 'phaser';

export interface Sounds {
    flap: Phaser.Sound.BaseSound;
    balloonBurst: Phaser.Sound.BaseSound;
    bump: Phaser.Sound.BaseSound;
}

export class SFXManager {
    static instance?: SFXManager;
    private scene?: Phaser.Scene;
    private sounds!: Sounds;

    private constructor() {
        this.destroy = this.destroy.bind(this);
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new SFXManager();
        }

        return this.instance;
    }

    private getSoundKeys() {
        return Object.keys(this.sounds) as [keyof Sounds];
    }

    private destroy() {
        if (!this.scene) return;

        const soundKeys = this.getSoundKeys();

        for (const key of soundKeys) {
            this.scene.sound.removeByKey(key);
        }
    }

    preload(scene: Phaser.Scene) {
        if (!this.scene) {
            this.scene = scene;
            this.scene.events.addListener('destroy', this.destroy);
            this.scene.load.audio('flap', 'game-assets/flap.mp3');
            this.scene.load.audio('balloon-burst', 'game-assets/balloon-burst.mp3');
            this.scene.load.audio('bump', 'game-assets/bump.mp3');
        }

        return this;
    }

    create() {
        if (!this.scene) return;

        this.scene.sound.pauseOnBlur = false;

        this.sounds = {
            flap: this.scene.sound.add('flap'),
            balloonBurst: this.scene.sound.add('balloon-burst'),
            bump: this.scene.sound.add('bump')
        };
    }

    playSound(key: keyof Sounds, playIfNotPlaying = false) {
        const sound = this.sounds[key];

        if (!sound || (playIfNotPlaying && sound.isPlaying)) return;

        sound.play();
    }
}