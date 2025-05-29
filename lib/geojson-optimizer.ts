// GeoJSON Optimization Utilities
// Handles Alaska/Hawaii repositioning and performance optimizations

interface GeoJSONFeature {
  type: string;
  properties: any;
  geometry: {
    type: string;
    coordinates: any;
  };
}

interface GeoJSONData {
  type: string;
  features: GeoJSONFeature[];
  metadata?: {
    optimized: boolean;
    alaskaRepositioned: boolean;
    hawaiiRepositioned: boolean;
    puertoRicoRepositioned: boolean;
    optimalCenter: [number, number];
    optimalBounds: [[number, number], [number, number]];
    totalFeatures: number;
    timestamp: number;
    fallback?: boolean;
  };
}

// Alaska and Hawaii repositioning constants
const ALASKA_SCALE = 0.35; // Scale Alaska down to 35% of original size
const HAWAII_SCALE = 1.0; // Keep Hawaii at original size
const PUERTO_RICO_SCALE = 0.8; // Scale Puerto Rico down slightly for better proportion

// New positions for Alaska, Hawaii, and Puerto Rico (bottom left of continental US)
const ALASKA_NEW_POSITION = { lat: 25.0, lng: -125.0 };
const HAWAII_NEW_POSITION = { lat: 20.0, lng: -110.0 };
const PUERTO_RICO_NEW_POSITION = { lat: 18.0, lng: -100.0 }; // Moved slightly east

// Original bounds for Alaska, Hawaii, and Puerto Rico (approximate)
const ALASKA_ORIGINAL_BOUNDS = {
  minLat: 54.0,
  maxLat: 71.5,
  minLng: -179.0,
  maxLng: -129.0
};

const HAWAII_ORIGINAL_BOUNDS = {
  minLat: 18.9,
  maxLat: 22.2,
  minLng: -160.3,
  maxLng: -154.8
};

const PUERTO_RICO_ORIGINAL_BOUNDS = {
  minLat: 17.9,
  maxLat: 18.5,
  minLng: -67.3,
  maxLng: -65.2
};

/**
 * Transform coordinates to reposition Alaska and Hawaii
 */
function transformCoordinates(coordinates: any, stateName: string): any {
  if (!Array.isArray(coordinates)) return coordinates;

  if (stateName === 'Alaska') {
    return transformAlaskaCoordinates(coordinates);
  } else if (stateName === 'Hawaii') {
    return transformHawaiiCoordinates(coordinates);
  } else if (stateName === 'Puerto Rico') {
    return transformPuertoRicoCoordinates(coordinates);
  }
  
  return coordinates;
}

/**
 * Transform Alaska coordinates to new position and scale
 */
function transformAlaskaCoordinates(coordinates: any): any {
  if (typeof coordinates[0] === 'number') {
    // Single coordinate pair
    const [lng, lat] = coordinates;
    
    // Normalize to 0-1 range within Alaska bounds
    const normalizedLng = (lng - ALASKA_ORIGINAL_BOUNDS.minLng) / 
                         (ALASKA_ORIGINAL_BOUNDS.maxLng - ALASKA_ORIGINAL_BOUNDS.minLng);
    const normalizedLat = (lat - ALASKA_ORIGINAL_BOUNDS.minLat) / 
                         (ALASKA_ORIGINAL_BOUNDS.maxLat - ALASKA_ORIGINAL_BOUNDS.minLat);
    
    // Apply scale and new position
    const newLng = ALASKA_NEW_POSITION.lng + (normalizedLng * 20 * ALASKA_SCALE); // 20 degrees width scaled
    const newLat = ALASKA_NEW_POSITION.lat + (normalizedLat * 15 * ALASKA_SCALE); // 15 degrees height scaled
    
    return [newLng, newLat];
  }
  
  // Recursively transform nested arrays
  return coordinates.map((coord: any) => transformAlaskaCoordinates(coord));
}

/**
 * Transform Hawaii coordinates to new position
 */
function transformHawaiiCoordinates(coordinates: any): any {
  if (typeof coordinates[0] === 'number') {
    // Single coordinate pair
    const [lng, lat] = coordinates;
    
    // Normalize to 0-1 range within Hawaii bounds
    const normalizedLng = (lng - HAWAII_ORIGINAL_BOUNDS.minLng) / 
                         (HAWAII_ORIGINAL_BOUNDS.maxLng - HAWAII_ORIGINAL_BOUNDS.minLng);
    const normalizedLat = (lat - HAWAII_ORIGINAL_BOUNDS.minLat) / 
                         (HAWAII_ORIGINAL_BOUNDS.maxLat - HAWAII_ORIGINAL_BOUNDS.minLat);
    
    // Apply new position
    const newLng = HAWAII_NEW_POSITION.lng + (normalizedLng * 8 * HAWAII_SCALE); // 8 degrees width
    const newLat = HAWAII_NEW_POSITION.lat + (normalizedLat * 5 * HAWAII_SCALE); // 5 degrees height
    
    return [newLng, newLat];
  }
  
  // Recursively transform nested arrays
  return coordinates.map((coord: any) => transformHawaiiCoordinates(coord));
}

