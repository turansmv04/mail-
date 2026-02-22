/*import { analyzeEmail } from "./ai.js"; // Sənin yazdığın funksiya

async function testAgent() {
    console.log("🚀 AI Analizi başlayır...");

    const fakeSubject = "Sizinlə əməkdaşlıq etmək istəyirik";
    const fakeBody = "Salam Turan bəy, sizin AI proyektiniz marağımıza səbəb oldu. Görüşə bilərikmi?";

    try {
        const result = await analyzeEmail(fakeSubject, fakeBody);
        console.log("-----------------------");
        console.log("🤖 AI-dan gələn cavab:");
        console.log(result);
        console.log("-----------------------");
        
        // Gələn cavabın JSON olub-olmadığını yoxlayaq
        try {
            const parsed = JSON.parse(result.replace(/```json|```/g, "").trim());
            console.log("✅ Təbrik edirik! JSON uğurla oxundu.");
            console.log("Status:", parsed.status);
        } catch (e) {
            console.log("⚠️ Cavab gəldi, amma təmiz JSON deyil. Təmizləmə lazımdır.");
        }

    } catch (error) {
        console.error("❌ XƏTA:", error);
    }
}

testAgent(); */