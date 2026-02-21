import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ConnectionPanelProps {
    roomId: string;
    peerId: string;
    isReady: boolean;
    error: string | null;
    logs: string[];
    onConnect: (targetPeerId: string) => void;
}

export default function ConnectionPanel({
    roomId,
    peerId,
    isReady,
    error,
    logs,
    onConnect,
}: ConnectionPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [targetId, setTargetId] = useState('');
    const [copied, setCopied] = useState(false);

    // Build network-aware URL
    const networkUrl = useMemo(() => {
        const hostname = window.location.hostname;
        const port = window.location.port;
        const protocol = window.location.protocol;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
        const displayHost = isLocal ? (typeof __LOCAL_IP__ !== 'undefined' ? __LOCAL_IP__ : hostname) : hostname;

        const base = `${protocol}//${displayHost}${port ? ':' + port : ''}`;
        return `${base}${window.location.pathname}?connect=${peerId}`;
    }, [peerId]);

    // Display URL for manual access (without connect param)
    const displayUrl = useMemo(() => {
        const hostname = window.location.hostname;
        const port = window.location.port;
        const protocol = window.location.protocol;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
        const displayHost = isLocal ? (typeof __LOCAL_IP__ !== 'undefined' ? __LOCAL_IP__ : hostname) : hostname;

        return `${protocol}//${displayHost}${port ? ':' + port : ''}`;
    }, []);

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(networkUrl);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(peerId).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleConnect = () => {
        if (targetId.trim()) {
            onConnect(targetId.trim());
            setTargetId('');
        }
    };

    const handleReconnect = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const connectTo = urlParams.get('connect') || targetId;
        if (connectTo) {
            onConnect(connectTo);
        }
    };

    return (
        <>
            {/* Floating action button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 w-12 h-12 border border-[#00FF4160] bg-[#050505] text-[#00FF41] transition-all flex items-center justify-center text-sm tracking-wider glow-border hover:bg-[#00FF4110]"
                aria-label="接続パネルを開く"
            >
                {isOpen ? '×' : '⬡'}
            </button>

            {/* Panel */}
            <div
                className={`fixed bottom-20 right-6 z-50 w-80 bg-[#050505] border border-[#00FF4130] transition-all duration-200 origin-bottom-right ${isOpen
                    ? 'scale-100 opacity-100 glow-box'
                    : 'scale-90 opacity-0 pointer-events-none'
                    }`}
            >
                <div className="p-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#00FF4115]">
                        <span className="text-[#00FF41] text-xs">{'>'}</span>
                        <h2 className="text-xs font-medium text-[#00FF41] tracking-widest uppercase glow-text">
                            Connection
                        </h2>
                    </div>

                    {error && (
                        <div className="mb-3 p-2 border border-red-500/40 text-red-400 text-[10px] tracking-wider">
                            [ERROR] {error}
                        </div>
                    )}

                    {/* Network URL Display (Automated IP) */}
                    <div className="mb-4">
                        <label className="text-xs text-[#00FF41] font-bold tracking-[0.2em] block mb-2 uppercase opacity-60">
                            NETWORK URL
                        </label>
                        <div
                            onClick={handleCopyUrl}
                            className="border border-[#00FF4120] px-3 py-2 text-xs text-[#00FF41] cursor-pointer hover:border-[#00FF4160] transition-colors truncate font-mono bg-[#00FF4105]"
                            title="Copy Network URL"
                        >
                            {displayUrl}
                        </div>
                    </div>

                    {/* My Peer ID */}
                    <div className="mb-4">
                        <label className="text-xs text-[#00FF41] font-bold tracking-[0.2em] block mb-2 uppercase opacity-60">
                            YOUR DEVICE ID
                        </label>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 border border-[#00FF4120] px-3 py-2.5 text-xs text-[#00FF41] truncate bg-[#00FF4105]">
                                {peerId}
                            </code>
                            <button
                                onClick={handleCopy}
                                className="px-4 py-2.5 border border-[#00FF4130] text-xs text-[#00FF41] hover:border-[#00FF41] hover:bg-[#00FF4110] transition-all tracking-widest font-bold active:scale-95 bg-[#050505]"
                            >
                                {copied ? 'COPIED' : 'COPY'}
                            </button>
                        </div>
                    </div>

                    {/* Console Logs */}
                    <div className="mb-4">
                        <label className="text-[10px] text-[#00FF4160] tracking-widest block mb-1.5 uppercase">
                            TERMINAL_LOG
                        </label>
                        <div className="h-24 overflow-y-auto border border-[#00FF4115] bg-[#00FF4105] p-2 font-mono text-[9px] leading-relaxed custom-scrollbar">
                            {logs.length > 0 ? (
                                logs.map((log, i) => (
                                    <div key={i} className="text-[#00FF4180] mb-1 last:mb-0 break-words">
                                        {log}
                                    </div>
                                ))
                            ) : (
                                <div className="text-[#00FF4120] italic">AWAITING SYSTEM LOG...</div>
                            )}
                        </div>
                    </div>

                    {/* QR Code */}
                    <div className="mb-4 flex justify-center">
                        <div className="p-2 border border-[#00FF4120]">
                            <QRCodeSVG
                                value={networkUrl}
                                size={120}
                                bgColor="#050505"
                                fgColor="#00FF41"
                                level="M"
                            />
                        </div>
                    </div>

                    {/* Reconnect Button */}
                    <button
                        onClick={handleReconnect}
                        disabled={!isReady}
                        className="w-full mb-4 py-2 border border-[#00FF4140] text-[#00FF41] text-[10px] tracking-[0.3em] font-black uppercase hover:bg-[#00FF4110] active:scale-[0.98] transition-all glow-border"
                    >
                        RECONNECT / RETRY
                    </button>

                    {/* Connect to peer */}
                    <div className="space-y-2.5">
                        <label className="text-xs text-[#00FF41] font-bold tracking-[0.2em] block uppercase opacity-60">
                            MANUAL CONNECT
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="PASTE ID HERE..."
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                                className="flex-1 px-3 py-3 border border-[#00FF4120] text-xs text-[#00FF41] bg-[#00FF4105] focus:outline-none focus:border-[#00FF41] transition-all min-w-0"
                            />
                            <button
                                onClick={handleConnect}
                                disabled={!isReady || !targetId.trim()}
                                className="px-5 py-3 border border-[#00FF41] text-xs text-[#00FF41] tracking-[0.1em] hover:bg-[#00FF4120] disabled:opacity-20 disabled:cursor-not-allowed transition-all font-black active:scale-95 uppercase shadow-[0_0_10px_#00FF4120]"
                            >
                                Send
                            </button>
                        </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-[#00FF4110]">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[#00FF4130] tracking-widest font-bold">
                                ROOM_ID: {roomId}
                            </span>
                            <span className="text-xs tracking-[0.2em] font-black">
                                {isReady ? (
                                    <span className="text-[#00FF41] glow-text">ONLINE</span>
                                ) : (
                                    <span className="text-[#00FF4140] animate-blink">SYNCING...</span>
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
