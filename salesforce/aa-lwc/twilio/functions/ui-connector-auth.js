exports.handler = function(context, event, callback) {
  fetch(
    event.endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${event.token}`
      },
      body: JSON.stringify({
        'conversationIntegrationKey': `${event.phone}`,
        'conversationName': `${event.conversationName}`
      })
    }
  )
    .then(res => res.json())
    .then(data => callback(null, data))
    .catch(error => callback(error, null))
};
