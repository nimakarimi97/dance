import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router.js'
import { client } from './lib/appwrite.js'
import './style.css'

createApp(App).use(router).mount('#app')

client.ping().catch(err => console.warn('Appwrite ping failed:', err))
