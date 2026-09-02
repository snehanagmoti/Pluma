import React, { useState, useEffect, useCallback, useRef } from "react";
import { FaPlay, FaPause, FaStop, FaVolumeUp } from "react-icons/fa";
import "./VoiceReader.css";

export default function VoiceReader({ text }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      const english = available.filter(v => v.lang.startsWith("en"));
      setVoices(english.length > 0 ? english : available.slice(0, 10));
      if (english.length > 0) setSelectedVoice(current => current || english[0]);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.cancel(); clearInterval(intervalRef.current); };
  }, []);

  const handlePlay = useCallback(() => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speed;
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onstart = () => {
      setIsPlaying(true);
      // Simulate progress
      const words = text.split(/\s+/).length;
      const durationMs = (words / (speed * 2.5)) * 1000;
      const step = 100 / (durationMs / 100);
      setProgress(0);
      intervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) { clearInterval(intervalRef.current); return 100; }
          return prev + step;
        });
      }, 100);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(100);
      clearInterval(intervalRef.current);
      setTimeout(() => setProgress(0), 1000);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [text, speed, selectedVoice, isPaused]);

  const handlePause = () => {
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
    clearInterval(intervalRef.current);
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    clearInterval(intervalRef.current);
  };

  if (!text) return null;

  return (
    <div className="voiceReader">
      <div className="voiceReaderHeader">
        <FaVolumeUp className="voiceReaderIcon" />
        <span className="voiceReaderLabel">Voice Reader</span>
      </div>

      <div className="voiceReaderProgress">
        <div className="voiceReaderProgressBar" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>

      <div className="voiceReaderControls">
        <div className="voiceReaderButtons">
          {isPlaying ? (
            <button className="voiceBtn" onClick={handlePause} title="Pause">
              <FaPause />
            </button>
          ) : (
            <button className="voiceBtn voiceBtnPlay" onClick={handlePlay} title="Play">
              <FaPlay />
            </button>
          )}
          <button className="voiceBtn" onClick={handleStop} title="Stop" disabled={!isPlaying && !isPaused}>
            <FaStop />
          </button>
        </div>

        <div className="voiceReaderOptions">
          <select
            className="voiceSelect"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
          >
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1">1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>

          {voices.length > 0 && (
            <select
              className="voiceSelect voiceSelectWide"
              onChange={(e) => setSelectedVoice(voices[parseInt(e.target.value)])}
            >
              {voices.map((v, i) => (
                <option key={i} value={i}>{v.name.split(' ').slice(0, 3).join(' ')}</option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
