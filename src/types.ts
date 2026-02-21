import type { DataConnection } from 'peerjs';

export interface PeerDevice {
    peerId: string;
    name: string;
    emoji: string;
    connection: DataConnection;
}

export interface FileChunk {
    type: 'file-chunk';
    fileId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    chunkIndex: number;
    totalChunks: number;
    data: ArrayBuffer;
}

export interface FileTransferMeta {
    type: 'file-meta';
    fileId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    totalChunks: number;
    senderName: string;
    senderEmoji: string;
}

export interface FileTransferComplete {
    type: 'file-complete';
    fileId: string;
}

export interface PeerIdentityMessage {
    type: 'identity';
    name: string;
    emoji: string;
}

export type PeerMessage =
    | FileChunk
    | FileTransferMeta
    | FileTransferComplete
    | PeerIdentityMessage;

export interface TransferProgress {
    fileId: string;
    fileName: string;
    fileSize: number;
    direction: 'sending' | 'receiving';
    progress: number; // 0-1
    status: 'transferring' | 'complete' | 'error';
    url?: string; // download URL for received files
}

export interface DroppedFile {
    id: string;
    file: File;
}
