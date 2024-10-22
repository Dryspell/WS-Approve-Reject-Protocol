const distance2 = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
};

const computeCentroid = <Tdata extends { x: number; y: number }>(points: Tdata[]) => {
  return {
    x: points.reduce((acc, point) => acc + point.x, 0) / points.length,
    y: points.reduce((acc, point) => acc + point.y, 0) / points.length,
  };
};

const chooseCentroids = <Tdata extends { x: number; y: number }>(k: number, data: Tdata[]) => {
  const centroids = [
    computeCentroid(Array.from({ length: k }, () => data[Math.floor(Math.random() * data.length)])),
  ];

  for (let i = 0; i < k; i++) {
    const distances = data
      .map(point => {
        return {
          point,
          distance: distance2(point, centroids[i]),
        };
      })
      .sort((a, b) => b.distance - a.distance)
      .slice(0, k - i);

    if (!distances.length) {
      break;
    }

    centroids.push(computeCentroid(distances.map(d => d.point)));
  }

  return centroids;
};

export const kmeans = <Tdata extends { x: number; y: number }>(k: number, data: Tdata[]) => {
  k = Math.min(k, data.length);

  let centroids = chooseCentroids(k, data);

  const clusters = Array.from({ length: centroids.length }, () => [] as Tdata[]);

  let converged = false;
  let iterations = 0;

  while (!converged && iterations < 5) {
    clusters.forEach(cluster => (cluster.length = 0));

    data.forEach(point => {
      const distances = centroids.map(centroid => distance2(point, centroid));
      const closest = distances.indexOf(Math.min(...distances));
      clusters[closest].push(point);
    });

    const newCentroids = clusters.map(cluster => computeCentroid(cluster));

    if (newCentroids.every((centroid, i) => distance2(centroid, centroids[i]) < 1)) {
      converged = true;
    }

    centroids = newCentroids;
    iterations++;
  }

  return { clusters, centroids };
};
