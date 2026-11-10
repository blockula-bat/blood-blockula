import {defineConfig} from 'vite';
export default defineConfig({server:{port:4173,strictPort:true,proxy:{'/api':{target:'https://demo.blockula.app',changeOrigin:true}}},preview:{port:4173,strictPort:true,proxy:{'/api':{target:'https://demo.blockula.app',changeOrigin:true}}},build:{target:'es2022'}});
