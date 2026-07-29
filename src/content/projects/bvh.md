---
title: A BVH, BVH-SAH, and Grid (walk into a bar)
subtitle: Using C++
description: Implementation and comparison of three different acceleration structures on CPU. 
tags: [graphics-programming, ray-tracing, acceleration-structures]
status: active
year: "2025"
github: https://github.com/Adequate88/raytracer-bvh
image: assets/bvh.png
---

![Dragon from BVH project](/assets/bvh.png)

**TL;DR:** I implemented three ray tracing acceleration structures — a median-split BVH, a BVH with the Surface Area Heuristic (SAH), and a Uniform Grid with 3D-DDA traversal — on top of an existing C++ path tracer, then spent way too long benchmarking them against each other across dense meshes, sparse scenes, and uniformly cluttered ones. Spoiler: there's no universal winner, just a very satisfying tradeoff curve.

## The Problem

Ray tracing is expensive because, naively, every ray has to be tested against *every single primitive* in the scene. For a scene with a few hundred triangles that's annoying. For the 871,306-triangle dragon mesh I ended up decimating down to a "manageable" 17,426 triangles, that's a non-starter. Acceleration structures exist to fix this: instead of brute-forcing every ray against every triangle, you organize the scene so a ray can quickly discard the parts it obviously isn't going to hit.

The question I actually cared about wasn't *"do acceleration structures help"* — obviously they do — it was *which structure wins, and under what conditions does it stop winning.*

## What I Built

Working on top of an existing Monte Carlo path tracer (physically-based and Phong materials, stratified sampling, Russian roulette, the usual RTIOW-lineage feature set), I implemented:

- **BVH (median split):** A binary tree built by recursively splitting along the longest axis at the midpoint. Simple, cheap to build, surprisingly competitive.
- **BVH-SAH:** Same tree structure, but the split point is chosen by minimizing a cost function based on child bounding box surface areas and primitive counts, instead of just picking the midpoint. More expensive to build, better tree.
- **Grid + 3D-DDA:** A uniform grid sized so each cell holds roughly one primitive on average (using `∛(primitive count)` cells per axis), traversed with the classic Amanatides & Woo DDA algorithm — basically walking the ray cell-by-cell like a voxel raymarch.

To actually compare them fairly, I instrumented the renderer to track average/min/peak traversal steps and intersection tests per ray — because "it feels faster" is not a metric I trust.

## The Interesting Bit: Traversal vs. Intersection Is a Tradeoff, Not a Ranking

*This is the part I actually enjoyed.* On the dense dragon mesh, the two structures diverge in exactly opposite directions: the Grid needs way fewer traversal steps (averaging as low as ~1.1 per ray) because it's just walking linearly through space, but it racks up *thousands* of intersection tests per ray because triangles pile up unevenly across cells. The BVH does the opposite — deeper traversal (up to ~33 steps on average) but almost trivial intersection counts (under 1 on average), because it keeps subdividing until each leaf holds basically nothing.

Since intersection tests are by far the more expensive operation, BVH wins here. But it doesn't win *everywhere*:

- **Dense single object (Stanford Bunny, control scene):** BVH dominates — it wraps a tight box around the mesh and skips the surrounding void almost for free.
- **Sparse scene (two bunnies far apart):** Same story, even more pronounced — BVH's root node can split cleanly into "left bunny, right bunny," so a ray down the middle terminates almost instantly.
- **Dense, uniformly-distributed geometry (7,000 overlapping quads):** This is where it gets fun. The BVH's traversal cost *spikes* to ~74 steps on average because overlapping bounding boxes mean it can no longer cleanly send a ray down just one branch. The Grid, meanwhile, finally gets to show off — evenly distributed objects are its best case. But even here, BVH still wins overall on total cost, because its intersection tests stay cheap (~0.3–0.5 avg) while the Grid's blow up (~40+ avg). BVH is basically betting "I'll pay more up front in traversal to guarantee I barely touch any triangles," and that bet keeps paying off even in its own worst-case scenario.

And SAH, predictably, just makes BVH's traversal cheaper still (down to ~3.7 average on one dragon viewpoint, versus ~18 for median-split) without changing intersection counts at all — since it's still visiting the same leaves, just via a better-organized path to get there.

## Takeaways

If I had to summarize the whole exercise in one sentence: *space partitioning (Grid) is cheap to traverse but blind to how geometry clusters, while object partitioning (BVH) pays more per traversal step in exchange for near-perfect intersection efficiency* — and in every scene I tested, that trade was worth making, even in the Grid's best-case scenario. SAH is basically "BVH, but it also thought about where to cut."

## Under the Hood

- C++17, OpenMP for multithreading
- Built on top of [valentecaio's raytracer](https://github.com/valentecaio/raytracer), which itself follows the *Ray Tracing in One Weekend* / *Next Week* books
- BVH, BVH-SAH, Grid, and the whole performance instrumentation system were written from scratch for this project
- Some AI assistance (Claude Code) was used for debugging, code cleanup, and parts of the DDA traversal — full disclosure is in the repo README, because I think that matters

Done with **Angelo Patanè** as part of an Advanced Graphics course — he handled the Grid implementation and instrumentation, I handled BVH/BVH-SAH and most of the analysis.