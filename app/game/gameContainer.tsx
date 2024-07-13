"use client";

import 'phaser';
import { Game } from '@/app/game/game';
import { useEffect } from 'react';

let isGameInitialized = false;

export interface GameContainerProps {
    nickName: string;
    roomName: string;
}

export const GameContainer = ({ nickName, roomName }: GameContainerProps) => {
    useEffect(() => {
        if (!isGameInitialized) {
            const gameConfig: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                width: 1024,
                height: 768,
                physics: {
                    default: 'arcade',
                    arcade: {
                        gravity: { x: 0, y: 200 },
                        debug: true
                    }
                },
                scene: Game,
                parent: 'game-container'
            };
            
            const game = new Phaser.Game(gameConfig);
            game.scene.start('gameplay', { nickName, roomName });
            isGameInitialized = true;
        }
    }, [nickName, roomName]);

    return (
        <div id='game-container' className="game-container"></div>
    );
}