import { client } from "@gradio/client";

async function main() {
  try {
    console.log("Connecting...");
    const app = await client("THUDM/CogVideoX-5B-Space");
    console.log("Predicting...");
    const result = await app.predict("/generate", [
      "A flying cat in the sky", // prompt
      null,   // image_input
      null,   // video_input
      0.8,    // video_strength
      -1,     // seed_value
      false,  // scale_status
      false   // rife_status
    ]);
    console.log("Success:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
