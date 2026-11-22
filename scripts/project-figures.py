"""Adds fx- figures (styles/figures.css) to the older project write-ups, without touching their text.

Every number in a figure is one already stated in that post's prose. Each figure is inserted after the
paragraph or list item that starts with its anchor. Re-running is safe: a post that already has
figures is skipped. Run from the repo root: python3 scripts/project-figures.py
"""
import math, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'src/content/projects'


def one_line(html):
    """Markdown ends an HTML block at a blank line and treats 4-space indents as code: emit flush, no blanks."""
    return '\n'.join(l.strip() for l in html.strip().splitlines() if l.strip())


def fig(kicker, title, body, cap):
    return one_line(f'<figure class="fx"><div class="fx-panel"><p class="fx-kicker">{kicker}</p>'
                    f'<p class="fx-title">{title}</p>{body}</div><figcaption class="fx-cap">{cap}</figcaption></figure>')


def stats(items):
    cells = ''.join(f'<div class="fx-stat"><span class="fx-stat-num">{n}<small>{u}</small></span>'
                    f'<span class="fx-stat-label">{l}</span></div>' for n, u, l in items)
    return one_line(f'<div class="fx"><div class="fx-stats">{cells}</div></div>')


def legend(items):
    return '<ul class="fx-legend">' + ''.join(
        f'<li><span class="fx-sw" style="--c:var({c})"></span>{t}</li>' for c, t in items) + '</ul>'


def bar(w, color, tip, label):
    tip = tip.replace('\n', '&#10;')
    return (f'<div class="fx-bar" style="--w:{w:.3f}%;--c:var({color})" data-tip="{tip}">'
            f'<span class="fx-bar-val">{label}</span></div>')


def row(label, sub, bars, end='', end_sub='', tick=None):
    t = f' style="--tick:{tick:.4f}%"' if tick else ''
    e = f'<div class="fx-row-end">{end}<small>{end_sub}</small></div>' if end else '<span></span>'
    return (f'<div class="fx-row"><div class="fx-row-label">{label}<small>{sub}</small></div>'
            f'<div class="fx-track"{t}>{"".join(bars)}</div>{e}</div>')


def axis(ticks, title):
    """ticks: (position %, label)."""
    spans = ''.join(f'<span style="left:{p:.3f}%">{l}</span>' for p, l in ticks)
    return (f'<div class="fx-axis"><span></span><div class="fx-axis-scale">{spans}</div><span></span></div>'
            f'<div class="fx-axis"><span></span><div class="fx-axis-title">{title}</div><span></span></div>')


def flow(nodes):
    """nodes: (step, name, text, ours) or a list of those for a vertical stack."""
    def node(n):
        step, name, text, ours = n
        return f'<div class="fx-node{" is-ours" if ours else ""}"><span class="fx-node-step">{step}</span><b>{name}</b>{text}</div>'
    parts = []
    for n in nodes:
        parts.append(f'<div class="fx-stack">{"".join(node(m) for m in n)}</div>' if isinstance(n, list) else node(n))
    return '<div class="fx-flow">' + '<span class="fx-arrow">→</span>'.join(parts) + '</div>'


def gens(items):
    out = '<div class="fx-gens">'
    for sub, name, lis in items:
        out += f'<div class="fx-gen"><span class="fx-gen-sub">{sub}</span><div class="fx-gen-name">{name}</div><ul>' + ''.join(f'<li>{l}</li>' for l in lis) + '</ul></div>'
    return out + '</div>'


def table(head, rows, pick=None):
    num = ' class="num"'
    th = ''.join(f'<th{num if h.startswith("#") else ""}>{h.lstrip("#")}</th>' for h in head)
    body = ''
    for i, r in enumerate(rows):
        cls = ' class="is-pick"' if i == pick else ''
        body += f'<tr{cls}>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>'
    return f'<div class="fx-scroll"><table class="fx-table"><thead><tr>{th}</tr></thead><tbody>{body}</tbody></table></div>'


YES, PART, NO = (lambda t: f'<span class="fx-yes">{t}</span>'), (lambda t: f'<span class="fx-part">{t}</span>'), (lambda t: f'<span class="fx-no">{t}</span>')

