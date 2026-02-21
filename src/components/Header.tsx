interface HeaderProps {
    emoji: string;
    name: string;
    isConnected: boolean;
    peerCount: number;
}

export default function Header({ emoji, name, isConnected, peerCount }: HeaderProps) {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/95 backdrop-blur-md border-b border-[#00FF4110]">
            <div className="max-w-screen-xl mx-auto px-6 h-20 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-4">
                    <span className="text-[#00FF41] text-xl glow-text">{'>'}_</span>
                    <h1 className="text-2xl font-black tracking-[0.2em] uppercase text-[#00FF41] glow-text">
                        VOID_SYNC
                    </h1>
                </div>

                {/* Status */}
                <div className="flex items-center gap-6">
                    {peerCount > 0 && (
                        <span className="text-sm border border-[#00FF4140] px-4 py-1.5 text-[#00FF41] tracking-[0.2em] font-black bg-[#00FF4105]">
                            {peerCount} ACTIVE_NODES
                        </span>
                    )}

                    <div className="flex items-center gap-4">
                        <div
                            className={`w-3 h-3 ${isConnected
                                ? 'bg-[#00FF41] shadow-[0_0_15px_#00FF41] animate-pulse'
                                : 'bg-[#FF003C] shadow-[0_0_15px_#FF003C]'
                                }`}
                        />
                        <div className="flex flex-col items-end">
                            <span className="text-xs text-[#00FF4140] tracking-widest uppercase mb-0.5">Connected as</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xl">{emoji}</span>
                                <span className="text-sm text-[#00FF41] tracking-[0.1em] font-black">
                                    {name.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
