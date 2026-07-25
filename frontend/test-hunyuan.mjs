import { client } from "@gradio/client";

async function main() {
  try {
    const app = await client("TencentHunyuan/HunyuanVideo");
    console.log("Success! App is up.");
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
