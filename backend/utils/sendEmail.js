const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // If SMTP_HOST is not set, mock it by logging to console to avoid crashes
    if (!process.env.SMTP_HOST || process.env.SMTP_HOST.includes('mailtrap')) {
        console.log(`[MOCK EMAIL SENT]`);
        console.log(`To: ${options.email}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Message: ${options.message}`);
        return;
    }

    try {
        let transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD
            }
        });

        const message = {
            from: `${process.env.SMTP_FROM_NAME || 'MacSphere'} <${process.env.SMTP_FROM_EMAIL || 'noreply@macsphere.com'}>`,
            to: options.email,
            subject: options.subject,
            html: `<p>${options.message}</p>`
        };

        await transporter.sendMail(message);
        console.log(`Email successfully sent to ${options.email}`);
    } catch (error) {
        console.error('Email sending failed:', error.message);
        console.log(`[MOCK EMAIL FALLBACK] To: ${options.email} | Msg: ${options.message}`);
    }
};

module.exports = sendEmail;
