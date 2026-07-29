---
title: Wavefront Ray Tracing on Compute Pipeline
subtitle: Using C++, Vulkan, GLSL
description: Implemented wavefront ray tracing on the GPU using Vulkan back-end and GLSL. My previous LBVH implementation was ported and recycled for fast rendering.
tags: [graphics-programming, ray-tracing, acceleration-structures, Vulkan, GLSL]
status: active
year: "2026"
github: https://github.com/Adequate88/Raytracer-LBVH
image: assets/wavefront.gif
---

![Real-time render from wavefront project](/assets/wavefront.gif)

**TL;DR:** Took my [GPU LBVH project](/projects/bvh-to-lbvh) and pushed the whole pipeline further: rebuilt the backend on Vulkan compute, moved ray tracing itself onto the GPU, then rewrote the renderer from a single megakernel into a five-stage wavefront pipeline to fix an occupancy problem. End-to-end, rendering time went from ~5067ms to ~14.4ms — about 352x — and I ended up with something that runs in real time.

## The Problem

The starting point (my previous project) already had BVH construction on the GPU, but ray tracing itself was still running on the CPU. Baseline profiling made the priority obvious immediately: rendering alone was eating ~94% of total application runtime (5066.8ms out of 5415.88ms total, versus 18.9ms for BVH construction). No amount of BVH tuning was going to matter until rendering moved to the GPU too.

So the actual arc of this project was: move rendering to the GPU as a single kernel, discover *that alone isn't enough*, profile to find out why, and fix the real bottleneck.

## What I Built

- **A Vulkan compute backend from scratch** (`vulkan_engine/`) — context setup, buffer management, and compute pipelines that everything else runs on. Chosen over sticking with OpenCL specifically for finer control over GPU memory layout and dispatch.
- **GPU LBVH, ported to Vulkan compute shaders** — the same Karras-algorithm pipeline from my previous project (Morton codes, radix sort, hierarchy construction, bottom-up bounding box propagation), rewritten as GLSL compute shaders instead of OpenCL kernels, plus moving world bounding box construction onto the GPU and switching Morton code storage from AoS to SoA.
- **A megakernel GPU ray tracer first** — one shader, one thread per ray, everything (generate/extend/shade) handled in a single dispatch. This was step one, deliberately kept simple to validate correctness before optimizing further.
- **A five-stage wavefront ray tracer**, replacing the megakernel, based on the "Megakernels Considered Harmful" approach: **Generate** (spawn camera rays into a buffer, once per frame), **Extend** (advance every ray to its next hit or scene-escape, looped), **Shade** (decide which rays die vs. bounce, accumulate radiance, spawn next-bounce rays, looped), **Dispatch** (compute exactly how many workgroups the next loop iteration needs via `vkCmdDispatchIndirect`, so idle rays stop occupying threads), and **Finalize** (write the accumulated buffer out to the final image, once per frame).
## The Interesting Bit: Moving to GPU Made Things *Slower* First

This is the part I liked most, because the result was genuinely counterintuitive until I dug into it. After the first GPU port — megakernel ray tracing, but *before* porting BVH traversal to match — rendering time actually got *worse*: 12,644.2ms, more than double the CPU baseline. On paper that makes no sense; more threads should mean faster, not slower.

The explanation turned out to be simple once I isolated it: without an acceleration structure on the GPU side, every one of those threads was brute-force testing against all ~144K triangles per ray, while the CPU baseline still had its BVH keeping intersection tests sparse. To confirm this diagnosis rather than just assume it, I reran the same comparison on a much smaller 4,968-triangle scene — where brute force is cheap enough not to matter — and the GPU version dropped to 118.62ms against the CPU baseline's 2920.47ms. That confirmed the GPU renderer itself was correct; it was purely the missing acceleration structure dragging it down on the full scene.

Once BVH traversal was ported onto the GPU alongside the megakernel (Phase 2), rendering dropped to 20.966ms — a ~242x speedup over baseline. But profiling that megakernel revealed a second, subtler problem: occupancy dropped off hard over the course of the render, since rays that miss everything or bounce out after one hit just sit idle while long-surviving rays keep the rest of the warp waiting. That's the exact problem wavefront ray tracing is designed to solve — by splitting the pipeline into stages and using indirect dispatch to only launch threads for rays that are still actually alive, occupancy stayed near 100% for much more of the render. That took rendering down further, to 14.416ms, and the profiled occupancy curve visibly confirmed the fix worked, not just the timing.

## Numbers

| Stage | Rendering Time | Total Run Time |
|---|---|---|
| Baseline (CPU render, GPU BVH via OpenCL) | 5066.8 ms | 5415.88 ms |
| Phase 2 (GPU megakernel + GPU BVH traversal, Vulkan) | 20.966 ms | 42.146 ms |
| Phase 3 (wavefront + GPU BVH traversal) | 14.416 ms | 35.663 ms |

BVH construction itself also got a ~9x speedup along the way (18.936ms → 2.154ms), mostly from moving world-bounding-box construction onto the GPU and switching to SoA storage for Morton codes.

The one honest tradeoff: the wavefront output is slightly noisier with harsher shadows than the megakernel/baseline output, at 1 sample per pixel. Everything through Phase 2 matched the baseline render pixel-for-pixel in character; wavefront trades a bit of that fidelity for its speed.

## Takeaways

The biggest lesson here was that "move it to the GPU" is necessary but not sufficient — without matching acceleration structure support, more threads can make things worse, not better. And even after that's fixed, raw kernel speed isn't the only axis that matters: occupancy is its own bottleneck, and restructuring a single monolithic kernel into a pipeline of smaller, more specialized stages can unlock a second large speedup that pure algorithmic tuning wouldn't have found.

## Under the Hood

- C++20, Vulkan compute (GLSL shaders compiled to SPIR-V via `glslangValidator`), SDL3 for windowing, OpenCL kept only as a reference baseline
- Vulkan backend, GPU LBVH port, megakernel, and wavefront pipeline all implemented from scratch
- Benchmarked on an AMD Ryzen 7 7700X + AMD Radeon RX 9060 XT, Stanford Bunny (144,046 triangles), 512×512, 1 spp, max depth 20 — averaged over 100 BVH builds / 15 frames after warm-up
- Done with **Márton Mohácsi**