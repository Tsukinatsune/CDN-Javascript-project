  let carouselimagecache = {};

function drawImageNormally(ctx, canvas, imgUrl, options = {}) {
    const {
        dpi = 96,
        dpr = window.devicePixelRatio || 1,
        pixelWidth = canvas.width,
        pixelHeight = canvas.height,
        resolutionWidth = null,
        resolutionHeight = null,
        fitMode = 'contain',
        loadingAnimation = 'spinner',
        postLoadAnimation = 'fadezoom',
        middleAnimation = 'none',
        exitAnimation = 'fadeout',
        middleDuration = Infinity
    } = options;

    const cssDpi = 96;
    const dpiScale = dpi / cssDpi;
    const backingWidth = pixelWidth * dpr * dpiScale;
    const backingHeight = pixelHeight * dpr * dpiScale;
    if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
    }
    const effectiveScale = dpr * dpiScale;
    ctx.scale(effectiveScale, effectiveScale);
    const targetWidth = pixelWidth;
    const targetHeight = pixelHeight;

    let img;
    let startTime = Date.now();
    let animationFrameId = null;
    let loadTime = null;
    let middleStartTime = null;
    let state = 'loading';

    const animateLoading = (type) => {
        const elapsed = (Date.now() - startTime) / 1000;
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        const centerX = targetWidth / 2;
        const centerY = targetHeight / 2;
        const maxRadius = Math.min(centerX, centerY) * 0.6;
        ctx.lineWidth = 4 / effectiveScale;

        if (type === 'spinner') {
            ctx.strokeStyle = `#007bff`;
            const radius = maxRadius * 0.5;
            for (let i = 0; i < 8; i++) {
                const angle = (elapsed * 2 * Math.PI / 2) + (i * Math.PI / 4);
                const x1 = centerX + radius * Math.cos(angle);
                const y1 = centerY + radius * Math.sin(angle);
                const x2 = centerX + radius * 1.5 * Math.cos(angle + Math.PI);
                const y2 = centerY + radius * 1.5 * Math.sin(angle + Math.PI);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
            ctx.globalAlpha = 0.5 + 0.5 * Math.sin(elapsed * 5);
        } else if (type === 'pulse') {
            ctx.strokeStyle = `#28a745`;
            const waves = 5;
            for (let i = 0; i < waves; i++) {
                const waveRadius = (elapsed * 20 + i * 20) % maxRadius;
                const opacity = 1 - (waveRadius / maxRadius);
                ctx.globalAlpha = opacity;
                ctx.beginPath();
                const freq = 8;
                const amp = 5 / effectiveScale;
                for (let theta = 0; theta < 2 * Math.PI; theta += 0.1) {
                    const r = waveRadius + amp * Math.sin(theta * freq + elapsed * 2);
                    const x = centerX + r * Math.cos(theta);
                    const y = centerY + r * Math.sin(theta);
                    if (theta === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        } else if (type === 'circleDownloadSpin') {
        ctx.strokeStyle = `#00ccff`;
        const segments = 8;
        const radius = maxRadius * 0.4;
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < segments; i++) {
            const angle = (elapsed * 3 + (i * 2 * Math.PI / segments)) % (2 * Math.PI);
            const opacity = 0.3 + 0.7 * (1 - (i / segments));
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, angle, angle + Math.PI / 8);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        return true;
    } else if (type === 'orbit') {
            ctx.fillStyle = `#ffc107`;
            const numParticles = 12;
            const orbitRadius = maxRadius * 0.7;
            for (let i = 0; i < numParticles; i++) {
                const e = 0.3;
                const a = orbitRadius / (1 - e * e);
                const theta = (elapsed * 1.5) + (i * 2 * Math.PI / numParticles);
                const r = a * (1 - e * e) / (1 + e * Math.cos(theta));
                const x = centerX + r * Math.cos(theta);
                const y = centerY + r * Math.sin(theta);
                ctx.globalAlpha = 0.5 + 0.5 * Math.sin(elapsed * 2 + i);
                ctx.beginPath();
                ctx.arc(x, y, 3 / Math.sqrt(effectiveScale), 0, 2 * Math.PI);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        } else if (type === 'none') {
            return false;
        }
        return true;
    };

    const animatePostLoad = (type, image, drawParams) => {
        const { x, y, imgScaledWidth, imgScaledHeight, scale } = drawParams;
        const elapsedPost = (Date.now() - loadTime) / 1000;
        const progress = Math.min(elapsedPost / 2, 1);
        const eased = easeOutCubic(progress);
        ctx.clearRect(0, 0, targetWidth, targetHeight);

        if (type === 'fadezoom') {
            ctx.globalAlpha = eased;
            const zoom = 1 + (1 - eased) * 0.2;
            ctx.save();
            ctx.translate(x + imgScaledWidth / 2, y + imgScaledHeight / 2);
            ctx.scale(zoom, zoom);
            ctx.translate(-(x + imgScaledWidth / 2), -(y + imgScaledHeight / 2));
            ctx.drawImage(image, x, y, imgScaledWidth, imgScaledHeight);
            ctx.restore();
            ctx.globalAlpha = 1;
        } else if (type === 'ripple') {
            ctx.drawImage(image, x, y, imgScaledWidth, imgScaledHeight);
            ctx.strokeStyle = `rgba(0, 123, 255, ${1 - eased})`;
            ctx.lineWidth = 2 / effectiveScale;
            const waves = 3;
            for (let i = 0; i < waves; i++) {
                const waveOffset = (elapsedPost * 50 + i * 30) % (targetWidth + 100);
                ctx.beginPath();
                for (let px = -50; px < targetWidth + 50; px += 5) {
                    const amp = 10 * (1 - eased) * Math.sin((px / targetWidth) * Math.PI);
                    const waveY = (targetHeight / waves) * i + amp * Math.sin(px * 0.05 + elapsedPost * 5);
                    if (px === -50) ctx.moveTo(px, waveY);
                    else ctx.lineTo(px, waveY);
                }
                ctx.stroke();
            }
        } else if (type === 'particleburst') {
            ctx.drawImage(image, x, y, imgScaledWidth, imgScaledHeight);
            const numParticles = 20;
            const centerX = x + imgScaledWidth / 2;
            const centerY = y + imgScaledHeight / 2;
            ctx.fillStyle = `#ff6b6b`;
            for (let i = 0; i < numParticles; i++) {
                const angle = (i * 2 * Math.PI / numParticles) + elapsedPost * 0.5;
                const speed = 50 + Math.random() * 50;
                const dist = speed * elapsedPost * (1 - eased);
                const gravity = 50;
                const px = centerX + dist * Math.cos(angle);
                const py = centerY + dist * Math.sin(angle) - 0.5 * gravity * elapsedPost * elapsedPost * (1 - eased);
                if (px < 0 || px > targetWidth || py < 0 || py > targetHeight) continue;
                ctx.globalAlpha = 1 - eased;
                ctx.beginPath();
                ctx.arc(px, py, 3 / Math.sqrt(effectiveScale), 0, 2 * Math.PI);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        } else if (type === 'slime') {
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, imgScaledWidth, imgScaledHeight);
            ctx.clip();
            const dripOffset = (1 - eased) * imgScaledHeight * 0.3;
            ctx.drawImage(image, x, y - dripOffset, imgScaledWidth, imgScaledHeight);
            ctx.fillStyle = `rgba(0, 255, 127, ${1 - eased})`;
            const numDrips = 5;
            const dripWidth = imgScaledWidth / numDrips;
            for (let i = 0; i < numDrips; i++) {
                const dripX = x + i * dripWidth + dripWidth / 2;
                const dripLength = dripOffset * (0.5 + 0.5 * Math.sin(i + elapsedPost * 2));
                const dripY = y + imgScaledHeight;
                ctx.beginPath();
                ctx.moveTo(dripX - dripWidth * 0.3, dripY);
                ctx.bezierCurveTo(
                    dripX - dripWidth * 0.3, dripY + dripLength * 0.3,
                    dripX + dripWidth * 0.3, dripY + dripLength * 0.3,
                    dripX + dripWidth * 0.3, dripY
                );
                ctx.lineTo(dripX + dripWidth * 0.2, dripY + dripLength);
                ctx.lineTo(dripX - dripWidth * 0.2, dripY + dripLength);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        } else if (type === 'flameAnimation') {
        ctx.globalAlpha = eased;
        ctx.drawImage(image, x, y, imgScaledWidth, imgScaledHeight);
        const numFlames = 30;
        ctx.globalAlpha = 1 - eased;
        for (let i = 0; i < numFlames; i++) {
            const flameX = x + Math.random() * imgScaledWidth;
            const baseY = y + imgScaledHeight;
            const flameProgress = (elapsedPost + Math.random() * 0.5) * 50;
            const flameY = baseY - flameProgress;
            const size = (5 + Math.random() * 5) / Math.sqrt(effectiveScale);
            const hue = 20 + Math.random() * 40; // Red to yellow
            ctx.fillStyle = `hsla(${hue}, 80%, 50%, ${1 - eased})`;
            ctx.beginPath();
            ctx.moveTo(flameX, flameY);
            ctx.quadraticCurveTo(
                flameX - size / 2, flameY - size * 2,
                flameX, flameY - size * 4
            );
            ctx.quadraticCurveTo(
                flameX + size / 2, flameY - size * 2,
                flameX, flameY
            );
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    } else if (type === 'bending') {
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(x, y, imgScaledWidth, imgScaledHeight);
                    ctx.clip();

                    // Draw the image without distortion as progress approaches 1
                    if (progress >= 0.99) {
                        ctx.drawImage(image, x, y, imgScaledWidth, imgScaledHeight);
                    } else {
                        // Spiral bend effect applied to the entire image
                        const amplitude = 0.1 * (1 - eased); // Amplitude for spiral offset
                        const frequency = 2 * Math.PI; // Frequency for spiral rotation
                        const spiralAngle = frequency * elapsedPost * (1 - eased); // Spiral rotation

                        // Center the transformation on the image
                        ctx.translate(x + imgScaledWidth / 2, y + imgScaledHeight / 2);

                        // Apply spiral transformation
                        ctx.rotate(spiralAngle * 0.5); // Rotate the image for spiral effect
                        const offsetX = amplitude * imgScaledWidth * Math.sin(elapsedPost);
                        const offsetY = amplitude * imgScaledHeight * Math.cos(elapsedPost);
                        ctx.translate(offsetX, offsetY);

                        // Draw the image centered
                        ctx.drawImage(image, -imgScaledWidth / 2, -imgScaledHeight / 2, imgScaledWidth, imgScaledHeight);

                        // Add smoke effect for spiralSmoke aesthetic
                        ctx.globalAlpha = (1 - eased) * 0.3;
                        ctx.fillStyle = `rgba(128, 128, 128, 0.2)`;
                        const centerX = 0; // Relative to translated context
                        const centerY = 0;
                        const maxRadius = Math.max(imgScaledWidth, imgScaledHeight) * 0.7;
                        for (let i = 0; i < 20; i++) {
                            const angle = i * 2 * Math.PI / 20 + elapsedPost;
                            const r = maxRadius * (1 - eased);
                            const smokeX = centerX + r * Math.cos(angle * 3);
                            const smokeY = centerY + r * Math.sin(angle * 3);
                            ctx.beginPath();
                            ctx.arc(smokeX, smokeY, 3 / effectiveScale, 0, 2 * Math.PI);
                            ctx.fill();
                        }
                        ctx.globalAlpha = 1;
                    }
                    ctx.restore();
                }  else if (type === 'wobble') {
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, imgScaledWidth, imgScaledHeight);
            ctx.clip();
            const amplitude = 0.05 * (1 - eased);
            const frequency = 5;
            const wobbleX = amplitude * imgScaledWidth * Math.sin(frequency * elapsedPost);
            const wobbleY = amplitude * imgScaledHeight * Math.cos(frequency * elapsedPost);
            const wobbleScaleX = 1 + amplitude * Math.sin(frequency * elapsedPost + Math.PI / 2);
            const wobbleScaleY = 1 + amplitude * Math.cos(frequency * elapsedPost + Math.PI / 2);
            ctx.translate(x + imgScaledWidth / 2, y + imgScaledHeight / 2);
            ctx.scale(wobbleScaleX, wobbleScaleY);
            ctx.translate(-imgScaledWidth / 2 + wobbleX, -imgScaledHeight / 2 + wobbleY);
            ctx.drawImage(image, 0, 0, imgScaledWidth, imgScaledHeight);
            ctx.restore();
        } else if (type === 'none') {
            ctx.drawImage(image, x, y, imgScaledWidth, imgScaledHeight);
            return false;
        }
        return progress < 1;
    };

    const animateMiddle = (type, image, drawParams) => {
        const { x, y, imgScaledWidth, imgScaledHeight } = drawParams;
        const elapsedMiddle = (Date.now() - middleStartTime) / 1000;
        const progress = middleDuration === Infinity ? elapsedMiddle : Math.min(elapsedMiddle / (middleDuration / 1000), 1);
        const eased = easeOutCubic(Math.min(progress, 1));
        ctx.clearRect(0, 0, targetWidth, targetHeight);

        if (type === 'breathe') {
            const scale = 1 + 0.03 * Math.sin(elapsedMiddle * 2);
            ctx.save();
            ctx.translate(x + imgScaledWidth / 2, y + imgScaledHeight / 2);
            ctx.scale(scale, scale);
            ctx.translate(-(x + imgScaledWidth / 2), -(y + imgScaledHeight / 2));
            ctx.drawImage(image, x, y, imgScaledWidth, imgScaledHeight);
            ctx.restore();
        } else if (type === 'glow') {
            ctx.drawImage(image, x, y, imgScaledWidth, imgScaledHeight);
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 + 0.5 * Math.cos(elapsedMiddle * 3)})`;
            ctx.lineWidth = 6 / effectiveScale;
            ctx.beginPath();
            ctx.rect(x - 3 / effectiveScale, y - 3 / effectiveScale, imgScaledWidth + 6 / effectiveScale, imgScaledHeight + 6 / effectiveScale);
            ctx.stroke();
        } else if (type === 'wave') {
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, imgScaledWidth, imgScaledHeight);
            ctx.clip();
            const amplitude = 5 / effectiveScale;
            const frequency = 0.05;
            ctx.translate(x, y);
            for (let py = 0; py < imgScaledHeight; py += 1) {
                const offsetX = amplitude * Math.sin(frequency * py + elapsedMiddle * 2);
                ctx.drawImage(image, offsetX, py, imgScaledWidth, 1, 0, py, imgScaledWidth, 1);
            }
            ctx.restore();
        } else if (type === 'none') {
            ctx.drawImage(image, x, y, imgScaledWidth, imgScaledHeight);
            return middleDuration === Infinity ? true : progress < 1;
        }
        return middleDuration === Infinity ? true : progress < 1;
    };

    const animateExit = (type, image, drawParams) => {
        const { x, y, imgScaledWidth, imgScaledHeight } = drawParams;
        const elapsedExit = (Date.now() - exitStartTime) / 1000;
        const progress = Math.min(elapsedExit / 1.5, 1);
        const eased = easeOutCubic(progress);
        ctx.clearRect(0, 0, targetWidth, targetHeight);

        if (type === 'fadeout') {
            ctx.globalAlpha = 1 - eased;
            const scale = 1 - 0.1 * eased;
            ctx.save();
            ctx.translate(x + imgScaledWidth / 2, y + imgScaledHeight / 2);
            ctx.scale(scale, scale);
            ctx.translate(-(x + imgScaledWidth / 2), -(y + imgScaledHeight / 2));
            ctx.drawImage(image, x, y, imgScaledWidth, imgScaledHeight);
            ctx.restore();
            ctx.globalAlpha = 1;
        } else if (type === 'dissolve') {
            ctx.drawImage(image, x, y, imgScaledWidth, imgScaledHeight);
            const numParticles = 50;
            ctx.fillStyle = `#ffffff`;
            for (let i = 0; i < numParticles; i++) {
                const px = x + Math.random() * imgScaledWidth;
                const py = y + Math.random() * imgScaledHeight;
                const speed = 100 * (1 - eased);
                const angle = Math.random() * 2 * Math.PI;
                const dist = speed * elapsedExit;
                const newX = px + dist * Math.cos(angle);
                const newY = py + dist * Math.sin(angle);
                if (newX < 0 || newX > targetWidth || newY < 0 || newY > targetHeight) continue;
                ctx.globalAlpha = 1 - eased;
                ctx.beginPath();
                ctx.arc(newX, newY, 3 / Math.sqrt(effectiveScale), 0, 2 * Math.PI);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        } else if (type === 'flameAnimation') {
        ctx.globalAlpha = 1 - eased;
        ctx.drawImage(image, x, y, imgScaledWidth, imgScaledHeight);
        const numFlames = 50;
        for (let i = 0; i < numFlames; i++) {
            const flameX = x + Math.random() * imgScaledWidth;
            const flameY = y + imgScaledHeight - (Math.random() * imgScaledHeight * eased);
            const size = (8 + Math.random() * 8) / Math.sqrt(effectiveScale);
            const hue = 20 + Math.random() * 40; // Red to yellow
            ctx.fillStyle = `hsla(${hue}, 80%, 50%, ${1 - eased})`;
            ctx.beginPath();
            ctx.moveTo(flameX, flameY);
            ctx.quadraticCurveTo(
                flameX - size / 2, flameY - size * 2,
                flameX, flameY - size * 4
            );
            ctx.quadraticCurveTo(
                flameX + size / 2, flameY - size * 2,
                flameX, flameY
            );
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    } else if (type === 'slide') {
            const offsetX = eased * targetWidth;
            ctx.drawImage(image, x + offsetX, y, imgScaledWidth, imgScaledHeight);
        } else if (type === 'none') {
            return false;
        }
        return progress < 1;
    };

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    function calculateDrawParams(image) {
        let effectiveWidth = image.width;
        let effectiveHeight = image.height;
        if (resolutionWidth || resolutionHeight) {
            if (resolutionWidth && resolutionHeight) {
                effectiveWidth = resolutionWidth;
                effectiveHeight = resolutionHeight;
            } else if (resolutionWidth) {
                const aspect = image.height / image.width;
                effectiveWidth = resolutionWidth;
                effectiveHeight = resolutionWidth * aspect;
            } else {
                const aspect = image.width / image.height;
                effectiveHeight = resolutionHeight;
                effectiveWidth = resolutionHeight * aspect;
            }
        }
        let scale, imgScaledWidth, imgScaledHeight, x = 0, y = 0;
        if (fitMode === 'stretch') {
            imgScaledWidth = targetWidth;
            imgScaledHeight = targetHeight;
        } else if (fitMode === 'none') {
            imgScaledWidth = effectiveWidth;
            imgScaledHeight = effectiveHeight;
            x = (targetWidth - imgScaledWidth) / 2;
            y = (targetHeight - imgScaledHeight) / 2;
        } else if (fitMode === 'cover') {
            scale = Math.max(targetWidth / effectiveWidth, targetHeight / effectiveHeight);
            imgScaledWidth = effectiveWidth * scale;
            imgScaledHeight = effectiveHeight * scale;
            x = (targetWidth - imgScaledWidth) / 2;
            y = (targetHeight - imgScaledHeight) / 2;
        } else {
            scale = Math.min(targetWidth / effectiveWidth, targetHeight / effectiveHeight);
            imgScaledWidth = effectiveWidth * scale;
            imgScaledHeight = effectiveHeight * scale;
            x = (targetWidth - imgScaledWidth) / 2;
            y = (targetHeight - imgScaledHeight) / 2;
        }
        return { x, y, imgScaledWidth, imgScaledHeight, scale: scale || 1 };
    }

    function drawFinalImage(image, drawParams) {
        const { x, y, imgScaledWidth, imgScaledHeight } = drawParams;
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(image, x, y, imgScaledWidth, imgScaledHeight);
    }

    function runPostAnimation(image, drawParams) {
        const postRunner = () => {
            const continuePost = animatePostLoad(postLoadAnimation, image, drawParams);
            if (continuePost) {
                animationFrameId = requestAnimationFrame(postRunner);
            } else {
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                state = 'middle';
                middleStartTime = Date.now();
                runMiddleAnimation(image, drawParams);
            }
        };
        postRunner();
    }

    function runMiddleAnimation(image, drawParams) {
        const middleRunner = () => {
            if (state !== 'middle') {
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                return;
            }
            const continueMiddle = animateMiddle(middleAnimation, image, drawParams);
            if (continueMiddle) {
                animationFrameId = requestAnimationFrame(middleRunner);
            } else {
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                drawFinalImage(image, drawParams);
                state = 'idle';
            }
        };
        middleRunner();
    }

    let exitStartTime = null;
    function runExitAnimation(image, drawParams, callback) {
        state = 'exiting';
        exitStartTime = Date.now();
        const exitRunner = () => {
            const continueExit = animateExit(exitAnimation, image, drawParams);
            if (continueExit) {
                animationFrameId = requestAnimationFrame(exitRunner);
            } else {
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                ctx.clearRect(0, 0, targetWidth, targetHeight);
                state = 'done';
                if (callback) callback();
            }
        };
        exitRunner();
    }

    if (!carouselimagecache[imgUrl]) {
        img = new Image();
        img.src = imgUrl;
        carouselimagecache[imgUrl] = img;

        img.onload = () => {
            if (img.width === 0 || img.height === 0) {
                console.warn('Image loaded with zero dimensions:', imgUrl);
                return;
            }
            loadTime = Date.now();
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            state = 'postload';
            const drawParams = calculateDrawParams(img);
            runPostAnimation(img, drawParams);
        };

        const spinner = () => {
            if (state !== 'loading') return;
            const continueAnim = animateLoading(loadingAnimation);
            const timeout = Date.now() - startTime < 5000;
            if (timeout && !img.complete && continueAnim) {
                animationFrameId = requestAnimationFrame(spinner);
            } else {
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                ctx.globalAlpha = 1;
                if (!img.complete) {
                    const drawParams = calculateDrawParams(img);
                    drawFinalImage(img, drawParams);
                    state = 'idle';
                }
            }
        };
        spinner();
    } else {
        img = carouselimagecache[imgUrl];
        if (img.width === 0 || img.height === 0) {
            console.warn('Cached image has zero dimensions:', imgUrl);
            return;
        }
        loadTime = Date.now();
        state = 'postload';
        const drawParams = calculateDrawParams(img);
        runPostAnimation(img, drawParams);
    }

    return {
        exit: (callback) => {
            if (state === 'exiting' || state === 'done') {
                if (callback) callback();
                return;
            }
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            const drawParams = calculateDrawParams(img);
            runExitAnimation(img, drawParams, callback);
        }
    };
}     
