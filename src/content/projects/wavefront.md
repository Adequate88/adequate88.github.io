---
title: Wavefront Ray Tracing on Compute Pipeline
subtitle: Using C++, Vulkan, GLSL
description: Implemented wavefront ray tracing on the GPU using Vulkan back-end and GLSL. My previous LBVH implementation was ported and recycled for fast rendering.
tags: [graphics-programming, ray-tracing, acceleration-structures, Vulkan, GLSL]
status: active
year: "2026"
month: "06"
github: https://github.com/Adequate88/Raytracer-LBVH
image: assets/wavefront.gif
---

![Real-time render from wavefront project](/assets/wavefront.gif)

**TL;DR:** I took my GPU LBVH project and took it further by rebuilding the backend onto Vulkan and taking the ray tracer onto the GPU. The final result took rendering time from ~5067ms to ~14.4ms - which was about a 352x speed-up. Although the ray tracer itself is simple (only diffuse materials and limited sampling), it can run in real time - a first step in taking this into something interesting.

**Tech:** C++, Vulkan, GLSL, SDL3

## The Goal

The aim of this project was to test my newfound Vulkan knowledge by porting my older LBVH project into Vulkan. Just to make things more difficult - and to really test myself - I wanted to implement the entire backend using only the official Vulkan documentation. A secondary aim, naturally, was to try and make my older project faster by applying some of the techniques I learnt from an optimization course I took. This meant using better data organiziation like structure of arrays, takings the ray tracers onto the GPU, and other optimizations where possible.

*Note: All benchmarking for this project were conduted on an AMD Ryzen 7 7700X + AMD Radeon RX 9060 XT, with a Stanford Bunny (144,046 triangles), and 512×512 resolution.*

## The Journey

#### The Vulkan Backend 

I took things step-by-step in creating the Vulkan backend because I didn't want to break everything to start with. I will omit the Vulkan plumbing details since they don't contain any significantly interesting details - the only thing worth mentioning is that this was all done on the compute pipeline so we could implement our own ray tracing and BVH algorithms. So, my first plan of action was to get the image from the original project (ray traced using the CPU) onto an SDL window with all the Vulkan plumbing working. 

To do this, I created an `image` struct to hold the `width` and `height` of the single rendered CPU image and the 4 RGBA bytes, which are stored into a `uint8` vector. A member function `write_image` of `VulkanEngine` (containing all the Vulkan plumbing) is then tasked with taking the data from the CPU `image` and taking it onto the GPU. I do this by creating a staging buffer, using `VkMapMemory` to map the image bytes into the buffer, then copying from the buffer into a `VkImage`. Then, I could finally see an image from my CPU render on a screen! Seeing this I could confirm that the Vulkan plumbing was working an I could move onto bigger things.

#### First GPU Raytracing

This is where the fun began - I had to start wiring up the old `Raytracer` class with my new `VulkanEngine` class. So, I had the `Raytracer` stored the engine by reference, and had the `Raytracer` store its own set of Vulkan variables (`VkPipeline`, `VkDescriptorSet`, `VkImage`, etc.). I did this because the `Raytracer` was what actually produced a render, so I wanted it to own everything related to the rendering of the image to present.

This whole process also included:
- Wiring up shaders into the pipeline
- Passing the scene data onto the GPU (using similar `VkMapMemory` code as before)
- Rewriting my primitive classes into structures compatible with GPU and GLSL shaders (so compatible with `Vec4`).

After all that, my partner Márton wrote a megakernel shader to perform basic ray tracing which he easily got to produce a rendered image because of the plumbing I set up.

#### Vulkan LBVH, Wavefront, and Other Stuff

At this point, we could ray trace on the GPU and produce an image. But, the problem was that our rendering was **~3x slower**. Seemingly a red flag in our code, but really is due to the fact that the BVH had not been ported and we were trying to ray trace a 140k triangle bunny with no acceleration structure. So, the LBVH was moved onto the Vulkan backend. 

My favorite part about this part was that since the ray tracer and scene data was already on the GPU, I could implement the LBVH as completely device local - a difference from the older project which required me to transfer data onto the GPU to construct the LBVH and then transfer the LBVH back to the CPU to render. This meant that the program as a whole ran faster since I no longer has to wait for long data transfer time, which made me happy.

Similar to the plumbing for the `Raytracer`, I had the `LBVH` class own all its own buffers and shader pipelines. Most of the implementation looks similar to `Raytracer`. Then, all OpenCL shaders were rewritten to GLSL, which wasn't too complicated. I took the liberty of making small optimization where possible. So I changed the data design of the Morton codes and primitives to be SoA, and also wrote a shader for the construction of the world bounding box (i.e. the bounding box containing all primitives in the scene), since it was previously on CPU. As a result, LBVH construction was **~9x faster**.

Márton then wrote wavefront shaders for the ray tracing and I helped with bug fixing and wiring it up to the backend. The final result was - compared to the start of the project -  a **~9x speed-up in LBVH construction**,  a **~352x speed-up in rendering time**, and  a **~152x speed-up in total program runtime**. The best of all, was that instead of having to wait seconds to minutes for the image like before, I could circle the rabbit in real-time. As the first project of this nature, it's hard to describe how exhilarating that was.

## Final Thoughts

 I am quite proud of where this project has landed so far - but this is far from the end. As my first attempt at a full Vulkan project with only using the Vulkan documentation, it went smoother than expected. Yet, there are still design choices that need to be improved, changes for maintainability and readability, and some extra abstraction to be done.  Aside from that, I want to expand this so that its actually rendering or doing something interesting. More materials, some path tracing, some simulations, and more. 
