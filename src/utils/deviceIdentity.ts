const adjectives = [
    'Swift', 'Brave', 'Calm', 'Daring', 'Eager',
    'Fancy', 'Gentle', 'Happy', 'Icy', 'Jolly',
    'Keen', 'Lucky', 'Merry', 'Noble', 'Proud',
    'Quick', 'Royal', 'Sunny', 'Tidy', 'Vivid',
];

const animals = [
    'Fox', 'Bear', 'Cat', 'Dog', 'Eagle',
    'Frog', 'Goat', 'Hawk', 'Ibis', 'Jay',
    'Kiwi', 'Lion', 'Mole', 'Newt', 'Owl',
    'Puma', 'Quail', 'Ram', 'Seal', 'Tiger',
];

const emojis = [
    '🦊', '🐻', '🐱', '🐶', '🦅',
    '🐸', '🐐', '🦅', '🐦', '🐦',
    '🥝', '🦁', '🐹', '🦎', '🦉',
    '🐆', '🐤', '🐏', '🦭', '🐯',
    '🚀', '⭐', '🌙', '🔥', '💎',
    '🎯', '🎨', '🎸', '🌈', '🍀',
];

function randomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export interface DeviceIdentity {
    id: string;
    name: string;
    emoji: string;
}

const STORAGE_KEY = 'void-sync-device-identity';

export function getOrCreateIdentity(): DeviceIdentity {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            return JSON.parse(stored) as DeviceIdentity;
        } catch {
            // corrupted, regenerate
        }
    }

    const identity: DeviceIdentity = {
        id: generateId(),
        name: `${randomItem(adjectives)} ${randomItem(animals)}`,
        emoji: randomItem(emojis),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    return identity;
}

function generateId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
}

export function generateRoomId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
}
