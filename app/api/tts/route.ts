import { NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export const runtime = "nodejs";
export const maxDuration = 120;

const VALID_VOICES = new Set([
  "en-US-AriaNeural",
  "en-US-JennyNeural",
  "en-US-MichelleNeural",
  "en-GB-SoniaNeural",
  "en-GB-LibbyNeural",
  "en-AU-NatashaNeural",
  "en-US-AndrewNeural",
  "en-US-BrianNeural",
  "en-US-GuyNeural",
  "en-US-ChristopherNeural",
  "en-GB-RyanNeural",
  "en-AU-WilliamNeural",
]);

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function speedToRate(speed: number): string {
  const pct = Math.round((speed - 1) * 100);
  if (pct === 0) return "+0%";
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawText = typeof body.text === "string" ? body.text.trim() : "";
    const voice = typeof body.voice === "string" && VALID_VOICES.has(body.voice)
      ? body.voice
      : "en-US-AriaNeural";
    const speed = typeof body.speed === "number" ? Math.max(0.5, Math.min(2.0, body.speed)) : 1.0;

    if (!rawText) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    if (rawText.length > 200_000) {
      return NextResponse.json({ error: "Text too long (max 200,000 characters)" }, { status: 400 });
    }

    const sanitized = escapeXml(rawText);

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(sanitized, { rate: speedToRate(speed) });

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      audioStream.on("end", resolve);
      audioStream.on("close", resolve);
      audioStream.on("error", reject);
    });

    const buffer = Buffer.concat(chunks);

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[TTS] Generation failed:", err);
    return NextResponse.json(
      { error: "TTS generation failed. Please try again." },
      { status: 500 },
    );
  }
}
