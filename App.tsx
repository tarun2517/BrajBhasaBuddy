import React, { useEffect, useRef, useState } from 'react';
import { Camera, MapPin, Mic, MicOff, Navigation, Power, AlertTriangle, MessageSquare } from 'lucide-react';
import { useLiveGemini } from './hooks/useLiveGemini';
import { ConnectionState, GeoLocation } from './types';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  // Hook for Live API logic
  const { connect, disconnect, connectionState, isTalking, volume } = useLiveGemini(videoRef, canvasRef, location);

  // Initialize Camera and Geolocation
  useEffect(() => {
    const init = async () => {
      try {
        // Geolocation
        if ('geolocation' in navigator) {
          navigator.geolocation.watchPosition(
            (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.warn("Geo error", err),
            { enableHighAccuracy: true }
          );
        }

        // Camera
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: "environment", // Use back camera if available
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setPermissionError("Please allow camera and location access to use this app.");
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
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center">
      {/* Hidden Canvas for Video Processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Feed Layer */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-80"
      />

      {/* Error Overlay */}
      {permissionError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-6">
          <div className="text-center text-red-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
            <p className="text-xl font-bold">{permissionError}</p>
          </div>
        </div>
      )}

      {/* HUD Layer */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 pointer-events-none">
        
        {/* Top Bar */}
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="bg-black/40 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 text-white border border-white/10">
            <div className={`w-3 h-3 rounded-full ${
              connectionState === ConnectionState.CONNECTED ? 'bg-green-500 animate-pulse' : 
              connectionState === ConnectionState.CONNECTING ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-sm font-medium">
                {connectionState === ConnectionState.CONNECTED ? 'Braj Bhasha Buddy Live' : 
                 connectionState === ConnectionState.CONNECTING ? 'Connecting...' : 'Offline'}
            </span>
          </div>
          
          {location && (
            <div className="bg-black/40 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 text-white border border-white/10">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-mono">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </span>
            </div>
          )}
        </div>

        {/* Center Status (Voice Activity) */}
        <div className="flex-1 flex items-center justify-center">
            {connectionState === ConnectionState.CONNECTED && (
                <div className="flex flex-col items-center gap-4">
                    {/* Visualizer for Voice Volume */}
                    <div className="flex items-end gap-1 h-12">
                         {[...Array(5)].map((_, i) => (
                             <div 
                                key={i}
                                className={`w-3 bg-gradient-to-t from-orange-500 to-yellow-300 rounded-full transition-all duration-75`}
                                style={{ 
                                    height: isTalking 
                                        ? `${Math.max(20, Math.random() * 100)}%` 
                                        : volume > 0.05 
                                            ? `${Math.min(100, volume * 100 * (i+1))}%` // Simple visual feedback for user input
                                            : '20%'
                                }}
                             />
                         ))}
                    </div>
                    {isTalking && (
                        <div className="bg-black/50 backdrop-blur-sm px-6 py-2 rounded-2xl border border-white/20 animate-in fade-in zoom-in duration-300">
                             <p className="text-yellow-300 font-medium italic">"Bhaiya, sun raho hu..."</p>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Bottom Controls */}
        <div className="flex flex-col gap-4 pointer-events-auto items-center mb-6">
            
            {/* Context/Hint */}
            {connectionState === ConnectionState.DISCONNECTED && (
                 <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl max-w-sm text-center border border-white/10">
                    <h2 className="text-lg font-bold text-white mb-1">Navigation ka saathi 🧭</h2>
                    <p className="text-sm text-gray-300">
                        Connect to start talking with your funny Braj-speaking map guide. 
                        Ask "Kaha jana hai?" or "Where is the nearest cafe?"
                    </p>
                 </div>
            )}

            {/* Main Action Button */}
            <button
                onClick={handleToggleConnection}
                className={`
                    w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 scale-100 active:scale-95
                    ${connectionState === ConnectionState.CONNECTED 
                        ? 'bg-red-500 hover:bg-red-600 shadow-red-500/50' 
                        : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/50'
                    }
                `}
            >
                {connectionState === ConnectionState.CONNECTED ? (
                    <Power className="w-8 h-8 text-white" />
                ) : (
                    <Mic className="w-8 h-8 text-white" />
                )}
            </button>
            <span className="text-xs text-white/50 font-medium">
                {connectionState === ConnectionState.CONNECTED ? 'Tap to End' : 'Tap to Start'}
            </span>
        </div>
      </div>
    </div>
  );
};

export default App;