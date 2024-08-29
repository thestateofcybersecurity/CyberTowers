import { threatTypes, defenseTypes } from './constants.js';

export class AssetLoader {
    constructor() {
        this.imageCache = new Map();
    }

    async loadAssets() {
        const imagePromises = this.loadImages();
        await Promise.all(imagePromises);
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
                this.imageCache.set(src, img);
                resolve(img);
            };
            img.onerror = () => {
                console.error(`Failed to load image: ${src}. Using fallback image.`);
                const fallbackSrc = './api/fallback.jpg'; // Assuming a fallback image is available
                const fallbackImg = new Image();
                fallbackImg.onload = () => {
                    this.imageCache.set(src, fallbackImg);
                    resolve(fallbackImg);
                };
                fallbackImg.src = fallbackSrc;
            };
            img.src = src;
        });
    }

    getImage(key) {
        return this.imageCache.get(key);
    }
}
