import { useEffect, useRef } from 'react'

// One dither cell in CSS px: finer below the sm breakpoint, where the field
// is small and held close (either way about 6 device px on a typical
// screen). The canvas holds one pixel per cell and is scaled up unsmoothed,
// so every cell lands as a crisp square of print.
const cellSize = width => (width < 640 ? 2 : 3)
// stepped playback: the staccato of a low frame-rate print run
const FPS = 12
const RIPPLE_SECONDS = 1.6

const PATTERNS = { films: 0, books: 1, music: 2 }

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

// Each pattern is a tone field (0 dark ink, 1 light ink) thresholded against
// an 8x8 ordered Bayer matrix, so every frame is exactly two inks.
const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_size;    // canvas, in cells
uniform float u_cell;   // CSS px per cell
uniform float u_time;   // seconds
uniform int u_pattern;  // 0 films, 1 books, 2 music
uniform vec2 u_anchor;  // artwork centre, CSS px
uniform vec4 u_quiet;   // headline column (x0, y0, x1, y1), CSS px
uniform vec3 u_pointer; // CSS px, z = presence 0..1
uniform vec3 u_ripple;  // CSS px, z = seconds since the tap
uniform vec3 u_ink0;
uniform vec3 u_ink1;

float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x * 0.5 + a.y * a.y * 0.75);
}

float bayer8(vec2 a) {
  return bayer2(a * 0.25) * 0.0625 + bayer2(a * 0.5) * 0.25 + bayer2(a);
}

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = p * 2.03 + 17.0;
    a *= 0.5;
  }
  return v;
}

// One depth of lava-lamp wax holding count bubbles. Each owns a slot across
// the width, so they stay spread out, but starts and speeds are random, so
// bubbles overtake one another and fuse as they pass. Returns the wax
// coverage (bubbles fuse as metaballs), its rim, and any popping rings.
vec3 waxLayer(vec2 px, float t, vec2 field, float count, float rmin, float rmax, float speed, float layer) {
  count = floor(count);
  float wax = 0.0;
  float pops = 0.0;
  for (int i = 0; i < 56; i++) {
    float k = float(i);
    if (k >= count) break;
    // each bubble climbs, rests out of sight, then comes back as a new one
    vec2 id = vec2(k, layer);
    float v = speed * (0.7 + 0.6 * hash(id + 1.3));
    float lifetime = (field.y + 2.0 * rmax + 40.0) / v + hash(id + 2.7) * 2.0;
    float phase = t / lifetime + hash(id + 4.1);
    float age = fract(phase) * lifetime;
    vec2 seed = vec2(k + layer * 60.0, floor(phase));
    float radius = mix(rmin, rmax, hash(seed + 0.5));
    float x = (k + hash(seed + 1.5)) / count * field.x;
    vec2 centre = vec2(x + sin(age * 0.7 + k) * radius * 0.8, field.y + radius - age * v);
    // fewer than half pop on the way up; the rest rise out of the top
    float popAt = hash(seed + 4.5) < 0.4 ? mix(0.15, 0.75, hash(seed + 5.5)) * field.y : -1e4;
    if (centre.y > popAt) {
      // reaches nothing beyond twice the radius, so a crowd never silts the
      // whole field up; 1 at the bubble's edge
      vec2 d = px - centre;
      float q = max(0.0, 1.0 - dot(d, d) / (4.0 * radius * radius));
      wax += q * q * 1.7778;
    } else {
      float since = (popAt - centre.y) / v;
      if (since < 0.4) {
        float ring = length(px - vec2(centre.x, popAt)) - radius * (1.0 + since * 2.0);
        pops += (1.0 - since / 0.4) * exp(-ring * ring / 12.0);
      }
    }
  }
  // wax is 1 at a lone bubble's edge and fuses where two meet
  return vec3(smoothstep(0.8, 1.15, wax), exp(-pow((wax - 0.95) / 0.15, 2.0)), pops);
}

