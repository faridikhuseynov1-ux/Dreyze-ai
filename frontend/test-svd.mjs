import { client } from "@gradio/client";

async function main() {
  const app = await client("stabilityai/stable-video-diffusion");
  console.log(await app.view_api());
}
main();
