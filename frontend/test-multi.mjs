import { client } from "@gradio/client";

async function checkSpace(name) {
  try {
    const app = await client(name);
    console.log(`[OK] ${name}`);
    return app;
  } catch (err) {
    console.log(`[FAIL] ${name}: ${err.message.split('\n')[0]}`);
  }
}

async function main() {
  await checkSpace("stabilityai/stable-video-diffusion");
  await checkSpace("fffiloni/video-crafter");
  await checkSpace("ali-vilab/modelscope-text-to-video-synthesis");
}

main();
