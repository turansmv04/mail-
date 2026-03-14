import { analyzeEmail } from "./ai"; 

async function testAgent() {
    console.log("🔍 DETEKTİV REJİMİ: PROBLEMİ ARAŞDIRIRIQ...");
    

    const fakeSubject = "Biznesinizi böyüdək";
    const fakeBody = 'Salam, biz rəqəmsal marketinq agentliyiyik. SEO, SMM xidmətlərimiz ilə satışlarınızı artıra bilərik. Pulsuz konsultasiya üçün cavab yazın!';
    const fakeSender = 'sales@digitalagency.com';

    try {
        console.log(" AI-a sorğu göndərildi, cavab gözlənilir...");
        const result = await analyzeEmail(fakeSubject, fakeBody, fakeSender);
        
        console.log("\n-------------------------------------------");
        console.log("🤖 AI-dan gələn son nəticə:");
        console.dir(result, { depth: null, colors: true });
        console.log("-------------------------------------------");
    
        if (result.summary.includes("[AI XƏTAlASI]")) {
            console.log("\nPROBLEM TAPILDI!");
            
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
            console.log("\n PROBLEM YOXDUR! Sistem düzgün işləyir.");
        }

    } catch (error: any) {
        console.error("\nFəlakətli Xəta (Crash):", error.message);
    }
}

testAgent(); 