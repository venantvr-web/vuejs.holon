import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
// Police Inter Variable (auto-hébergée, pas de requête externe).
import '@fontsource-variable/inter'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.mount('#app')
