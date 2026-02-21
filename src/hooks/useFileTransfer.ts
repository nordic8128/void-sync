import { useCallback, useRef, useState } from 'react';
import type { DeviceIdentity } from '../utils/deviceIdentity';
import type {
    FileChunk,
    FileTransferComplete,
    FileTransferMeta,
    PeerMessage,
    TransferProgress,
} from '../types';

const CHUNK_SIZE = 64 * 1024; // 64KB

function generateFileId(): string {
    return `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface UseFileTransferOptions {
    identity: DeviceIdentity;
    sendToPeer: (peerId: string, data: PeerMessage) => void;
    onTransferComplete?: (fileId: string, targetPeerId: string) => void;
    onFileReceived?: (fileId: string, fileName: string, url: string) => void;
}

export function useFileTransfer({
    identity,
    sendToPeer,
    onTransferComplete,
    onFileReceived,
}: UseFileTransferOptions) {
    const [transfers, setTransfers] = useState<Map<string, TransferProgress>>(new Map());
    const receivingBuffers = useRef<Map<string, { chunks: ArrayBuffer[]; meta: FileTransferMeta }>>(new Map());

    const updateTransfer = useCallback((fileId: string, update: Partial<TransferProgress>) => {
        setTransfers(prev => {
            const next = new Map(prev);
            const existing = next.get(fileId);
            if (existing) {
                next.set(fileId, { ...existing, ...update });
            }
            return next;
        });
    }, []);

    const sendFile = useCallback(async (file: File, targetPeerId: string) => {
        const fileId = generateFileId();
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        // Register transfer
        const progress: TransferProgress = {
            fileId,
            fileName: file.name,
            fileSize: file.size,
            direction: 'sending',
            progress: 0,
            status: 'transferring',
        };
        setTransfers(prev => new Map(prev).set(fileId, progress));

        // Send metadata first
        const meta: FileTransferMeta = {
            type: 'file-meta',
            fileId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            totalChunks,
            senderName: identity.name,
            senderEmoji: identity.emoji,
        };
        sendToPeer(targetPeerId, meta);

        // Send chunks
        const arrayBuffer = await file.arrayBuffer();
        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunkData = arrayBuffer.slice(start, end);

            const chunk: FileChunk = {
                type: 'file-chunk',
                fileId,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                chunkIndex: i,
                totalChunks,
                data: chunkData,
            };
            sendToPeer(targetPeerId, chunk);

            // Update progress
            updateTransfer(fileId, { progress: (i + 1) / totalChunks });

            // Small delay to avoid overwhelming the channel
            if (i % 10 === 0) {
                await new Promise(r => setTimeout(r, 5));
            }
        }

        // Send complete
        const complete: FileTransferComplete = {
            type: 'file-complete',
            fileId,
        };
        sendToPeer(targetPeerId, complete);
        updateTransfer(fileId, { status: 'complete', progress: 1 });
        onTransferComplete?.(fileId, targetPeerId);

        // Auto-remove transfer after delay
        setTimeout(() => {
            setTransfers(prev => {
                const next = new Map(prev);
                next.delete(fileId);
                return next;
            });
        }, 5000);

        return fileId;
    }, [identity, sendToPeer, updateTransfer, onTransferComplete]);

    const handleMessage = useCallback((_peerId: string, message: PeerMessage) => {
        if (message.type === 'file-meta') {
            const meta = message as FileTransferMeta;
            receivingBuffers.current.set(meta.fileId, {
                chunks: new Array(meta.totalChunks),
                meta,
            });
            const progress: TransferProgress = {
                fileId: meta.fileId,
                fileName: meta.fileName,
                fileSize: meta.fileSize,
                direction: 'receiving',
                progress: 0,
                status: 'transferring',
            };
            setTransfers(prev => new Map(prev).set(meta.fileId, progress));
        } else if (message.type === 'file-chunk') {
            const chunk = message as FileChunk;
            const buffer = receivingBuffers.current.get(chunk.fileId);
            if (buffer) {
                buffer.chunks[chunk.chunkIndex] = chunk.data;
                const received = buffer.chunks.filter(Boolean).length;
                updateTransfer(chunk.fileId, { progress: received / chunk.totalChunks });
            }
        } else if (message.type === 'file-complete') {
            const complete = message as FileTransferComplete;
            const buffer = receivingBuffers.current.get(complete.fileId);
            if (buffer) {
                // Reconstruct file
                const blob = new Blob(buffer.chunks, { type: buffer.meta.fileType });
                const url = URL.createObjectURL(blob);

                updateTransfer(complete.fileId, {
                    status: 'complete',
                    progress: 1,
                    url,
                });

                onFileReceived?.(complete.fileId, buffer.meta.fileName, url);
                receivingBuffers.current.delete(complete.fileId);

                // Auto-download
                const a = document.createElement('a');
                a.href = url;
                a.download = buffer.meta.fileName;
                a.click();

                // Auto-remove transfer after delay
                setTimeout(() => {
                    setTransfers(prev => {
                        const next = new Map(prev);
                        next.delete(complete.fileId);
                        return next;
                    });
                }, 8000);
            }
        }
    }, [updateTransfer, onFileReceived]);

    const clearTransfer = useCallback((fileId: string) => {
        setTransfers(prev => {
            const next = new Map(prev);
            next.delete(fileId);
            return next;
        });
    }, []);

    return {
        transfers,
        sendFile,
        handleMessage,
        clearTransfer,
    };
}
