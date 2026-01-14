        (function (global) {
    class WebglmaskCK {
        constructor(config) {
            if (!config.videoUrl) {
                console.error("'videoUrl' is required.");
                return;
            }

            this.videoUrl = config.videoUrl;
            this.keyColor = config.keyColor || [0.0, 1.0, 0.0];
            this.similarity = config.similarity !== undefined ? config.similarity : 0.45;
            this.smoothness = config.smoothness !== undefined ? config.smoothness : 0.08;
            this.zIndex = config.zIndex || 9999;
            
            this.onStart = config.onStart || (() => {});
            this.onEnd = config.onEnd || (() => {});

            this.isPlaying = false;
            this.canvas = null;
            this.video = null;
            this.gl = null;
            this.program = null;
            
            this._createDOM();
            this._initWebGL();
        }

        play() {
            if (this.isPlaying) return;
            
            this.video.currentTime = 0;
            this.video.style.display = 'block';
            
            this.canvas.style.opacity = '1';
            this.canvas.style.pointerEvents = 'auto';

            this.onStart();

            this.video.play().then(() => {
                this.isPlaying = true;
                this._renderLoop();
            }).catch(e => {
                console.error("WebglmaskCK: Autoplay blocked or failed.", e);
            });
        }

        setSettings(settings) {
            if (settings.similarity !== undefined) this.similarity = settings.similarity;
            if (settings.smoothness !== undefined) this.smoothness = settings.smoothness;
            if (settings.keyColor !== undefined) this.keyColor = settings.keyColor;
        }

        destroy() {
            window.removeEventListener('resize', this._resizeBound);
            if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
            if (this.video && this.video.parentNode) this.video.parentNode.removeChild(this.video);
        }

        _createDOM() {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'WebglmaskCK-canvas';
            Object.assign(this.canvas.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                zIndex: this.zIndex,
                opacity: '0',
                pointerEvents: 'none',
                transition: 'opacity 0.2s ease'
            });
            document.body.appendChild(this.canvas);

            this.video = document.createElement('video');
            this.video.crossOrigin = "anonymous";
            this.video.playsInline = true;
            this.video.muted = true;
            this.video.src = this.videoUrl;
            Object.assign(this.video.style, {
                display: 'none',
                position: 'absolute',
                width: '1px',
                height: '1px',
                opacity: '0'
            });
            document.body.appendChild(this.video);

            this.video.addEventListener('ended', () => {
                this.isPlaying = false;
                this.canvas.style.opacity = '0';
                this.canvas.style.pointerEvents = 'none';
                
                setTimeout(() => {
                    if (this.gl) {
                        this.gl.clearColor(0, 0, 0, 0);
                        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
                    }
                    this.onEnd();
                }, 200);
            });
        }

        _initWebGL() {
            this.gl = this.canvas.getContext('webgl');
            if (!this.gl) {
                console.error("WebGL not supported.");
                return;
            }

            const vsSource = `
                attribute vec2 a_position;
                attribute vec2 a_texCoord;
                varying vec2 v_texCoord;
                void main() {
                    gl_Position = vec4(a_position, 0, 1);
                    v_texCoord = a_texCoord;
                }
            `;

            const fsSource = `
                precision mediump float;
                uniform sampler2D u_image;
                varying vec2 v_texCoord;
                uniform vec3 u_keyColor;
                uniform float u_similarity;
                uniform float u_smoothness;

                void main() {
                    vec4 texColor = texture2D(u_image, v_texCoord);
                    float diff = length(texColor.rgb - u_keyColor);
                    float alpha = smoothstep(u_similarity, u_similarity + u_smoothness, diff);
                    
                    float rbMax = max(texColor.r, texColor.b);
                    if (texColor.g > rbMax) {
                        texColor.g = rbMax; 
                    }

                    gl_FragColor = vec4(texColor.rgb, texColor.a * alpha);
                }
            `;

            const createShader = (gl, type, source) => {
                const shader = gl.createShader(type);
                gl.shaderSource(shader, source);
                gl.compileShader(shader);
                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                    console.error(gl.getShaderInfoLog(shader));
                    gl.deleteShader(shader);
                    return null;
                }
                return shader;
            };

            const vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, vsSource);
            const fragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, fsSource);
            
            this.program = this.gl.createProgram();
            this.gl.attachShader(this.program, vertexShader);
            this.gl.attachShader(this.program, fragmentShader);
            this.gl.linkProgram(this.program);

            const positionBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
                -1.0, -1.0,  1.0, -1.0, -1.0,  1.0,
                -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,
            ]), this.gl.STATIC_DRAW);

            const texCoordBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
                0.0, 1.0,  1.0, 1.0,  0.0, 0.0,
                0.0, 0.0,  1.0, 1.0,  1.0, 0.0,
            ]), this.gl.STATIC_DRAW);

            this.texture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

            this.loc = {
                position: this.gl.getAttribLocation(this.program, "a_position"),
                texCoord: this.gl.getAttribLocation(this.program, "a_texCoord"),
                keyColor: this.gl.getUniformLocation(this.program, "u_keyColor"),
                similarity: this.gl.getUniformLocation(this.program, "u_similarity"),
                smoothness: this.gl.getUniformLocation(this.program, "u_smoothness")
            };

            this._resizeBound = this._resize.bind(this);
            window.addEventListener('resize', this._resizeBound);
            this._resize();
        }

        _resize() {
            if (this.canvas) {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
                if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            }
        }

        _renderLoop() {
            if (!this.isPlaying) return;

            this.gl.clearColor(0, 0, 0, 0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            this.gl.useProgram(this.program);

            this.gl.enableVertexAttribArray(this.loc.position);
            
            const pBuf = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, pBuf);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), this.gl.STATIC_DRAW);
            this.gl.vertexAttribPointer(this.loc.position, 2, this.gl.FLOAT, false, 0, 0);

            const tBuf = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, tBuf);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([0,1, 1,1, 0,0, 0,0, 1,1, 1,0]), this.gl.STATIC_DRAW);
            this.gl.enableVertexAttribArray(this.loc.texCoord);
            this.gl.vertexAttribPointer(this.loc.texCoord, 2, this.gl.FLOAT, false, 0, 0);

            this.gl.uniform3fv(this.loc.keyColor, this.keyColor);
            this.gl.uniform1f(this.loc.similarity, this.similarity);
            this.gl.uniform1f(this.loc.smoothness, this.smoothness);

            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.video);

            this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

            requestAnimationFrame(this._renderLoop.bind(this));
        }
    }

    global.WebglmaskCK = WebglmaskCK;

})(window);
