# Kapprompt — Eine Reise durch die Welt der KI

> Die Website von **Kapprompt** (kapprompt.ch). Statt über künstliche Intelligenz zu *reden*,
> **zeigt** diese Seite, was heute möglich ist — und beweist es im selben Moment selbst:
> jede Szene wird live im Browser gerechnet, mit genau der Art von Technik, die Kapprompt baut.

---

## Warum es diese Seite gibt — das Ziel

Kapprompt hilft Schweizer KMU, künstliche Intelligenz sinnvoll einzusetzen. Das Problem dabei:
KI ist für viele abstrakt. Eine klassische Agentur-Seite mit Stockfotos und Bullet-Points überzeugt
niemanden, der KI noch nicht „gefühlt" hat.

Diese Seite geht den umgekehrten Weg — sie ist **Argument und Beweis in einem**:

- **Zeigen statt behaupten.** Wer nach unten scrollt, erlebt eine kuratierte Reise durch das, was
  KI und moderne Webtechnik heute können — von einem Partikel-Hirn über ein in Echtzeit gerendertes
  Produkt bis zu einem begehbaren 3D-Wohnzimmer.
- **Die Seite ist das Portfolio.** Jeder Effekt läuft live im Browser, nicht als Video. Das ist der
  glaubwürdigste Pitch: „Das hier haben wir gebaut — stell dir vor, was wir für dich bauen."
- **Vertrauen durch Qualität.** Ruhige, hochwertige Bewegung, klare Typografie, warme Materialität.
  Kein Tech-Demo-Lärm, sondern eine Award-taugliche Inszenierung, die Kompetenz ausstrahlt.
- **Emotion vor Erklärung.** Die Reise weckt Neugier; der Kontakt am Ende verwandelt sie in ein
  Gespräch.

Kurz: Die Seite verkauft nicht mit Worten, sondern mit Erlebnis.

---

## Die Reise (von oben nach unten)

Die Seite ist **scroll-narrativ** aufgebaut — Scrollen ist die Hauptsteuerung, nicht Hover. Jede
3D-Szene sitzt in einem gepinnten Bereich und animiert sich, während man durchscrollt.

1. **01 — Hero:** ein Partikel-Hirn, das sich beim Scrollen in die **Erde** verwandelt.
2. **02 — Was KI kann:** warme Welt mit fetter Typografie, Lauftext und konkreten Fakten.
3. **03 — Produkt:** eine Glas-/Metall-Dose (Three.js) fährt herein, driftet mit dem Seitenfluss,
   der Deckel öffnet sich **durch Scroll** und gibt den glühenden Kern frei.
4. **04 — Zuhause:** ein warmes, modernes 3D-**Wohnzimmer** (Sofa, Sessel, Couchtisch, Teppich,
   Steh-/Pendelleuchte, Fenster mit Tageslicht, Bilder, Regal, Pflanzen). Es **baut sich beim
   Scrollen auf**, während die Kamera weich hindurchgleitet.
5. **05 — Im Fluss:** schwebende Objekte, die **dauerhaft** wandern, sich kreuzen und vorbeiziehen;
   Scroll zieht den Schwarm auseinander.
6. **06 — Interaktiv:** eine 3D-Figur, die **deiner Maus folgt** und sich im Ruhezustand umsieht.
7. **07 — Perspektive:** interaktive Karten mit 3D-Neigung, wanderndem Lichtreflex und Rand-Glow.
8. **08 — Kino:** eine scroll-gesteuerte Bildsequenz — der Besucher führt Regie.
9. **09 — Abschluss + Footer** (Name, Kontakt, Impressum, Datenschutz).

---

## Technische Entscheidungen (und warum)

- **Kein Build, keine Installation.** Reine statische Seite (HTML/CSS/JS). Das hält den Betrieb
  simpel, robust und schnell — perfekt für GitHub + Vercel, ohne CI-Pipeline.
- **Echtes Three.js statt React/R3F.** Die 3D-Szenen nutzen Three.js direkt als ES-Module, geladen
  per CDN-Importmap. Gleiche Qualität wie ein React-Three-Fiber-Stack, aber ohne Build-Schritt.
- **Scroll als Erzählmotor.** Ein eigener `scrollProgress` (0–1) pro gepinnter Sektion steuert
  Kamera, Dosen-Öffnung, Raum-Aufbau und Objekt-Spread. Hover ist nur ein kleiner Akzent.
- **Performance & Rücksicht.** Szenen werden **lazy** geladen und nur gerendert, wenn sie sichtbar
  sind. Auf Mobile weniger Objekte/Lichter und kein teures Glas-Transmission. `prefers-reduced-motion`
  wird respektiert; ohne WebGL gibt es einen sauberen Fallback.

### Projektstruktur

```
kapprompt/
├─ index.html              # die Reise (Einstieg)
├─ impressum.html          # Impressum (CH/UWG)
├─ datenschutz.html        # Datenschutz (revDSG)
├─ .nojekyll
├─ README.md
└─ assets/
   ├─ css/   styles.css · showcase.css
   ├─ js/    main.js · showcase/ (index, base, can, room, floating, card)
   ├─ fonts/ Inter · Instrument Serif · Anton (SIL OFL)
   ├─ img/   logo.png
   └─ frames/ (Bildsequenz für die Kino-Szene)
```

Die 3D-Module unter `assets/js/showcase/`:
`index.js` (Orchestrator `ShowcaseSection` — Lazy-Load + Sichtbarkeits-Gating),
`base.js` (Renderer, Studio-Licht, scrollProgress, Lifecycle),
`can.js` (`ProductCanScene`), `room.js` (`LivingRoomScene`),
`floating.js` (`FloatingObjectsScene`), `card.js` (`PerspectiveHighlightCard`).

---

## Lokal ansehen

Im Ordner mit der `index.html`:

```bash
python3 -m http.server 8000      # dann http://localhost:8000
```

(Ein echter Server ist nötig, weil ES-Module nicht über `file://` laden.)

---

## Deployment

- **Vercel** (kapprompt.ch): Repo verbunden → jeder Push auf `main` deployt automatisch. Es ist
  eine statische Seite, kein Build-Command nötig.
- **GitHub Pages** (Alternative): Repo-Inhalt liegt im Root, `.nojekyll` ist vorhanden →
  Settings → Pages → Branch `main`, Ordner `/ (root)`.

Statische Assets werden über Cache-Busting (`?v=…`) aktualisiert, wenn JS/CSS sich ändern.

---

## Rechtliches & Credits

- **Impressum** nach Art. 3 UWG, **Datenschutz** nach revDSG — siehe `impressum.html` /
  `datenschutz.html`. Kontakt: **mail@gian-kappeler.ch**.
- Keine Cookies, kein Tracking. Extern werden nur Three.js (jsDelivr) und die 3D-Figur (Spline)
  geladen; dabei kann die IP an deren Server übermittelt werden.
- Die eigenen 3D-Szenen sind mit Three.js gebaut. Die interaktive 3D-Figur und die Fahrzeugsequenz
  stammen aus **öffentlichen Demos Dritter** — Marken- und Bildrechte verbleiben bei den Inhabern.
  Für eine dauerhaft öffentliche Seite empfiehlt sich eigenes, lizenziertes Material.
- Schriften: Inter, Instrument Serif, Anton (alle SIL Open Font License).

© 2026 Kapprompt · Ein Projekt von Gian Kappeler
