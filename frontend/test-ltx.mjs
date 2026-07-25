import { client } from "@gradio/client";

async function main() {
  try {
    const app = await client("Lightricks/LTX-Video");
    console.log("Success! App is up.");
    const endpoints = await app.view_api();
    console.log(endpoints);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
