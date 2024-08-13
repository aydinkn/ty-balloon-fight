"use client";

import 'phaser';
import { Character, CharacterType } from '@/app/game/character';
import { Message, ConnectionManager } from "@/app/game/connectionManager";
import { CharacterController, NetRole } from '@/app/game/characterController';
import { SFXManager } from '@/app/game/sfxManager';
import { PushToTalkService } from "@/app/game/pushToTalkService";

export interface GameBootData {
    nickName: string;
    roomName: string;
    team: string;
}

export class Game extends Phaser.Scene {
    private gameBootData!: GameBootData;
    private connectionManager!: ConnectionManager;
    private localPlayer!: Character;
    private remotePlayers: { [id: string]: Character } = {};

    constructor() {
        super({ key: 'gameplay' });
    }

    private registerConnectionManagerEvents() {
        const movementMessageHandler = (event: Event) => {
            this.connectionManager.removeEventListener('movementMessage', movementMessageHandler);

            const customEvent = event as CustomEvent<Message>;
            const { client, data } = customEvent.detail;

            if (!client) return;

            const peerCharacter = this.spawnCharacter(client.data.team as CharacterType, data.transform);
            this.remotePlayers[client.id] = peerCharacter;
            const controller = new CharacterController(this, this.connectionManager, NetRole.SimulatedProxy, client, data);
            peerCharacter.setController(controller);
            peerCharacter.setNickName(client.data.nickName);
            controller.addCharacterCollisionOverlap(this.localPlayer);
        };

        this.connectionManager.addEventListener('movementMessage', movementMessageHandler);

        this.connectionManager.addEventListener('deathMessage', event => {
            const customEvent = event as CustomEvent<Message>;
            const { client } = customEvent.detail;
            const player = client ? this.remotePlayers[client.id] : this.localPlayer;
            const controller = player.getController();
            controller?.death();

            if (client) {
                delete this.remotePlayers[client.id];
            }
        });

        this.connectionManager.addEventListener('clientLeave', event => {
            const customEvent = event as CustomEvent<{ clientId: string }>;
            const { clientId } = customEvent.detail;
            const player = this.remotePlayers[clientId];

            if (!player) return;

            player.destroy();
            delete this.remotePlayers[clientId];
        });

        this.connectionManager.addEventListener('disconnect', event => {
            this.sys.game.destroy(true);
        });
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

    init(data: GameBootData) {
        this.gameBootData = data;
    }

    preload() {
        this.load.setBaseURL('http://localhost:3000');

        this.load.image('background', 'game-assets/background.png');
        this.load.image('floor', 'game-assets/floor.png');
        this.load.spritesheet('character', 'game-assets/character.png', { frameWidth: 24, frameHeight: 32 });
        SFXManager.getInstance().preload(this);
    }

    create() {
        PushToTalkService.getInstance().create(this);

        this.connectionManager = new ConnectionManager({ roomName: this.gameBootData.roomName });
        this.registerConnectionManagerEvents();

        this.add.image(0, 0, 'background').setOrigin(0, 0).setScale(1.5);

        const floor = this.add.image(-25, 768 - 12 * 2, 'floor')
            .setOrigin(0, 0).setScale(2).setName('floor');
        this.physics.add.existing(floor, true);

        const ceiling = this.add.rectangle(-25, -50, 1024 + 25, 50, 0xff0000)
            .setOrigin(0, 0).setName('ceiling');
        this.physics.add.existing(ceiling, true);

        SFXManager.getInstance().create();

        this.localPlayer = this.spawnCharacter(this.gameBootData.team as CharacterType);
        this.localPlayer.setController(new CharacterController(this, this.connectionManager, NetRole.Authority));
        this.localPlayer.setNickName(this.gameBootData.nickName);

        const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        escKey?.on('down', () => {
            this.connectionManager.leaveAllClients();
            this.connectionManager.destroy();
            this.sys.game.destroy(true);
        });
    }
};