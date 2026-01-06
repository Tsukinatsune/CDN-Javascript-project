class TextToImage {
    static async encode(text) {
        if (!text) throw new Error("No text provided");
        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(text);
        const totalBytes = dataBytes.length;
        const pixelsNeeded = Math.ceil(totalBytes / 3) + 1;
        const width = Math.ceil(Math.sqrt(pixelsNeeded));
        const height = Math.ceil(pixelsNeeded / width);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const pixels = imgData.data;
        pixels[0] = (totalBytes >> 16) & 255;
        pixels[1] = (totalBytes >> 8) & 255;
        pixels[2] = totalBytes & 255;
        pixels[3] = 255;
        let byteIndex = 0;
        for (let i = 1; i < pixelsNeeded; i++) {
            const pixelIndex = i * 4;
            if (byteIndex < totalBytes) pixels[pixelIndex] = dataBytes[byteIndex++];
            if (byteIndex < totalBytes) pixels[pixelIndex + 1] = dataBytes[byteIndex++];
            if (byteIndex < totalBytes) pixels[pixelIndex + 2] = dataBytes[byteIndex++];
            pixels[pixelIndex + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        return canvas.toDataURL("image/png");
    }

    static async decode(imageSource) {
        const img = await this._loadImage(imageSource);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imgData.data;
        const totalBytes = (pixels[0] << 16) | (pixels[1] << 8) | pixels[2];
        const dataBytes = new Uint8Array(totalBytes);
        let byteIndex = 0;
        const totalPixels = pixels.length / 4;
        for (let i = 1; i < totalPixels; i++) {
            if (byteIndex >= totalBytes) break;
            const pixelIndex = i * 4;
            dataBytes[byteIndex++] = pixels[pixelIndex];
            if (byteIndex < totalBytes) dataBytes[byteIndex++] = pixels[pixelIndex + 1];
            if (byteIndex < totalBytes) dataBytes[byteIndex++] = pixels[pixelIndex + 2];
        }
        const decoder = new TextDecoder();
        return decoder.decode(dataBytes);
    }

    static _loadImage(source) {
        return new Promise((resolve, reject) => {
            if (source instanceof HTMLImageElement) {
                if (source.complete) resolve(source);
                else { source.onload = () => resolve(source); source.onerror = reject; }
            } else if (typeof source === 'string') {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = source;
            } else reject(new Error("Invalid source"));
        });
    }
}
