export const T = { GRASS: 0, DIRT: 1, TREE: 2, ROCK: 3, RIVER: 4, BUSH: 5 };
// Cây, đá, sông chặn di chuyển. Bụi cây đi qua được nhưng không xây tháp lên.
export const isBlocking = (t) => t === T.TREE || t === T.ROCK || t === T.RIVER;
export const isBuildableTerrain = (t) => t === T.GRASS || t === T.DIRT;