# ───────────────────────── BVH, BVH-SAH and Grid ─────────────────────────
BVH = [
    ('**Tech:**', stats([
        ('~1.1', '', 'Grid traversal steps per ray on the dragon'),
        ('&lt;1', '', 'BVH intersection tests per ray on the dragon'),
        ('~5', '×', 'fewer traversal steps with SAH than median split'),
        ('4', '/4', 'test scenes where the BVH wins overall'),
    ])),
    ('- **Grid + 3D-DDA:**', fig('Figure 1 · The contestants', 'Two ways to cut a scene', table(
        ['Structure', 'Partitions', 'How it splits', 'Traversal'],
        [['<b>BVH</b>', 'objects', 'Longest axis, at the midpoint', 'Binary tree'],
         ['<b>BVH-SAH</b>', 'objects', 'Minimises a surface-area cost', 'Binary tree'],
         ['<b>Grid</b>', 'space', '∛N cells per axis, ~1 primitive per cell', '3D-DDA, cell by cell']]),
        'A BVH groups the <i>objects</i> and lets their boxes overlap; a grid cuts <i>space</i> into equal cells and lets objects straddle them.')),
    ('- **Dense single object', None),  # placeholder, replaced below
]


def bvh_tradeoff():
    # Dragon: Grid ~1.1 steps vs BVH ~33 steps; intersections: BVH < 1, Grid thousands.
    # Quads: BVH ~74 steps; intersections BVH ~0.3-0.5, Grid ~40+.
    rows = [
        ['Stanford Bunny', 'dense, single object', '—', '—', YES('BVH')],
        ['Two bunnies, far apart', 'sparse', '—', '—', YES('BVH')],
        ['Dragon', 'dense mesh', 'BVH ~33 · Grid ~1.1', 'BVH &lt;1 · Grid thousands', YES('BVH')],
        ['7,000 overlapping quads', 'dense, uniform', 'BVH ~74', 'BVH ~0.3–0.5 · Grid ~40+', PART('BVH, in the Grid\'s best case')],
    ]
    body = table(['Scene', 'Kind', 'Steps / ray', 'Tests / ray', 'Winner'],
                 [[f'<b>{a}</b>', b, c, d, e] for a, b, c, d, e in rows])
    return fig('Figure 2 · The scorecard', 'Who wins where', body,
               'Average traversal steps and intersection tests per ray, where I measured them. '
               'The Grid always traverses less, the BVH always intersects less, and intersection tests are the expensive part.')


def bvh_sah():
    vmax = 20
    tick = 100 * 5 / vmax
    b = [row('Median split', 'BVH', [bar(100 * 18 / vmax, '--c-ref', 'Median-split BVH\n~18 traversal steps per ray', '~18')], tick=tick),
         row('SAH', 'BVH-SAH', [bar(100 * 3.7 / vmax, '--c-tb', 'BVH-SAH\n~3.7 traversal steps per ray', '~3.7')], '~5×', 'fewer steps', tick=tick)]
    ax = axis([(100 * t / vmax, str(t)) for t in range(0, 21, 5)], 'average traversal steps per ray, one dragon viewpoint')
    return fig('Figure 3 · Same leaves, shorter path', 'What SAH buys', f'<div class="fx-bars">{"".join(b)}{ax}</div>',
               'Intersection counts are the same for both trees: SAH visits the same leaves, it just reaches them in fewer steps.')


BVH[2] = ('- **Dense single object', bvh_tradeoff())
BVH.append(('And SAH, predictably,', bvh_sah()))

# ───────────────────────── Cloth ─────────────────────────
def lanes(name, regs, note=''):
    out = f'<div class="fx-lanes-group"><div class="fx-lanes-head"><span class="fx-strip-name">{name}</span><span class="fx-strip-meta">{note}</span></div>'
    for reg, cells in regs:
        out += f'<div class="fx-lane-row"><span class="fx-lane-reg">{reg}</span>'
        for txt, clash in cells:
            out += f'<span class="fx-lane{" is-clash" if clash else ""}">{txt}</span>'
        out += '</div>'
    return out + '</div>'


def p(k):
    return 'x' if k == 0 else f'x+{k}'


