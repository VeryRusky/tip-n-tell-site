import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Bootstrap CSS only (the site uses no Bootstrap JavaScript components).
import 'bootstrap/dist/css/bootstrap.min.css'

// Fonts are installed packages, so nothing is loaded from Google or a CDN.
import '@fontsource/playfair-display/600.css'
import '@fontsource/playfair-display/700.css'
import '@fontsource/nunito-sans/400.css'
import '@fontsource/nunito-sans/700.css'

// Our styles come after Bootstrap so they win.
import './assets/theme.css'
import './assets/main.css'

const app = createApp(App)

// Pinia first: the router's guard uses the booking store.
app.use(createPinia())
app.use(router)

app.mount('#app')