/**
 * Transform Puerto Rico coordinates to new position
 */
function transformPuertoRicoCoordinates(coordinates: any): any {
  if (typeof coordinates[0] === 'number') {
    // Single coordinate pair
    const [lng, lat] = coordinates;
    
    // Normalize to 0-1 range within Puerto Rico bounds
    const normalizedLng = (lng - PUERTO_RICO_ORIGINAL_BOUNDS.minLng) / 
                         (PUERTO_RICO_ORIGINAL_BOUNDS.maxLng - PUERTO_RICO_ORIGINAL_BOUNDS.minLng);
    const normalizedLat = (lat - PUERTO_RICO_ORIGINAL_BOUNDS.minLat) / 
                         (PUERTO_RICO_ORIGINAL_BOUNDS.maxLat - PUERTO_RICO_ORIGINAL_BOUNDS.minLat);
    
    // Apply new position
    const newLng = PUERTO_RICO_NEW_POSITION.lng + (normalizedLng * 4 * PUERTO_RICO_SCALE); // 4 degrees width (reduced from 8)
    const newLat = PUERTO_RICO_NEW_POSITION.lat + (normalizedLat * 3 * PUERTO_RICO_SCALE); // 3 degrees height (reduced from 5)
    
    return [newLng, newLat];
  }
  
  // Recursively transform nested arrays
  return coordinates.map((coord: any) => transformPuertoRicoCoordinates(coord));
}

/**
 * Optimize GeoJSON data for better map performance
 */
export function optimizeGeoJSON(geoJSON: GeoJSONData): GeoJSONData {
  if (!geoJSON || !geoJSON.features) {
    return geoJSON;
  }

  const optimizedFeatures = geoJSON.features.map(feature => {
    const stateName = feature.properties?.name || feature.properties?.NAME || '';
    
    // Transform geometry coordinates for Alaska, Hawaii, and Puerto Rico
    const optimizedGeometry = {
      ...feature.geometry,
      coordinates: transformCoordinates(feature.geometry.coordinates, stateName)
    };

    // Simplify geometry for better performance (reduce coordinate precision)
    const simplifiedGeometry = simplifyGeometry(optimizedGeometry);

    return {
      ...feature,
      geometry: simplifiedGeometry,
      properties: {
        ...feature.properties,
        // Ensure consistent property names
        name: stateName,
        isRepositioned: stateName === 'Alaska' || stateName === 'Hawaii' || stateName === 'Puerto Rico'
      }
    };
  });

  return {
    ...geoJSON,
    features: optimizedFeatures
  };
}

/**
 * Simplify geometry by reducing coordinate precision
 */
function simplifyGeometry(geometry: any): any {
  if (!geometry || !geometry.coordinates) {
    return geometry;
  }

  return {
    ...geometry,
    coordinates: simplifyCoordinates(geometry.coordinates)
  };
}

/**
 * Recursively simplify coordinates by reducing precision
 */
function simplifyCoordinates(coordinates: any): any {
  if (typeof coordinates[0] === 'number') {
    // Single coordinate pair - round to 4 decimal places for performance
    return [
      Math.round(coordinates[0] * 10000) / 10000,
      Math.round(coordinates[1] * 10000) / 10000
    ];
  }
  
  // Recursively simplify nested arrays
  return coordinates.map((coord: any) => simplifyCoordinates(coord));
}

/**
 * Calculate optimal map bounds for better centering of continental US with repositioned territories
 */
