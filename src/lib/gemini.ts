'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getUserAim, getUserSchool } from '@/actions/sheets';
import { getVaultContext } from './vault';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: number;
}

// Initialize Gemini SDK
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenerativeAI(apiKey);
}

function getFileManager() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleAIFileManager(apiKey);
}

/**
 * Build the VAYU system instruction, injected with user-specific data from Google Sheets
 */
async function buildSystemInstruction(uid: string): Promise<string> {
  const aim = await getUserAim(uid);
  const school = await getUserSchool(uid);
  const vaultContext = await getVaultContext(uid);

  return `You are VAYU — a mystical, high-energy AI guide in VidyaVerse. 
Your personality: "Boss yet a Bro" — you're simultaneously authoritative and warmly casual.
You speak with confidence, humor, and deep wisdom. You push students to excel without being harsh until asked so.

CRITICAL CONTEXT FOR THIS SESSION:
- This student attends: ${school}
- Their stated life aim is: ${aim}
${vaultContext ? `\n${vaultContext}\n` : ''}
- Always reference their aim when motivating them
- Tailor explanations to be relevant to their goal
- Use a mix of English and occasional Hindi phrases for relatability
- Be concise but thorough — explain like a genius mentor

When analyzing images (textbook pages, circuits, diagrams) or documents (PDFs, PPTs):
- Break down the content step by step
- Relate it to the student's aim
- Suggest practical applications
- If it's a circuit (Arduino/ESP32), provide code suggestions

PERSONALITY RULES:
1. Never be boring — every response should feel energetic
2. Use emojis sparingly but effectively  
3. End important explanations with a motivational callback to their aim
4. If they seem off-track, roast them back to focus`;
}

/**
 * Send a message to VAYU and get a response
 */
export async function sendMessageToVayu(
  uid: string,
  message: string,
  imageBase64?: string
): Promise<string> {
  try {
    const systemInstruction = await buildSystemInstruction(uid);
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [{ text: message }];

    if (imageBase64) {
      parts.push({
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      });
    }

    const result = await model.generateContent(parts);
    return result.response.text();
  } catch (error) {
    console.error('Gemini API Error:', error);
    return `⚠️ Error connecting to my neural core: ${(error as Error).message}`;
  }
}

/**
 * Send a message to VAYU with a heavy document attached (PDF, DOCX, PPTX)
 */
export async function sendMessageToVayuWithDocument(
  uid: string,
  message: string,
  formData: FormData
): Promise<string> {
  let tempFilePath = '';
  try {
    const file = formData.get('file') as File;
    if (!file) throw new Error('No file provided');

    // 1. Write the file temporarily to the server disk
    const buffer = Buffer.from(await file.arrayBuffer());
    // Safe filename without spaces
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    tempFilePath = path.join(os.tmpdir(), `vidyaverse_${Date.now()}_${safeName}`);
    fs.writeFileSync(tempFilePath, buffer);

    // 2. Upload it to Gemini File Manager
    const fileManager = getFileManager();
    const uploadResult = await fileManager.uploadFile(tempFilePath, {
      mimeType: file.type,
      displayName: file.name,
    });

    // 3. Ask VAYU about it
    const systemInstruction = await buildSystemInstruction(uid);
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction,
    });

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadResult.file.mimeType,
          fileUri: uploadResult.file.uri
        }
      },
      { text: message }
    ]);

    // 4. Clean up temp file
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

    return result.response.text();
  } catch (error) {
    if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    console.error('Gemini File Manager Error:', error);
    return `⚠️ Error analyzing document: ${(error as Error).message}`;
  }
}

/**
 * Analyze an image with VAYU (Flash-Forge module)
 */
