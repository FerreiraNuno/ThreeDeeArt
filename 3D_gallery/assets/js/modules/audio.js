// audio.js
import * as THREE from 'three';

export class AudioManager {
    constructor(listener) {
        this.listener = listener;
        this.sounds = [];
    }

    addPositionalAudio(mesh, audioFile, loop = true, volume = 0.3, refDistance = 5) {
        const sound = new THREE.PositionalAudio(this.listener);
        const loader = new THREE.AudioLoader();

        loader.load(audioFile, (buffer) => {
            sound.setBuffer(buffer);
            sound.setLoop(loop);
            sound.setVolume(volume);
            sound.setRefDistance(refDistance);
            sound.play();
        });

        mesh.add(sound);
        this.sounds.push(sound);
        return sound;
    }

    stopAll() {
        this.sounds.forEach(sound => sound.stop());
    }

    setVolumeAll(volume) {
        this.sounds.forEach(sound => sound.setVolume(volume));
    }
}
