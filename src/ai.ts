import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
import { json } from "node:stream/consumers";
dotenv.config();

const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeEmail(subject:string, body:string) {
const model = genAi.getGenerativeModel({
    model:"gemini-2.5-flash"
});


const prompt = `
    Sən peşəkar bir AI Agentsən. Sənə gələn bu email-i analiz et.
    Mövzu: ${subject}
    Mətn: ${body}

    TAPŞIRIQ:
    - Əgər email vacibdirsə (iş, bank, rəsmi müraciət), statusu "IMPORTANT" et.
    - Əgər reklam, bülleten və ya lazımsızdırsa, statusu "REPLY" et və nəzakətli bir imtina mətni yaz.
    - Cavabı YALNIZ JSON formatında ver, başqa heç bir söz yazma.

    FORMAT:
    {
      "status": "IMPORTANT" və ya "REPLY",
      "summary": "Emailin 1 cümləlik özəti",
      "reply_text": "AI-nın yazdığı cavab mətni (status IMPORTANT-dırsa null qoy)"
    }
    `;

    try{
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();

        const cleanJson = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanJson);

    }catch(error){
        console.log("AI analiz xetasi", error);
        return{
            status:"IMPORTANT",
            summary:"Analiz zamani xeta bas verdi",
            reply_text:null
        };

    }

}