// films: a lava lamp welling up out of a glow at the foot of the field. A
// far layer of small, faint, slow bubbles sits behind the main wax, whose
// medium and large bubbles fuse and part as they climb. Counts follow the
// field's area, and narrow screens get smaller bubbles so a phone still holds
// plenty.
float lavaLamp(vec2 px, float t) {
  vec2 field = u_size * u_cell;
  float scale = clamp(field.x / 1100.0, 0.6, 1.0);
  float room = field.x * field.y / (scale * scale);
  float glow = smoothstep(field.y * 0.35, field.y, px.y) * 0.12;
  float tone = 0.02 + glow + fbm(px / 260.0 + vec2(0.0, t * 0.03)) * 0.06;
  vec3 back = waxLayer(px, t, field, min(room / 6000.0, 56.0), max(5.0 * scale, 4.0), 11.0 * scale, 9.0, 0.0);
  tone = mix(tone, 0.24, back.x) + back.y * 0.1 + back.z * 0.3;
  vec3 wax = waxLayer(px, t, field, min(room / 7000.0, 56.0), 12.0 * scale, 40.0 * scale, 20.0, 1.0);
  return mix(tone, 0.52, wax.x) + wax.y * 0.3 + wax.z * 0.8;
}

// books: marbled endpaper, domain-warped noise combed into veins
float marbled(vec2 px, float t) {
  vec2 q = px / 260.0;
  vec2 w = vec2(fbm(q + vec2(0.0, t * 0.035)), fbm(q + vec2(5.2, 1.3) - t * 0.028));
  float m = fbm(q + 2.6 * w);
  float veins = 0.5 + 0.5 * sin((m * 9.0 + q.y * 1.5) * 3.14159);
  return 0.02 + smoothstep(0.25, 1.0, veins) * 0.5 + m * 0.18;
}

// music: slow swells rolling out of the cover like waves on water, over a
// record's fine grooves
float rings(vec2 px, float t) {
  float r = length(px - u_anchor) + (noise(px / 140.0 + t * 0.05) - 0.5) * 26.0;
  float grooves = 0.5 + 0.5 * sin(r * 0.11 - t * 0.4);
  // crests travel out at 36 px/s, one every 4 s, so they sit 144 px apart
  float swell = pow(0.5 + 0.5 * cos((r / 36.0 - t) * 6.28318 / 4.0), 12.0);
  float fall = exp(-r / 650.0);
  return 0.03 + grooves * 0.16 * fall + swell * 0.8 * fall + fbm(px / 240.0 - t * 0.02) * 0.1;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, u_size.y - gl_FragCoord.y) * u_cell;
  float t = u_time;

  float tone;
  if (u_pattern == 0) tone = lavaLamp(px, t);
  else if (u_pattern == 1) tone = marbled(px, t);
  else tone = rings(px, t);

  // thinner behind the headline so the type stays crisp
  vec2 outside = max(u_quiet.xy - px, px - u_quiet.zw);
  float quiet = 1.0 - smoothstep(0.0, 56.0, length(max(outside, 0.0)));
  tone *= 1.0 - quiet * 0.3;

  float pd = length(px - u_pointer.xy);
  tone += u_pointer.z * 0.42 * exp(-pd * pd / 12800.0);

  float age = u_ripple.z;
  if (age < ${RIPPLE_SECONDS.toFixed(1)}) {
    float front = length(px - u_ripple.xy) - age * 380.0;
    tone += 0.5 * (1.0 - age / ${RIPPLE_SECONDS.toFixed(1)}) * exp(-front * front / 480.0);
  }

  float threshold = bayer8(gl_FragCoord.xy) + 0.0078125;
  gl_FragColor = vec4(tone > threshold ? u_ink1 : u_ink0, 1.0);
}
`

function compile(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`DitherField shader: ${gl.getShaderInfoLog(shader)}`)
  }
  return shader
}

function createProgram(gl) {
  const program = gl.createProgram()
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX))
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`DitherField program: ${gl.getProgramInfoLog(program)}`)
  }
  return program
}

// a palette token from index.css as an [r, g, b] in 0..1
function ink(styles, name) {
  const value = styles.getPropertyValue(name).trim()
  const m = value.match(/^#([0-9a-f]{6})$/i)
  if (!m) throw new Error(`${name} must be a #rrggbb colour, got "${value}"`)
  const n = parseInt(m[1], 16)
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function centre(el, box) {
  const r = el.getBoundingClientRect()
  return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top]
}

