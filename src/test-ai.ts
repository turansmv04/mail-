import { analyzeEmail } from "./ai"; // Fayl yolunu özünə görə dəqiqləşdir

async function testAgent() {
    console.log("🚀 AI Analizi və API yoxlanışı başlayır...");

    const fakeSubject = "Yeni CRM paneli təklifi";
    const fakeBody = "Salam Turan bəy, sizinlə əməkdaşlıq etmək və yeni sistemimizi təqdim etmək istəyirik.";
    const fakeSender = "test@example.com";

    try {
        // Funksiyanı çağırırıq
        const result = await analyzeEmail(fakeSubject, fakeBody, fakeSender);
        
        console.log("-----------------------");
        console.log("🤖 AI-dan gələn cavab obyekti:");
        console.dir(result, { depth: null }); // Obyekti tam detallı göstərir
        console.log("-----------------------");

        // Artıq result obyekt olduğu üçün birbaşa yoxlaya bilərik
        if (result && result.status) {
            console.log("✅ API İŞLƏYİR! Cavab uğurla alındı.");
            console.log(`Status: [${result.status}]`);
            console.log(`Summary: ${result.summary}`);
            
            if (result.status === "REPLY") {
                console.log("📝 Hazırlanan cavab:", result.reply_text);
            }
        } else {
            console.log("⚠️ Cavab gəldi, amma gözlənilən formatda deyil.");
        }

    } catch (error: any) {
        if (error.message.includes("429") || error.message.includes("limit")) {
            console.error("❌ API LİMİTİ BİTİB: ", error.message);
        } else {
            console.error("❌ TEXNİKİ XƏTA:", error.message);
        }
    }
}

testAgent();