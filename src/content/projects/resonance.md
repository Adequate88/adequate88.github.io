---
title: Rendering Resonance
subtitle: Using JavaScript, WebGL, GLSL
description: A JavaScript rasterizer with bloom, fog, toon shading, normal mapping, and particle effects.
tags: [graphics-programming, rasterization, simulation, GLSL]
status: active
year: "2025"
github: https://github.com/Adequate88/
image: assets/resonance.gif
---

![Resonance image](/assets/resonance.gif)

**TL;DR:** A team rasterizer project built to make the same 3D scene evoke completely different moods purely through rendering technique — bloom, fog, toon shading, normal mapping, and particle effects, all switchable and tunable at runtime. I owned the particle system (fire, smoke, fireflies via billboards) and normal mappinwebsiteg; my teammates handled bloom, fog, toon shading, and the base scene.

*(Note: subtitle assumes this was a JavaScript/WebGL project based on the file references I saw — flag me if that's wrong and I'll fix it, since your meta had it as a placeholder.)*

## The Problem

The premise was: take one simple base scene and make it feel like three completely different places, without changing the geometry — only the rendering pipeline. That meant every effect had to be built as an independently toggleable, UI-configurable layer rather than something baked into a specific scene.

## What I Built

- **Particle system (fire, smoke, fireflies):** A `ParticleSystem` base class managing a pool of particles with configurable lifetime, color, scale, velocity, and spawn rate, plus an `evolve(dt)` step that updates every particle each frame and a `respawn_particle()` step that recycles expired ones instead of allocating new ones. Fire and smoke are subclasses that override the evolution/respawn behavior to get their distinct physics. Particles render as camera-facing billboards — quads built from the camera's up/right vectors — handled by a dedicated billboard renderer and shader pair.
- **Normal mapping:** Added tangent/bitangent computation per vertex (averaged across all faces sharing that vertex), threaded through the vertex shader as varyings, and reconstructed into a TBN matrix in the fragment shader to transform sampled normal-map values into the correct space before feeding them into Blinn-Phong lighting.
## Notes From the Process

The particle work mostly came together once the underlying billboard rendering path was solid — fire and smoke ended up being mostly a matter of tuning evolution parameters (velocity drift, color-over-lifetime, spawn rate) rather than new rendering infrastructure. One limitation worth flagging: fog doesn't affect particles, since particles have no mesh/vertices for a vertex shader to operate on, and giving each particle its own mesh wasn't worth the performance cost for how many particles a scene like this needs.

## Under the Hood

- JavaScript / WebGL, GLSL shaders
- Particle system and normal mapping implemented from scratch
- Team project with Catalina Regolf Cortes (toon shading, base Blender scene) and Tizian Kurz (bloom, fog)