CLOTH_LANES = fig('Figure 1 · Four lanes, no collisions', 'Loading the horizontal constraint pairs',
    '<div class="fx-lanes">'
    + lanes('Naive: load (x, y) and (x+1, y)', [('reg A', [(p(k), k in (1, 2, 3)) for k in range(4)]),
                                                 ('reg B', [(p(k), k in (1, 2, 3)) for k in range(1, 5)])], 'x+1…x+3 written by two lanes')
    + lanes('Shuffled, even pass', [('reg A', [(p(k), False) for k in (0, 2, 4, 6)]),
                                    ('reg B', [(p(k), False) for k in (1, 3, 5, 7)])], 'every point in exactly one lane')
    + lanes('Shuffled, odd pass', [('reg A', [(p(k), False) for k in (1, 3, 5, 7)]),
                                   ('reg B', [(p(k), False) for k in (2, 4, 6, 8)])], 'covers the pairs the even pass skipped')
    + '</div>',
    'Each column is one SSE lane, which solves the constraint between its point in register A and its point in register B. '
    'Naively, neighbouring lanes share points (amber). After the shuffle, adjacent lanes sit two points apart, so no point is touched twice in one instruction.')


def cloth_times():
    vmax = 55
    tick = 100 * 10 / vmax
    b = [row('Base', 'sequential', [bar(100 * 51 / vmax, '--c-ref', 'Base (sequential)\n~49–51 ms per frame', '49–51 ms')], tick=tick),
         row('SIMD', 'SSE', [bar(100 * 9.8 / vmax, '--c-alt', 'SIMD (SSE)\n~7.8–9.8 ms per frame\nmin. 5.0× speedup', '7.8–9.8 ms')], '5.0×', 'min. speedup', tick=tick),
         row('GPU', 'OpenCL', [bar(100 * 2.5 / vmax, '--c-tb', 'GPU (OpenCL)\n~2.5 ms per frame\nmin. 19.6× speedup', '~2.5 ms')], '19.6×', 'min. speedup', tick=tick)]
    ax = axis([(100 * t / vmax, str(t)) for t in range(0, 51, 10)], 'milliseconds per frame (lower is better)')
    return fig('Figure 2 · The numbers', 'Same cloth, a fraction of the time', f'<div class="fx-bars">{"".join(b)}{ax}</div>',
               'Bars show the slow end of each measured range. The GPU figure includes a device-to-host copy for a <code>Draw()</code> I was not allowed to change.')


CLOTH = [
    ('**Tech:**', stats([
        ('5.0', '×', 'minimum speedup with SSE SIMD'),
        ('19.6', '×', 'minimum speedup on the GPU'),
        ('~2.5', 'ms', 'per frame on the GPU, down from ~50 ms'),
    ])),
    ('The fix was to load', CLOTH_LANES),
    ('- **GPU:**', cloth_times()),
]

# ───────────────────────── LBVH ─────────────────────────
LBVH_FLOW = fig('Figure 1 · Four kernels', 'BVH construction as a sorting problem', flow([
    ('01', 'Morton codes', '30-bit code per primitive centroid, one thread each', False),
    ('02', 'Radix sort', '4 bits per pass, 8 passes: histogram, Blelloch scan, scatter', True),
    ('03', 'Hierarchy', 'Karras: one thread per internal node, one launch', False),
    ('04', 'Box propagation', 'Bottom-up; the second thread to arrive builds the box', False),
]), 'Every step is data-parallel, which is the whole point: a recursive top-down split is not. The radix sort is the most expensive step.')


def lbvh_build():
    lo, hi = 1, 100_000
    pos = lambda v: 100 * (math.log10(v) - math.log10(lo)) / (math.log10(hi) - math.log10(lo))
    fmt = lambda v: f'{v / 1000:.1f} s' if v >= 1000 else f'{v:.0f} ms' if v >= 10 else f'{v:.1f} ms'
    data = [('Bunny', '5K tris', 2.62, 94.73, None), ('Dragon', '871K tris', 448.30, 181.34, None),
            ('Lucy', '28M tris', 13988.55, 3008.95, 30900)]
    rows = ''
    for name, tris, cpu, gpu, naive in data:
        bars = []
        if naive: bars.append(bar(pos(naive), '--c-alt', f'{name} · naive CPU BVH\n{fmt(naive)}', fmt(naive)))
        bars.append(bar(pos(cpu), '--c-ref', f'{name} · CPU LBVH\n{cpu:,.2f} ms', fmt(cpu)))
        bars.append(bar(pos(gpu), '--c-tb', f'{name} · GPU LBVH\n{gpu:,.2f} ms', fmt(gpu)))
        s = cpu / gpu
        rows += row(name, tris, bars, f'{s:.2f}×' if s < 1 else f'{s:.2f}×', 'GPU vs CPU LBVH', tick=pos(10) - pos(1))
    ticks = [(pos(10 ** k), lab) for k, lab in enumerate(['1 ms', '10 ms', '100 ms', '1 s', '10 s', '100 s'])]
    return fig('Figure 2 · Construction time', 'The GPU needs enough work to pay for itself',
               legend([('--c-alt', 'Naive CPU BVH (only quoted for Lucy)'), ('--c-ref', 'CPU LBVH'), ('--c-tb', 'GPU LBVH')])
               + f'<div class="fx-bars" style="--end:6.5rem">{rows}{axis(ticks, "build time, log scale")}</div>',
               'Log scale: each gridline is 10× the previous. On the 5K-triangle bunny, OpenCL start-up dominates and the GPU loses badly; '
               'from the dragon upwards it wins, by 4.65× on Lucy.')


