/*import { analyzeEmail } from "./ai"; 

async function testAgent() {
    console.log("🔍 DETEKTİV REJİMİ: PROBLEMİ ARAŞDIRIRIQ...");
    

    const fakeSubject = "Görüş vaxtı haqqında";
const fakeBody = "Salam, sabah saat 10:00-da ofisdə görüşə bilərikmi? Layihənin detallarını danışmaq lazımdır.";
    const fakeSender = "test@example.com";

    try {
        console.log(" AI-a sorğu göndərildi, cavab gözlənilir...");
        const result = await analyzeEmail(fakeSubject, fakeBody, fakeSender);
        
        console.log("\n-------------------------------------------");
        console.log("🤖 AI-dan gələn son nəticə:");
        console.dir(result, { depth: null, colors: true });
        console.log("-------------------------------------------");

    
        if (result.summary.includes("[AI XƏTAlASI]")) {
            console.log("\n❌ PROBLEM TAPILDI!");
            
            const errorMessage = result.summary;
            
            if (errorMessage.includes("JSON tapılmadı")) {
                console.log("👉 SƏBƏB: AI cavab verib, amma təmiz JSON formatında deyil.");
                console.log("👉 EHTİMAL: Balansın VAR (çünki nəsə cavab gəlib), amma model ya boşluq qaytarır, ya da çoxlu artıq mətn yazır.");
            } 
            else if (errorMessage.includes("429") || errorMessage.includes("limit")) {
                console.log("👉 SƏBƏB: API Limitlərin həqiqətən bitib.");
            }
            else if (errorMessage.includes("empty") || errorMessage.includes("boşdur")) {
                console.log("👉 SƏBƏB: API-dan heç bir mətn gəlmir (Boş cavab).");
            }

        } 
        else {
            console.log("\n✅ PROBLEM YOXDUR! Sistem düzgün işləyir.");
        }

    } catch (error: any) {
        console.error("\nFəlakətli Xəta (Crash):", error.message);
    }
}

testAgent(); */