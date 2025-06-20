import React from 'react';
import { Howl } from 'howler';

interface AudioPlayerProps {
  executorName: string;
  albumName: string;
  audioFileName: string;
}

let currentlyPlayingSound: Howl | null = null; // Глобальная переменная для отслеживания текущего проигрываемого звука

const AudioPlayer: React.FC<AudioPlayerProps> = ({ executorName, albumName, audioFileName }) => {
  const playAudio = () => {
    if (currentlyPlayingSound) {
      currentlyPlayingSound.stop();
      currentlyPlayingSound = null;
    }

    const newSound = new Howl({
      src: [`/audio/${executorName}/${albumName}/${audioFileName}.mp3`],
      onend: () => {
        if (newSound) {
          newSound.stop();
          currentlyPlayingSound = null;
        }
      }
    });

    newSound.play();
    currentlyPlayingSound = newSound;
  };

  const stopAudio = () => {
    if (currentlyPlayingSound) {
      currentlyPlayingSound.stop();
      currentlyPlayingSound = null;
    }
  };

  return (
    <div >

        <button onClick={playAudio}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 icon-play-stop">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
          </svg>
        </button>


        <button onClick={stopAudio}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 icon-play-stop">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
          </svg>
        </button>
      </div>

  );
};

export default AudioPlayer;