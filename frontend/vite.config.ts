import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { webcoreVite } from 'webcoreui/integration'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), webcoreVite()]
})
