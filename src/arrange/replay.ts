// replay: makes a stateful, step-driven scene seek-safe.
//
// Some sources aren't functions of time: a live product UI's animation (the
// /wired scene in Copland), a physics toy, anything with step(dt) and draw().
// HyperFrames asks for frames in any order, so for time t the scene is run
// from zero in fixed steps, with scripted data changes applied at their
// times, then drawn. Going forward continues from the last state; going back
// rebuilds. The result for a given t never depends on what was asked before.
// See docs/primitives/replay.md.

export interface Steppable<D> {
  /** Advance the scene's own clock by dt seconds. */
  step(dt: number): void;
  /** Tell the scene its data changed (the product's own setData, say). */
  apply(data: D): void;
  /** Paint the current state. */
  draw(): void;
}

export interface ReplayOptions<D, S extends Steppable<D>> {
  /** A fresh scene in its initial state. Called again on every rebuild. */
  create: () => S;
  /** Data changes in time order: at `t` seconds the scene is told `data`. */
  story?: Array<{t: number; data: D}>;
  /** How fast the scene's own clock runs at time t (1 = real time). */
  rate?: (t: number) => number;
  /** Step size in seconds. Smaller is closer to a live 60 fps run. */
  dt?: number;
}

export interface Replay<S> {
  /** The scene in its state at time t, drawn. */
  at(t: number): S;
  /** How many rebuilds have happened (for tests and profiling). */
  readonly rebuilds: number;
}

export function replay<D, S extends Steppable<D>>({create, story = [], rate = () => 1, dt = 1 / 60}: ReplayOptions<D, S>): Replay<S> {
  let scene: S | null = null;
  let clock = 0;
  let next = 0;
  let rebuilds = 0;
  const events = [...story].sort((a, b) => a.t - b.t);

  function reset() {
    scene = create();
    clock = 0;
    next = 0;
    rebuilds++;
  }
  function apply(upTo: number) {
    while (next < events.length && events[next].t <= upTo + 1e-9) scene!.apply(events[next++].data);
  }

  return {
    at(t: number) {
      if (!scene || t < clock - 1e-9) reset();
      apply(clock);
      while (clock < t - 1e-9) {
        // Steps land on multiples of dt, so the state at t is the same
        // whether it was reached in one call or many.
        const target = Math.min(t, (Math.floor(clock / dt + 1e-9) + 1) * dt);
        scene!.step((target - clock) * rate(clock));
        clock = target;
        apply(clock);
      }
      scene!.draw();
      return scene!;
    },
    get rebuilds() {
      return rebuilds;
    },
  };
}
