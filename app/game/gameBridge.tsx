"use client";

import 'phaser';
import { useEffect } from 'react';
import { Game } from '@/app/game/game';

let isGameInitialized = false;

export interface GameBridgeProps {
    nickName: string;
    roomName: string;
    team: string;
    onQuitGame: () => void;
}

export const GameBridge = ({ nickName, roomName, team, onQuitGame }: GameBridgeProps) => {
    useEffect(() => {
        if (!isGameInitialized) {
            const gameConfig: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                width: 1024,
                height: 768,
                physics: {
                    default: 'arcade',
                    arcade: {
                        gravity: { x: 0, y: 300 },
                        debug: false
                    }
                },
                scene: Game,
                parent: 'game-bridge'
            };
            
            let game: Phaser.Game | null = new Phaser.Game(gameConfig);

            game.events.addListener('destroy', () => {
                isGameInitialized = false;
                game = null;
                onQuitGame();
            });

            game.scene.start('gameplay', { nickName, roomName, team });
            isGameInitialized = true;
        }
    }, [nickName, roomName, team, onQuitGame]);

    return (
        <div id='game-bridge' className="game-bridge"></div>
    );
}