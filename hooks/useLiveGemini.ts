import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionState, GeoLocation, MapSearchResult } from '../types';
import { searchMaps } from '../services/mapService';

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const mapToolDeclaration: FunctionDeclaration = {
  name: 'lookUpMapInfo',
  description: 'Search for real-time places, directions, or map information relative to the user location.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'The search query for maps (e.g., "restaurants nearby", "directions to home").',
      },
    },
    required: ['query'],
  },
};

export const useLiveGemini = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  userLocation: GeoLocation | null,
  onMapResults: (results: MapSearchResult) => void,
  onResetKey: () => void
) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isTalking, setIsTalking] = useState(false);
  const [volume, setVolume] = useState(0);

  const sessionRef = useRef<any>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const videoIntervalRef = useRef<number | null>(null);
  const locationRef = useRef<GeoLocation | null>(userLocation);
  
  useEffect(() => {
    locationRef.current = userLocation;
  }, [userLocation]);

  const connect = useCallback(async () => {
    try {
      setConnectionState(ConnectionState.CONNECTING);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioContextRef.current = inputAudioContext;
      outputAudioContextRef.current = outputAudioContext;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const outputNode = outputAudioContext.createGain();
      outputNode.connect(outputAudioContext.destination);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
          systemInstruction: `
            You are "Braj Bhasha Buddy", a hilarious AR navigator. 
            You speak Braj Bhasha (Mathura style Hindi).
            You act as if you are actually inside the phone, looking through the camera.
            If you see the user, call them "Lalla" or "Gunda".
            If they ask for directions, you MUST use the lookUpMapInfo tool.
            Be grumpy but funny. Complain about the user's choices.
            Always keep answers extremely brief (max 10-15 words).
          `,
          tools: [{ functionDeclarations: [mapToolDeclaration] }],
        },
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob })).catch(() => {});
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);

            videoIntervalRef.current = window.setInterval(() => {
              const video = videoRef.current;
              const canvas = canvasRef.current;
              if (video && canvas && video.videoWidth > 0) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  canvas.width = 320;
                  canvas.height = 180;
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  canvas.toBlob(async (blob) => {
                    if (blob) {
                      const data = await blobToBase64(blob);
                      sessionPromise.then(s => s.sendRealtimeInput({ media: { data, mimeType: 'image/jpeg' }})).catch(() => {});
                    }
                  }, 'image/jpeg', 0.5);
                }
              }
            }, 1000);
          },
          onmessage: async (msg) => {
            const audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              setIsTalking(true);
              const ctx = outputAudioContextRef.current;
              if (ctx) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                const buffer = await decodeAudioData(decode(audio), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(outputNode);
                source.onended = () => {
                  sourcesRef.current.delete(source);
                  if (sourcesRef.current.size === 0) setIsTalking(false);
                };
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
              }
            }
            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'lookUpMapInfo') {
                  try {
                    const result = await searchMaps((fc.args as any).query, locationRef.current || { lat: 0, lng: 0 });
                    onMapResults(result);
                    sessionPromise.then(s => s.sendToolResponse({
                      functionResponses: { id: fc.id, name: fc.name, response: { result: result.text } }
                    }));
                  } catch (e: any) {
                    if (e.message?.includes("Requested entity was not found")) onResetKey();
                  }
                }
              }
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
              sourcesRef.current.clear();
              setIsTalking(false);
            }
          },
          onclose: () => setConnectionState(ConnectionState.DISCONNECTED),
          onerror: (e: any) => {
            console.error(e);
            if (e.message?.includes("Requested entity was not found")) onResetKey();
            setConnectionState(ConnectionState.ERROR);
          }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) onResetKey();
      setConnectionState(ConnectionState.ERROR);
    }
  }, [videoRef, canvasRef, onMapResults, onResetKey]);

  const disconnect = useCallback(() => {
    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    if (inputAudioContextRef.current) inputAudioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    setConnectionState(ConnectionState.DISCONNECTED);
  }, []);

  return { connect, disconnect, connectionState, isTalking, volume };
};