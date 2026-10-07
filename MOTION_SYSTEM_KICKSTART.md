# Motion System Kickstart

## What this project is

This project is a code-native motion design system.

The goal is not simply to make videos with code. The goal is to build a reusable visual vocabulary that can be composed by humans or coding agents into coherent videos, clips, launch teasers, product demos, social assets, and eventually static visuals.

Think of it as a design system where **time is part of the design language**.

A conventional design system contains:

- typography
- colors
- spacing
- components
- layouts

This system should additionally contain:

- motion primitives
- transitions
- scene archetypes
- timing rules
- easing rules
- camera behavior
- texture
- image treatment
- animation intensity
- aesthetic-specific motion grammar

The initial implementation should use **HyperFrames** unless there is a strong technical reason not to.

HyperFrames is attractive because it treats ordinary HTML/CSS/JS as the authoring surface, can use browser-native graphics libraries, and is naturally suited to agent-generated compositions.

Do not overengineer the first version. The first objective is to prove that a small reusable library can create multiple visually coherent videos without rewriting every animation from scratch.

---

# Core idea

A video should be treated as:

```text
video = composition(scene[], aesthetic, content, timing)
```

A scene should be composed from reusable pieces:

```text
Scene
├── layout
├── components
├── effects
├── transitions
└── aesthetic rules
```

The system should have four conceptual layers:

```text
AESTHETICS
    ↓
SCENE ARCHETYPES
    ↓
COMPONENTS
    ↓
MOTION / EFFECT PRIMITIVES
```

The renderer is underneath all of this.

The goal is to make high-level intent increasingly expressive.

Instead of manually coding:

```text
animate heading from x=-40
fade from 0 to 1
add blur
remove blur over 12 frames
animate underline
```

we should eventually be able to express:

```text
HeroReveal
aesthetic: brutalistEditorial
entrance: hard-slide
```

The implementation can remain explicit internally.

---

# Design principles

## 1. Build vocabulary, not one-off videos

Avoid components whose only purpose is reproducing a single composition.

Bad:

```text
CoplandLaunchTitle
MarcelReleaseScene
MySpecificTweetCard
```

Better:

```text
HeroTitle
ProductReveal
QuoteCard
ReleaseBadge
CodeWindow
StatCard
```

The library should accumulate reusable visual ideas.

---

## 2. Aesthetics are more than themes

An aesthetic must not merely define colors and fonts.

It should define a **motion grammar**.

For example:

### brutalistEditorial

```text
Typography:
- condensed / grotesk
- oversized headings
- hard alignment

Motion:
- hard cuts
- linear or near-linear translation
- aggressive masks
- minimal bounce
- short durations

Texture:
- grain
- paper
- rough halftone

Layout:
- asymmetry
- large negative space
- visible grid tension
```

### softProduct

```text
Typography:
- clean sans
- restrained hierarchy

Motion:
- cubic easing
- slow opacity transitions
- soft scaling
- subtle depth

Texture:
- minimal
- light gradients

Layout:
- centered
- generous whitespace
```

Changing the aesthetic should alter the character of the animation, not just its palette.

---

## 3. Determinism matters

The same input should render the same output.

Avoid animation logic that depends on real elapsed wall-clock time.

Randomized effects must accept a deterministic seed.

Anything agent-authored should be inspectable at arbitrary timestamps or frames.

---

## 4. Agents are first-class authors

Assume much of the implementation will be written or assembled by coding agents.

Optimize APIs for:

- explicitness
- discoverability
- deterministic behavior
- easy previewing
- clear examples
- composability
- useful names
- predictable file organization

Do not optimize solely for minimizing keystrokes.

Verbose but obvious APIs are acceptable.

---

## 5. Keep primitives boring

The lowest layer should be simple and predictable.

For example:

```text
fade()
slide()
scale()
spring()
maskReveal()
blurReveal()
stagger()
shake()
typewriter()
counter()
```

