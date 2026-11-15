// Private mail relay for the write-only Firestore contact queue.
const project = 'your-project-id';
const inbox = 'team@example.invalid';

function install() {
  if (!ScriptApp.getProjectTriggers().some(trigger => trigger.getHandlerFunction() === 'deliverContacts')) {
    ScriptApp.newTrigger('deliverContacts').timeBased().everyMinutes(1).create();
  }
  deliverContacts();
}

function deliverContacts() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const root = 'https://firestore.googleapis.com/v1/';
    const auth = {Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': project};
    const collection = 'projects/' + project + '/databases/(default)/documents/contactInbox/';
    const page = UrlFetchApp.fetch(root + collection.slice(0, -1) +
      '?pageSize=30&orderBy=createdAt%20asc', {headers: auth, muteHttpExceptions: true});
    if (page.getResponseCode() !== 200) throw Error('Contact queue read returned HTTP ' + page.getResponseCode());
    const properties = PropertiesService.getScriptProperties();
    for (const document of JSON.parse(page.getContentText()).documents || []) {
      if (!document.name.startsWith(collection) || !/^[0-9a-f-]{36}$/.test(document.name.slice(collection.length))) continue;
      const id = document.name.slice(collection.length);
      const fields = document.fields;
      const email = fields.email.stringValue;
      const sponsor = fields.kind.stringValue === 'sponsor';
      if (!properties.getProperty(id)) {
        if (MailApp.getRemainingDailyQuota() < 1) return;
        MailApp.sendEmail({
          to: inbox, replyTo: email, name: 'WillForFree contact',
          subject: sponsor ? 'WillForFree sponsor inquiry' : 'WillForFree support message',
          body: (sponsor ? 'Organization: ' + fields.organization.stringValue + '\n' : '') +
            'Reply to: ' + email + '\n\n' + fields.message.stringValue
        });
        properties.setProperty(id, 'sent');
      }
      const removed = UrlFetchApp.fetch(root + document.name +
        '?currentDocument.updateTime=' + encodeURIComponent(document.updateTime),
        {method: 'delete', headers: auth, muteHttpExceptions: true});
      if (![200, 404].includes(removed.getResponseCode())) throw Error('Contact cleanup returned HTTP ' + removed.getResponseCode());
      properties.deleteProperty(id);
    }
  } finally {
    lock.releaseLock();
  }
}