def lbvh_kernels():
    stack = ('<div class="fx-stack100" style="height:2.25rem" data-tip="Lucy · GPU kernel time&#10;radix sort  141 ms&#10;everything else  ~66 ms">'
             '<span style="--f:141;--c:var(--c-tb)"></span><span style="--f:66;--c:var(--c-ref)"></span></div>')
    return fig('Figure 3 · Where the GPU time goes', 'Sorting is two-thirds of the work',
               legend([('--c-tb', 'Radix sort · 141 ms'), ('--c-ref', 'Everything else · ~66 ms')]) + stack,
               'GPU kernel time for Lucy (28M triangles), about 207 ms in total. This matches what Karras reports for his own implementation.')


LBVH = [
    ('**Tech:**', stats([
        ('4.65', '×', 'faster construction than CPU LBVH, Lucy (28M tris)'),
        ('~10', '×', 'faster than the naive CPU BVH on Lucy'),
        ('68', '%', 'of GPU kernel time is the radix sort'),
        ('+53', '%', 'box tests per ray vs. median split, Lucy'),
    ])),
    ('- **Bounding box propagation:**', LBVH_FLOW),
    ('But that flips hard', lbvh_build()),
    ('But that flips hard', None),  # kernels figure goes after the build figure; handled by order below
]
LBVH[3] = ('__AFTER_PREV__', lbvh_kernels())

# ───────────────────────── Wavefront ─────────────────────────
WAVE_STEPS = fig('Figure 1 · The road to real time', 'Four steps, one bunny', gens([
    ('Step 1', 'CPU image, GPU window', ['CPU render copied to a staging buffer', 'Then into a <code>VkImage</code> on an SDL window']),
    ('Step 2', 'Megakernel on the GPU', ['Ray tracing in one compute shader', '~3× <i>slower</i>: no acceleration structure yet']),
    ('Step 3', 'LBVH on Vulkan', ['Fully device-local, SoA data', '~9× faster construction']),
    ('Step 4', 'Wavefront', ['Ray tracing split into stages', '~352× faster rendering, real time']),
]), 'Everything runs on Vulkan\'s compute pipeline, so the ray tracing and the BVH are our own code, not the ray tracing extensions.')

WAVE_OWN = fig('Figure 2 · Who owns what', 'Each part owns its own Vulkan objects', flow([
    ('ENGINE', 'VulkanEngine', 'All the Vulkan plumbing, plus <code>write_image</code>', False),
    [('OWNS ITS OWN', 'Raytracer', '<code>VkPipeline</code>, <code>VkDescriptorSet</code>, <code>VkImage</code>', True),
     ('OWNS ITS OWN', 'LBVH', 'Buffers and shader pipelines', True)],
]), 'The <code>Raytracer</code> and <code>LBVH</code> classes hold a reference to the engine and manage everything they render or build with.')


def wave_time():
    vmax = 5200
    b = [row('Start', 'CPU', [bar(100 * 5067 / vmax, '--c-ref', 'Start of the project\n~5067 ms per image', '~5,067 ms')], tick=100 * 1000 / vmax),
         row('Final', 'Vulkan', [bar(max(100 * 14.4 / vmax, .6), '--c-tb', 'Final wavefront renderer\n~14.4 ms per image', '~14.4 ms')], '352×', 'faster', tick=100 * 1000 / vmax)]
    ax = axis([(100 * t / vmax, f'{t // 1000} s' if t else '0') for t in range(0, 5001, 1000)], 'rendering time, Stanford Bunny at 512×512')
    return fig('Figure 3 · Before and after', 'From seconds to a frame', f'<div class="fx-bars">{"".join(b)}{ax}</div>',
               'Linear scale, on purpose: the final bar is a sliver. Ryzen 7 7700X + Radeon RX 9060 XT, 144,046 triangles.')