Complex behavior should emerge from composition.

---

# Proposed project structure

Create approximately this structure:

```text
.
├── README.md
├── package.json
├── src/
│   ├── compositions/
│   │   └── playground/
│   │
│   ├── aesthetics/
│   │   ├── types.ts
│   │   ├── brutalist-editorial.ts
│   │   ├── nord-terminal.ts
│   │   └── index.ts
│   │
│   ├── motion/
│   │   ├── fade.ts
│   │   ├── slide.ts
│   │   ├── scale.ts
│   │   ├── spring.ts
│   │   ├── stagger.ts
│   │   ├── mask-reveal.ts
│   │   └── index.ts
│   │
│   ├── effects/
│   │   ├── grain/
│   │   ├── vignette/
│   │   ├── grid/
│   │   ├── glow/
│   │   └── index.ts
│   │
│   ├── components/
│   │   ├── animated-text/
│   │   ├── hero-title/
│   │   ├── quote-card/
│   │   ├── code-window/
│   │   ├── stat-card/
│   │   └── index.ts
│   │
│   ├── scenes/
│   │   ├── hero-reveal/
│   │   ├── quote-scene/
│   │   ├── feature-scene/
│   │   ├── code-scene/
│   │   ├── logo-sting/
│   │   └── index.ts
│   │
│   ├── transitions/
│   │   ├── hard-cut.ts
│   │   ├── wipe.ts
│   │   ├── push.ts
│   │   ├── flash.ts
│   │   └── index.ts
│   │
│   ├── tokens/
│   │   ├── timing.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── index.ts
│   │
│   └── utils/
│
├── examples/
│   ├── brutalist-demo/
│   └── nord-demo/
│
└── docs/
    ├── aesthetics.md
    ├── components.md
    └── authoring.md
```

Do not treat this exact tree as sacred. Keep it simple where possible.

---

# Aesthetic API

Create a typed aesthetic object early.

A rough target:

```ts
export type MotionAesthetic = {
  name: string;

  palette: {
    background: string;
    foreground: string;
    muted: string;
    accent: string;
    secondary?: string;
  };

  typography: {
    display: string;
    body: string;
    mono: string;
    displayWeight?: number;
    bodyWeight?: number;
  };

  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };

  motion: {
    fast: number;
    normal: number;
    slow: number;

    easing: {
      enter: string;
      exit: string;
      emphasis: string;
    };

    intensity: number;
    stagger: number;
  };

  surfaces: {
    radius: number;
    borderWidth: number;
    shadow: string;
  };

  texture: {
    grain: number;
    vignette: number;
    blur: number;
  };
};
```

This is only a starting point.

Do not prematurely create a giant token schema. Add properties as actual components need them.

---

# Initial aesthetics

Build only two initially.

They should be deliberately different so we can verify that aesthetics actually change the visual language.

## brutalistEditorial

Characteristics:

```text
black / off-white / one loud accent
oversized typography
hard edges
little or no border radius
aggressive masks
fast movement
hard cuts
visible grids
light grain
asymmetric composition
```

Potential references:

```text
editorial posters
Swiss typography distorted into something rougher
music festival identities
magazine covers
art-book layouts
```

Avoid turning this into generic "cyberpunk".

---

## nordTerminal

Characteristics:

```text
Nord-like cool palette
monospace
terminal/editor surfaces
thin borders
restrained motion
cursor / caret motifs
code-window framing
grid or coordinate hints
precise transitions
subtle glow
```

Avoid making everything look like fake hacker UI.

This should feel like refined developer tooling.

---

# Motion primitives

Implement these first:

```text
fade
slide
scale
stagger
spring
maskReveal
blurReveal
typewriter
counter
```

Each primitive should:

1. accept explicit timing
2. support deterministic seeking
3. expose sane defaults
4. allow aesthetic overrides
5. be easy for an agent to understand from the type signature alone

