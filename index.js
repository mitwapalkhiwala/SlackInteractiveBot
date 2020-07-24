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
app.error(error => {
  // Check the details of the error to handle cases where you should retry sending a message or stop the app
  console.error(error);
});
// Request dumper middleware for easier debugging
if (process.env.SLACK_REQUEST_LOG_ENABLED === "1") {
  app.use(async args => {
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

app.command("/hello", async ({ context, client, body, ack }) => {
  await sayHello({ context, client, body, ack });
});

app.shortcut("open-modal", async ({ logger, client, body, ack }) => {
  await openModal({ logger, client, ack, body });
});

app.command("/open-modal", async ({ logger, client, ack, body }) => {
  await openModal({ logger, client, ack, body });
});

app.view("task-modal", async ({ logger, client, body, ack }) => {
  await handleViewSubmission({ logger, client, body, ack });
});

//---------------------------------------------------------------
async function sayHello({ context, client, body, ack }) {
  try {
    request("http://ktvwo-3001.sse.codesandbox.io", function(
      error,
      response,
      bodyy
    ) {
      if (!error && bodyy) {
        var parsed = JSON.parse(bodyy);
        // Send to user
        const message = {
          // Block Kit Builder - http://j.mp/bolt-starter-msg-json
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "*OpsCruise Notification*"
              }
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "Summary: " + parsed.summary
              }
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "Description: " + parsed.description
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
                text: "TicketID: " + parsed.ticket.ticketId
              }
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "Created At: " + parsed.ticket.created
              }
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "Priority: " + parsed.ticket.priority
              }
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
                text: "Class: " + parsed.anomaly.class
              }
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "Model: " + parsed.anomaly.model
              }
            }
            // {
            //   type: "section",
            //   text: {
            //     type: "mrkdwn",
            //     text: "Explain Metrics: " + parsed.anomaly.explainMetrics
            //   }
            // }
          ]
        };
        client.chat.postMessage({
          channel: body.user_id,
          blocks: message.blocks
        });
      }
    });
    await ack();
    console.log(body);
  } catch (e) {
    console.log(e);
    await ack(`:x: Failed to say hello due to *${e.code}* ...`);
  }
}

async function openModal({ logger, client, ack, body }) {
  try {
    const res = await client.views.open({
      trigger_id: body.trigger_id,
      // Block Kit Builder - http://j.mp/bolt-starter-modal-json
      view: {
        type: "modal",
        callback_id: "task-modal",
        private_metadata: JSON.stringify(body), // Remove this when pasting this in Block Kit Builder
        title: {
          type: "plain_text",
          text: "Create a task",
          emoji: true
        },
        submit: {
          type: "plain_text",
          text: "Submit",
          emoji: true
        },
        close: {
          type: "plain_text",
          text: "Cancel",
          emoji: true
        },
        blocks: [
          {
            type: "input",
            block_id: "input-title",
            element: {
              type: "plain_text_input",
              action_id: "input",
              initial_value: body.text // Remove this when pasting this in Block Kit Builder
            },
            label: {
              type: "plain_text",
              text: "Title",
              emoji: true
            },
            optional: false
          },
          {
            type: "input",
            block_id: "input-deadline",
            element: {
              type: "datepicker",
              action_id: "input",
              placeholder: {
                type: "plain_text",
                text: "Select a date",
                emoji: true
              }
            },
            label: {
              type: "plain_text",
              text: "Deadline",
              emoji: true
            },
            optional: true
          },
          {
            type: "input",
            block_id: "input-description",
            element: {
              type: "plain_text_input",
              action_id: "input",
              multiline: true
            },
            label: {
              type: "plain_text",
              text: "Description",
              emoji: true
            },
            optional: true
          }
        ]
      }
    });
    logger.debug(
      "views.open response:\n\n" + JSON.stringify(res, null, 2) + "\n"
    );
    await ack();
  } catch (e) {
    logger.error("views.open error:\n\n" + JSON.stringify(e, null, 2) + "\n");
    await ack(`:x: Failed to open a modal due to *${e.code}* ...`);
  }
}
async function handleViewSubmission({ logger, client, body, ack }) {
  logger.debug(
    "view_submission view payload:\n\n" +
      JSON.stringify(body.view, null, 2) +
      "\n"
  );

  const stateValues = body.view.state.values;
  const title = stateValues["input-title"]["input"].value;
  const deadline = stateValues["input-deadline"]["input"].selected_date;
  const description = stateValues["input-description"]["input"].value;

  const errors = {};
  if (title.length <= 5) {
    errors["input-title"] = "Title must be longer than 5 characters";
  }
  if (Object.entries(errors).length > 0) {
    await ack({
      response_action: "errors",
      errors: errors
    });
  } else {
    // Save the input to somewhere
    logger.info(
      `Valid response:\ntitle: ${title}\ndeadline: ${deadline}\ndescription: ${description}\n`
    );
    // Post a message using response_url given by the slash comamnd
    const command = JSON.parse(body.view.private_metadata);
    const message = {
      text: "[fallback] Somehow Slack app failed to render blocks",
      // Block Kit Builder - http://j.mp/bolt-starter-msg-json
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*OpsCruise Notification*"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "_Container_: Prometheus-node-exporter is Terminated."
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              "_Reason_: No updates to the entity for more than 15 Minutes, so the entity is marked as terminated."
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
            text: "_TicketID_: 4b68d532-5eca-4ad3-b517-abcce7034261"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "_Created At_: Tue May 12 08:42:44 GMT 2020"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "_Priority_: High"
          }
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
            text: "_Class_: Threshold"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "_Model_: Rule Engine"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "_Explain Metrics_: None"
          }
        }
      ]
    };
    if (command && command.response_url) {
      // Cannot use respond here as the response_url is not given here
      message.response_type = "ephemeral"; // or "in_channel"
      await postViaResponseUrl(
        command.response_url, // available for 30 minutes
        message
      );
    } else {
      const res = await client.chat.postMessage({
        channel: body.user.id,
        text: message.text,
        blocks: message.blocks
      });
      logger.debug(
        "chat.postMessage response:\n\n" + JSON.stringify(res, null, 2) + "\n"
      );
    }
    await ack();
  }
}

// Utility to post a message using response_url
const axios = require("axios");
function postViaResponseUrl(responseUrl, response) {
  return axios.post(responseUrl, response);
}

receiver.app.get("/", (_req, res) => {
  res.send("Your Bolt ⚡️ App is running!");
});

receiver.app.post("/notify", res => {
  var polling = function() {
    request("http://ktvwo-3001.sse.codesandbox.io", function(
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
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: "*OpsCruise Notification*"
                }
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: "Summary: "
                }
              },
              {
                type: "actions",
                elements: [
                  {
                    type: "button",
                    text: {
                      type: "plain_text",
                      text: "More Information",
                      emoji: true
                    },
                    value: "info"
                  }
                ]
              },
              {
                type: "actions",
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
          });
        })();
      } else {
        res.send("No new notification");
      }
    });
  };
  // setInterval(() => polling(), 1000);
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Bolt app is running!");
})();
