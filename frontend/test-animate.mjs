import { client } from "@gradio/client";

async function main() {
  try {
    const app = await client("ByteDance/AnimateDiff-Lightning");
    const endpoints = await app.view_api();
    console.log(JSON.stringify(endpoints.named_endpoints, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
