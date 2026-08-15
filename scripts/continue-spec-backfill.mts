import { collectSpecBackfill } from "../server/g2b";

const result = await collectSpecBackfill(1);
console.log(JSON.stringify(result, null, 2));
process.exit(0);
