
import React, { useEffect, useRef, useState } from 'react';
import { Camera, MapPin, Mic, MicOff, Navigation, Power, AlertTriangle, MessageCircle } from 'lucide-react';
import { useLiveGemini } from './hooks/useLiveGemini';
import { ConnectionState, GeoLocation } from './types';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const { connect, disconnect, connectionState, isTalking, volume } = useLiveGemini(videoRef, canvasRef, location);

  useEffect(() => {
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
                width: { ideal: 1920 },
                height: { ideal: 1080 }
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

  const handleToggleConnection = () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center font-sans">
      <canvas ref={canvasRef} className="hidden" />

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover z-0 brightness-75 transition-all duration-700"
      />

      {permissionError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-8">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-2">Are Lalla!</h1>
            <p className="text-gray-300 mb-6">{permissionError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors"
            >
              Fir se koshish kar
            </button>
          </div>
        </div>
      )}

      {/* HUD Layer */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-6 pointer-events-none">
        
        {/* Top Status */}
        <div className="flex items-start justify-between pointer-events-auto">
          <div className="flex flex-col gap-2">
            <div className="bg-white/10 backdrop-blur-xl rounded-full px-4 py-2 flex items-center gap-3 text-white border border-white/20 shadow-lg">
              <div className={`w-2.5 h-2.5 rounded-full ${
                connectionState === ConnectionState.CONNECTED ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 
                connectionState === ConnectionState.CONNECTING ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span className="text-xs font-bold uppercase tracking-widest">
                  {connectionState === ConnectionState.CONNECTED ? 'Buddy Online' : 
                   connectionState === ConnectionState.CONNECTING ? 'Bula ryo hu...' : 'Offline'}
              </span>
            </div>
            
            {location && (
              <div className="bg-white/5 backdrop-blur-md rounded-lg px-3 py-1.5 flex items-center gap-2 text-white/70 border border-white/10 self-start">
                <MapPin className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono tracking-tighter">
                  {location.lat.toFixed(5)}N / {location.lng.toFixed(5)}E
                </span>
              </div>
            )}
          </div>

          <div className="bg-black/20 backdrop-blur-md rounded-full p-2 border border-white/10">
            <Navigation className="w-5 h-5 text-white/80" />
          </div>
        </div>

        {/* Dynamic Voice Feedback */}
        <div className="flex-1 flex items-center justify-center">
            {(connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) && (
                <div className="flex flex-col items-center gap-6">
                    <div className="flex items-center justify-center gap-2 h-20">
                         {[...Array(8)].map((_, i) => {
                             const isActive = isTalking || volume > 0.02;
                             const scale = isTalking ? (Math.random() * 1.5 + 0.5) : (volume * 15 * (i % 2 === 0 ? 1 : 1.5));
                             return (
                                <div 
                                    key={i}
                                    className={`w-1.5 bg-gradient-to-b from-indigo-400 to-cyan-300 rounded-full transition-all duration-150 ${!isActive ? 'opacity-20 h-2' : 'opacity-100 h-16'}`}
                                    style={{ 
                                        height: isActive ? `${Math.min(100, 20 + (scale * 30))}%` : '8px',
                                        transitionDelay: `${i * 30}ms`
                                    }}
                                 />
                             );
                         })}
                    </div>
                    {isTalking && (
                        <div className="px-6 py-3 bg-indigo-600/30 backdrop-blur-xl rounded-full border border-indigo-400/30 animate-pulse">
                             <p className="text-white font-semibold text-sm tracking-wide">"Suno Lalla..."</p>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col gap-6 pointer-events-auto items-center mb-4">
            {connectionState === ConnectionState.DISCONNECTED && (
                 <div className="bg-white/10 backdrop-blur-2xl p-6 rounded-3xl max-w-xs text-center border border-white/20 shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-10">
                    <MessageCircle className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
                    <h2 className="text-xl font-black text-white mb-2 leading-tight tracking-tight">Radhe Radhe!</h2>
                    <p className="text-sm text-gray-300 leading-relaxed">
                        Apne Braj Buddy se baat kar. Poochh "Lalla, Vrindavan kitni door hai?"
                    </p>
                 </div>
            )}

            <div className="flex items-center gap-6">
              <button
                  onClick={handleToggleConnection}
                  disabled={connectionState === ConnectionState.CONNECTING}
                  className={`
                      w-24 h-24 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-500 group relative
                      ${connectionState === ConnectionState.CONNECTED 
                          ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30 border-4 border-white/20' 
                          : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30 border-4 border-white/20'
                      }
                      ${connectionState === ConnectionState.CONNECTING ? 'opacity-50 cursor-not-allowed' : 'active:scale-90'}
                  `}
              >
                  {connectionState === ConnectionState.CONNECTED ? (
                      <Power className="w-10 h-10 text-white" />
                  ) : (
                      <Mic className="w-10 h-10 text-white group-hover:scale-110 transition-transform" />
                  )}
                  {connectionState === ConnectionState.CONNECTED && (
                    <div className="absolute -inset-2 rounded-full border-2 border-red-500/50 animate-ping" />
                  )}
              </button>
            </div>
            
            <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">
                {connectionState === ConnectionState.CONNECTED ? 'Kaat de baatcheet' : 'Buddy ko bulao'}
            </p>
        </div>
      </div>
    </div>
  );
};

export default App;