Prefer pure functions or small declarative objects.

Example conceptual API:

```ts
slide({
  from: "bottom",
  distance: 48,
  start: 0.2,
  duration: 0.5,
  easing: aesthetic.motion.easing.enter,
});
```

---

# Effects

Start with effects that materially change visual identity:

```text
grain
vignette
grid
glow
scanlines
chromaticAberration
noise
backgroundGradient
```

Do not build twenty effects before we can make one good scene.

Every effect should have an intensity parameter and be disableable.

---

# Components

Build these first.

## AnimatedText

The fundamental text primitive.

Should eventually support:

```text
fade
slide
word stagger
character stagger
mask reveal
typewriter
blur reveal
```

Keep the initial version small.

---

## HeroTitle

Large headline + optional eyebrow + optional subheading.

Example:

```ts
HeroTitle({
  eyebrow: "COPLAND",
  title: "Stop managing agents.\nStart shipping.",
  subtitle: "Portable agent coordination for real repositories."
})
```

---

## QuoteCard

Large quote with optional attribution.

Useful for:

```text
testimonials
manifesto text
product claims
tweets
pull quotes
```

---

## CodeWindow

A reusable editor / terminal-like surface.

Should support:

```text
filename
language
code
highlighted lines
cursor
optional typing animation
```

Do not build a full code editor.

---

## StatCard

For:

```text
31× faster
2.1k stars
120 fps
$42k MRR
```

Large number, label, optional supporting text.

---

# Scene archetypes

Scenes should be larger reusable compositions.

## HeroReveal

```text
background
headline
subheadline
optional logo / mark
entrance animation
```

---

## QuoteScene

```text
quote
attribution
optional source mark
```

---

## FeatureScene

```text
feature title
short explanation
visual demo or component
```

---

## CodeScene

```text
headline
code window
optional annotation
```

---

## LogoSting

```text
logo / wordmark
short reveal
short exit
```

---

# Composition model

A full video should eventually be describable as data.

For example:

```ts
const launchVideo = {
  aesthetic: brutalistEditorial,

  format: {
    width: 1920,
    height: 1080,
    fps: 30,
  },

  scenes: [
    {
      type: "hero",
      duration: 4,
      props: {
        eyebrow: "COPLAND",
        title: "Drop the productivity theater.",
      },
    },

    {
      type: "feature",
      duration: 6,
      props: {
        title: "Coordinate real agents.",
        visual: "agentGraph",
      },
    },

    {
      type: "quote",
      duration: 4,
      props: {
        quote: "Start working in 2–3 minutes.",
      },
    },

    {
      type: "logo",
      duration: 2,
    },
  ],
};
```

Do not implement a giant declarative DSL immediately.

This is the direction.

First prove the component model manually.

---

# Playground

Create one composition whose only job is to preview the library.

It should contain:

```text
motion primitive examples
effect examples
all components
all scene archetypes
aesthetic switcher
```

Think Storybook, but for motion.

This playground is important.

The project should make visual iteration extremely cheap.

An agent should be able to modify a primitive and immediately preview several uses of it.

---

# Agent-facing documentation

Create short docs alongside the code.

An agent should be able to discover:

```text
What components exist?
What props do they accept?
What aesthetics exist?
What effects exist?
What scene archetypes exist?
How should timing be expressed?
How do I render / preview something?
```

Prefer concise examples over prose.

Eventually generate some documentation automatically from types if useful.

---

# Naming rules

Names should describe visual behavior, not implementation detail.

Good:

```text
MaskReveal
HardCut
PushTransition
HeroTitle
QuoteScene
CodeWindow
FilmGrain
```

Avoid:

```text
FancyThing
CoolEffect
Animation1
ExperimentalReveal
ModernCard
```

If something cannot be named clearly, its abstraction is probably unclear.

---

# What NOT to build yet

Do not build:

