import popSound from "../assets/pop_sound.mp3";

let isAudioUnlocked = false;

export const unlockAudio = () => {
    if (isAudioUnlocked) return;

    const audio = new Audio();
    audio.play().then(() => {
        isAudioUnlocked = true;
        console.log("🔊 Audio unlocked");
    }).catch(() => {
        // Still locked
    });
};

export const playNotificationSound = () => {
    try {
        const audio = new Audio(popSound);

        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("🔊 Playback prevented by browser policy. Audio will play after user interaction.");
            });
        }
    } catch (error) {
        console.error("Error playing notification sound:", error);
    }
};
