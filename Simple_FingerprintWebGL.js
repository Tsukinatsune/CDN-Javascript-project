const Fingerprint = (() => {

  function getWebGLParams(gl) {
    if (!gl) return '';
    return [
      gl.getParameter(gl.MAX_TEXTURE_SIZE),
      gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      gl.getParameter(gl.MAX_VARYING_VECTORS),
      gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
      gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
      gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
      gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE),
      gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE),
      gl.getParameter(gl.MAX_VIEWPORT_DIMS),
      (gl.getSupportedExtensions() || []).join(','),
    ].join(',');
  }

  async function sha256hex(str) {
    const encoded = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function collect() {
    const gl = document.createElement('canvas').getContext('webgl');
    const dbg = gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;
    return {
      glRenderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '',
      glVendor:   dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)   : '',
      glParams:   getWebGLParams(gl),
    };
  }

  async function get() {
    const signals = await collect();
    const hash = await sha256hex([signals.glRenderer, signals.glVendor, signals.glParams].join('|'));
    return { hash, signals };
  }

  return { get, collect };
})();
