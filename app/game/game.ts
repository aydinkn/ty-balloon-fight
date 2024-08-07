"use client";

import 'phaser';
import { Character, CharacterType } from '@/app/game/character';
import { InitialMessage, RTCManager } from "@/app/game/rtcManager";
import { CharacterController, NetRole } from '@/app/game/characterController';
import { socket } from "@/socket.mjs";

export interface GameBootData {
    nickName: string;
    roomName: string;
    team: string;
}

export class Game extends Phaser.Scene {
    private gameBootData!: GameBootData;
    private rtcManager!: RTCManager;
    private localPlayer!: Character;
    private remotePlayers: { [id: string]: Character } = {};

    constructor() {
        super({ key: 'gameplay' });
    }

    init(data: GameBootData) {
        this.gameBootData = data;

        this.rtcManager = new RTCManager({ roomName: this.gameBootData.roomName });

        this.rtcManager.addEventListener('initialMessage', event => {
            const customEvent = event as CustomEvent<InitialMessage>;
            const { client, data } = customEvent.detail;

            const peerCharacter = this.spawnCharacter(client.data.team as CharacterType, data.transform);
            this.remotePlayers[client.id] = peerCharacter;
            peerCharacter.setController(new CharacterController(this, this.rtcManager, NetRole.SimulatedProxy, client, data));
            peerCharacter.setNickName(client.data.nickName);
        });

        this.rtcManager.addEventListener('clientLeave', event => {
            const customEvent = event as CustomEvent<{ clientId: string }>;
            const { clientId } = customEvent.detail;
            const player = this.remotePlayers[clientId];

            if (!player) return;

            player.destroy(true);
            delete this.remotePlayers[clientId];
        });

        this.rtcManager.addEventListener('disconnect', event => {
            this.sys.game.destroy(true);
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

        this.localPlayer = this.spawnCharacter(this.gameBootData.team as CharacterType);
        this.localPlayer.setController(new CharacterController(this, this.rtcManager, NetRole.Authority));
        this.localPlayer.setNickName(this.gameBootData.nickName);

        const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        escKey?.on('down', () => {
            this.rtcManager.leaveAllClients();
            this.rtcManager.destroy();
            socket.emit('leaveRoom');
            this.sys.game.destroy(true);
        });
    }

    update(time: number, delta: number) {

    }

    private spawnCharacter(characterType: CharacterType, transform?: Phaser.Types.Math.Vector2Like) {
        const offset = 38;
        const { right, bottom } = this.physics.world.bounds;
        const spawnTransform: Phaser.Types.Math.Vector2Like = !transform ? {
            x: Phaser.Math.Between(offset, right - offset),
            y: bottom - offset - 24
        } : transform;

        return new Character(this, spawnTransform.x, spawnTransform.y, characterType);
    }
};