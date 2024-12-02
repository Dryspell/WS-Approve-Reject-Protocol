import { _hasPos, _hasRenderData } from "../combat/types";

export type Resource =
  & ({
    type: "wood";
    image: "tree";
  } | {
    type: "gold";
    image: "mine";
  })
  & { amount: number }
  & _hasPos
  & _hasRenderData;

export type Workshop =
  & ({
    type: "blacksmith";
    image: "blacksmith";
  } | {
    type: "leatherworkshop";
    image: "leatherworkshop";
  })
  & _hasPos
  & _hasRenderData;

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
      }
    )
    & _hasPos
    & _hasRenderData
  );
