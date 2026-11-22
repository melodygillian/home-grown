import { getRegisteredPlant } from '../data/maPlants';
import type { ConflictDetail, GridCell, PlantPlacement } from '../types/garden';

/**
 * Computes exact spatial conflicts (overlap & boundary overflow) for all placed plants.
 * Overlap rule: Euclidean distance < rA + rB - epsilon (0.05 ft tolerance).
 * Boundary rule: Canopy circle extends past [0, width] or [0, height].
 */
export function getConflictDetails(
  placements: PlantPlacement[],
  width: number,
  height: number
): Map<string, ConflictDetail> {
  const map = new Map<string, ConflictDetail>();

  const ensure = (uid: string): ConflictDetail => {
    let entry = map.get(uid);
    if (!entry) {
      entry = { uid, boundary: false, overlapsWith: [] };
      map.set(uid, entry);
    }
    return entry;
  };

  for (let i = 0; i < placements.length; i++) {
    const a = placements[i];
    const plantA = getRegisteredPlant(a.plantId, a.plantSnapshot);
    const rA = (plantA?.spreadFt ?? 2) / 2;

    if (
      a.cx - rA < -0.02 ||
      a.cx + rA > width + 0.02 ||
      a.cy - rA < -0.02 ||
      a.cy + rA > height + 0.02
    ) {
      ensure(a.uid).boundary = true;
    }

    for (let j = i + 1; j < placements.length; j++) {
      const b = placements[j];
      const plantB = getRegisteredPlant(b.plantId, b.plantSnapshot);
      const rB = (plantB?.spreadFt ?? 2) / 2;

      const dist = Math.hypot(a.cx - b.cx, a.cy - b.cy);
      if (dist < rA + rB - 0.05) {
        ensure(a.uid).overlapsWith.push(b.uid);
        ensure(b.uid).overlapsWith.push(a.uid);
      }
    }
  }

  return map;
}

/**
 * Snaps plant center coordinates cleanly to 1ft grid cells:
 * Odd spread (1, 3 ft) centers on half-foot (e.g. 1.5),
 * Even spread (2, 4 ft) centers on integer grid intersections (e.g. 2.0).
 */
export function snapCoord(valFt: number, spreadFt: number): number {
  if (spreadFt % 2 === 1) {
    return Math.floor(valFt) + 0.5;
  }
  return Math.round(valFt);
}

/**
 * Checks whether a placed plant's center cell matches its FloraAPI light_requirements and soil_moisture.
 */
export function checkMicroclimateFit(
  placement: PlantPlacement,
  cells: GridCell[][],
  width: number,
  height: number
): { sunOk: boolean; moistureOk: boolean } {
  const plant = getRegisteredPlant(placement.plantId, placement.plantSnapshot);
  if (!plant) return { sunOk: true, moistureOk: true };
  const col = Math.min(width - 1, Math.max(0, Math.floor(placement.cx)));
  const row = Math.min(height - 1, Math.max(0, Math.floor(placement.cy)));
  const cell = cells[row]?.[col];
  if (!cell) return { sunOk: true, moistureOk: true };

  const lightList = plant.lightRequirements?.length ? plant.lightRequirements : plant.sun;
  const moistureList = plant.soilMoisture?.length ? plant.soilMoisture : plant.moisture;

  const sunOk =
    lightList.length === 0 ||
    lightList.some((l) => l.trim().toLowerCase() === cell.sun.trim().toLowerCase());
  const moistureOk =
    moistureList.length === 0 ||
    moistureList.some((m) => m.trim().toLowerCase() === cell.moisture.trim().toLowerCase());

  return { sunOk, moistureOk };
}
