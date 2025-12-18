import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Power, AlertTriangle, MessageCircle, Map as MapIcon, Key, ExternalLink, Compass, ShieldCheck, RefreshCw } from 'lucide-react';
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

  const onResetKey = useCallback(async () => {
    setHasApiKey(false);
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
    }
    // Proceed assuming key will be available via process.env.API_KEY or the selection
    setHasApiKey(true);
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
          setHasApiKey(selected || !!process.env.API_KEY);
        } else {
          setHasApiKey(!!process.env.API_KEY);
        }
      } catch (e) {
        setHasApiKey(!!process.env.API_KEY);
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
            (err) => console.warn("Location error", err),
            { enableHighAccuracy: true }
          );
        }
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" },
          audio: true
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        setPermissionError("Are lalla! Camera aur location ki bina rasta kaise dikhayenge? Permission de de!");
      }
    };
    initPerms();
  }, []);

  const handleOpenKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
    }
    setHasApiKey(true);
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
      <RefreshCw className="w-10 h-10 text-orange-500 animate-spin" />
    </div>
  );

  if (!hasApiKey) {
    return (
      <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center p-8 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-900/20 via-black to-black opacity-50" />
        
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-orange-600 blur-[120px] opacity-30 animate-pulse" />
          <div className="braj-gradient p-10 rounded-[3.5rem] relative shadow-2xl border border-white/10 group transform transition-transform hover:scale-105">
            <MapIcon className="w-24 h-24 text-white" />
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-br from-orange-400 via-red-500 to-yellow-500 uppercase tracking-tighter italic">
            Braj Buddy
          </h1>
          <p className="text-gray-400 mb-10 max-w-sm text-lg leading-relaxed font-medium">
            Radhe Radhe! Connect your Gemini API key to start your funny AR journey through Mathura and beyond.
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={handleOpenKey}
              className="flex items-center gap-4 px-12 py-6 braj-gradient rounded-full font-black text-2xl hover:scale-105 transition-all shadow-[0_0_50px_rgba(249,115,22,0.4)] active:scale-95 group"
            >
              <Key className="w-8 h-8 group-hover:rotate-45 transition-transform" />
              Configure API Key
            </button>
            
            <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em] font-bold">
              Powered by Gemini 2.5 Flash
            </p>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center gap-4 opacity-50">
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure Connection to Google AI</span>
          </div>
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-xs text-gray-500 hover:text-orange-500 underline transition-colors">
            Setup Billing Documentation
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
        className="absolute inset-0 w-full h-full object-cover z-0 brightness-[0.45] scale-110 blur-[1px]"
      />

      {/* Dynamic Mandala Overlay */}
      <div className={`absolute inset-0 z-5 pointer-events-none transition-opacity duration-1000 ${isTalking ? 'opacity-30' : 'opacity-10'}`}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] border-[0.5px] border-orange-500/20 rounded-full animate-[spin_40s_linear_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border-[1px] border-yellow-500/10 rounded-full animate-[spin_25s_linear_infinite_reverse]" />
      </div>

      {/* Permission Block */}
      {permissionError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-8">
          <div className="text-center">
            <AlertTriangle className="w-28 h-28 text-red-500 mx-auto mb-8 animate-bounce" />
            <h1 className="text-5xl font-black text-white mb-4 uppercase tracking-tighter">Ruk Ja Lalla!</h1>
            <p className="text-gray-400 mb-10 max-w-xs mx-auto text-xl leading-relaxed italic">{permissionError}</p>
            <button onClick={() => window.location.reload()} className="px-14 py-6 braj-gradient rounded-full font-black text-xl shadow-2xl">
              Fir Se Koshish Kar
            </button>
          </div>
        </div>
      )}

      {/* UI Overlay */}
      <div className="relative z-10 h-full flex flex-col justify-between p-6 pointer-events-none">
        
        {/* Top Header */}
        <div className="flex flex-col gap-5 pointer-events-auto">
          <div className="flex justify-between items-center">
            <div className="glass px-6 py-3 rounded-2xl flex items-center gap-4 border-orange-500/20 shadow-2xl">
              <div className={`w-3.5 h-3.5 rounded-full ${
                connectionState === ConnectionState.CONNECTED ? 'bg-green-500 shadow-[0_0_20px_#22c55e]' : 
                connectionState === ConnectionState.CONNECTING ? 'bg-yellow-500 animate-pulse' : 'bg-red-500 shadow-[0_0_15px_#ef4444]'
              }`} />
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white">
                  Cyber Buddy
                </span>
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">
                  {connectionState === ConnectionState.CONNECTED ? 'Gunda Online' : 'Soya hua hai'}
                </span>
              </div>
            </div>
            
            <button onClick={onResetKey} className="glass p-4 rounded-2xl hover:bg-white/20 transition-all border-white/5 active:scale-90">
              <Key className="w-6 h-6 text-white/60" />
            </button>
          </div>

          {/* Map Link Portals */}
          {mapResult && mapResult.links.length > 0 && (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-10 duration-700">
              <span className="text-[10px] font-black text-orange-400/80 uppercase tracking-[0.3em] px-2 mb-1">Divine Gateways:</span>
              {mapResult.links.map((link, idx) => (
                <a 
                  key={idx} 
                  href={link.uri} 
                  target="_blank" 
                  className="glass-portal px-6 py-5 rounded-[2rem] flex items-center justify-between border-orange-500/40 bg-orange-600/10 hover:bg-orange-600/30 transition-all group shadow-2xl"
                >
                  <div className="flex items-center gap-5">
                    <div className="bg-orange-500/20 p-3 rounded-2xl group-hover:bg-orange-500/40 transition-colors">
                      <MapPin className="w-7 h-7 text-orange-400" />
                    </div>
                    <span className="text-lg font-black text-white uppercase tracking-tight">{link.title}</span>
                  </div>
                  <ExternalLink className="w-6 h-6 text-white/30 group-hover:text-white transition-all transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Visualizer */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {connectionState === ConnectionState.CONNECTED && (
             <div className="relative group flex items-center justify-center">
                <div className="flex items-center gap-2.5 h-48 px-10">
                  {[...Array(24)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-3 bg-gradient-to-t from-orange-600 via-red-500 to-yellow-400 rounded-full transition-all duration-75 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                      style={{ 
                        height: isTalking ? `${Math.random() * 95 + 5}%` : `${Math.max(10, volume * 500)}%`,
                        transitionDelay: `${i * 8}ms`
                      }}
                    />
                  ))}
                </div>
                {isTalking && (
                  <div className="absolute -bottom-16 glass px-6 py-2.5 rounded-full border-orange-500/40 shadow-2xl animate-pulse">
                    <span className="text-xs font-black text-white uppercase tracking-[0.4em]">Listening to the Gunda...</span>
                  </div>
                )}
             </div>
          )}
        </div>

        {/* Controls Footer */}
        <div className="flex flex-col gap-10 items-center pointer-events-auto pb-16">
          
          {connectionState === ConnectionState.DISCONNECTED && (
            <div className="glass p-10 rounded-[3rem] border-white/5 text-center max-w-sm shadow-[0_30px_60px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-bottom-10 duration-1000">
               <div className="relative mb-6">
                  <Compass className="w-16 h-16 text-orange-500 mx-auto animate-[spin_10s_linear_infinite]" />
                  <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-20" />
               </div>
               <h3 className="text-3xl font-black text-white mb-3 uppercase tracking-tighter italic">Radhe Radhe!</h3>
               <p className="text-sm text-white/40 leading-relaxed font-bold uppercase tracking-widest italic px-4">
                 Suno Lalla, button dabao aur Buddy se baat karo. Kaha ja ryo hai?
               </p>
            </div>
          )}

          <div className="relative">
            <button
              onClick={handleToggleConnection}
              disabled={connectionState === ConnectionState.CONNECTING}
              className={`
                w-32 h-32 rounded-[3.5rem] flex items-center justify-center transition-all duration-700 relative z-20 shadow-[0_25px_60px_rgba(0,0,0,0.6)]
                ${connectionState === ConnectionState.CONNECTED ? 'bg-red-600 shadow-red-600/30' : 'braj-gradient shadow-orange-600/30'}
                ${connectionState === ConnectionState.CONNECTING ? 'opacity-50 cursor-wait' : 'hover:scale-110 active:scale-90 hover:rotate-6'}
              `}
            >
              {connectionState === ConnectionState.CONNECTED ? (
                <Power className="w-14 h-14 text-white" />
              ) : (
                <MessageCircle className="w-14 h-14 text-white" />
              )}
            </button>
            {connectionState === ConnectionState.CONNECTED && (
              <div className="absolute inset-0 rounded-[3.5rem] bg-red-600 animate-ping opacity-30 z-10" />
            )}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-[11px] font-black uppercase tracking-[0.5em] text-white/20 group-hover:text-orange-500 transition-all duration-500">
                {connectionState === ConnectionState.CONNECTED ? 'Kaat De' : 'Buddy Ko Bula'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .glass-portal {
          background: rgba(255, 100, 0, 0.12);
          backdrop-filter: blur(35px);
          -webkit-backdrop-filter: blur(35px);
          border: 1px solid rgba(255, 255, 255, 0.12);
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