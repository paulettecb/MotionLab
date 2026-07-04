import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import basicSsl from '@vitejs/plugin-basic-ssl';
// https://vite.dev/config/
export default defineConfig({
    plugins: [vue(), basicSsl()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        // @vitejs/plugin-basic-ssl ya activa server.https con el certificado
        // autofirmado; no hace falta (ni el tipo de Vite lo acepta) pasar un
        // booleano aquí.
        host: true, // expone en la LAN para probar desde el teléfono
    },
    build: {
        target: 'es2022',
    },
});