```text
GUI editor
timeline editor
After Effects clone
plugin marketplace
cloud renderer
template marketplace
asset manager
collaboration
accounts
database
complex DSL
visual node graph
full design-token compiler
AI chat UI
```

The first version is a code library.

The product is the vocabulary.

---

# First milestone

The first meaningful milestone is:

> One short composition, rendered using the same reusable library in two radically different aesthetics.

Example:

```text
15-second fake product launch
same content
same scene structure
same components

render A:
brutalistEditorial

render B:
nordTerminal
```

If these feel genuinely different while sharing the same underlying scene structure, the architecture is working.

---

# First implementation session

When starting from this file in an empty directory:

1. Research the current HyperFrames installation and project structure.
2. Bootstrap the smallest working HyperFrames project.
3. Verify that a trivial composition previews and renders.
4. Create the folder structure needed for:
   - aesthetics
   - motion
   - effects
   - components
   - scenes
5. Implement the `MotionAesthetic` type.
6. Implement:
   - `brutalistEditorial`
   - `nordTerminal`
7. Implement the first three motion primitives:
   - fade
   - slide
   - stagger
8. Implement:
   - `AnimatedText`
   - `HeroTitle`
9. Implement:
   - `Grain`
   - `Grid`
10. Build one `HeroReveal` scene.
11. Render the same HeroReveal using both aesthetics.
12. Save example renders or previews under `examples/`.
13. Document how to run the project in `README.md`.

Do not continue adding features until those two renders look intentionally designed.

---

# Quality bar

A component is not done because it works.

It should satisfy:

```text
Does it look intentional?
Is it reusable?
Is its API obvious?
Does it work with both aesthetics?
Can an agent discover how to use it?
Can it be previewed quickly?
Does it behave deterministically?
```

Reject abstractions that create visual sameness.

The system should create consistency without making every output look identical.

---

# Longer-term directions

Only after the first system works, consider:

## More aesthetics

```text
swissInternational
giallo
earlyWeb
crtTerminal
monochromeNewspaper
corporateY2K
softProduct
luxuryEditorial
industrialUI
```

---

## More scene archetypes

```text
TimelineScene
ComparisonScene
ImageReveal
ProductDemo
MetricsScene
ListScene
DiagramScene
OutroScene
TestimonialScene
```

---

## Asset-aware components

```text
screenshots
logos
product UI
video clips
images
SVG diagrams
code snippets
audio
```

---

## Semantic registry

Eventually components should have metadata:

```ts
{
  name: "QuoteScene",
  tags: ["quote", "editorial", "text-heavy"],
  supportedFormats: ["16:9", "9:16", "1:1"],
  compatibleAesthetics: ["*"],
}
```

This would let an agent search the library semantically.

---

## Agent composition

Eventually an agent should be able to receive:

```text
Make a 20-second launch teaser.

Aesthetic:
brutalistEditorial

Structure:
hero
feature
feature
quote
logo

Tone:
aggressive, restrained, no startup-gradient bullshit
```

and compose a video using existing vocabulary before inventing anything new.

That is the long-term north star.

---

# Important architectural question

Keep the system renderer-agnostic **where doing so is cheap**.

The library should primarily express:

```text
aesthetic
motion
components
scenes
composition
```

HyperFrames is the first rendering backend.

Do not prematurely build a renderer abstraction layer.

But avoid coupling conceptual APIs to HyperFrames internals unnecessarily.

If fframes, Remotion, or another renderer becomes attractive later, we should be able to port the vocabulary without redesigning the whole project.

---

# Project philosophy

The project should feel like a personal visual instrument.

The value is cumulative.

Every useful effect, transition, component, layout, scene, and aesthetic added today should make future work faster and more coherent.

The ideal end state is:

```text
I have an idea
    ↓
I describe the structure
    ↓
an agent chooses from my visual vocabulary
    ↓
I tweak the result
    ↓
render
```

The hard part should gradually move away from implementation and toward taste.

That is the project.
