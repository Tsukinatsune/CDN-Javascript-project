class WebImageAutoResize {
    static sizes = [
        {size: 192, label: 'PWA Manifest ⭐', manifest: true},
        {size: 512, label: 'PWA Manifest ⭐', manifest: true},
        {size: 180, label: 'iOS Home Screen'},
        {size: 152, label: 'iOS Legacy'}, 
        {size: 167, label: 'iPad Pro'},
        {size: 16, label: '16x16'},
        {size: 32, label: '32x32'}, 
        {size: 48, label: '48x48'},
        {size: 64, label: '64x64'},
        {size: 96, label: '96x96'},
        {size: 128, label: '128x128'},
        {size: 256, label: '256x256'},
        {size: 512, label: '512x512'},
        {size: 1024, label: '1024x1024'}
    ];

    static async generate(imageUrl, options = {}) {
        const {
            name = 'WebApp',
            short_name = 'App',
            themeColor = '#000000',
            backgroundColor = '#ffffff',
            description = 'PWA Ready'
        } = options;

        const img = await this.#loadImage(imageUrl);
        const results = [];

        for (const config of this.sizes) {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = config.size;
            
            const ctx = canvas.getContext('2d', { alpha: true });
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.clearRect(0, 0, config.size, config.size);
            ctx.drawImage(img, 0, 0, config.size, config.size);

            const blob = await new Promise(resolve => 
                canvas.toBlob(resolve, 'image/png')
            );

            const blobUrl = URL.createObjectURL(blob);
            
            results.push({
                size: config.size,
                label: config.label,
                blob,
                blobUrl,
                canvas,
                isManifest: config.manifest || false
            });
        }

        const manifestBlob = await this.#createManifestBlob(results, {
            name, short_name, themeColor, backgroundColor, description
        });

        return {
            sizes: results,
            manifest: manifestBlob,
            manifestUrl: URL.createObjectURL(manifestBlob),

            async downloadAll(filename = 'webapp-images') {
                results.forEach(({size, blob}) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${filename}-${size}x${size}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                });

                const a = document.createElement('a');
                a.href = this.manifestUrl;
                a.download = `${filename}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            },

            get(size) {
                return results.find(r => r.size === size);
            },

            getPwaSizes() {
                return results.filter(r => r.isManifest);
            },

            applyToDocument() {
                this.#applyImages(results);
                this.#applyManifest(this.manifestUrl, options);
            },

            cleanup() {
                results.forEach(({blobUrl}) => URL.revokeObjectURL(blobUrl));
                if (this.manifestUrl) URL.revokeObjectURL(this.manifestUrl);
            }
        };
    }

    static #loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load: ${src}`));
            img.src = src + (src.includes('?') ? '&' : '?') + `t=${Date.now()}`;
        });
    }

    static #createManifestBlob(sizes, options) {
        const pwaSizes = sizes
            .filter(s => s.isManifest)
            .map(s => ({
                src: s.blobUrl,
                sizes: `${s.size}x${s.size}`,
                type: 'image/png',
                purpose: 'maskable any'
            }));

        const manifest = {
            name: options.name,
            short_name: options.short_name,
            description: options.description,
            start_url: '/',
            display: 'standalone',
            background_color: options.backgroundColor,
            theme_color: options.themeColor,
            icons: pwaSizes
        };

        return new Promise(resolve => {
            const blob = new Blob([JSON.stringify(manifest, null, 2)], 
                { type: 'application/manifest+json' });
            resolve(blob);
        });
    }

    static #applyImages(sizes) {
        ['link[rel="icon"]', 'link[rel="apple-touch-icon"]']
            .forEach(selector => 
                document.querySelectorAll(selector).forEach(el => el.remove())
            );

        sizes.forEach(({size, blobUrl}) => {
            const link = document.createElement('link');
            link.rel = size >= 152 ? 'apple-touch-icon' : 'icon';
            link.sizes = `${size}x${size}`;
            link.href = blobUrl;
            link.type = 'image/png';
            document.head.appendChild(link);
        });
    }

    static #applyManifest(manifestUrl, options) {
        document.querySelector('link[rel="manifest"]')?.remove();

        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = manifestUrl;
        document.head.appendChild(link);

        const metas = [
            { name: 'theme-color', content: options.themeColor },
            { name: 'apple-mobile-web-app-capable', content: 'yes' },
            { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }
        ];

        metas.forEach(meta => {
            if (!document.querySelector(`meta[name="${meta.name}"]`)) {
                const m = document.createElement('meta');
                m.name = meta.name;
                m.content = meta.content;
                document.head.appendChild(m);
            }
        });
    }
}

window.WebImageAutoResize = WebImageAutoResize;
