export interface TreeObject {
  attributes: Record<string, string>;
  boundsArray: number[];
  center: number[];
  children: TreeObject[];
  key: string;
  tagName: string;
  xpath: string | null;
}

export type TreeMap = {
  [key: string]: TreeObject;
};

export type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};
