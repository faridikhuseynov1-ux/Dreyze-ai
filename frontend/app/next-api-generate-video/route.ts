import { NextResponse } from 'next/server';
import { client } from '@gradio/client';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Подключаемся к публичному Space
    const app = await client("ByteDance/AnimateDiff-Lightning");
    
    // Отправляем запрос
    const result = await app.predict("/generate_image", [
      prompt,    // prompt
      "ToonYou", // base model
      "",        // motion
      4          // inference steps (должно быть числом)
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyResult = result as any;
    
    // Gradio возвращает объект с data-массивом. Наш результат - первый элемент.
    let videoUrl = "";
    if (anyResult.data && anyResult.data[0]) {
      const outputVideo = anyResult.data[0];
      // В зависимости от версии Gradio/Space это может быть объект с url или видео-объектом
      videoUrl = outputVideo.url || (outputVideo.video && outputVideo.video.url) || outputVideo;
    }

    if (!videoUrl) {
      throw new Error("Не удалось получить URL видео от сервера Hugging Face");
    }

    return NextResponse.json({ video_url: videoUrl });
  } catch (error: unknown) {
    console.error("Video generation error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate video (Hugging Face Server might be busy)";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
