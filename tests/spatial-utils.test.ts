import { describe, it, expect } from 'vitest';
import { kmeans } from '../src/lib/spatial-utils';

describe('spatial-utils', () => {
  describe('kmeans', () => {
    it('should cluster points into k groups', () => {
      const data = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: 10, y: 10 },
        { x: 11, y: 11 },
        { x: 10, y: 11 },
      ];

      const result = kmeans(2, data);

      expect(result.clusters.length).toBe(2);
      expect(result.centroids.length).toBe(2);
    });

    it('should handle single cluster', () => {
      const data = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ];

      const result = kmeans(1, data);

      expect(result.clusters.length).toBe(1);
      expect(result.clusters[0].length).toBe(3);
      expect(result.centroids.length).toBe(1);
    });

    it('should handle k larger than data points', () => {
      const data = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ];

      const result = kmeans(5, data);

      // Should clamp k to data.length
      expect(result.clusters.length).toBeLessThanOrEqual(2);
      expect(result.centroids.length).toBeLessThanOrEqual(2);
    });

    it('should produce centroids near cluster centers', () => {
      const data = [
        // Cluster 1: around (0, 0)
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        // Cluster 2: around (100, 100)
        { x: 100, y: 100 },
        { x: 101, y: 100 },
        { x: 100, y: 101 },
      ];

      const result = kmeans(2, data);

      // Find centroids
      const centroid1 = result.centroids.find(c => c.x < 50);
      const centroid2 = result.centroids.find(c => c.x >= 50);

      expect(centroid1).toBeDefined();
      expect(centroid2).toBeDefined();

      // Centroid 1 should be near (0, 0)
      expect(centroid1!.x).toBeLessThan(2);
      expect(centroid1!.y).toBeLessThan(2);

      // Centroid 2 should be near (100, 100)
      expect(centroid2!.x).toBeGreaterThan(99);
      expect(centroid2!.y).toBeGreaterThan(99);
    });

    it('should assign all points to clusters', () => {
      const data = [
        { x: 0, y: 0 },
        { x: 5, y: 5 },
        { x: 10, y: 10 },
        { x: 15, y: 15 },
      ];

      const result = kmeans(2, data);

      const totalPoints = result.clusters.reduce(
        (sum, cluster) => sum + cluster.length,
        0
      );

      expect(totalPoints).toBe(data.length);
    });

    it('should handle identical points', () => {
      const data = [
        { x: 5, y: 5 },
        { x: 5, y: 5 },
        { x: 5, y: 5 },
      ];

      const result = kmeans(2, data);

      // All points are identical, should form one cluster
      expect(result.clusters.length).toBeGreaterThanOrEqual(1);
      
      const totalPoints = result.clusters.reduce(
        (sum, cluster) => sum + cluster.length,
        0
      );
      expect(totalPoints).toBe(3);
    });

    it('should handle points with additional properties', () => {
      interface UnitPoint {
        x: number;
        y: number;
        id: number;
        health: number;
      }

      const data: UnitPoint[] = [
        { x: 0, y: 0, id: 1, health: 100 },
        { x: 1, y: 1, id: 2, health: 90 },
        { x: 10, y: 10, id: 3, health: 80 },
        { x: 11, y: 11, id: 4, health: 70 },
      ];

      const result = kmeans(2, data);

      expect(result.clusters.length).toBe(2);
      
      // Check that additional properties are preserved
      result.clusters.forEach(cluster => {
        cluster.forEach(point => {
          expect(point).toHaveProperty('id');
          expect(point).toHaveProperty('health');
        });
      });
    });

    it('should converge within max iterations', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
      }));

      const result = kmeans(5, data);

      // Should complete without hanging
      expect(result.clusters.length).toBeGreaterThan(0);
      expect(result.centroids.length).toBeGreaterThan(0);
    });

    it('should handle edge case with one point', () => {
      const data = [{ x: 5, y: 5 }];

      const result = kmeans(1, data);

      expect(result.clusters.length).toBe(1);
      expect(result.clusters[0].length).toBe(1);
      expect(result.centroids[0]).toEqual({ x: 5, y: 5 });
    });

    it('should produce consistent cluster sizes for uniform distribution', () => {
      // Create two well-separated clusters
      const cluster1 = Array.from({ length: 10 }, (_, i) => ({
        x: i,
        y: i,
      }));
      const cluster2 = Array.from({ length: 10 }, (_, i) => ({
        x: 100 + i,
        y: 100 + i,
      }));
      const data = [...cluster1, ...cluster2];

      const result = kmeans(2, data);

      expect(result.clusters.length).toBe(2);
      
      // Both clusters should have similar sizes
      const sizes = result.clusters.map(c => c.length).sort();
      expect(Math.abs(sizes[0] - sizes[1])).toBeLessThanOrEqual(2);
    });
  });
});