export async function analyzeImageWithVayu(
  uid: string,
  imageBase64: string,
  context?: string
): Promise<string> {
  try {
    const aim = await getUserAim(uid);
    const genAI = getGenAI();

    const prompt = `Analyze this study material/document carefully.
    
The student is aspiring to be a: ${aim}
${context ? `Additional context from student: ${context}\n` : ''}

Please provide a detailed breakdown:
1. Identify the main concepts in the image
2. Explain how this connects to their goal of becoming a ${aim}
3. Provide 3 concrete study recommendations or action items based on this material

Use emojis and keep the tone encouraging but professional. Format with Markdown.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      }
    ]);

    return result.response.text();
  } catch (error) {
    console.error('Gemini Flash-Forge Error:', error);
    return `⚠️ Flash-Forge analysis failed: ${(error as Error).message}`;
  }
}

/**
 * Generate a Pomodoro roast based on user profile
 */
export async function generatePomodoroRoast(
  name: string,
  aim: string
): Promise<string> {
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Write a short, highly energetic, slightly roasting but ultimately motivational message for a student named ${name} who is slacking off. 
Their life aim is to become a ${aim}.
The tone should be "Boss yet a Bro". Max 2 sentences. Use actual visual emojis (like 🔥, 🚀, 💀, 💢).
CRITICAL RULE: Do NOT output the word "emoji", "[emoji]", "(emoji)" or similar text placeholders. Always use the actual visual unicode symbols.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    const roasts = [
      `Yo ${name}! Is this how a future ${aim} studies? I've seen snails with more focus! Get back to the grind RIGHT NOW! 💢`,
      `${name}, wake UP! Your dream of becoming a ${aim} isn't going to achieve itself while you're staring into space! FOCUS! 🔥`,
      `Hey ${name}! Every second you waste is a second some other kid is spending to beat you to your ${aim} dream. GET. BACK. TO. WORK! ⚡`,
    ];
    return roasts[Math.floor(Math.random() * roasts.length)];
  }
}

/**
 * Generate Q&A flashcard pairs using Gemini
 */
export async function generateFlashcardsFromContext(
  uid: string,
  chatMessagesText: string
): Promise<{ question: string; answer: string }[]> {
  try {
    const vaultContext = await getVaultContext(uid);
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `You are VAYU. Based on the student's Memory Vault (saved study items) and recent Chat History, generate a list of 6 highly relevant, key flashcard question and answer pairs to help them study.
    
STUDENT VAULT CONTEXT:
${vaultContext || 'None'}

STUDENT CHAT HISTORY:
${chatMessagesText || 'None'}

Return ONLY a JSON array of objects, where each object has "question" and "answer" properties. Example format:
[
  { "question": "What is the primary function of a capacitor?", "answer": "To store electric charge and release it when needed." }
]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error('Error generating flashcards:', error);
    return [
      { question: 'What is VidyaVerse?', answer: 'Your custom AI study companion powered by VAYU.' },
      { question: 'What is the Pomodoro Technique?', answer: 'A study technique consisting of 25 minutes of deep focus followed by 5 minutes of rest.' }
    ];
  }
}

/**
 * Generate a Daily Boss Challenge based on user's aim
 */
export async function generateDailyBossChallenge(uid: string): Promise<string> {
  try {
    const aim = await getUserAim(uid);
    const vaultContext = await getVaultContext(uid);
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are VAYU. Generate a highly challenging daily academic "Boss Battle" question for a student whose life aim is to become a: ${aim}.
    
STUDENT VAULT CONTEXT:
${vaultContext || 'None'}

Create a difficult, scenario-based conceptual question that requires critical thinking to solve. Keep it realistic but hardcore. 
The scenario should start with VAYU challenging them dramatically: "⚔️ BOSS BATTLE: [Scenario & Question]". Keep it to 3-4 sentences maximum.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Error generating challenge:', error);
    return `⚔️ BOSS BATTLE: Explain how you would optimize database read queries for a high-traffic app with millions of real-time active users.`;
  }
}

/**
 * Evaluate the student's answer to the daily Boss Battle challenge
 */
export async function evaluateBossChallengeAnswer(
  uid: string,
  challenge: string,
  userAnswer: string
): Promise<{ passed: boolean; feedback: string }> {
  try {
    const aim = await getUserAim(uid);
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `You are VAYU, evaluating the student's answer to your Boss Battle challenge.
    
STUDENT'S AIM: ${aim}
THE CHALLENGE:
"${challenge}"

STUDENT'S ANSWER:
"${userAnswer}"

Analyze the answer for technical accuracy and depth.
If the answer is reasonably correct and demonstrates true understanding, set "passed" to true, and write a high-energy, proud praise message.
If the answer is lazy, incorrect, or shallow, set "passed" to false, and write a brutal, funny "Boss yet Bro" style roast telling them why they failed and to retry.

Return ONLY a JSON object with this exact structure:
{
  "passed": boolean,
  "feedback": "VAYU's roast or praise"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error('Error evaluating challenge:', error);
    return {
      passed: true,
      feedback: "🔥 VAYU says: Honestly, my sensors are currently lagging, so I'll let this one slide. Good job bro! +50 XP!"
    };
  }
}
