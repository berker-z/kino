// The WebGL setup both shader passes share: a context, one full-screen
// program, and linear clamped textures. Small on purpose. What it adds over
// inline setup is failure you can read: a null context or a shader error
// names the pass, instead of a bare "shader" or a black frame.

/** A WebGL2 context, or a clear error saying why there isn't one. */
export function webgl2(canvas: HTMLCanvasElement, pass: string): WebGL2RenderingContext {
  const gl = canvas.getContext("webgl2", {preserveDrawingBuffer: true, antialias: false});
  if (!gl) {
    throw new Error(
      `${pass}: WebGL2 is unavailable, so this pass can't render. ` +
        "In headless Chrome this usually means no usable GPU backend " +
        "(on Linux under Wayland, SwiftShader can fail when WAYLAND_DISPLAY is set; see docs/lessons.md).",
    );
  }
  return gl;
}

/** Compile and link a program drawn as one full-screen quad (attribute `p`), and make it current. */
export function fullscreenProgram(gl: WebGL2RenderingContext, pass: string, vert: string, frag: string): WebGLProgram {
  const compile = (type: number, src: string, kind: string) => {
    const s = gl.createShader(type);
    if (!s) throw new Error(`${pass}: couldn't create the ${kind} shader (context lost?)`);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(`${pass}: ${kind} shader failed to compile:\n${gl.getShaderInfoLog(s) ?? "(no log)"}`);
    }
    return s;
  };
  const prog = gl.createProgram();
  if (!prog) throw new Error(`${pass}: couldn't create a program (context lost?)`);
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert, "vertex"));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag, "fragment"));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(`${pass}: program failed to link:\n${gl.getProgramInfoLog(prog) ?? "(no log)"}`);
  }
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  return prog;
}

/** A linear, edge-clamped 2D texture bound to `unit`. */
export function linearTexture(gl: WebGL2RenderingContext, unit: number): WebGLTexture {
  const t = gl.createTexture();
  if (!t) throw new Error("couldn't create a texture (context lost?)");
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
