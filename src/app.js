
const express = require('express');
require('./db/mongoose')
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const Email = require('./models/Email')

const app = express();
const port = process.env.PORT || 3000;

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'];
const TOKEN_PATH = 'token.json';




const transport = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_PASSWORD,
  },
});

app.get('/', (req, res) => {
  res.send('Welcome to the Vacation Email Auto-Response App!');
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});

// Authenticate with Google OAuth2.0
const authenticateWithGoogle = () => {
  const { client_secret, client_id, redirect_uris } = JSON.parse(process.env.GOOGLE_OAUTH_CREDENTIALS);
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  oAuth2Client.setCredentials(JSON.parse(process.env.GOOGLE_OAUTH_TOKEN));

  return oAuth2Client;
};

// Check for new emails in Gmail
const checkEmails = async () => {
  const auth = authenticateWithGoogle();
  const gmail = google.gmail({ version: 'v1', auth });

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: '-in:chats -from:me',
  });

  const messages = res.data.messages || [];

  messages.forEach(async (message) => {
    const email = await Email.findOne({ id: message.id });

    if (!email) {
      const messageData = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });

      const threadId = messageData.data.threadId;
      const from = messageData.data.payload.headers.find((header) => header.name === 'From').value;
      const subject = messageData.data.payload.headers.find((header) => header.name === 'Subject').value;
      const body = messageData.data.snippet;

      const email = new Email({
        id: message.id,
        threadId,
        from,
        subject,
        body,
        sentByMe: false,
      });

      await email.save();

      sendEmailReply(from, threadId);
    }
  });
};

// Send reply to email
const sendEmailReply = async (to, threadId) => {
  const auth = authenticateWithGoogle();
  const gmail = google.gmail({ version: 'v1', auth });

  const email = new Email({
    id: new mongoose.Types.ObjectId(),
    threadId,
    from: process.env.GMAIL_EMAIL,
    subject: 'Out of office reply',
    body: 'Thank you for your email. I am currently out of the office and will not be able to respond to your email until my return. If your matter is urgent, please contact someone else in my team. Thank you for your understanding.',
    sentByMe: true,
    });
    
    const message = `From: ${process.env.GMAIL_EMAIL}\r\n`
    + `To: ${to}\r\n`
    + `Subject: Out of office reply\r\n\r\n`
    + `Thank you for your email. I am currently out of the office and will not be able to respond to your email until my return. If your matter is urgent, please contact someone else in my team. Thank you for your understanding.`;
    
    const encodedMessage = Buffer.from(message).toString('base64');
    
    const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
    raw: encodedMessage,
    threadId,
    },
    });
    
    email.sentByMe = true;
    await email.save();
    
    await addLabelToEmail(res.data.id, 'Vacation');
    };
    
    // Add label to email
    const addLabelToEmail = async (emailId, labelName) => {
    const auth = authenticateWithGoogle();
    const gmail = google.gmail({ version: 'v1', auth });
    
    const res = await gmail.users.labels.list({ userId: 'me' });
    const labels = res.data.labels || [];
    
    const label = labels.find((label) => label.name === labelName);
    
    if (!label) {
    const res = await gmail.users.labels.create({
    userId: 'me',
    requestBody: {
    name: labelName,
    labelListVisibility: 'labelShow',
    messageListVisibility: 'show',
    },
    });
    
    label = res.data;
    }
    
    await gmail.users.messages.modify({
    userId: 'me',
    id: emailId,
    requestBody: {
    addLabelIds: [label.id],
    },
    });
    };
    
    // Set up interval to check for new emails
    const randomInterval = Math.floor(Math.random() * (120 - 45 + 1)) + 45;
    setInterval(() => {

    checkEmails();
    }, 1000 * randomInterval);