export function getOptimalMapBounds(geoJSON: GeoJSONData): {
  center: [number, number];
  bounds: [[number, number], [number, number]];
} {
  if (!geoJSON || !geoJSON.features) {
    return {
      center: [39.0, -96.0],
      bounds: [[-130.0, 15.0], [-65.0, 50.0]]
    };
  }

  let continentalMinLat = Infinity;
  let continentalMaxLat = -Infinity;
  let continentalMinLng = Infinity;
  let continentalMaxLng = -Infinity;
  
  let repositionedMinLat = Infinity;
  let repositionedMaxLat = -Infinity;
  let repositionedMinLng = Infinity;
  let repositionedMaxLng = -Infinity;

  geoJSON.features.forEach(feature => {
    const stateName = feature.properties?.name || feature.properties?.NAME || '';
    const isRepositioned = stateName === 'Alaska' || stateName === 'Hawaii' || stateName === 'Puerto Rico';
    
    const bounds = getFeatureBounds(feature.geometry);
    if (bounds) {
      if (isRepositioned) {
        // Track repositioned territories separately
        repositionedMinLat = Math.min(repositionedMinLat, bounds.minLat);
        repositionedMaxLat = Math.max(repositionedMaxLat, bounds.maxLat);
        repositionedMinLng = Math.min(repositionedMinLng, bounds.minLng);
        repositionedMaxLng = Math.max(repositionedMaxLng, bounds.maxLng);
      } else {
        // Track continental US states
        continentalMinLat = Math.min(continentalMinLat, bounds.minLat);
        continentalMaxLat = Math.max(continentalMaxLat, bounds.maxLat);
        continentalMinLng = Math.min(continentalMinLng, bounds.minLng);
        continentalMaxLng = Math.max(continentalMaxLng, bounds.maxLng);
      }
    }
  });

  // Ensure we have valid continental bounds
  if (continentalMinLat === Infinity) {
    return {
      center: [39.0, -96.0],
      bounds: [[-130.0, 15.0], [-65.0, 50.0]]
    };
  }

  // Calculate center based primarily on continental US
  const continentalCenterLat = (continentalMinLat + continentalMaxLat) / 2;
  const continentalCenterLng = (continentalMinLng + continentalMaxLng) / 2;

  // Adjust center slightly to account for repositioned territories at bottom
  const adjustedCenterLat = continentalCenterLat + 1.5; // Shift up slightly to balance repositioned territories
  const adjustedCenterLng = continentalCenterLng; // Keep longitude centered on continental US

  // Create bounds that include both continental US and repositioned territories
  let finalMinLat = continentalMinLat;
  let finalMaxLat = continentalMaxLat;
  let finalMinLng = continentalMinLng;
  let finalMaxLng = continentalMaxLng;

  // Include repositioned territories if they exist
  if (repositionedMinLat !== Infinity) {
    finalMinLat = Math.min(finalMinLat, repositionedMinLat);
    finalMaxLat = Math.max(finalMaxLat, repositionedMaxLat);
    finalMinLng = Math.min(finalMinLng, repositionedMinLng);
    finalMaxLng = Math.max(finalMaxLng, repositionedMaxLng);
  }

  // Add padding around the bounds
  const latPadding = (finalMaxLat - finalMinLat) * 0.08; // Reduced padding for tighter fit
  const lngPadding = (finalMaxLng - finalMinLng) * 0.08;
  
  finalMinLat = Math.max(finalMinLat - latPadding, 15.0);
  finalMaxLat = Math.min(finalMaxLat + latPadding, 52.0);
  finalMinLng = Math.max(finalMinLng - lngPadding, -135.0);
  finalMaxLng = Math.min(finalMaxLng + lngPadding, -60.0);

  return {
    center: [adjustedCenterLat, adjustedCenterLng],
    bounds: [[finalMinLng, finalMinLat], [finalMaxLng, finalMaxLat]]
  };
}

/**
 * Get bounding box for a geometry feature
 */
function getFeatureBounds(geometry: any): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} | null {
  if (!geometry || !geometry.coordinates) {
    return null;
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  function processCoordinates(coords: any[]) {
    if (typeof coords[0] === 'number') {
      // Single coordinate pair
      const [lng, lat] = coords;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    } else {
      // Nested array
      coords.forEach(processCoordinates);
    }
  }

  processCoordinates(geometry.coordinates);

  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Create a performance-optimized cache key for GeoJSON data
 */
export function createGeoJSONCacheKey(type: 'states' | 'counties', identifier?: string): string {
  const timestamp = Math.floor(Date.now() / (1000 * 60 * 60)); // Hour-based cache key
  return `geojson-${type}-${identifier || 'all'}-${timestamp}`;
}

/**
 * Compress GeoJSON data for better caching
 */
export function compressGeoJSON(geoJSON: GeoJSONData): string {
  try {
    return JSON.stringify(geoJSON);
  } catch (error) {
    console.error('Error compressing GeoJSON:', error);
    return JSON.stringify({ type: 'FeatureCollection', features: [] });
  }
}

/**
 * Decompress GeoJSON data from cache
 */
export function decompressGeoJSON(compressed: string): GeoJSONData {
  try {
    return JSON.parse(compressed);
  } catch (error) {
    console.error('Error decompressing GeoJSON:', error);
    return { type: 'FeatureCollection', features: [] };
  }
} 