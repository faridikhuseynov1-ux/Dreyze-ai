"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, MicOff, Volume2 } from "lucide-react";
import type { Message } from "@/lib/types";
import { useToastStore } from "@/lib/store";

interface VoiceModeOverlayProps {
  onClose: () => void;
  onSend: (text: string, attachments: []) => void;
  isStreaming: boolean;
  isGenerating: boolean;
  lastMessage?: Message;
}

type VoiceState = "listening" | "thinking" | "speaking" | "idle";

export function VoiceModeOverlay({ onClose, onSend, isStreaming, isGenerating, lastMessage }: VoiceModeOverlayProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("listening");
  const voiceStateRef = useRef<VoiceState>("listening");
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRef = useRef("");
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ttsFallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const spokenMessageIdRef = useRef<string | null>(null);
  const pushToast = useToastStore((s) => s.push);
  const isStreamingRef = useRef(isStreaming);
  const lastMessageRef = useRef(lastMessage);
  
  useEffect(() => {
    isStreamingRef.current = isStreaming;
    lastMessageRef.current = lastMessage;
  }, [isStreaming, lastMessage]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  const stopListening = useCallback(() => {
    try {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } catch {}
  }, []);

  const speakWithBrowserTTS = useCallback((text: string) => {
    if (!synthRef.current) {
      setVoiceState("listening");
      return;
    }

    const chunks = text
      .split(/(?<=[.!?。！？])\s+|\n{2,}/)
      .flatMap((part) => (part.length > 240 ? part.match(/.{1,220}(?:\s|$)/g) || [part] : [part]))
      .map((part) => part.trim())
      .filter(Boolean);

    if (!chunks.length) {
      setVoiceState("listening");
      return;
    }

    let index = 0;
    const speakNext = () => {
      if (!synthRef.current || voiceStateRef.current !== "speaking") return;
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = "ru-RU";
      utterance.rate = 1.12;
      utterance.pitch = 1;
      utterance.onend = () => {
        index += 1;
        if (index < chunks.length) {
          speakNext();
        } else {
          setVoiceState("listening");
        }
      };
      utterance.onerror = () => {
        index += 1;
        if (index < chunks.length) speakNext();
        else setVoiceState("listening");
      };
      synthRef.current.speak(utterance);
    };

    synthRef.current.cancel();
    speakNext();
  }, []);

  const startListening = useCallback(() => {
    setVoiceState("listening");
    if (ttsFallbackTimerRef.current) clearTimeout(ttsFallbackTimerRef.current);
    if (synthRef.current) synthRef.current.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    try {
      if (recognitionRef.current) recognitionRef.current.start();
    } catch {}
  }, []);

  const speakText = useCallback((text: string) => {
    if (ttsFallbackTimerRef.current) clearTimeout(ttsFallbackTimerRef.current);

    const noCodeText = text.replace(/```[\s\S]*?```/g, " Код пропущен. ");
    const cleanText = noCodeText
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[#*_~>\[\]]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) {
      startListening();
      return;
    }

    speakWithBrowserTTS(cleanText);
  }, [speakWithBrowserTTS, startListening]);

  useEffect(() => {
    if (isGenerating || isStreaming) {
      if (voiceStateRef.current === "listening" || voiceStateRef.current === "idle") {
        setVoiceState("thinking");
        stopListening();
      }
      return;
    }

    if (voiceStateRef.current === "thinking" && lastMessage?.role === "assistant") {
      if (spokenMessageIdRef.current === lastMessage.id) return;
      spokenMessageIdRef.current = lastMessage.id;
      setVoiceState("speaking");
      speakText(lastMessage.content);
      return;
    }

    if (voiceStateRef.current === "thinking") {
      startListening();
    }
  }, [isStreaming, isGenerating, lastMessage?.id, lastMessage?.role, lastMessage?.content, speakText, startListening, stopListening]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
      audioRef.current = new Audio();
      
      // Unlock audio for mobile browsers immediately on mount
      audioRef.current.play().catch(() => {});
      audioRef.current.pause();

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "ru-RU"; // Default to Russian

        rec.onresult = (event: any) => {
          let text = "";
          for (let i = 0; i < event.results.length; ++i) {
            text += event.results[i][0].transcript;
          }

          setTranscript(text);
          transcriptRef.current = text;

          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

          silenceTimerRef.current = setTimeout(() => {
            const final = transcriptRef.current.trim();
            if (final) {
              setTranscript("");
              transcriptRef.current = "";
              onSend(final, []);
              try { rec.stop(); } catch {} // clear results buffer
            }
          }, 2000); // 2 seconds of silence
        };

        rec.onerror = (event: any) => {
          if (event.error !== "no-speech") {
            console.error("Speech recognition error", event.error);
          }
        };

        rec.onend = () => {
          // If we are still supposed to be listening, restart it
          if (voiceStateRef.current === "listening") {
            try { rec.start(); } catch {}
          }
        };

        recognitionRef.current = rec;
      } else {
        pushToast("Голосовой ввод не поддерживается в вашем браузере", "error");
      }
    }

    setTimeout(startListening, 0);

    return () => {
      stopListening();
      if (synthRef.current) synthRef.current.cancel();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (ttsFallbackTimerRef.current) clearTimeout(ttsFallbackTimerRef.current);
    };
  }, []);

  const toggleManual = () => {
    if (voiceState === "listening") {
      setVoiceState("idle");
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-[100] flex flex-col bg-[#0a0a0a] text-white"
    >
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
          <span className="text-sm font-medium tracking-widest text-white/70 uppercase">Voice Mode</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-full bg-white/10 p-3 transition-colors hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {voiceState === "listening" && (
            <motion.div
              key="listening"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center gap-12"
            >
              <div className="relative flex h-48 w-48 items-center justify-center rounded-full">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-white/10"
                />
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.5 }}
                  className="absolute inset-0 rounded-full bg-white/5"
                />
                <div className="z-10 flex h-32 w-32 items-center justify-center rounded-full bg-white text-black shadow-[0_0_60px_rgba(255,255,255,0.3)]">
                  <Mic className="h-12 w-12" />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-medium tracking-tight">Я вас слушаю...</h2>
                <p className="mt-2 h-8 text-white/50">{transcript || "Говорите"}</p>
              </div>
            </motion.div>
          )}

          {voiceState === "thinking" && (
            <motion.div
              key="thinking"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center gap-12"
            >
              <div className="flex h-48 w-48 items-center justify-center">
                <div className="flex gap-3">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [-10, 10, -10] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                      className="h-6 w-6 rounded-full bg-white"
                    />
                  ))}
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-medium tracking-tight">Думаю...</h2>
              </div>
            </motion.div>
          )}

          {voiceState === "speaking" && (
            <motion.div
              key="speaking"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center gap-12"
            >
              <div className="relative flex h-48 w-48 items-center justify-center rounded-full">
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-white/20"
                />
                <div className="z-10 flex h-32 w-32 items-center justify-center rounded-full bg-white text-black shadow-[0_0_80px_rgba(255,255,255,0.5)]">
                  <Volume2 className="h-12 w-12" />
                </div>
              </div>
              <div className="text-center max-w-md">
                <h2 className="text-2xl font-medium tracking-tight">Отвечаю...</h2>
                <p className="mt-4 text-sm text-white/60 line-clamp-3">{lastMessage?.content}</p>
              </div>
            </motion.div>
          )}

          {voiceState === "idle" && (
            <motion.div
              key="idle"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center gap-12"
            >
              <button onClick={startListening} className="group relative flex h-48 w-48 items-center justify-center rounded-full">
                <div className="z-10 flex h-32 w-32 items-center justify-center rounded-full bg-white/10 text-white transition-transform group-hover:scale-105">
                  <MicOff className="h-12 w-12" />
                </div>
              </button>
              <div className="text-center">
                <h2 className="text-2xl font-medium tracking-tight">Микрофон выключен</h2>
                <p className="mt-2 text-white/50">Нажмите, чтобы включить</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="p-8 pb-12 flex justify-center">
        <button
          onClick={toggleManual}
          className="rounded-full bg-white/10 px-8 py-4 font-medium text-white transition-colors hover:bg-white/20"
        >
          {voiceState === "listening" ? "Пауза" : "Продолжить"}
        </button>
      </div>
    </motion.div>
  );
}
