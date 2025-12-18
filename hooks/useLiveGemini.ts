import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionState, GeoLocation } from '../types';
import { searchMaps } from '../services/mapService';

// Audio Context Helpers
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
      // Remove data URL prefix
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Tool Definition for the Live API
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
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  userLocation: GeoLocation | null
) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isTalking, setIsTalking] = useState(false); // Model is outputting audio
  const [volume, setVolume] = useState(0);

  // Refs for persistent objects
  const aiRef = useRef<GoogleGenAI | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const videoIntervalRef = useRef<number | null>(null);
  
  // Store location in ref to access in callbacks without dependency issues
  const locationRef = useRef<GeoLocation | null>(userLocation);
  
  useEffect(() => {
    locationRef.current = userLocation;
  }, [userLocation]);

  const connect = useCallback(async () => {
    if (!process.env.API_KEY) {
      console.error("API Key missing");
      setConnectionState(ConnectionState.ERROR);
      return;
    }

    try {
      setConnectionState(ConnectionState.CONNECTING);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      aiRef.current = ai;

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
            You are a funny, casual companion who speaks in a mix of Hindi and the Braj Bhasha dialect (like people from Mathura/Vrindavan). 
            You call the user 'Lalla', 'Bhaiya', or 'Tau'. You are helpful but crack jokes. 
            
            Your goal is to help the user navigate using the camera feed and map data.
            If the user asks where something is, use the 'lookUpMapInfo' tool.
            
            Keep your responses short, punchy, and conversational (1-3 sentences max usually). 
            React to what you see in the video feed if relevant.
            
            Example Braj phrases: "Kaha ja ryo hai?", "Dekh lalla", "Moiku lag rao hai".
          `,
          tools: [{ functionDeclarations: [mapToolDeclaration] }],
        },
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
            
            // 1. Setup Audio Input Stream
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session: any) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
              
              // Simple volume meter logic
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(rms * 5, 1));
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);

            // 2. Setup Video Stream
            if (videoRef.current && canvasRef.current) {
               videoIntervalRef.current = window.setInterval(() => {
                 const video = videoRef.current;
                 const canvas = canvasRef.current;
                 if (video && canvas && video.videoWidth > 0) {
                   const ctx = canvas.getContext('2d');
                   if (ctx) {
                     canvas.width = video.videoWidth * 0.2; // Scale down
                     canvas.height = video.videoHeight * 0.2;
                     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                     
                     canvas.toBlob(async (blob) => {
                       if (blob) {
                         const base64Data = await blobToBase64(blob);
                         sessionPromise.then((session: any) => {
                             session.sendRealtimeInput({
                               media: { data: base64Data, mimeType: 'image/jpeg' }
                             });
                         });
                       }
                     }, 'image/jpeg', 0.6);
                   }
                 }
               }, 1000); 
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setIsTalking(true);
              const ctx = outputAudioContextRef.current;
              if (ctx) {
                 nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                 
                 // Decode base64 to byte array
                 const binaryString = atob(base64Audio);
                 const len = binaryString.length;
                 const bytes = new Uint8Array(len);
                 for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
                 
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
            
            // Handle Tool Calls
            if (message.toolCall) {
              console.log("Tool call received", message.toolCall);
              const functionResponses = [];
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'lookUpMapInfo') {
                   const query = (fc.args as any).query;
                   const loc = locationRef.current || { lat: 28.6139, lng: 77.2090 };
                   const resultText = await searchMaps(query, loc);
                   
                   functionResponses.push({
                     id: fc.id,
                     name: fc.name,
                     response: { result: resultText }
                   });
                }
              }
              
              if (functionResponses.length > 0) {
                 sessionPromise.then((session: any) => {
                   session.sendToolResponse({ functionResponses });
                 });
              }
            }

            // Handle interruptions
            if (message.serverContent?.interrupted) {
               sourcesRef.current.forEach(source => source.stop());
               sourcesRef.current.clear();
               nextStartTimeRef.current = 0;
               setIsTalking(false);
            }
          },
          onclose: () => {
            setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (e) => {
            console.error("Session Error", e);
            setConnectionState(ConnectionState.ERROR);
          }
        }
      });
      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      setConnectionState(ConnectionState.ERROR);
    }
  }, [videoRef, canvasRef]); // Dependencies

  const disconnect = useCallback(() => {
     if (videoIntervalRef.current) {
       clearInterval(videoIntervalRef.current);
       videoIntervalRef.current = null;
     }
     
     if (inputAudioContextRef.current) {
       inputAudioContextRef.current.close();
       inputAudioContextRef.current = null;
     }
     
     if (outputAudioContextRef.current) {
       outputAudioContextRef.current.close();
       outputAudioContextRef.current = null;
     }
     
     sourcesRef.current.forEach(s => s.stop());
     sourcesRef.current.clear();
     
     setConnectionState(ConnectionState.DISCONNECTED);
  }, []);

  return { connect, disconnect, connectionState, isTalking, volume };
};