import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getOrCreateIdentity, generateRoomId } from './utils/deviceIdentity';
import { usePeer } from './hooks/usePeer';
import { useFileTransfer } from './hooks/useFileTransfer';
import Header from './components/Header';
import ConnectionPanel from './components/ConnectionPanel';
import type { PeerMessage } from './types';

function BigProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full mt-4">
      <div className="flex justify-between text-[11px] font-black tracking-[0.2em] mb-2">
        <span>TRANSFERRING</span>
        <span>{Math.round(progress * 100)}%</span>
      </div>
      <div className="w-full h-3 border border-[#00FF4120] p-0.5 bg-[#00FF4105]">
        <div
          className="h-full bg-[#00FF41] shadow-[0_0_15px_#00FF4160] transition-all duration-300 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}

function App() {
  const identity = useMemo(() => getOrCreateIdentity(), []);
  const [roomId] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connectTo = urlParams.get('connect');
    if (connectTo) {
      const parts = connectTo.split('-');
      if (parts.length >= 3) return parts[1];
    }
    return generateRoomId();
  });

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTransferComplete = useCallback((_fileId: string, _targetPeerId: string) => {
    console.log('Transfer complete');
  }, []);

  const handleFileReceived = useCallback((_fileId: string, fileName: string, _url: string) => {
    console.log('File received:', fileName);
  }, []);

  const handlePeerMessage = useCallback((peerId: string, message: PeerMessage) => {
    fileTransferRef.current?.handleMessage(peerId, message);
  }, []);

  const {
    peers,
    isReady,
    error,
    logs,
    peerId,
    connectToPeer,
    sendToPeer,
  } = usePeer({
    identity,
    roomId,
    onMessage: handlePeerMessage,
  });

  const fileTransfer = useFileTransfer({
    identity,
    sendToPeer,
    onTransferComplete: handleTransferComplete,
    onFileReceived: handleFileReceived,
  });

  const fileTransferRef = useRef(fileTransfer);
  fileTransferRef.current = fileTransfer;

  // Auto-connect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connectTo = urlParams.get('connect');
    if (connectTo && isReady) {
      setTimeout(() => connectToPeer(connectTo), 3000);
    }
  }, [isReady, connectToPeer]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  }, []);

  const handleSendFile = useCallback((targetPeerId: string) => {
    if (!selectedFile) return;
    fileTransfer.sendFile(selectedFile, targetPeerId);
    setSelectedFile(null);
  }, [selectedFile, fileTransfer]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  }, []);

  const activeTransfers = useMemo(() => Array.from(fileTransfer.transfers.values()), [fileTransfer.transfers]);
  const history = useMemo(() => activeTransfers.filter(t => t.status === 'complete' || t.status === 'error'), [activeTransfers]);
  const currentTransfers = useMemo(() => activeTransfers.filter(t => t.status === 'transferring'), [activeTransfers]);

  return (
    <div
      className="w-screen h-screen flex flex-col bg-[#050505] relative text-[#00FF41] font-mono crt-overlay"
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setIsDragging(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Header
        emoji={identity.emoji}
        name={identity.name}
        isConnected={isReady}
        peerCount={peers.size}
      />

      <main className="flex-1 overflow-y-auto custom-scrollbar pt-20 flex flex-col items-center">
        <div className="min-h-full w-full max-w-2xl px-6 py-12 flex flex-col justify-center gap-16">

          {/* File Staging / Drop Zone */}
          <section className="flex flex-col gap-6 scale-110">
            <div
              className={`group relative border-2 border-dashed rounded-2xl p-24 py-32 text-center transition-all cursor-pointer shadow-[0_0_30px_rgba(0,255,65,0.02)] ${isDragging || selectedFile ? 'border-[#00FF41] bg-[#00FF4108] glow-border' : 'border-[#00FF4120] hover:border-[#00FF4180] hover:bg-[#00FF4102]'
                }`}
              onClick={() => fileInputRef.current?.click()}
            >    {!selectedFile ? (
              <div className="space-y-4">
                <div className="text-4xl opacity-30 group-hover:opacity-100 transition-opacity">📦</div>
                <p className="text-lg font-black tracking-[0.2em] uppercase">
                  Drop File Here
                </p>
                <p className="text-xs opacity-40 tracking-widest uppercase">
                  Or click to browse system
                </p>
              </div>
            ) : (
              <div className="animate-fade-in py-4 flex flex-col items-center">
                <div className="text-3xl mb-4">📄</div>
                <h3 className="text-xl font-black tracking-widest mb-2 break-all px-4">
                  {selectedFile.name.toUpperCase()}
                </h3>
                <p className="text-sm opacity-50 tracking-widest font-black uppercase">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB // Staged
                </p>
                <div className="mt-6 px-4 py-1.5 border border-[#00FF4140] text-[10px] tracking-widest uppercase opacity-50 font-black">
                  Click to swap file
                </div>
              </div>
            )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </section>

          {/* Device Selection Guide */}
          {selectedFile && (
            <div className="text-center animate-blink">
              <span className="text-sm font-black tracking-[0.4em] uppercase text-[#00FF41]">
                Select destination node below
              </span>
            </div>
          )}

          {/* Progress Bar (Visible during transfer) */}
          {currentTransfers.length > 0 && (
            <section className="bg-[#00FF4105] border border-[#00FF4140] p-6 rounded-lg animate-fade-in shadow-[0_0_30px_#00FF4110]">
              {currentTransfers.map(t => (
                <div key={t.fileId} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black tracking-widest uppercase opacity-60">
                      {t.direction === 'sending' ? 'Sending to Node' : 'Receiving from Node'}
                    </span>
                    <span className="text-xs font-black truncate max-w-[200px]">{t.fileName.toUpperCase()}</span>
                  </div>
                  <BigProgressBar progress={t.progress} />
                </div>
              ))}
            </section>
          )}

          {/* Device List Section */}
          <section className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-[#00FF4115] pb-3">
              <h2 className="text-sm font-black tracking-[0.5em] uppercase opacity-40">
                Active_Nodes
              </h2>
              <span className="text-[10px] font-black text-[#00FF4160]">{peers.size} DETECTED</span>
            </div>

            <div className="grid gap-4">
              {peers.size === 0 ? (
                <div className="border border-[#00FF4110] p-12 text-center rounded-lg bg-[#00FF4102]">
                  <div className="animate-pulse text-xs opacity-20 tracking-[0.3em] uppercase">Scanning for handshakes...</div>
                </div>
              ) : (
                Array.from(peers.values()).map(peer => (
                  <div key={peer.peerId} className="flex items-center justify-between p-6 bg-[#00FF4105] border border-[#00FF4120] rounded-lg hover:border-[#00FF4180] hover:bg-[#00FF4108] transition-all group">
                    <div className="flex items-center gap-6">
                      <span className="text-3xl filter grayscale group-hover:grayscale-0 transition-all">{peer.emoji}</span>
                      <div>
                        <h3 className="text-lg font-black tracking-widest">{peer.name.toUpperCase()}</h3>
                        <p className="text-[10px] opacity-30 font-mono mt-1 uppercase tracking-tighter">ID: {peer.peerId}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSendFile(peer.peerId)}
                      disabled={!selectedFile}
                      className="px-8 py-3 bg-transparent border-2 border-[#00FF41] text-xs font-black tracking-[0.3em] uppercase hover:bg-[#00FF41] hover:text-[#050505] disabled:opacity-10 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_#00FF4120]"
                    >
                      Send
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* History Section */}
          {history.length > 0 && (
            <section className="mt-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-[#00FF4115] pb-3">
                <h2 className="text-sm font-black tracking-[0.5em] uppercase opacity-40">
                  Transmission_Log
                </h2>
              </div>

              <div className="grid gap-3 overflow-y-auto max-h-80 custom-scrollbar pr-2">
                {history.map(t => (
                  <div key={t.fileId} className={`p-4 border flex items-center justify-between rounded ${t.status === 'complete' ? 'border-[#00FF4115] bg-[#00FF4102]' : 'border-red-500/20 bg-red-500/05'
                    }`}>
                    <div className="min-w-0 flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] px-1.5 py-0.5 font-black uppercase ${t.direction === 'sending' ? 'bg-[#00FF4120] text-[#00FF41]' : 'bg-[#00FF41] text-[#050505]'}`}>
                          {t.direction}
                        </span>
                        <span className="text-[11px] font-bold truncate tracking-widest">
                          {t.fileName.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[9px] opacity-30 uppercase tracking-widest font-black">
                        {t.status} // {(t.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    {t.status === 'complete' && t.url && (
                      <div className="flex gap-2">
                        <a
                          href={t.url}
                          download={t.fileName}
                          className="px-5 py-2 border border-[#00FF41] text-[#00FF41] text-[10px] font-black tracking-widest hover:bg-[#00FF41] hover:text-[#050505] transition-all uppercase"
                        >
                          Save
                        </a>
                        <button
                          onClick={() => fileTransfer.clearTransfer(t.fileId)}
                          className="px-3 py-2 border border-[#00FF4110] text-[#00FF4120] text-[10px] hover:text-[#00FF41] transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <ConnectionPanel
        roomId={roomId}
        peerId={peerId}
        isReady={isReady}
        error={error}
        logs={logs}
        onConnect={connectToPeer}
      />

      {/* Global Overlay for Drag */}
      {isDragging && (
        <div className="fixed inset-0 z-[100] bg-[#00FF4108] backdrop-blur-[4px] pointer-events-none flex items-center justify-center">
          <div className="border-4 border-dashed border-[#00FF4180] p-24 rounded-2xl">
            <span className="text-[#00FF41] text-2xl font-black tracking-[0.5em] uppercase animate-pulse shadow-[0_0_20px_#00FF41]">
              Release to Sync
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
