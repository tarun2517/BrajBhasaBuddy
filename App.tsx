import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Power, AlertTriangle, MessageCircle, Map as MapIcon, Send, Key, ExternalLink, Compass } from 'lucide-react';
import { useLiveGemini } from './hooks/useLiveGemini';
import { ConnectionState, GeoLocation, MapSearchResult } from './types';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [destination, setDestination] = useState("");
  const [mapResult, setMapResult] = useState<MapSearchResult | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const onResetKey = useCallback(async () => {
    setHasApiKey(false);
    await window.aistudio.openSelectKey();
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
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
      setIsInitializing(false);
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
        setPermissionError("Are lalla! Camera aur location to chahiye tabhi to batayenge rasta!");
      }
    };
    initPerms();
  }, []);

  const handleOpenKey = async () => {
    await window.aistudio.openSelectKey();
    setHasApiKey(true); // Proceed immediately as per instructions
  };

  const handleToggleConnection = () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  if (isInitializing) return null;

  if (!hasApiKey) {
    return (
      <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center p-8 text-center">
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-orange-600 blur-3xl opacity-20 animate-pulse"></div>
          <div className="braj-gradient p-6 rounded-[2.5rem] relative shadow-2xl">
            <MapIcon className="w-20 h-20 text-white" />
          </div>
        </div>
        <h1 className="text-5xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-br from-orange-400 via-red-500 to-purple-600 uppercase tracking-tighter">
          Braj Cyber Buddy
        </h1>
        <p className="text-gray-400 mb-10 max-w-sm text-lg leading-relaxed">
          Ram Ram Ji! To start talking with your AR guide, please select your Gemini API key.
        </p>
        <button 
          onClick={handleOpenKey}
          className="flex items-center gap-4 px-10 py-5 braj-gradient rounded-full font-black text-xl hover:scale-105 transition-all shadow-xl shadow-orange-600/20 active:scale-95"
        >
          <Key className="w-7 h-7" />
          Select API Key
        </button>
        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="mt-8 text-xs text-gray-600 hover:text-orange-500 underline transition-colors">
          Billing Documentation
        </a>
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
        className="absolute inset-0 w-full h-full object-cover z-0 brightness-[0.6] grayscale-[0.2]"
      />

      {/* Braj Mandala Background Animation for talking */}
      <div className={`absolute inset-0 z-5 pointer-events-none transition-opacity duration-700 ${isTalking ? 'opacity-30' : 'opacity-0'}`}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border-[2px] border-orange-500/30 rounded-full animate-[spin_20s_linear_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border-[1px] border-yellow-500/20 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
      </div>

      {/* Permission Block */}
      {permissionError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-8">
          <div className="text-center">
            <AlertTriangle className="w-20 h-20 text-yellow-500 mx-auto mb-6 animate-bounce" />
            <h1 className="text-3xl font-black text-white mb-4 uppercase">Ruk Ja Lalla!</h1>
            <p className="text-gray-400 mb-8 max-w-xs mx-auto">{permissionError}</p>
            <button onClick={() => window.location.reload()} className="px-8 py-4 braj-gradient rounded-full font-bold">Try Again</button>
          </div>
        </div>
      )}

      {/* Main UI Overlay */}
      <div className="relative z-10 h-full flex flex-col justify-between p-6 pointer-events-none">
        
        {/* Top Section */}
        <div className="flex flex-col gap-4 pointer-events-auto">
          <div className="flex justify-between items-start">
            <div className="glass px-5 py-2.5 rounded-full flex items-center gap-3 border-orange-500/20">
              <div className={`w-3 h-3 rounded-full ${
                connectionState === ConnectionState.CONNECTED ? 'bg-green-500 shadow-[0_0_15px_#22c55e]' : 
                connectionState === ConnectionState.CONNECTING ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span className="text-xs font-black uppercase tracking-widest text-white/90">
                {connectionState === ConnectionState.CONNECTED ? 'Buddy Online' : 'Buddy Offline'}
              </span>
            </div>
            <button onClick={onResetKey} className="glass p-3 rounded-full hover:bg-white/10 transition-all">
              <Key className="w-5 h-5 text-white/50" />
            </button>
          </div>

          {/* Map Grounding Link Display */}
          {mapResult && mapResult.links.length > 0 && (
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-4">
              {mapResult.links.map((link, idx) => (
                <a 
                  key={idx} 
                  href={link.uri} 
                  target="_blank" 
                  className="glass-bright px-4 py-3 rounded-2xl flex items-center justify-between border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-orange-400" />
                    <span className="text-sm font-bold text-white">{link.title}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Visualizer center */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {connectionState === ConnectionState.CONNECTED && (
             <div className="relative">
                <div className="flex items-center gap-1.5 h-32">
                  {[...Array(16)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-2 bg-gradient-to-t from-orange-600 via-yellow-400 to-orange-600 rounded-full transition-all duration-100"
                      style={{ height: isTalking ? `${Math.random() * 80 + 20}%` : `${Math.max(8, volume * 300)}%` }}
                    />
                  ))}
                </div>
             </div>
          )}
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col gap-6 items-center pointer-events-auto pb-8">
          
          {/* Instructions Box */}
          {connectionState === ConnectionState.DISCONNECTED && (
            <div className="glass p-6 rounded-[2rem] border-white/10 text-center max-w-xs shadow-2xl animate-in fade-in zoom-in duration-500">
               <Compass className="w-10 h-10 text-orange-500 mx-auto mb-3 animate-[spin_4s_linear_infinite]" />
               <p className="text-white font-bold mb-1">Ram Ram Ji!</p>
               <p className="text-xs text-white/60 leading-relaxed uppercase tracking-tight">Poochh lalla, kaha jana hai? Ya fir camera dikha de!</p>
            </div>
          )}

          <div className="relative group">
            <button
              onClick={handleToggleConnection}
              disabled={connectionState === ConnectionState.CONNECTING}
              className={`
                w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 relative z-20 shadow-2xl
                ${connectionState === ConnectionState.CONNECTED ? 'bg-red-500' : 'braj-gradient'}
                ${connectionState === ConnectionState.CONNECTING ? 'opacity-50 cursor-wait' : 'hover:scale-110 active:scale-90'}
              `}
            >
              {connectionState === ConnectionState.CONNECTED ? <Power className="w-10 h-10 text-white" /> : <MessageCircle className="w-10 h-10 text-white" />}
            </button>
            {connectionState === ConnectionState.CONNECTED && (
              <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20 z-10" />
            )}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 group-hover:text-orange-500 transition-colors">
                {connectionState === ConnectionState.CONNECTED ? 'Band Kar' : 'Buddy Ko Bula'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .glass-bright {
          background: rgba(255, 100, 0, 0.15);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
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