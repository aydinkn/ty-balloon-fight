"use client";

import 'phaser';
import { Game } from '@/app/game/game';
import { useEffect } from 'react';

let isGameInitialized = false;

export interface GameContainerProps {
    nickName: string;
    roomName: string;
    team: string;
    onQuitGame: () => void;
}

export const GameContainer = ({ nickName, roomName, team, onQuitGame }: GameContainerProps) => {
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
                parent: 'game-container'
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
        <div id='game-container' className="game-container"></div>
    );
}