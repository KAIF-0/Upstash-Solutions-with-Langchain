import { Index } from "@upstash/vector";
import { SemanticCache } from "@upstash/semantic-cache";

export const index = Index.fromEnv();

//semantic caching
export const semanticCache = new SemanticCache({ index, minProximity: 0.95 });
