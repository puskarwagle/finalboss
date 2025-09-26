import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize authorized users file if it doesn't exist
function initializeAuthorizedUsers() {
  const filePath = path.join(__dirname, 'authorized-users.json');

  if (!fs.existsSync(filePath)) {
    const defaultConfig = {
      "authorized_emails": [
        "puskarwagle17@gmail.com"
      ],
      "payment_message": "Access denied. Please contact the administrator to purchase access to this application.",
      "payment_contact": "puskarwagle17@gmail.com"
    };

    fs.writeFileSync(filePath, JSON.stringify(defaultConfig, null, 2));
    console.log('Created authorized-users.json with default configuration');
  }
}

// Load authorized users with fallback
function loadAuthorizedUsers() {
  initializeAuthorizedUsers();
  const filePath = path.join(__dirname, 'authorized-users.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function isUserAuthorized(email) {
  if (!email) return false;
  const authorizedUsers = loadAuthorizedUsers();
  return authorizedUsers.authorized_emails.includes(email.toLowerCase());
}

export function getPaymentMessage() {
  const authorizedUsers = loadAuthorizedUsers();
  return {
    message: authorizedUsers.payment_message,
    contact: authorizedUsers.payment_contact
  };
}