// The hero's colour field as a live two-ink ordered dither. It fills its
// parent; keep transforms off that path, or the browser resamples the cells.
// Without WebGL nothing is drawn and the parent's flat accent shows instead.
export default function DitherField({ pattern, anchorRef, quietRef }) {
  const hostRef = useRef(null)

  useEffect(() => {
    const host = hostRef.current
    // held directly: on unmount React clears the refs before this cleanup
    // runs, and a frame can still land in between
    const anchor = anchorRef.current
    const quietBox = quietRef.current
    // a fresh canvas per run: a context lost on cleanup can never be reused
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      powerPreference: 'low-power',
    })
    if (!gl) return
    Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0', imageRendering: 'pixelated' })
    host.appendChild(canvas)

    const program = createProgram(gl)
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const pos = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(pos)
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)

    const loc = name => gl.getUniformLocation(program, name)
    const u = {
      size: loc('u_size'),
      time: loc('u_time'),
      anchor: loc('u_anchor'),
      quiet: loc('u_quiet'),
      pointer: loc('u_pointer'),
      ripple: loc('u_ripple'),
      ink0: loc('u_ink0'),
      ink1: loc('u_ink1'),
      cell: loc('u_cell'),
    }
    gl.uniform1i(loc('u_pattern'), PATTERNS[pattern])

    const setInks = () => {
      const styles = getComputedStyle(document.documentElement)
      gl.uniform3fv(u.ink0, ink(styles, '--mc-accent'))
      gl.uniform3fv(u.ink1, ink(styles, '--mc-field-ink'))
    }
    setInks()

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = performance.now()
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, presence: 0, target: 0 }
    const ripple = { x: 0, y: 0, at: -Infinity }

    const draw = now => {
      const box = canvas.getBoundingClientRect()
      const q = quietBox.getBoundingClientRect()
      pointer.x += (pointer.tx - pointer.x) * 0.5
      pointer.y += (pointer.ty - pointer.y) * 0.5
      pointer.presence += (pointer.target - pointer.presence) * 0.4
      gl.uniform1f(u.time, reduced ? 0 : (now - start) / 1000)
      gl.uniform2f(u.anchor, ...centre(anchor, box))
      gl.uniform4f(u.quiet, q.left - box.left, q.top - box.top, q.right - box.left, q.bottom - box.top)
      gl.uniform3f(u.pointer, pointer.x, pointer.y, pointer.presence)
      gl.uniform3f(u.ripple, ripple.x, ripple.y, Math.min((now - ripple.at) / 1000, RIPPLE_SECONDS))
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const resize = () => {
      const cell = cellSize(host.offsetWidth)
      const w = Math.ceil(host.offsetWidth / cell)
      const h = Math.ceil(host.offsetHeight / cell)
      canvas.width = w
      canvas.height = h
      canvas.style.width = `${w * cell}px`
      canvas.style.height = `${h * cell}px`
      gl.viewport(0, 0, w, h)
      gl.uniform2f(u.size, w, h)
      gl.uniform1f(u.cell, cell)
      draw(performance.now())
    }
    resize()

    let raf = 0
    let last = 0
    const interval = 1000 / FPS
    const tick = now => {
      raf = requestAnimationFrame(tick)
      if (now - last < interval) return
      last = now - ((now - last) % interval)
      draw(now)
    }
    const run = () => {
      if (!raf && !reduced) raf = requestAnimationFrame(tick)
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }

    // only animate while the hero is on screen
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? run() : stop()))
    io.observe(host)
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    const mo = new MutationObserver(() => {
      setInks()
      draw(performance.now())
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mode'] })

    const local = e => {
      const box = canvas.getBoundingClientRect()
      const x = e.clientX - box.left
      const y = e.clientY - box.top
      return { x, y, inside: x >= 0 && y >= 0 && x <= host.offsetWidth && y <= host.offsetHeight }
    }
    // a mouse lights up the field around the cursor
    const onMove = e => {
      if (e.pointerType !== 'mouse') return
      const p = local(e)
      pointer.tx = p.x
      pointer.ty = p.y
      if (pointer.target === 0) {
        pointer.x = p.x
        pointer.y = p.y
      }
      pointer.target = p.inside ? 1 : 0
    }
    const onLeave = () => {
      pointer.target = 0
    }
    // any press, a tap or a click, sends a ring out across the field
    const onDown = e => {
      const p = local(e)
      if (!p.inside) return
      ripple.x = p.x
      ripple.y = p.y
      ripple.at = performance.now()
    }
    if (!reduced) {
      window.addEventListener('pointermove', onMove, { passive: true })
      window.addEventListener('pointerdown', onDown, { passive: true })
      document.documentElement.addEventListener('pointerleave', onLeave)
    }

    // the browser can reclaim the GPU at any time; fall back to the flat field
    canvas.addEventListener('webglcontextlost', () => {
      stop()
      canvas.remove()
    })

    return () => {
      stop()
      io.disconnect()
      ro.disconnect()
      mo.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      // free the context now; iOS caps live contexts and every mode switch
      // mounts a new hero
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }, [pattern, anchorRef, quietRef])

  return <div ref={hostRef} aria-hidden="true" className="absolute inset-0" />
}
