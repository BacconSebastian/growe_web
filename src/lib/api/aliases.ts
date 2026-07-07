import { httpFetch } from "./http";

export type AliasMap = Record<number, string>;

export async function getAliases(): Promise<AliasMap> {
  const res = await httpFetch<{ aliases: Record<string, string> }>("/community/aliases");
  const out: AliasMap = {};
  for (const [k, v] of Object.entries(res.aliases ?? {})) out[Number(k)] = v;
  return out;
}
