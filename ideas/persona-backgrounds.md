# Idea on ice: persona background switcher

Status: **designed, judged, NOT shipped** (Mark, Aug 2026: "i dont like this feature right now
we can come back to it later... lets store this idea for later")

## The idea (Mark's, via a friend)

A little deliberately-modest dropdown in the statusbar — `YOU: BASIC` — with options
ENGINEER / OPERATOR / SCIENTIST / OTHER. Picking one swaps the paper the site is printed on.
Default stays byte-identical to the shipped page. No external assets: SVG data-URI tiles,
a data-theme attribute, ~10 lines of vanilla JS with localStorage persistence.

## Panel verdict (3 designers, 3 judges — delight / design / craft)

Winner overall: **notebooks** (delight 9, craft 9 "flawless"). Per-persona verdicts:

- **engineer** — notebooks, unanimous: warm parchment (#F4ECD9) with mottled corners,
  Vitruvian proportion study, gear-and-crank linkage, ornithopter wing ribs, mirror-script squiggles.
- **operator** — notebooks (2 of 3): the "dispatch wall" — pin-dot pinboard grid, route network
  with a dashed contingency arc, checklist with the last box open, small gantt, crosshair.
  (Design judge preferred worlds' "plotting board" that promotes the site's own 24px grid.)
- **scientist** — worlds (2 of 3): millimeter paper ruled in the site's own #2337C6 blue with one
  bubble-chamber event (dotted neutral track, tightening decay spiral, one blue track).
- **other** — worlds, unanimous, "best single idea in the entire exercise": the exact same 24px
  grid redrawn freehand with a 2px wobble — same space, same spacing, refuses the ruling.
- **dropdown chrome** — notebooks: `YOU: BASIC` with a real <label for>, native select arrow left
  alone (that IS the little-shitty charm), IBM Plex Mono 11.5px, in-system border.

Recommended composite when revived: notebooks base + worlds' scientist theme + worlds' other theme.
Craft note if using worlds' code: its localStorage restore path doesn't validate stored values
(garbage value leaves the select blank until touched) — use notebooks' guarded restore pattern.
All three implementations were live-verified by judges: themes render, persistence works,
statusbar wraps cleanly at 375px, default page stays byte-identical.

---

## SHIPPABLE BASE — the "notebooks" implementation (3 edits to index.html)

Old-string anchors below matched the Aug 2026 file; re-anchor before applying to a newer file.
### Edit 1 — Statusbar: add the persona dropdown as a middle span
Replace:
```html
  <span><b>APPLICATIONS ALWAYS OPEN</b> &middot; FIRST COHORT: 2026 &middot; US ONLY, FOR NOW</span>
  <span class="nav"><a href="apply.html">Apply</a><a href="nominate.html">Nominate</a></span>
```
With:
```html
  <span><b>APPLICATIONS ALWAYS OPEN</b> &middot; FIRST COHORT: 2026 &middot; US ONLY, FOR NOW</span>
  <span class="mode"><label for="persona">YOU:</label>
    <select id="persona" aria-label="Choose your persona (changes the paper)">
      <option value="basic" selected>BASIC</option>
      <option value="engineer">ENGINEER</option>
      <option value="operator">OPERATOR</option>
      <option value="scientist">SCIENTIST</option>
      <option value="other">OTHER</option>
    </select>
  </span>
  <span class="nav"><a href="apply.html">Apply</a><a href="nominate.html">Nominate</a></span>
```
### Edit 2 — CSS: dropdown styling + four persona papers, appended at end of stylesheet
Replace:
```html
  @media(max-width:440px){
    .roster{grid-template-columns:repeat(2,1fr)}
  }

</style>
```
With:
```html
  @media(max-width:440px){
    .roster{grid-template-columns:repeat(2,1fr)}
  }

  /* ---- persona papers ---- */
  .statusbar .mode{display:flex;align-items:center;gap:6px}
  .statusbar select{
    font-family:var(--mono);font-size:11.5px;letter-spacing:.08em;
    color:var(--ink);background:var(--paper);
    border:1px solid var(--line);border-radius:0;
    padding:1px 3px;cursor:pointer;
  }
  body{transition:background-color .4s ease}
  [data-theme="engineer"] body{
    --paper:#F4ECD9;
    background-color:var(--paper);
    background-image:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='460' height='460' viewBox='0 0 460 460'%3E%3Cg fill='none' stroke='rgba(86,58,16,0.09)' stroke-width='1'%3E%3Ccircle cx='118' cy='120' r='74'/%3E%3Crect x='66' y='68' width='104' height='104'/%3E%3Cpath d='M66 68 L170 172 M170 68 L66 172'/%3E%3Ccircle cx='118' cy='120' r='52' stroke-dasharray='3 5'/%3E%3Ccircle cx='356' cy='96' r='38' stroke-dasharray='6 4'/%3E%3Ccircle cx='356' cy='96' r='30'/%3E%3Ccircle cx='356' cy='96' r='9'/%3E%3Cpath d='M356 66 V126 M326 96 H386 M335 75 L377 117 M377 75 L335 117'/%3E%3Ccircle cx='268' cy='210' r='6'/%3E%3Cpath d='M352 134 L268 210 L206 262'/%3E%3Ccircle cx='206' cy='262' r='4'/%3E%3Cpath d='M36 372 Q150 306 300 352 M36 372 Q150 330 296 366 M84 349 L88 368 M132 334 L138 357 M180 329 L186 352 M228 332 L232 355 M270 341 L272 361'/%3E%3Cpath d='M382 300 l38 -26 M390 312 l38 -26 M398 324 l38 -26 M406 336 l38 -26'/%3E%3Cpath d='M40 224 q5 -7 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 M40 240 q5 -7 10 0 t10 0 t10 0 t10 0 t10 0 M40 256 q5 -7 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0'/%3E%3Cpath d='M300 250 q40 18 80 8 m0 0 l-12 -2 m12 2 l-10 7'/%3E%3C/g%3E%3C/svg%3E"),
      radial-gradient(ellipse at 18% 8%, rgba(120,82,34,.05), transparent 55%),
      radial-gradient(ellipse at 85% 92%, rgba(120,82,34,.045), transparent 50%);
    background-size:460px 460px,100% 100%,100% 100%;
  }
  [data-theme="operator"] body{
    --paper:#F9FAF8;
    background-color:var(--paper);
    background-image:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='480' viewBox='0 0 480 480'%3E%3Cg fill='none' stroke='rgba(22,24,29,0.075)' stroke-width='1'%3E%3Ccircle cx='70' cy='84' r='5'/%3E%3Crect x='196' y='48' width='10' height='10'/%3E%3Ccircle cx='330' cy='110' r='5'/%3E%3Ccircle cx='430' cy='60' r='3'/%3E%3Cpath d='M75 82 L195 54 M207 57 L325 108 M335 108 L427 61'/%3E%3Cpath d='M76 89 Q240 190 326 115' stroke-dasharray='4 5'/%3E%3Cpath d='M138 60 l6 6 m0 -6 l-6 6 M268 78 l6 6 m0 -6 l-6 6'/%3E%3Crect x='48' y='300' width='9' height='9'/%3E%3Cpath d='M50 305 l3 3 5 -7'/%3E%3Cpath d='M68 305 H176'/%3E%3Crect x='48' y='324' width='9' height='9'/%3E%3Cpath d='M50 329 l3 3 5 -7'/%3E%3Cpath d='M68 329 H160'/%3E%3Crect x='48' y='348' width='9' height='9'/%3E%3Cpath d='M68 353 H188'/%3E%3Cpath d='M250 240 V292 M258 250 h70 M258 266 h96 M258 282 h44 M328 244 v12 M354 260 v12'/%3E%3Ccircle cx='396' cy='340' r='14'/%3E%3Cpath d='M396 318 V362 M374 340 H418'/%3E%3C/g%3E%3C/svg%3E"),
      radial-gradient(circle, rgba(22,24,29,.085) 1px, transparent 1.4px);
    background-size:480px 480px,24px 24px;
  }
  [data-theme="scientist"] body{
    --paper:#F8FAFB;
    background-color:var(--paper);
    background-image:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='480' viewBox='0 0 480 480'%3E%3Cg fill='none' stroke='rgba(25,70,120,0.095)' stroke-width='1'%3E%3Cpath d='M96 60 L196 150' stroke-dasharray='2 5'/%3E%3Cpath d='M196 150 q52 -10 64 32 q10 38 -28 46 q-32 7 -40 -22 q-6 -24 18 -30 q18 -4 22 12'/%3E%3Cpath d='M196 150 q-8 50 -48 42 q-36 -8 -26 -44 q8 -30 38 -22 q22 6 16 28'/%3E%3Cpath d='M300 96 V236 H452'/%3E%3Cpath d='M300 220 q60 -4 88 -48 q20 -32 56 -40'/%3E%3Cpath d='M332 214 v-14 M326 207 h12 M368 190 v-16 M362 182 h12 M404 152 v-16 M398 144 h12 M436 136 v-14 M430 129 h12'/%3E%3Cpath d='M48 418 h176 M48 418 q60 0 76 -60 q14 -50 28 0 q16 60 76 60'/%3E%3Cpath d='M282 300 q10 -6 8 6 l-8 40 q-2 12 -12 6 M300 320 q8 -12 16 0 t16 0 t16 0 M356 314 h24 M356 322 h24'/%3E%3Cpath d='M400 380 l16 -9 16 9 v18 l-16 9 -16 -9 z'/%3E%3Ccircle cx='416' cy='389' r='8'/%3E%3C/g%3E%3C/svg%3E"),
      linear-gradient(rgba(45,95,160,.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(45,95,160,.08) 1px, transparent 1px),
      linear-gradient(rgba(45,95,160,.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(45,95,160,.04) 1px, transparent 1px);
    background-size:480px 480px,50px 50px,50px 50px,10px 10px,10px 10px;
  }
  [data-theme="other"] body{
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='520' height='520' viewBox='0 0 520 520'%3E%3Cg fill='none' stroke='rgba(22,24,29,0.065)' stroke-width='1'%3E%3Cpath d='M64 92 q22 -34 44 -8 q18 22 -8 34 q-26 12 -30 -14 q-3 -20 18 -24'/%3E%3Cpath d='M368 64 l4 12 13 1 -10 8 4 13 -11 -8 -11 8 4 -13 -10 -8 13 -1 z'/%3E%3Cpath d='M112 356 l96 -34 -58 54 z m38 20 l-6 22 14 -18'/%3E%3Cpath d='M404 402 q24 -18 34 6 q8 20 -14 26 q-18 5 -22 -12 q-3 -13 10 -16 q10 -2 12 8'/%3E%3Cpath d='M254 182 v22 M244 187 l20 12 M264 187 l-20 12'/%3E%3C/g%3E%3C/svg%3E");
    background-size:520px 520px;
  }

</style>
```
### Edit 3 — Script: wire the select to data-theme on <html>, with localStorage persistence
Replace:
```html
</footer>

</body>
```
With:
```html
</footer>

<script>
(function(){
  var s=document.getElementById('persona'),r=document.documentElement;
  function set(v){v==='basic'?r.removeAttribute('data-theme'):r.setAttribute('data-theme',v)}
  try{var v=localStorage.getItem('basis-persona');if(v&&s.querySelector('option[value="'+v+'"]')){s.value=v;set(v)}}catch(e){}
  s.addEventListener('change',function(){set(s.value);try{localStorage.setItem('basis-persona',s.value)}catch(e){}});
})();
</script>

</body>
```
---

## ALTERNATE THEMES — from the "worlds" implementation

Full CSS block (contains its engineer/operator/scientist/other themes; lift the
`[data-theme="scientist"]` and `[data-theme="other"]` rules for the recommended composite):
```html
  @media(max-width:440px){
    .roster{grid-template-columns:repeat(2,1fr)}
  }

  /* ---- persona paper ---- */
  .statusbar select{
    font-family:var(--mono);font-size:11.5px;letter-spacing:.08em;
    color:var(--gray);background:var(--paper);
    border:1px solid var(--line);border-radius:0;padding:1px 4px;cursor:pointer;
  }
  .statusbar select:hover{color:var(--ink)}
  :root[data-theme="engineer"]{--paper:#F7F0DF}
  [data-theme="engineer"] body{
    background-image:url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='360'%20height='360'%3E%20%3Cg%20fill='none'%20stroke='%236b4a1f'%20stroke-opacity='.09'%20stroke-width='1'%3E%20%3Ccircle%20cx='88'%20cy='86'%20r='47'%20stroke-width='7'%20stroke-dasharray='5%208'%20stroke-opacity='.05'/%3E%20%3Ccircle%20cx='88'%20cy='86'%20r='38'/%3E%20%3Ccircle%20cx='88'%20cy='86'%20r='13'/%3E%20%3Cpath%20d='M88%2048v76M50%2086h76'/%3E%20%3Crect%20x='232'%20y='212'%20width='94'%20height='94'/%3E%20%3Ccircle%20cx='279'%20cy='259'%20r='47'/%3E%20%3Cpath%20d='M232%20212l94%2094M326%20212l-94%2094'/%3E%20%3Cpath%20d='M16%20258q80-52%20168-10'/%3E%20%3Cpath%20d='M52%20240v22M96%20228v28M140%20230v26'/%3E%20%3Cpath%20d='M212%2062l58-20%2052%2048'/%3E%20%3Ccircle%20cx='212'%20cy='62'%20r='3'/%3E%20%3Ccircle%20cx='270'%20cy='42'%20r='3'/%3E%20%3Ccircle%20cx='322'%20cy='90'%20r='3'/%3E%20%3Cpath%20d='M178%20142l26-16M184%20150l26-16M190%20158l26-16M196%20166l26-16'/%3E%20%3Cpath%20d='M28%20322q6-6%2012%200t12%200t12%200t12%200t12%200t12%200'%20stroke-opacity='.08'/%3E%20%3Cpath%20d='M156%20322q6-6%2012%200t12%200t12%200t12%200'%20stroke-opacity='.08'/%3E%20%3Cpath%20d='M28%20338q6-6%2012%200t12%200t12%200t12%200t12%200'%20stroke-opacity='.08'/%3E%20%3C/g%3E%20%3C/svg%3E");
    background-size:360px 360px;
  }
  :root[data-theme="scientist"]{--paper:#F8FAF9}
  [data-theme="scientist"] body{
    background-image:
      url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='420'%20height='420'%3E%20%3Cg%20fill='none'%20stroke='%2316181d'%20stroke-opacity='.08'%20stroke-width='1'%3E%20%3Cpath%20d='M0%20386q210-96%20420-50'/%3E%20%3Cpath%20d='M26%200q120%20160%2034%20420'/%3E%20%3Cpath%20d='M132%20302q44-64%2096-72t88%2026'/%3E%20%3Cpath%20d='M132%20302q60-18%20118%208'/%3E%20%3Cpath%20d='M132%20302l96%2088'%20stroke-dasharray='1%206'/%3E%20%3Cpath%20d='M310%20120a45%2045%200%200%201-90%200a38%2038%200%200%201%2076%200a31%2031%200%200%201-62%200a24%2024%200%200%201%2048%200a17%2017%200%200%201-34%200a10%2010%200%200%201%2020%200'/%3E%20%3C/g%3E%20%3Ccircle%20cx='132'%20cy='302'%20r='1.6'%20fill='%2316181d'%20fill-opacity='.12'/%3E%20%3Cpath%20d='M56%20420q90-140%20180-176'%20fill='none'%20stroke='%232337C6'%20stroke-opacity='.1'/%3E%20%3C/svg%3E"),
      linear-gradient(rgba(35,55,198,.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(35,55,198,.06) 1px, transparent 1px),
      linear-gradient(rgba(35,55,198,.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(35,55,198,.03) 1px, transparent 1px);
    background-size:420px 420px,40px 40px,40px 40px,8px 8px,8px 8px;
  }
  [data-theme="operator"] body{
    background-image:
      url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='440'%20height='440'%3E%20%3Cg%20fill='none'%20stroke='%2316181d'%20stroke-opacity='.07'%20stroke-width='1'%3E%20%3Ccircle%20cx='336'%20cy='112'%20r='22'/%3E%20%3Ccircle%20cx='336'%20cy='112'%20r='46'/%3E%20%3Ccircle%20cx='336'%20cy='112'%20r='70'/%3E%20%3Cpath%20d='M336%2034v156M258%20112h156'/%3E%20%3Cpath%20d='M62%2084q60%2044%20118%20118'%20stroke-dasharray='4%205'/%3E%20%3Cpath%20d='M180%20202q-46%2066-92%20140'%20stroke-dasharray='4%205'/%3E%20%3Cpath%20d='M180%20202q64%2040%20122%20100'%20stroke-dasharray='4%205'/%3E%20%3Cpath%20d='M302%20302q46%2036%2088%2080'%20stroke-dasharray='4%205'/%3E%20%3Cpath%20d='M20%2012v16M12%2020h16M228%20132v16M220%20140h16M108%20392v16M100%20400h16'/%3E%20%3Cpath%20d='M180%20194l6%208-6%208-6-8z'/%3E%20%3Cpath%20d='M302%20294l6%208-6%208-6-8z'/%3E%20%3C/g%3E%20%3Cg%20fill='%2316181d'%20fill-opacity='.1'%3E%20%3Ccircle%20cx='62'%20cy='84'%20r='2'/%3E%20%3Ccircle%20cx='88'%20cy='342'%20r='2'/%3E%20%3Ccircle%20cx='390'%20cy='382'%20r='2'/%3E%20%3Ccircle%20cx='222'%20cy='44'%20r='2'/%3E%20%3C/g%3E%20%3Cpath%20d='M222%2044q66%2018%20114%2068'%20fill='none'%20stroke='%232337C6'%20stroke-opacity='.1'/%3E%20%3C/svg%3E"),
      linear-gradient(var(--grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid) 1px, transparent 1px);
    background-size:440px 440px,24px 24px,24px 24px;
  }
  [data-theme="other"] body{
    background-image:url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='96'%20height='96'%3E%20%3Cg%20fill='none'%20stroke='%2316181d'%20stroke-opacity='.07'%20stroke-width='1'%3E%20%3Cpath%20d='M0%2012q12%202%2024%200t24%200t24%200t24%200'/%3E%20%3Cpath%20d='M0%2036q12-2%2024%200t24%200t24%200t24%200'/%3E%20%3Cpath%20d='M0%2060q12%202%2024%200t24%200t24%200t24%200'/%3E%20%3Cpath%20d='M0%2084q12-2%2024%200t24%200t24%200t24%200'/%3E%20%3Cpath%20d='M12%200q2%2012%200%2024t0%2024t0%2024t0%2024'/%3E%20%3Cpath%20d='M36%200q-2%2012%200%2024t0%2024t0%2024t0%2024'/%3E%20%3Cpath%20d='M60%200q2%2012%200%2024t0%2024t0%2024t0%2024'/%3E%20%3Cpath%20d='M84%200q-2%2012%200%2024t0%2024t0%2024t0%2024'/%3E%20%3C/g%3E%20%3C/svg%3E");
    background-size:96px 96px;
  }

</style>
```

## Theme concepts (one-liners)

**notebooks**:
- engineer: A da Vinci codex leaf: warm parchment with softly mottled corners, a Vitruvian proportion circle squared and diagonalled, a dashed-toothed gear driving a crank linkage, an ornithopter wing with ribs, cross-hatching, and three lines of mirrored-script squiggle notes.
- operator: The dispatch wall: a pin-dot grid carrying a route network of waypoint nodes with x-marked stops and one dashed contingency arc, a ticked manifest checklist (last item still open), a small gantt of running workstreams, and a crosshair registration mark — the surface of someone who keeps the whole thing moving.
- scientist: Blue millimeter graph paper (1/5 ruled) worn like a lab notebook: a bubble-chamber pair-production vertex spiraling off a dashed neutral track, a plotted curve with error-barred data points on hand-drawn axes, a Gaussian on its baseline, an integral scrawl, and a benzene ring in the corner.
- other: Unruled paper — the grid itself removed, because no category fits — scattered with faint marginalia: a loop scribble, a hand-drawn star, a paper dart, a little spiral, an asterisk; the quiet doodles of someone thinking outside every box the form offers.

**worlds**:
- engineer: A page torn from a codex: sepia paper where a dash-toothed gear, a Vitruvian circle-in-square study, wing ribs, a jointed linkage, cross-hatching, and rows of mirrored-script waves float in faded brown ink.
- operator: The plotting board of someone who runs the whole map: the site's own grid becomes a chart with radar range-rings, dashed routes arcing between station dots and waypoint diamonds, sparse registration crosses, and one live blue route inbound to the rings.
- scientist: A bubble-chamber photograph printed on blue millimeter graph paper: long curving tracks, a dotted neutral-particle line leaving a vertex, a tightening decay spiral, and a single faint blue track for the event that mattered.
- other: The exact same graph paper, but every line is drawn freehand: the grid gently wobbles, for people who fit the space but not the ruling.
- basic (default): Untouched: the existing paper and 24px grid, byte-for-byte the same until the user plays.
