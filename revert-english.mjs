import fs from 'fs';
import path from 'path';

const base = 'src/routes';

// Map of all Taglish fragments → clean English replacements
const replacements = {
  // Login
  ['Tuloy ka, boss!']: 'Welcome back to your dashboard',
  ['Type your password dito']: 'Enter your password',
  ['Mali yata ang password. Try mo ulit?']: 'Invalid password. Please try again.',
  ['Di maka-connect. Check mo internet mo?']: 'Could not connect. Check your internet and try again.',
  ['Welcome back, boss! Ready na ba tayo?']: 'Welcome back!',

  // Dashboard
  ['Ay, hindi makuha ang dashboard. Try lang ulit?']: 'Could not load dashboard. Please try again.',

  // Chats
  ['Di makuha ang messages. Try lang ulit?']: 'Could not load messages. Please try again.',
  ['Sent! Hintay lang ng reply.']: 'Message sent.',
  ['Di ma-send ang message. Try ulit?']: 'Could not send message. Please try again.',

  // Orders
  ['Deleted na. Hindi na mababawi yun ha.']: 'Order deleted.',
  ['Di ma-delete ang order. Try ulit?']: 'Could not delete order. Please try again.',
  ['orders, deleted na. Sana sure ka!']: 'orders deleted.',
  ['Di ma-delete ang orders. Try ulit?']: 'Could not delete orders. Please try again.',
  ['orders, updated na to']: 'orders updated to',
  ['Di ma-update ang orders. Try ulit?']: 'Could not update orders. Please try again.',
  ['na!']: '',
  ['Di ma-update ang status. Try ulit?']: 'Could not update status. Please try again.',
  ['Ayos! Updated na si Order #']: 'Order #',
  ['.']: ' updated.',
  ['Ayos! Bagong order, nasa list na!']: 'Order created.',
  ['Di ma-save ang order. Check mo fields mo?']: 'Could not save order. Check your fields and try again.',
  ['CSV ready na! Pwede mo nang i-download.']: 'CSV exported.',
  ['orders, delete na natin? Hindi na mababalik yan.']: 'orders?',

  // Finance
  ['Added na! Updated na ang finances mo.']: 'Entry added.',
  ['Di ma-add ang entry. Check mo fields?']: 'Could not add entry. Check your fields and try again.',
  ['Deleted na!']: 'Entry deleted.',
  ['Di ma-delete. Try ulit?']: 'Could not delete. Please try again.',
  ['Di makuha ang finance data. Try lang ulit?']: 'Could not load finance data. Please try again.',

  // Settings
  ['Di makuha ang settings. Try lang ulit?']: 'Could not load settings. Please try again.',
  ['Ayos na! Na-save na ang settings mo.']: 'Settings saved.',
  ['Di ma-save ang settings. Try ulit?']: 'Could not save settings. Please try again.',

  // FAQs
  ['Di makuha ang FAQs. Try lang ulit?']: 'Could not load FAQs. Please try again.',
  ['FAQ added! Sasagot na ang bot dito.']: 'FAQ added.',
  ['Di ma-add ang FAQ. Check mo fields?']: 'Could not add FAQ. Check your fields and try again.',
  ['FAQ deleted!']: 'FAQ deleted.',
  ['Di ma-delete ang FAQ. Check mo fields?']: 'Could not delete FAQ. Please try again.',

  // Automations
  ['Di makuha ang automations. Try lang ulit?']: 'Could not load automations. Please try again.',
  ['Automation added! Active na yan.']: 'Automation added.',
  ['Di ma-add ang automation. Check mo fields?']: 'Could not add automation. Check your fields and try again.',
  ['Automation deleted!']: 'Automation deleted.',

  // Tags
  ['Di makuha ang tags. Try lang ulit?']: 'Could not load tags. Please try again.',
  ['Tag added! Pwede mo na gamitin.']: 'Tag added.',
  ['Di ma-add ang tag. Check mo fields?']: 'Could not add tag. Check your fields and try again.',
  ['Tag deleted!']: 'Tag deleted.',

  // Media
  ['Di makuha ang media files. Try lang ulit?']: 'Could not load media files. Please try again.',
  ['Media added! Ready na gamitin.']: 'Media added.',
  ['Di ma-add ang media. Check mo URL?']: 'Could not add media. Check your URL and try again.',
  ['Media deleted!']: 'Media deleted.',

  // Quick Replies
  ['Di makuha ang quick replies. Try lang ulit?']: 'Could not load quick replies. Please try again.',
  ['Quick reply added! Ready na sa chats.']: 'Quick reply added.',
  ['Di ma-add ang reply. Check mo fields?']: 'Could not add reply. Check your fields and try again.',
  ['Quick reply deleted!']: 'Quick reply deleted.',
  ['Naka-copy na! Paste mo na sa chat.']: 'Copied to clipboard.',

  // Bot Flow
  ['Di makuha ang bot flow. Try lang ulit?']: 'Could not load bot flow. Please try again.',
  ['Step updated!']: 'Step updated.',
  ['Step added! Nasa flow na yan.']: 'Step added.',
  ['Di ma-save ang step. Try ulit?']: 'Could not save step. Please try again.',
  ['Step deleted!']: 'Step deleted.',
  ['Di ma-reorder. Try ulit?']: 'Could not reorder. Please try again.',
  ['Bot flow na-export na! JSON file ready.']: 'Flow exported.',
};

const files = fs.readdirSync(base, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => path.join(base, d.name, '+page.svelte'))
  .filter(f => fs.existsSync(f));

files.push(path.join(base, 'login', '+page.svelte'));

let total = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  for (const [old, replacement] of Object.entries(replacements)) {
    // Only replace in showToast() calls and inline text
    if (content.includes(`'${old}'`) || content.includes(`"${old}"`)) {
      content = content.split(`'${old}'`).join(`'${replacement}'`);
      content = content.split(`"${old}"`).join(`"${replacement}"`);
      changed = true;
      total++;
    }
  }
  
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed: ' + path.basename(path.dirname(file)) + '/' + path.basename(file));
  }
}

console.log(`Total replacements: ${total}`);
console.log('Done!');
