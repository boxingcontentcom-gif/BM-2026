import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import SetupScene from './scenes/SetupScene.js';
import ManagementScene from './scenes/ManagementScene.js';
import FightScene from './scenes/FightScene.js';

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 400,
        height: 800
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [BootScene, SetupScene, ManagementScene, FightScene],
    backgroundColor: '#000000',
    parent: 'game-container'
};

const game = new Phaser.Game(config);
