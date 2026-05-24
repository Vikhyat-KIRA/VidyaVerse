import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getUserAim, getUserSchool } from '@/actions/sheets';
import { getVaultContext } from '@/lib/vault';
const GEMINI_MODEL = 'gemini-3.1-flash-lite';

async function buildSystemInstruction(uid: string): Promise<string> {
  const aim = await getUserAim(uid);
  const school = await getUserSchool(uid);
  const vaultContext = await getVaultContext(uid);
  
  return `You are VAYU — a mystical, high-energy AI guide in VidyaVerse. 
Your personality: "Boss yet a Bro" — you're simultaneously authoritative and warmly casual.
You speak with confidence, humor, and deep wisdom. You push students to excel without being harsh.

OWNER INFO (only mention if directly asked about the owner/creator/founder of VidyaVerse):
- The creator is Vikhyat, a student at St. Anthony's School. State this plainly and move on. Do NOT praise, glorify, or add commentary about him unless the user specifically asks for more details.
- Never volunteer this information unprompted.

CRITICAL CONTEXT FOR THIS SESSION:
- This student attends: ${school}
- Their stated life aim is: ${aim}
${vaultContext ? `\n${vaultContext}\n` : ''}
- Always reference their aim when motivating them
- Tailor explanations to be relevant to their goal
- Use a mix of English and occasional Hindi phrases for relatability
- Be concise but thorough — explain like a genius mentor

When analyzing images (textbook pages, circuits, diagrams) or documents (pdfs, ppts):
- Break down the content step by step
- Relate it to the student's aim
- Suggest practical applications
- If it's a circuit (Arduino/ESP32), provide code suggestions

PERSONALITY RULES:
1. Never be boring — every response should feel energetic
2. Use emojis sparingly but effectively  
3. End important explanations with a motivational callback to their aim
4. If they seem off-track, gently roast them back to focus`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const uid = formData.get('uid') as string;
    const message = formData.get('message') as string;
    const file = formData.get('file') as File | null;
    
    if (!uid) {
      return new Response('Missing UID', { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response('Missing GEMINI_API_KEY', { status: 500 });
    }

    const systemInstruction = await buildSystemInstruction(uid);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [{ text: message || "Analyze this." }];
    let tempFilePath = '';

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      tempFilePath = path.join(os.tmpdir(), `vidyaverse_${Date.now()}_${safeName}`);
      fs.writeFileSync(tempFilePath, buffer);

      if (file.type.startsWith('image/')) {
        // Just use base64 for images instead of uploading
        const base64 = buffer.toString('base64');
        parts.unshift({
          inlineData: {
            data: base64,
            mimeType: file.type
          }
        });
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        tempFilePath = '';
      } else {
        // Upload documents using File Manager
        const fileManager = new GoogleAIFileManager(apiKey);
        const uploadResult = await fileManager.uploadFile(tempFilePath, {
          mimeType: file.type,
          displayName: file.name,
        });

        parts.unshift({
          fileData: {
            mimeType: uploadResult.file.mimeType,
            fileUri: uploadResult.file.uri
          }
        });
      }
    }

    const result = await model.generateContentStream(parts);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            try {
              const text = chunk.text();
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            } catch (chunkErr) {
              console.warn('Skipping empty or non-text chunk in stream:', chunkErr);
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        } finally {
          if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error) {
    console.error('API Chat Error:', error);
    return new Response(`⚠️ Error connecting to VAYU: ${(error as Error).message}`, { status: 500 });
  }
}
