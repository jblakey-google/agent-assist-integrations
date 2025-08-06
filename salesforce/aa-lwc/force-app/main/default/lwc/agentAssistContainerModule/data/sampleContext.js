const sampleContext = `{
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
      },`;

export default sampleContext;
