import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // This is the key to making process.env work in the browser for deployment
      // It replaces process.env.API_KEY in the code with the value of the VITE_API_KEY
      // from the .env file or Netlify environment variables during the build.
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY),
      'process.env.ASSEMBLYAI_API_KEY': JSON.stringify(env.VITE_ASSEMBLYAI_API_KEY),
    }
  }
});
