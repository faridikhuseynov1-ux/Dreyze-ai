import { client } from "@gradio/client";

async function main() {
  try {
    const app = await client("hpcai-tech/Open-Sora");
    console.log(JSON.stringify(app.api_info || app.endpoints || Object.keys(app), null, 2));
    const info = await app.view_api();
    console.log("View API:", info);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
