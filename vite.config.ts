import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { networkInterfaces } from 'os';

// Get local IPv4 address
function getLocalIP() {
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIP();

// https://vite.dev/config/
export default defineConfig({
  base: '/void-sync/',
  plugins: [react(), tailwindcss()],
  define: {
    __LOCAL_IP__: JSON.stringify(localIp),
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
