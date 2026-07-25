import { client } from "@gradio/client";

async function main() {
  try {
    const app = await client("THUDM/CogVideoX-2b-Space");
    console.log("Predicting...");
    const result = await app.predict("/generate", [
      "A flying cat",
      50,
      6
    ]);
    console.log("Success:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
