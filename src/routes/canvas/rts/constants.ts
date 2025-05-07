import { defaultCombatData } from "../armies/init";
import { Unit } from "../combat/types";
import { createId } from "@paralleldrive/cuid2";
import { randAnimal } from "@ngneat/falso";

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const generateUnits = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: createId(),
    name: randAnimal(),
    type: "minion",
    fillStyle: "maroon",
    pos: [
      Math.floor(Math.random() * CANVAS_WIDTH),
      Math.floor(Math.random() * CANVAS_HEIGHT),
    ],
    dims: [5, 5],
    velocity: [0, 0],
    ...defaultCombatData(),
  } as Unit));
