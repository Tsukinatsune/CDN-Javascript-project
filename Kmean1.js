class KMeans {
          constructor(k, maxIterations = 100) {
            this.k = k;
            this.maxIterations = maxIterations;
          }

          initializeCentroids(data) {
            const centroids = [];
            const indices = new Set();
            while (indices.size < this.k) {
              const idx = Math.floor(Math.random() * data.length);
              indices.add(idx);
            }
            indices.forEach(idx => centroids.push(data[idx].vector.slice()));
            return centroids;
          }

          euclideanDistance(vec1, vec2) {
            return Math.sqrt(vec1.reduce((sum, val, i) => sum + (val - vec2[i]) ** 2, 0));
          }

          assignClusters(data, centroids) {
            return data.map(item => {
              let minDist = Infinity;
              let cluster = 0;
              centroids.forEach((centroid, idx) => {
                const dist = this.euclideanDistance(item.vector, centroid);
                if (dist < minDist) {
                  minDist = dist;
                  cluster = idx;
                }
              });
              return cluster;
            });
          }

          updateCentroids(data, clusters) {
            const centroids = Array(this.k).fill().map(() => new Array(allGenres.length).fill(0));
            const counts = new Array(this.k).fill(0);
        
            data.forEach((item, idx) => {
              const cluster = clusters[idx];
              counts[cluster]++;
              for (let i = 0; i < item.vector.length; i++) {
                centroids[cluster][i] += item.vector[i];
              }
            });
        
            return centroids.map((centroid, idx) => 
              counts[idx] > 0 ? centroid.map(val => val / counts[idx]) : centroid
            );
          }
      
          fit(data) {
            let centroids = this.initializeCentroids(data);
            let clusters;
        
            for (let iter = 0; iter < this.maxIterations; iter++) {
              clusters = this.assignClusters(data, centroids);
              const newCentroids = this.updateCentroids(data, clusters);
            
              // Check for convergence
              let converged = true;
              for (let i = 0; i < this.k; i++) {
                if (this.euclideanDistance(centroids[i], newCentroids[i]) > 0.0001) {
                  converged = false;
                  break;
                }
              }
              centroids = newCentroids;
              if (converged) break;
            }
        
            return { clusters, centroids };
          }
        }
