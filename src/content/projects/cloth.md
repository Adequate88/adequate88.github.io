---
title: I Did Cloth Simulation Optimizing
subtitle: Using C++, OpenCL, SIMD
description: Optimizing cloth simulations based on Verlet Integration using SSE intrinsics and GPU.
tags: [optimization, OpenCL]
status: active
year: "2026"
github: https://github.com/Adequate88/
image: assets/cloth.gif
---


![Cloth simulation video](/assets/cloth.gif)

**TL;DR:** Took a Gauss-Seidel Verlet-integration cloth simulation and ported it to two parallel versions — SSE SIMD on CPU and a full GPGPU kernel version — without changing how the cloth actually looks or behaves. End result: 5x speedup from SIMD, 19.6x from GPU, and a cloth that still falls, rips, and forms holes the same way it did before, just a lot faster.

## The Problem

The base simulation updates cloth points one at a time in a specific order (Gauss-Seidel), which is great for stability but inherently sequential — each point's update depends on the freshly-updated value of its neighbor. That's exactly the kind of dependency chain that SIMD and GPU parallelism don't like. So the actual challenge wasn't "make gravity faster," it was: how do you restructure constraint solving so that updating one point never reads a half-updated neighbor, without wrecking the physics.

## What I Built

Three versions of the same simulation, switchable via a `MODE` flag in `game.cpp`:

- **SIMD (SSE):** Rewrote the point data from AoS to SoA (`Point4`, with `alignas(16)` arrays) so four points at a time could be loaded into `__m128` registers with aligned loads. Gravity was the easy part — straight 4-wide vectorization. Constraint solving was the hard part.
- **GPGPU:** Same overall structure, but as OpenCL kernels — one thread per point for gravity, and index-based rather than loop-based iteration throughout. Randomness comes from a Wang Hash seeded on thread ID and frame count, since you can't just call `rand()` from inside a kernel.
## The Interesting Bit: Solving Race Conditions Without a Race-Condition-Solver

This is the part that actually took thinking. Vertical constraint passes are easy — you can load the row at `(x, y)` and the row at `(x, y+1)` into two separate registers and update both at once, no lane touches another lane's data. Horizontal passes are where it gets annoying: if you naively load `(x, y)` and `(x+1, y)`, lane 0 updates both `x` and `x+1`, while lane 1 *also* updates `x+1` — via `x+2`. Same point, touched by two lanes in the same instruction. Race condition.

The fix was to load `(x, y)` and `(x+4, y)` instead, then shuffle lanes so one register holds `[x, x+2, x+4, x+6]` and the other holds `[x+1, x+3, x+5, x+7]`. Now every lane only ever touches its immediate right neighbor, but adjacent lanes are two points apart instead of one — so no two lanes can ever write the same point in the same pass. Run this twice, once for even `x` and once for odd `x`, and you cover every horizontal pair with zero collisions. The GPU version reuses the exact same even/odd, horizontal/vertical decomposition, just as kernels instead of intrinsics.

The tradeoff for all of this is that neither parallel version can do true Gauss-Seidel anymore — they're both semi-Jacobi by necessity, since you can't have "everyone reads everyone's latest value" and "everyone updates independently in parallel" at the same time. That does introduce small differences in exactly where and how fast holes form and the cloth tears, partly from the solver change and partly from the randomness itself, but visually the simulation reads the same: falls, unfolds, gets small holes, tears apart.

## Numbers

- **Base (sequential):** ~49–51 ms
- **SIMD (SSE):** ~7.8–9.8 ms → minimum 5.0x speedup
- **GPU:** ~2.5 ms → minimum 19.6x speedup
Worth noting the GPU number is actually being held back by a `Draw()` function I wasn't allowed to touch — the device-to-host data transfer it requires eats into what would otherwise be an even bigger margin.

## Takeaways

The actual performance work here was almost entirely in the data layout and access pattern, not the physics math itself — gravity vectorizes for free, constraint solving is where all the design effort goes. Once you find a striding pattern that guarantees no two parallel lanes/threads ever touch the same point in the same step, the rest is just translating the same math into intrinsics or kernels.

## Under the Hood

- C++17, SSE intrinsics, OpenCL
- Three interchangeable execution modes behind a single `MODE` switch (`0` base, `1` SIMD, `2` GPU)
- SoA `Point4` restructuring, even/odd checkerboard constraint passes, and lane-shuffled horizontal SIMD access were all designed and implemented from scratch