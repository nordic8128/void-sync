import { useCallback, useEffect, useRef, useState } from 'react';
import Peer, { type DataConnection } from 'peerjs';
import type { DeviceIdentity } from '../utils/deviceIdentity';
import type { PeerDevice, PeerIdentityMessage, PeerMessage } from '../types';

interface UsePeerOptions {
    identity: DeviceIdentity;
    roomId: string;
    onMessage: (peerId: string, message: PeerMessage) => void;
}

export function usePeer({ identity, roomId, onMessage }: UsePeerOptions) {
    const [peers, setPeers] = useState<Map<string, PeerDevice>>(new Map());
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [idSuffix, setIdSuffix] = useState(() => Math.random().toString(36).substring(2, 6));
    const peerRef = useRef<Peer | null>(null);
    const isInitializingRef = useRef(false);
    const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
    const onMessageRef = useRef(onMessage);
    onMessageRef.current = onMessage;

    const addLog = useCallback((msg: string) => {
        const time = new Date().toLocaleTimeString('ja-JP', { hour12: false });
        setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 20));
        console.log(`[P2P] ${msg}`);
    }, []);

    const fullPeerId = `voidsync-${roomId}-${identity.id}-${idSuffix}`;

    const setupConnection = useCallback((conn: DataConnection) => {
        conn.on('open', () => {
            addLog(`CONNECTION OPENED: ${conn.peer}`);
            // Send our identity
            const identityMsg: PeerIdentityMessage = {
                type: 'identity',
                name: identity.name,
                emoji: identity.emoji,
            };
            conn.send(identityMsg);
        });

        conn.on('data', (data: unknown) => {
            const msg = data as PeerMessage;
            if (msg.type === 'identity') {
                const device: PeerDevice = {
                    peerId: conn.peer,
                    name: msg.name,
                    emoji: msg.emoji,
                    connection: conn,
                };
                connectionsRef.current.set(conn.peer, conn);
                setPeers(prev => new Map(prev).set(conn.peer, device));
            } else {
                onMessageRef.current(conn.peer, msg);
            }
        });

        conn.on('close', () => {
            addLog(`CONNECTION CLOSED: ${conn.peer}`);
            connectionsRef.current.delete(conn.peer);
            setPeers(prev => {
                const next = new Map(prev);
                next.delete(conn.peer);
                return next;
            });
        });

        conn.on('error', (err) => {
            addLog(`CONN ERROR: ${err.message}`);
            console.error('Connection error:', err);
        });
    }, [identity.name, identity.emoji, addLog]);

    useEffect(() => {
        if (isInitializingRef.current) return;
        isInitializingRef.current = true;

        addLog(`INITIALIZING PEER: ${fullPeerId}`);
        const peer = new Peer(fullPeerId, {
            debug: 1, // 1 for errors only
            secure: true, // Required for HTTPS
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                ],
            },
        });
        peerRef.current = peer;

        peer.on('open', (id) => {
            addLog(`PEER READY: ID ${id}`);
            setIsReady(true);
            setError(null);
            isInitializingRef.current = false;
        });

        peer.on('connection', (conn) => {
            addLog(`INCOMING CONNECTION: ${conn.peer}`);
            setupConnection(conn);
        });

        peer.on('error', (err) => {
            addLog(`PEER ERROR: ${err.type} - ${err.message}`);
            console.error('Peer error:', err);

            if (err.type === 'unavailable-id') {
                addLog('ID CONFLICT DETECTED. AUTO-RETRYING WITH NEW SUFFIX...');
                isInitializingRef.current = false;
                setIdSuffix(Math.random().toString(36).substring(2, 6));
                peer.destroy();
            } else {
                setError(`接続エラー: ${err.message}`);
                isInitializingRef.current = false;
            }
        });

        return () => {
            addLog('DESTROYING PEER INSTANCE');
            peer.destroy();
            peerRef.current = null;
            isInitializingRef.current = false;
            connectionsRef.current.clear();
            setPeers(new Map());
            setIsReady(false);
        };
    }, [fullPeerId, setupConnection, addLog, setIdSuffix]);

    const connectToPeer = useCallback((targetPeerId: string) => {
        const peer = peerRef.current;
        if (!peer || !peer.open) {
            addLog('CANNOT CONNECT: PEER NOT READY');
            return;
        }

        if (connectionsRef.current.has(targetPeerId)) {
            addLog('ALREADY CONNECTED TO PEER');
            return;
        }

        addLog(`ATTEMPTING CONNECT TO: ${targetPeerId}`);
        const conn = peer.connect(targetPeerId, { reliable: true });
        setupConnection(conn);
    }, [setupConnection, addLog]);

    const connectToRoom = useCallback((targetRoomId: string) => {
        const peer = peerRef.current;
        if (!peer || !peer.open) return;

        // Try connecting by listing peers (use PeerJS listAllPeers if available)
        // Since PeerJS cloud doesn't support listing peers by prefix easily,
        // we'll do a broadcast-style approach: connect to all known peer IDs in the room
        // For now, we rely on manual peer ID exchange
        const targetId = `voidsync-${targetRoomId}`;
        // We'll need to try connecting - in practice, each device shares its full ID
        console.log('Attempting to connect to room:', targetId);
    }, []);

    const sendToPeer = useCallback((peerId: string, data: PeerMessage) => {
        const conn = connectionsRef.current.get(peerId);
        if (conn && conn.open) {
            conn.send(data);
        }
    }, []);

    const sendToAll = useCallback((data: PeerMessage) => {
        connectionsRef.current.forEach((conn) => {
            if (conn.open) {
                conn.send(data);
            }
        });
    }, []);

    return {
        peers,
        isReady,
        error,
        logs,
        peerId: fullPeerId,
        connectToPeer,
        connectToRoom,
        sendToPeer,
        sendToAll,
        addLog,
    };
}
