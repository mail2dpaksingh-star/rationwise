import { route } from "../../backend/api-core.mjs";
export async function onRequest(ctx) { return route(ctx); }
