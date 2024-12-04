import {
  _hasIdentificationData,
  _hasPos,
  _hasRenderData,
} from "../combat/types";

export type Resource =
  & ({
    type: "wood";
    image: "tree";
  } | {
    type: "gold";
    image: "mine";
  })
  & { amount: number; structureType: "resource" }
  & _hasPos
  & _hasRenderData
  & _hasIdentificationData;

export type Workshop =
  & ({
    type: "blacksmith";
    image: "blacksmith";
  } | {
    type: "leatherworkshop";
    image: "leatherworkshop";
  })
  & { structureType: "workshop" }
  & _hasPos
  & _hasRenderData
  & _hasIdentificationData;

export type Structure =
  | Resource
  | Workshop
  | (
    & ( //   {
      //   type: "barracks";
      //   image: "barracks";
      //   dims: [width: number, height: number];
      // }
      {
        type: "townhall";
        image: "townhall";
        structureType: "townhall";
      }
    )
    & _hasPos
    & _hasRenderData
    & _hasIdentificationData
  );
