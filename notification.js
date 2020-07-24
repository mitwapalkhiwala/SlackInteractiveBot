const express = require("express");
const router = express.Router();
const app = express();

router.get("/", (req, res) => {
  res.json({
    header: {
      msgType: "ticket_notify",
      msgSubType: "ReFired",
      version: "1",
      retrieved: "2020-05-07T21:34:14.270Z"
    },
    tenant: {
      tenantId: "dev4",
      tenantName: "dev4-NAME",
      locale: "USEN"
    },
    ticket: {
      ticketId: "cccc898e-d054-4f22-8394-b400f9c45a55",
      url:
        "https://dev4.opscruise.io/dev4/application/app_map/graph?ticket=true&ticketId=cccc898e-d054-4f22-8394-b400f9c45a55",
      created: "Thu May 07 13:08:23 IST 2020",
      priority: "High",
      escalation: "Critical"
    },
    target: {
      type: "container",
      name: "redis",
      vid: "vertex/29184",
      cid: "UNKNOWN",
      app: "UNKNOWN"
    },
    summary:
      "ML: demand_l4_packets_in_cnt/demand_l4_packets_out_cnt/demand_l4_bytes_out_cnt is anomalous in container 'redis'",
    description:
      "The demand_l4_packets_in_cnt metric decreased from 6917.0 to 4092.0,The demand_l4_packets_out_cnt metric decreased from 6921.0 to 4092.0,The demand_l4_bytes_out_cnt metric increased from 998213.0 to 2895754.0",
    anomaly: {
      class: "Machine Learning Runtime",
      model: "hdbscan",
      explainMetrics: [
        {
          metric: "container_cpu_schedstat_run_seconds_total_per_seconds_c",
          diff: "0"
        },
        {
          metric:
            "container_cpu_schedstat_runqueue_seconds_total_per_seconds_c",
          diff: "0"
        },
        {
          metric: "flow_l4_packets_in_cnt",
          diff: "4085.0"
        }
      ],
      outOfBand: true
    }
  });
});

app.use("/", router);
app.listen(3001);
