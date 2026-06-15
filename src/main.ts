import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { tooltipDirective } from './composables/useTooltipUI'
// Police Inter Variable (auto-hébergée, pas de requête externe).
import '@fontsource-variable/inter'
import './style.css'

const app = createApp(App)

app.use(createPinia())
// Directive globale `v-tooltip` : voir composables/useTooltipUI.ts pour
// l'API et le comportement (a11y, délai, placement adaptatif).
app.directive('tooltip', tooltipDirective)

app.mount('#app')
