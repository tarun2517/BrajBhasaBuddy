import React, { useEffect, useRef, useState } from 'react';
import { Camera, MapPin, Mic, MicOff, Navigation, Power, AlertTriangle, MessageCircle, Map as MapIcon, Send, Key } from 'lucide-react';
import { useLiveGemini } from './hooks/useLiveGemini';
import { ConnectionState, GeoLocation } from './types';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [destination, setDestination] = useState("");
  const [currentDestination, setCurrentDestination] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  
  const { connect, disconnect, connectionState, isTalking, volume } = useLiveGemini(videoRef, canvasRef, location);

  useEffect(() => {
    const checkApiKey = async () => {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    };
    checkApiKey();

    const init = async () => {
      try {
        if ('geolocation' in navigator) {
          navigator.geolocation.watchPosition(
            (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.warn("Geo error", err),
            { enableHighAccuracy: true }
          );
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setPermissionError("Camera aur Location ki permission to de de lalla!");
      }
    };
    init();
  }, []);

  const handleOpenKey = async () => {
    await window.aistudio.openSelectKey();
    setHasApiKey(true);
  };

  const handleToggleConnection = () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  const setTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (destination.trim()) {
      setCurrentDestination(destination.trim());
      // Logic for Buddy to react to new destination can be handled via its system prompt and current context
    }
  };

  if (!hasApiKey) {
    return (
      <div className="h-screen w-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center">
        <div className="braj-gradient p-4 rounded-3xl mb-8 shadow-2xl shadow-orange-500/20">
          <MapIcon className="w-16 h-16 text-white" />
        </div>
        <h1 className="text-4xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 uppercase tracking-tighter">Braj Bhasha Buddy</h1>
        <p className="text-gray-400 mb-8 max-w-sm">
          Are Lalla! This app needs a paid Gemini API key to talk and show maps. Select yours to start the journey.
        </p>
        <button 
          onClick={handleOpenKey}
          className="flex items-center gap-3 px-8 py-4 braj-gradient rounded-full font-bold text-lg hover:scale-105 transition-transform active:scale-95"
        >
          <Key className="w-6 h-6" />
          Select API Key
        </button>
        <p className="mt-6 text-xs text-gray-500">
          More info at <a href="https://ai.google.dev/gemini-api/docs/billing" className="underline" target="_blank">ai.google.dev/gemini-api/docs/billing</a>
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center font-sans">
      <canvas ref={canvasRef} className="hidden" />

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover z-0 brightness-75 transition-all duration-1000 scale-[1.02]"
      />

      {permissionError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-8">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-2 uppercase tracking-tight">Are Lalla!</h1>
            <p className="text-gray-300 mb-6 font-medium">{permissionError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 braj-gradient text-white rounded-full font-bold hover:opacity-90 transition-all"
            >
              Fir se koshish kar
            </button>
          </div>
        </div>
      )}

      {/* HUD Layer */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 pointer-events-none">
        
        {/* Top Section - Search & Stats */}
        <div className="space-y-4 pointer-events-auto">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1.5">
              <div className="glass rounded-full px-4 py-2 flex items-center gap-3 text-white shadow-xl">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  connectionState === ConnectionState.CONNECTED ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]' : 
                  connectionState === ConnectionState.CONNECTING ? 'bg-yellow-500 animate-pulse' : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                }`} />
                <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-90">
                    {connectionState === ConnectionState.CONNECTED ? 'Buddy Online' : 
                     connectionState === ConnectionState.CONNECTING ? 'Bula ryo hu...' : 'Offline'}
                </span>
              </div>
            </div>

            <button 
              onClick={handleOpenKey}
              className="glass p-2.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <Key className="w-5 h-5 text-white/60" />
            </button>
          </div>

          <form onSubmit={setTarget} className="flex gap-2 w-full max-w-md mx-auto">
             <div className="flex-1 glass rounded-2xl flex items-center px-4 py-3 shadow-2xl">
                <MapPin className="w-5 h-5 text-orange-400 mr-3" />
                <input 
                  type="text" 
                  placeholder="Kaha ja ryo hai lalla?" 
                  className="bg-transparent text-white placeholder-white/40 border-none outline-none w-full text-sm font-semibold"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
             </div>
             <button type="submit" className="glass p-3 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all active:scale-90">
                <Send className="w-5 h-5 text-orange-400" />
             </button>
          </form>

          {currentDestination && (
             <div className="flex justify-center">
                <div className="bg-orange-500/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-orange-500/30 flex items-center gap-2">
                   <Navigation className="w-3 h-3 text-orange-400" />
                   <span className="text-[10px] font-bold text-orange-200 uppercase tracking-widest">
                     Target: {currentDestination}
                   </span>
                </div>
             </div>
          )}
        </div>

        {/* Dynamic Voice Feedback */}
        <div className="flex-1 flex items-center justify-center">
            {(connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) && (
                <div className="flex flex-col items-center gap-6">
                    <div className="flex items-center justify-center gap-2 h-24">
                         {[...Array(12)].map((_, i) => {
                             const isActive = isTalking || volume > 0.01;
                             const scale = isTalking ? (Math.random() * 1.8 + 0.4) : (volume * 20 * (i % 2 === 0 ? 1 : 1.3));
                             return (
                                <div 
                                    key={i}
                                    className={`w-1.5 bg-gradient-to-t from-orange-600 to-yellow-400 rounded-full transition-all duration-150 ${!isActive ? 'opacity-10 h-2' : 'opacity-100 h-20'}`}
                                    style={{ 
                                        height: isActive ? `${Math.min(100, 15 + (scale * 40))}%` : '8px',
                                        transitionDelay: `${i * 20}ms`
                                    }}
                                 />
                             );
                         })}
                    </div>
                    {isTalking && (
                        <div className="px-6 py-3 glass rounded-2xl border border-orange-500/30 animate-pulse shadow-2xl shadow-orange-500/20">
                             <p className="text-white font-black text-xs tracking-[0.1em] uppercase">"Suno Lalla..."</p>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col gap-6 pointer-events-auto items-center pb-6">
            {connectionState === ConnectionState.DISCONNECTED && (
                 <div className="glass p-6 rounded-[2.5rem] max-w-xs text-center border border-white/20 shadow-2xl transition-all duration-700 animate-in slide-in-from-bottom-20">
                    <div className="braj-gradient w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2 tracking-tighter">RADHE RADHE!</h2>
                    <p className="text-sm text-gray-200/80 font-medium leading-relaxed mb-4">
                        Apne Braj Buddy se baat kar. Poochh "Bhaiya, Vrindavan kitni door hai?"
                    </p>
                    <div className="flex items-center justify-center gap-1.5">
                       <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                       <div className="w-1.5 h-1.5 rounded-full bg-orange-500 opacity-50" />
                       <div className="w-1.5 h-1.5 rounded-full bg-orange-500 opacity-20" />
                    </div>
                 </div>
            )}

            <div className="flex flex-col items-center gap-4">
              <button
                  onClick={handleToggleConnection}
                  disabled={connectionState === ConnectionState.CONNECTING}
                  className={`
                      w-28 h-28 rounded-[2.5rem] flex items-center justify-center shadow-2xl transition-all duration-500 group relative
                      ${connectionState === ConnectionState.CONNECTED 
                          ? 'bg-red-500 shadow-red-500/40 rotate-180' 
                          : 'braj-gradient shadow-orange-500/40'
                      }
                      ${connectionState === ConnectionState.CONNECTING ? 'opacity-50 cursor-not-allowed grayscale' : 'active:scale-95 hover:scale-105'}
                  `}
              >
                  {connectionState === ConnectionState.CONNECTED ? (
                      <Power className="w-10 h-10 text-white" />
                  ) : (
                      <Mic className="w-10 h-10 text-white" />
                  )}
                  {connectionState === ConnectionState.CONNECTED && (
                    <div className="absolute -inset-4 rounded-[3rem] border-2 border-red-500/30 animate-ping pointer-events-none" />
                  )}
              </button>
              
              <p className="text-[10px] text-white/50 font-black uppercase tracking-[0.3em] bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                  {connectionState === ConnectionState.CONNECTED ? 'Kaat de baatcheet' : 'Buddy ko bulao'}
              </p>
            </div>
        </div>
      </div>
      
      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-white/10 rounded-tl-3xl m-4 pointer-events-none" />
      <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-white/10 rounded-tr-3xl m-4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-white/10 rounded-bl-3xl m-4 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-white/10 rounded-br-3xl m-4 pointer-events-none" />
    </div>
  );
};

export default App;