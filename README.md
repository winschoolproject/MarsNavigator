# Mars Navigator

**Interplanetary Survival Guide: Martian Map**
NASA Space Apps Challenge 2026

**Live site:** https://winschoolproject.github.io/MarsNavigator/

A layered Mars map that tells the first human crews where to walk, when to walk, and how to stay safe.

## Team

A team of Year 5 students from Winchester School, Jebel Ali, Dubai. Parts of the project:

- Navigation: field guide, temperature zones, navigation and the Marswalk route plan
- Solar power plan: equator belt and polar farm
- Safety layer: radiation, natural shelters, dust storms, helmet alert

## Pages

| Page | What it does |
|---|---|
| [Map, home page](https://winschoolproject.github.io/MarsNavigator/) (`index.html`) | NASA Mars Trek layers, six mission objectives, route planner on Curiosity's real path, turn-by-turn navigation, temperature zone clock |
| [3D Globe](https://winschoolproject.github.io/MarsNavigator/globe.html) (`globe.html`) | Slide-sized globe with a fixed pin, what lies in each direction, suit meter, live Sun position and sunlight, Earth distance |
| [Presentation](https://winschoolproject.github.io/MarsNavigator/present.html) (`present.html`) | Three illustrated guides (invented characters) explain the project in 30 seconds, 1 minute or 2 minutes, with narration and captions |
| [Field Guide](https://winschoolproject.github.io/MarsNavigator/guide.html) (`guide.html`) | The team's field guide, safety layer, solar power plan, and all credits and sources |

Every page also has a **crew chat** and a **field camera**.

## Three ways to travel

| Mode | Planning speed | Notes |
|---|---|---|
| On foot (suited) | about 2 km/h | Short walks near base, inside the GO window |
| Pressurised rover | about 10 km/h | Our planning figure; a cabin to shelter in |
| Nuclear-Powered Navigator | about 350 km/h, 1.5 km up | Concept aircraft. Estimates from NASA-funded studies: MANGLE nuclear concept (about Mach 0.4) and the ARES Mars airplane (145 m/s). Ingenuity's record was 36 km/h |

## How it works on Mars

- The app runs from a small server at the base and in each rover, with every map tile loaded before launch, so it works with no link to Earth.
- Suits, rovers, the Navigator and tablets reach it over a local radio network. Team chat and photo sharing on Mars are instant.
- Messages and photos for Earth go through the Mars relay orbiters (MRO, Odyssey, MAVEN, Trace Gas Orbiter, Mars Express) to NASA's Deep Space Network, 3 to 22 minutes later. Today Curiosity and Perseverance send over 99% of their data this way.
- This website already works offline: it keeps a copy of its pages and every map tile you have viewed (`sw.js`), and its map libraries are included in `lib/`.

## Mission objectives

1. Land safely and set up base
2. Find water ice
3. Search for signs of ancient life
4. Power the base
5. Stay safe from radiation and dust
6. Daily Marswalk

## Data sources

**NASA**
- Mars Trek map tiles: Viking colour mosaic, MOLA height map, THEMIS day and night infrared, TES thermal inertia and dust, CTX and HiRISE close-ups (https://trek.nasa.gov/mars/)
- Curiosity and Perseverance rover waypoints (mars.nasa.gov)
- Curiosity RAD and REMS, Perseverance MEDA and MOXIE results
- Mars24 Sunclock method, NASA GISS (https://www.giss.nasa.gov/tools/mars24/)
- JPL approximate planet positions (https://ssd.jpl.nasa.gov/planets/approx_pos.html)
- Images from the NASA Planetary Photojournal, credited on the Field Guide page

**Partners and others**
- ESA / DLR / FU Berlin (Mars Express HRSC)
- USGS / IAU Gazetteer of Planetary Nomenclature (https://planetarynames.wr.usgs.gov/)
- SWIM ice mapping project, Planetary Science Institute with NASA JPL (https://swim.psi.edu/)
- NASA Mars Relay Network (https://science.nasa.gov/mars/mars-relay-network/)
- MANGLE nuclear Mars aircraft study, AIAA 2014-3820; ARES Mars airplane, NASA Langley; Ingenuity records, NASA JPL

Full credits, with links, are on the [Field Guide page](https://winschoolproject.github.io/MarsNavigator/guide.html#team).

## Future data source: the UAE's Hope probe

We built Mars Navigator in the UAE, which has its own Mars mission. Hope measures the atmosphere across the whole planet, through the day and the seasons, so it is the data we would like to add next to make our temperature clock more accurate. We have not used Hope data in this version.

- Emirates Mars Mission (Hope probe), MBRSC and UAE Space Agency: https://www.emiratesmarsmission.ae/ ; Science Data Centre: https://sdc.emiratesmarsmission.ae

## Honest notes

- The temperature layer is our own simple model fitted to two real weather stations (Curiosity and Perseverance). It is a teaching tool, not a forecast.
- Suit readings on the 3D globe are simulated demo values.
- The presentation voices are computer-generated (Kokoro neural text-to-speech, made offline, pitched to sound like 10 to 12 year olds). The presenters are illustrations drawn in code.
- The chat and camera run in demo mode. A public website has no satellite link, so messages, photos and videos stay in your browser and are shared between its open tabs.
- Prepared by the team with help from an SI assistant for coding and fact-checking. Every fact was checked by the team. The six team diagrams were drawn with an SI image tool from the team's own ideas and carry an "SI-assisted image" mark. No NASA image was changed or generated.

## Built with

Plain HTML, CSS and JavaScript, [Leaflet](https://leafletjs.com/) (BSD-2 licence) and [three.js](https://threejs.org/) (MIT licence), both included in `lib/`. Narration made with [Kokoro-82M](https://github.com/hexgrad/kokoro) text-to-speech (Apache 2.0), run with [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) (MIT). Hosted on GitHub Pages.

## Files

- `index.html` (map, home page), `globe.html`, `guide.html`, `present.html`: the four pages
- `data.js`: place names and the built-in copy of NASA rover waypoints
- `crew.js`: crew chat and field camera
- `sw.js`: offline helper (keeps pages and viewed map tiles)
- `lib/`: Leaflet and three.js
- `audio/`: presentation narration
- `img/`: NASA images and team diagrams

NASA does not endorse this project.
