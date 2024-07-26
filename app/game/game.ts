"use client";

import 'phaser';
import { Character, CharacterType } from '@/app/game/character';
import { RTCManager } from "@/app/game/rtcManager";
import { CharacterController, NetRole } from '@/app/game/characterController';

export interface GameBootData {
    nickName: string;
    roomName: string;
}

export class Game extends Phaser.Scene {
    private gameBootData!: GameBootData;
    private player!: Character;
    private rtcManager!: RTCManager;

    constructor() {
        super({ key: 'gameplay' });
    }

    init(data: GameBootData) {
        this.gameBootData = data;

        this.rtcManager = new RTCManager({ roomName: this.gameBootData.roomName });
        this.rtcManager.addEventListener('dataChannelOpen', event => {
            const customEvent = event as CustomEvent;
            const client = this.rtcManager.getClient(customEvent.detail.clientId);

            if (!client) return;

            const controller = new CharacterController(this, this.rtcManager, NetRole.SimulatedProxy, client);
            const player = this.spawnCharacter(CharacterType.blue, controller);
            player.setNickName('Simulated Proxy');
        });
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

        const controller = new CharacterController(this, this.rtcManager, NetRole.Authority);
        this.player = this.spawnCharacter(CharacterType.red, controller);
        this.player.setNickName(this.gameBootData.nickName);
    }

    update(time: number, delta: number) {

    }

    private spawnCharacter(characterType: number, controller: CharacterController) {
        const spawnArea: Phaser.Types.Math.Vector2Like = { x: Phaser.Math.Between(32, 1024 - 32), y: 748 - 38 };
        const character = new Character(this, spawnArea.x, spawnArea.y, characterType, controller);

        return character;
    }
};