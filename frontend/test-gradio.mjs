import { client } from "@gradio/client";

async function main() {
  const app = await client("THUDM/CogVideoX-5B-Space");
  console.log(JSON.stringify(app.endpoints, null, 2));
}

main().catch(console.error);
