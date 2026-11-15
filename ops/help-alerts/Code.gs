// Private operator script. The backend writes only these reason codes, with no visitor data.
const alertProject = 'your-project-id';
const alertInbox = 'team@example.invalid';
const alertReasons = {
  browser_minute: 'A browser reached three help requests in one minute.',
  browser_hour: 'A browser reached eight help requests in one hour.',
  network_minute: 'A network reached 18 help requests in one minute.',
  network_hour: 'A network reached 40 help requests in one hour.',
  provider_hour: 'The site reached its hourly allowance of 24 paid AI calls.',
  guard_unavailable: 'The rate-limit store could not confirm an allowance.'
};

function install() {
  const triggers = ScriptApp.getProjectTriggers();
  if (!triggers.some(trigger => trigger.getHandlerFunction() === 'checkLimits')) {
    ScriptApp.newTrigger('checkLimits').timeBased().everyMinutes(5).create();
  }
  checkLimits();
}

function checkLimits() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const props = PropertiesService.getScriptProperties();
    const now = Date.now();
    const lastSent = Number(props.getProperty('lastSent') || 0);
    if (now - lastSent < 3600000) return;
    const earliest = Math.max(now - 7 * 86400000, Number(props.getProperty('lastEvent') || now - 3600000));
    const filter = 'logName="projects/' + alertProject + '/logs/willforfree-ai-abuse"'
      + ' AND jsonPayload.event="ai_help_limited" AND timestamp >= "' + new Date(earliest).toISOString() + '"';
    const response = UrlFetchApp.fetch('https://logging.googleapis.com/v2/entries:list', {
      method: 'post', contentType: 'application/json', followRedirects: false,
      headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': alertProject},
      payload: JSON.stringify({resourceNames: ['projects/' + alertProject], filter: filter, orderBy: 'timestamp desc', pageSize: 50}),
      muteHttpExceptions: true
    });
    if (response.getResponseCode() !== 200) throw new Error('WillForFree log read returned HTTP ' + response.getResponseCode());
    const events = (JSON.parse(response.getContentText()).entries || []).filter(entry =>
      Object.prototype.hasOwnProperty.call(alertReasons, entry.jsonPayload && entry.jsonPayload.reason)
      && Date.parse(entry.timestamp) > earliest);
    if (!events.length) return;
    const reasons = Array.from(new Set(events.map(entry => alertReasons[entry.jsonPayload.reason])));
    const latest = Math.max.apply(null, events.map(entry => Date.parse(entry.timestamp)));
    MailApp.sendEmail({
      to: alertInbox, name: 'WillForFree alerts', subject: 'WillForFree AI help limit reached',
      body: reasons.join('\n') + '\n\nLatest event: ' + new Date(latest).toISOString()
        + '\nVisitors can still finish their wills and download their kits.\n'
        + 'Further events are grouped into at most one email per hour.'
    });
    props.setProperties({lastSent: String(now), lastEvent: String(latest)});
  } finally {
    lock.releaseLock();
  }
}
