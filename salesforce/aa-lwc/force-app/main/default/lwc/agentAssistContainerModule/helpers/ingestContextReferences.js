export function ingestDemoContextReferences(endpoint, token, conversationName) {
  // This function is a demo to show how to ingest context references.
  // It injects a hardcoded context into the agent assist container module.
  // This is useful for testing purposes and should not be used in production.

    const injectContext = () => {

      console.log('ingestDemoContextReferences: STARTED')

      let context = `{
          "accounts": {
          "5678": {
                "accountOpenedDate": "2020-02-02",
                "current service": "starter plan 5g",
                "customerType": "Tech Savvy",
                "features": "Limited data cap, unlimited talk and text",
                "name": "John Smith",
                "packages": "Unlimited Ultimate",
                "phoneNumber": "555-555-5555",
                "planInformation": {
                  "dataCap": "Limited",
                  "internationalData": "Pay-per-use",
                  "numberOfLines": 1,
                  "price": 70,
                  "talk": "Unlimited",
                  "text": "Unlimited",
                  "type": "5G Start"
                },
                "plans": {
                  "unlimitedUltimate": {
                    "internationalData": "High Speed",
                    "numberOfLines": 1,
                    "price": "65",
                    "talk": "Unlimited",
                    "text": "Unlimited",
                    "type": "Unlimited Ultimate"
                  }
                },
                "recommendedProducts": [
                  {
                    "description": "Upgrade to our Unlimited Ultimate plan for high-speed international data, talk, and text.",
                    "perks": [
                      {
                        "includes": [ "Disney+", "Hulu", "ESPN+" ],
                        "name": "Disney Bundle",
                        "price": 0
                      }
                    ],
                    "plan": "Unlimited Ultimate at $65 per month"
                  },
                  {
                    "description": "Consider upgrading to the latest iPhone for an enhanced experience.",
                    "device": "New iPhone 15 Pro"
                  }
                ],
                "services": "Wireless",
                "timeWithUs": "5 years"
              }
          }
      },`

      let url =
        `${endpoint}/v2/${conversationName}:ingestContextReferences`;
      let method = "POST";
      let headers = {
        Authorization: token,
        "Content-Type": "application/json",
      };
      let body = JSON.stringify({
        contextReferences: {
          context: {
            contextContents: [
              {
                content: context,
                contentFormat: "JSON",
              },
            ],
            languageCode: "en-us",
            updateMode: "OVERWRITE",
          },
        },
      });

      fetch(url, { method, headers, body })
        .then((res) => res.text())
        .then((data) => console.log(data))
        .catch((err) => console.error(err))

      console.log('ingestDemoContextReferences: COMPLETED')
    }

    setTimeout(injectContext, 1000)

}

export default {
  ingestDemoContextReferences,
}