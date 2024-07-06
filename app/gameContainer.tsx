"use client";

import 'phaser';
import { Game } from '@/app/game';
import { useEffect } from 'react';

let isGameInitialized = false;

export const GameContainer = () => {
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
            isGameInitialized = true;
        }
    }, []);

    return (
        <div id='game-container' className="game-container"></div>
    );
}