import nodemailler from 'nodemailer';
import * as dotenv from 'dotenv';
dotenv.config();

const transport = nodemailler.createTransport({
    host:"smtp.gmail.com",
    port:587,
    auth:{
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASS
    },
});

export const  sendAutoReply = async(to:string, text:string) =>{
    try{

await transport.sendMail({
    from:process.env.EMAIL_USER,
    to:to,
    subject:"Muracietiniz haqqinda",
    text:text,

});
console.log("Email gonderildi:", to)

   } catch(error){
console.error("Email gonderilme xetasi", error)
    }
}