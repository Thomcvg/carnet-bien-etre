import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

const cible = document.getElementById('app')
if (!cible) throw new Error("L'élément racine #app est introuvable.")

export default mount(App, { target: cible })
