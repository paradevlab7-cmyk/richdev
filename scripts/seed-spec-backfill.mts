import { collectForUser } from "../server/g2b";

const result = await collectForUser(1, "spec", 2, 15);
console.log(JSON.stringify(result, null, 2));
process.exit(0);
