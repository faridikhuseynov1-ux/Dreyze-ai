import { client } from "@gradio/client";

async function test() {
  try {
    const app = await client("ByteDance/AnimateDiff-Lightning");
    const result = await app.predict("/generate_image", [
      "A dog",
      "ToonYou",
      "",
      4
    ]);
    console.log(result);
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
