// AssetLoader.js
import { threatTypes, defenseTypes } from './constants.js';

export class AssetLoader {
    constructor() {
        this.images = {};
       // this.sounds = {};
    }

    async loadAssets() {
        const imagePromises = this.loadImages();
        //const soundPromises = this.loadSounds();
        
        await Promise.all([...imagePromises,]);
    }

    loadImages() {
        const imagesToLoad = [
            ...Object.values(threatTypes).map(threat => threat.icon),
            ...Object.values(defenseTypes).map(defense => defense.icon)
        ];

        return imagesToLoad.map(src => this.loadImage(src));
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.imageCache[src] = img;
                resolve(img);
            };
            img.onerror = () => {
                console.error(`Failed to load image: ${src}. Using fallback image.`);
                const fallbackSrc = './api/fallback.jpg'; // Assuming a fallback image is available
                const fallbackImg = new Image();
                fallbackImg.onload = () => {
                    this.imageCache[src] = fallbackImg;
                    resolve(fallbackImg);
                };
                fallbackImg.src = fallbackSrc;
            };
            img.src = src;
        });
    }


    //loadSounds() {
        //const soundsToLoad = {
            //backgroundMusic: './api/background_music.mp3',
            //towerShoot: './api/tower_shoot.mp3',
            //threatDeath: './api/threat_death.mp3'
        //};

        //return Object.entries(soundsToLoad).map(([key, src]) => this.loadSound(key, src));
    //}

    //loadSound(key, src) {
        //return new Promise((resolve, reject) => {
            //const audio = new Audio();
           // audio.oncanplaythrough = () => {
                //this.sounds[key] = audio;
                //resolve(audio);
            //};
            //audio.onerror = () => reject(new Error(`Failed to load sound: ${src}`));
            //audio.src = src;
       //});
    //}

    getImage(key) {
        return this.images[key];
    }

    //getSound(key) {
        //return this.sounds[key];
    //}
    loadAssets(assets) {
        return Promise.all(assets.map(src => this.loadImage(src)));
    }
}
