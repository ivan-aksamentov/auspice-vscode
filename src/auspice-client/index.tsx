import languageAr from "@auspice/locales/ar/language.json"
import sidebarAr from "@auspice/locales/ar/sidebar.json"
import translationAr from "@auspice/locales/ar/translation.json"
import languageDe from "@auspice/locales/de/language.json"
import sidebarDe from "@auspice/locales/de/sidebar.json"
import translationDe from "@auspice/locales/de/translation.json"
import languageEn from "@auspice/locales/en/language.json"
import sidebarEn from "@auspice/locales/en/sidebar.json"
import translationEn from "@auspice/locales/en/translation.json"
import languageEs from "@auspice/locales/es/language.json"
import sidebarEs from "@auspice/locales/es/sidebar.json"
import translationEs from "@auspice/locales/es/translation.json"
import languageFr from "@auspice/locales/fr/language.json"
import sidebarFr from "@auspice/locales/fr/sidebar.json"
import translationFr from "@auspice/locales/fr/translation.json"
import languageIt from "@auspice/locales/it/language.json"
import sidebarIt from "@auspice/locales/it/sidebar.json"
import translationIt from "@auspice/locales/it/translation.json"
import languageJa from "@auspice/locales/ja/language.json"
import sidebarJa from "@auspice/locales/ja/sidebar.json"
import translationJa from "@auspice/locales/ja/translation.json"
import languageLt from "@auspice/locales/lt/language.json"
import sidebarLt from "@auspice/locales/lt/sidebar.json"
import translationLt from "@auspice/locales/lt/translation.json"
import languagePl from "@auspice/locales/pl/language.json"
import sidebarPl from "@auspice/locales/pl/sidebar.json"
import translationPl from "@auspice/locales/pl/translation.json"
import languagePt from "@auspice/locales/pt/language.json"
import sidebarPt from "@auspice/locales/pt/sidebar.json"
import translationPt from "@auspice/locales/pt/translation.json"
import languageRu from "@auspice/locales/ru/language.json"
import sidebarRu from "@auspice/locales/ru/sidebar.json"
import translationRu from "@auspice/locales/ru/translation.json"
import languageTr from "@auspice/locales/tr/language.json"
import sidebarTr from "@auspice/locales/tr/sidebar.json"
import translationTr from "@auspice/locales/tr/translation.json"
import languageZh from "@auspice/locales/zh/language.json"
import sidebarZh from "@auspice/locales/zh/sidebar.json"
import translationZh from "@auspice/locales/zh/translation.json"
import i18n from "i18next"
import React from "react"
import ReactDOM from "react-dom"
import { initReactI18next } from "react-i18next"

import { App } from "./App"
// Side-effect import: wires the host <-> webview message bridge and posts "ready".
import "./bridge"

import "./viewer.css"

// Auspice keeps animation scratch state on this global (normally seeded by its
// own entry point, which the shell replaces).
window.NEXTSTRAIN ??= {}

// Auspice components translate their labels through react-i18next. Its entry
// point initialises i18next with the bundled English namespaces; the shell does
// the same so controls render real labels instead of raw keys.
void i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  defaultNS: "translation",
  interpolation: { escapeValue: false },
  resources: {
    ar: { language: languageAr, sidebar: sidebarAr, translation: translationAr },
    de: { language: languageDe, sidebar: sidebarDe, translation: translationDe },
    en: { language: languageEn, sidebar: sidebarEn, translation: translationEn },
    es: { language: languageEs, sidebar: sidebarEs, translation: translationEs },
    fr: { language: languageFr, sidebar: sidebarFr, translation: translationFr },
    it: { language: languageIt, sidebar: sidebarIt, translation: translationIt },
    ja: { language: languageJa, sidebar: sidebarJa, translation: translationJa },
    lt: { language: languageLt, sidebar: sidebarLt, translation: translationLt },
    pl: { language: languagePl, sidebar: sidebarPl, translation: translationPl },
    pt: { language: languagePt, sidebar: sidebarPt, translation: translationPt },
    ru: { language: languageRu, sidebar: sidebarRu, translation: translationRu },
    tr: { language: languageTr, sidebar: sidebarTr, translation: translationTr },
    zh: { language: languageZh, sidebar: sidebarZh, translation: translationZh },
  },
})

const root = document.getElementById("root")
if (root !== null) ReactDOM.render(<App />, root)
