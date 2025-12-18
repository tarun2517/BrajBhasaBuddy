import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Power, AlertTriangle, MessageCircle, Map as MapIcon, Key, ExternalLink, Compass, ShieldCheck } from 'lucide-react';
import { useLiveGemini } from './hooks/useLiveGemini';
import { ConnectionState, GeoLocation, MapSearchResult } from './types';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [mapResult, setMapResult] = useState<MapSearchResult | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Robust function to handle key resetting and prompting
  const onResetKey = useCallback(async () => {
    setHasApiKey(false);
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
    } else {
      console.warn("Key selection dialog not available in this environment.");
    }
    setHasApiKey(true); // Assume success to proceed as per instructions
  }, []);

  const { connect, disconnect, connectionState, isTalking, volume } = useLiveGemini(
    videoRef, 
    canvasRef, 
    location, 
    setMapResult, 
    onResetKey
  );

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
          const selected = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(selected);
        } else {
          // If the AI Studio API is missing, we check if process.env.API_KEY is present
          setHasApiKey(!!process.env.API_KEY);
        }
      } catch (e) {
        setHasApiKey(true); // Default to true to allow the app to attempt a connection
      } finally {
        setIsInitializing(false);
      }
    };
    checkApiKey();

    const initPerms = async () => {
      try {
        if ('geolocation' in navigator) {
          navigator.geolocation.watchPosition(
            (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.warn("Location access denied", err),
            { enableHighAccuracy: true }
          );
        }
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" },
          audio: true
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        setPermissionError("Are lalla! Camera aur location to chahiye tabhi to batayenge rasta!");
      }
    };
    initPerms();
  }, []);

  const handleOpenKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
    }
    setHasApiKey(true); // Proceed immediately to avoid race conditions
  };

  const handleToggleConnection = () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  if (isInitializing) return (
    <div className="h-screen w-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  if (!hasApiKey) {
    return (
      <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center p-8 text-center">
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-orange-600 blur-[100px] opacity-20 animate-pulse"></div>
          <div className="braj-gradient p-8 rounded-[3rem] relative shadow-2xl border border-white/10">
            <MapIcon className="w-24 h-24 text-white" />
          </div>
        </div>
        <h1 className="text-5xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-br from-orange-400 via-red-500 to-purple-600 uppercase tracking-tighter">
          Braj Cyber Buddy
        </h1>
        <p className="text-gray-400 mb-10 max-w-sm text-lg leading-relaxed">
          Ram Ram Ji! To start talking with your AR guide, please select your Paid Gemini API key.
        </p>
        <button 
          onClick={handleOpenKey}
          className="flex items-center gap-4 px-12 py-5 braj-gradient rounded-full font-black text-xl hover:scale-105 transition-all shadow-2xl shadow-orange-600/40 active:scale-95 group"
        >
          <Key className="w-7 h-7 group-hover:rotate-45 transition-transform" />
          Select API Key
        </button>
        <div className="mt-12 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-gray-600 text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure Enterprise Connection</span>
          </div>
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-xs text-gray-500 hover:text-orange-500 underline transition-colors">
            Billing & API Setup Docs
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      <canvas ref={canvasRef} className="hidden" />

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover z-0 brightness-[0.5] scale-[1.05]"
      />

      {/* Dynamic Mandala HUD */}
      <div className={`absolute inset-0 z-5 pointer-events-none transition-opacity duration-1000 ${isTalking ? 'opacity-40' : 'opacity-0'}`}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] border-[1px] border-orange-500/20 rounded-full animate-[spin_30s_linear_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border-[2px] border-yellow-500/10 rounded-full animate-[spin_20s_linear_infinite_reverse]" />
      </div>

      {/* Permission Block */}
      {permissionError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-8">
          <div className="text-center">
            <AlertTriangle className="w-24 h-24 text-red-500 mx-auto mb-6 animate-bounce" />
            <h1 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">Are Lalla!</h1>
            <p className="text-gray-400 mb-8 max-w-xs mx-auto text-lg leading-relaxed">{permissionError}</p>
            <button onClick={() => window.location.reload()} className="px-12 py-5 braj-gradient rounded-full font-black text-lg">Fir se koshish kar</button>
          </div>
        </div>
      )}

      {/* Main UI Overlay */}
      <div className="relative z-10 h-full flex flex-col justify-between p-6 pointer-events-none">
        
        {/* Top Section */}
        <div className="flex flex-col gap-4 pointer-events-auto">
          <div className="flex justify-between items-center">
            <div className="glass px-6 py-3 rounded-full flex items-center gap-3 border-orange-500/30">
              <div className={`w-3 h-3 rounded-full ${
                connectionState === ConnectionState.CONNECTED ? 'bg-green-500 shadow-[0_0_20px_#22c55e]' : 
                connectionState === ConnectionState.CONNECTING ? 'bg-yellow-500 animate-pulse' : 'bg-red-500 shadow-[0_0_15px_#ef4444]'
              }`} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
                {connectionState === ConnectionState.CONNECTED ? 'Cyber Buddy Online' : 
                 connectionState === ConnectionState.CONNECTING ? 'Bula ryo hu...' : 'Offline'}
              </span>
            </div>
            <button onClick={onResetKey} className="glass p-4 rounded-full hover:bg-white/20 transition-all active:scale-90 border-white/5">
              <Key className="w-6 h-6 text-white/60" />
            </button>
          </div>

          {/* Map Grounding Link Display */}
          {mapResult && mapResult.links.length > 0 && (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-6 duration-500">
              <p className="text-[10px] font-bold text-orange-400/80 uppercase tracking-widest px-2">Divya Marg (Map Results):</p>
              {mapResult.links.map((link, idx) => (
                <a 
                  key={idx} 
                  href={link.uri} 
                  target="_blank" 
                  className="glass-bright px-5 py-4 rounded-[1.5rem] flex items-center justify-between border-orange-500/50 bg-orange-600/20 hover:bg-orange-600/40 transition-all group shadow-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-2 rounded-xl">
                      <MapPin className="w-6 h-6 text-orange-400" />
                    </div>
                    <span className="text-sm font-black text-white uppercase tracking-tight">{link.title}</span>
                  </div>
                  <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Visualizer center */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {connectionState === ConnectionState.CONNECTED && (
             <div className="relative group">
                <div className="flex items-center gap-2 h-40">
                  {[...Array(18)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-2.5 bg-gradient-to-t from-orange-600 via-yellow-400 to-red-500 rounded-full transition-all duration-75"
                      style={{ 
                        height: isTalking ? `${Math.random() * 90 + 10}%` : `${Math.max(10, volume * 400)}%`,
                        transitionDelay: `${i * 10}ms`
                      }}
                    />
                  ))}
                </div>
                {isTalking && (
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 glass px-4 py-1.5 rounded-full border-orange-500/40 animate-pulse">
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Suno Lalla...</span>
                  </div>
                )}
             </div>
          )}
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col gap-8 items-center pointer-events-auto pb-12">
          
          {/* Instructions Box */}
          {connectionState === ConnectionState.DISCONNECTED && (
            <div className="glass p-8 rounded-[2.5rem] border-white/5 text-center max-w-sm shadow-2xl animate-in fade-in zoom-in duration-700">
               <div className="relative mb-4">
                  <Compass className="w-12 h-12 text-orange-500 mx-auto animate-[spin_8s_linear_infinite]" />
               </div>
               <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter italic">Radhe Radhe!</h3>
               <p className="text-xs text-white/50 leading-relaxed font-bold uppercase tracking-widest">
                 Poochh lalla, rasta kaha ka hai? Ya bas camera dikha de moiku!
               </p>
            </div>
          )}

          <div className="relative">
            <button
              onClick={handleToggleConnection}
              disabled={connectionState === ConnectionState.CONNECTING}
              className={`
                w-28 h-28 rounded-[2.5rem] flex items-center justify-center transition-all duration-500 relative z-20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]
                ${connectionState === ConnectionState.CONNECTED ? 'bg-red-600 shadow-red-600/30 rotate-180' : 'braj-gradient shadow-orange-600/30'}
                ${connectionState === ConnectionState.CONNECTING ? 'opacity-50 cursor-wait grayscale' : 'hover:scale-110 active:scale-90 hover:rotate-12'}
              `}
            >
              {connectionState === ConnectionState.CONNECTED ? (
                <Power className="w-12 h-12 text-white" />
              ) : (
                <MessageCircle className="w-12 h-12 text-white" />
              )}
            </button>
            {connectionState === ConnectionState.CONNECTED && (
              <div className="absolute inset-0 rounded-[2.5rem] bg-red-600 animate-ping opacity-30 z-10" />
            )}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 group-hover:text-orange-500 transition-all duration-300">
                {connectionState === ConnectionState.CONNECTED ? 'Kaat de baatcheet' : 'Buddy se baat kar'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .glass-bright {
          background: rgba(255, 80, 0, 0.2);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        @keyframes spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default App;