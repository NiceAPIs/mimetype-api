import { MagikaNode } from "magika";

let instance = null;

export async function getMagika() {
  if (!instance) {
    instance = new MagikaNode();
    await instance.load();
  }
  return instance;
}

export function isMagikaLoaded() {
  return instance !== null;
}
