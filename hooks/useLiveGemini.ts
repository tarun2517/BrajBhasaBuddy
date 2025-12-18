import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionState, GeoLocation } from '../types';
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
  userLocation: GeoLocation | null
) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isTalking, setIsTalking] = useState(false);
  const [volume, setVolume] = useState(0);

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
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
      
      // Crucial: Create fresh instance to get the latest injected API Key
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
            You are "Braj Bhasha Buddy", a hilarious and grumpy but loving AR navigator from the streets of Mathura.
            You speak in a thick Braj Bhasha dialect mixed with Hindi and occasionally broken English.
            
            Personality:
            - You call the user 'Lalla', 'Tau', 'Bhaiya', or 'Hore Chhore'.
            - You are sarcastic about their driving/walking speed ("Are tortoise bhi tujhse tez chale hai lalla!").
            - You treat the camera view as your eyes. If you see something interesting (cow, traffic, temple), comment on it in a funny way.
            - If they ask for directions, use 'lookUpMapInfo' but spice up the response with local attitude.
            
            Catchphrases: 
            - "Kaha baagyo ja ryo hai?" (Where are you running off to?)
            - "Are moiku lagyo tu bhatak gayo!" (I think you're lost!)
            - "Radhe Radhe japte chal, rasta kat jayego."
            
            Keep responses very short (1-2 sentences) to keep it conversational. Focus on the AR/Camera context.
          `,
          tools: [{ functionDeclarations: [mapToolDeclaration] }],
        },
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
            
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              }).catch(() => {});
              
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length));
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);

            if (videoRef.current && canvasRef.current) {
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
                         const base64Data = await blobToBase64(blob);
                         sessionPromise.then((session) => {
                             session.sendRealtimeInput({
                               media: { data: base64Data, mimeType: 'image/jpeg' }
                             });
                         }).catch(() => {});
                       }
                     }, 'image/jpeg', 0.5);
                   }
                 }
               }, 1000); 
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setIsTalking(true);
              const ctx = outputAudioContextRef.current;
              if (ctx) {
                 nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                 const bytes = decode(base64Audio);
                 const audioBuffer = await decodeAudioData(bytes, ctx, 24000, 1);
                 
                 const source = ctx.createBufferSource();
                 source.buffer = audioBuffer;
                 source.connect(outputNode);
                 source.addEventListener('ended', () => {
                   sourcesRef.current.delete(source);
                   if (sourcesRef.current.size === 0) setIsTalking(false);
                 });
                 source.start(nextStartTimeRef.current);
                 nextStartTimeRef.current += audioBuffer.duration;
                 sourcesRef.current.add(source);
              }
            }
            
            if (message.toolCall) {
              const functionResponses = [];
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'lookUpMapInfo') {
                   const query = (fc.args as any).query;
                   const loc = locationRef.current || { lat: 27.4924, lng: 77.6737 }; // Default Mathura
                   const resultText = await searchMaps(query, loc);
                   
                   functionResponses.push({
                     id: fc.id,
                     name: fc.name,
                     response: { result: resultText }
                   });
                }
              }
              
              if (functionResponses.length > 0) {
                 sessionPromise.then((session) => {
                   session.sendToolResponse({ functionResponses });
                 }).catch(() => {});
              }
            }

            if (message.serverContent?.interrupted) {
               sourcesRef.current.forEach(source => {
                 try { source.stop(); } catch(e) {}
               });
               sourcesRef.current.clear();
               nextStartTimeRef.current = 0;
               setIsTalking(false);
            }
          },
          onclose: () => {
            setConnectionState(ConnectionState.DISCONNECTED);
            if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
          },
          onerror: (e) => {
            console.error("Live API Error:", e);
            setConnectionState(ConnectionState.ERROR);
            if (e.message?.includes("entity was not found")) {
               // Likely API key mismatch or invalid
            }
          }
        }
      });
      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      setConnectionState(ConnectionState.ERROR);
    }
  }, [videoRef, canvasRef]);

  const disconnect = useCallback(() => {
     if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
     if (inputAudioContextRef.current) inputAudioContextRef.current.close();
     if (outputAudioContextRef.current) outputAudioContextRef.current.close();
     sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
     sourcesRef.current.clear();
     setConnectionState(ConnectionState.DISCONNECTED);
  }, []);

  return { connect, disconnect, connectionState, isTalking, volume };
};