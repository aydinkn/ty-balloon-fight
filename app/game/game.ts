"use client";

import 'phaser';
import { Character, CharacterType } from '@/app/game/character';
import { RTCManager } from "@/app/game/rtcManager";

export interface GameBootData {
    nickName: string;
    roomName: string;
}

export class Game extends Phaser.Scene {
    gameBootData!: GameBootData;
    player!: Character;
    rtcManager!: RTCManager;

    constructor() {
        super({ key: 'gameplay' });
    }

    init(data: GameBootData) {
        this.gameBootData = data;
        this.rtcManager = new RTCManager({ roomName: this.gameBootData.roomName });
    }

    preload() {
        this.load.setBaseURL('http://localhost:3000');

        this.load.image('background', 'game-assets/background.png');
        this.load.image('floor', 'game-assets/floor.png');
        this.load.spritesheet('character', 'game-assets/character.png', { frameWidth: 24, frameHeight: 32 });
    }

    create() {
        this.add.image(0, 0, 'background').setOrigin(0, 0).setScale(1.5);

        const floor = this.add.image(-25, 768 - 12 * 2, 'floor')
            .setOrigin(0, 0).setScale(2).setName('floor');
        this.physics.add.existing(floor, true);

        const ceiling = this.add.rectangle(-25, -50, 1024 + 25, 50, 0xff0000)
            .setOrigin(0, 0).setName('ceiling');
        this.physics.add.existing(ceiling, true);

        const spawnArea: Phaser.Types.Math.Vector2Like = { x: Phaser.Math.Between(32, 980), y: floor.y - 38 };
        this.player = new Character(this, spawnArea.x, spawnArea.y, CharacterType.red);
        this.player.setNickName(this.gameBootData.nickName);
    }

    update(time: number, delta: number) {

    }

    start() {
        
    }
};