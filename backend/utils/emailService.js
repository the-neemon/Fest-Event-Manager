const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

// Create transporter - only if email credentials are configured
let transporter = null;

try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        console.log('Email service configured successfully with:', process.env.EMAIL_USER);
    } else {
        console.log('Email credentials not found in environment variables.');
        console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
        console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'Not set');
    }
} catch (error) {
    console.log('Error configuring email service:', error.message);
}

// Generate QR code as base64
const generateQRCode = async (data) => {
    try {
        return await QRCode.toDataURL(data);
    } catch (err) {
        console.error('Error generating QR code:', err);
        throw err;
    }
};

// Send ticket email
const sendTicketEmail = async (participant, event, ticketId, registrationId = null) => {
    try {
        // Check if email service is configured
        if (!transporter) {
            console.log('Email service not configured. Skipping email send.');
            return false;
        }

        // Generate QR code containing ticket information
        // IMPORTANT: This format must match what the attendance scanner expects
        const qrData = JSON.stringify({
            ticketId: ticketId,
            eventId: event._id.toString(),
            participantId: participant._id.toString(),
            eventName: event.name,
            participantName: `${participant.firstName} ${participant.lastName}`
        });
        
        const qrCodeImage = await generateQRCode(qrData);

        // Create email HTML
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .ticket-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                    .qr-code { text-align: center; margin: 20px 0; }
                    .qr-code img { max-width: 200px; border: 2px solid #667eea; border-radius: 8px; padding: 10px; }
                    .ticket-id { font-family: monospace; font-size: 18px; color: #667eea; font-weight: bold; text-align: center; margin: 10px 0; }
                    .info-row { margin: 10px 0; }
                    .label { font-weight: bold; color: #555; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Registration Confirmed!</h1>
                        <p>Your ticket for ${event.name}</p>
                    </div>
                    <div class="content">
                        <p>Dear ${participant.firstName} ${participant.lastName},</p>
                        <p>Thank you for registering! Your ${event.eventType === 'Merchandise' ? 'purchase' : 'registration'} has been confirmed.</p>
                        
                        <div class="ticket-box">
                            <h2 style="text-align: center; color: #667eea;">Your Ticket</h2>
                            
                            <div class="ticket-id">
                                Ticket ID: ${ticketId}
                            </div>
                            
                            <div class="qr-code">
                                <img src="cid:qrcode" alt="QR Code" style="max-width: 200px; border: 2px solid #667eea; border-radius: 8px; padding: 10px;" />
                                <p style="color: #666; font-size: 12px;">Scan this QR code at the event</p>
                            </div>
                            
                            <div class="info-row">
                                <span class="label">Event:</span> ${event.name}
                            </div>
                            <div class="info-row">
                                <span class="label">Type:</span> ${event.eventType}
                            </div>
                            <div class="info-row">
                                <span class="label">Start Date:</span> ${new Date(event.startDate).toLocaleString()}
                            </div>
                            <div class="info-row">
                                <span class="label">Location:</span> ${event.location || 'TBA'}
                            </div>
                            ${event.registrationFee > 0 ? `
                            <div class="info-row">
                                <span class="label">Fee Paid:</span> ₹${event.registrationFee}
                            </div>
                            ` : ''}
                        </div>
                        
                        <p><strong>Important:</strong></p>
                        <ul>
                            <li>Please bring this ticket (digital or printed) to the event</li>
                            <li>Your QR code will be scanned at the venue for entry</li>
                            <li>Keep your Ticket ID safe for reference</li>
                        </ul>
                        
                        <p>See you at the event!</p>
                        
                        <div class="footer">
                            <p>This is an automated email. Please do not reply.</p>
                            <p>&copy; 2026 Felicity Event Management System</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: participant.email,
            subject: `Your Ticket for ${event.name} - ${ticketId}`,
            html: htmlContent,
            attachments: [{
                filename: 'ticket-qr.png',
                content: qrCodeImage.split('base64,')[1],
                encoding: 'base64',
                cid: 'qrcode' // Content ID for embedding in HTML
            }]
        };

        await transporter.sendMail(mailOptions);
        console.log(`Ticket email sent to ${participant.email}`);
        return true;
    } catch (error) {
        console.error('Error sending ticket email:', error);
        throw error;
    }
};

module.exports = { sendTicketEmail, generateQRCode };