WAVE = [
    ('**Tech:**', stats([
        ('~352', '×', 'faster rendering'),
        ('~152', '×', 'faster total runtime'),
        ('~9', '×', 'faster LBVH construction'),
        ('14.4', 'ms', 'per frame: real time'),
    ])),
    ('*Note: All benchmarking', WAVE_STEPS),
    ('This is where the fun began', WAVE_OWN),
    ('Márton then wrote wavefront shaders', wave_time()),
]

# ───────────────────────── Resonance ─────────────────────────
RES = [
    ('**Tech:**', stats([
        ('5', '', 'effects, all tunable at runtime'),
        ('3', '', 'particle effects from one system'),
        ('1', '', 'scene, many moods'),
    ])),
    ('The idea was simple to state', fig('Figure 1 · The toolbox', 'Five effects, three people', table(
        ['Effect', 'What it is', 'Built by'],
        [['<b>Bloom</b>', 'Glow around bright areas', 'Tizian Kurz'],
         ['<b>Fog</b>', 'Distance-based haze', 'Tizian Kurz'],
         ['<b>Toon shading</b>', 'Banded, cartoon-like lighting', 'Catalina Regolf Cortes'],
         ['<b>Normal mapping</b>', 'Surface detail without extra geometry', '<b>me</b>'],
         ['<b>Particles</b>', 'Fire, smoke and fireflies', '<b>me</b>']]),
        'Catalina also built the base Blender scene. Every effect can be switched and tuned while the scene runs.')),
    ('Once the billboard rendering path', fig('Figure 2 · One system, three effects', 'The particle system', flow([
        ('BASE CLASS', 'ParticleSystem', 'A pool of particles: lifetime, colour, scale, velocity, spawn rate', True),
        ('EVERY FRAME', 'evolve(dt) · respawn_particle()', 'Update every particle; recycle expired ones instead of allocating', False),
        [('SUBCLASS', 'Fire', 'Its own evolve and respawn physics', False),
         ('SUBCLASS', 'Smoke', 'Its own evolve and respawn physics', False),
         ('SAME SYSTEM', 'Fireflies', 'Came along for free', False)],
    ]), 'Particles render as camera-facing billboards: quads built from the camera\'s up and right vectors.')),
    ('Added tangent/bitangent computation', fig('Figure 3 · Normal mapping', 'From a texture to a lit surface', flow([
        ('PER VERTEX', 'Tangent + bitangent', 'Averaged over every face sharing the vertex', False),
        ('VERTEX SHADER', 'Varyings', 'Passed on to the fragment shader', False),
        ('FRAGMENT SHADER', 'TBN matrix', 'Moves the sampled normal into the right space', True),
        ('LIGHTING', 'Blinn-Phong', 'Shades with the perturbed normal', False),
    ]), 'The normal map stores normals relative to the surface; the TBN matrix turns them into normals the lighting can use.')),
]

POSTS = {'bvh.md': BVH, 'cloth.md': CLOTH, 'LBVH.md': LBVH, 'wavefront.md': WAVE, 'resonance.md': RES}


def insert(text, plan):
    lines = text.split('\n')
    last = None
    for anchor, html in plan:
        if html is None: continue
        if anchor == '__AFTER_PREV__':
            idx = last
        else:
            hits = [i for i, l in enumerate(lines) if l.lstrip().startswith(anchor)]
            assert len(hits) == 1, (anchor, len(hits))
            idx = hits[0]
            # a list item: insert after the whole list
            if lines[idx].lstrip().startswith('- '):
                while idx + 1 < len(lines) and lines[idx + 1].lstrip().startswith('- '): idx += 1
        lines[idx + 1:idx + 1] = ['', html]
        last = idx + 2
    return '\n'.join(lines)


for name, plan in POSTS.items():
    f = ROOT / name
    text = f.read_text()
    if 'class="fx' in text:
        print(f'skip {name}: already has figures'); continue
    f.write_text(insert(text, plan))
    print(f'{name}: {sum(1 for _, h in plan if h)} figures')
