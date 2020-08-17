// `cp _env .env` then modify it
// See https://github.com/motdotla/dotenv
const config = require("dotenv").config().parsed;
// Overwrite env variables anyways
for (const k in config) {
  process.env[k] = config[k];
}

const { LogLevel } = require("@slack/logger");
const logLevel = process.env.SLACK_LOG_LEVEL || LogLevel.DEBUG;

const { App, ExpressReceiver } = require("@slack/bolt");
// If you deploy this app to FaaS, turning this on is highly recommended
// Refer to https://github.com/slackapi/bolt/issues/395 for details
const processBeforeResponse = false;
// Manually instantiate to add external routes afterwards
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse
});
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  logLevel,
  receiver,
  processBeforeResponse
});
app.error((error) => {
  // Check the details of the error to handle cases where you should retry sending a message or stop the app
  console.error(error);
});
// Request dumper middleware for easier debugging
if (process.env.SLACK_REQUEST_LOG_ENABLED === "1") {
  app.use(async (args) => {
    const copiedArgs = JSON.parse(JSON.stringify(args));
    copiedArgs.context.botToken = "xoxb-***";
    if (copiedArgs.context.userToken) {
      copiedArgs.context.userToken = "xoxp-***";
    }
    copiedArgs.client = {};
    copiedArgs.logger = {};
    args.logger.debug(
      "Dumping request data for debugging...\n\n" +
        JSON.stringify(copiedArgs, null, 2) +
        "\n"
    );
    const result = await args.next();
    args.logger.debug("next() call completed");
    return result;
  });
}
const { IncomingWebhook } = require("@slack/webhook");
const url = process.env.SLACK_WEBHOOK_URL;
const request = require("request");
const webhook = new IncomingWebhook(url);

// ---------------------------------------------------------------
// Start coding here..
// see https://slack.dev/bolt/

// https://api.slack.com/apps/{APP_ID}/event-subscriptions

app.event("app_mention", async ({ logger, event, say }) => {
  logger.debug(
    "app_mention event payload:\n\n" + JSON.stringify(event, null, 2) + "\n"
  );
  console.log(event);
  const result = await say({ text: `:wave: <@${event.user}> Hi there!` });
  logger.debug("say result:\n\n" + JSON.stringify(result, null, 2) + "\n");
  return result;
});
app.action({ block_id: "url_ticket" }, async ({ action, body, ack }) => {
  // it’s a valid email, accept the submission
  console.log("URL ticket :" + body);
  await ack();
});
app.action({ block_id: "acknowledged" }, async ({ action, body, ack }) => {
  // it’s a valid email, accept the submission
  console.log("Acknowledged is this : " + body);
  await ack();
});
// // Utility to post a message using response_url
// const axios = require("axios");
// function postViaResponseUrl(responseUrl, response) {
//   return axios.post(responseUrl, response);
// }

receiver.app.get("/", (_req, res) => {
  res.send("Your App is running!");
});

receiver.app.post("/notify", (_req, res) => {
  console.log(_req);
  var polling = function () {
    request("http://1qp06-3001.sse.codesandbox.io", function (
      error,
      response,
      body
    ) {
      if (!error && body) {
        var parsed = JSON.parse(body);
        console.log(parsed.summary); // Show the HTML for the Google homepage.

        res.send(parsed);

        // Send the notification
        (async () => {
          await webhook.send({
            attachments: [
              {
                color: "#f2c744",
                blocks: [
                  {
                    type: "section",
                    text: {
                      type: "mrkdwn",
                      text: "*Summary:* " + parsed.summary
                    }
                  },
                  {
                    type: "section",
                    text: {
                      type: "mrkdwn",
                      text: "*Description:* " + parsed.description
                    }
                  },
                  {
                    type: "divider"
                  },
                  {
                    type: "section",
                    text: {
                      type: "mrkdwn",
                      text: "*Ticket Information*"
                    }
                  },
                  {
                    type: "section",
                    text: {
                      type: "mrkdwn",
                      text: "*TicketID:* " + parsed.ticket.ticketId
                    }
                  },
                  {
                    type: "section",
                    text: {
                      type: "mrkdwn",
                      text: "*Created At:* " + parsed.ticket.created
                    }
                  },
                  {
                    type: "context",
                    elements: [
                      {
                        type: "image",
                        image_url:
                          "https://www.netclipart.com/pp/m/108-1084737_svg-png-free-download-onlinewebfonts-com-comments-priority.png",
                        alt_text: "priority"
                      },
                      {
                        type: "plain_text",
                        text: "Priority:" + parsed.ticket.priority,
                        emoji: true
                      }
                    ]
                  },
                  {
                    type: "actions",
                    block_id: "url_ticket",
                    elements: [
                      {
                        type: "button",
                        url: parsed.ticket.url,
                        text: {
                          type: "plain_text",
                          text: "More information",
                          emoji: true
                        },
                        value: "info"
                      }
                    ]
                  },
                  {
                    type: "divider"
                  },
                  {
                    type: "section",
                    text: {
                      type: "mrkdwn",
                      text: "*Anomaly Information*"
                    }
                  },
                  {
                    type: "section",
                    text: {
                      type: "mrkdwn",
                      text: "*Class:* " + parsed.anomaly.class
                    }
                  },
                  {
                    type: "section",
                    text: {
                      type: "mrkdwn",
                      text: "*Model:* " + parsed.anomaly.model
                    }
                  },
                  {
                    type: "actions",
                    block_id: "acknowledged",
                    elements: [
                      {
                        type: "button",
                        text: {
                          type: "plain_text",
                          text: "OK",
                          emoji: true
                        },
                        value: "ok"
                      }
                    ]
                  }
                ]
              }
            ]
          });
        })();
      } else {
        res.send("No new notification");
      }
    });
  };
  polling();
  // setInterval(() => polling(), 1000);
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("OpsCruise app is running!");
})();
